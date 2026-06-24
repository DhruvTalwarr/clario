import { ArrowUpRight, Github, Heart, Linkedin, Mail, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ClarioLogo from "@/components/ClarioLogo";

const Footer = () => {
  return (
    <footer className="footer-cinematic relative mt-20 overflow-hidden border-t border-primary/15 bg-background/80 backdrop-blur-lg animate-fade-in">
      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-primary via-[#8f5cf7] to-accent footer-line" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-10 rounded-[1.5rem] border border-primary/15 bg-background/65 p-5 shadow-lg backdrop-blur md:flex md:items-center md:justify-between">
          <div className="flex items-center justify-center gap-3 md:justify-start">
            <Sparkles className="h-5 w-5 text-primary animate-bounce-subtle" />
            <p className="text-sm font-semibold text-foreground">Ready to make conversations easier to follow?</p>
          </div>
          <Link to="/live-captioning" className="group mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:bg-[#8f5cf7] md:mt-0">
            Start now
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-4 md:text-left">
          <div className="space-y-4 transition-transform hover:-translate-y-1">
            <div className="flex justify-center md:justify-start">
              <ClarioLogo />
            </div>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground md:mx-0">
              Empowering inclusivity with real-time multilingual captions and ISL translation.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Product</h3>
            <ul className="space-y-3">
              {[
                { name: "Live Captioning", path: "/live-captioning" },
                { name: "Text to Avatar", path: "/text-to-avatar" },
                { name: "Settings", path: "/settings" },
              ].map((item) => (
                <li key={item.name}>
                  <Link to={item.path} className="footer-link inline-flex items-center gap-2 text-sm text-muted-foreground transition-all hover:text-primary">
                    {item.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Company</h3>
            <ul className="space-y-3">
              {[
                { name: "About Us", path: "/about" },
                { name: "Our Team", path: "/about#team" },
                { name: "Contact", path: "/about#contact" },
              ].map((item) => (
                <li key={item.name}>
                  <a href={item.path} className="footer-link inline-flex items-center gap-2 text-sm text-muted-foreground transition-all hover:text-primary">
                    {item.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Connect</h3>
            <div className="flex justify-center gap-4 md:justify-start">
              {[
                { icon: Github, href: "https://github.com", label: "GitHub" },
                { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
                { icon: Mail, href: "mailto:hello@clario.com", label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="footer-social rounded-xl bg-primary/8 p-2 transition-all duration-300 hover:-translate-y-1 hover:bg-primary"
                >
                  <Icon className="h-5 w-5 text-foreground transition-colors hover:text-white" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-primary/15 pt-8 text-center md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 <span className="font-semibold">Clario</span>. Built with accessibility at its core.
          </p>
          <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="h-4 w-4 text-primary animate-bounce-subtle" /> for inclusion
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
