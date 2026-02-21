import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Select removed — status is read-only on this page
import {
  ArrowLeft,
  RefreshCw,
  Mail,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Zap,
  Briefcase,
  Award,
  Timer,
  DollarSign,
  Clock,
  Loader2,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { AnalysisResult } from "@/types/analysis";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-muted text-muted-foreground" },
  { value: "deny", label: "Deny", color: "bg-destructive/15 text-destructive" },
  { value: "online_assessment", label: "Online Assessment", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  { value: "interview", label: "Interview", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { value: "hire", label: "Hire", color: "bg-green-500/15 text-green-600 dark:text-green-400" },
];

const REC_LABELS: Record<string, { label: string; color: string }> = {
  strong_yes: { label: "Strong Yes", color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30" },
  yes: { label: "Yes", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  maybe: { label: "Maybe", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30" },
  no: { label: "No", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  strong_no: { label: "Strong No", color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
};

const CHART_COLOURS = {
  primary: "hsl(222, 90%, 53%)",
  green: "hsl(142, 71%, 45%)",
  yellow: "hsl(38, 92%, 50%)",
  red: "hsl(0, 84%, 60%)",
  purple: "hsl(265, 60%, 55%)",
  muted: "hsl(0, 0%, 45%)",
};

const PIE_COLOURS = [CHART_COLOURS.primary, CHART_COLOURS.green, CHART_COLOURS.purple];

interface Candidate {
  id: string;
  candidate_name: string;
  email: string | null;
  overall_score: number;
  recommendation: string;
  analysis_json: AnalysisResult;
  cv_text: string;
  job_description: string | null;
  status: string;
  created_at: string;
}

function generateReport(r: AnalysisResult): string {
  const recMap: Record<string, string> = {
    strong_yes: "a strong recommendation to proceed",
    yes: "a positive recommendation to proceed",
    maybe: "a conditional recommendation — further evaluation advised",
    no: "a recommendation against proceeding",
    strong_no: "a strong recommendation against proceeding",
  };

  const progMap: Record<string, string> = {
    strong_upward: "a strong upward",
    steady: "a steady",
    lateral: "a lateral",
    unclear: "an unclear",
  };

  const techCount = r.skills_extraction.technical_skills.length;
  const softCount = r.skills_extraction.soft_skills.length;
  const certCount = r.skills_extraction.certifications.length;
  const flagCount = r.red_flags.red_flag_count;

  let report = `${r.candidate_name} presents ${r.experience_quality.total_years}+ years of professional experience with ${progMap[r.experience_quality.progression] || "an"} career trajectory. `;
  report += `The candidate demonstrates ${techCount} technical skill${techCount !== 1 ? "s" : ""}, ${softCount} soft skill${softCount !== 1 ? "s" : ""}, and holds ${certCount} certification${certCount !== 1 ? "s" : ""}. `;

  if (r.skills_extraction.skill_match_percentage) {
    report += `Skill alignment with the role is estimated at ${r.skills_extraction.skill_match_percentage}%. `;
  }

  report += `Sentiment analysis indicates a ${r.sentiment_analysis.tone} tone with ${r.sentiment_analysis.confidence_level} confidence. `;

  if (flagCount > 0) {
    report += `${flagCount} red flag${flagCount !== 1 ? "s" : ""} ${flagCount !== 1 ? "were" : "was"} identified, including `;
    const flagTypes: string[] = [];
    if (r.red_flags.employment_gaps.length) flagTypes.push(`${r.red_flags.employment_gaps.length} employment gap${r.red_flags.employment_gaps.length !== 1 ? "s" : ""}`);
    if (r.red_flags.inconsistencies.length) flagTypes.push(`${r.red_flags.inconsistencies.length} inconsistenc${r.red_flags.inconsistencies.length !== 1 ? "ies" : "y"}`);
    if (r.red_flags.vague_descriptions.length) flagTypes.push(`${r.red_flags.vague_descriptions.length} vague description${r.red_flags.vague_descriptions.length !== 1 ? "s" : ""}`);
    report += flagTypes.join(", ") + ". ";
  } else {
    report += "No red flags were identified. ";
  }

  report += `Overall, this candidate receives a composite score of ${r.overall_score.composite_score}/100, resulting in ${recMap[r.overall_score.recommendation] || "a recommendation to review further"}.`;

  return report;
}

function generateRoleFit(r: AnalysisResult): string {
  const techSkills = r.skills_extraction.technical_skills.slice(0, 4).join(", ");
  const softSkills = r.skills_extraction.soft_skills.slice(0, 2).join(" and ");
  const years = r.experience_quality.total_years;
  const progression = r.experience_quality.progression.replace("_", " ");

  let fit = `Based on ${years}+ years of experience with a ${progression} career trajectory`;
  if (techSkills) fit += ` and demonstrated proficiency in ${techSkills}`;
  fit += `, this candidate would be well-suited for `;

  const score = r.overall_score.composite_score;
  if (score >= 75) {
    fit += "a senior or lead-level position ";
  } else if (score >= 50) {
    fit += "a mid-level position ";
  } else {
    fit += "a junior or associate-level position ";
  }

  if (r.skills_extraction.technical_skills.length > r.skills_extraction.soft_skills.length * 2) {
    fit += "in a technically-focused team where deep domain expertise is valued";
  } else if (r.skills_extraction.soft_skills.length >= r.skills_extraction.technical_skills.length) {
    fit += "in a collaborative, cross-functional environment where communication and stakeholder engagement are key";
  } else {
    fit += "that balances technical execution with team collaboration";
  }

  if (softSkills) fit += `. Their strengths in ${softSkills} would be particularly valuable`;
  fit += ` in a fast-paced organisation that prioritises both delivery and professional growth.`;

  return fit;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreColour(score: number) {
  if (score >= 75) return CHART_COLOURS.green;
  if (score >= 50) return CHART_COLOURS.yellow;
  if (score >= 25) return "hsl(30, 80%, 55%)";
  return CHART_COLOURS.red;
}

const CandidateProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalysing, setReanalysing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast({ variant: "destructive", title: "Not found", description: "Candidate not found." });
        navigate("/candidates");
      } else {
        setCandidate(data as unknown as Candidate);
      }
      setLoading(false);
    })();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    if (!candidate) return;
    setCandidate((prev) => prev ? { ...prev, status: newStatus } : prev);
    await supabase.from("candidates").update({ status: newStatus }).eq("id", candidate.id);
  };

  const reanalyse = async () => {
    if (!candidate) return;
    setReanalysing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: {
          cv_text: candidate.cv_text,
          job_description: candidate.job_description || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update the existing candidate row
      await supabase
        .from("candidates")
        .update({
          analysis_json: data,
          overall_score: data.overall_score?.composite_score ?? 0,
          recommendation: data.overall_score?.recommendation ?? "maybe",
          candidate_name: data.candidate_name || candidate.candidate_name,
          email: data.email || candidate.email,
        })
        .eq("id", candidate.id);

      setCandidate((prev) =>
        prev
          ? {
              ...prev,
              analysis_json: data as AnalysisResult,
              overall_score: data.overall_score?.composite_score ?? 0,
              recommendation: data.overall_score?.recommendation ?? "maybe",
              candidate_name: data.candidate_name || prev.candidate_name,
              email: data.email || prev.email,
            }
          : prev
      );
      toast({ title: "Re-analysis complete", description: "The candidate profile has been updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Re-analysis failed", description: err.message || "Could not re-analyse." });
    } finally {
      setReanalysing(false);
    }
  };

  // Also delete the duplicate row that the edge function creates on re-analyse
  // (the edge function always inserts a new row, so we clean up)
  // Actually, we should just let it be — the user may want history.

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar score={null} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!candidate) return null;

  const r = candidate.analysis_json;
  const rec = REC_LABELS[candidate.recommendation] || { label: candidate.recommendation, color: "bg-muted text-muted-foreground" };
  const statusOpt = STATUS_OPTIONS.find((s) => s.value === candidate.status) || STATUS_OPTIONS[0];

  // Chart data
  const radarData = [
    { dimension: "Sentiment", score: r.sentiment_analysis.score },
    { dimension: "Relevance", score: r.usefulness_score.relevance_to_role },
    { dimension: "Skills", score: r.skills_extraction.skill_match_percentage ?? r.usefulness_score.score },
    { dimension: "Experience", score: r.experience_quality.score },
  ];

  const barData = radarData.map((d) => ({ ...d, baseline: 50 }));

  const skillsPieData = [
    { name: "Technical", value: r.skills_extraction.technical_skills.length },
    { name: "Soft Skills", value: r.skills_extraction.soft_skills.length },
    { name: "Certifications", value: r.skills_extraction.certifications.length },
  ].filter((d) => d.value > 0);

  const severityCounts = { low: 0, medium: 0, high: 0 };
  r.red_flags.employment_gaps.forEach((g) => severityCounts[g.severity]++);
  r.red_flags.inconsistencies.forEach(() => severityCounts.medium++);
  r.red_flags.vague_descriptions.forEach(() => severityCounts.medium++);
  const flagPieData = [
    { name: "Low", value: severityCounts.low, colour: CHART_COLOURS.yellow },
    { name: "Medium", value: severityCounts.medium, colour: "hsl(30, 80%, 55%)" },
    { name: "High", value: severityCounts.high, colour: CHART_COLOURS.red },
  ].filter((d) => d.value > 0);

  const report = generateReport(r);

  // Score gauge
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * candidate.overall_score) / 100;
  const scoreColour = getScoreColour(candidate.overall_score);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar score={null} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

          {/* === HEADER === */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Score gauge */}
            <div className="shrink-0 flex flex-col items-center">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/60" />
                <circle
                  cx="70" cy="70" r={radius} fill="none"
                  stroke={scoreColour} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  transform="rotate(-90 70 70)"
                  className="transition-all duration-700"
                />
                <text x="70" y="66" textAnchor="middle" className="fill-foreground text-3xl font-bold" style={{ fontSize: 32 }}>
                  {candidate.overall_score}
                </text>
                <text x="70" y="86" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                  Overall
                </text>
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <h1 className="text-2xl font-bold text-foreground">{candidate.candidate_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {candidate.email && (
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{candidate.email}</span>
                )}
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(candidate.created_at)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 ${rec.color} pointer-events-none`}>
                  {rec.label}
                </Badge>
                <Badge className={`text-[10px] px-2 py-0.5 ${statusOpt.color} border-0 pointer-events-none`}>
                  {statusOpt.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* === REPORT SUMMARY === */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Screening Report Summary</h2>
            <p className="text-sm leading-relaxed text-foreground/80">{report}</p>
          </section>

          {/* === IDEAL ROLE FIT === */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Ideal Role Fit</h2>
            <p className="text-sm leading-relaxed text-foreground/80">{generateRoleFit(r)}</p>
          </section>

          {/* === DATA VISUALISATIONS === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <section className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Candidate Profile Shape</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(0,0%,30%)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="score" stroke={CHART_COLOURS.primary} fill={CHART_COLOURS.primary} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            </section>

            {/* Bar Chart vs Baseline */}
            <section className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Scores vs Average Baseline</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                  <YAxis type="category" dataKey="dimension" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} width={80} />
                  <ReferenceLine x={50} stroke={CHART_COLOURS.muted} strokeDasharray="4 4" label={{ value: "Avg", fill: CHART_COLOURS.muted, fontSize: 10 }} />
                  <Bar dataKey="score" fill={CHART_COLOURS.primary} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            {/* Skills Breakdown Pie */}
            <section className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Skills Breakdown</h3>
              {skillsPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={skillsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                      {skillsPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "hsl(0,0%,55%)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No skills data available.</p>
              )}
            </section>

            {/* Red Flags Severity */}
            <section className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Red Flags by Severity</h3>
              {flagPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={flagPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                      {flagPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.colour} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "hsl(0,0%,55%)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center">
                  <p className="text-sm text-green-500">No red flags detected ✓</p>
                </div>
              )}
            </section>
          </div>

          {/* === CAREER PROGRESSION === */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Career Progression</h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs pointer-events-none">
                {r.experience_quality.total_years}+ years
              </Badge>
              <Badge variant="outline" className="text-xs pointer-events-none capitalize">
                {r.experience_quality.progression.replace("_", " ")} trajectory
              </Badge>
            </div>
            {r.experience_quality.highlights.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {r.experience_quality.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* === SKILLS === */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Skills & Certifications</h3>
            <div className="space-y-4">
              {r.skills_extraction.technical_skills.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Technical Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.skills_extraction.technical_skills.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal pointer-events-none">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {r.skills_extraction.soft_skills.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Soft Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.skills_extraction.soft_skills.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5 font-normal pointer-events-none">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {r.skills_extraction.certifications.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Award className="h-3 w-3" /> Certifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.skills_extraction.certifications.map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal pointer-events-none">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* === RED FLAGS === */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-score-red" />
              Red Flags ({r.red_flags.red_flag_count})
            </h3>
            {r.red_flags.red_flag_count === 0 ? (
              <p className="text-sm text-muted-foreground">No red flags detected.</p>
            ) : (
              <div className="space-y-3">
                {r.red_flags.employment_gaps.map((g, i) => (
                  <div key={`gap-${i}`} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className={`text-[10px] shrink-0 pointer-events-none ${g.severity === "high" ? "border-red-500/40 text-red-500" : g.severity === "medium" ? "border-yellow-500/40 text-yellow-500" : "border-muted-foreground text-muted-foreground"}`}>
                      {g.severity}
                    </Badge>
                    <span className="text-foreground/80">Employment gap: {g.period} ({g.duration_months} months)</span>
                  </div>
                ))}
                {r.red_flags.inconsistencies.map((inc, i) => (
                  <div key={`inc-${i}`} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0 pointer-events-none border-yellow-500/40 text-yellow-500">medium</Badge>
                    <span className="text-foreground/80">{inc}</span>
                  </div>
                ))}
                {r.red_flags.vague_descriptions.map((v, i) => (
                  <div key={`vague-${i}`} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0 pointer-events-none border-yellow-500/40 text-yellow-500">medium</Badge>
                    <span className="text-foreground/80">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* === IMPROVEMENT SUGGESTIONS === */}
          {r.overall_score.improvement_suggestions.length > 0 && (
            <section className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Improvement Suggestions
              </h3>
              <ul className="space-y-2">
                {r.overall_score.improvement_suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* === AGENT ECONOMICS === */}
          <section className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Agent Economics</h3>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> {r.agent_metrics.processing_time_seconds ?? "—"}s processing</span>
              <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> ${r.agent_metrics.cost_estimate_usd?.toFixed(4) ?? "0.0000"} cost</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {r.agent_metrics.estimated_manual_review_minutes} min saved</span>
            </div>
          </section>

          {/* === BOTTOM ACTIONS === */}
          <div className="flex items-center gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate("/candidates")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Pipeline
            </Button>
            <Button onClick={reanalyse} disabled={reanalysing} className="gap-2">
              {reanalysing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Re-analysing…</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Re-analyse</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;
