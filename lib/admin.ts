// lib/admin.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin(redirectTo = "/admin") {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect(`${redirectTo}?error=not_authenticated`);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error)
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  if (!profile?.is_admin) redirect(`${redirectTo}?error=not_admin`);

  return { supabase, user };
}
