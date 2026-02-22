
-- Table to persist analysis job state (background job queue)
CREATE TABLE public.analysis_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL,
  role_id uuid,
  cv_hash text NOT NULL,
  job_context_hash text NOT NULL DEFAULT '',
  job_context text,
  status text NOT NULL DEFAULT 'processing',
  result_json jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by candidate + role + hashes
CREATE INDEX idx_analysis_jobs_lookup ON public.analysis_jobs (candidate_id, role_id, cv_hash, job_context_hash);

-- Enable RLS
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Public access policies (matches existing app pattern - no auth)
CREATE POLICY "Allow public read analysis_jobs" ON public.analysis_jobs FOR SELECT USING (true);
CREATE POLICY "Allow public insert analysis_jobs" ON public.analysis_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update analysis_jobs" ON public.analysis_jobs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete analysis_jobs" ON public.analysis_jobs FOR DELETE USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_analysis_jobs_updated_at
  BEFORE UPDATE ON public.analysis_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_jobs;
