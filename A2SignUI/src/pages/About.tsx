import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelpPopover from "@/components/HelpPopover";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  Captions,
  CheckCircle2,
  Github,
  Hand,
  Heart,
  Languages,
  Linkedin,
  Mail,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

const About = () => {
  const pillars = [
    {
      icon: <Target className="h-7 w-7 text-primary" />,
      title: "Our Mission",
      description:
        "To make everyday communication easier for Deaf, hard-of-hearing, and low-literacy users through real-time captioning, simplification, and sign generation.",
    },
    {
      icon: <Heart className="h-7 w-7 text-accent" />,
      title: "Our Vision",
      description:
        "A more inclusive digital India where language, hearing ability, and reading comfort never decide who gets access to information.",
    },
    {
      icon: <Users className="h-7 w-7 text-success" />,
      title: "Our Values",
      description:
        "We design with empathy, build for clarity, and keep accessibility at the center of every product decision.",
    },
  ];

  const whyUs = [
    {
      icon: <Radio className="h-6 w-6" />,
      title: "Real-time first",
      description: "Fast caption and sign-generation flows designed for live conversations, classrooms, events, and public services.",
    },
    {
      icon: <Languages className="h-6 w-6" />,
      title: "Indian language depth",
      description: "Built around multilingual access across major Indian languages, not as an afterthought.",
    },
    {
      icon: <BrainCircuit className="h-6 w-6" />,
      title: "Simpler meaning",
      description: "AI simplification helps turn complex information into clearer, more accessible language.",
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: "Practical accessibility",
      description: "Offline-ready thinking and low-latency design make Clario useful where accessibility tools are needed most.",
    },
  ];

  const process = [
    { icon: <Captions className="h-6 w-6" />, label: "Listen", text: "Capture speech and language context." },
    { icon: <Sparkles className="h-6 w-6" />, label: "Clarify", text: "Simplify text without losing intent." },
    { icon: <Hand className="h-6 w-6" />, label: "Sign", text: "Generate accessible ISL avatar output." },
  ];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="cinematic-hero relative overflow-hidden py-12 lg:py-16">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div className="space-y-7 animate-slide-up">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">About Clario</p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight lg:text-6xl">
                Communication access that feels immediate, human, and beautifully clear.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Clario brings live captions, AI-powered simplification, and Indian Sign Language generation into one cinematic, real-time accessibility experience for Indian communities.
              </p>
              <div className="grid max-w-2xl grid-cols-3 gap-3">
                {["9+ languages", "Sub-2s flow", "ISL focused"].map((item) => (
                  <div key={item} className="rounded-2xl border border-primary/15 bg-background/70 p-4 text-center shadow-sm backdrop-blur">
                    <p className="text-sm font-bold text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-primary/15 bg-[#fff8ef]/75 p-6 shadow-2xl backdrop-blur animate-slide-up">
              <div className="space-y-5">
                {process.map((step, index) => (
                  <div key={step.label} className="group flex items-center gap-5 rounded-2xl border border-primary/10 bg-background/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8f5cf7] text-white shadow-md">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Step 0{index + 1}</p>
                      <h3 className="text-xl font-semibold">{step.label}</h3>
                      <p className="text-sm text-muted-foreground">{step.text}</p>
                    </div>
                    <Zap className="ml-auto h-5 w-5 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-band py-20">
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {pillars.map((pillar, index) => (
              <div key={pillar.title} className="interactive-card scroll-reveal p-7 text-center" style={{ animationDelay: `${index * 90}ms` }}>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  {pillar.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold">{pillar.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{pillar.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-muted/35 py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div className="space-y-5 scroll-reveal">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">The challenge</p>
              <h2 className="text-3xl font-bold lg:text-4xl">Access should not arrive late.</h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Deaf and hard-of-hearing users often face delayed captions, limited regional language support, and digital spaces with no sign-language bridge. Low-literacy users can also be excluded when essential information is written in complex language.
              </p>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Clario responds with one connected interface: speech becomes captions, captions become simpler meaning, and text becomes ISL avatar output.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                "Regional language support for wider public use",
                "Captioning, simplification, and ISL in one journey",
                "Interface choices shaped around clarity and focus",
                "Useful for classrooms, services, events, and daily communication",
              ].map((item, index) => (
                <div key={item} className="interactive-card scroll-reveal p-5" style={{ animationDelay: `${index * 80}ms` }}>
                  <CheckCircle2 className="mb-4 h-6 w-6 text-primary" />
                  <p className="font-medium leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20" id="why-us">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-3xl text-center scroll-reveal">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Why us</p>
              <h2 className="mt-3 text-3xl font-bold lg:text-4xl">Built for the moments where clarity matters.</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Clario is not just a caption box. It is a translation layer for speech, text, and sign that helps people stay present in the same moment.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {whyUs.map((item, index) => (
                <div key={item.title} className="keyfeature-card scroll-reveal" style={{ animationDelay: `${index * 70}ms` }}>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#8f5cf7] text-white">
                    {item.icon}
                  </div>
                  <h3 className="mb-3 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-r from-primary via-[#7f4bd7] to-accent py-20" id="contact">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,248,239,0.25),transparent_28%),radial-gradient(circle_at_88%_70%,rgba(50,26,87,0.25),transparent_32%)]" />
          <div className="relative mx-auto max-w-4xl space-y-8 px-4 text-center sm:px-6 lg:px-8 scroll-reveal">
            <h2 className="text-3xl font-bold text-primary-foreground">Get In Touch</h2>
            <p className="mx-auto max-w-2xl text-lg text-primary-foreground/90">
              Have questions, feedback, or want to collaborate on inclusive communication? We'd love to hear from you.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              {[
                { icon: Mail, href: "mailto:hello@clario.com", label: "Email Us" },
                { icon: Github, href: "https://github.com", label: "GitHub" },
                { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
              ].map(({ icon: Icon, href, label }) => (
                <Button key={label} variant="outline" size="lg" className="gap-2 border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary btn-glare-effect" asChild>
                  <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
                    <Icon className="h-5 w-5" />
                    {label}
                    <span className="glare" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <HelpPopover />
    </div>
  );
};

export default About;
