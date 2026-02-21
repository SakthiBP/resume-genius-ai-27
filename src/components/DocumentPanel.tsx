import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  RefreshCw,
  ChevronDown,
  Trash2,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import WavesLoader from "@/components/WavesLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FileUploadZone from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useStagingQueue, type StagedFile } from "@/contexts/StagingQueueContext";

interface SelectedRole {
  id: string;
  job_title: string;
  description: string;
  target_universities: { name: string; required_gpa: number }[];
  required_skills: string[];
}

interface DocumentPanelProps {
  file: File | null;
  extractedText: string;
  isExtracting: boolean;
  onFileChange: (file: File | null) => void;
  jobDescription: string;
  onJobDescriptionChange: (val: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  selectedRole: SelectedRole | null;
  onSelectedRoleChange: (role: SelectedRole | null) => void;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DocumentPanel = ({
  file,
  extractedText,
  isExtracting,
  onFileChange,
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
  selectedRole,
  onSelectedRoleChange,
}: DocumentPanelProps) => {
  const [roles, setRoles] = useState<SelectedRole[]>([]);
  const [roleError, setRoleError] = useState(false);
  const { files: queueFiles, addFiles, removeFiles } = useStagingQueue();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase
        .from("roles")
        .select("id, job_title, description, target_universities, required_skills")
        .order("job_title");
      if (data) {
        setRoles(
          data.map((r: any) => ({
            ...r,
            target_universities: Array.isArray(r.target_universities) ? r.target_universities : [],
            required_skills: Array.isArray(r.required_skills) ? r.required_skills : [],
          }))
        );
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) setRoleError(false);
  }, [selectedRole]);

  const handleAnalyze = () => {
    if (!selectedRole) {
      setRoleError(true);
      toast({
        variant: "destructive",
        title: "Job role required",
        description: "Please select a job role before analysing.",
      });
      return;
    }
    onAnalyze();
  };

  /* ── Queue helpers ─────────────────────────────────── */
  const handleDropFiles = (newFiles: File[]) => {
    addFiles(newFiles);
  };

