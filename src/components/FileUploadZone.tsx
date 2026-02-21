import { useCallback, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

interface FileUploadZoneProps {
  /** Called with validated files (one or many) */
  onFilesChange: (files: File[]) => void;
  /** Optional: compact mode for tighter spaces */
  compact?: boolean;
}

function validateFile(f: File): boolean {
  const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
    toast({
      variant: "destructive",
      title: "Invalid file type",
      description: `"${f.name}" is not a PDF or DOCX file.`,
    });
    return false;
  }
  return true;
}

const FileUploadZone = ({ onFilesChange, compact }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files).filter(validateFile);
      if (dropped.length > 0) onFilesChange(dropped);
    },
    [onFilesChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter(validateFile);
    if (selected.length > 0) onFilesChange(selected);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center border-2 border-dashed transition-all duration-200 cursor-pointer group",
        compact ? "p-6" : "p-10",
        isDragging
          ? "border-foreground/60 bg-foreground/5 scale-[1.01]"
          : "border-border hover:border-foreground/40 hover:bg-accent/40"
      )}
      onClick={() => document.getElementById("file-input-multi")?.click()}
    >
      <input
        id="file-input-multi"
        type="file"
        accept=".pdf,.docx"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      <Upload size={compact ? 32 : 48} className="mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
      <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
        Drop CVs here or{" "}
        <span className="font-semibold underline underline-offset-2">Browse Files</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Supports PDF and DOCX — drop one or many
      </p>
    </div>
  );
};

export default FileUploadZone;
