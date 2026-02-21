import { useState } from "react";
import { FileText, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import FileUploadZone from "./FileUploadZone";

interface DocumentPanelProps {
  file: File | null;
  extractedText: string;
  isExtracting: boolean;
  onFileChange: (file: File | null) => void;
  jobDescription: string;
  onJobDescriptionChange: (val: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
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
}: DocumentPanelProps) => {
  const [jobModalOpen, setJobModalOpen] = useState(false);

  const wordCount = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <FileUploadZone file={null} onFileChange={onFileChange} />
        </div>

        <Dialog open={jobModalOpen} onOpenChange={setJobModalOpen}>
          <DialogTrigger asChild>
            <button className="mt-6 text-sm text-foreground hover:underline">Paste job description for role-specific screening</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Job Description</DialogTitle></DialogHeader>
            <Textarea
              placeholder="Paste the job listing here so the analysis is tailored to this role…"
              value={jobDescription}
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <Button onClick={() => setJobModalOpen(false)} className="w-full">Done</Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3" style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="font-medium text-foreground">{file.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={onAnalyze}
            disabled={isAnalyzing || isExtracting || !extractedText}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing…
              </>
            ) : (
              "Analyze Resume"
            )}
          </Button>
          <Dialog open={jobModalOpen} onOpenChange={setJobModalOpen}>
            <DialogTrigger asChild>
              <button className="text-xs text-foreground hover:underline">Job description</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Job Description</DialogTitle></DialogHeader>
              <Textarea
                placeholder="Paste the job listing here so the analysis is tailored to this role…"
                value={jobDescription}
                onChange={(e) => onJobDescriptionChange(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <Button onClick={() => setJobModalOpen(false)} className="w-full">Done</Button>
            </DialogContent>
          </Dialog>
          <button
            onClick={() => onFileChange(null)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Replace
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto p-8 md:p-12">
        <div className="max-w-2xl mx-auto bg-card rounded-lg border border-border p-10 md:p-14">
          {isExtracting ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
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
};

export default DocumentPanel;
