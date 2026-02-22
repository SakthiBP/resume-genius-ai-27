export interface RedFlagItem {
  severity: "disqualifying" | "concerning";
  category: string;
  description: string;
  evidence: string;
  role_relevance: string;
  follow_up_question: string;
}

export interface GreenFlagItem {
  description: string;
  evidence: string;
  role_relevance: string;
}

export interface NeutralNoteItem {
  description: string;
  context: string;
  suggested_action: string;
}

export interface AnalysisResult {
  candidate_name: string;
  email: string | null;
  summary: string;
  role_calibration?: {
    role_title: string;
    role_level: string;
    required_years: number | null;
    must_have_skills: string[];
    nice_to_have_skills: string[];
    location_requirements: string | null;
    scope_expectations: string | null;
  };
  sentiment_analysis: {
    score: number;
    tone: "confident" | "neutral" | "uncertain";
    confidence_level: "high" | "medium" | "low";
    notes: string;
  };
  job_description_match: {
    weight: number;
    score: number;
    keywords_required: string[];
    keywords_found: string[];
    keywords_missing: string[];
    keyword_match_percentage: number;
    role_alignment_notes: string;
  };
  skills_assessment: {
    weight: number;
    score: number;
    technical_skills: string[];
    soft_skills: string[];
    certifications: string[];
    required_skills_matched: string[];
    required_skills_missing: string[];
    bonus_relevant_skills: string[];
    skill_match_percentage: number;
  };
  education: {
    weight: number;
    score: number;
    institution: string;
    degree: string;
    course: string;
    gpa_or_grade: string | null;
    grade_quality_tier?: "exceptional" | "strong" | "good" | "average" | "below_average";
    qs_ranking_tier?: "top_10" | "top_50" | "top_100" | "top_200" | "top_500" | "unranked" | "unknown";
    course_relevance?: "highly_relevant" | "relevant" | "partially_relevant" | "not_relevant";
    expected_years_to_complete: number;
    actual_years_taken: number | null;
    completed_on_time: "yes" | "no" | "unknown";
    prestige_tier: "target" | "high" | "mid" | "low" | "unknown";
    target_universities_matched: string[];
    notes: string;
  };
  work_experience: {
    weight: number;
    score: number;
    total_years: number;
    progression: "strong_upward" | "steady" | "lateral" | "unclear";
    industry_relevance: number;
    company_prestige_avg: "high" | "mid" | "low" | "mixed";
    roles: Array<{
      title: string;
      company: string;
      company_prestige: "high" | "mid" | "low" | "unknown";
      duration_months: number;
      relevance_to_role: number;
      highlights: string[];
    }>;
    employment_gaps: Array<{
      period: string;
      duration_months: number;
      severity: "low" | "medium" | "high";
    }>;
    notes: string;
  };
  right_to_work: {
    weight: number;
    score: number;
    candidate_nationality: string | null;
    recruiter_country: string;
    visa_sponsorship_required: "yes" | "no" | "unknown";
    sponsorship_available: "yes" | "no" | "not_specified";
    eligible_to_work: "yes" | "no" | "likely" | "unlikely" | "unknown";
    visa_type_if_applicable: string | null;
    notes: string;
  };
  red_flags: {
    weight: number;
    score: number;
    /** New structured flags array (v2 prompt) */
    flags?: RedFlagItem[];
    /** @deprecated Legacy fields — kept for backward compat with old analyses */
    employment_gaps?: Array<{
      period: string;
      duration_months: number;
      severity: "low" | "medium" | "high";
    }>;
    /** @deprecated */
    inconsistencies?: string[];
    /** @deprecated */
    vague_descriptions?: string[];
    red_flag_count: number;
    notes: string;
  };
  /** New: strengths that directly improve suitability (v2 prompt) */
  green_flags?: GreenFlagItem[];
  /** New: items needing clarification but not risks (v2 prompt) */
  neutral_notes?: NeutralNoteItem[];
  overall_score: {
    section_scores: {
      job_description_match: { score: number; weight: number; weighted_score: number };
      skills_assessment: { score: number; weight: number; weighted_score: number };
      education: { score: number; weight: number; weighted_score: number };
      work_experience: { score: number; weight: number; weighted_score: number };
      right_to_work: { score: number; weight: number; weighted_score: number };
      red_flags: { score: number; weight: number; weighted_score: number };
      sentiment_analysis: { score: number; weight: number; weighted_score: number };
    };
    composite_score: number;
    score_band: "red" | "orange" | "amber" | "light_green" | "green";
    recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
    improvement_suggestions: string[];
  };
  agent_metrics: {
    estimated_manual_review_minutes: number;
    cost_estimate_usd: number;
    processing_time_seconds?: number;
  };

  // Legacy fields — kept for backwards compatibility with old analyses
  usefulness_score?: {
    score: number;
    relevance_to_role: number;
    notes: string;
  };
  skills_extraction?: {
    technical_skills: string[];
    soft_skills: string[];
    certifications: string[];
    skill_match_percentage: number | null;
  };
  experience_quality?: {
    score: number;
    total_years: number;
    progression: "strong_upward" | "steady" | "lateral" | "unclear";
    highlights: string[];
    notes: string;
  };
}
