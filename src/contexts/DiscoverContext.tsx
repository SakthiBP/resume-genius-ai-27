import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getOutreachEmailTemplate } from "@/lib/emailTemplates";

/* ── Types ── */

export interface ExternalCandidate {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  skills: string[];
  experience: { title: string; company: string; duration: string; description: string }[];
  linkedin_url: string | null;
  created_at: string;
}

export interface ScoredCandidate extends ExternalCandidate {
  relevance_score: number;
}

export interface Role {
  id: string;
  job_title: string;
  required_skills: string[];
  description: string;
}

export interface GitHubCandidate {
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

/* ── Scoring ── */

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

/* ── Context value ── */

interface DiscoverContextValue {
  // Roles
  roles: Role[];
  rolesLoading: boolean;
  selectedRoleId: string;
  setSelectedRoleId: (id: string) => void;
  selectedRole: Role | undefined;

  // Pool tab
  seniority: string; setSeniority: (v: string) => void;
  locationFilter: string; setLocationFilter: (v: string) => void;
  skillsFilter: string; setSkillsFilter: (v: string) => void;
  addFormOpen: boolean; setAddFormOpen: (v: boolean) => void;
  formName: string; setFormName: (v: string) => void;
  formHeadline: string; setFormHeadline: (v: string) => void;
  formLocation: string; setFormLocation: (v: string) => void;
  formSkills: string; setFormSkills: (v: string) => void;
  formLinkedinUrl: string; setFormLinkedinUrl: (v: string) => void;
  formExperience: string; setFormExperience: (v: string) => void;
  candidates: ScoredCandidate[];
  loading: boolean;
  enriching: boolean;
  importingId: string | null;
  handleAddCandidate: () => Promise<void>;
  handleFindCandidates: () => Promise<void>;
  handleImport: (candidate: ScoredCandidate) => Promise<void>;

  // GitHub tab
  ghSeniority: string; setGhSeniority: (v: string) => void;
  ghLocation: string; setGhLocation: (v: string) => void;
  ghCountry: string; setGhCountry: (v: string) => void;
  ghRemote: boolean; setGhRemote: (v: boolean) => void;
  ghResultCount: number; setGhResultCount: (v: number) => void;
  ghLangs: string; setGhLangs: (v: string) => void;
  ghCompanyName: string; setGhCompanyName: (v: string) => void;
  ghSearching: boolean;
  ghResults: GitHubCandidate[];
  setGhResults: React.Dispatch<React.SetStateAction<GitHubCandidate[]>>;
  ghMeta: any;
  ghError: string | null;
  handleGitHubSearch: () => Promise<void>;

  // Rate limit
  rateLimit: { remaining: number; limit: number; reset: string } | null;
  rateLimitLoading: boolean;
  handleCheckRateLimit: () => Promise<void>;

  // Outreach
  emailModalOpen: boolean; setEmailModalOpen: (v: boolean) => void;
  emailCandidate: GitHubCandidate | null;
  emailSubject: string;
  emailBody: string;
  handleOpenOutreach: (candidate: GitHubCandidate) => void;
  handleSendOutreach: (subject: string, body: string, edited: boolean, editSummary: string | null) => Promise<void>;
  handleCancelOutreach: () => void;
}

const DiscoverContext = createContext<DiscoverContextValue | null>(null);

export function useDiscover() {
  const ctx = useContext(DiscoverContext);
  if (!ctx) throw new Error("useDiscover must be used within DiscoverProvider");
  return ctx;
}

export function DiscoverProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  // Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  // Pool tab
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

  // GitHub tab
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

  // Rate limit
  const [rateLimit, setRateLimit] = useState<{ remaining: number; limit: number; reset: string } | null>(null);
  const [rateLimitLoading, setRateLimitLoading] = useState(false);

  // Outreach
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<GitHubCandidate | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  // Load roles once
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

  // ── Pool handlers ──

  const handleAddCandidate = useCallback(async () => {
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
  }, [formName, formHeadline, formLocation, formSkills, formLinkedinUrl, formExperience, selectedRoleId]);

