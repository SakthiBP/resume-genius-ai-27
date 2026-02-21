import { useCallback, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

interface FileUploadZoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const FileUploadZone = ({ file, onFileChange }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (f: File): boolean => {
    const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a .pdf or .docx file.",
      });
      return false;
    }
    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && validateFile(droppedFile)) {
        onFileChange(droppedFile);
      }
    },
    [onFileChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && validateFile(selected)) {
      onFileChange(selected);
    }
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
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-300 cursor-pointer group",
        isDragging
          ? "border-primary bg-primary/10 scale-[1.02]"
          : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40"
      )}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleFileInput}
      />

      {file ? (
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div className="text-left">
            <p className="font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
            }}
            className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="h-10 w-10 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />
          <p className="font-medium text-foreground">
            Drop your resume here or{" "}
            <span className="gradient-text font-semibold">browse</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Supports PDF and DOCX
          </p>
        </>
      )}
    </div>
  );
};

export default FileUploadZone;
