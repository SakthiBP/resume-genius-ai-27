import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DocumentPanel from "@/components/DocumentPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/extractText";
import type { AnalysisResult } from "@/types/analysis";

interface SelectedRole {
  id: string;
  job_title: string;
  description: string;
  target_universities: { name: string; required_gpa: number }[];
  required_skills: string[];
}

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);

  const handleFileChange = async (newFile: File | null) => {
    setFile(newFile);
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
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const analyzeResume = async () => {
    if (!extractedText) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
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
        jobContext = jobContext ? `${roleParts}\n\n---\n\nAdditional context:\n${jobContext}` : roleParts;
      }

      // Use raw fetch so navigation doesn't cancel the request
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-cv`;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(url, {
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
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Analysis failed (${response.status})`);
      }

      const data = await response.json();
      if (data?.error) throw new Error(data.error);

      setAnalysisResult(data as AnalysisResult);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err.message || "Could not analyse the resume. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const overallScore = analysisResult?.overall_score?.composite_score ?? null;

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-300">
      <Navbar score={overallScore} />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-[3] flex flex-col min-h-0 border-r border-border">
          <DocumentPanel
            file={file}
            extractedText={extractedText}
            isExtracting={isExtracting}
            onFileChange={handleFileChange}
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
            onAnalyze={analyzeResume}
            isAnalyzing={isAnalyzing}
            selectedRole={selectedRole}
            onSelectedRoleChange={setSelectedRole}
          />
        </div>

        <div className="flex-[2] flex flex-col min-h-0">
          <AnalysisSidebar isLoading={isAnalyzing} hasResults={!!analysisResult} result={analysisResult} hasRole={!!selectedRole} />
        </div>
      </div>
    </div>
  );
};

export default Index;
