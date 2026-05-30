// Database + storage helpers for the ATS scanner.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { extractResumeText } from "./resume-extractor.ts";

export async function loadApplication(
  supabase: SupabaseClient,
  params: { application_id?: string; career_slug?: string; email?: string },
): Promise<any | null> {
  const { application_id, career_slug, email } = params;
  if (application_id && typeof application_id === "string") {
    const { data } = await supabase
      .from("job_applications").select("*").eq("id", application_id).maybeSingle();
    return data;
  }
  if (career_slug && email) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("job_applications").select("*")
      .eq("career_slug", String(career_slug))
      .ilike("email", String(email))
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    return data;
  }
  return null;
}

export async function loadCareer(supabase: SupabaseClient, app: any): Promise<any | null> {
  if (app?.career_id) {
    const { data } = await supabase.from("careers").select("*").eq("id", app.career_id).maybeSingle();
    if (data) return data;
  }
  if (app?.career_slug) {
    const { data } = await supabase.from("careers").select("*").eq("slug", app.career_slug).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function loadResumeText(
  supabase: SupabaseClient,
  app: any,
): Promise<{ text: string; chars: number }> {
  if (!app?.resume_url) return { text: "", chars: 0 };
  const { data: file, error } = await supabase.storage
    .from("job-applications").download(app.resume_url);
  if (error || !file) return { text: "", chars: 0 };
  const text = await extractResumeText(await file.arrayBuffer(), app.resume_url);
  return { text, chars: text.length };
}

export async function persistAtsResult(
  supabase: SupabaseClient,
  applicationId: string,
  payload: Record<string, any>,
): Promise<void> {
  const { error } = await supabase
    .from("job_applications")
    .update(payload)
    .eq("id", applicationId);
  if (error) throw error;
}
