import ScoreBar from "./ScoreBar";
import InsightCard, { type Insight } from "./InsightCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Timer, DollarSign, Clock, GraduationCap, CheckCircle2, HelpCircle } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

interface AnalysisSidebarProps {
  isLoading: boolean;
  hasResults: boolean;
  result: AnalysisResult | null;
  hasRole: boolean;
}

/* ── helpers to support both old and new analysis shapes ── */
function getField<T>(result: AnalysisResult, newPath: T | undefined, legacyPath: T | undefined): T | undefined {
  return newPath !== undefined ? newPath : legacyPath;
}

function getTechnicalSkills(r: AnalysisResult): string[] {
  return r.skills_assessment?.technical_skills ?? r.skills_extraction?.technical_skills ?? [];
}
function getSoftSkills(r: AnalysisResult): string[] {
  return r.skills_assessment?.soft_skills ?? r.skills_extraction?.soft_skills ?? [];
}
function getCertifications(r: AnalysisResult): string[] {
  return r.skills_assessment?.certifications ?? r.skills_extraction?.certifications ?? [];
}
function getTotalYears(r: AnalysisResult): number {
  return r.work_experience?.total_years ?? r.experience_quality?.total_years ?? 0;
}
function getProgression(r: AnalysisResult): string {
  return r.work_experience?.progression ?? r.experience_quality?.progression ?? "unclear";
}
function getExperienceNotes(r: AnalysisResult): string {
  return r.work_experience?.notes ?? r.experience_quality?.notes ?? "";
}
function getExperienceScore(r: AnalysisResult): number {
  return r.work_experience?.score ?? r.experience_quality?.score ?? 0;
}
function getSkillMatchPct(r: AnalysisResult): number | null {
  if (r.skills_assessment) return r.skills_assessment.skill_match_percentage;
  return r.skills_extraction?.skill_match_percentage ?? null;
}
function getRedFlagGaps(r: AnalysisResult) {
  return r.red_flags.employment_gaps ?? [];
}
function hasNewRedFlags(r: AnalysisResult): boolean {
  return Array.isArray(r.red_flags.flags) && r.red_flags.flags.length > 0;
}

/* ── Eligibility colour helper ── */
function eligibilityBadge(eligible: string | undefined): { colour: string; label: string } {
  switch (eligible) {
    case "yes":
    case "likely":
      return { colour: "score-badge-green", label: "Eligible" };
    case "no":
    case "unlikely":
      return { colour: "score-badge-red", label: "Ineligible" };
    default:
      return { colour: "score-badge-yellow", label: "Needs Verification" };
  }
}

/* ── QS ranking tier display helper ── */
function qsLabel(tier: string | undefined): string {
  switch (tier) {
    case "top_10": return "QS Top 10";
    case "top_50": return "QS Top 50";
    case "top_100": return "QS Top 100";
    case "top_200": return "QS Top 200";
    case "top_500": return "QS Top 500";
    case "unranked": return "Unranked";
    default: return "";
  }
}

function gradeQualityLabel(tier: string | undefined): string {
  switch (tier) {
    case "exceptional": return "Exceptional";
    case "strong": return "Strong";
    case "good": return "Good";
    case "average": return "Average";
    case "below_average": return "Below Average";
    default: return "";
  }
}

function courseRelevanceLabel(rel: string | undefined): string {
  switch (rel) {
    case "highly_relevant": return "Highly Relevant";
    case "relevant": return "Relevant";
    case "partially_relevant": return "Partially Relevant";
    case "not_relevant": return "Not Relevant";
    default: return "";
  }
}

