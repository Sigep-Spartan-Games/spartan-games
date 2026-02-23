import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export const getCachedAdminProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return profile;
});

export const getPendingEditRequestsCount = cache(async () => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("submission_edit_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return count || 0;
});
