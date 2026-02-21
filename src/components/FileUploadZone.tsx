import { useCallback, useState } from "react";
import { FileText, X, Upload } from "lucide-react";
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
          ? "border-foreground/60 bg-foreground/5 scale-[1.02]"
          : "border-border hover:border-foreground/40 hover:bg-accent/40"
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
          <FileText className="h-8 w-8 text-foreground" />
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
          <Upload size={48} className="mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <p className="font-medium text-foreground">
            Drop candidate resume here or{" "}
            <span className="text-foreground font-semibold underline underline-offset-2">Browse Files</span>
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
