
-- External candidates sourced from LinkedIn/enrichment
CREATE TABLE public.external_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  headline TEXT,
  location TEXT,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  linkedin_url TEXT UNIQUE,
  profile_image_url TEXT,
  source TEXT NOT NULL DEFAULT 'linkedin',
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read external_candidates"
ON public.external_candidates FOR SELECT
USING (true);

CREATE POLICY "Allow public insert external_candidates"
ON public.external_candidates FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update external_candidates"
ON public.external_candidates FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete external_candidates"
ON public.external_candidates FOR DELETE
USING (true);

-- Recommendation search sessions
CREATE TABLE public.candidate_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_role TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read candidate_recommendations"
ON public.candidate_recommendations FOR SELECT
USING (true);

CREATE POLICY "Allow public insert candidate_recommendations"
ON public.candidate_recommendations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public delete candidate_recommendations"
ON public.candidate_recommendations FOR DELETE
USING (true);

-- Add source tracking to candidates table for imports
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct_upload',
ADD COLUMN IF NOT EXISTS external_candidate_id UUID REFERENCES public.external_candidates(id);
