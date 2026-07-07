import os
import time
import threading
import traceback
from collections import deque
from dataclasses import dataclass, field

import numpy as np
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
import pyaudiowpatch as pyaudio

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
        gain: float = 1.0,
        block_ms: int = DEFAULT_BLOCK_MS,
    ):
        super().__init__(daemon=True)
        self.device_info = device_info
        self.ring = ring
        self.stop_event = stop_event
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
                print(f"[SYSTEM AUDIO] Capturing loopback: {self.device_info['name']} | {rate} Hz | {channels} ch")

                while not self.stop_event.is_set():
                    raw = self.stream.read(frames_per_buffer, exception_on_overflow=False)
                    audio = int16_bytes_to_float32_mono(raw, channels=channels)
                    audio = resample_audio(audio, rate, TARGET_SR)
                    audio = normalize_audio(audio * self.gain)
                    self.ring.extend(audio)

            except Exception as e:
                print(f"[SYSTEM AUDIO] WASAPI capture restart/error: {e}")
                time.sleep(0.5)
            finally:
                self.close_stream()

        self.close_stream()


class WhisperStreamingWorker(threading.Thread):
    def __init__(
        self,
        ring: AudioRingBuffer,
        stop_event: threading.Event,
        on_caption_update,
        model_name: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
        min_dbfs: float = -45.0,
        window_seconds: float = 5.0,
        inference_interval: float = 0.7,
        max_confirmed_words: int = 18,
        enable_simplification: bool = False,
    ):
        super().__init__(daemon=True)
        self.ring = ring
        self.stop_event = stop_event
        self.on_caption_update = on_caption_update
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
        payload = {
            "confirmed": self.caption_state.confirmed,
            "partial": self.caption_state.partial,
            "language": self.caption_state.language,
            "language_prob": self.caption_state.language_prob,
            "updated_at": self.caption_state.updated_at,
            "simplified": self.caption_state.simplified,
        }
        self.on_caption_update(payload)

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
                print("[SYSTEM AUDIO] Error in background simplification:", e)
            finally:
                with self.simplifying_lock:
                    self.is_simplifying = False

        threading.Thread(target=job, daemon=True).start()

    def load_model(self):
        print(f"[SYSTEM AUDIO] Loading Whisper model: {self.model_name} ({self.device}, {self.compute_type})")
        self.model = WhisperModel(self.model_name, device=self.device, compute_type=self.compute_type)
        print("[SYSTEM AUDIO] Whisper model loaded successfully.")

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

        except Exception as e:
            print(f"[SYSTEM AUDIO] Whisper streaming error:\n{e}")
            traceback.print_exc()
