import { useRef, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelpPopover from "@/components/HelpPopover";
import LanguageSelector from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Captions, FileText, Mic, MicOff, Play, Link as LinkIcon, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

type CaptionResult = {
  raw_text: string;
  simple_text: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const languageNames: Record<string, string> = {
  en: "english",
  hi: "hindi",
  mr: "marathi",
  gu: "gujarati",
  ta: "tamil",
  te: "telugu",
  bn: "bengali",
  ml: "malayalam",
  or: "odia",
};

const toBackendLanguage = (language: string) => languageNames[language] || "english";

const LiveCaptioning = () => {
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const systemAudioWsRef = useRef<WebSocket | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  
  const [audioSource, setAudioSource] = useState<"mic" | "system">("mic");
  const [language, setLanguage] = useState("en");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [liveRawText, setLiveRawText] = useState("");
  const [liveSimpleText, setLiveSimpleText] = useState("");
  const [youtubeResult, setYoutubeResult] = useState<CaptionResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [isSimplifyingSpeech, setIsSimplifyingSpeech] = useState(false);

  useEffect(() => {
    return () => {
      if (systemAudioWsRef.current) {
        systemAudioWsRef.current.close();
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const simplifySpeech = async (text: string) => {
    if (!text.trim()) return;

    setIsSimplifyingSpeech(true);
    try {
      const response = await fetch(`${API_BASE}/simplify-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: toBackendLanguage(language),
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      const result: CaptionResult = await response.json();
      setLiveSimpleText(result.simple_text);
    } catch {
      setLiveSimpleText(text);
      toast({
        title: "Simplification unavailable",
        description: "Showing the raw speech text. Start the FastAPI backend for simplified output.",
        variant: "destructive",
      });
    } finally {
      setIsSimplifyingSpeech(false);
    }
  };

  const startMicListening = () => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      toast({
        title: "Speech recognition unavailable",
        description: "Use Chrome or Edge for real-time browser speech recognition.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "en" ? "en-IN" : `${language}-IN`;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Mic error",
        description: "Please allow microphone access and try again.",
        variant: "destructive",
      });
    };
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      const combined = `${liveRawText} ${finalTranscript || interimTranscript}`.trim();
      setLiveRawText(combined);

      if (finalTranscript.trim()) {
        simplifySpeech(combined);
      }
    };

    recognition.start();
  };

  const stopMicListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startSystemAudioCaptioning = async () => {
    try {
      // 1. Capture system audio via getDisplayMedia
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1,
          height: 1,
          frameRate: 1,
        },
        audio: true,
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        toast({
          title: "Audio sharing required",
          description: "Please check 'Share audio' when choosing a screen or tab to capture system audio.",
          variant: "destructive",
        });
        return;
      }

      screenStreamRef.current = stream;

      // 2. Setup WebSocket connection to the cloud backend
      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = API_BASE.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProto}//${wsHost}/ws/live-caption`;

      const ws = new WebSocket(wsUrl);
      systemAudioWsRef.current = ws;

      ws.onopen = () => {
        setIsListening(true);
        // Send initial language selection
        ws.send(language === "en" ? "english" : language);

        // 3. Setup AudioContext to capture PCM bytes
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          audioContextRef.current = audioContext;

          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorNodeRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              ws.send(pcmData.buffer);
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);
        } catch (err) {
          console.error("Audio Context initialization error:", err);
        }
      };

      ws.onmessage = (event) => {
        const text = event.data.trim();
        if (text) {
          setLiveRawText((prev) => {
            const updated = prev ? `${prev} ${text}` : text;
            simplifySpeech(updated);
            return updated;
          });
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        toast({
          title: "Connection Error",
          description: "Failed to connect to the cloud transcription backend.",
          variant: "destructive",
        });
        stopSystemAudioCaptioning();
      };

      ws.onclose = () => {
        stopSystemAudioCaptioning();
      };

    } catch (err: any) {
      console.error("System audio capture error:", err);
      if (err.name !== "NotAllowedError") {
        toast({
          title: "Capture Failed",
          description: "Could not start browser audio loopback capture.",
          variant: "destructive",
        });
      }
      setIsListening(false);
    }
  };

  const stopSystemAudioCaptioning = () => {
    if (systemAudioWsRef.current) {
      try {
        systemAudioWsRef.current.close();
      } catch (err) {}
      systemAudioWsRef.current = null;
    }
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch (err) {}
      processorNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (err) {}
      audioContextRef.current = null;
    }
    if (screenStreamRef.current) {
      try {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (err) {}
      screenStreamRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    if (audioSource === "system") {
      startSystemAudioCaptioning();
    } else {
      startMicListening();
    }
  };

  const stopListening = () => {
    if (audioSource === "system") {
      stopSystemAudioCaptioning();
    } else {
      stopMicListening();
    }
  };

  const processYoutube = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "YouTube link required",
        description: "Paste a YouTube video URL first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingUrl(true);
    setYoutubeResult(null);
    try {
      const response = await fetch(`${API_BASE}/process-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl,
          language: toBackendLanguage(language),
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      const result: CaptionResult = await response.json();
      setYoutubeResult(result);
    } catch {
      toast({
        title: "Could not process video",
        description: "Make sure the FastAPI backend is running and yt-dlp/ffmpeg are installed.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingUrl(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8 rounded-[1.5rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <Captions className="h-4 w-4" />
                Live accessibility studio
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight lg:text-5xl">Turning Conversations into Clarity</h1>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  Capture live speech and transform it into accurate, real-time captions. Upload videos to generate transcripts, simplified summaries, and key insights, making content more accessible, searchable, and easier to understand for everyone.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Mic, text: "Start the mic" },
                  { icon: FileText, text: "Review transcript" },
                  { icon: Sparkles, text: "Read simplified output" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-primary" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <LanguageSelector value={language} onValueChange={setLanguage} />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-lg border-2">
            <CardContent className="p-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">YouTube Video</h2>
                <p className="text-sm text-muted-foreground">
                  Paste a video link to transcribe and simplify it in the selected language.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={youtubeUrl}
                    onChange={(event) => setYoutubeUrl(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-11 w-full rounded-lg border-2 bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <Button onClick={processYoutube} disabled={isProcessingUrl} className="gap-2">
                  {isProcessingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Process
                </Button>
              </div>

              <div className="grid gap-3">
                <CaptionPanel title="Raw Transcription" text={youtubeResult?.raw_text} loading={isProcessingUrl} />
                <CaptionPanel title="Simplified Translation" text={youtubeResult?.simple_text} loading={isProcessingUrl} highlight />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-2">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Real-Time Speech & System Audio</h2>
                  <p className="text-sm text-muted-foreground">
                    {audioSource === "mic"
                      ? "Speak into the mic and receive a simplified caption."
                      : "Listen to any audio playing on your laptop/system in real-time."}
                  </p>
                </div>
                {isListening && <Badge>Listening</Badge>}
              </div>

              <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-lg border">
                <span className="text-sm font-medium">Audio Source:</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={audioSource === "mic" ? "hero" : "outline"}
                    size="sm"
                    onClick={() => !isListening && setAudioSource("mic")}
                    disabled={isListening}
                    className="h-8"
                  >
                    Microphone
                  </Button>
                  <Button
                    type="button"
                    variant={audioSource === "system" ? "hero" : "outline"}
                    size="sm"
                    onClick={() => !isListening && setAudioSource("system")}
                    disabled={isListening}
                    className="h-8"
                  >
                    System Audio (WASAPI)
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant={isListening ? "destructive" : "hero"}
                  size="lg"
                  onClick={isListening ? stopListening : startListening}
                  className="gap-2"
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  {isListening ? "Stop Listening" : "Start Listening"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setLiveRawText("");
                    setLiveSimpleText("");
                  }}
                >
                  Clear
                </Button>
              </div>

              <div className="grid gap-3">
                <CaptionPanel title="Raw Live Speech" text={liveRawText} loading={false} />
                <CaptionPanel
                  title="Simplified Translation"
                  text={liveSimpleText}
                  loading={isSimplifyingSpeech}
                  highlight
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <HelpPopover />
    </div>
  );
};

const CaptionPanel = ({
  title,
  text,
  loading,
  highlight = false,
}: {
  title: string;
  text?: string;
  loading: boolean;
  highlight?: boolean;
}) => (
  <div className={`rounded-lg border p-4 ${highlight ? "bg-primary/5" : "bg-muted/30"}`}>
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
    <div className="min-h-[130px] max-h-[260px] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-foreground">
      {text || <span className="text-muted-foreground">Output will appear here.</span>}
    </div>
  </div>
);

export default LiveCaptioning;
