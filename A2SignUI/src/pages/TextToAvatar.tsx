import { useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelpPopover from "@/components/HelpPopover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Hand, Mic, Play, RotateCcw, Sparkles, Square, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

type SignItem = {
  label: string;
  src: string;
};

const ASSET_BASE = "/sign-assets";

const AVAILABLE_SIGNS = new Set([
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "After", "Again", "Against", "Age", "All", "Alone", "Also", "And", "Ask", "At",
  "B", "Be", "Beautiful", "Before", "Best", "Better", "Busy", "But", "Bye",
  "C", "Can", "Cannot", "Change", "College", "Come", "Computer",
  "D", "Day", "Distance", "Do", "Do Not", "Does Not",
  "E", "Eat", "Engineer",
  "F", "Fight", "Finish", "From",
  "G", "Glitter", "Go", "God", "Gold", "Good", "Great",
  "H", "Hand", "Hands", "Happy", "Hello", "Help", "Her", "Here", "His", "Home", "Homepage", "How",
  "I", "Invent", "It",
  "J", "K", "Keep", "L", "Language", "Laugh", "Learn",
  "M", "ME", "More", "My",
  "N", "Name", "Next", "Not", "Now",
  "O", "Of", "On", "Our", "Out",
  "P", "Pretty", "Q", "R", "Right",
  "S", "Sad", "Safe", "See", "Self", "Sign", "Sing", "So", "Sound", "Stay", "Study",
  "T", "Talk", "Television", "Thank", "Thank You", "That", "They", "This", "Those", "Time", "To", "Type",
  "U", "Us", "V", "W", "Walk", "Wash", "Way", "We", "Welcome", "What", "When", "Where", "Which", "Who", "Whole", "Whose", "Why", "Will", "With", "Without", "Words", "Work", "World", "Wrong",
  "X", "Y", "You", "Your", "Yourself", "Z",
]);

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being", "to",
  "for", "of", "that", "as", "do", "does", "did", "have", "has", "had", "itself",
]);

const PHRASE_SIGNS: Record<string, string> = {
  "thank you": "Thank You",
  "do not": "Do Not",
  "does not": "Does Not",
};

const WORD_ALIASES: Record<string, string> = {
  i: "ME",
  me: "ME",
  thanks: "Thank",
  hi: "Hello",
  goodbye: "Bye",
  cannot: "Cannot",
  cant: "Cannot",
  "won't": "Will",
  going: "Go",
  goes: "Go",
  went: "Go",
  came: "Come",
  coming: "Come",
  eating: "Eat",
  ate: "Eat",
  studying: "Study",
  studied: "Study",
  talking: "Talk",
  talked: "Talk",
  walking: "Walk",
  walked: "Walk",
  working: "Work",
  worked: "Work",
  words: "Words",
};

const titleCase = (word: string) =>
  word.length <= 1 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

const toAsset = (label: string): SignItem => ({
  label,
  src: `${ASSET_BASE}/${encodeURIComponent(label)}.mp4`,
});

const tokenize = (input: string) =>
  input
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

const buildSignSequence = (input: string): SignItem[] => {
  const rawWords = tokenize(input);
  const output: string[] = [];

  for (let index = 0; index < rawWords.length; index += 1) {
    const current = rawWords[index].toLowerCase();
    const next = rawWords[index + 1]?.toLowerCase();
    const phrase = next ? `${current} ${next}` : "";

    if (PHRASE_SIGNS[phrase]) {
      output.push(PHRASE_SIGNS[phrase]);
      index += 1;
      continue;
    }

    if (STOP_WORDS.has(current)) continue;

    const alias = WORD_ALIASES[current];
    const candidate = alias || titleCase(current);

    if (AVAILABLE_SIGNS.has(candidate)) {
      output.push(candidate);
      continue;
    }

    for (const char of current.toUpperCase()) {
      if (AVAILABLE_SIGNS.has(char)) output.push(char);
    }
  }

  if (/\b(will|shall|would)\b/i.test(input) && !output.includes("Will")) {
    output.unshift("Will");
  }

  if (/\b(was|were|had|did|went|came|studied|worked|talked|walked)\b/i.test(input) && !output.includes("Before")) {
    output.unshift("Before");
  }

  if (/\b(now|currently|going|coming|eating|studying|working|talking|walking)\b/i.test(input) && !output.includes("Now")) {
    output.unshift("Now");
  }

  return output.map(toAsset);
};

