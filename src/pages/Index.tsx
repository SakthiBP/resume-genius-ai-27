import { useState } from "react";
import Navbar from "@/components/Navbar";
import DocumentPanel from "@/components/DocumentPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/extractText";
import type { AnalysisResult } from "@/types/analysis";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

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
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: {
          cv_text: extractedText,
          job_description: jobDescription.trim() || null,
        },
      });

      if (error) throw error;
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
