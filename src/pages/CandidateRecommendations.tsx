import { useState, useEffect } from "react";
import {
  Search, MapPin, Briefcase, Award, UserPlus, Plus, ChevronDown, ChevronUp,
  AlertTriangle, Github, Mail, ExternalLink, Star, Send, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import WavesLoader from "@/components/WavesLoader";
import EmailPreviewModal from "@/components/EmailPreviewModal";
import { getOutreachEmailTemplate } from "@/lib/emailTemplates";

// ── Types ──

interface ExternalCandidate {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  experience: { title: string; company: string; duration: string; description: string }[];
  linkedin_url: string | null;
  created_at: string;
}

interface ScoredCandidate extends ExternalCandidate {
  relevance_score: number;
}

interface Role {
  id: string;
  job_title: string;
  required_skills: string[];
  description: string;
}

interface GitHubCandidate {
  rank: number;
  username: string;
  github_profile_url: string;
  display_name: string | null;
  location_listed: string | null;
  location_verified: boolean;
  location_flag: string;
  email: string | null;
  email_source: string;
  avatar_url: string;
  bio: string | null;
  account_age_years: number;
  followers: number;
  public_repos: number;
  top_languages: string[];
  pinned_repos: {
    repo_name: string;
    description: string | null;
    primary_language: string;
    stars: number;
    url: string;
    classification?: string;
  }[];
  recommendation_score: number;
  score_band: string;
  match_summary: string;
  standout_signals: string[];
  outreach_status: string;
  outreach_email: string | null;
  company: string | null;
}

interface GitHubSearchResult {
  github_recommendations: {
    role_searched_for: string;
    location_filter_applied: string;
    remote_included: boolean;
    search_executed_at: string;
    total_profiles_scanned: number;
    total_passed_location_filter: number;
    total_passed_score_threshold: number;
    candidates_returned: number;
    recommended_candidates: GitHubCandidate[];
  } | null;
  error?: string;
  action_required?: string;
}

// ── Scoring (existing pool) ──

function scoreCandidate(
  candidate: ExternalCandidate,
  role: Role,
  filters: { seniority: string; location: string; skills: string[] }
): number {
  const candidateSkillsLower = (candidate.skills || []).map((s) => s.toLowerCase());
  const roleSkillsLower = (role.required_skills || []).map((s) => s.toLowerCase());
  const filterSkillsLower = filters.skills.map((s) => s.toLowerCase());
  const allRequiredSkills = [...new Set([...roleSkillsLower, ...filterSkillsLower])];
  const skillMatches = allRequiredSkills.filter((s) =>
    candidateSkillsLower.some((cs) => cs.includes(s) || s.includes(cs))
  );
  const skillScore = allRequiredSkills.length > 0 ? (skillMatches.length / allRequiredSkills.length) * 50 : 25;
  let seniorityScore = 10;
  if (filters.seniority) {
    const headline = (candidate.headline || "").toLowerCase();
    const senLower = filters.seniority.toLowerCase();
    if (headline.includes(senLower)) seniorityScore = 20;
    else if (
      (senLower === "senior" && (headline.includes("lead") || headline.includes("principal"))) ||
      (senLower === "junior" && (headline.includes("associate") || headline.includes("graduate")))
    ) seniorityScore = 15;
  }
  let locationScore = 5;
  if (filters.location && candidate.location) {
    if (candidate.location.toLowerCase().includes(filters.location.toLowerCase())) locationScore = 10;
  }
  const expText = (candidate.experience || []).map((e) => `${e.title} ${e.company} ${e.description}`).join(" ").toLowerCase();
  const roleDescWords = (role.description || "").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const expMatches = roleDescWords.filter((w) => expText.includes(w));
  const expScore = roleDescWords.length > 0 ? (expMatches.length / roleDescWords.length) * 20 : 10;
  return Math.min(100, Math.round(skillScore + seniorityScore + locationScore + expScore));
}

// ── Score band colors ──

function getScoreBandColor(band: string): string {
  switch (band) {
    case "green": return "bg-score-green text-white";
    case "light_green": return "bg-score-green/70 text-white";
    case "amber": return "bg-score-yellow text-black";
    case "orange": return "bg-score-yellow/70 text-black";
    case "red": return "bg-score-red text-white";
    default: return "bg-muted text-muted-foreground";
  }
}

function getScoreColor(score: number) {
  if (score >= 75) return "score-badge-green";
  if (score >= 50) return "score-badge-yellow";
  return "score-badge-red";
}

// ── Component ──

export default function CandidateRecommendations() {
  const { toast } = useToast();

  // Shared state
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [rolesLoading, setRolesLoading] = useState(true);

  // Pool tab state
  const [seniority, setSeniority] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formHeadline, setFormHeadline] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formLinkedinUrl, setFormLinkedinUrl] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [candidates, setCandidates] = useState<ScoredCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  // GitHub tab state
  const [ghSeniority, setGhSeniority] = useState("mid");
  const [ghLocation, setGhLocation] = useState("");
  const [ghCountry, setGhCountry] = useState("UK");
  const [ghRemote, setGhRemote] = useState(false);
  const [ghResultCount, setGhResultCount] = useState(10);
  const [ghLangs, setGhLangs] = useState("");
  const [ghCompanyName, setGhCompanyName] = useState("");
  const [ghSearching, setGhSearching] = useState(false);
  const [ghResults, setGhResults] = useState<GitHubCandidate[]>([]);
  const [ghMeta, setGhMeta] = useState<any>(null);
  const [ghError, setGhError] = useState<string | null>(null);

  // Rate limit state
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number; reset: string } | null>(null);
  const [rateLimitLoading, setRateLimitLoading] = useState(false);

  // Outreach email state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<GitHubCandidate | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("roles").select("*");
      if (data) {
        setRoles(
          data.map((r: any) => ({
            id: r.id,
            job_title: r.job_title,
            required_skills: Array.isArray(r.required_skills) ? r.required_skills : [],
            description: r.description || "",
          }))
        );
      }
      setRolesLoading(false);
    })();
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // ── Pool handlers ──

  const handleAddCandidate = async () => {
    if (!formName.trim()) return;
    setEnriching(true);
    try {
      const skills = formSkills.split(",").map((s) => s.trim()).filter(Boolean);
      const experience = formExperience
        .split("\n").filter(Boolean)
        .map((line) => {
          const match = line.match(/^(.+?)\s+at\s+(.+?)(?:\s*\((.+?)\))?$/i);
          if (match) return { title: match[1].trim(), company: match[2].trim(), duration: match[3]?.trim() || "", description: "" };
          return { title: line.trim(), company: "", duration: "", description: "" };
        });

      const { data, error } = await supabase.functions.invoke("enrich-linkedin-profile", {
        body: { name: formName.trim(), headline: formHeadline.trim() || null, location: formLocation.trim() || null, skills, experience, linkedin_url: formLinkedinUrl.trim() || null },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to add candidate.");
      toast({ title: data.already_exists ? "Candidate already exists" : "Candidate added", description: `${data.candidate.name} has been added.` });
      setFormName(""); setFormHeadline(""); setFormLocation(""); setFormSkills(""); setFormLinkedinUrl(""); setFormExperience("");
      setAddFormOpen(false);
      if (selectedRoleId) handleFindCandidates();
    } catch (err: any) {
      toast({ title: "Failed to add candidate", description: err.message, variant: "destructive" });
    } finally { setEnriching(false); }
  };

  const handleFindCandidates = async () => {
    if (!selectedRoleId || !selectedRole) { toast({ title: "Select a role", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("external_candidates").select("*");
      if (error) throw error;
      const filters = { seniority, location: locationFilter, skills: skillsFilter ? skillsFilter.split(",").map((s) => s.trim()).filter(Boolean) : [] };
      const scored: ScoredCandidate[] = ((data as any[]) || [])
        .map((c) => ({ ...c, skills: Array.isArray(c.skills) ? c.skills : [], experience: Array.isArray(c.experience) ? c.experience : [], relevance_score: scoreCandidate({ ...c, skills: Array.isArray(c.skills) ? c.skills : [], experience: Array.isArray(c.experience) ? c.experience : [] }, selectedRole, filters) }))
        .sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 20);
      setCandidates(scored);
      await supabase.from("candidate_recommendations").insert({ job_role: selectedRole.job_title, filters, results: scored.map((c) => ({ id: c.id, name: c.name, score: c.relevance_score })) });
    } catch (err: any) { toast({ title: "Search failed", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleImport = async (candidate: ScoredCandidate) => {
    setImportingId(candidate.id);
    try {
      const { data: existing } = await supabase.from("candidates").select("id").eq("candidate_name", candidate.name).limit(1);
      if (existing && existing.length > 0) { toast({ title: "Already imported", description: `${candidate.name} is already in your candidates.` }); setImportingId(null); return; }
      const { error } = await supabase.from("candidates").insert({ candidate_name: candidate.name, cv_text: `Imported from LinkedIn.\nHeadline: ${candidate.headline || "N/A"}\nLocation: ${candidate.location || "N/A"}\nSkills: ${(candidate.skills || []).join(", ")}\n\nExperience:\n${(candidate.experience || []).map((e) => `- ${e.title} at ${e.company} (${e.duration})`).join("\n")}`, analysis_json: { candidate_name: candidate.name, summary: `LinkedIn-sourced candidate. ${candidate.headline || ""}`, source: "linkedin_recommendation" }, overall_score: candidate.relevance_score, recommendation: candidate.relevance_score >= 70 ? "yes" : candidate.relevance_score >= 40 ? "maybe" : "no", status: "pending", email: null });
      if (error) throw error;
      toast({ title: "Candidate imported", description: `${candidate.name} added to your pipeline.` });
    } catch (err: any) { toast({ title: "Import failed", description: err.message, variant: "destructive" }); }
    finally { setImportingId(null); }
  };

  // ── GitHub search handler ──

  const handleGitHubSearch = async () => {
    if (!selectedRole) { toast({ title: "Select a role first", variant: "destructive" }); return; }
    setGhSearching(true);
    setGhResults([]);
    setGhMeta(null);
    setGhError(null);

    try {
      const requiredLangs = ghLangs ? ghLangs.split(",").map((s) => s.trim()).filter(Boolean) : [];
      // Try to infer languages from role skills if none provided
      if (requiredLangs.length === 0) {
        const commonLangs = ["python", "javascript", "typescript", "java", "go", "rust", "c++", "c#", "ruby", "kotlin", "swift", "scala"];
        for (const skill of selectedRole.required_skills) {
          const lower = skill.toLowerCase();
          for (const lang of commonLangs) {
            if (lower.includes(lang) && !requiredLangs.includes(lang)) {
              requiredLangs.push(lang);
            }
          }
        }
        if (requiredLangs.length === 0) requiredLangs.push("python");
      }

      const { data, error } = await supabase.functions.invoke("github-recommend", {
        body: {
          required_languages: requiredLangs,
          seniority_level: ghSeniority,
          preferred_location: {
            city: ghLocation || undefined,
            country: ghCountry || "UK",
            remote_allowed: ghRemote,
          },
          result_count: ghResultCount,
          role_title: selectedRole.job_title,
          role_description: selectedRole.description,
          required_skills: selectedRole.required_skills,
          company_name: ghCompanyName || "Our Company",
        },
      });

      if (error) throw new Error(error.message);
      const result = data as GitHubSearchResult;

      if (result.error) {
        setGhError(result.action_required || result.error);
        return;
      }

      if (result.github_recommendations) {
        setGhResults(result.github_recommendations.recommended_candidates);
        setGhMeta(result.github_recommendations);
      }
    } catch (err: any) {
      toast({ title: "GitHub search failed", description: err.message, variant: "destructive" });
      setGhError(err.message);
    } finally {
      setGhSearching(false);
    }
  };

  // ── Outreach email ──

  const handleOpenOutreach = (candidate: GitHubCandidate) => {
    if (!selectedRole) return;
    const standoutSignal = candidate.standout_signals[0]
      || (candidate.pinned_repos[0]
        ? `your work on ${candidate.pinned_repos[0].repo_name}${candidate.pinned_repos[0].description ? `, particularly "${candidate.pinned_repos[0].description}"` : ""}`
        : "your impressive GitHub portfolio");

    const template = getOutreachEmailTemplate({
      display_name: candidate.display_name || candidate.username,
      recruiter_name: "Recruitment Team",
      company_name: ghCompanyName || "Our Company",
      recruiter_email: "",
      role_title: selectedRole.job_title,
      top_languages: candidate.top_languages,
      standout_signal: standoutSignal,
      location_city: ghLocation || undefined,
    });

    setEmailCandidate(candidate);
    setEmailSubject(template.subject);
    setEmailBody(template.body);
    setEmailModalOpen(true);
  };

  const handleSendOutreach = async (subject: string, body: string, edited: boolean, editSummary: string | null) => {
    if (!emailCandidate) return;

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        candidate_id: null,
        candidate_email: emailCandidate.email,
        subject,
        email_body: body,
        status_attempted: "github_outreach",
        previous_status: null,
        edited_before_send: edited,
        edit_summary: editSummary,
        action: "send",
      },
    });

    if (error) throw new Error(error.message);
    if (!data?.email_sent) throw new Error(data?.error || "Failed to send");

    // Update local state
    setGhResults((prev) =>
      prev.map((c) =>
        c.username === emailCandidate.username
          ? { ...c, outreach_status: "email_sent" }
          : c
      )
    );
    setEmailModalOpen(false);
    toast({ title: "Outreach email sent", description: `Email sent to ${emailCandidate.display_name || emailCandidate.username}.` });
  };

  const handleCancelOutreach = () => {
    setEmailModalOpen(false);
    setEmailCandidate(null);
  };

  // ── Rate limit check ──

  const handleCheckRateLimit = async () => {
    setRateLimitLoading(true);
    try {
      const res = await fetch("https://api.github.com/rate_limit", {
        headers: { Accept: "application/vnd.github+json" },
      });
      const data = await res.json();
      const core = data.resources?.core;
      if (core) {
        const resetDate = new Date(core.reset * 1000);
        setRateLimit({
          remaining: core.remaining,
          limit: core.limit,
          reset: resetDate.toLocaleTimeString(),
        });
      }
    } catch {
      toast({ title: "Failed to check rate limit", variant: "destructive" });
    } finally {
      setRateLimitLoading(false);
    }
  };

  // ── Render ──

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Candidate Discovery</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search your talent pool or find passive candidates on GitHub.
          </p>
        </div>

        {/* Compliance Notice */}
        <div className="border-2 border-border bg-secondary/50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-score-yellow shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Data Compliance:</span> Ensure candidate data is collected with consent and in compliance with applicable data protection regulations (GDPR, etc.). GitHub data used is publicly available.
          </div>
        </div>

        {/* Shared Role Selector */}
        <div className="border-2 border-border bg-card p-4 shadow-xs">
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Job Role *</label>
          {rolesLoading ? (
            <div className="h-10 bg-muted animate-pulse" />
          ) : (
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="w-full h-10 border-2 border-input bg-background px-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.job_title}</option>
              ))}
            </select>
          )}
        </div>

        <Tabs defaultValue="github" className="space-y-4">
          <TabsList className="w-auto">
            <TabsTrigger value="github" className="gap-2">
              <Github className="h-4 w-4" />
              Find Talent Pool on GitHub
            </TabsTrigger>
          </TabsList>

          {/* ═══════ GITHUB TAB ═══════ */}
          <TabsContent value="github" className="space-y-4">
            <div className="border-2 border-border bg-card p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub Candidate Search
              </h2>
              <p className="text-xs text-muted-foreground">
                Search GitHub's public developer base to surface passive candidates matching this role.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Languages (comma-sep, or auto-detect)</label>
                  <Input placeholder="e.g. Python, Go" value={ghLangs} onChange={(e) => setGhLangs(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Seniority Level</label>
                  <select value={ghSeniority} onChange={(e) => setGhSeniority(e.target.value)} className="w-full h-10 border-2 border-input bg-background px-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">City (optional)</label>
                  <Input placeholder="e.g. London" value={ghLocation} onChange={(e) => setGhLocation(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Country</label>
                  <Input placeholder="e.g. UK" value={ghCountry} onChange={(e) => setGhCountry(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Result Count</label>
                  <Input type="number" min={1} max={20} value={ghResultCount} onChange={(e) => setGhResultCount(parseInt(e.target.value) || 10)} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={ghRemote} onCheckedChange={setGhRemote} id="remote-switch" className="shadow-none" />
                <label htmlFor="remote-switch" className="text-xs text-muted-foreground cursor-pointer">Include remote candidates (no location filter)</label>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={handleGitHubSearch} disabled={ghSearching || !selectedRoleId} className="gap-2">
                  {ghSearching ? <WavesLoader size="sm" /> : <><Github className="h-4 w-4" /> Find Candidates on GitHub</>}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCheckRateLimit} disabled={rateLimitLoading} className="gap-1.5 text-xs">
                  {rateLimitLoading ? "Checking..." : "Check API Quota"}
                </Button>
                {rateLimit && (
                  <span className="text-xs text-muted-foreground">
                    {rateLimit.remaining}/{rateLimit.limit} calls remaining · Resets at {rateLimit.reset}
                  </span>
                )}
              </div>
            </div>

            {/* GitHub Results */}
            {ghSearching && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <WavesLoader size="md" />
                <p className="text-sm text-muted-foreground">Searching GitHub and scoring profiles...</p>
              </div>
            )}

            {ghError && (
              <div className="border-2 border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Search returned no results
                </div>
                <p className="text-xs text-muted-foreground">{ghError}</p>
              </div>
            )}

            {ghMeta && ghResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {ghResults.length} candidate{ghResults.length !== 1 ? "s" : ""} found
                  </h2>
                  <div className="text-xs text-muted-foreground space-x-3">
                    <span>Scanned: {ghMeta.total_profiles_scanned}</span>
                    <span>Passed location: {ghMeta.total_passed_location_filter}</span>
                    <span>Above threshold: {ghMeta.total_passed_score_threshold}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {ghResults.map((c) => (
                    <GitHubCandidateCard
                      key={c.username}
                      candidate={c}
                      onOutreach={() => handleOpenOutreach(c)}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Outreach Email Preview Modal */}
      {emailCandidate && (
        <EmailPreviewModal
          open={emailModalOpen}
          candidateEmail={emailCandidate.email || ""}
          recruiterName="Recruitment Team"
          recruiterEmail=""
          templateSubject={emailSubject}
          templateBody={emailBody}
          onSend={handleSendOutreach}
          onCancel={handleCancelOutreach}
        />
      )}
    </div>
  );
}

// ── GitHub Candidate Card ──

function GitHubCandidateCard({
  candidate: c,
  onOutreach,
}: {
  candidate: GitHubCandidate;
  onOutreach: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-2 border-border bg-card shadow-xs overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <img
            src={c.avatar_url}
            alt={c.display_name || c.username}
            className="h-12 w-12 rounded-full border-2 border-border shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{c.display_name || c.username}</h3>
              <Badge className={`${getScoreBandColor(c.score_band)} shrink-0 text-xs font-mono`}>
                {c.recommendation_score}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">@{c.username}</p>
            {c.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.bio}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {c.location_listed && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {c.location_listed}
              {c.location_flag === "unverified" && (
                <Badge variant="outline" className="text-[9px] ml-1 py-0 px-1">unverified</Badge>
              )}
            </span>
          )}
          {c.company && (
            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{c.company}</span>
          )}
          <span>{c.public_repos} repos</span>
          <span>{c.followers.toLocaleString()} followers</span>
          <span>{c.account_age_years}y on GitHub</span>
        </div>

        {/* Languages */}
        <div className="flex flex-wrap gap-1">
          {c.top_languages.map((lang) => (
            <Badge key={lang} variant="secondary" className="text-[10px]">{lang}</Badge>
          ))}
        </div>

        {/* Match Summary */}
        <p className="text-xs text-foreground bg-secondary/50 p-2 border border-border">{c.match_summary}</p>

        {/* Standout Signals */}
        {c.standout_signals.length > 0 && (
          <div className="space-y-1">
            {c.standout_signals.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 shrink-0 text-score-yellow mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Repos (expandable) */}
        {c.pinned_repos.length > 0 && (
          <div>
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide" : "Show"} top repos ({c.pinned_repos.length})
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {c.pinned_repos.map((r) => (
                  <a
                    key={r.repo_name}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs p-2 border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{r.repo_name}</span>
                      {r.description && <span className="text-muted-foreground ml-1 truncate">- {r.description}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className="text-[9px] py-0">{r.primary_language}</Badge>
                      {r.stars > 0 && <span className="flex items-center gap-0.5 text-muted-foreground"><Star className="h-3 w-3" />{r.stars}</span>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {c.email ? (
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={onOutreach}
              disabled={c.outreach_status === "email_sent"}
            >
              {c.outreach_status === "email_sent" ? (
                <><Mail className="h-3 w-3" /> Email Sent</>
              ) : (
                <><Send className="h-3 w-3" /> Send Outreach Email</>
              )}
            </Button>
          ) : (
            <a
              href={c.github_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              title="This user has not listed a public email. You can reach out via GitHub directly."
            >
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                <Github className="h-3 w-3" /> Contact via GitHub
              </Button>
            </a>
          )}
          <a href={c.github_profile_url} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5">
              <ExternalLink className="h-3 w-3" /> View Profile
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
