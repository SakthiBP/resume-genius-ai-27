CREATE POLICY "Allow public delete candidates"
ON public.candidates
FOR DELETE
USING (true);