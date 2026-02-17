"use server";

import { sendToSlack } from "@/lib/slack";
import { sendBulkEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/admin";

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

  const errors: string[] = [];

  // 1. Send to Slack
  if (sendSlack) {
    try {
      await sendToSlack(subject, message);
    } catch (err) {
      console.warn("Slack warning:", err); // Warn instead of error for now
      // errors.push("Failed to send to Slack."); // Don't block success if just Slack fails (e.g. no webhook)
    }
  }

  // 2. Send to Email
  if (sendEmail) {
    try {
      // Use the same pattern as admin/settings/actions.ts
      // This uses the logged-in admin's client (cookies) to call an RPC function
      // responsible for fetching emails. This avoids needing the Service Role key directly here.
      // Note: We still need the Service Key in lib/email.ts if using it there? No, lib/email uses SMTP env vars.

      const { supabase } = await requireAdmin("/admin/announcements");

      // FOR TESTING: Send only to loffm300334@gmail.com
      const recipients = ["loffm300334@gmail.com"];

      /* 
      // PRODUCTION LOGIC:
      const { data, error } = await supabase.rpc("get_all_user_emails");
      
      if (error) {
         console.error("Error fetching user emails via RPC:", error.message);
         errors.push("Could not fetch user emails.");
         // return { success: false, error: "RPC Erorr: " + error.message }; 
      }
      
      const recipients = (data ?? []).map((row: { email: string }) => row.email);
      */

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
      // DEBUG LOGGING
      console.log("DEBUG: SMTP Config seen by action:", {
        host: process.env.SMTP_HOST,
        user: process.env.SMTP_USER,
        port: process.env.SMTP_PORT,
      });
      // END DEBUG
      errors.push("Failed to send emails.");
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(", ") };
  }

  return { success: true };
}
