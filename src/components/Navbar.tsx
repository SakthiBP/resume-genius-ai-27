import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import OverallScoreBadge from "./OverallScoreBadge";

interface NavbarProps {
  score: number | null;
  isDark: boolean;
  onToggleTheme: () => void;
}

const Navbar = ({ score, isDark, onToggleTheme }: NavbarProps) => {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
      <div className="flex items-center gap-2 min-w-[140px]">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">R</span>
        </div>
        <span className="font-semibold text-foreground text-lg">ResumeAI</span>
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
