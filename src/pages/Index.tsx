import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DocumentPanel from "@/components/DocumentPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    if (file) {
      setIsAnalyzing(true);
      setHasResults(false);
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
        setHasResults(true);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setHasResults(false);
      setIsAnalyzing(false);
    }
  }, [file]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar score={hasResults ? 82 : null} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Panel */}
        <div className="flex-[3] flex flex-col min-h-0 border-r border-border">
          <DocumentPanel
            file={file}
            onFileChange={setFile}
            jobDescription={jobDescription}
            onJobDescriptionChange={setJobDescription}
          />
        </div>

        {/* Right Sidebar */}
        <div className="flex-[2] flex flex-col min-h-0 bg-card">
          <AnalysisSidebar isLoading={isAnalyzing} hasResults={hasResults} />
        </div>
      </div>
    </div>
  );
};

export default Index;
