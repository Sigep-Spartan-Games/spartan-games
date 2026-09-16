"use server";

import { requireAdmin } from "@/lib/admin";
import {
  deliverAnnouncement,
  recordAnnouncementEvent,
  validateAnnouncement,
} from "@/lib/announcements";

export async function sendAnnouncement(formData: FormData) {
  const parsed = validateAnnouncement(
    String(formData.get("subject") ?? ""),
    String(formData.get("message") ?? ""),
  );
  const sendSlack = formData.get("sendSlack") === "on";
  const sendEmail = formData.get("sendEmail") === "on";

  if (parsed.error) return { success: false, error: parsed.error };
  if (!sendSlack && !sendEmail) {
    return { success: false, error: "Select at least one delivery channel." };
  }

  const { supabase, user } = await requireAdmin("/admin/announcements");
  let recipients: string[] = [];
  let recipientError: string | undefined;

  if (sendEmail) {
    const { data, error } = await supabase.rpc("get_all_user_emails");
    if (error) {
      console.error("Could not load announcement recipients:", error.message);
      recipientError = "Could not load email recipients.";
    } else {
      const emailRows = (data ?? []) as Array<{ email: string | null }>;
      recipients = [
        ...new Set(
          emailRows
            .map((row) => row.email)
            .filter((email): email is string => Boolean(email)),
        ),
      ];
    }
  }

  const result = await deliverAnnouncement({
    subject: parsed.subject,
    message: parsed.message,
    sendSlack,
    sendEmail,
    recipients,
    recipientError,
  });

  await recordAnnouncementEvent({
    context: { source: "admin_ui", actorId: user.id },
    subject: parsed.subject,
    message: parsed.message,
    sendSlack,
    sendEmail,
    result,
  });

  return result;
}
