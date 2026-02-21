import ScoreBar from "./ScoreBar";
import InsightCard, { type Insight } from "./InsightCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Timer, DollarSign, Clock } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

interface AnalysisSidebarProps {
  isLoading: boolean;
  hasResults: boolean;
  result: AnalysisResult | null;
}

function mapResultToInsights(r: AnalysisResult): Insight[] {
  const insights: Insight[] = [];
  let id = 0;

  // Red flags - only if there are actual red flags
  if (r.red_flags.red_flag_count > 0) {
    for (const gap of r.red_flags.employment_gaps) {
      insights.push({
        id: String(++id),
        type: "red-flag",
        category: "Employment Gap",
        title: `${gap.period} (${gap.duration_months} months)`,
        detail: `Employment gap detected during ${gap.period}.`,
        severity: gap.severity,
      });
    }

    for (const inc of r.red_flags.inconsistencies) {
      insights.push({
        id: String(++id),
        type: "red-flag",
        category: "Inconsistency",
        title: inc,
        detail: inc,
        severity: "medium",
      });
    }

    for (const vague of r.red_flags.vague_descriptions) {
      insights.push({
        id: String(++id),
        type: "red-flag",
        category: "Vague Claims",
        title: vague,
        detail: vague,
        severity: "medium",
      });
    }
  }

  // Suggestions from improvement_suggestions
  for (const suggestion of r.overall_score.improvement_suggestions.slice(0, 2)) {
    insights.push({
      id: String(++id),
      type: "suggestion",
      category: "Interview Focus Area",
      title: suggestion,
      detail: suggestion,
    });
  }

  // Skills
  insights.push({
    id: String(++id),
    type: "skill",
    category: "Technical Skills",
    title: `${r.skills_extraction.technical_skills.length} technical skills identified`,
    detail: r.skills_extraction.skill_match_percentage
      ? `Skill match: ${r.skills_extraction.skill_match_percentage}%`
      : "Technical skills extracted from resume.",
    badges: r.skills_extraction.technical_skills.slice(0, 10),
  });

  if (r.skills_extraction.soft_skills.length > 0) {
    insights.push({
      id: String(++id),
      type: "skill",
      category: "Soft Skills",
      title: `${r.skills_extraction.soft_skills.length} soft skills identified`,
      detail: "Soft skills extracted from resume content.",
      badges: r.skills_extraction.soft_skills,
    });
  }

  // Experience / Role Fit
  const recMap: Record<string, string> = {
    strong_yes: "Strong Yes",
    yes: "Yes",
    maybe: "Maybe",
    no: "No",
    strong_no: "Strong No",
  };

  insights.push({
    id: String(++id),
    type: "experience",
    category: "Career Progression",
    title: `${r.experience_quality.total_years}+ years — ${r.experience_quality.progression.replace("_", " ")} trajectory`,
    detail: r.experience_quality.notes,
  });


  return insights;
}

const AnalysisSidebar = ({ isLoading, hasResults, result }: AnalysisSidebarProps) => {
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

  if (!hasResults || !result) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground text-center">Upload a candidate resume and click "Analyse Resume" to see screening results</p>
      </div>
    );
  }

  const insights = mapResultToInsights(result);
  const metrics = result.agent_metrics;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Category Score Bars */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Candidate Evaluation</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ScoreBar label="Sentiment" score={result.sentiment_analysis.score} delay={100} />
            <ScoreBar label="Relevance" score={result.usefulness_score.relevance_to_role} delay={200} />
            <ScoreBar label="Skills Match" score={result.skills_extraction.skill_match_percentage ?? result.usefulness_score.score} delay={300} />
            <ScoreBar label="Experience" score={result.experience_quality.score} delay={400} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Insight Cards */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recruiter Insights</h3>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold">
              {insights.length}
            </span>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <InsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Agent Economics Footer */}
      <div className="border-t border-border bg-accent/50 px-6 py-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {metrics.processing_time_seconds ?? "—"}s</span>
          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${metrics.cost_estimate_usd?.toFixed(4) ?? "0.0000"}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {metrics.estimated_manual_review_minutes} min saved</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">200× faster than manual screening</p>
      </div>
    </div>
  );
};

export default AnalysisSidebar;