  const pendingFiles = useMemo(
    () => queueFiles.filter((f) => f.status === "pending" || f.status === "uploading"),
    [queueFiles]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingOnly = queueFiles.filter((f) => f.status === "pending");
    if (selectedIds.size === pendingOnly.length && pendingOnly.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingOnly.map((f) => f.id)));
    }
  };

  const handleRemoveSelected = () => {
    removeFiles(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleAnalyzeFromQueue = (sf: StagedFile) => {
    if (!sf.file) {
      toast({ variant: "destructive", title: "File unavailable", description: "The original file data is no longer available." });
      return;
    }
    onFileChange(sf.file);
  };

  const wordCount = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;
  const pendingOnlyCount = queueFiles.filter((f) => f.status === "pending").length;

  /* ── Active file view (a file is loaded for analysis) ── */
  if (file) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="font-medium text-foreground">{file.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {selectedRole ? (
                    <button className="h-8 px-3 text-xs font-medium border border-border bg-secondary text-secondary-foreground flex items-center gap-1.5 hover:bg-accent hover:text-accent-foreground transition-colors duration-200 cursor-pointer max-w-[200px]">
                      <span className="truncate">{selectedRole.job_title}</span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`gap-1.5 text-xs h-8 ${roleError ? "border-destructive text-destructive" : ""}`}
                    >
                      Select Role
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-popover">
                  <DropdownMenuItem onClick={() => onSelectedRoleChange(null)}>
                    <span className="text-muted-foreground">No role (general evaluation)</span>
                  </DropdownMenuItem>
                  {roles.map((role) => (
                    <DropdownMenuItem key={role.id} onClick={() => onSelectedRoleChange(role)}>
                      {role.job_title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {roleError && (
                <span className="text-[10px] text-destructive mt-1">Please select a job role before analysing.</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isExtracting || !extractedText || !selectedRole}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <WavesLoader size="sm" className="text-primary-foreground" />
                  Analysing…
                </>
              ) : (
                "Analyse Resume"
              )}
            </Button>
            <button
              onClick={() => onFileChange(null)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors duration-200"
            >
              <RefreshCw className="h-3 w-3" /> Replace
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="max-w-2xl mx-auto bg-card border border-border p-10 md:p-14">
            {isExtracting ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-full" : "w-5/6"}`} />
                ))}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-[system-ui] tracking-wide">
                {extractedText || "No text could be extracted from this file."}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t border-border flex items-center justify-end text-xs text-muted-foreground">
          {isExtracting ? "Extracting text…" : `${wordCount} words`}
        </div>
      </div>
    );
  }

  /* ── Default view: dropzone + staging queue ─────────── */
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Multi-file Dropzone */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Upload Candidate CVs
          </h2>
          <FileUploadZone onFilesChange={handleDropFiles} />
        </div>

        {/* Upload Progress (files currently uploading) */}
        {queueFiles.some((f) => f.status === "uploading") && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Uploading…
            </h3>
            {queueFiles
              .filter((f) => f.status === "uploading")
              .map((f) => (
                <div key={f.id} className="border border-border bg-card px-4 py-3 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{f.fileName}</p>
                    <Progress value={f.progress} className="h-1 mt-1" />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                    {Math.round(f.progress)}%
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Staging Queue Table */}
        {queueFiles.filter((f) => f.status !== "uploading").length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Staging Queue
                {pendingOnlyCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 w-5 bg-foreground text-background text-[10px] font-bold">
                    {pendingOnlyCount}
                  </span>
                )}
              </h3>
            </div>

            <div className="border border-border bg-card">
              {/* Table header */}
              <div className="grid grid-cols-[40px_1fr_100px_80px_90px] gap-2 px-4 py-2.5 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      pendingOnlyCount > 0 && selectedIds.size === pendingOnlyCount
                        ? true
                        : selectedIds.size > 0
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </div>
                <span>File Name</span>
                <span>Upload Date</span>
                <span className="text-right">Size</span>
                <span className="text-center">Status</span>
              </div>

              {/* Table rows */}
              {queueFiles
                .filter((f) => f.status !== "uploading")
                .map((f) => {
                  const isPending = f.status === "pending";
                  return (
                    <div
                      key={f.id}
                      className="grid grid-cols-[40px_1fr_100px_80px_90px] gap-2 px-4 py-3 border-b border-border last:border-b-0 items-center hover:bg-accent/30 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={selectedIds.has(f.id)}
                          onCheckedChange={() => toggleSelect(f.id)}
                          disabled={!isPending}
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{f.fileName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{fmtDate(f.uploadDate)}</span>
                      <span className="text-xs text-muted-foreground text-right tabular-nums">{fmtSize(f.fileSize)}</span>
                      <div className="flex justify-center">
                        {f.status === "pending" && (
                          <Badge variant="outline" className="score-badge-muted text-[10px] px-2 py-0">
                            Pending
                          </Badge>
                        )}
                        {f.status === "analyzing" && (
                          <Badge variant="outline" className="score-badge-yellow text-[10px] px-2 py-0">
                            Analysing
                          </Badge>
                        )}
                        {f.status === "done" && (
                          <Badge variant="outline" className="score-badge-green text-[10px] px-2 py-0">
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 mt-3">
              <Button
                size="sm"
                className="gap-2 text-xs"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  // Pick the first selected pending file and load it for analysis
                  const firstId = Array.from(selectedIds)[0];
                  const sf = queueFiles.find((f) => f.id === firstId);
                  if (sf) handleAnalyzeFromQueue(sf);
                }}
              >
                Analyse Selected
                {selectedIds.size > 0 && (
                  <span className="tabular-nums">({selectedIds.size})</span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-xs"
                disabled={pendingOnlyCount === 0}
                onClick={() => {
                  const first = queueFiles.find((f) => f.status === "pending");
                  if (first) handleAnalyzeFromQueue(first);
                }}
              >
                Analyse All Pending
                {pendingOnlyCount > 0 && (
                  <span className="tabular-nums">({pendingOnlyCount})</span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-xs text-destructive hover:text-destructive"
                disabled={selectedIds.size === 0}
                onClick={handleRemoveSelected}
              >
                <Trash2 className="h-3 w-3" />
                Remove Selected
              </Button>
            </div>
          </div>
        )}

        {/* Empty state when no files at all */}
        {queueFiles.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">
              Drop one or many CVs above. They'll appear in a staging queue for batch or individual analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPanel;
