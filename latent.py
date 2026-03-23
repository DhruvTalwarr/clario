# /latent.py

import numpy as np
import io
import soundfile as sf
from faster_whisper import WhisperModel

# Language codes mapping
LANGUAGE_CODES = {
    "english": "en",
    "hindi": "hi",
    "tamil": "ta",
    "marathi": "mr",
    "telugu": "te",
    "bengali": "bn",
    "gujarati": "gu",
    "malayalam": "ml",
    "odia": "or",
}

class StreamingTranscriber:
    def __init__(self):
        print("🚀 Initializing Whisper model...")
        self.model = WhisperModel("base", device="cpu", compute_type="float32")
        self.sample_rate = 16000
        self.buffer = np.array([], dtype=np.float32)
        self.prev_text = ""

    def add_audio(self, chunk: bytes):
        audio = np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0
        self.buffer = np.concatenate([self.buffer, audio])

    def transcribe_if_ready(self, selected_lang="english"):
        if len(self.buffer) < self.sample_rate * 1:
            return None
            
        try:
            if np.abs(self.buffer).mean() < 0.005:
                self.buffer = self.buffer[-int(self.sample_rate * 0.5):]
                return None

            wav_io = io.BytesIO()
            sf.write(wav_io, self.buffer, self.sample_rate, format="WAV")
            wav_io.seek(0)
            lang_code = LANGUAGE_CODES.get(selected_lang.lower(), "en")
            segments, _ = self.model.transcribe(wav_io, language=lang_code)
            full_text = " ".join([seg.text for seg in segments]).strip()
            new_text = full_text.replace(self.prev_text, "").strip()
            self.prev_text = full_text
            self.buffer = self.buffer[-int(self.sample_rate * 0.5):]
            return new_text if new_text else None
        except Exception as e:
            print("❌ Transcription Error:", e)
            return None

# File-based transcription
def transcribe_audio(file_path, selected_lang="english") -> str:
    """
    Transcribes an uploaded file into the selected language.
    """
    print("📂 Transcribing uploaded file:", getattr(file_path, "name", file_path))

    model = WhisperModel("base", device="cpu", compute_type="float32")
    lang_code = LANGUAGE_CODES.get(selected_lang.lower(), "en")

    segments, _ = model.transcribe(file_path, language=lang_code)
    full_text = " ".join([seg.text for seg in segments]).strip()

    print(f"📝 FILE TEXT ({selected_lang}):", full_text)
    return full_text  # <-- Return in original language