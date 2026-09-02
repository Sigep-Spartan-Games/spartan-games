"use server";

import { sendToSlack } from "@/lib/slack";
import { sendBulkEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/admin";

import { SupabaseClient } from "@supabase/supabase-js";

export async function sendAnnouncement(formData: FormData) {
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;
  const sendSlack = formData.get("sendSlack") === "on";
  const sendEmail = formData.get("sendEmail") === "on";

  if (!subject || !message) {
    return {
      success: false,
      error: "Subject and Message are required.",
    };
  }

  // Auth check and client creation
  const { supabase } = await requireAdmin("/admin/announcements");

  return await internalBroadcastAnnouncement(
    supabase,
    subject,
    message,
    sendSlack,
    sendEmail,
  );
}

export async function internalBroadcastAnnouncement(
  supabase: SupabaseClient, // Use the passed client (Admin or Service Role)
  subject: string,
  message: string,
  sendSlack: boolean,
  sendEmail: boolean,
) {
  const errors: string[] = [];

  // 1. Send to Slack
  if (sendSlack) {
    try {
      await sendToSlack(subject, message);
    } catch (err) {
      console.warn("Slack warning:", err);
    }
  }

  // 2. Send to Email
  if (sendEmail) {
    try {
      // Use the passed client to call RPC
      const { data, error } = await supabase.rpc("get_all_user_emails");

      if (error) {
        console.error("Error fetching user emails via RPC:", error.message);
        errors.push("Could not fetch user emails.");
      }

      // NOTE: Test mode is handled centrally in lib/email.ts via EMAIL_TEST_MODE env var.
      const recipients = (data ?? []).map(
        (row: { email: string }) => row.email,
      );

      if (recipients.length > 0) {
        const { errors: emailErrors } = await sendBulkEmail({
          recipients,
          subject,
          html: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
        });

        if (emailErrors.length > 0) {
          errors.push(...emailErrors);
        }
      }
    } catch (err) {
      console.error("Email error:", err);
      errors.push("Failed to send emails.");
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(", ") };
  }

  return { success: true };
}
