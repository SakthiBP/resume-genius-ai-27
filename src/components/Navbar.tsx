import { useState } from "react";
import { Moon, Sun, Users, Briefcase, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import OverallScoreBadge from "./OverallScoreBadge";
import SwimLogo from "./SwimLogo";
import { useTheme } from "@/hooks/useTheme";

interface NavbarProps {
  score?: number | null;
}

const Navbar = ({ score = null }: NavbarProps) => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [logoHovered, setLogoHovered] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3 min-w-[200px]">
        <Link
          to="/"
          className="flex items-center gap-3 no-underline"
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <SwimLogo size={28} animate={logoHovered} />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-foreground text-lg leading-none">SWIMR</span>
            <span className="text-[10px] text-muted-foreground tracking-wide">Agentic Talent Screening</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex justify-center">
        {score !== null && <OverallScoreBadge score={score} />}
      </div>

      <div className="min-w-[200px] flex items-center justify-end gap-2">
        <Link to="/analyze">
          <Button variant={location.pathname === "/analyze" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-colors duration-200">
            <FileText className="h-3.5 w-3.5" />
            Analyser
          </Button>
        </Link>
        <Link to="/candidates">
          <Button variant={location.pathname === "/candidates" || location.pathname.startsWith("/candidates/") ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-colors duration-200">
            <Users className="h-3.5 w-3.5" />
            Candidates
          </Button>
        </Link>
        <Link to="/roles">
          <Button variant={location.pathname === "/roles" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-colors duration-200">
            <Briefcase className="h-3.5 w-3.5" />
            Roles
          </Button>
        </Link>
        <Link to="/roi">
          <Button variant={location.pathname === "/roi" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-colors duration-200">
            <TrendingUp className="h-3.5 w-3.5" />
            Proof of Value
          </Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
