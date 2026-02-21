import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import AnalysisSidebar from "./AnalysisSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AnalysisResult } from "@/types/analysis";

interface CandidateDetailPanelProps {
  candidate: {
    candidate_name: string;
    analysis_json: AnalysisResult;
    cv_text: string;
    job_description?: string | null;
  } | null;
  onClose: () => void;
}

const CandidateDetailPanel = ({ candidate, onClose }: CandidateDetailPanelProps) => {
  return (
    <Sheet open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>{candidate?.candidate_name ?? "Candidate"}</SheetTitle>
          <SheetDescription>Full analysis and original CV text</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {candidate && (
            <>
              <AnalysisSidebar
                isLoading={false}
                hasResults={true}
                result={candidate.analysis_json}
                hasRole={!!candidate.job_description}
              />
              <div className="border-t border-border px-6 py-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">Original CV Text</h4>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-4 max-h-80 overflow-y-auto">
                  {candidate.cv_text}
                </pre>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CandidateDetailPanel;
