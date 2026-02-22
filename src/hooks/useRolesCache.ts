import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CachedRole {
  id: string;
  job_title: string;
  description: string;
  target_universities: any[];
  required_skills: string[];
}

async function fetchRoles(): Promise<CachedRole[]> {
  const { data } = await supabase
    .from("roles")
    .select("id, job_title, description, target_universities, required_skills")
    .order("job_title");
  if (!data) return [];
  return data.map((r: any) => ({
    id: r.id,
    job_title: r.job_title,
    description: r.description || "",
    target_universities: Array.isArray(r.target_universities) ? r.target_universities : [],
    required_skills: Array.isArray(r.required_skills) ? r.required_skills : [],
  }));
}

export function useRolesCache() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}
