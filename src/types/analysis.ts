export interface AnalysisResult {
  candidate_name: string;
  email: string | null;
  summary: string;
  sentiment_analysis: {
    score: number;
    tone: "confident" | "neutral" | "uncertain";
    confidence_level: "high" | "medium" | "low";
    notes: string;
  };
  usefulness_score: {
    score: number;
    relevance_to_role: number;
    notes: string;
  };
  skills_extraction: {
    technical_skills: string[];
    soft_skills: string[];
    certifications: string[];
    skill_match_percentage: number | null;
  };
  experience_quality: {
    score: number;
    total_years: number;
    progression: "strong_upward" | "steady" | "lateral" | "unclear";
    highlights: string[];
    notes: string;
  };
  red_flags: {
    employment_gaps: Array<{
      period: string;
      duration_months: number;
      severity: "low" | "medium" | "high";
    }>;
    inconsistencies: string[];
    vague_descriptions: string[];
    red_flag_count: number;
  };
  overall_score: {
    composite_score: number;
    recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
    improvement_suggestions: string[];
  };
  agent_metrics: {
    estimated_manual_review_minutes: number;
    cost_estimate_usd: number;
    processing_time_seconds?: number;
  };
}
