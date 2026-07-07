# 🌐 Clario — Real-Time Speech & Online Audio Simplifier  
> 🏆 *Built for NIT Raipur Hackathon 2025*  
> Empowering Deaf and Hard-of-Hearing users through AI-powered transcription, simplification, and translation — from live speech **and online platforms like YouTube**.

---

## 🚀 Overview

**Clario** is an AI-powered accessibility platform designed to make spoken and online audio content understandable for everyone — including DHH (Deaf and Hard-of-Hearing) individuals.  

It captures **speech, YouTube videos, or podcasts**, converts them into text using **Faster-Whisper**, simplifies the text using **Groq’s LLM**, and translates it into multiple **Indian languages**.

💬 **In short:**  
> “We simplify the world’s audio — from real-time conversations to YouTube lectures — into clear, translated, and accessible text.”

---

## 🌟 Key Features

✅ **🎙 Real-Time Speech Transcription**  
Converts live microphone input into text using **Faster-Whisper**.

✅ **🖥️ Standalone Desktop Captioner (WASAPI Loopback)**  
Captures system audio, transcribes it in real-time, and displays a floating caption overlay with optional AI simplification.

✅ **📺 YouTube & Online Audio Translation**  
Supports transcription and simplification of **YouTube videos, podcasts, and audio URLs** via extraction with `yt-dlp`.

✅ **🧠 AI Text Simplification**  
Simplifies complex sentences using the **Groq API** for clarity and understanding.

✅ **🌐 Multilingual Translation**  
Integrates the **Google Translate API** to provide translations into Indian languages (Hindi, Marathi, Tamil, Bengali, etc.).

✅ **🖥️ Accessible Web Interface**  
Frontend built with **HTML, CSS, and JavaScript** — designed for readability and simplicity.

✅ **⚙️ Seamless Backend Integration**  
Flask-based REST API hosted on **Railway**, linked with a static **Netlify** frontend.

---

## 🧠 Tech Stack

| Layer | Technology | Purpose |
|-------|-------------|----------|
| 🎧 Audio Processing | `sounddevice`, `yt-dlp`, `moviepy`, `faster-whisper` | Capture, extract & transcribe |
| 🧩 NLP Simplification | `Groq API` | Sentence simplification |
| 🌍 Translation | `Google Translate API` | Multilingual output |
| ⚙️ Backend | `Flask`, `Flask-CORS`, `Gunicorn` | RESTful API |
| 💻 Frontend | `HTML`, `CSS`, `JavaScript` | User interface |
| ☁️ Deployment | `Railway`, `Netlify` | Cloud hosting |

---

## 🔧 System Architecture

```plaintext
         🎙 Live Speech / 🎥 YouTube URL / 💻 System Audio (WASAPI)
                          ↓
          🎧 Audio Extraction (yt-dlp / pyaudiowpatch / sounddevice)
                          ↓
              🧠 Transcription (Faster-Whisper)
                          ↓
             ✨ Simplification (Groq LLM API)
                          ↓
          🌍 Translation (Google Translate API)
                          ↓
          💬 Display (Frontend UI / Desktop Overlay)
```

---

## 🖥️ Clario Desktop Captioner (Windows WASAPI)

Clario includes a standalone Windows desktop captioner app built with **PySide6** and **PyAudioWPatch**. 

It runs locally on your PC, captures whatever system sound is currently playing (from browsers, YouTube, Zoom, video players, etc.), and displays a floating, transparent overlay with live captions.

### 🌟 Desktop Features
- **Loopback Capture:** Capture system audio directly without microphone feedback or room noise.
- **Floating Overlay:** Drag the semi-transparent overlay anywhere on the screen.
- **Language Auto-Detection:** Automatically detects the spoken language.
- **AI Simplification Integration:** If you have `GROQ_API_KEY` set in your `.env` file, you can enable **AI Simplification** to automatically simplify complex speech into readable, DHH-friendly text in real-time.

### 🚀 Running the Desktop Captioner
1. Install all dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Make sure your `.env` file contains your `GROQ_API_KEY` (if you want to use the simplification feature):
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
3. Run the desktop application:
   ```bash
   python desktop_captioner.py
   ```
