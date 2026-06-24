import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import ClarioLogo from "@/components/ClarioLogo";

const navLinks = [
  { label: "Live Captioning", path: "/live-captioning" },
  { label: "Text to Avatar", path: "/text-to-avatar" },
  { label: "About", path: "/about" },
];

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <nav className="sticky top-0 z-50 border-b border-primary/20 bg-background/90 shadow-[0_10px_30px_hsl(var(--primary)/0.1)] backdrop-blur-2xl animate-fade-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <ClarioLogo />

          <div className="hidden items-center gap-5 rounded-full border border-primary/10 bg-background/55 px-2 py-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="rounded-full px-3 py-2 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}

            <ThemeToggle />

            <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-primary via-[#8f5cf7] to-accent px-5 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-primary/30">
              <Link to="/live-captioning">Get Started</Link>
            </Button>
          </div>

          <button
            onClick={toggleMobileMenu}
            className="rounded-full border border-primary/15 bg-background/70 p-2 transition-all duration-300 hover:bg-primary/10 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-primary/15 bg-background/95 py-4 backdrop-blur-lg animate-fade-in md:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={toggleMobileMenu}
                  className="py-2 font-medium text-foreground transition-all hover:translate-x-1 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}

              <Button asChild size="sm" className="rounded-xl bg-gradient-to-r from-primary via-[#8f5cf7] to-accent font-semibold text-white shadow-md transition-all hover:shadow-primary/30">
                <Link to="/live-captioning" onClick={toggleMobileMenu}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
