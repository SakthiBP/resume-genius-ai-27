/**
 * Global AnalysisManager — runs analysis as background jobs that survive navigation.
 *
 * Architecture:
 * 1. Insert a job record into analysis_jobs (status = 'processing')
 * 2. Fire the edge function via raw fetch (not tied to any React component)
 * 3. Edge function updates the job record on completion/failure
 * 4. UI subscribes to realtime changes on the job record
 */

import { supabase } from "@/integrations/supabase/client";

/* ── simple hash for cache keys ── */
function quickHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

export interface AnalysisJob {
  id: string;
  candidate_id: string;
  role_id: string | null;
  cv_hash: string;
  job_context_hash: string;
  job_context: string | null;
  status: "processing" | "completed" | "failed";
  result_json: any | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

type JobCallback = (job: AnalysisJob) => void;

class AnalysisManager {
  // In-flight job IDs so we don't fire duplicates
  private inflightJobs = new Set<string>();
  // Listeners keyed by job id
  private listeners = new Map<string, Set<JobCallback>>();

  /** Build the composite cache key */
  makeCacheKey(candidateId: string, roleId: string | null, cvText: string, jobContext: string | null): string {
    return `${candidateId}|${roleId ?? "none"}|${quickHash(cvText)}|${quickHash(jobContext ?? "")}`;
  }

  /** Check if there's already a completed (or processing) job for this combo */
  async findExistingJob(
    candidateId: string,
    roleId: string | null,
    cvText: string,
    jobContext: string | null
  ): Promise<AnalysisJob | null> {
    const cvHash = quickHash(cvText);
    const jcHash = quickHash(jobContext ?? "");

    let query = supabase
      .from("analysis_jobs")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("cv_hash", cvHash)
      .eq("job_context_hash", jcHash)
      .in("status", ["completed", "processing"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (roleId) {
      query = query.eq("role_id", roleId);
    } else {
      query = query.is("role_id", null);
    }

    const { data } = await query;
    return (data && data.length > 0 ? data[0] : null) as AnalysisJob | null;
  }

  /** Start a new analysis job. Returns the job record immediately. */
  async startJob(
    candidateId: string,
    roleId: string | null,
    cvText: string,
    jobContext: string | null
  ): Promise<AnalysisJob> {
    const cvHash = quickHash(cvText);
    const jcHash = quickHash(jobContext ?? "");

    // Insert job record
    const { data: job, error } = await supabase
      .from("analysis_jobs")
      .insert({
        candidate_id: candidateId,
        role_id: roleId,
        cv_hash: cvHash,
        job_context_hash: jcHash,
        job_context: jobContext,
        status: "processing",
      })
      .select()
      .single();

    if (error || !job) throw new Error("Failed to create analysis job: " + (error?.message ?? "unknown"));

    const jobRecord = job as unknown as AnalysisJob;

    // Fire edge function in background — raw fetch so it's NOT cancelled on unmount
    this.fireEdgeFunction(jobRecord.id, cvText, jobContext);

    return jobRecord;
  }

  /** Invalidate cached job for a specific combo (for force re-analysis) */
  async invalidateJob(
    candidateId: string,
    roleId: string | null,
    cvText: string,
    jobContext: string | null
  ): Promise<void> {
    const cvHash = quickHash(cvText);
    const jcHash = quickHash(jobContext ?? "");

    let query = supabase
      .from("analysis_jobs")
      .delete()
      .eq("candidate_id", candidateId)
      .eq("cv_hash", cvHash)
      .eq("job_context_hash", jcHash);

    if (roleId) {
      query = query.eq("role_id", roleId);
    } else {
      query = query.is("role_id", null);
    }

    await query;
  }

  /** Subscribe to realtime updates for a specific job */
  subscribeToJob(jobId: string, callback: JobCallback): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(callback);

    // Set up realtime subscription (only once per job)
    const channel = supabase
      .channel(`analysis-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "analysis_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updatedJob = payload.new as unknown as AnalysisJob;
          const cbs = this.listeners.get(jobId);
          if (cbs) {
            cbs.forEach((cb) => cb(updatedJob));
          }
          // Clean up if terminal
          if (updatedJob.status === "completed" || updatedJob.status === "failed") {
            this.inflightJobs.delete(jobId);
            channel.unsubscribe();
            this.listeners.delete(jobId);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      const cbs = this.listeners.get(jobId);
      if (cbs) {
        cbs.delete(callback);
        if (cbs.size === 0) {
          channel.unsubscribe();
          this.listeners.delete(jobId);
        }
      }
    };
  }

  /** Poll job status (fallback if realtime misses) */
  async pollJob(jobId: string): Promise<AnalysisJob | null> {
    const { data } = await supabase
      .from("analysis_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    return data as unknown as AnalysisJob | null;
  }

  /** Fire the edge function — completely detached from React lifecycle */
  private fireEdgeFunction(jobId: string, cvText: string, jobContext: string | null) {
    if (this.inflightJobs.has(jobId)) return;
    this.inflightJobs.add(jobId);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-cv`;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Use raw fetch — this promise is NOT tied to any component
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        cv_text: cvText,
        job_description: jobContext,
        job_id: jobId,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error("Background analysis failed:", res.status);
        }
      })
      .catch((err) => {
        console.error("Background analysis fetch error:", err);
      })
      .finally(() => {
        this.inflightJobs.delete(jobId);
      });
  }
}

// Singleton
export const analysisManager = new AnalysisManager();
