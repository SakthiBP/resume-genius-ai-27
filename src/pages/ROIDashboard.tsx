import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
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
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  Clock,
  DollarSign,
  FileText,
  Zap,
  Users,
} from "lucide-react";

/* ── mock monthly data ─────────────────────────────────── */
const MONTHLY_DATA = [
  { month: "Oct", humanCost: 420, aiCost: 3.6, cvs: 120 },
  { month: "Nov", humanCost: 630, aiCost: 5.4, cvs: 180 },
  { month: "Dec", humanCost: 910, aiCost: 7.8, cvs: 260 },
  { month: "Jan", humanCost: 1260, aiCost: 10.8, cvs: 360 },
  { month: "Feb", humanCost: 1680, aiCost: 14.4, cvs: 480 },
  { month: "Mar", humanCost: 2240, aiCost: 19.2, cvs: 640 },
];

const chartConfig = {
  humanCost: {
    label: "Human Cost",
    color: "hsl(var(--score-red))",
  },
  aiCost: {
    label: "AI Cost",
    color: "hsl(var(--score-purple))",
  },
};

/* ── animated counter hook ─────────────────────────────── */
function useCountUp(target: number, duration = 1400, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
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

/* ── main component ────────────────────────────────────── */
const ROIDashboard = () => {
  const [totalCVs, setTotalCVs] = useState(0);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true });
      setTotalCVs(count ?? 0);
    })();
  }, []);

  const MINS_PER_CV = 20;
  const HUMAN_COST_PER_CV = 3.5;
  const AI_COST_PER_CV = 0.03;

  const totalTimeSavedMins = totalCVs * MINS_PER_CV;
  const totalTimeSavedHrs = totalTimeSavedMins / 60;
  const totalComputeCost = totalCVs * AI_COST_PER_CV;
  const totalValue = totalCVs * (HUMAN_COST_PER_CV - AI_COST_PER_CV);

  const animCVs = useCountUp(totalCVs, 1200);
  const animHrs = useCountUp(totalTimeSavedHrs, 1400, 1);
  const animCost = useCountUp(totalComputeCost, 1400, 2);
  const animValue = useCountUp(totalValue, 1600, 2);

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-300">
      <Navbar score={null} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground uppercase">
              ROI &amp; Economics
            </h1>
          </div>

          {/* ── Top Metric Cards ──────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              icon={<FileText className="h-5 w-5" />}
              label="Total CVs Processed"
              value={animCVs.toLocaleString()}
              delay={0}
            />
            <MetricCard
              icon={<Clock className="h-5 w-5" />}
              label="Total Time Saved"
              value={`${animHrs.toLocaleString()}h`}
              delay={1}
            />
            <MetricCard
              icon={<Zap className="h-5 w-5" />}
              label="Total Compute Cost"
              value={`$${animCost.toLocaleString()}`}
              delay={2}
            />
            <MetricCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Financial Value Generated"
              value={`$${animValue.toLocaleString()}`}
              accent
              delay={3}
            />
          </div>

          {/* ── Historical Chart ──────────────────────── */}
          <Card className="border border-border bg-card mb-8 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <CardContent className="p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                Cost Comparison Over Time
              </h2>
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <AreaChart data={MONTHLY_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    tickFormatter={(v) => `$${v}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="humanCost"
                    name="Human Cost"
                    stroke="hsl(var(--score-red))"
                    fill="hsl(var(--score-red))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="aiCost"
                    name="AI Cost"
                    stroke="hsl(var(--score-purple))"
                    fill="hsl(var(--score-purple))"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* ── Per-Unit Economics ─────────────────────── */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Per-Unit Economics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Human Review */}
              <Card className="border border-border bg-card">
                <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                  <Users className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Human Review
                  </span>
                  <span className="text-2xl font-bold text-foreground font-mono">
                    20 min
                  </span>
                  <span className="text-lg font-semibold text-foreground font-mono">
                    $3.50
                  </span>
                </CardContent>
              </Card>

              {/* Cost Reduction Badge */}
              <Card className="border border-border bg-card flex items-center justify-center">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <Badge className="score-badge-green text-base px-4 py-1.5 font-bold border">
                    99.1% Cost Reduction
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    $3.50 → $0.03 per CV
                  </span>
                </CardContent>
              </Card>

              {/* AI Agent Review */}
              <Card className="border border-border bg-card">
                <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                  <Zap className="h-6 w-6 text-score-purple" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    AI Agent Review
                  </span>
                  <span className="text-2xl font-bold text-foreground font-mono">
                    8 sec
                  </span>
                  <span className="text-lg font-semibold text-foreground font-mono">
                    $0.03
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Metric Card sub-component ────────────────────────── */
function MetricCard({
  icon,
  label,
  value,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <Card
      className={`border border-border bg-card animate-fade-in-up ${accent ? "ring-1 ring-score-green/30" : ""}`}
      style={{ animationDelay: `${delay * 0.08}s` }}
    >
      <CardContent className="p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wide">
            {label}
          </span>
        </div>
        <span
          className={`text-2xl font-bold font-mono tabular-nums ${
            accent ? "text-score-green" : "text-foreground"
          }`}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

export default ROIDashboard;
