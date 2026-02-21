import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DocumentPanel from "@/components/DocumentPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AnalysisResult } from "@/types/analysis";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const analyzeResume = async (uploadedFile: File) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription);
      }

      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAnalysisResult(data as AnalysisResult);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err.message || "Could not analyze the resume. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (newFile: File | null) => {
    setFile(newFile);
    if (!newFile) {
      setAnalysisResult(null);
    }
  };

  const overallScore = analysisResult?.overall_score?.composite_score ?? null;

  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-300">
      <Navbar score={overallScore} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-[3] flex flex-col min-h-0 border-r border-border">
          <DocumentPanel
            file={file}
            onFileChange={handleFileChange}
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
            onAnalyze={analyzeResume}
            isAnalyzing={isAnalyzing}
          />
        </div>

        <div className="flex-[2] flex flex-col min-h-0">
          <AnalysisSidebar isLoading={isAnalyzing} hasResults={!!analysisResult} result={analysisResult} />
        </div>
      </div>
    </div>
  );
};

export default Index;
