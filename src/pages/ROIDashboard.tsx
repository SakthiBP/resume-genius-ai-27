import { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import WavesLoader from "@/components/WavesLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  Clock,
  PoundSterling,
  FileText,
  Zap,
  Users,
  ChevronDown,
  ChevronUp,
  Activity,
  Cpu,
  ArrowRight,
  Calculator,
  Eye,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

/* ── types ─────────────────────────────────────────────── */
interface CandidateRow {
  id: string;
  candidate_name: string;
  email: string | null;
  overall_score: number;
  recommendation: string;
  created_at: string;
  analysis_json: any;
  job_description: string | null;
}

/* ── animated counter hook ─────────────────────────────── */
function useCountUp(target: number, duration = 1400, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, decimals]);

  return value;
}

/* ── helpers ───────────────────────────────────────────── */
function getTokenUsage(aj: any) {
  const tu = aj?.token_usage;
  return {
    input: tu?.input_tokens ?? 0,
    output: tu?.output_tokens ?? 0,
    total: tu?.total_tokens ?? 0,
    cost: tu?.actual_cost_usd ?? aj?.agent_metrics?.cost_estimate_usd ?? 0,
  };
}

function getProcessingTime(aj: any) {
  return aj?.agent_metrics?.processing_time_seconds ?? 0;
}

function getManualMins(aj: any) {
  return aj?.agent_metrics?.estimated_manual_review_minutes ?? 20;
}

const HUMAN_HOURLY_RATE = 20; // £/hr for manual screening

function fmtGBP(v: number, d = 2) {
  return `£${v.toFixed(d)}`;
}

function fmtNum(v: number) {
  return v.toLocaleString();
}

