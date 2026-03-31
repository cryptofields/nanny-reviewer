import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Candidate = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  status: "new" | "shortlisted" | "rejected" | "interview_scheduled" | "offered";
  cv_file_url: string | null;
  cv_file_name: string | null;
  cv_extracted_text: string | null;
  agency_synopsis: string | null;
  ai_review: string | null;
  ai_scores: Record<string, { score: number; justification: string }> | null;
  ai_overall_score: number | null;
  ai_estimated_age: string | null;
  ai_flags: Array<{ type: "red" | "green"; message: string }> | null;
  user_notes: string | null;
  tags: string[] | null;
};
