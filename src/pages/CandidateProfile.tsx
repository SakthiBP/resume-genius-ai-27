import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AnalysisResult } from "@/types/analysis";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface SavedRole {
  id: string;
  job_title: string;
  description: string;
  target_universities: { name: string; required_gpa: number }[];
  required_skills: string[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "score-badge-muted" },
  { value: "deny", label: "Deny", color: "score-badge-red" },
  { value: "online_assessment", label: "Online Assessment", color: "score-badge-yellow" },
  { value: "interview", label: "Interview", color: "score-badge-blue" },
  { value: "hire", label: "Hire", color: "score-badge-green" },
];

const REC_LABELS: Record<string, { label: string; color: string }> = {
  strong_yes: { label: "Strong Yes", color: "score-badge-green" },
  yes: { label: "Yes", color: "score-badge-green" },
  maybe: { label: "Maybe", color: "score-badge-yellow" },
  no: { label: "No", color: "score-badge-red" },
  strong_no: { label: "Strong No", color: "score-badge-red" },
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

/* ── compat helpers for old/new analysis shapes ── */
function getTechSkills(r: AnalysisResult): string[] {
  return r.skills_assessment?.technical_skills ?? r.skills_extraction?.technical_skills ?? [];
}
function getSoftSkills(r: AnalysisResult): string[] {
  return r.skills_assessment?.soft_skills ?? r.skills_extraction?.soft_skills ?? [];
}
function getCerts(r: AnalysisResult): string[] {
  return r.skills_assessment?.certifications ?? r.skills_extraction?.certifications ?? [];
}
function getTotalYears(r: AnalysisResult): number {
  return r.work_experience?.total_years ?? r.experience_quality?.total_years ?? 0;
}
function getProgression(r: AnalysisResult): string {
  return r.work_experience?.progression ?? r.experience_quality?.progression ?? "unclear";
}
function getExperienceScore(r: AnalysisResult): number {
  return r.work_experience?.score ?? r.experience_quality?.score ?? 0;
}
function getExperienceHighlights(r: AnalysisResult): string[] {
  if (r.work_experience?.roles) return r.work_experience.roles.flatMap((role) => role.highlights ?? []);
  return r.experience_quality?.highlights ?? [];
}
function getExperienceNotes(r: AnalysisResult): string {
  return r.work_experience?.notes ?? r.experience_quality?.notes ?? "";
}
function getSkillMatchPct(r: AnalysisResult): number | null {
  if (r.skills_assessment) return r.skills_assessment.skill_match_percentage;
  return r.skills_extraction?.skill_match_percentage ?? null;
}
function getRelevance(r: AnalysisResult): number {
  return r.job_description_match?.score ?? r.usefulness_score?.relevance_to_role ?? 0;
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

  const techCount = getTechSkills(r).length;
  const softCount = getSoftSkills(r).length;
  const certCount = getCerts(r).length;
  const flagCount = r.red_flags.red_flag_count;
  const years = getTotalYears(r);
  const progression = getProgression(r);

  let report = `${r.candidate_name} presents ${years}+ years of professional experience with ${progMap[progression] || "an"} career trajectory. `;
  report += `The candidate demonstrates ${techCount} technical skill${techCount !== 1 ? "s" : ""}, ${softCount} soft skill${softCount !== 1 ? "s" : ""}, and holds ${certCount} certification${certCount !== 1 ? "s" : ""}. `;

  const matchPct = getSkillMatchPct(r);
  if (matchPct) {
    report += `Skill alignment with the role is estimated at ${matchPct}%. `;
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
  const techSkills = getTechSkills(r).slice(0, 4).join(", ");
  const softSkills = getSoftSkills(r).slice(0, 2).join(" and ");
  const years = getTotalYears(r);
  const progression = getProgression(r).replace("_", " ");

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

  const tech = getTechSkills(r);
  const soft = getSoftSkills(r);
  if (tech.length > soft.length * 2) {
    fit += "in a technically-focused team where deep domain expertise is valued";
  } else if (soft.length >= tech.length) {
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
  if (score >= 25) return CHART_COLOURS.yellow;
  return CHART_COLOURS.red;
}

const CandidateProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalysing, setReanalysing] = useState(false);
  const [roles, setRoles] = useState<SavedRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase.from("roles").select("id, job_title, description, target_universities, required_skills").order("job_title");
      if (data) {
        setRoles(
          data.map((r: any) => ({
            ...r,
            target_universities: Array.isArray(r.target_universities) ? r.target_universities : [],
            required_skills: Array.isArray(r.required_skills) ? r.required_skills : [],
          }))
        );
      }
    };
    fetchRoles();
  }, []);

  const updateStatus = async (newStatus: string) => {
    if (!candidate) return;
    setCandidate((prev) => prev ? { ...prev, status: newStatus } : prev);
    await supabase.from("candidates").update({ status: newStatus }).eq("id", candidate.id);
  };

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

  const runAnalysis = async (jobContext: string | null) => {
    if (!candidate) return;
    setReanalysing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: {
          cv_text: candidate.cv_text,
          job_description: jobContext,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase
        .from("candidates")
        .update({
          analysis_json: data,
          overall_score: data.overall_score?.composite_score ?? 0,
          recommendation: data.overall_score?.recommendation ?? "maybe",
          candidate_name: data.candidate_name || candidate.candidate_name,
          email: data.email || candidate.email,
          job_description: jobContext,
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
              job_description: jobContext,
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

  const reanalyse = () => runAnalysis(candidate?.job_description || null);

  const handleRoleSwitch = (roleId: string | null) => {
    setSelectedRoleId(roleId);
    if (!candidate) return;

    if (!roleId) {
      runAnalysis(null);
      return;
    }

    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const roleParts = [
      `Job Title: ${role.job_title}`,
      role.description ? `Job Description: ${role.description}` : "",
      role.required_skills.length > 0
        ? `Required Skills: ${role.required_skills.join(", ")}`
        : "",
      role.target_universities.length > 0
        ? `Target Universities: ${role.target_universities
            .map((u) => `${u.name} (min GPA: ${u.required_gpa})`)
            .join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    runAnalysis(roleParts);
  };

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
  const rec = REC_LABELS[candidate.recommendation] || { label: candidate.recommendation, color: "score-badge-muted" };
  const statusOpt = STATUS_OPTIONS.find((s) => s.value === candidate.status) || STATUS_OPTIONS[0];

  // Chart data — supports both old and new analysis formats
  const radarData = [
    { dimension: "Sentiment", score: r.sentiment_analysis.score },
    { dimension: "JD Match", score: getRelevance(r) },
    { dimension: "Skills", score: getSkillMatchPct(r) ?? 0 },
    { dimension: "Experience", score: getExperienceScore(r) },
    ...(r.education ? [{ dimension: "Education", score: r.education.score }] : []),
    ...(r.right_to_work ? [{ dimension: "Right to Work", score: r.right_to_work.score }] : []),
  ];

  const barData = radarData.map((d) => ({ ...d, baseline: 50 }));

  const skillsPieData = [
    { name: "Technical", value: getTechSkills(r).length },
    { name: "Soft Skills", value: getSoftSkills(r).length },
    { name: "Certifications", value: getCerts(r).length },
  ].filter((d) => d.value > 0);

  const severityCounts = { low: 0, medium: 0, high: 0 };
  r.red_flags.employment_gaps.forEach((g) => severityCounts[g.severity]++);
  r.red_flags.inconsistencies.forEach(() => severityCounts.medium++);
  r.red_flags.vague_descriptions.forEach(() => severityCounts.medium++);
  const flagPieData = [
    { name: "Low", value: severityCounts.low, colour: CHART_COLOURS.yellow },
    { name: "Medium", value: severityCounts.medium, colour: CHART_COLOURS.yellow },
    { name: "High", value: severityCounts.high, colour: CHART_COLOURS.red },
  ].filter((d) => d.value > 0);

  const report = generateReport(r);

  // Score gauge
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * candidate.overall_score) / 100;
  const scoreColour = getScoreColour(candidate.overall_score);

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-300">
      <Navbar score={null} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

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
                  className="transition-all duration-500"
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
              <h1 className="text-2xl font-bold text-foreground uppercase">{candidate.candidate_name}</h1>
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
                <Badge className={`text-[10px] px-2.5 py-0.5 ${statusOpt.color} border-0 pointer-events-none`}>
                  {statusOpt.label}
                </Badge>
                {/* Role switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-8 px-3 text-xs font-medium border border-border bg-secondary text-secondary-foreground flex items-center gap-1.5 hover:bg-accent hover:text-accent-foreground transition-colors duration-200 cursor-pointer max-w-[220px]"
                      disabled={reanalysing}
                    >
                      <Briefcase className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {reanalysing ? "Analysing…" : selectedRoleId ? roles.find((r) => r.id === selectedRoleId)?.job_title ?? "Analyse for Role" : "Analyse for Role"}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto z-50 bg-popover">
                    <DropdownMenuItem onClick={() => handleRoleSwitch(null)}>
                      <span className="text-muted-foreground">No Role (General Evaluation)</span>
                    </DropdownMenuItem>
                    {roles.map((role) => (
                      <Tooltip key={role.id}>
                        <TooltipTrigger asChild>
                          <DropdownMenuItem onClick={() => handleRoleSwitch(role.id)}>
                            <span className="truncate max-w-[200px] block">{role.job_title}</span>
                          </DropdownMenuItem>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{role.job_title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Reanalysis loading overlay */}
          {reanalysing && (
            <div className="bg-card border border-border p-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Re-analysing candidate for new role…</p>
              <div className="w-full max-w-md space-y-3 mt-2">
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mx-auto" />
              </div>
            </div>
          )}

          <div className={reanalysing ? "opacity-30 pointer-events-none transition-opacity duration-300 space-y-8" : "transition-opacity duration-300 space-y-8"}>

          {/* === REPORT SUMMARY === */}
          <section className="bg-card border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase">Screening Report Summary</h2>
            <p className="text-sm leading-relaxed text-foreground/80">{report}</p>
          </section>

          {/* === IDEAL ROLE FIT === */}
          <section className="bg-card border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase">Ideal Role Fit</h2>
            <p className="text-sm leading-relaxed text-foreground/80">{generateRoleFit(r)}</p>
          </section>

          {/* === DATA VISUALISATIONS === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <section className="bg-card border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Candidate Profile Shape</h3>
              <ChartContainer config={{ score: { label: "Score", color: CHART_COLOURS.primary } }} className="h-[260px] w-full">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(0,0%,30%)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Radar name="Score" dataKey="score" stroke={CHART_COLOURS.primary} fill={CHART_COLOURS.primary} fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
                </RadarChart>
              </ChartContainer>
            </section>

            {/* Bar Chart vs Baseline */}
            <section className="bg-card border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Scores vs Average Baseline</h3>
              <ChartContainer config={{ score: { label: "Score", color: CHART_COLOURS.primary } }} className="h-[260px] w-full">
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,20%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} />
                  <YAxis type="category" dataKey="dimension" tick={{ fill: "hsl(0,0%,55%)", fontSize: 11 }} width={80} />
                  <ReferenceLine x={50} stroke={CHART_COLOURS.muted} strokeDasharray="4 4" label={{ value: "Avg", fill: CHART_COLOURS.muted, fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill={CHART_COLOURS.primary} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            </section>

            {/* Skills Breakdown Pie */}
            <section className="bg-card border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Skills Breakdown</h3>
              {skillsPieData.length > 0 ? (
                <ChartContainer config={{ value: { label: "Count", color: CHART_COLOURS.primary } }} className="h-[240px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={skillsPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                      {skillsPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "hsl(0,0%,55%)" }} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No skills data available.</p>
              )}
            </section>

            {/* Red Flags Severity */}
            <section className="bg-card border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Red Flags by Severity</h3>
              {flagPieData.length > 0 ? (
                <ChartContainer config={{ value: { label: "Count", color: CHART_COLOURS.red } }} className="h-[240px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={flagPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                      {flagPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.colour} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "hsl(0,0%,55%)" }} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center">
                  <p className="text-sm text-score-green">No red flags detected ✓</p>
                </div>
              )}
            </section>
          </div>

          {/* === CAREER PROGRESSION === */}
          <section className="bg-card border border-border p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 uppercase">Career Progression</h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs pointer-events-none">
                {getTotalYears(r)}+ years
              </Badge>
              <Badge variant="outline" className="text-xs pointer-events-none capitalize">
                {getProgression(r).replace("_", " ")} trajectory
              </Badge>
            </div>
            {getExperienceHighlights(r).length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {getExperienceHighlights(r).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* === SKILLS === */}
          <section className="bg-card border border-border p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Skills & Certifications</h3>
            <div className="space-y-4">
              {getTechSkills(r).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Zap className="h-3 w-3" /> Technical Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {getTechSkills(r).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal pointer-events-none">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {getSoftSkills(r).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Soft Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {getSoftSkills(r).map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5 font-normal pointer-events-none">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {getCerts(r).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Award className="h-3 w-3" /> Certifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {getCerts(r).map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal pointer-events-none">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* === RED FLAGS === */}
          <section className="bg-card border border-border p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-score-red" />
              RED FLAGS ({r.red_flags.red_flag_count})
            </h3>
            {r.red_flags.red_flag_count === 0 ? (
              <p className="text-sm text-muted-foreground">No red flags detected.</p>
            ) : (
              <div className="space-y-3">
                {r.red_flags.employment_gaps.map((g, i) => (
                  <div key={`gap-${i}`} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className={`text-[10px] shrink-0 pointer-events-none ${g.severity === "high" ? "score-badge-red" : "score-badge-yellow"}`}>
                      {g.severity}
                    </Badge>
                    <span className="text-foreground/80">Employment gap: {g.period} ({g.duration_months} months)</span>
                  </div>
                ))
                }
                {r.red_flags.inconsistencies.map((inc, i) => (
                  <div key={`inc-${i}`} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0 pointer-events-none score-badge-yellow">medium</Badge>
                    <span className="text-foreground/80">{inc}</span>
                  </div>
                ))
                }
                {r.red_flags.vague_descriptions.map((v, i) => (
                  <div key={`vague-${i}`} className="flex items-start gap-3 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0 pointer-events-none score-badge-yellow">medium</Badge>
                    <span className="text-foreground/80">{v}</span>
                  </div>
                ))
                }
              </div>
            )}
          </section>

          {/* === IMPROVEMENT SUGGESTIONS === */}
          {r.overall_score.improvement_suggestions.length > 0 && (
            <section className="bg-card border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-score-yellow" />
                SUGGESTIONS
              </h3>
              <ul className="space-y-2">
                {r.overall_score.improvement_suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    {s}
                  </li>
                ))
                }
              </ul>
            </section>
          )}

          {/* === AGENT ECONOMICS === */}
          <section className="bg-card border border-border p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Agent Economics</h3>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> {r.agent_metrics.processing_time_seconds ?? "—"}s processing</span>
              <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> £{r.agent_metrics.cost_estimate_usd?.toFixed(4) ?? "0.0000"} cost</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {r.agent_metrics.estimated_manual_review_minutes} min saved</span>
            </div>
          </section>

          {/* === CANDIDATE DECISION === */}
          <section className="bg-card border border-border p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase">Candidate Decision</h3>
            <div className="flex flex-wrap items-center gap-3">
              {/* Hire / Deny buttons */}
              <Button
                onClick={() => updateStatus("hire")}
                className={`gap-2 text-sm font-semibold px-6 py-2.5 transition-all duration-200 ${
                  candidate.status === "hire"
                    ? "bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-400 ring-offset-2 ring-offset-background"
                    : "bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/40"
                }`}
              >
                <Award className="h-4 w-4" />
                Hire
              </Button>
              <Button
                onClick={() => updateStatus("deny")}
                className={`gap-2 text-sm font-semibold px-6 py-2.5 transition-all duration-200 ${
                  candidate.status === "deny"
                    ? "bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-background"
                    : "bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/40"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Deny
              </Button>

              {/* Assign Stage dropdown */}
              <Select
                value={candidate.status === "online_assessment" || candidate.status === "interview" ? candidate.status : ""}
                onValueChange={updateStatus}
              >
                <SelectTrigger className="w-[200px] h-10 text-sm border-border">
                  <SelectValue placeholder="Assign Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online_assessment">Online Assessment</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                </SelectContent>
              </Select>
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
          </div>{/* close reanalysing wrapper */}
        </div>
      </div>
    </div>
  );
};

export default CandidateProfile;
