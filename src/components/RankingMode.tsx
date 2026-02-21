import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Trophy, Eye, GitCompare, AlertTriangle, CheckCircle } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

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

interface Role {
  id: string;
  job_title: string;
}

interface RankingModeProps {
  candidates: Candidate[];
  roles: Role[];
}

function getScoreBadgeClasses(score: number) {
  if (score >= 85) return "score-badge-green";
  if (score >= 50) return "score-badge-yellow";
  return "score-badge-red";
}

function getMatchedSkills(c: Candidate): string[] {
  const a = c.analysis_json;
  return a?.skills_assessment?.required_skills_matched?.slice(0, 4) ?? a?.skills_assessment?.technical_skills?.slice(0, 4) ?? [];
}

function getMissingSkills(c: Candidate): string[] {
  return c.analysis_json?.skills_assessment?.required_skills_missing?.slice(0, 3) ?? [];
}

function getSummary(c: Candidate): string {
  return c.analysis_json?.summary ?? "";
}

const RankingMode = ({ candidates, roles }: RankingModeProps) => {
  const navigate = useNavigate();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Filter candidates that were analysed for the selected role
  const ranked = useMemo(() => {
    if (!selectedRole) return [];
    const roleName = selectedRole.job_title.toLowerCase();
    return candidates
      .filter((c) => {
        if (!c.job_description) return false;
        const firstLine = c.job_description.split("\n")[0].toLowerCase();
        return firstLine.includes(roleName) || roleName.includes(firstLine.replace("job title: ", "").trim());
      })
      .sort((a, b) => b.overall_score - a.overall_score);
  }, [candidates, selectedRole]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const comparedCandidates = ranked.filter((c) => selected.has(c.id));

  return (
    <div>
      {/* Role Selector */}
      <div className="mb-6">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Select Open Role
        </label>
        <Select value={selectedRoleId} onValueChange={(v) => { setSelectedRoleId(v); setSelected(new Set()); }}>
          <SelectTrigger className="w-full sm:w-[360px] h-11 text-sm border-border">
            <SelectValue placeholder="Choose a role to rank candidates…" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.job_title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {!selectedRole && (
        <div className="text-center py-20 text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a role above to view the ranked leaderboard.</p>
        </div>
      )}

      {selectedRole && ranked.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No candidates have been analysed for <strong>{selectedRole.job_title}</strong> yet.</p>
        </div>
      )}

      {/* Ranked Leaderboard */}
      {selectedRole && ranked.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {ranked.length} Candidate{ranked.length !== 1 ? "s" : ""} — Ranked by AI Match Score
            </span>
          </div>

          <div className="space-y-2">
            {ranked.map((c, i) => {
              const rank = i + 1;
              const matchedSkills = getMatchedSkills(c);
              const missingSkills = getMissingSkills(c);
              const isSelected = selected.has(c.id);

              return (
                <div
                  key={c.id}
                  className={`flex items-start gap-4 p-4 border bg-card transition-colors duration-200 ${
                    isSelected ? "border-foreground ring-1 ring-foreground" : "border-border"
                  }`}
                >
                  {/* Checkbox */}
                  <div className="pt-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(c.id)}
                      disabled={!isSelected && selected.size >= 3}
                      className="border-border"
                    />
                  </div>

                  {/* Rank Number */}
                  <div className="w-10 h-10 flex items-center justify-center border border-border bg-muted shrink-0">
                    <span className={`text-lg font-bold font-mono ${rank <= 3 ? "text-foreground" : "text-muted-foreground"}`}>
                      {rank}
                    </span>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {c.candidate_name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold tabular-nums px-2 py-0 shrink-0 ${getScoreBadgeClasses(c.overall_score)}`}
                      >
                        {c.overall_score}
                      </Badge>
                    </div>

                    {c.email && (
                      <p className="text-xs text-muted-foreground mb-2 truncate">{c.email}</p>
                    )}

                    {/* Matched Skills */}
                    {matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {matchedSkills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-2 py-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Missing Skills */}
                    {missingSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-2 py-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* View Profile */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs"
                    onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${c.id}`); }}
                  >
                    <Eye className="h-3 w-3" />
                    View Profile
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Compare Bar */}
      {selected.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-6 py-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <GitCompare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">
              {selected.size} candidate{selected.size !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <Button
            onClick={() => setShowComparison(true)}
            className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <GitCompare className="h-4 w-4" />
            Compare Selected Candidates
          </Button>
        </div>
      )}

      {/* Comparison Drawer */}
      <Sheet open={showComparison} onOpenChange={setShowComparison}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto bg-background border-t border-border p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold uppercase flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Side-by-Side Comparison
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="p-6">
            <div className={`grid gap-4 ${comparedCandidates.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {comparedCandidates.map((c, i) => {
                const matchedSkills = getMatchedSkills(c);
                const missingSkills = getMissingSkills(c);
                const ss = c.analysis_json?.overall_score?.section_scores;
                const summary = getSummary(c);

                return (
                  <div key={c.id} className="border border-border bg-card p-5 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-muted-foreground font-mono">#{i + 1}</span>
                          <span className="text-sm font-bold text-foreground">{c.candidate_name}</span>
                        </div>
                        {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      </div>
                      <Badge variant="outline" className={`text-lg font-bold tabular-nums px-3 py-1 shrink-0 ${getScoreBadgeClasses(c.overall_score)}`}>
                        {c.overall_score}
                      </Badge>
                    </div>

                    {/* Section Scores */}
                    {ss && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                          Section Breakdown
                        </span>
                        <div className="space-y-1.5">
                          {[
                            { label: "JD Match", score: ss.job_description_match?.score },
                            { label: "Skills", score: ss.skills_assessment?.score },
                            { label: "Education", score: ss.education?.score },
                            { label: "Experience", score: ss.work_experience?.score },
                            { label: "Right to Work", score: ss.right_to_work?.score },
                            { label: "Red Flags", score: ss.red_flags?.score },
                          ].map((s) => (
                            <div key={s.label} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{s.label}</span>
                              <span className="font-mono font-bold text-foreground">{s.score ?? "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matched Skills */}
                    {matchedSkills.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                          Matched Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedSkills.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] px-2 py-0 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills */}
                    {missingSkills.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                          Missing Critical Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {missingSkills.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] px-2 py-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Summary */}
                    {summary && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                          AI Reasoning
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
                      </div>
                    )}

                    {/* View Profile */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto gap-1.5 text-xs w-full"
                      onClick={() => { setShowComparison(false); navigate(`/candidates/${c.id}`); }}
                    >
                      <Eye className="h-3 w-3" />
                      View Full Profile
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RankingMode;
