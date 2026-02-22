import { Moon, Sun, Users, Briefcase, TrendingUp, FileText, Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link, useLocation } from "react-router-dom";
import OverallScoreBadge from "./OverallScoreBadge";
import SwimLogo from "./SwimLogo";
import { useTheme } from "@/hooks/useTheme";
import { useAnalyser } from "@/contexts/AnalyserContext";
import { useBatchAnalysis } from "@/contexts/BatchAnalysisContext";
import { useDiscover } from "@/contexts/DiscoverContext";

interface NavbarProps {
  score?: number | null;
}

const Navbar = ({ score = null }: NavbarProps) => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const { isAnalysing } = useAnalyser();
  const { isRunning, completedCount, totalCount, currentItem } = useBatchAnalysis();
  const { ghSearching } = useDiscover();

  const showActivity = isAnalysing || isRunning;

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3 min-w-[200px]">
        <Link
          to="/"
          className="flex items-center gap-3 no-underline"
        >
          <SwimLogo size={28} />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-foreground text-lg leading-none">SWIMR</span>
            <span className="text-[10px] text-muted-foreground tracking-wide">Agentic Talent Screening</span>
          </div>
        </Link>
      </div>

      <div className="flex-[3] flex justify-center items-center gap-4">
        {score !== null && <OverallScoreBadge score={score} />}
        {/* Batch run global indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border bg-card text-xs">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-muted-foreground">Analysing {completedCount + 1}/{totalCount}</span>
            <Progress value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0} className="h-1.5 w-20" />
          </div>
        )}
      </div>
      <div className="flex-[2]" />

      <div className="min-w-[200px] flex items-center justify-end gap-2">
        <Link to="/analyse">
          <Button variant={location.pathname === "/analyse" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-colors duration-200">
            {showActivity ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Analyser
            {showActivity && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-score-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-score-green" />
              </span>
            )}
          </Button>
        </Link>
        <Link to="/candidates">
          <Button variant={location.pathname === "/candidates" || location.pathname.startsWith("/candidates/") ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-colors duration-200">
            <Users className="h-3.5 w-3.5" />
            Candidates
          </Button>
        </Link>
        <Link to="/candidate-recommendations">
          <Button variant={location.pathname === "/candidate-recommendations" ? "secondary" : "ghost"} size="sm" className="h-8 gap-1.5 text-xs transition-colors duration-200">
            <Compass className="h-3.5 w-3.5" />
            Discover
            {ghSearching && (
              <span className="relative flex h-2 w-2 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-score-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-score-green" />
              </span>
            )}
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
