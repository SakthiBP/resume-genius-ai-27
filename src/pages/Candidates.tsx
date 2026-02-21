import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, ArrowUpDown } from "lucide-react";
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

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "score-badge-muted" },
  { value: "deny", label: "Deny", color: "score-badge-red" },
  { value: "online_assessment", label: "Online Assessment", color: "score-badge-yellow" },
  { value: "interview", label: "Interview", color: "score-badge-blue" },
  { value: "hire", label: "Hire", color: "score-badge-green" },
];

function getScoreBadgeClasses(score: number) {
  if (score >= 75) return "score-badge-green";
  if (score >= 50) return "score-badge-yellow";
  if (score >= 25) return "score-badge-red";
  return "score-badge-red";
}

const REC_LABELS: Record<string, string> = {
  strong_yes: "Strong Yes",
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
  strong_no: "Strong No",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const Candidates = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCandidates(data as unknown as Candidate[]);
    if (error) console.error("Failed to fetch candidates:", error);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    await supabase.from("candidates").update({ status: newStatus }).eq("id", id);
  };

  const filtered = useMemo(() => {
    let list = candidates;
    if (filterStatus !== "all") {
      list = list.filter((c) => c.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.candidate_name.toLowerCase().includes(q));
    }
    if (sortBy === "score") list = [...list].sort((a, b) => b.overall_score - a.overall_score);
    else if (sortBy === "name") list = [...list].sort((a, b) => a.candidate_name.localeCompare(b.candidate_name));
    else list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [candidates, search, sortBy, filterStatus]);

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-300">
      <Navbar score={null} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Candidate Pipeline</h1>
            <Badge variant="secondary" className="text-xs">{candidates.length}</Badge>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest First</SelectItem>
                <SelectItem value="score">Score: High → Low</SelectItem>
                <SelectItem value="name">Name: A → Z</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deny">Deny</SelectItem>
                <SelectItem value="online_assessment">Online Assessment</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="hire">Hire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Candidate List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No candidates found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => {
                const statusOpt = STATUS_OPTIONS.find((s) => s.value === c.status) || STATUS_OPTIONS[0];
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/candidates/${c.id}`)}
                    className="flex items-center gap-4 p-4 border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors duration-200 cursor-pointer"
                  >
                    {/* Name & email */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate block">
                        {c.candidate_name}
                      </span>
                      {c.email && (
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      )}
                    </div>

                    {/* Score badge */}
                    <Badge variant="outline" className={`text-xs font-bold tabular-nums ${getScoreBadgeClasses(c.overall_score)}`}>
                      {c.overall_score}
                    </Badge>

                    {/* Recommendation */}
                    <span className="text-xs text-muted-foreground hidden sm:block w-24 text-center">
                      {REC_LABELS[c.recommendation] || c.recommendation}
                    </span>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground w-16 text-right hidden md:block">
                      {timeAgo(c.created_at)}
                    </span>

                    {/* Status dropdown */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs border-none">
                          <Badge className={`text-[10px] px-2 py-0.5 ${statusOpt.color} border-0 pointer-events-none`}>
                            {statusOpt.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              <Badge className={`text-[10px] px-2 py-0.5 ${s.color} border-0 pointer-events-none`}>
                                {s.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Candidates;
