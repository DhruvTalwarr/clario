# /latent.py

import numpy as np
import io
import os
import soundfile as sf
import tempfile
from faster_whisper import WhisperModel

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

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

_cached_model = None

def get_whisper_model():
    global _cached_model
    if _cached_model is None:
        print("🚀 Loading Whisper 'base' model into cache...")
        _cached_model = WhisperModel("base", device="cpu", compute_type="float32")
    return _cached_model

class StreamingTranscriber:
    def __init__(self):
        self.model = get_whisper_model()
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

    model = get_whisper_model()
    lang_code = LANGUAGE_CODES.get(selected_lang.lower(), "en")

    segments, _ = model.transcribe(file_path, language=lang_code)
    full_text = " ".join([seg.text for seg in segments]).strip()

    print(f"📝 FILE TEXT ({selected_lang}):", full_text)
    return full_text  # <-- Return in original language


def transcribe_youtube_url(url: str, selected_lang="english") -> str:
    """
    Downloads audio from a YouTube/online URL and transcribes it.
    """
    if not yt_dlp:
        raise RuntimeError("yt-dlp is not installed. Install requirements.txt first.")

    with tempfile.TemporaryDirectory() as temp_dir:
        output_template = os.path.join(temp_dir, "source.%(ext)s")
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "quiet": True,
            "noplaylist": True,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "wav",
                    "preferredquality": "192",
                }
            ],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        audio_path = os.path.join(temp_dir, "source.wav")
        if not os.path.exists(audio_path):
            raise RuntimeError("Could not extract audio from the URL.")

        return transcribe_audio(audio_path, selected_lang=selected_lang)