function mapResultToInsights(r: AnalysisResult, hasRole: boolean): Insight[] {
  const insights: Insight[] = [];
  let id = 0;

  // JD Match card (new)
  if (r.job_description_match && hasRole) {
    insights.push({
      id: String(++id),
      type: "jd-match",
      category: "Job Description Match",
      title: `${r.job_description_match.keyword_match_percentage}% keyword match`,
      detail: r.job_description_match.role_alignment_notes || "Keyword analysis complete.",
      badgesMatched: r.job_description_match.keywords_found?.slice(0, 12),
      badgesMissing: r.job_description_match.keywords_missing?.slice(0, 8),
    });
  }

  // Education card (upgraded)
  if (r.education) {
    const edu = r.education;
    const qsTier = qsLabel(edu.qs_ranking_tier);
    const institutionLine = edu.institution ? `${edu.institution}${qsTier ? ` — ${qsTier}` : ""}` : "Institution unknown";
    const degreeLine = [edu.degree, edu.course].filter(Boolean).join(" in ");
    const gradeOriginal = edu.gpa_or_grade || null;
    const gradeNorm = gradeQualityLabel(edu.grade_quality_tier);
    const gradeLine = gradeOriginal ? `${gradeOriginal}${gradeNorm ? ` — ${gradeNorm}` : ""}` : null;
    const onTimeLine = edu.completed_on_time === "yes" ? "✓ Completed on time" : edu.completed_on_time === "no" ? "✗ Extended duration" : null;
    const relevance = courseRelevanceLabel(edu.course_relevance);
    const relevanceLine = relevance && hasRole ? `${edu.course || edu.degree || "Degree"} — ${relevance} to role` : relevance ? `Course relevance: ${relevance}` : null;

    const detailParts = [
      institutionLine,
      degreeLine || null,
      gradeLine,
      onTimeLine,
      relevanceLine,
      edu.notes || null,
    ].filter(Boolean).join("\n");

    insights.push({
      id: String(++id),
      type: "education",
      category: "Education",
      title: institutionLine,
      detail: detailParts || "Education data extracted.",
    });
  }

  // Right to Work card (new)
  if (r.right_to_work) {
    const rtw = r.right_to_work;
    const elig = eligibilityBadge(rtw.eligible_to_work);
    insights.push({
      id: String(++id),
      type: "right-to-work",
      category: elig.label,
      title: rtw.visa_sponsorship_required === "yes"
        ? "Visa sponsorship required"
        : rtw.eligible_to_work === "yes"
          ? "No sponsorship required"
          : "Work eligibility unclear — verify",
      detail: rtw.notes || "Right to work information extracted.",
      severity: rtw.eligible_to_work === "no" || rtw.eligible_to_work === "unlikely" ? "high" : rtw.eligible_to_work === "unknown" ? "medium" : undefined,
    });
  }

  // Red flags — support both new structured flags and legacy format
  if (r.red_flags.red_flag_count > 0) {
    if (hasNewRedFlags(r)) {
      // New v2 structured flags
      for (const flag of r.red_flags.flags!) {
        insights.push({
          id: String(++id),
          type: "red-flag",
          category: flag.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          title: flag.description,
          detail: `${flag.evidence}\n\nWhy it matters: ${flag.role_relevance}\n\nFollow-up: ${flag.follow_up_question}`,
          severity: flag.severity === "disqualifying" ? "high" : "medium",
        });
      }
    } else {
      // Legacy format
      for (const gap of getRedFlagGaps(r)) {
        insights.push({
          id: String(++id),
          type: "red-flag",
          category: "Employment Gap",
          title: `${gap.period} (${gap.duration_months} months)`,
          detail: `Employment gap detected during ${gap.period}.`,
          severity: gap.severity,
        });
      }
      for (const inc of (r.red_flags.inconsistencies ?? [])) {
        insights.push({ id: String(++id), type: "red-flag", category: "Inconsistency", title: inc, detail: inc, severity: "medium" });
      }
      for (const vague of (r.red_flags.vague_descriptions ?? [])) {
        insights.push({ id: String(++id), type: "red-flag", category: "Vague Claims", title: vague, detail: vague, severity: "medium" });
      }
    }
  }

  // Green flags (v2)
  if (r.green_flags && r.green_flags.length > 0) {
    for (const gf of r.green_flags.slice(0, 5)) {
      insights.push({
        id: String(++id),
        type: "strength",
        category: "Green Flag",
        title: gf.description,
        detail: `${gf.evidence}\n\nRole relevance: ${gf.role_relevance}`,
      });
    }
  }

  // Neutral notes (v2)
  if (r.neutral_notes && r.neutral_notes.length > 0) {
    for (const nn of r.neutral_notes.slice(0, 3)) {
      insights.push({
        id: String(++id),
        type: "suggestion",
        category: "Needs Clarification",
        title: nn.description,
        detail: `${nn.context}\n\nSuggested action: ${nn.suggested_action}`,
      });
    }
  }

  // Suggestions
  for (const suggestion of r.overall_score.improvement_suggestions.slice(0, 2)) {
    insights.push({ id: String(++id), type: "suggestion", category: "Interview Focus Area", title: suggestion, detail: suggestion });
  }

  // Skills
  const techSkills = getTechnicalSkills(r);
  if (techSkills.length > 0) {
    insights.push({
      id: String(++id),
      type: "skill",
      category: "Technical Skills",
      title: `${techSkills.length} technical skills identified`,
      detail: getSkillMatchPct(r) != null ? `Skill match: ${getSkillMatchPct(r)}%` : "Technical skills extracted from resume.",
      badges: techSkills.slice(0, 10),
    });
  }
  const softSkills = getSoftSkills(r);
  if (softSkills.length > 0) {
    insights.push({ id: String(++id), type: "skill", category: "Soft Skills", title: `${softSkills.length} soft skills identified`, detail: "Soft skills extracted from resume content.", badges: softSkills });
  }

  // Experience
  insights.push({
    id: String(++id),
    type: "experience",
    category: "Career Progression",
    title: `${getTotalYears(r)}+ years — ${getProgression(r).replace("_", " ")} trajectory`,
    detail: getExperienceNotes(r),
  });

  return insights;
}