const TextToAvatar = () => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [text, setText] = useState("");
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const activeSign = activeIndex >= 0 ? signs[activeIndex] : null;

  const characterCount = useMemo(() => text.length, [text]);

  const playAt = (index: number, sequence = signs) => {
    const player = videoRef.current;
    const sign = sequence[index];
    if (!player || !sign) {
      setIsPlaying(false);
      return;
    }

    setActiveIndex(index);
    player.src = sign.src;
    player.load();
    player.play();
    setIsPlaying(true);
  };

  const handleGenerate = () => {
    const sequence = buildSignSequence(text);

    if (!text.trim()) {
      toast({
        title: "Input required",
        description: "Enter text or use the mic before generating signs.",
        variant: "destructive",
      });
      return;
    }

    if (sequence.length === 0) {
      toast({
        title: "No signs found",
        description: "Try a simpler sentence or use common words like hello, thank you, good, home, or work.",
        variant: "destructive",
      });
      return;
    }

    setSigns(sequence);
    setActiveIndex(0);
    setTimeout(() => playAt(0, sequence), 0);
  };

  const handleEnded = () => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < signs.length) {
      playAt(nextIndex);
      return;
    }

    setIsPlaying(false);
  };

  const handleReplay = () => {
    if (signs.length > 0) playAt(0);
  };

  const handleStop = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  const handleMic = () => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      toast({
        title: "Mic unavailable",
        description: "Speech recognition works best in Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast({
        title: "Could not hear speech",
        description: "Please check mic permission and try again.",
        variant: "destructive",
      });
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8 rounded-[1.5rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-accent/20 p-6 shadow-lg sm:p-8">
          <div className="max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <Hand className="h-4 w-4" />
              Sign generation studio
            </div>
            <div>
              <h1 className="text-3xl font-bold leading-tight lg:text-5xl">From Voice to Visual Understanding</h1>
              <p className="mt-2 text-xl font-semibold text-primary">Break Communication Barriers</p>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Convert speech and text into expressive Indian Sign Language animations in real time. Empower conversations, improve accessibility, and create a more inclusive digital experience for everyone.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Type, text: "Type or speak" },
                { icon: Sparkles, text: "Generate signs" },
                { icon: Play, text: "Watch playback" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 rounded-xl border border-primary/10 bg-background/70 px-3 py-2 text-sm font-semibold">
                  <Icon className="h-4 w-4 text-primary" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="h-full rounded-lg border-2">
            <CardContent className="p-5 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Text & Audio Input</h2>
                <p className="text-sm text-muted-foreground">
                  Type a sentence or use speech-to-text before generating signs.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Enter Text</label>
                <Textarea
                  placeholder="Try: hello, thank you, I will go home"
                  value={text}
                  onChange={(event) => setText(event.target.value.slice(0, 500))}
                  className="min-h-[140px] rounded-lg border-2 text-base resize-none"
                  aria-label="Text input for ISL conversion"
                />
                <p className="mt-2 text-xs text-muted-foreground">{characterCount}/500 characters</p>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Button
                  type="button"
                  variant={isListening ? "destructive" : "outline"}
                  size="lg"
                  onClick={handleMic}
                  aria-label="Use microphone"
                  className="gap-2"
                >
                  <Mic className="h-5 w-5" />
                  <span className="hidden sm:inline">{isListening ? "Listening" : "Speech"}</span>
                </Button>
                <Button type="button" variant="hero" size="lg" onClick={handleGenerate} className="gap-2">
                  <Play className="h-5 w-5" />
                  Generate Sign Animation
                </Button>
              </div>

              {isListening && <Badge className="w-fit">Listening...</Badge>}

              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="mb-2 text-sm font-semibold">Generated Signs</h3>
                {signs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {signs.map((sign, index) => (
                      <Badge
                        key={`${sign.label}-${index}`}
                        variant={index === activeIndex ? "default" : "secondary"}
                      >
                        {sign.label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Signs will appear here after generation. Missing words are fingerspelled.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="h-full rounded-lg border-2">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Sign Language Animation</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeSign ? `Playing: ${activeSign.label}` : "Generate a sentence to begin playback."}
                  </p>
                </div>
                {isPlaying && <Badge>Playing</Badge>}
              </div>

              <div className="overflow-hidden rounded-lg bg-slate-950">
                <video
                  ref={videoRef}
                  className="aspect-video h-full max-h-[360px] min-h-[260px] w-full object-contain"
                  controls
                  onEnded={handleEnded}
                >
                  Your browser does not support HTML5 video.
                </video>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="outline" size="lg" onClick={handleReplay} disabled={signs.length === 0} className="gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Replay
                </Button>
                <Button type="button" variant="secondary" size="lg" onClick={handleStop} disabled={!isPlaying} className="gap-2">
                  <Square className="h-5 w-5" />
                  Stop
                </Button>
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

export default TextToAvatar;
