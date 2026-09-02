import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";

export default async function Page() {
  noStore();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) redirect("/leaderboard");

  return <AuthShell><LoginForm /></AuthShell>;
}
