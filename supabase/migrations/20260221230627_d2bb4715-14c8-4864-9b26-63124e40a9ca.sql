
-- External profiles: normalized candidate profiles from various sources
CREATE TABLE public.external_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  headline TEXT,
  location TEXT,
  email TEXT,
  phone TEXT,
  links JSONB DEFAULT '{}'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  experience JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL,
  source_url TEXT,
  raw_text TEXT,
  raw_json JSONB,
  profile_summary TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.external_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read external_profiles" ON public.external_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert external_profiles" ON public.external_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update external_profiles" ON public.external_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete external_profiles" ON public.external_profiles FOR DELETE USING (true);

CREATE INDEX idx_external_profiles_source ON public.external_profiles(source);
CREATE INDEX idx_external_profiles_status ON public.external_profiles(status);

-- Imports: tracks each ingestion job
CREATE TABLE public.imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  input JSONB DEFAULT '{}'::jsonb,
  external_profile_id UUID REFERENCES public.external_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read imports" ON public.imports FOR SELECT USING (true);
CREATE POLICY "Allow public insert imports" ON public.imports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update imports" ON public.imports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete imports" ON public.imports FOR DELETE USING (true);

CREATE INDEX idx_imports_status ON public.imports(status);
CREATE INDEX idx_imports_type ON public.imports(type);

-- Storage bucket for CV uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('cv_uploads', 'cv_uploads', false);

-- Storage policies: allow public access for demo mode
CREATE POLICY "Allow public upload cv_uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cv_uploads');
CREATE POLICY "Allow public read cv_uploads" ON storage.objects FOR SELECT USING (bucket_id = 'cv_uploads');
CREATE POLICY "Allow public delete cv_uploads" ON storage.objects FOR DELETE USING (bucket_id = 'cv_uploads');
