import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Mail, Phone, Github, Globe, Briefcase, GraduationCap, Code, FileText, Trash2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import WavesLoader from "@/components/WavesLoader";
import ConfirmationModal from "@/components/ConfirmationModal";

interface ExternalProfile {
  id: string;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  links: Record<string, string | null>;
  skills: string[];
  experience: { company: string; title: string; start: string; end: string; bullets: string[] }[];
  education: { institution: string; degree: string; field: string; year: string }[];
  projects: { name: string; description: string; url: string; technologies: string[] }[];
  source: string;
  source_url: string | null;
  raw_text: string | null;
  profile_summary: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default function ExternalProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ExternalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase.from("external_profiles").select("*").eq("id", id as any).single();
      if (data) setProfile(data as any);
      setLoading(false);
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      // Delete associated imports
      await supabase.from("imports").delete().eq("external_profile_id", id as any);
      // Delete profile
      await supabase.from("external_profiles").delete().eq("id", id as any);
      toast({ title: "Profile deleted" });
      navigate("/data-sources");
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const sourceLabel: Record<string, string> = {
    cv_upload: "CV Upload",
    cv_paste: "CV Paste",
    github: "GitHub",
    website: "Website",
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center"><WavesLoader size="lg" /></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Profile not found.</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile.full_name || "Unknown"}</h1>
            {profile.headline && <p className="text-sm text-muted-foreground mt-1">{profile.headline}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {profile.location && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location}</span>
              )}
              {profile.email && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{profile.email}</span>
              )}
              {profile.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profile.phone}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{sourceLabel[profile.source] || profile.source}</Badge>
            <Badge className={profile.status === "ready" ? "score-badge-green" : profile.status === "error" ? "score-badge-red" : "score-badge-yellow"}>
              {profile.status}
            </Badge>
          </div>
        </div>

        {profile.error_message && (
          <div className="border-2 border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {profile.error_message}
          </div>
        )}

        {/* Links */}
        {profile.links && Object.values(profile.links).some(Boolean) && (
          <div className="flex flex-wrap gap-2">
            {profile.links.github && (
              <a href={profile.links.github} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Github className="h-3 w-3" /> GitHub
                </Button>
              </a>
            )}
            {profile.links.website && (
              <a href={profile.links.website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Globe className="h-3 w-3" /> Website
                </Button>
              </a>
            )}
            {profile.source_url && (
              <a href={profile.source_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <ExternalLink className="h-3 w-3" /> Source
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Summary */}
        {profile.profile_summary && (
          <div className="border-2 border-border bg-card p-4 shadow-xs">
            <h2 className="text-xs font-semibold text-muted-foreground mb-2">SUMMARY</h2>
            <p className="text-sm">{profile.profile_summary}</p>
          </div>
        )}

        {/* Skills */}
        {profile.skills.length > 0 && (
          <div className="border-2 border-border bg-card p-4 shadow-xs">
            <h2 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5" /> SKILLS
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">{String(s)}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {profile.experience.length > 0 && (
          <div className="border-2 border-border bg-card p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> EXPERIENCE
            </h2>
            {profile.experience.map((exp, i) => (
              <div key={i} className="border-l-2 border-border pl-3">
                <p className="text-sm font-semibold">{exp.title}</p>
                <p className="text-xs text-muted-foreground">{exp.company} {exp.start || exp.end ? `· ${exp.start}–${exp.end || 'Present'}` : ''}</p>
                {exp.bullets?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.map((b, j) => (
                      <li key={j} className="text-xs text-muted-foreground">• {b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {profile.education.length > 0 && (
          <div className="border-2 border-border bg-card p-4 shadow-xs space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> EDUCATION
            </h2>
            {profile.education.map((edu, i) => (
              <div key={i}>
                <p className="text-sm font-semibold">{edu.institution}</p>
                <p className="text-xs text-muted-foreground">{edu.degree} {edu.field ? `in ${edu.field}` : ''} {edu.year ? `(${edu.year})` : ''}</p>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <div className="border-2 border-border bg-card p-4 shadow-xs space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5" /> PROJECTS
            </h2>
            {profile.projects.map((proj, i) => (
              <div key={i} className="border-l-2 border-border pl-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{proj.name}</p>
                  {proj.url && (
                    <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {proj.description && <p className="text-xs text-muted-foreground mt-0.5">{proj.description}</p>}
                {proj.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {proj.technologies.map((t, j) => (
                      <Badge key={j} variant="outline" className="text-[10px] font-normal">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Raw Text */}
        {profile.raw_text && (
          <div className="border-2 border-border bg-card shadow-xs">
            <button
              onClick={() => setRawExpanded(!rawExpanded)}
              className="w-full p-4 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:bg-accent/30 transition-colors"
            >
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> RAW EXTRACTED TEXT</span>
              {rawExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {rawExpanded && (
              <pre className="p-4 pt-0 text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-96 overflow-auto border-t border-border">
                {profile.raw_text}
              </pre>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted-foreground">
          Created {new Date(profile.created_at).toLocaleString()}
        </div>

        {/* Delete button */}
        <div className="flex justify-end pb-6">
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Profile
          </Button>
        </div>
      </div>

      <ConfirmationModal
        open={deleteOpen}
        title="Delete External Profile"
        description="This will permanently delete this profile and its import record. This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
