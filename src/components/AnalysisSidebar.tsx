import ScoreBar from "./ScoreBar";
import InsightCard, { type Insight } from "./InsightCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, DollarSign, Clock } from "lucide-react";

const MOCK_INSIGHTS: Insight[] = [
  {
    id: "1", type: "red-flag", category: "Employment Gap",
    title: "No gap detected between positions",
    detail: "Your employment timeline shows continuous work history from June 2016 to present. This is a strong signal to recruiters.",
    severity: "low",
  },
  {
    id: "2", type: "suggestion", category: "Improve your resume",
    title: "Add measurable outcomes to StartupXYZ role",
    detail: "While you mention 500K concurrent users, consider adding business impact metrics like revenue growth or customer retention improvements.",
  },
  {
    id: "3", type: "suggestion", category: "Improve your resume",
    title: "Include a link to your portfolio or GitHub",
    detail: "Adding a portfolio link or GitHub profile can increase recruiter engagement by up to 35%, especially for senior engineering roles.",
  },
  {
    id: "4", type: "skill", category: "Technical",
    title: "Strong technical skill alignment",
    detail: "Your technical stack is well-rounded and current with industry demands.",
    badges: ["TypeScript", "Python", "Go", "React", "AWS", "Docker", "Kubernetes", "PostgreSQL"],
  },
  {
    id: "5", type: "skill", category: "Soft Skills",
    title: "Leadership indicators detected",
    detail: "Your resume demonstrates mentoring, team leadership, and cross-functional collaboration.",
    badges: ["Mentoring", "Team Lead", "Cross-functional", "Code Review"],
  },
  {
    id: "6", type: "experience", category: "Career Progression",
    title: "Strong upward trajectory over 7+ years",
    detail: "Clear progression from Junior → Mid → Senior Software Engineer across three companies, with increasing scope of responsibility at each step.",
  },
  {
    id: "7", type: "suggestion", category: "Formatting",
    title: "Consider adding a 'Projects' section",
    detail: "A dedicated projects section highlighting 2-3 key initiatives with links could strengthen your profile for roles requiring portfolio evidence.",
  },
  {
    id: "8", type: "red-flag", category: "Education",
    title: "Graduation year may reveal age bias",
    detail: "Some candidates choose to remove graduation year to minimize age-related bias. Consider whether this is beneficial for your target roles.",
    severity: "low",
  },
];

interface AnalysisSidebarProps {
  isLoading: boolean;
  hasResults: boolean;
}

const AnalysisSidebar = ({ isLoading, hasResults }: AnalysisSidebarProps) => {
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-5 w-36 mt-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground text-center">Upload a resume to see analysis results</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Category Score Bars */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Review analysis</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ScoreBar label="Sentiment" score={85} color="bg-score-green" delay={100} />
            <ScoreBar label="Usefulness" score={72} color="bg-score-blue" delay={200} />
            <ScoreBar label="Skills Match" score={90} color="bg-score-green" delay={300} />
            <ScoreBar label="Experience" score={78} color="bg-score-blue" delay={400} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Insight Cards */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-foreground">Analysis Insights</h3>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {MOCK_INSIGHTS.length}
            </span>
          </div>
          <div className="space-y-2">
            {MOCK_INSIGHTS.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Agent Economics Footer */}
      <div className="border-t border-border bg-muted/50 px-6 py-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> 8s</span>
          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> $0.03</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 20 min saved</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">200× faster than manual review</p>
      </div>
    </div>
  );
};

export default AnalysisSidebar;
