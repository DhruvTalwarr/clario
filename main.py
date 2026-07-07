# /main.py

import uvicorn  # For running the server
from fastapi import FastAPI, HTTPException, WebSocket, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Annotated
from pydantic import BaseModel, StringConstraints
from contextlib import asynccontextmanager

# --- Import your "Golden Function" ---
try:
    from simplifier_groq import get_friendly_caption
except ImportError:
    print("FATAL ERROR: simplifier_groq.py not found.")
    exit()

# --- Import transcription logic ---
from latent import StreamingTranscriber, transcribe_audio, transcribe_youtube_url

# --- Configuration ---
CORS_ALLOW_ORIGINS = ["*"]

# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("--- [START] AI Backend is starting up... ---")
    print("[SUCCESS] 'get_friendly_caption' function is loaded.")
    yield
    print("--- [STOP] AI Backend is shutting down... ---")

app = FastAPI(lifespan=lifespan)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 🔹 DATA MODELS
# =========================
class SimplifyRequest(BaseModel):
    text: Annotated[str, StringConstraints(min_length=1)]
    language: Annotated[str, StringConstraints(min_length=2)]

class SimplifyResponse(BaseModel):
    raw_text: str
    simple_text: str

class YoutubeRequest(BaseModel):
    url: Annotated[str, StringConstraints(min_length=5)]
    language: Annotated[str, StringConstraints(min_length=2)] = "english"

# =========================
# 🔹 HEALTH CHECK
# =========================
@app.get("/")
def read_root():
    return {"status": "AI Backend is healthy and running!"}

# =========================
# 🔹 SIMPLIFY TEXT ENDPOINT
# =========================
@app.post("/simplify-text", response_model=SimplifyResponse)
async def simplify_text_endpoint(request: SimplifyRequest):
    """
    Returns simplified/friendly text for frontend.
    """
    print(f"Received simplify request ({request.language}): {request.text}")
    try:
        simple_text = get_friendly_caption(
            raw_text=request.text,
            target_language=request.language
        )
        return SimplifyResponse(
            raw_text=request.text,
            simple_text=simple_text
        )
    except Exception as e:
        print(f"--- 🚨 UNEXPECTED ERROR ---\n{e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the text."
        )

# =========================
# 🔹 FILE UPLOAD (TRANSCRIPTION)
# =========================
@app.post("/process-youtube", response_model=SimplifyResponse)
async def process_youtube_endpoint(request: YoutubeRequest):
    """
    Downloads audio from a YouTube/online URL, transcribes it, and returns simplified text.
    """
    try:
        raw_text = transcribe_youtube_url(request.url, selected_lang=request.language)
        simple_text = get_friendly_caption(raw_text=raw_text, target_language=request.language)
        return SimplifyResponse(raw_text=raw_text, simple_text=simple_text)
    except Exception as e:
        print("URL processing failed:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/live-caption")
async def live_caption(file: UploadFile, language: str = "english"):
    """
    Receives an uploaded audio file and returns transcription in the selected language.
    """
    try:
        full_text = transcribe_audio(file.file, selected_lang=language)
        return JSONResponse({"transcription": full_text})
    except Exception as e:
        print("❌ Error in file transcription:", e)
        raise HTTPException(status_code=500, detail="File transcription failed.")

# =========================
# 🔹 LIVE STREAMING
# =========================
@app.websocket("/ws/live-caption")
async def websocket_live_caption(websocket: WebSocket):
    """
    Accepts audio chunks via WebSocket and sends live transcription in selected language.
    """
    await websocket.accept()
    transcriber = StreamingTranscriber()

    try:
        # Receive initial message with selected language
        msg = await websocket.receive_text()
        selected_lang = msg or "english"

        while True:
            audio_chunk = await websocket.receive_bytes()
            transcriber.add_audio(audio_chunk)
            text = transcriber.transcribe_if_ready(selected_lang=selected_lang)
            if text:
                await websocket.send_text(text)

    except Exception as e:
        print("WebSocket closed:", e)

# =========================
# 🔹 WASAPI SYSTEM AUDIO STREAMING
# =========================
@app.websocket("/ws/system-audio")
async def websocket_system_audio(websocket: WebSocket):
    """
    Captures local Windows WASAPI system loopback audio, transcribes it, 
    and streams live captions back to the client.
    """
    await websocket.accept()
    
    import asyncio
    import queue
    import threading
    from system_audio import (
        AudioRingBuffer,
        WasapiHelper,
        WasapiLoopbackCapture,
        WhisperStreamingWorker,
        TARGET_SR,
        DEFAULT_BLOCK_MS
    )
    
    helper = WasapiHelper()
    device = helper.get_default_loopback()
    
    if not device:
        await websocket.send_json({"error": "No WASAPI loopback device found on host PC."})
        await websocket.close()
        return

    stop_event = threading.Event()
    ring = AudioRingBuffer(max_seconds=14, sample_rate=TARGET_SR)
    update_queue = queue.Queue()
    
    def on_caption_update(payload):
        update_queue.put(payload)

    # Read selected settings (sent as JSON on initial connection)
    try:
        settings_str = await websocket.receive_text()
        import json
        settings = json.loads(settings_str)
        enable_simplification = settings.get("simplify", False)
        model_name = settings.get("model", "small")
    except Exception:
        enable_simplification = False
        model_name = "small"

    capture_thread = WasapiLoopbackCapture(
        device_info=device,
        ring=ring,
        stop_event=stop_event,
        gain=1.0,
        block_ms=DEFAULT_BLOCK_MS
    )
    
    asr_thread = WhisperStreamingWorker(
        ring=ring,
        stop_event=stop_event,
        on_caption_update=on_caption_update,
        model_name=model_name,
        device="cpu",
        compute_type="int8",
        window_seconds=5.0,
        inference_interval=0.7,
        enable_simplification=enable_simplification
    )
    
    capture_thread.start()
    asr_thread.start()
    
    async def send_updates():
        loop = asyncio.get_running_loop()
        try:
            while not stop_event.is_set():
                # Block on queue safely in thread pool
                payload = await loop.run_in_executor(None, update_queue.get)
                if payload is None:
                    break
                await websocket.send_json(payload)
        except Exception as e:
            print("[SYSTEM AUDIO] Send task error:", e)

    send_task = asyncio.create_task(send_updates())
    
    try:
        while True:
            # Block waiting for a close/stop message from frontend or keep alive
            msg = await websocket.receive_text()
            if msg == "stop":
                break
    except Exception:
        pass
    finally:
        stop_event.set()
        update_queue.put(None)
        await send_task
        capture_thread.join(timeout=1.0)
        asr_thread.join(timeout=1.0)
        helper.close()
        print("[SYSTEM AUDIO] Cleaned up loopback session.")


# =========================
# 🔹 RUN SERVER
# =========================
if __name__ == "__main__":
    print("--- Starting server on http://127.0.0.1:8000 ---")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
