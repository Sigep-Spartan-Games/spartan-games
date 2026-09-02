// app/admin/settings/actions.ts
"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { sendBulkEmail } from "@/lib/email";

/** Fetch all confirmed user emails via the Postgres function */
async function getAllUserEmails(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
) {
  const { data, error } = await supabase.rpc("get_all_user_emails");

  if (error) {
    console.error("Error fetching user emails:", error.message);
    return [];
  }

  // NOTE: Test mode is handled centrally in lib/email.ts via EMAIL_TEST_MODE env var.
  // When EMAIL_TEST_MODE=true, sendBulkEmail() diverts all recipients automatically.

  return (data ?? []).map((row: { email: string }) => row.email);
}

export async function startGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");
  const shouldSendEmail = formData.get("sendEmail") === "on";

  // ── Idempotency: skip if games are already running ──
  const { data: current } = await supabase
    .from("game_settings")
    .select("submissions_open, games_started_at, games_ended_at")
    .eq("id", true)
    .single();

  if (current?.submissions_open && current?.games_started_at && !current?.games_ended_at) {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("Games are already running. No action taken."),
    );
  }

  const { error } = await supabase
    .from("game_settings")
    .update({
      registration_open: false,
      submissions_open: true,
      games_started_at: new Date().toISOString(),
      games_ended_at: null,
    })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  // Send notification emails only if the admin opted in
  if (shouldSendEmail) {
    try {
      const emails = await getAllUserEmails(supabase);
      if (emails.length > 0) {
        await sendBulkEmail({
          recipients: emails,
          subject: "🏆 Spartan Games Have Started!",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; text-align: center;">
                <h1 style="color: #e2e8f0; font-size: 28px; margin: 0 0 8px 0;">🏆 The Games Have Started!</h1>
                <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px 0;">Spartan Games are now live — time to compete!</p>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
                  <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 8px 0;">✅ <strong style="color: #4ade80;">Submissions are now OPEN</strong></p>
                  <p style="color: #cbd5e1; font-size: 14px; margin: 0;">🔒 Team registration is now closed</p>
                </div>
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0;">Start logging your activities and earning points for your team!</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://spartan-games.vercel.app"}/submit"
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Submit an Activity →
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 16px;">
                SigEp Spartan Games • You're receiving this because you have an account.
              </p>
            </div>
          `,
        });
        console.log(`Games started: notification sent to ${emails.length} users`);
      }
    } catch (emailError) {
      console.error("Failed to send start-games emails:", emailError);
      // Don't block the action if emails fail
    }
  }

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        shouldSendEmail
          ? "Games started: registration closed, submissions opened. Notification emails sent!"
          : "Games started: registration closed, submissions opened. (No emails sent)",
      ),
  );
}

export async function endGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");
  const shouldSendEmail = formData.get("sendEmail") === "on";

  // ── Idempotency: skip if games have already ended ──
  const { data: current } = await supabase
    .from("game_settings")
    .select("submissions_open, games_ended_at")
    .eq("id", true)
    .single();

  if (!current?.submissions_open && current?.games_ended_at) {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("Games have already ended. No action taken."),
    );
  }

  const { error } = await supabase
    .from("game_settings")
    .update({
      registration_open: true,
      submissions_open: false,
      games_ended_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  // Send notification emails only if the admin opted in
  if (shouldSendEmail) {
    try {
      const emails = await getAllUserEmails(supabase);
      if (emails.length > 0) {
        await sendBulkEmail({
          recipients: emails,
          subject: "🏁 Spartan Games Have Ended",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; text-align: center;">
                <h1 style="color: #e2e8f0; font-size: 28px; margin: 0 0 8px 0;">🏁 The Games Have Ended</h1>
                <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px 0;">This round of Spartan Games is now over.</p>
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
                  <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 8px 0;">🔒 Submissions are now closed</p>
                  <p style="color: #cbd5e1; font-size: 14px; margin: 0;">✅ <strong style="color: #4ade80;">Team registration is now OPEN</strong></p>
                </div>
                <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px 0;">Check the leaderboard to see the final standings!</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://spartan-games.vercel.app"}/leaderboard"
                   style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  View Leaderboard →
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 16px;">
                SigEp Spartan Games • You're receiving this because you have an account.
              </p>
            </div>
          `,
        });
        console.log(`Games ended: notification sent to ${emails.length} users`);
      }
    } catch (emailError) {
      console.error("Failed to send end-games emails:", emailError);
    }
  }

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        shouldSendEmail
          ? "Games ended: registration opened, submissions closed. Notification emails sent!"
          : "Games ended: registration opened, submissions closed. (No emails sent)",
      ),
  );
}

export async function toggleSubmissions(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");

  const newValue = formData.get("value") === "true";

  const { error } = await supabase
    .from("game_settings")
    .update({ submissions_open: newValue })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        newValue ? "Submissions are now OPEN." : "Submissions are now CLOSED.",
      ),
  );
}

export async function toggleRegistration(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");

  const newValue = formData.get("value") === "true";

  const { error } = await supabase
    .from("game_settings")
    .update({ registration_open: newValue })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        newValue
          ? "Team registration is now OPEN."
          : "Team registration is now CLOSED.",
      ),
  );
}

export async function finalizeWeek() {
  const { supabase } = await requireAdmin("/admin/settings");

  const { error } = await supabase
    .from("game_settings")
    .update({
      finalize_requested: true,
    })
    .eq("id", true);

  if (error)
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent(
        "Weekly finalization requested. The background job will process it shortly.",
      ),
  );
}

export async function resetSpartanGames(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/settings");

  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "RESET") {
    redirect(
      "/admin/settings?error=" +
        encodeURIComponent("Confirmation text must be RESET."),
    );
  }

  // First, delete all proof images from storage
  try {
    const { data: files, error: listError } = await supabase.storage
      .from("submission-proofs")
      .list("", { limit: 1000 });

    if (!listError && files && files.length > 0) {
      const filePaths = files.map((f) => f.name);
      const { error: deleteStorageError } = await supabase.storage
        .from("submission-proofs")
        .remove(filePaths);

      if (deleteStorageError) {
        console.error("Error deleting proof images:", deleteStorageError);
        // Continue with reset even if storage cleanup fails
      }
    }
  } catch (e) {
    console.error("Error cleaning up storage:", e);
    // Continue with reset even if storage cleanup fails
  }

  // Delete submissions first (even though teams has ON DELETE CASCADE, this is explicit)
  const { error: subErr } = await supabase
    .from("submissions")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (subErr)
    redirect("/admin/settings?error=" + encodeURIComponent(subErr.message));

  // Delete teams (this also cascades to weekly_history)
  const { error: teamErr } = await supabase
    .from("teams")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (teamErr)
    redirect("/admin/settings?error=" + encodeURIComponent(teamErr.message));

  redirect(
    "/admin/settings?ok=" +
      encodeURIComponent("All teams, submissions, and proof images deleted."),
  );
}
