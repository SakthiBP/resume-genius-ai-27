import { useState, useCallback } from "react";
import { useStagingQueue, type StagedFile } from "@/contexts/StagingQueueContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

interface StagingQueuePanelProps {
  /** Called when user picks a pending file to analyse individually */
  onSelectFile?: (file: StagedFile) => void;
}

const StagingQueuePanel = ({ onSelectFile }: StagingQueuePanelProps) => {
  const { files, addFiles, removeFiles } = useStagingQueue();
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pendingFiles = files.filter((f) => f.status === "pending");
  const uploadingFiles = files.filter((f) => f.status === "uploading");

  const validateAndAdd = useCallback(
    (fileList: FileList | File[]) => {
      const valid: File[] = [];
      Array.from(fileList).forEach((f) => {
        const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
        if (ACCEPTED_EXTENSIONS.includes(ext)) valid.push(f);
      });
      if (valid.length === 0) {
        toast({ variant: "destructive", title: "No valid files", description: "Only .pdf and .docx files are accepted." });
        return;
      }
      addFiles(valid);
      toast({ title: `${valid.length} file${valid.length > 1 ? "s" : ""} queued`, description: "Files are being uploaded." });
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) validateAndAdd(e.dataTransfer.files);
    },
    [validateAndAdd]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) validateAndAdd(e.target.files);
    e.target.value = "";
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pendingFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingFiles.map((f) => f.id)));
    }
  };

  const handleRemoveSelected = () => {
    if (selected.size === 0) return;
    removeFiles(Array.from(selected));
    setSelected(new Set());
    toast({ title: "Files removed from queue" });
  };

  const handleAnalyzeSelected = () => {
    toast({ title: "Analysis queued", description: `${selected.size} file${selected.size > 1 ? "s" : ""} sent for analysis.` });
  };

  const handleAnalyzeAll = () => {
    toast({ title: "Analysis queued", description: `${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""} sent for analysis.` });
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("batch-file-input")?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center border-2 border-dashed p-10 transition-all duration-200 cursor-pointer group",
          isDragging
            ? "border-foreground/60 bg-foreground/5 scale-[1.005]"
            : "border-border hover:border-foreground/40 hover:bg-accent/40"
        )}
      >
        <input
          id="batch-file-input"
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload size={36} className="mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        <p className="font-medium text-foreground text-center text-sm">
          Drop multiple CV files here or{" "}
          <span className="font-semibold underline underline-offset-2">Browse Files</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">Supports PDF and DOCX · Multiple files accepted</p>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Uploading</h2>
          {uploadingFiles.map((f) => (
            <div key={f.id} className="border border-border bg-card p-3 flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.fileName}</p>
                <Progress value={f.progress} className="h-1.5 mt-1" />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{Math.round(f.progress)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Staging Queue Table */}
      {pendingFiles.length === 0 && uploadingFiles.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No files in queue. Drop files above to get started.</p>
        </div>
      ) : pendingFiles.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Staging Queue · {pendingFiles.length} pending
            </h2>
          </div>

          <div className="border border-border bg-card">
            <div className="grid grid-cols-[40px_1fr_100px_80px_80px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground uppercase tracking-wide font-medium items-center">
              <div className="flex justify-center">
                <Checkbox
                  checked={selected.size === pendingFiles.length && pendingFiles.length > 0}
                  onCheckedChange={toggleAll}
                />
              </div>
              <span>File Name</span>
              <span>Date</span>
              <span className="text-right">Size</span>
              <span className="text-center">Status</span>
            </div>
            {pendingFiles.map((f) => (
              <div
                key={f.id}
                className="grid grid-cols-[40px_1fr_100px_80px_80px] gap-2 px-4 py-2.5 border-b border-border last:border-b-0 items-center hover:bg-accent transition-colors duration-200"
              >
                <div className="flex justify-center">
                  <Checkbox
                    checked={selected.has(f.id)}
                    onCheckedChange={() => toggleSelect(f.id)}
                  />
                </div>
                <button
                  className="flex items-center gap-2 min-w-0 text-left hover:underline"
                  onClick={() => onSelectFile?.(f)}
                  title="Click to analyse this file"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{f.fileName}</span>
                </button>
                <span className="text-xs text-muted-foreground">{formatDate(f.uploadDate)}</span>
                <span className="text-xs text-muted-foreground text-right">{formatBytes(f.fileSize)}</span>
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 pointer-events-none">
                    Pending
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Batch actions bar */}
          <div className="flex items-center gap-3 p-3 border border-border bg-card">
            <span className="text-xs text-muted-foreground mr-auto">
              {selected.size > 0 ? `${selected.size} selected` : "Select files to perform actions"}
            </span>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={selected.size === 0} onClick={handleRemoveSelected}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" disabled={selected.size === 0} onClick={handleAnalyzeSelected}>
              <Zap className="h-3.5 w-3.5" />
              Analyze Selected
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={pendingFiles.length === 0} onClick={handleAnalyzeAll}>
              <Zap className="h-3.5 w-3.5" />
              Analyze All
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default StagingQueuePanel;
