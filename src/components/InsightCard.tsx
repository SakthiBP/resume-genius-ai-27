import { useState } from "react";
import { AlertTriangle, Lightbulb, Zap, Briefcase, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type InsightType = "red-flag" | "suggestion" | "skill" | "experience";

export interface Insight {
  id: string;
  type: InsightType;
  category: string;
  title: string;
  detail: string;
  severity?: "low" | "medium" | "high";
  badges?: string[];
}

interface InsightCardProps {
  insight: Insight;
  index: number;
}

const typeConfig: Record<InsightType, { icon: typeof AlertTriangle; label: string; accent: string; bgAccent: string }> = {
  "red-flag": { icon: AlertTriangle, label: "Red Flag", accent: "text-score-red", bgAccent: "bg-score-red/10" },
  suggestion: { icon: Lightbulb, label: "Recommendation", accent: "text-score-blue", bgAccent: "bg-score-blue/10" },
  skill: { icon: Zap, label: "Strength", accent: "text-score-green", bgAccent: "bg-score-green/10" },
  experience: { icon: Briefcase, label: "Role Fit", accent: "text-score-purple", bgAccent: "bg-score-purple/10" },
};

const severityColors: Record<string, string> = {
  low: "bg-score-yellow/15 text-score-yellow border-score-yellow/30",
  medium: "bg-score-yellow/20 text-score-yellow border-score-yellow/40",
  high: "bg-score-red/15 text-score-red border-score-red/30",
};

const InsightCard = ({ insight, index }: InsightCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <div
      className="animate-fade-in-up border border-border rounded-lg bg-card hover:shadow-sm transition-shadow cursor-pointer"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn("mt-0.5 p-1.5 rounded-md", config.bgAccent)}>
          <Icon className={cn("h-3.5 w-3.5", config.accent)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn("text-xs font-semibold", config.accent)}>{config.label}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground truncate">{insight.category}</span>
            {insight.severity && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 ml-auto", severityColors[insight.severity])}>
                {insight.severity}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground leading-snug">{insight.title}</p>
          {expanded && (
            <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {insight.detail}
              {insight.badges && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {insight.badges.map((b) => (
                    <Badge key={b} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform", expanded && "rotate-180")} />
      </div>
    </div>
  );
};

export default InsightCard;
