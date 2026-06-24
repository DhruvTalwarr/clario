import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelpPopover from "@/components/HelpPopover";
import AnimatedHeroText from "@/components/AnimatedHeroText";
import heroVisual from "@/assets/clario-hero-visual.svg";
import {
  Captions,
  Eye,
  Hand,
  Heart,
  Languages,
  MessageSquare,
  Mic,
  Shield,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

const Home = () => {
  const keyFeatures = [
    {
      icon: <Mic className="h-8 w-8 text-primary" />,
      title: "Can every voice become readable instantly?",
      description: "Live captions turn speech into clear text before the moment is lost.",
      back: "Use it for classrooms, public counters, interviews, and fast moving conversations.",
      badge: "Listen",
    },
    {
      icon: <Eye className="h-8 w-8 text-accent" />,
      title: "What if complex text felt simple?",
      description: "AI simplification reshapes dense words into accessible meaning.",
      back: "Helpful for users who need direct language, quick summaries, and less cognitive load.",
      badge: "Clarify",
    },
    {
      icon: <User className="h-8 w-8 text-success" />,
      title: "Can text move like language?",
      description: "ISL avatar translation gives information a visual signing layer.",
      back: "Bridge spoken and written content into expressive sign animations in real time.",
      badge: "Sign",
    },
  ];

  const allFeatures = [
    {
      icon: <Mic className="h-8 w-8 text-primary" />,
      title: "Real-Time Captioning",
      description:
        "Live speech-to-text transcription in 9 Indian languages with sub-2-second latency",
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-accent" />,
      title: "AI Text Simplification",
      description:
        "Automatically simplify captions for low-literacy users with NLP-powered clarity",
    },
    {
      icon: <User className="h-8 w-8 text-success" />,
      title: "ISL Avatar Translation",
      description:
        "Watch text transform into Indian Sign Language through animated avatars",
    },
    {
      icon: <Languages className="h-8 w-8 text-primary" />,
      title: "Multilingual Support",
      description:
        "Hindi, English, Marathi, Gujarati, Tamil, Telugu, Bengali, Malayalam, Odia",
    },
    {
      icon: <Zap className="h-8 w-8 text-accent" />,
      title: "Low Latency",
      description:
        "End-to-end processing in under 3 seconds for seamless communication",
    },
    {
      icon: <Shield className="h-8 w-8 text-success" />,
      title: "Offline Ready",
      description:
        "Continue using core features even without internet connection",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <section className="cinematic-hero relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur">
              <Heart className="h-4 w-4 fill-primary" />
              <span>Accessibility First</span>
            </div>

            <AnimatedHeroText />

            <p className="hero-subheading text-lg text-muted-foreground leading-relaxed max-w-xl">
              Experience multilingual speech-to-text captioning, AI-powered text simplification,
              and Indian Sign Language avatar translation—all in real-time.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button asChild variant="hero" size="lg" className="btn-orbit-effect">
                <Link to="/live-captioning">
                  Start Captioning
                  <span className="orbit-dot" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="try-isl-button btn-glare-effect border-primary/30 bg-background/70">
                <Link to="/text-to-avatar">
                  Try Text to ISL
                  <span className="glare" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="hero-visual-shell relative animate-slide-up">
            <div className="absolute -left-6 top-12 z-10 rounded-2xl border-2 border-white/70 bg-gradient-to-r from-primary to-[#8f5cf7] px-4 py-3 text-white shadow-2xl shadow-primary/30 backdrop-blur float-slow">
              <div className="flex items-center gap-3">
                <Captions className="h-5 w-5 text-white" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Live captions</p>
                  <p className="text-sm font-bold text-white">9 Languages</p>
                </div>
              </div>
            </div>

            <img
              src={heroVisual}
              alt="Cinematic Clario interface showing captions, sign generation, and language translation"
              className="relative z-0 w-full rounded-[2rem] border border-primary/15 object-cover"
            />

            <div className="absolute -bottom-5 right-4 z-10 rounded-2xl border-2 border-white/80 bg-gradient-to-r from-[#fff8ef] to-[#f0c995] px-4 py-3 shadow-2xl shadow-accent/30 backdrop-blur float-slow">
              <div className="flex items-center gap-3">
                <Hand className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/75">ISL avatar</p>
                  <p className="text-sm font-bold text-foreground">&lt; 2s Latency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,hsl(var(--background)),hsl(var(--secondary)/0.58),hsl(var(--accent)/0.18))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
            <div className="space-y-4 scroll-reveal">
              <span className="motion-badge">Inclusive flow</span>
              <h2 className="text-3xl font-bold leading-tight lg:text-5xl">Where does communication usually break?</h2>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground scroll-reveal">
              Clario connects three missing links in one elegant flow: hearing speech, understanding meaning, and seeing language through Indian Sign Language.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {keyFeatures.map((feature, index) => (
              <div key={feature.title} className="flip-card scroll-reveal" style={{ animationDelay: `${index * 90}ms` }}>
                <div className="flip-card-inner">
                  <div className="flip-card-face flip-card-front">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-background shadow-md">
                        {feature.icon}
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">{feature.badge}</span>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                  <div className="flip-card-face flip-card-back">
                    <Sparkles className="mb-5 h-8 w-8 text-accent" />
                    <h3 className="mb-3 text-xl font-semibold text-white">{feature.badge} without friction</h3>
                    <p className="leading-relaxed text-white/82">{feature.back}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#2d1750] py-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(169,135,255,0.32),transparent_32%),radial-gradient(circle_at_88%_70%,rgba(242,212,174,0.24),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 flex flex-col gap-5 text-center scroll-reveal">
            <span className="mx-auto rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur">Feature orbit</span>
            <h2 className="text-3xl font-bold lg:text-5xl">What should accessibility feel like?</h2>
            <p className="mx-auto max-w-2xl text-lg text-white/75">
              Fast, visible, multilingual, and calm enough to use in real conversations.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {allFeatures.map((feature, index) => (
              <div key={feature.title} className="feature-orbit-card scroll-reveal group" style={{ animationDelay: `${index * 70}ms` }}>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 leading-relaxed text-white/70">{feature.description}</p>
                  <span className="mt-5 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Clario ready</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.55))]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8 lg:items-center">
          <div className="space-y-5 scroll-reveal">
            <span className="motion-badge">New</span>
            <h2 className="text-3xl font-bold leading-tight lg:text-5xl">How does Clario move from voice to access?</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Every interaction is designed as a smooth chain: capture the moment, clarify the message, and render it in the format the user needs.
            </p>
          </div>
          <div className="timeline-panel scroll-reveal">
            {[
              { step: "01", title: "Capture", text: "Speech enters as live audio, typed text, or video content." },
              { step: "02", title: "Understand", text: "AI simplifies, structures, and prepares the content for access." },
              { step: "03", title: "Express", text: "Captions, summaries, and ISL animations help everyone stay included." },
            ].map((item) => (
              <div key={item.step} className="timeline-row">
                <span>{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-primary via-[#7f4bd7] to-accent py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,248,239,0.28),transparent_28%),radial-gradient(circle_at_84%_70%,rgba(50,26,87,0.28),transparent_30%)]" />
        <div className="relative mx-auto max-w-4xl space-y-8 px-4 text-center sm:px-6 lg:px-8 scroll-reveal">
          <Sparkles className="mx-auto h-9 w-9 text-primary-foreground" />
          <h2 className="text-3xl font-bold text-primary-foreground lg:text-4xl">
            Ready to Experience Real-Time Accessibility?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-primary-foreground/90">
            Join thousands making communication accessible for Deaf, hard-of-hearing, and
            low-literacy communities.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-background text-foreground shadow-xl hover:bg-background/90 btn-glare-effect">
              <Link to="/live-captioning">
                Get Started Free
                <span className="glare" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary btn-glare-effect">
              <Link to="/about">
                Learn More
                <span className="glare" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <HelpPopover />
    </div>
  );
};

export default Home;