  const handleFindCandidates = useCallback(async () => {
    if (!selectedRoleId || !selectedRole) { toast({ title: "Select a role", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("external_candidates").select("*");
      if (error) throw error;
      const filters = { seniority, location: locationFilter, skills: skillsFilter ? skillsFilter.split(",").map((s) => s.trim()).filter(Boolean) : [] };
      const scored: ScoredCandidate[] = ((data as any[]) || [])
        .map((c) => ({ ...c, skills: Array.isArray(c.skills) ? c.skills : [], experience: Array.isArray(c.experience) ? c.experience : [], relevance_score: scoreCandidate({ ...c, skills: Array.isArray(c.skills) ? c.skills : [], experience: Array.isArray(c.experience) ? c.experience : [] }, selectedRole!, filters) }))
        .sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 20);
      setCandidates(scored);
      await supabase.from("candidate_recommendations").insert({ job_role: selectedRole!.job_title, filters, results: scored.map((c) => ({ id: c.id, name: c.name, score: c.relevance_score })) });
    } catch (err: any) { toast({ title: "Search failed", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  }, [selectedRoleId, selectedRole, seniority, locationFilter, skillsFilter]);

  const handleImport = useCallback(async (candidate: ScoredCandidate) => {
    setImportingId(candidate.id);
    try {
      const { data: existing } = await supabase.from("candidates").select("id").eq("candidate_name", candidate.name).limit(1);
      if (existing && existing.length > 0) { toast({ title: "Already imported", description: `${candidate.name} is already in your candidates.` }); setImportingId(null); return; }
      const { error } = await supabase.from("candidates").insert({ candidate_name: candidate.name, cv_text: `Imported from LinkedIn.\nHeadline: ${candidate.headline || "N/A"}\nLocation: ${candidate.location || "N/A"}\nSkills: ${(candidate.skills || []).join(", ")}\n\nExperience:\n${(candidate.experience || []).map((e) => `- ${e.title} at ${e.company} (${e.duration})`).join("\n")}`, analysis_json: { candidate_name: candidate.name, summary: `LinkedIn-sourced candidate. ${candidate.headline || ""}`, source: "linkedin_recommendation" }, overall_score: candidate.relevance_score, recommendation: candidate.relevance_score >= 70 ? "yes" : candidate.relevance_score >= 40 ? "maybe" : "no", status: "pending", email: null });
      if (error) throw error;
      toast({ title: "Candidate imported", description: `${candidate.name} added to your pipeline.` });
    } catch (err: any) { toast({ title: "Import failed", description: err.message, variant: "destructive" }); }
    finally { setImportingId(null); }
  }, []);

  // ── GitHub search ──

  const handleGitHubSearch = useCallback(async () => {
    if (!selectedRole) { toast({ title: "Select a role first", variant: "destructive" }); return; }

    // Cancel previous search
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGhSearching(true);
    setGhResults([]);
    setGhMeta(null);
    setGhError(null);

    try {
      const requiredLangs = ghLangs ? ghLangs.split(",").map((s) => s.trim()).filter(Boolean) : [];
      if (requiredLangs.length === 0) {
        const commonLangs = ["python", "javascript", "typescript", "java", "go", "rust", "c++", "c#", "ruby", "kotlin", "swift", "scala"];
        for (const skill of selectedRole.required_skills) {
          const lower = skill.toLowerCase();
          for (const lang of commonLangs) {
            if (lower.includes(lang) && !requiredLangs.includes(lang)) requiredLangs.push(lang);
          }
        }
        if (requiredLangs.length === 0) requiredLangs.push("python");
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-recommend`;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
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
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Search failed (${res.status})`);
      }

      const result = (await res.json()) as GitHubSearchResult;

      if (result.error) {
        setGhError(result.action_required || result.error);
        return;
      }

      if (result.github_recommendations) {
        setGhResults(result.github_recommendations.recommended_candidates);
        setGhMeta(result.github_recommendations);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      toast({ title: "GitHub search failed", description: err.message, variant: "destructive" });
      setGhError(err.message);
    } finally {
      if (!controller.signal.aborted) {
        setGhSearching(false);
        abortRef.current = null;
      }
    }
  }, [selectedRole, ghLangs, ghSeniority, ghLocation, ghCountry, ghRemote, ghResultCount, ghCompanyName]);

  // ── Outreach ──

  const handleOpenOutreach = useCallback((candidate: GitHubCandidate) => {
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
  }, [selectedRole, ghCompanyName, ghLocation]);

  const handleSendOutreach = useCallback(async (subject: string, body: string, edited: boolean, editSummary: string | null) => {
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

    setGhResults((prev) =>
      prev.map((c) =>
        c.username === emailCandidate.username ? { ...c, outreach_status: "email_sent" } : c
      )
    );
    setEmailModalOpen(false);
    toast({ title: "Outreach email sent", description: `Email sent to ${emailCandidate.display_name || emailCandidate.username}.` });
  }, [emailCandidate]);

  const handleCancelOutreach = useCallback(() => {
    setEmailModalOpen(false);
    setEmailCandidate(null);
  }, []);

  // ── Rate limit ──

  const handleCheckRateLimit = useCallback(async () => {
    setRateLimitLoading(true);
    try {
      const res = await fetch("https://api.github.com/rate_limit", {
        headers: { Accept: "application/vnd.github+json" },
      });
      const data = await res.json();
      const core = data.resources?.core;
      if (core) {
        const resetDate = new Date(core.reset * 1000);
        setRateLimit({ remaining: core.remaining, limit: core.limit, reset: resetDate.toLocaleTimeString() });
      }
    } catch {
      toast({ title: "Failed to check rate limit", variant: "destructive" });
    } finally { setRateLimitLoading(false); }
  }, []);

  return (
    <DiscoverContext.Provider value={{
      roles, rolesLoading, selectedRoleId, setSelectedRoleId, selectedRole,
      seniority, setSeniority, locationFilter, setLocationFilter, skillsFilter, setSkillsFilter,
      addFormOpen, setAddFormOpen, formName, setFormName, formHeadline, setFormHeadline,
      formLocation, setFormLocation, formSkills, setFormSkills, formLinkedinUrl, setFormLinkedinUrl,
      formExperience, setFormExperience, candidates, loading, enriching, importingId,
      handleAddCandidate, handleFindCandidates, handleImport,
      ghSeniority, setGhSeniority, ghLocation, setGhLocation, ghCountry, setGhCountry,
      ghRemote, setGhRemote, ghResultCount, setGhResultCount, ghLangs, setGhLangs,
      ghCompanyName, setGhCompanyName, ghSearching, ghResults, setGhResults, ghMeta, ghError,
      handleGitHubSearch,
      rateLimit, rateLimitLoading, handleCheckRateLimit,
      emailModalOpen, setEmailModalOpen, emailCandidate, emailSubject, emailBody,
      handleOpenOutreach, handleSendOutreach, handleCancelOutreach,
    }}>
      {children}
    </DiscoverContext.Provider>
  );
}
