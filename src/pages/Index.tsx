import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FileUploadZone from "@/components/FileUploadZone";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please upload a resume first.",
      });
      return;
    }
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis complete",
        description: "Your resume has been analyzed successfully.",
      });
    }, 3000);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-[-20%] left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/8 blur-[120px]" />

      <main className="relative z-10 flex flex-col items-center px-4 pt-24 pb-16">
        {/* Hero */}
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-8 w-8 text-primary" />
          <Sparkles className="h-5 w-5 text-muted-foreground" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center gradient-text mb-3">
          AI Resume Analyst
        </h1>
        <p className="text-muted-foreground text-center text-lg max-w-md mb-12">
          Agentic CV Analysis Powered by Claude
        </p>

        {/* Card */}
        <div className="w-full max-w-xl space-y-6 rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <FileUploadZone file={file} onFileChange={setFile} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Paste job description (optional)
            </label>
            <Textarea
              placeholder="Paste the job listing here to get a tailored analysis…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
              className="resize-none bg-secondary border-border focus:ring-primary/40"
            />
          </div>

          <Button
            variant="gradient"
            size="lg"
            className="w-full text-base h-12"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" />
                Analyzing…
              </>
            ) : (
              "Analyze Resume"
            )}
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          Your files are processed securely and never stored.
        </p>
      </main>
    </div>
  );
};

export default Index;