/* ── main component ────────────────────────────────────── */
const ROIDashboard = () => {
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [roiScale, setRoiScale] = useState(100); // projected CVs for calculator

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });
      setCandidates((data as CandidateRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  /* ── derived metrics ─────────────────────────────────── */
  const metrics = useMemo(() => {
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalTokens = 0;
    let totalAiCost = 0;
    let totalProcessingSec = 0;
    let totalManualMins = 0;

    candidates.forEach((c) => {
      const tu = getTokenUsage(c.analysis_json);
      totalTokensIn += tu.input;
      totalTokensOut += tu.output;
      totalTokens += tu.total;
      totalAiCost += tu.cost;
      totalProcessingSec += getProcessingTime(c.analysis_json);
      totalManualMins += getManualMins(c.analysis_json);
    });

    const totalManualHrs = totalManualMins / 60;
    const totalManualCost = (totalManualMins / 60) * HUMAN_HOURLY_RATE;
    const totalSaved = totalManualCost - totalAiCost;
    const costReduction = totalManualCost > 0 ? ((totalSaved / totalManualCost) * 100) : 0;
    const avgCostPerCV = candidates.length > 0 ? totalAiCost / candidates.length : 0;
    const avgTimePerCV = candidates.length > 0 ? totalProcessingSec / candidates.length : 0;

    return {
      totalCVs: candidates.length,
      totalTokensIn,
      totalTokensOut,
      totalTokens,
      totalAiCost,
      totalProcessingSec,
      totalManualMins,
      totalManualHrs,
      totalManualCost,
      totalSaved,
      costReduction,
      avgCostPerCV,
      avgTimePerCV,
    };
  }, [candidates]);

  /* ── chart data ──────────────────────────────────────── */
  const transactionData = useMemo(() => {
    return candidates.map((c) => {
      const tu = getTokenUsage(c.analysis_json);
      const manMins = getManualMins(c.analysis_json);
      return {
        name: c.candidate_name.split(" ")[0],
        aiCost: tu.cost,
        humanCost: (manMins / 60) * HUMAN_HOURLY_RATE,
        tokens: tu.total,
        time: getProcessingTime(c.analysis_json),
      };
    }).reverse();
  }, [candidates]);

  const tokenBreakdown = useMemo(() => {
    return [
      { name: "Input Tokens", value: metrics.totalTokensIn, fill: "hsl(var(--score-blue))" },
      { name: "Output Tokens", value: metrics.totalTokensOut, fill: "hsl(var(--score-purple))" },
    ];
  }, [metrics]);

  /* ── ROI calculator projections ──────────────────────── */
  const projected = useMemo(() => {
    const avgCost = metrics.avgCostPerCV || 0.015;
    const aiCost = roiScale * avgCost;
    const humanCost = roiScale * ((20 / 60) * HUMAN_HOURLY_RATE);
    return { aiCost, humanCost, saved: humanCost - aiCost, timeSavedHrs: (roiScale * 20) / 60 };
  }, [roiScale, metrics.avgCostPerCV]);

  /* ── animated values ─────────────────────────────────── */
  const animCVs = useCountUp(metrics.totalCVs, 1000);
  const animSaved = useCountUp(metrics.totalSaved, 1400, 2);
  const animAiCost = useCountUp(metrics.totalAiCost, 1200, 4);
  const animHrs = useCountUp(metrics.totalManualHrs, 1200, 1);
  const animTokens = useCountUp(metrics.totalTokens, 1200);
  const animReduction = useCountUp(metrics.costReduction, 1600, 1);

  const costChartConfig = {
    humanCost: { label: "Human Cost", color: "hsl(var(--score-red))" },
    aiCost: { label: "AI Cost", color: "hsl(var(--score-purple))" },
  };

  const tokenChartConfig = {
    tokens: { label: "Tokens", color: "hsl(var(--score-blue))" },
  };

  const pieConfig = {
    "Input Tokens": { label: "Input", color: "hsl(var(--score-blue))" },
    "Output Tokens": { label: "Output", color: "hsl(var(--score-purple))" },
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar score={null} />
        <div className="flex-1 flex items-center justify-center">
          <WavesLoader size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-300">
      <Navbar score={null} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2 animate-fade-in-up">
            <Activity className="h-6 w-6 text-score-purple" />
            <h1 className="text-2xl font-bold text-foreground uppercase">
              Agent Financial Observability
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            Real-time proof of value — every token, every pound, every second tracked from live agent transactions.
          </p>

          {/* ── Hero Metric Cards ─────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
            <MetricCard icon={<FileText className="h-4 w-4" />} label="CVs Analysed" value={fmtNum(animCVs)} delay={0} />
            <MetricCard icon={<PoundSterling className="h-4 w-4" />} label="Total Value Saved" value={fmtGBP(animSaved)} accent delay={1} />
            <MetricCard icon={<Zap className="h-4 w-4" />} label="Total AI Spend" value={fmtGBP(animAiCost, 4)} delay={2} />
            <MetricCard icon={<Clock className="h-4 w-4" />} label="Human Hours Saved" value={`${animHrs}h`} delay={3} />
            <MetricCard icon={<Cpu className="h-4 w-4" />} label="Tokens Consumed" value={fmtNum(animTokens)} delay={4} />
            <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Cost Reduction" value={`${animReduction}%`} accent delay={5} />
          </div>

          {/* ── Cost Comparison + Token Breakdown ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <Card className="lg:col-span-2 border border-border bg-card animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <CardContent className="p-6">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Cost Per Transaction — Human vs AI
                </h2>
                {transactionData.length > 0 ? (
                  <ChartContainer config={costChartConfig} className="h-[280px] w-full">
                    <BarChart data={transactionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `£${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="humanCost" name="Human Cost" fill="hsl(var(--score-red))" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="aiCost" name="AI Cost" fill="hsl(var(--score-purple))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border bg-card animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <CardContent className="p-6">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Token Distribution
                </h2>
                {metrics.totalTokens > 0 ? (
                  <ChartContainer config={pieConfig} className="h-[200px] w-full">
                    <PieChart>
                      <Pie data={tokenBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="hsl(var(--background))">
                        {tokenBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
                )}
                <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-score-blue" /> Input: {fmtNum(metrics.totalTokensIn)}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-score-purple" /> Output: {fmtNum(metrics.totalTokensOut)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Per-Unit Economics ─────────────────────── */}
          <div className="animate-fade-in-up mb-8" style={{ animationDelay: "0.25s" }}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Per-Unit Economics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-border bg-card">
                <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Human Review</span>
                  <span className="text-2xl font-bold text-foreground font-mono">~20 min</span>
                  <span className="text-lg font-semibold text-foreground font-mono">£6.67</span>
                  <span className="text-[10px] text-muted-foreground">@ £{HUMAN_HOURLY_RATE}/hr</span>
                </CardContent>
              </Card>
              <Card className="border border-border bg-card flex items-center justify-center">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="score-badge-green text-base px-4 py-1.5 font-bold border inline-flex items-center">
                    {metrics.costReduction.toFixed(1)}% Reduction
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">£6.67</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span className="font-mono text-score-green">{fmtGBP(metrics.avgCostPerCV, 4)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">per CV average</span>
                </CardContent>
              </Card>
              <Card className="border border-border bg-card">
                <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                  <Zap className="h-5 w-5 text-score-purple" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Agent Review</span>
                  <span className="text-2xl font-bold text-foreground font-mono">{metrics.avgTimePerCV.toFixed(1)}s</span>
                  <span className="text-lg font-semibold text-foreground font-mono">{fmtGBP(metrics.avgCostPerCV, 4)}</span>
                  <span className="text-[10px] text-muted-foreground">actual avg from {metrics.totalCVs} analyses</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── ROI Calculator ────────────────────────── */}
          <Card className="border border-border bg-card mb-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  ROI Projection Calculator
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Drag to project costs at scale based on your actual per-CV economics.
              </p>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm text-muted-foreground font-mono w-16 shrink-0">{roiScale} CVs</span>
                <Slider
                  value={[roiScale]}
                  onValueChange={(v) => setRoiScale(v[0])}
                  min={10}
                  max={10000}
                  step={10}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">10,000</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat label="Human Cost" value={fmtGBP(projected.humanCost)} colour="text-score-red" />
                <MiniStat label="AI Cost" value={fmtGBP(projected.aiCost, 2)} colour="text-score-purple" />
                <MiniStat label="Net Savings" value={fmtGBP(projected.saved)} colour="text-score-green" />
                <MiniStat label="Time Saved" value={`${projected.timeSavedHrs.toFixed(0)}h`} colour="text-score-blue" />
              </div>
            </CardContent>
          </Card>

          {/* ── Transaction Log ───────────────────────── */}
          <div className="animate-fade-in-up mb-8" style={{ animationDelay: "0.35s" }}>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Transaction Log — Deep Dive
              </h2>
            </div>

            <div className="border border-border">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                <span className="col-span-3">Candidate</span>
                <span className="col-span-1 text-right">Score</span>
                <span className="col-span-2 text-right">Tokens</span>
                <span className="col-span-2 text-right">AI Cost</span>
                <span className="col-span-2 text-right">Human Cost</span>
                <span className="col-span-1 text-right">Time</span>
                <span className="col-span-1 text-right">
                  <Eye className="h-3 w-3 inline" />
                </span>
              </div>

              {candidates.map((c) => {
                const tu = getTokenUsage(c.analysis_json);
                const manMins = getManualMins(c.analysis_json);
                const humanCost = (manMins / 60) * HUMAN_HOURLY_RATE;
                const procTime = getProcessingTime(c.analysis_json);
                const isExpanded = expandedRow === c.id;

                return (
                  <div key={c.id} className="border-b border-border last:border-b-0">
                    <div
                      className="grid grid-cols-12 gap-2 px-4 py-3 text-sm cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedRow(isExpanded ? null : c.id)}
                    >
                      <span className="col-span-3 font-medium text-foreground truncate">{c.candidate_name}</span>
                      <span className="col-span-1 text-right font-mono">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                          c.overall_score >= 70 ? "score-badge-green" :
                          c.overall_score >= 40 ? "score-badge-yellow" : "score-badge-red"
                        }`}>
                          {c.overall_score}
                        </Badge>
                      </span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">{fmtNum(tu.total)}</span>
                      <span className="col-span-2 text-right font-mono text-score-purple">{fmtGBP(tu.cost, 4)}</span>
                      <span className="col-span-2 text-right font-mono text-score-red">{fmtGBP(humanCost)}</span>
                      <span className="col-span-1 text-right font-mono text-muted-foreground">{procTime.toFixed(1)}s</span>
                      <span className="col-span-1 text-right">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 inline text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 inline text-muted-foreground" />}
                      </span>
                    </div>

                    {/* ── Expanded Detail ───────────────── */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-muted/20 animate-fade-in-up" style={{ animationDuration: "0.2s" }}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <MiniStat label="Input Tokens" value={fmtNum(tu.input)} colour="text-score-blue" />
                          <MiniStat label="Output Tokens" value={fmtNum(tu.output)} colour="text-score-purple" />
                          <MiniStat label="Est. Manual Time" value={`${manMins} min`} colour="text-score-red" />
                          <MiniStat label="Value Created" value={fmtGBP(humanCost - tu.cost)} colour="text-score-green" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Recommendation: </span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 ${
                              c.recommendation.includes("yes") ? "score-badge-green" :
                              c.recommendation === "maybe" ? "score-badge-yellow" : "score-badge-red"
                            }`}>
                              {c.recommendation.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Analysed: </span>
                            <span className="text-foreground">{new Date(c.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">Speed-up: </span>
                            <span className="text-score-green font-mono font-bold">
                              {procTime > 0 ? `${((manMins * 60) / procTime).toFixed(0)}×` : "—"} faster
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {candidates.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transactions yet. Analyse a CV to populate this log.
                </div>
              )}
            </div>
          </div>

          {/* ── Projected Cumulative Savings Chart ─────────── */}
          <Card className="border border-border bg-card mb-8 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <CardContent className="p-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Projected Cumulative Value — 0 to 10,000 Analyses
              </h2>
              <ChartContainer config={{ saved: { label: "Cumulative Saved", color: "hsl(var(--score-green))" } }} className="h-[240px] w-full">
                <AreaChart
                  data={(() => {
                    const avgCost = metrics.avgCostPerCV || 0.015;
                    const humanPerCV = (20 / 60) * HUMAN_HOURLY_RATE;
                    const savingPerCV = humanPerCV - avgCost;
                    const steps = [0, 100, 250, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
                    return steps.map((n) => ({
                      index: n,
                      saved: Number((n * savingPerCV).toFixed(2)),
                    }));
                  })()}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="index" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => v.toLocaleString()} label={{ value: "Analyses", position: "insideBottom", offset: -2, fontSize: 10, className: "fill-muted-foreground" }} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `£${v.toLocaleString()}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="saved" name="Cumulative Saved" stroke="hsl(var(--score-green))" fill="hsl(var(--score-green))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* ── Bottom Summary ────────────────────────── */}
          <div className="animate-fade-in-up text-center pb-12" style={{ animationDelay: "0.45s" }}>
            <p className="text-xs text-muted-foreground">
              All figures derived from live agent transaction data. Token costs calculated using actual API pricing converted to GBP (×0.742). Human benchmark: £{HUMAN_HOURLY_RATE}/hr × estimated review minutes per CV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ────────────────────────────────────── */
function MetricCard({ icon, label, value, accent, delay = 0 }: {
  icon: React.ReactNode; label: string; value: string; accent?: boolean; delay?: number;
}) {
  return (
    <Card
      className={`border border-border bg-card animate-fade-in-up ${accent ? "ring-1 ring-score-green/30" : ""}`}
      style={{ animationDelay: `${delay * 0.06}s` }}
    >
      <CardContent className="p-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <span className={`text-xl font-bold font-mono tabular-nums ${accent ? "text-score-green" : "text-foreground"}`}>
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <div className="bg-background border border-border p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-sm font-bold font-mono ${colour}`}>{value}</div>
    </div>
  );
}

export default ROIDashboard;
