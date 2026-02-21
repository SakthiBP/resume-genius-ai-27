
-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  email TEXT,
  overall_score INTEGER NOT NULL DEFAULT 0,
  recommendation TEXT NOT NULL DEFAULT 'maybe',
  analysis_json JSONB NOT NULL,
  cv_text TEXT NOT NULL,
  job_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (no auth in this app)
CREATE POLICY "Allow public read" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.candidates FOR UPDATE USING (true);
