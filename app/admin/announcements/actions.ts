"use server";

import { sendToSlack } from "@/lib/slack";
import { sendBulkEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

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
      // The public 'profiles' table does not have emails.
      // We must use the Service Role to fetch emails from auth.users.
      const supabaseAdmin = createAdminClient();

      const {
        data: { users },
        error: usersError,
      } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000, // Adjust if you have more users
      });

      if (usersError) {
        console.error("Error fetching users for email:", usersError);
        errors.push("Could not fetch user emails.");
      } else if (users) {
        // FOR TESTING: Send only to loffm300334@gmail.com
        const recipients = ["loffm300334@gmail.com"];

        // Original logic (commented out for safety/testing)
        // const recipients = users
        //   .map((u) => u.email)
        //   .filter((email): email is string => !!email);

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
