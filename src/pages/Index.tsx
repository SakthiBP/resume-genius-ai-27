import Navbar from "@/components/Navbar";
import DocumentPanel from "@/components/DocumentPanel";
import AnalysisSidebar from "@/components/AnalysisSidebar";
import { useAnalyser } from "@/contexts/AnalyserContext";

const Index = () => {
  const {
    file,
    extractedText,
    isExtracting,
    handleFileChange,
    jobDescription,
    setJobDescription,
    analyseResume,
    isAnalysing,
    analysisResult,
    selectedRole,
    setSelectedRole,
  } = useAnalyser();

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
            onAnalyze={analyseResume}
            isAnalyzing={isAnalysing}
            selectedRole={selectedRole}
            onSelectedRoleChange={setSelectedRole}
          />
        </div>

        <div className="flex-[2] flex flex-col min-h-0">
          <AnalysisSidebar
            isLoading={isAnalysing}
            hasResults={!!analysisResult}
            result={analysisResult}
            hasRole={!!selectedRole}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
