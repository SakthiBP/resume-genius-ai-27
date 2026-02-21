
-- Create recruitment_email_log table
CREATE TABLE public.recruitment_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  candidate_email TEXT NOT NULL,
  recruiter_email TEXT NOT NULL,
  recruiter_name TEXT NOT NULL,
  status_attempted TEXT NOT NULL,
  previous_status TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  preview_shown BOOLEAN NOT NULL DEFAULT true,
  edited_before_send BOOLEAN NOT NULL DEFAULT false,
  edit_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruitment_email_log ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing pattern)
CREATE POLICY "Allow public read email_log" ON public.recruitment_email_log FOR SELECT USING (true);
CREATE POLICY "Allow public insert email_log" ON public.recruitment_email_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update email_log" ON public.recruitment_email_log FOR UPDATE USING (true);
CREATE POLICY "Allow public delete email_log" ON public.recruitment_email_log FOR DELETE USING (true);
