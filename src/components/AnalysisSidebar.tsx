import ScoreBar from "./ScoreBar";
import InsightCard, { type Insight } from "./InsightCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, DollarSign, Clock } from "lucide-react";

const MOCK_INSIGHTS: Insight[] = [
  {
    id: "1", type: "red-flag", category: "Employment Gap",
    title: "No employment gaps detected",
    detail: "Candidate shows continuous employment from June 2016 to present. No unexplained breaks in work history — low risk.",
    severity: "low",
  },
  {
    id: "2", type: "red-flag", category: "Vague Claims",
    title: "StartupXYZ role lacks business impact metrics",
    detail: "Candidate mentions 500K concurrent users but does not quantify business outcomes like revenue, retention, or cost savings. Probe this in interview.",
    severity: "medium",
  },
  {
    id: "3", type: "suggestion", category: "Interview Focus Area",
    title: "Verify system design depth",
    detail: "Candidate claims microservices migration and 50K req/s throughput. Recommend a system design interview round to validate architectural decision-making.",
  },
  {
    id: "4", type: "suggestion", category: "Skill Verification",
    title: "Test Go and Kubernetes proficiency",
    detail: "Go and Kubernetes are listed but not demonstrated in any role description. Consider a hands-on coding exercise or take-home to verify.",
  },
  {
    id: "5", type: "skill", category: "Technical Skills",
    title: "Strong modern tech stack alignment",
    detail: "Candidate's technical skills are current and well-aligned with market demands for senior engineering roles.",
    badges: ["TypeScript", "Python", "Go", "React", "AWS", "Docker", "Kubernetes", "PostgreSQL"],
  },
  {
    id: "6", type: "skill", category: "Soft Skills",
    title: "Clear leadership and mentoring signals",
    detail: "Resume demonstrates hands-on mentoring, team leadership, and cross-functional collaboration — strong senior/staff indicators.",
    badges: ["Mentoring", "Team Lead", "Cross-functional", "Code Review"],
  },
  {
    id: "7", type: "experience", category: "Career Progression",
    title: "Strong upward trajectory — 7+ years",
    detail: "Clear Junior → Mid → Senior progression across three companies with increasing scope. Indicates growth mindset and promotability.",
  },
  {
    id: "8", type: "experience", category: "Role Fit",
    title: "Strong Yes — highly qualified for Senior SWE",
    detail: "Candidate meets or exceeds requirements across technical skills, experience depth, and leadership. Recommend advancing to technical interview.",
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
        <p className="text-sm text-muted-foreground text-center">Upload a candidate resume to see screening results</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Category Score Bars */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Candidate Evaluation</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ScoreBar label="Sentiment" score={85} color="bg-score-green" delay={100} />
            <ScoreBar label="Relevance" score={72} color="bg-score-blue" delay={200} />
            <ScoreBar label="Skills Match" score={90} color="bg-score-green" delay={300} />
            <ScoreBar label="Experience" score={78} color="bg-score-blue" delay={400} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Insight Cards */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recruiter Insights</h3>
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
        <p className="text-[10px] text-muted-foreground/60 mt-1">200× faster than manual screening</p>
      </div>
    </div>
  );
};

export default AnalysisSidebar;
