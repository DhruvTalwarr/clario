import { MessageCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type ClarioLogoProps = {
  className?: string;
};

const ClarioLogo = ({ className = "" }: ClarioLogoProps) => {
  return (
    <Link to="/" className={`group inline-flex items-center gap-3 ${className}`}>
      <span className="relative grid h-11 w-11 place-items-center rounded-[1rem] bg-gradient-to-br from-[#4c1d95] via-[#8b5cf6] to-[#f0c995] shadow-lg shadow-primary/25 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-3deg] group-hover:shadow-primary/35">
        <MessageCircle className="h-6 w-6 text-primary-foreground" />
        <Sparkles className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-background p-0.5 text-accent shadow-sm" />
      </span>
      <span className="font-serif text-[1.7rem] font-black italic tracking-wide text-foreground transition-colors group-hover:text-primary">
        Clario
      </span>
    </Link>
  );
};

export default ClarioLogo;
