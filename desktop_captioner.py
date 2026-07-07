import os
import sys
import time
import threading
import traceback
from collections import deque
from dataclasses import dataclass, field

import numpy as np
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
import pyaudiowpatch as pyaudio

from PySide6.QtCore import Qt, Signal, QObject, QPoint
from PySide6.QtGui import QFont, QAction, QMouseEvent, QGuiApplication
from PySide6.QtWidgets import (
    QApplication,
    QWidget,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QHBoxLayout,
    QComboBox,
    QTextEdit,
    QSlider,
    QFormLayout,
    QMainWindow,
    QMessageBox,
    QSpinBox,
    QCheckBox,
)

# Optional Groq integration for Clario simplification
try:
    from simplifier_groq import get_friendly_caption
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

# Mapping from language code returned by Whisper to full name for Groq API
CODE_TO_LANGUAGE = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "mr": "Marathi",
    "te": "Telugu",
    "bn": "Bengali",
    "gu": "Gujarati",
    "ml": "Malayalam",
    "or": "Odia",
}

TARGET_SR = 16000
PA_FORMAT = pyaudio.paInt16
DEFAULT_BLOCK_MS = 200


def int16_bytes_to_float32_mono(raw_bytes: bytes, channels: int) -> np.ndarray:
    if not raw_bytes:
        return np.zeros(0, dtype=np.float32)
    audio = np.frombuffer(raw_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        usable = (len(audio) // channels) * channels
        audio = audio[:usable].reshape(-1, channels).mean(axis=1)
    return audio.astype(np.float32, copy=False)


def resample_audio(audio: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    if len(audio) == 0 or src_sr == dst_sr:
        return audio.astype(np.float32, copy=False)
    g = np.gcd(src_sr, dst_sr)
    up = dst_sr // g
    down = src_sr // g
    return resample_poly(audio, up, down).astype(np.float32, copy=False)


def normalize_audio(audio: np.ndarray) -> np.ndarray:
    if len(audio) == 0:
        return audio.astype(np.float32, copy=False)
    peak = np.max(np.abs(audio)) + 1e-9
    if peak > 1.0:
        audio = audio / peak
    return np.clip(audio, -1.0, 1.0).astype(np.float32, copy=False)


def rms_dbfs(audio: np.ndarray) -> float:
    if len(audio) == 0:
        return -100.0
    rms = np.sqrt(np.mean(np.square(audio.astype(np.float32))) + 1e-12)
    return 20.0 * np.log10(rms + 1e-12)


@dataclass
class CaptionState:
    confirmed: str = ""
    partial: str = ""
    language: str = "--"
    language_prob: float = 0.0
    updated_at: float = field(default_factory=time.time)
    simplified: str = ""


class EventBus(QObject):
    caption_update = Signal(dict)
    status_update = Signal(str)
    error_update = Signal(str)


class AudioRingBuffer:
    def __init__(self, max_seconds: float, sample_rate: int):
        self.maxlen = int(max_seconds * sample_rate)
        self.buffer = deque(maxlen=self.maxlen)
        self.lock = threading.Lock()

    def extend(self, samples: np.ndarray):
        if samples is None or len(samples) == 0:
            return
        with self.lock:
            self.buffer.extend(samples.tolist())

    def get(self) -> np.ndarray:
        with self.lock:
            if not self.buffer:
                return np.zeros(0, dtype=np.float32)
            return np.array(self.buffer, dtype=np.float32)

    def clear(self):
        with self.lock:
            self.buffer.clear()


class WasapiHelper:
    def __init__(self):
        self.pa = None

    def open(self):
        if self.pa is None:
            self.pa = pyaudio.PyAudio()
        return self.pa

    def close(self):
        if self.pa is not None:
            try:
                self.pa.terminate()
            except Exception:
                pass
            self.pa = None

    def get_loopback_devices(self):
        pa = self.open()
        devices = []

        try:
            wasapi_info = pa.get_host_api_info_by_type(pyaudio.paWASAPI)
        except OSError:
            return []

        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            if info.get("hostApi") == wasapi_info["index"] and info.get("isLoopbackDevice", False):
                devices.append(info)

        return devices

    def get_default_loopback(self):
        pa = self.open()

        try:
            if hasattr(pa, "get_default_wasapi_loopback"):
                dev = pa.get_default_wasapi_loopback()
                if dev:
                    return dev
        except Exception:
            pass

        try:
            wasapi_info = pa.get_host_api_info_by_type(pyaudio.paWASAPI)
            default_output = pa.get_device_info_by_index(wasapi_info["defaultOutputDevice"])

            if default_output.get("isLoopbackDevice", False):
                return default_output

            for loopback in self.get_loopback_devices():
                if default_output["name"] in loopback["name"]:
                    return loopback
        except Exception:
            pass

        devices = self.get_loopback_devices()
        return devices[0] if devices else None


class WasapiLoopbackCapture(threading.Thread):
    def __init__(
        self,
        device_info: dict,
        ring: AudioRingBuffer,
        stop_event: threading.Event,
        bus: EventBus,
        gain: float = 1.0,
        block_ms: int = DEFAULT_BLOCK_MS,
    ):
        super().__init__(daemon=True)
        self.device_info = device_info
        self.ring = ring
        self.stop_event = stop_event
        self.bus = bus
        self.gain = gain
        self.block_ms = block_ms
        self.pa = None
        self.stream = None

    def open_stream(self):
        self.pa = pyaudio.PyAudio()
        rate = int(self.device_info["defaultSampleRate"])
        channels = max(1, int(self.device_info["maxInputChannels"]))
        frames_per_buffer = max(256, int(rate * self.block_ms / 1000.0))

        self.stream = self.pa.open(
            format=PA_FORMAT,
            channels=channels,
            rate=rate,
            input=True,
            input_device_index=int(self.device_info["index"]),
            frames_per_buffer=frames_per_buffer,
        )
        return rate, channels, frames_per_buffer

    def close_stream(self):
        try:
            if self.stream is not None:
                self.stream.stop_stream()
                self.stream.close()
        except Exception:
            pass
        self.stream = None

        try:
            if self.pa is not None:
                self.pa.terminate()
        except Exception:
            pass
        self.pa = None

    def run(self):
        while not self.stop_event.is_set():
            try:
                rate, channels, frames_per_buffer = self.open_stream()
                self.bus.status_update.emit(
                    f"Capturing loopback: {self.device_info['name']} | {rate} Hz | {channels} ch"
                )

                while not self.stop_event.is_set():
                    raw = self.stream.read(frames_per_buffer, exception_on_overflow=False)
                    audio = int16_bytes_to_float32_mono(raw, channels=channels)
                    audio = resample_audio(audio, rate, TARGET_SR)
                    audio = normalize_audio(audio * self.gain)
                    self.ring.extend(audio)

            except Exception as e:
                self.bus.status_update.emit(f"WASAPI capture restart: {e}")
                time.sleep(0.5)
            finally:
                self.close_stream()

        self.close_stream()


class WhisperStreamingWorker(threading.Thread):
    def __init__(
        self,
        ring: AudioRingBuffer,
        stop_event: threading.Event,
        bus: EventBus,
        model_name: str,
        device: str,
        compute_type: str,
        min_dbfs: float = -45.0,
        window_seconds: float = 5.0,
        inference_interval: float = 0.7,
        max_confirmed_words: int = 18,
        enable_simplification: bool = False,
    ):
        super().__init__(daemon=True)
        self.ring = ring
        self.stop_event = stop_event
        self.bus = bus
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self.min_dbfs = min_dbfs
        self.window_seconds = window_seconds
        self.inference_interval = inference_interval
        self.max_confirmed_words = max_confirmed_words
        self.enable_simplification = enable_simplification
        self.caption_state = CaptionState()
        self.prev_text = ""
        self.model = None

        self.last_simplified_raw = ""
        self.simplifying_lock = threading.Lock()
        self.is_simplifying = False

    def _common_prefix(self, a: str, b: str) -> str:
        a_words = a.strip().split()
        b_words = b.strip().split()
        out = []
        for x, y in zip(a_words, b_words):
            if x == y:
                out.append(x)
            else:
                break
        return " ".join(out)

    def _tail_words(self, text: str, n: int) -> str:
        words = text.strip().split()
        return " ".join(words[-n:])

    def _emit(self):
        self.bus.caption_update.emit({
            "confirmed": self.caption_state.confirmed,
            "partial": self.caption_state.partial,
            "language": self.caption_state.language,
            "language_prob": self.caption_state.language_prob,
            "updated_at": self.caption_state.updated_at,
            "simplified": self.caption_state.simplified,
        })

    def run_simplification(self, raw_text: str, lang_code: str):
        with self.simplifying_lock:
            if self.is_simplifying:
                return
            self.is_simplifying = True
            
        def job():
            try:
                lang_name = CODE_TO_LANGUAGE.get(lang_code.lower(), "English")
                simplified = get_friendly_caption(raw_text, lang_name)
                self.caption_state.simplified = simplified
                self.last_simplified_raw = raw_text
                self._emit()
            except Exception as e:
                print("Error in background simplification:", e)
            finally:
                with self.simplifying_lock:
                    self.is_simplifying = False

        threading.Thread(target=job, daemon=True).start()

    def load_model(self):
        self.bus.status_update.emit(f"Loading model: {self.model_name} ({self.device}, {self.compute_type})")
        self.model = WhisperModel(self.model_name, device=self.device, compute_type=self.compute_type)
        self.bus.status_update.emit("Model loaded.")

    def run(self):
        try:
            self.load_model()

            while not self.stop_event.is_set():
                audio = self.ring.get()
                need = int(self.window_seconds * TARGET_SR)

                if len(audio) < int(2.0 * TARGET_SR):
                    time.sleep(self.inference_interval)
                    continue

                if len(audio) > need:
                    audio = audio[-need:]

                if rms_dbfs(audio) < self.min_dbfs:
                    time.sleep(self.inference_interval)
                    continue

                segments, info = self.model.transcribe(
                    audio,
                    language=None,
                    task="transcribe",
                    beam_size=1,
                    best_of=1,
                    patience=1,
                    temperature=0.0,
                    condition_on_previous_text=False,
                    vad_filter=True,
                    vad_parameters=dict(
                        min_silence_duration_ms=300,
                        speech_pad_ms=200,
                    ),
                    word_timestamps=False,
                    compression_ratio_threshold=None,
                    log_prob_threshold=None,
                    no_speech_threshold=None,
                )

                segs = list(segments)
                text = " ".join(s.text.strip() for s in segs if s.text and s.text.strip()).strip()

                if text:
                    common = self._common_prefix(self.prev_text, text)
                    confirmed = common
                    partial = text[len(common):].strip() if common and text.startswith(common) else text

                    if confirmed:
                        confirmed_tail = self._tail_words(confirmed, self.max_confirmed_words)
                        self.caption_state.confirmed = confirmed_tail
                        
                        if self.enable_simplification and GROQ_AVAILABLE:
                            if confirmed_tail != self.last_simplified_raw:
                                self.run_simplification(confirmed_tail, self.caption_state.language)
                        else:
                            self.caption_state.simplified = ""

                    self.caption_state.partial = partial
                    self.caption_state.language = getattr(info, "language", "--") or "--"
                    self.caption_state.language_prob = float(getattr(info, "language_probability", 0.0) or 0.0)
                    self.caption_state.updated_at = time.time()
                    self.prev_text = text
                    self._emit()

                time.sleep(self.inference_interval)

        except Exception:
            self.bus.error_update.emit(traceback.format_exc())


class CaptionOverlay(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Live Captions")
        self.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setMinimumSize(920, 170)

        self._drag_pos = None
        self._window_pos = None

        root = QVBoxLayout(self)
        root.setContentsMargins(18, 18, 18, 18)
        root.setSpacing(8)

        self.lang_label = QLabel("Language: --")
        self.lang_label.setStyleSheet("color: #cbd5e1; font-size: 15px; font-weight: 600;")

        self.text_label = QLabel("WASAPI loopback captions will appear here")
        self.text_label.setWordWrap(True)
        self.text_label.setAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        self.text_label.setFont(QFont("Segoe UI", 20, QFont.Weight.Bold))
        self.text_label.setStyleSheet("color: white;")

        self.partial_label = QLabel("")
        self.partial_label.setWordWrap(True)
        self.partial_label.setAlignment(Qt.AlignLeft | Qt.AlignVCenter)
        self.partial_label.setFont(QFont("Segoe UI", 16))
        self.partial_label.setStyleSheet("color: #d1d5db;")

        root.addWidget(self.lang_label)
        root.addWidget(self.text_label)
        root.addWidget(self.partial_label)

        self.setStyleSheet(
            """
            QWidget {
                background-color: rgba(8, 8, 8, 220);
                border: 1px solid rgba(255,255,255,35);
                border-radius: 18px;
            }
            """
        )

    def update_caption(self, confirmed: str, partial: str, language: str, prob: float, simplified: str = ""):
        if simplified.strip():
            display_text = simplified.strip()
            status_suffix = " | Simplified"
        else:
            display_text = confirmed.strip() or "…"
            status_suffix = ""
            
        self.text_label.setText(display_text)
        self.partial_label.setText(partial.strip())
        self.lang_label.setText(f"Language: {language} ({prob:.2f}){status_suffix}")

    def mousePressEvent(self, event: QMouseEvent):
        if event.button() == Qt.LeftButton:
            self._drag_pos = event.globalPosition().toPoint()
            self._window_pos = self.frameGeometry().topLeft()
            event.accept()
        else:
            super().mousePressEvent(event)

    def mouseMoveEvent(self, event: QMouseEvent):
        if self._drag_pos is not None and (event.buttons() & Qt.LeftButton):
            delta = event.globalPosition().toPoint() - self._drag_pos
            new_pos = self._window_pos + delta
            self.move(self._clamp_to_screen(new_pos))
            event.accept()
        else:
            super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event: QMouseEvent):
        self._drag_pos = None
        self._window_pos = None
        super().mouseReleaseEvent(event)

    def _clamp_to_screen(self, pos: QPoint) -> QPoint:
        screen = self.screen() or QGuiApplication.primaryScreen()
        if screen is None:
            return pos

        rect = screen.availableGeometry()
        x = max(rect.left(), min(pos.x(), rect.right() - self.width()))
        y = max(rect.top(), min(pos.y(), rect.bottom() - self.height()))
        return QPoint(x, y)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Clario System Audio Caption Generator")
        self.resize(820, 600)

        self.bus = EventBus()
        self.overlay = CaptionOverlay()

        self.helper = WasapiHelper()
        self.stop_event = None
        self.capture_thread = None
        self.asr_thread = None
        self.ring = None
        self.devices = []

        self.bus.caption_update.connect(self.on_caption)
        self.bus.status_update.connect(self.on_status)
        self.bus.error_update.connect(self.on_error)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        form = QFormLayout()
        self.device_combo = QComboBox()
        self.model_combo = QComboBox()
        self.model_combo.addItems(["small", "medium", "large-v3-turbo", "large-v3"])

        self.run_device_combo = QComboBox()
        self.run_device_combo.addItems(["cpu", "cuda"])

        self.compute_combo = QComboBox()
        self.compute_combo.addItems(["int8", "float16", "int8_float16", "float32"])

        self.window_spin = QSpinBox()
        self.window_spin.setRange(3, 10)
        self.window_spin.setValue(5)

        self.interval_slider = QSlider(Qt.Horizontal)
        self.interval_slider.setRange(300, 1500)
        self.interval_slider.setValue(700)

        self.min_db_slider = QSlider(Qt.Horizontal)
        self.min_db_slider.setRange(-60, -20)
        self.min_db_slider.setValue(-45)

        self.simplify_checkbox = QCheckBox()
        if not GROQ_AVAILABLE:
            self.simplify_checkbox.setEnabled(False)
            self.simplify_checkbox.setToolTip("Groq API client not found or GROQ_API_KEY is missing. Install requirements and set GROQ_API_KEY in .env.")
            form.addRow("Enable AI Simplification (Groq) [Disabled]", self.simplify_checkbox)
        else:
            self.simplify_checkbox.setChecked(True)
            form.addRow("Enable AI Simplification (Groq)", self.simplify_checkbox)

        form.addRow("WASAPI loopback device", self.device_combo)
        form.addRow("Model", self.model_combo)
        form.addRow("Device", self.run_device_combo)
        form.addRow("Compute type", self.compute_combo)
        form.addRow("Rolling window (sec)", self.window_spin)
        form.addRow("Inference interval (ms)", self.interval_slider)
        form.addRow("Silence gate dBFS", self.min_db_slider)
        layout.addLayout(form)

        btns = QHBoxLayout()
        self.refresh_btn = QPushButton("Refresh Loopback Devices")
        self.start_btn = QPushButton("Start")
        self.stop_btn = QPushButton("Stop")
        self.show_overlay_btn = QPushButton("Show Overlay")
        self.hide_overlay_btn = QPushButton("Hide Overlay")
        btns.addWidget(self.refresh_btn)
        btns.addWidget(self.start_btn)
        btns.addWidget(self.stop_btn)
        btns.addWidget(self.show_overlay_btn)
        btns.addWidget(self.hide_overlay_btn)
        layout.addLayout(btns)

        self.status_box = QTextEdit()
        self.status_box.setReadOnly(True)
        layout.addWidget(self.status_box)

        self.refresh_btn.clicked.connect(self.load_devices)
        self.start_btn.clicked.connect(self.start_engine)
        self.stop_btn.clicked.connect(self.stop_engine)
        self.show_overlay_btn.clicked.connect(self.overlay.show)
        self.hide_overlay_btn.clicked.connect(self.overlay.hide)

        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(self.close)
        self.addAction(quit_action)

        self.load_devices()
        self._place_overlay_bottom_center()
        self.overlay.show()
        
        status_msg = "Ready. Windows WASAPI loopback edition."
        if not GROQ_AVAILABLE:
            status_msg += " (Note: Groq text simplification is disabled because GROQ_API_KEY is not configured or packages are missing.)"
        self.on_status(status_msg)

    def _place_overlay_bottom_center(self):
        screen = QGuiApplication.primaryScreen()
        if screen is None:
            self.overlay.move(100, 100)
            return
        rect = screen.availableGeometry()
        self.overlay.adjustSize()
        x = rect.left() + (rect.width() - self.overlay.width()) // 2
        y = rect.bottom() - self.overlay.height() - 80
        self.overlay.move(x, max(rect.top() + 20, y))

    def load_devices(self):
        self.device_combo.clear()
        self.devices = self.helper.get_loopback_devices()

        default_device = self.helper.get_default_loopback()
        default_idx = -1

        for i, d in enumerate(self.devices):
            name = f"{d['name']} | {int(d['defaultSampleRate'])} Hz"
            self.device_combo.addItem(name)
            if default_device and int(d["index"]) == int(default_device["index"]):
                default_idx = i

        if default_idx >= 0:
            self.device_combo.setCurrentIndex(default_idx)

        self.on_status(f"Found {len(self.devices)} WASAPI loopback device(s).")

        if not self.devices:
            self.on_status("No loopback devices found. Run `python -m pyaudiowpatch` to inspect devices.")

    def on_status(self, msg: str):
        self.status_box.append(msg)

    def on_error(self, msg: str):
        self.status_box.append("ERROR:\n" + msg)
        QMessageBox.critical(self, "Error", msg[:3000])
        self.stop_engine()

    def on_caption(self, payload: dict):
        self.overlay.update_caption(
            payload.get("confirmed", ""),
            payload.get("partial", ""),
            payload.get("language", "--"),
            payload.get("language_prob", 0.0),
            payload.get("simplified", ""),
        )

    def start_engine(self):
        if os.name != "nt":
            QMessageBox.critical(self, "Windows only", "This version is intended for Windows WASAPI.")
            return

        if self.stop_event is not None:
            self.on_status("Already running.")
            return

        if not self.devices:
            QMessageBox.warning(
                self,
                "No loopback devices",
                "No WASAPI loopback devices found. Install PyAudioWPatch correctly and check devices with `python -m pyaudiowpatch`."
            )
            return

        selected = self.devices[self.device_combo.currentIndex()]
        self.stop_event = threading.Event()
        self.ring = AudioRingBuffer(max_seconds=14, sample_rate=TARGET_SR)

        self.capture_thread = WasapiLoopbackCapture(
            device_info=selected,
            ring=self.ring,
            stop_event=self.stop_event,
            bus=self.bus,
            gain=1.0,
            block_ms=DEFAULT_BLOCK_MS,
        )

        self.asr_thread = WhisperStreamingWorker(
            ring=self.ring,
            stop_event=self.stop_event,
            bus=self.bus,
            model_name=self.model_combo.currentText(),
            device=self.run_device_combo.currentText(),
            compute_type=self.compute_combo.currentText(),
            min_dbfs=float(self.min_db_slider.value()),
            window_seconds=float(self.window_spin.value()),
            inference_interval=float(self.interval_slider.value()) / 1000.0,
            max_confirmed_words=18,
            enable_simplification=self.simplify_checkbox.isChecked(),
        )

        self.capture_thread.start()
        self.asr_thread.start()
        self.on_status(f"Caption engine started with: {selected['name']}")

    def stop_engine(self):
        if self.stop_event is None:
            return
        self.stop_event.set()
        time.sleep(0.5)
        self.capture_thread = None
        self.asr_thread = None
        self.ring = None
        self.stop_event = None
        self.on_status("Caption engine stopped.")

    def closeEvent(self, event):
        self.stop_engine()
        self.overlay.close()
        self.helper.close()
        super().closeEvent(event)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    sys.exit(app.exec())
