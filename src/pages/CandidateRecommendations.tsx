import { useState } from "react";
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
import Navbar from "@/components/Navbar";
import WavesLoader from "@/components/WavesLoader";
import EmailPreviewModal from "@/components/EmailPreviewModal";
import { useDiscover, type GitHubCandidate } from "@/contexts/DiscoverContext";

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

// ── Component ──

export default function CandidateRecommendations() {
  const d = useDiscover();

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
          {d.rolesLoading ? (
            <div className="h-10 bg-muted animate-pulse" />
          ) : (
            <select
              value={d.selectedRoleId}
              onChange={(e) => d.setSelectedRoleId(e.target.value)}
              className="w-full h-10 border-2 border-input bg-background px-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a role...</option>
              {d.roles.map((r) => (
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
                  <Input placeholder="e.g. Python, Go" value={d.ghLangs} onChange={(e) => d.setGhLangs(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Seniority Level</label>
                  <select value={d.ghSeniority} onChange={(e) => d.setGhSeniority(e.target.value)} className="w-full h-10 border-2 border-input bg-background px-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">City (optional)</label>
                  <Input placeholder="e.g. London" value={d.ghLocation} onChange={(e) => d.setGhLocation(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Country</label>
                  <Input placeholder="e.g. UK" value={d.ghCountry} onChange={(e) => d.setGhCountry(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Result Count</label>
                  <Input type="number" min={1} max={20} value={d.ghResultCount} onChange={(e) => d.setGhResultCount(parseInt(e.target.value) || 10)} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={d.ghRemote} onCheckedChange={d.setGhRemote} id="remote-switch" className="shadow-none" />
                <label htmlFor="remote-switch" className="text-xs text-muted-foreground cursor-pointer">Include remote candidates (no location filter)</label>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={d.handleGitHubSearch} disabled={d.ghSearching || !d.selectedRoleId} className="gap-2">
                  {d.ghSearching ? <WavesLoader size="sm" /> : <><Github className="h-4 w-4" /> Find Candidates on GitHub</>}
                </Button>
                <Button variant="outline" size="sm" onClick={d.handleCheckRateLimit} disabled={d.rateLimitLoading} className="gap-1.5 text-xs">
                  {d.rateLimitLoading ? "Checking..." : "Check API Quota"}
                </Button>
                {d.rateLimit && (
                  <span className="text-xs text-muted-foreground">
                    {d.rateLimit.remaining}/{d.rateLimit.limit} calls remaining · Resets at {d.rateLimit.reset}
                  </span>
                )}
              </div>
            </div>

            {/* GitHub Results */}
            {d.ghSearching && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <WavesLoader size="md" />
                <p className="text-sm text-muted-foreground">Searching GitHub and scoring profiles...</p>
              </div>
            )}

            {d.ghError && (
              <div className="border-2 border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Search returned no results
                </div>
                <p className="text-xs text-muted-foreground">{d.ghError}</p>
              </div>
            )}

            {d.ghMeta && d.ghResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {d.ghResults.length} candidate{d.ghResults.length !== 1 ? "s" : ""} found
                  </h2>
                  <div className="text-xs text-muted-foreground space-x-3">
                    <span>Scanned: {d.ghMeta.total_profiles_scanned}</span>
                    <span>Passed location: {d.ghMeta.total_passed_location_filter}</span>
                    <span>Above threshold: {d.ghMeta.total_passed_score_threshold}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {d.ghResults.map((c) => (
                    <GitHubCandidateCard
                      key={c.username}
                      candidate={c}
                      onOutreach={() => d.handleOpenOutreach(c)}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Outreach Email Preview Modal */}
      {d.emailCandidate && (
        <EmailPreviewModal
          open={d.emailModalOpen}
          candidateEmail={d.emailCandidate.email || ""}
          recruiterName="Recruitment Team"
          recruiterEmail=""
          templateSubject={d.emailSubject}
          templateBody={d.emailBody}
          onSend={d.handleSendOutreach}
          onCancel={d.handleCancelOutreach}
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
