import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SwimLogo from "@/components/SwimLogo";
import { useTheme } from "@/hooks/useTheme";
import {
  Home as HomeIcon,
  FileText,
  TrendingUp,
  Search,
  Users,
  Clock,
  Zap,
  Briefcase,
  Moon,
  Sun,
} from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

interface RecentCandidate {
  id: string;
  candidate_name: string;
  overall_score: number;
  recommendation: string;
  job_description: string | null;
  created_at: string;
}

const REC_LABELS: Record<string, { label: string; className: string }> = {
  strong_yes: { label: "Strong Yes", className: "score-badge-green" },
  yes: { label: "Yes", className: "score-badge-green" },
  maybe: { label: "Maybe", className: "score-badge-yellow" },
  no: { label: "No", className: "score-badge-red" },
  strong_no: { label: "Strong No", className: "score-badge-red" },
};

function getScoreBadgeClasses(score: number) {
  if (score >= 75) return "score-badge-green";
  if (score >= 50) return "score-badge-yellow";
  return "score-badge-red";
}

const NAV_ITEMS = [
  { label: "Home", path: "/", icon: HomeIcon },
  { label: "Analyse New CV", path: "/analyze", icon: FileText },
  { label: "Candidates", path: "/candidates", icon: Users },
  { label: "Roles", path: "/roles", icon: Briefcase },
  { label: "ROI & Economics", path: "/roi", icon: TrendingUp },
];

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidate[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("candidates")
        .select("id, candidate_name, overall_score, recommendation, job_description, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setRecentCandidates(data);
    };

    const fetchTodayCount = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString());
      setTotalToday(count ?? 0);
    };

    fetchRecent();
    fetchTodayCount();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/candidates?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div className="h-screen flex bg-background transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0">
        <div className="h-14 flex items-center gap-3 px-5 border-b border-border">
          <SwimLogo size={24} />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-foreground text-base leading-none">SWIM</span>
            <span className="text-[9px] text-muted-foreground tracking-wide">AGENTIC TALENT SCREENING</span>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors duration-200 border ${
                  active
                    ? "bg-primary text-primary-foreground border-border"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="uppercase text-xs tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full justify-start gap-2 text-xs">
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {isDark ? "LIGHT MODE" : "DARK MODE"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Global header with search */}
        <header className="h-14 border-b border-border bg-background flex items-center px-6 shrink-0">
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates, skills, or roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </form>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            {/* Welcome & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground uppercase">Welcome Back, HR Team</h1>
                <p className="text-sm text-muted-foreground mt-1">Your agentic screening dashboard</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/analyze">
                  <Button className="gap-2 text-xs uppercase tracking-wide">
                    <FileText className="h-3.5 w-3.5" />
                    Analyse New Resume
                  </Button>
                </Link>
                <Button variant="outline" className="gap-2 text-xs uppercase tracking-wide" disabled>
                  <Zap className="h-3.5 w-3.5" />
                  Batch Upload (Beta)
                </Button>
              </div>
            </div>

            {/* Agent Health Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                  <Users className="h-3.5 w-3.5" />
                  Candidates Processed Today
                </div>
                <p className="text-3xl font-bold text-foreground">{totalToday}</p>
              </div>

              <div className="border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                  <Clock className="h-3.5 w-3.5" />
                  Time Saved Today
                </div>
                <p className="text-3xl font-bold text-foreground">{totalToday * 12}m</p>
                <p className="text-xs text-muted-foreground mt-1">~12 min per candidate</p>
              </div>

              <div className="border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 uppercase tracking-wide">
                  <Zap className="h-3.5 w-3.5" />
                  Agent Status
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-score-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-score-green" />
                  </span>
                  <span className="text-sm font-semibold text-foreground uppercase">Claude AI Agent: Online & Ready</span>
                </div>
              </div>
            </div>

            {/* Recent Candidates Feed */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground uppercase">Recent Candidates</h2>
                <Link to="/candidates">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground uppercase">
                    View All →
                  </Button>
                </Link>
              </div>

              {recentCandidates.length === 0 ? (
                <div className="border border-border bg-card p-8 text-center">
                  <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">No candidates analysed yet</p>
                  <Link to="/analyze">
                    <Button size="sm" className="mt-4 text-xs uppercase">Analyse Your First CV</Button>
                  </Link>
                </div>
              ) : (
                <div className="border border-border bg-card">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_1fr_80px_140px] gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    <span>Candidate Name</span>
                    <span>Role</span>
                    <span className="text-center">Score</span>
                    <span className="text-center">Recommendation</span>
                  </div>
                  {/* Rows */}
                  {recentCandidates.map((c) => {
                    const rec = REC_LABELS[c.recommendation] || { label: c.recommendation, className: "score-badge-muted" };
                    return (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/candidates/${c.id}`)}
                        className="grid grid-cols-[1fr_1fr_80px_140px] gap-4 px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-accent transition-colors duration-200 cursor-pointer items-center"
                      >
                        <span className="text-sm font-semibold text-foreground truncate">{c.candidate_name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {c.job_description ? c.job_description.split("\n")[0]?.replace(/^Job Title:\s*/i, "").slice(0, 40) : "General"}
                        </span>
                        <div className="flex justify-center">
                          <Badge variant="outline" className={`text-xs font-bold tabular-nums ${getScoreBadgeClasses(c.overall_score)}`}>
                            {c.overall_score}
                          </Badge>
                        </div>
                        <div className="flex justify-center">
                          <Badge className={`text-[10px] px-2.5 py-0.5 ${rec.className} border-0`}>
                            {rec.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
