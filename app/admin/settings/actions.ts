"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { parseSeasonCompletionResult } from "@/lib/champions";
import { sendBulkEmail } from "@/lib/email";

type AdminSupabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function getAllUserEmails(supabase: AdminSupabase) {
  const { data, error } = await supabase.rpc("get_all_user_emails");
  if (error) {
    console.error("Error fetching user emails:", error.message);
    return [];
  }
  return (data ?? []).map((row: { email: string }) => row.email);
}

async function sendGamesEndedNotification(supabase: AdminSupabase) {
  try {
    const emails = await getAllUserEmails(supabase);
    if (emails.length === 0) return;

    await sendBulkEmail({
      recipients: emails,
      subject: "Spartan Games Have Ended",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; text-align: center;">
            <h1 style="color: #e2e8f0; font-size: 28px; margin: 0 0 8px 0;">The Games Have Ended</h1>
            <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px 0;">This round of Spartan Games is now over.</p>
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
              <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 8px 0;">Submissions are now closed</p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 0;">Champions and final standings are permanently preserved.</p>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0;">Visit the leaderboard to see each tier champion.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://spartan-games.vercel.app"}/leaderboard"
               style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View Leaderboard
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 16px;">
            SigEp Spartan Games &bull; You're receiving this because you have an account.
          </p>
        </div>
      `,
    });
    console.log(`Games ended: notification sent to ${emails.length} users`);
  } catch (emailError) {
    console.error("Failed to send end-games emails:", emailError);
  }
}

export async function startGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");
  const shouldSendEmail = formData.get("sendEmail") === "on";

  const { data: current } = await supabase
    .from("current_season_settings")
    .select("submissions_open, status")
    .maybeSingle();

  if (current?.status !== "registration") {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent(
          current?.status === "completed"
            ? "This season is complete. Start a new season to run the games again."
            : "Games can only be started from the registration stage.",
        ),
    );
  }

  const { error } = await supabase.rpc("set_season_controls_v2", {
    p_registration_open: true,
    p_submissions_open: true,
    p_status: "active",
  });
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  if (shouldSendEmail) {
    try {
      const emails = await getAllUserEmails(supabase);
      if (emails.length > 0) {
        await sendBulkEmail({
          recipients: emails,
          subject: "Spartan Games Have Started!",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; text-align: center;">
                <h1 style="color: #e2e8f0; font-size: 28px; margin: 0 0 8px 0;">The Games Have Started!</h1>
                <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px 0;">Spartan Games are live and submissions are open.</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://spartan-games.vercel.app"}/submit"
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Submit an Activity
                </a>
              </div>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Failed to send start-games emails:", emailError);
    }
  }

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        shouldSendEmail
          ? "Games started: registration and submissions are open. Notification emails sent!"
          : "Games started: registration and submissions are open. (No emails sent)",
      ),
  );
}

export async function endGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");
  const shouldSendEmail = formData.get("sendEmail") === "on";

  const { data: current } = await supabase
    .from("current_season_settings")
    .select("status")
    .maybeSingle();

  if (current?.status === "completed") {
    redirect("/admin/settings?error=" + encodeURIComponent("Games have already ended."));
  }
  if (current?.status === "finalizing") {
    redirect(
      "/admin/settings?ok=" +
        encodeURIComponent("Select the tied tier champions to complete the season."),
    );
  }
  if (current?.status !== "active") {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("Games must be started before they can be ended."),
    );
  }

  const { data, error } = await supabase.rpc("prepare_season_completion_v2");
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  const result = parseSeasonCompletionResult(data);
  if (result.status === "needs_tiebreak") {
    redirect(
      "/admin/settings?ok=" +
        encodeURIComponent(
          "Scoring is frozen. Select a champion for each tied tier to complete the season.",
        ),
    );
  }

  if (shouldSendEmail) await sendGamesEndedNotification(supabase);

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        shouldSendEmail
          ? "Games ended and champions locked. Notification emails sent!"
          : "Games ended and champions locked. (No emails sent)",
      ),
  );
}

export async function completeChampionSelection(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");
  const selections = Array.from(formData.entries())
    .filter(([key, value]) => key.startsWith("winner:") && typeof value === "string")
    .map(([key, value]) => ({
      tier_key: key.slice("winner:".length),
      team_id: String(value),
    }));

  const { data, error } = await supabase.rpc("complete_season_champions_v2", {
    p_selections: selections,
  });
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  const result = parseSeasonCompletionResult(data);
  if (result.status !== "completed") {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("The season could not be completed."),
    );
  }

  const shouldSendEmail = formData.get("sendEmail") === "on";
  if (shouldSendEmail) await sendGamesEndedNotification(supabase);

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        shouldSendEmail
          ? "Champions locked and season completed. Notification emails sent!"
          : "Champions locked and season completed.",
      ),
  );
}

export async function finalizeWeek() {
  const { supabase } = await requireAdmin("/admin/settings");
  const { error } = await supabase.rpc("finalize_competition_week", {
    p_week_id: undefined,
  });
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));
  redirect(
    "/admin/settings?ok=" + encodeURIComponent("Previous week finalized successfully."),
  );
}

export async function resetSpartanGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");

  if (String(formData.get("confirm") ?? "").trim() !== "RESET") {
    redirect(
      "/admin/settings?error=" + encodeURIComponent("Confirmation text must be RESET."),
    );
  }

  const seasonName = String(formData.get("seasonName") ?? "").trim();
  if (seasonName.length < 3 || seasonName.length > 80) {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("Enter a season name between 3 and 80 characters."),
    );
  }

  const { error } = await supabase.rpc("start_new_season_v2", {
    p_name: seasonName,
    p_starts_on: new Date().toISOString().slice(0, 10),
  });
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent("Previous season archived and a new season created."),
  );
}
