import { useState, useEffect } from "react";
import { Search, MapPin, Briefcase, Award, UserPlus, Link as LinkIcon, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import WavesLoader from "@/components/WavesLoader";

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

// Simple skill-based scoring
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

  // Seniority match (20%)
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

  // Location match (10%)
  let locationScore = 5;
  if (filters.location && candidate.location) {
    if (candidate.location.toLowerCase().includes(filters.location.toLowerCase())) {
      locationScore = 10;
    }
  }

  // Experience keyword similarity (20%)
  const expText = (candidate.experience || []).map((e) => `${e.title} ${e.company} ${e.description}`).join(" ").toLowerCase();
  const roleDescWords = (role.description || "").toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const expMatches = roleDescWords.filter((w) => expText.includes(w));
  const expScore = roleDescWords.length > 0 ? (expMatches.length / roleDescWords.length) * 20 : 10;

  return Math.min(100, Math.round(skillScore + seniorityScore + locationScore + expScore));
}

export default function CandidateRecommendations() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [seniority, setSeniority] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [candidates, setCandidates] = useState<ScoredCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

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

  const handleEnrichProfile = async () => {
    if (!linkedinUrl.trim()) return;
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-linkedin-profile", {
        body: { linkedin_url: linkedinUrl.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to enrich profile.");

      toast({
        title: data.already_exists ? "Profile already exists" : "Profile enriched",
        description: `${data.candidate.name} has been added to the candidate pool.`,
      });

      setLinkedinUrl("");
      // If we have a role selected, re-run search
      if (selectedRoleId) handleFindCandidates();
    } catch (err: any) {
      toast({ title: "Enrichment failed", description: err.message, variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  };

  const handleFindCandidates = async () => {
    if (!selectedRoleId || !selectedRole) {
      toast({ title: "Select a role", description: "Please choose a job role first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("external_candidates").select("*");
      if (error) throw error;

      const filters = {
        seniority,
        location: locationFilter,
        skills: skillsFilter ? skillsFilter.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };

      const scored: ScoredCandidate[] = ((data as any[]) || [])
        .map((c) => ({
          ...c,
          skills: Array.isArray(c.skills) ? c.skills : [],
          experience: Array.isArray(c.experience) ? c.experience : [],
          relevance_score: scoreCandidate(
            { ...c, skills: Array.isArray(c.skills) ? c.skills : [], experience: Array.isArray(c.experience) ? c.experience : [] },
            selectedRole,
            filters
          ),
        }))
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 20);

      setCandidates(scored);

      // Store search session
      await supabase.from("candidate_recommendations").insert({
        job_role: selectedRole.job_title,
        filters,
        results: scored.map((c) => ({ id: c.id, name: c.name, score: c.relevance_score })),
      });
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (candidate: ScoredCandidate) => {
    setImportingId(candidate.id);
    try {
      // Check for duplicate
      // Check duplicate by LinkedIn name match (types not yet regenerated for new columns)
      const { data: existing } = await supabase
        .from("candidates")
        .select("id")
        .eq("candidate_name", candidate.name)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({ title: "Already imported", description: `${candidate.name} is already in your candidates.` });
        setImportingId(null);
        return;
      }

      const { error } = await supabase.from("candidates").insert({
        candidate_name: candidate.name,
        cv_text: `Imported from LinkedIn.\n\nHeadline: ${candidate.headline || "N/A"}\nLocation: ${candidate.location || "N/A"}\nSkills: ${(candidate.skills || []).join(", ")}\n\nExperience:\n${(candidate.experience || []).map((e) => `- ${e.title} at ${e.company} (${e.duration})`).join("\n")}`,
        analysis_json: {
          candidate_name: candidate.name,
          summary: `LinkedIn-sourced candidate. ${candidate.headline || ""}`,
          source: "linkedin_recommendation",
        },
        overall_score: candidate.relevance_score,
        recommendation: candidate.relevance_score >= 70 ? "yes" : candidate.relevance_score >= 40 ? "maybe" : "no",
        status: "pending",
        email: null,
      
      });

      if (error) throw error;

      toast({ title: "Candidate imported successfully", description: `${candidate.name} has been added to your candidates pipeline.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImportingId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "score-badge-green";
    if (score >= 50) return "score-badge-yellow";
    return "score-badge-red";
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Candidate Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover and import candidates by enriching LinkedIn profiles and matching them to your roles.
          </p>
        </div>

        {/* Compliance Notice */}
        <div className="border-2 border-border bg-secondary/50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-score-yellow shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Compliance Notice:</span> This feature uses publicly available profile data via authorised enrichment APIs. Ensure your usage complies with applicable data protection regulations (GDPR, etc.) and LinkedIn's Terms of Service.
          </div>
        </div>

        {/* Enrich Profile Section */}
        <div className="border-2 border-border bg-card p-5 space-y-3 shadow-xs">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Add LinkedIn Profile
          </h2>
          <p className="text-xs text-muted-foreground">
            Paste a LinkedIn profile URL to enrich and add to the candidate pool.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://linkedin.com/in/username"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleEnrichProfile} disabled={enriching || !linkedinUrl.trim()}>
              {enriching ? <WavesLoader size="sm" /> : <><ArrowRight className="h-4 w-4" /> Enrich</>}
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="border-2 border-border bg-card p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Matching Candidates
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Job Role *</label>
              {rolesLoading ? (
                <div className="h-10 bg-muted animate-pulse" />
              ) : (
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full h-10 border-2 border-input bg-background px-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a role…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.job_title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Seniority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Seniority</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full h-10 border-2 border-input bg-background px-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Any</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid-Level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Principal">Principal</option>
                <option value="Director">Director</option>
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Input
                placeholder="e.g. London"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>

            {/* Skills */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Skills (comma-separated)</label>
              <Input
                placeholder="e.g. React, Python"
                value={skillsFilter}
                onChange={(e) => setSkillsFilter(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleFindCandidates} disabled={loading || !selectedRoleId} className="gap-2">
            {loading ? <WavesLoader size="sm" /> : <><Search className="h-4 w-4" /> Find Candidates</>}
          </Button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16">
            <WavesLoader size="md" />
          </div>
        ) : candidates.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} found
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((c) => (
                <div key={c.id} className="border-2 border-border bg-card p-4 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                      {c.headline && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.headline}</p>
                      )}
                    </div>
                    <Badge className={`${getScoreColor(c.relevance_score)} shrink-0 text-xs font-mono`}>
                      {c.relevance_score}%
                    </Badge>
                  </div>

                  {c.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {c.location}
                    </div>
                  )}

                  {c.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.skills.slice(0, 6).map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] font-normal">
                          {s}
                        </Badge>
                      ))}
                      {c.skills.length > 6 && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          +{c.skills.length - 6}
                        </Badge>
                      )}
                    </div>
                  )}

                  {c.experience.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {c.experience.slice(0, 2).map((exp, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate">{exp.title} at {exp.company}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    {c.linkedin_url && (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                      >
                        View LinkedIn
                      </a>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 ml-auto"
                      onClick={() => handleImport(c)}
                      disabled={importingId === c.id}
                    >
                      {importingId === c.id ? (
                        <WavesLoader size="sm" />
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" />
                          Import Candidate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !loading && selectedRoleId ? (
          <div className="border-2 border-dashed border-border p-12 text-center space-y-2">
            <Award className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No candidates in the pool yet. Add LinkedIn profiles above to build your candidate pool, then search.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
