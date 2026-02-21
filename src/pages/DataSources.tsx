import { useState, useEffect, useCallback } from "react";
import { Upload, FileText, Github, Globe, History, ArrowRight, AlertTriangle, ExternalLink, Trash2, CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import WavesLoader from "@/components/WavesLoader";
import { Link, useNavigate } from "react-router-dom";

type TabId = "upload" | "github" | "website" | "history";

interface ImportRecord {
  id: string;
  type: string;
  input: any;
  external_profile_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

// Client-side text extraction
async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    return pages.join("\n\n").replace(/\s+/g, " ").trim();
  }

  if (file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.replace(/\s+/g, " ").trim();
  }

  // Plain text
  return await file.text();
}

export default function DataSources() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("upload");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Paste state
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");

  // GitHub state
  const [githubInput, setGithubInput] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);

  // Website state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteLoading, setWebsiteLoading] = useState(false);

  // History state
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setImports(data as any[]);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab, loadHistory]);

  // ── Upload CV ──
  const handleUploadCV = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const text = await extractTextFromFile(selectedFile);
      if (text.length < 20) throw new Error("Could not extract meaningful text from file.");

      // Upload file to storage
      const filePath = `uploads/${Date.now()}_${selectedFile.name}`;
      await supabase.storage.from("cv_uploads").upload(filePath, selectedFile);

      const { data, error } = await supabase.functions.invoke("import-profile", {
        body: { action: "cv_upload", raw_text: text, file_path: filePath },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Candidate added to pipeline",
        description: `${data.profile?.full_name || "Candidate"} imported successfully.`,
        action: data.candidate?.id ? (
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/candidates/${data.candidate.id}`)}>
            <Users className="h-3 w-3" /> View Candidate
          </Button>
        ) : undefined,
      });
      setSelectedFile(null);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Paste CV ──
  const handlePasteCV = async () => {
    if (pastedText.length < 20) return;
    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-profile", {
        body: { action: "cv_paste", raw_text: pastedText },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Candidate added to pipeline",
        description: `${data.profile?.full_name || "Candidate"} imported successfully.`,
        action: data.candidate?.id ? (
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/candidates/${data.candidate.id}`)}>
            <Users className="h-3 w-3" /> View Candidate
          </Button>
        ) : undefined,
      });
      setPastedText("");
      setPasteMode(false);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── GitHub ──
  const handleGithubImport = async () => {
    if (!githubInput.trim()) return;
    setGithubLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-profile", {
        body: { action: "github", github_username: githubInput.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Candidate added to pipeline",
        description: `${data.profile?.full_name || "Candidate"} imported from GitHub.`,
        action: data.candidate?.id ? (
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/candidates/${data.candidate.id}`)}>
            <Users className="h-3 w-3" /> View Candidate
          </Button>
        ) : undefined,
      });
      setGithubInput("");
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setGithubLoading(false);
    }
  };

  // ── Website ──
  const handleWebsiteImport = async () => {
    if (!websiteUrl.trim()) return;
    setWebsiteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-profile", {
        body: { action: "website", website_url: websiteUrl.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Candidate added to pipeline",
        description: `${data.profile?.full_name || "Candidate"} imported from website.`,
        action: data.candidate?.id ? (
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/candidates/${data.candidate.id}`)}>
            <Users className="h-3 w-3" /> View Candidate
          </Button>
        ) : undefined,
      });
      setWebsiteUrl("");
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setWebsiteLoading(false);
    }
  };

  // ── Delete import ──
  const handleDeleteImport = async (imp: ImportRecord) => {
    try {
      if (imp.external_profile_id) {
        await supabase.from("external_profiles").delete().eq("id", imp.external_profile_id as any);
      }
      await supabase.from("imports").delete().eq("id", imp.id as any);
      setImports((prev) => prev.filter((i) => i.id !== imp.id));
      toast({ title: "Import deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "upload", label: "Upload CV", icon: <Upload className="h-4 w-4" /> },
    { id: "github", label: "GitHub", icon: <Github className="h-4 w-4" /> },
    { id: "website", label: "Website", icon: <Globe className="h-4 w-4" /> },
    { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  ];

  const statusIcon = (s: string) => {
    if (s === "ready") return <CheckCircle2 className="h-3.5 w-3.5 text-score-green" />;
    if (s === "error") return <XCircle className="h-3.5 w-3.5 text-score-red" />;
    return <Clock className="h-3.5 w-3.5 text-score-yellow" />;
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { cv_upload: "CV Upload", cv_paste: "CV Paste", github: "GitHub", website: "Website" };
    return map[t] || t;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Data Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import candidate profiles from CVs, GitHub, or personal websites.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-2 border-border p-1 bg-secondary/30">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-colors ${
                activeTab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Upload CV Tab ── */}
        {activeTab === "upload" && (
          <div className="space-y-4">
            {!pasteMode ? (
              <div className="border-2 border-border bg-card p-6 shadow-xs space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) setSelectedFile(f);
                  }}
                  className={`border-2 border-dashed p-12 text-center transition-colors ${
                    dragOver ? "border-primary bg-accent/50" : "border-border"
                  }`}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedFile ? selectedFile.name : "Drag & drop a CV file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">PDF, DOCX, or TXT — max 10MB</p>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Browse Files</span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
                    />
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 border-2 border-border bg-secondary/30">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-muted-foreground">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <Button onClick={handleUploadCV} disabled={uploading} className="gap-2">
                      {uploading ? <WavesLoader size="sm" /> : <><ArrowRight className="h-4 w-4" /> Import</>}
                    </Button>
                  </div>
                )}

                <button
                  onClick={() => setPasteMode(true)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Or paste CV text instead →
                </button>
              </div>
            ) : (
              <div className="border-2 border-border bg-card p-6 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold">Paste CV Text</h2>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the full CV / resume text here..."
                  rows={12}
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setPasteMode(false); setPastedText(""); }}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    ← Back to file upload
                  </button>
                  <Button onClick={handlePasteCV} disabled={uploading || pastedText.length < 20} className="gap-2">
                    {uploading ? <WavesLoader size="sm" /> : <><ArrowRight className="h-4 w-4" /> Import</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GitHub Tab ── */}
        {activeTab === "github" && (
          <div className="border-2 border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Github className="h-4 w-4" /> Import from GitHub
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter a GitHub username or profile URL. We'll fetch their public profile, repositories, and languages.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="username or https://github.com/username"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleGithubImport} disabled={githubLoading || !githubInput.trim()} className="gap-2">
                {githubLoading ? <WavesLoader size="sm" /> : <><ArrowRight className="h-4 w-4" /> Import</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── Website Tab ── */}
        {activeTab === "website" && (
          <div className="border-2 border-border bg-card p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" /> Import from Website
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter a personal portfolio or website URL. Content will be fetched and parsed into a candidate profile.
            </p>
            <div className="border-2 border-border bg-secondary/50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-score-yellow shrink-0 mt-0.5" />
              <span className="text-xs text-muted-foreground">
                LinkedIn URLs are not supported. Use CV upload, GitHub, or personal websites.
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="https://johndoe.dev"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleWebsiteImport} disabled={websiteLoading || !websiteUrl.trim()} className="gap-2">
                {websiteLoading ? <WavesLoader size="sm" /> : <><ArrowRight className="h-4 w-4" /> Import</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          <div className="border-2 border-border bg-card shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" /> Import History
              </h2>
              <Button variant="ghost" size="sm" onClick={loadHistory} className="text-xs h-7">
                Refresh
              </Button>
            </div>
            {historyLoading ? (
              <div className="flex justify-center py-12"><WavesLoader size="md" /></div>
            ) : imports.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No imports yet. Start by uploading a CV, importing a GitHub profile, or fetching a website.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {imports.map((imp) => (
                  <div key={imp.id} className="p-3 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                    {statusIcon(imp.status)}
                    <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                      {typeLabel(imp.type)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(imp.created_at).toLocaleString()}
                      </span>
                      {imp.error_message && (
                        <p className="text-xs text-score-red truncate mt-0.5">{imp.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {imp.external_profile_id && (
                        <Link to={`/external-profiles/${imp.external_profile_id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <ExternalLink className="h-3 w-3" /> View
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteImport(imp)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
