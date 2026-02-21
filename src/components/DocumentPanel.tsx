import { useEffect, useState } from "react";
import { FileText, RefreshCw, ChevronDown } from "lucide-react";
import WavesLoader from "@/components/WavesLoader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FileUploadZone from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

  useEffect(() => {
    const fetchRoles = async () => {
      const { data } = await supabase.from("roles").select("id, job_title, description, target_universities, required_skills").order("job_title");
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

  // Clear role error when a role is selected
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

  const wordCount = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <FileUploadZone file={null} onFileChange={onFileChange} />
        </div>
      </div>
    );
  }

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
                    className={`gap-1.5 text-xs h-8 ${roleError ? "border-red-500 text-red-500" : ""}`}
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
              <span className="text-[10px] text-red-500 mt-1">Please select a job role before analysing.</span>
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
