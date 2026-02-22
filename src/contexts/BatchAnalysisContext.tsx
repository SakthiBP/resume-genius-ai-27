import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/extractText";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/types/analysis";
import { useStagingQueue } from "@/contexts/StagingQueueContext";

/* ── Types ── */

export type BatchItemStatus = "pending" | "extracting" | "analysing" | "completed" | "failed";

export interface BatchRunItem {
  id: string;
  stagedFileId: string;
  fileName: string;
  cvText: string | null;
  status: BatchItemStatus;
  error?: string;
  candidateId?: string;
}

export interface BatchRun {
  runId: string;
  roleId: string | null;
  roleName: string | null;
  jobContext: string | null;
  items: BatchRunItem[];
  active: boolean;
  cancelled: boolean;
  startedAt: string;
}

interface BatchAnalysisContextValue {
  run: BatchRun | null;
  isRunning: boolean;
  currentItem: BatchRunItem | null;
  completedCount: number;
  totalCount: number;
  startRun: (stagedFileIds: string[], roleId: string | null, roleName: string | null, jobContext: string | null) => void;
  cancelRun: () => void;
  retryFailed: () => void;
}

const BatchAnalysisContext = createContext<BatchAnalysisContextValue | null>(null);

const STORAGE_KEY = "swimr_batch_run";

function saveRun(run: BatchRun | null) {
  if (run) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function loadRun(): BatchRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BatchRun;
  } catch {
    return null;
  }
}

let batchIdCounter = 1;

