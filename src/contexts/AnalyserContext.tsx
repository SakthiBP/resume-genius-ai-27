import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/extractText";
import type { AnalysisResult } from "@/types/analysis";

export interface SelectedRole {
  id: string;
  job_title: string;
  description: string;
  target_universities: { name: string; required_gpa: number }[];
  required_skills: string[];
}

interface AnalyserState {
  file: File | null;
  fileName: string | null;
  extractedText: string;
  isExtracting: boolean;
  jobDescription: string;
  isAnalysing: boolean;
  analysisResult: AnalysisResult | null;
  selectedRole: SelectedRole | null;
}

interface AnalyserContextValue extends AnalyserState {
  handleFileChange: (newFile: File | null) => Promise<void>;
  setJobDescription: (jd: string) => void;
  setSelectedRole: (role: SelectedRole | null) => void;
  analyseResume: () => void;
}

const AnalyserContext = createContext<AnalyserContextValue | null>(null);

export function useAnalyser() {
  const ctx = useContext(AnalyserContext);
  if (!ctx) throw new Error("useAnalyser must be used within AnalyserProvider");
  return ctx;
}

export function AnalyserProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);

  // AbortController ref so we can cancel a previous in-flight analysis
  const abortRef = useRef<AbortController | null>(null);

  const handleFileChange = useCallback(async (newFile: File | null) => {
    setFile(newFile);
    setFileName(newFile?.name ?? null);
    setAnalysisResult(null);
    setExtractedText("");

    if (newFile) {
      setIsExtracting(true);
      try {
        const text = await extractTextFromFile(newFile);
        setExtractedText(text);
      } catch (err: any) {
        console.error("Extraction error:", err);
        toast({
          variant: "destructive",
          title: "Text extraction failed",
          description: err.message || "Could not extract text from the file.",
        });
        setFile(null);
        setFileName(null);
      } finally {
        setIsExtracting(false);
      }
    }
  }, []);

  const analyseResume = useCallback(() => {
    if (!extractedText) return;

    // Cancel any in-flight analysis
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsAnalysing(true);
    setAnalysisResult(null);

    // Build job context
    let jobContext = jobDescription.trim() || null;
    if (selectedRole) {
      const roleParts = [
        `Job Title: ${selectedRole.job_title}`,
        selectedRole.description ? `Job Description: ${selectedRole.description}` : "",
        selectedRole.required_skills.length > 0
          ? `Required Skills: ${selectedRole.required_skills.join(", ")}`
          : "",
        selectedRole.target_universities.length > 0
          ? `Target Universities: ${selectedRole.target_universities
              .map((u) => `${u.name} (min GPA: ${u.required_gpa})`)
              .join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      jobContext = jobContext
        ? `${roleParts}\n\n---\n\nAdditional context:\n${jobContext}`
        : roleParts;
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-cv`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Fire-and-forget style — the promise lives in this closure, NOT in a component
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        cv_text: extractedText,
        job_description: jobContext,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Analysis failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setAnalysisResult(data as AnalysisResult);
        setIsAnalysing(false);
        abortRef.current = null;
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // cancelled intentionally
        console.error("Analysis error:", err);
        toast({
          variant: "destructive",
          title: "Analysis failed",
          description: err.message || "Could not analyse the resume. Please try again.",
        });
        setIsAnalysing(false);
        abortRef.current = null;
      });
  }, [extractedText, jobDescription, selectedRole]);

  return (
    <AnalyserContext.Provider
      value={{
        file,
        fileName,
        extractedText,
        isExtracting,
        jobDescription,
        isAnalysing,
        analysisResult,
        selectedRole,
        handleFileChange,
        setJobDescription,
        setSelectedRole,
        analyseResume,
      }}
    >
      {children}
    </AnalyserContext.Provider>
  );
}
