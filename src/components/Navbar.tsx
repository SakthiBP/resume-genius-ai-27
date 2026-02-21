import { Moon, Sun, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import OverallScoreBadge from "./OverallScoreBadge";
import SwimLogo from "./SwimLogo";
import { useTheme } from "@/hooks/useTheme";

interface NavbarProps {
  score: number | null;
}

const Navbar = ({ score }: NavbarProps) => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3 min-w-[200px]">
        <SwimLogo size={28} />
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-foreground text-lg leading-none">Swim</span>
          <span className="text-[10px] text-muted-foreground tracking-wide">Agentic Talent Screening</span>
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        {score !== null && <OverallScoreBadge score={score} />}
      </div>

      <div className="min-w-[200px] flex items-center justify-end gap-2">
        <Link to="/candidates">
          <Button variant={location.pathname === "/candidates" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-none">
            <Users className="h-3.5 w-3.5" />
            Candidates
          </Button>
        </Link>
        <Link to="/roles">
          <Button variant={location.pathname === "/roles" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-none">
            <Briefcase className="h-3.5 w-3.5" />
            Roles
          </Button>
        </Link>
        <Link to="/">
          <Button variant={location.pathname === "/" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs transition-none">
            Analyser
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