export function BatchAnalysisProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<BatchRun | null>(loadRun);
  const processingRef = useRef(false);
  const cancelledRef = useRef(false);
  const stagingQueue = useStagingQueue();

  // Persist run state whenever it changes
  useEffect(() => {
    saveRun(run);
  }, [run]);

  // Process the queue
  const processQueue = useCallback(async (currentRun: BatchRun) => {
    if (processingRef.current) return;
    processingRef.current = true;
    cancelledRef.current = false;

    let updatedRun = { ...currentRun, items: [...currentRun.items] };

    for (let i = 0; i < updatedRun.items.length; i++) {
      if (cancelledRef.current) break;

      const item = updatedRun.items[i];
      if (item.status === "completed" || item.status === "failed") continue;

      // Extract text if needed
      if (!item.cvText) {
        updatedRun.items[i] = { ...item, status: "extracting" };
        setRun({ ...updatedRun });

        const stagedFile = stagingQueue.files.find((f) => f.id === item.stagedFileId);
        if (!stagedFile?.file) {
          updatedRun.items[i] = { ...item, status: "failed", error: "File data unavailable (lost after refresh)" };
          setRun({ ...updatedRun });
          stagingQueue.updateFile(item.stagedFileId, { status: "failed" as any });
          continue;
        }

        try {
          const text = await extractTextFromFile(stagedFile.file);
          updatedRun.items[i] = { ...item, cvText: text, status: "pending" };
          // Also store extracted text in staging queue
          stagingQueue.updateFile(item.stagedFileId, { extractedText: text });
        } catch (err: any) {
          updatedRun.items[i] = { ...item, status: "failed", error: `Text extraction failed: ${err.message}` };
          setRun({ ...updatedRun });
          stagingQueue.updateFile(item.stagedFileId, { status: "failed" as any });
          continue;
        }
      }

      if (cancelledRef.current) break;

      // Analyse
      const currentItem = updatedRun.items[i];
      updatedRun.items[i] = { ...currentItem, status: "analysing" };
      setRun({ ...updatedRun });
      stagingQueue.updateFile(item.stagedFileId, { status: "analysing" });

      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-cv`;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            cv_text: currentItem.cvText,
            job_description: updatedRun.jobContext,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Analysis failed (${res.status})`);
        }

        const analysisResult = (await res.json()) as AnalysisResult;
        if ((analysisResult as any)?.error) throw new Error((analysisResult as any).error);

        // Save to candidates table
        const candidateName = analysisResult.candidate_name || currentItem.fileName.replace(/\.(pdf|docx)$/i, "");
        const { data: candidateData, error: insertError } = await supabase
          .from("candidates")
          .upsert(
            {
              candidate_name: candidateName,
              email: analysisResult.email || null,
              cv_text: currentItem.cvText!,
              analysis_json: analysisResult as any,
              overall_score: analysisResult.overall_score?.composite_score ?? 0,
              recommendation: analysisResult.overall_score?.recommendation ?? "maybe",
              job_description: updatedRun.jobContext,
              status: "pending",
            },
            { onConflict: "candidate_name" }
          )
          .select("id")
          .single();

        if (insertError) {
          // Try insert without upsert
          const { data: insertData, error: insertError2 } = await supabase
            .from("candidates")
            .insert({
              candidate_name: candidateName,
              email: analysisResult.email || null,
              cv_text: currentItem.cvText!,
              analysis_json: analysisResult as any,
              overall_score: analysisResult.overall_score?.composite_score ?? 0,
              recommendation: analysisResult.overall_score?.recommendation ?? "maybe",
              job_description: updatedRun.jobContext,
              status: "pending",
            })
            .select("id")
            .single();

          if (insertError2) throw new Error(`Failed to save candidate: ${insertError2.message}`);
          updatedRun.items[i] = { ...currentItem, status: "completed", candidateId: insertData?.id };
        } else {
          updatedRun.items[i] = { ...currentItem, status: "completed", candidateId: candidateData?.id };
        }

        setRun({ ...updatedRun });
        stagingQueue.updateFile(item.stagedFileId, { status: "done" });

        toast({
          title: `✓ ${candidateName} analysed`,
          description: `Score: ${analysisResult.overall_score?.composite_score ?? "N/A"}`,
        });
      } catch (err: any) {
        if (cancelledRef.current) break;
        console.error("Batch analysis error:", err);
        updatedRun.items[i] = { ...currentItem, status: "failed", error: err.message };
        setRun({ ...updatedRun });
        stagingQueue.updateFile(item.stagedFileId, { status: "failed" as any });
      }
    }

    // Mark run as inactive
    updatedRun = { ...updatedRun, active: !cancelledRef.current ? false : updatedRun.active, cancelled: cancelledRef.current };
    const allDone = updatedRun.items.every((it) => it.status === "completed" || it.status === "failed");
    if (allDone) {
      updatedRun.active = false;
    }
    setRun({ ...updatedRun });
    processingRef.current = false;

    if (allDone && !cancelledRef.current) {
      const completed = updatedRun.items.filter((it) => it.status === "completed").length;
      const failed = updatedRun.items.filter((it) => it.status === "failed").length;
      toast({
        title: "Batch analysis complete",
        description: `${completed} completed${failed > 0 ? `, ${failed} failed` : ""}`,
      });
    }
  }, [stagingQueue]);

  // Resume on mount if there's an active run
  useEffect(() => {
    if (run?.active && !processingRef.current) {
      const hasPending = run.items.some((it) => it.status === "pending" || it.status === "analysing" || it.status === "extracting");
      if (hasPending) {
        // Reset any "analysing"/"extracting" items back to pending for resume
        const resumedRun = {
          ...run,
          items: run.items.map((it) =>
            it.status === "analysing" || it.status === "extracting"
              ? { ...it, status: "pending" as const }
              : it
          ),
        };
        setRun(resumedRun);
        processQueue(resumedRun);
      }
    }
  }, []); // Only on mount

  const startRun = useCallback(
    (stagedFileIds: string[], roleId: string | null, roleName: string | null, jobContext: string | null) => {
      if (processingRef.current || run?.active) {
        toast({ variant: "destructive", title: "A batch analysis is already running" });
        return;
      }

      if (stagedFileIds.length === 0) {
        toast({ variant: "destructive", title: "Select at least one CV to analyse." });
        return;
      }

      const items: BatchRunItem[] = stagedFileIds.map((sfId) => {
        const sf = stagingQueue.files.find((f) => f.id === sfId);
        return {
          id: `batch-${batchIdCounter++}`,
          stagedFileId: sfId,
          fileName: sf?.fileName ?? "Unknown",
          cvText: sf?.extractedText ?? null,
          status: "pending" as const,
        };
      });

      const newRun: BatchRun = {
        runId: `run-${Date.now()}`,
        roleId,
        roleName,
        jobContext,
        items,
        active: true,
        cancelled: false,
        startedAt: new Date().toISOString(),
      };

      setRun(newRun);
      processQueue(newRun);
    },
    [run, stagingQueue, processQueue]
  );

  const cancelRun = useCallback(() => {
    cancelledRef.current = true;
    setRun((prev) => (prev ? { ...prev, active: false, cancelled: true } : null));
    toast({ title: "Batch analysis cancelled" });
  }, []);

  const retryFailed = useCallback(() => {
    if (!run) return;
    const retriedRun: BatchRun = {
      ...run,
      active: true,
      cancelled: false,
      items: run.items.map((it) => (it.status === "failed" ? { ...it, status: "pending" as const, error: undefined } : it)),
    };
    setRun(retriedRun);
    processQueue(retriedRun);
  }, [run, processQueue]);

  const isRunning = run?.active ?? false;
  const currentItem = run?.items.find((it) => it.status === "analysing" || it.status === "extracting") ?? null;
  const completedCount = run?.items.filter((it) => it.status === "completed").length ?? 0;
  const totalCount = run?.items.length ?? 0;

  return (
    <BatchAnalysisContext.Provider
      value={{ run, isRunning, currentItem, completedCount, totalCount, startRun, cancelRun, retryFailed }}
    >
      {children}
    </BatchAnalysisContext.Provider>
  );
}

export function useBatchAnalysis() {
  const ctx = useContext(BatchAnalysisContext);
  if (!ctx) throw new Error("useBatchAnalysis must be used within BatchAnalysisProvider");
  return ctx;
}