const AnalysisSidebar = ({ isLoading, hasResults, result, hasRole }: AnalysisSidebarProps) => {
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
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

  const insights = mapResultToInsights(result, hasRole);
  const metrics = result.agent_metrics;

  // Score bars — use new structure if available, fallback to legacy
  const jdScore = result.job_description_match?.score ?? 0;
  const skillsScore = result.skills_assessment?.score ?? (getSkillMatchPct(result) ?? 0);
  const educationScore = result.education?.score ?? 0;
  const experienceScore = getExperienceScore(result);
  const rtwScore = result.right_to_work?.score ?? 0;
  const redFlagsScore = result.red_flags?.score ?? (result.red_flags.red_flag_count === 0 ? 100 : Math.max(0, 100 - result.red_flags.red_flag_count * 15));
  const sentimentScore = result.sentiment_analysis.score;

  const isNewFormat = !!result.job_description_match;

  // Target student check
  const targetMatches = result.education?.target_universities_matched ?? [];
  const isTargetStudent = targetMatches.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Target Student Badge — prominent, above score bars */}
        {hasRole && (
          <div className="animate-fade-in-up">
            {isTargetStudent ? (
              <div className="flex items-center gap-2 px-3 py-2.5 border border-score-green/40 bg-score-green/10">
                <GraduationCap className="h-4 w-4 text-score-green shrink-0" />
                <div>
                  <Badge className="score-badge-green text-[11px] font-bold border px-2 py-0.5">
                    TARGET STUDENT
                  </Badge>
                  <p className="text-[10px] text-score-green mt-0.5">{targetMatches.join(", ")}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 border border-border bg-muted/30">
                <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                <Badge className="score-badge-muted text-[11px] font-bold border px-2 py-0.5">
                  NON-TARGET
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Category Score Bars — 7 sections */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Candidate Evaluation</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <ScoreBar label="JD Match" score={jdScore} delay={100} notApplicable={!hasRole} weightLabel={isNewFormat ? "20%" : undefined} />
            <ScoreBar label="Skills" score={skillsScore} delay={150} weightLabel={isNewFormat ? "15%" : undefined} />
            <ScoreBar label="Education" score={educationScore} delay={200} weightLabel={isNewFormat ? "15%" : undefined} />
            <ScoreBar label="Experience" score={experienceScore} delay={250} weightLabel={isNewFormat ? "25%" : undefined} />
            <ScoreBar label="Right to Work" score={rtwScore} delay={300} weightLabel={isNewFormat ? "10%" : undefined} />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  Red Flags
                  {isNewFormat && <span className="text-[10px] text-muted-foreground font-normal">5%</span>}
                </span>
                {result.red_flags.red_flag_count === 0 ? (
                  <span className="text-xs font-semibold text-score-green">No Red Flags</span>
                ) : (
                  <span className="text-xs font-semibold text-score-red">{result.red_flags.red_flag_count} Red Flag{result.red_flags.red_flag_count !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
            <ScoreBar label="Sentiment" score={sentimentScore} delay={400} weightLabel={isNewFormat ? "10%" : undefined} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Insight Cards */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-foreground uppercase">Recruiter Insights</h3>
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
          <span className="flex items-center gap-1"><span className="text-xs font-medium">£</span> {metrics.cost_estimate_usd?.toFixed(4) ?? "0.0000"}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {metrics.estimated_manual_review_minutes} min saved</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">200× faster than manual screening</p>
      </div>
    </div>
  );
};

export default AnalysisSidebar;
