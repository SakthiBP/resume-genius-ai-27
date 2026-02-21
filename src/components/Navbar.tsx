import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import OverallScoreBadge from "./OverallScoreBadge";
import SwimLogo from "./SwimLogo";

interface NavbarProps {
  score: number | null;
  isDark: boolean;
  onToggleTheme: () => void;
}

const Navbar = ({ score, isDark, onToggleTheme }: NavbarProps) => {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 shrink-0 transition-colors duration-300">
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

      <div className="min-w-[140px] flex justify-end">
        <Button variant="ghost" size="icon" onClick={onToggleTheme} className="h-9 w-9">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
