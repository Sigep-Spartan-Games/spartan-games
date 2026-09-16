import { sendBulkEmail } from "@/lib/email";
import { sendToSlack } from "@/lib/slack";
import { createAdminClient } from "@/lib/supabase/admin";

export const ANNOUNCEMENT_SUBJECT_MAX_LENGTH = 150;
export const ANNOUNCEMENT_MESSAGE_MAX_LENGTH = 5000;

export type AnnouncementDeliveryResult = {
  success: boolean;
  error?: string;
  slack: "not_requested" | "sent" | "failed";
  email: "not_requested" | "sent" | "partial" | "failed";
  emailRecipientCount: number;
  emailSentCount: number;
};

export type AnnouncementAuditContext = {
  source: "admin_ui" | "slack_command";
  actorId?: string | null;
  slackUserId?: string | null;
  slackTeamId?: string | null;
  slackChannelId?: string | null;
};

export function validateAnnouncement(subjectValue: string, messageValue: string) {
  const subject = subjectValue.trim();
  const message = messageValue.trim();

  if (!subject || !message) {
    return { error: "Subject and message are required.", subject, message };
  }
  if (subject.length > ANNOUNCEMENT_SUBJECT_MAX_LENGTH) {
    return {
      error: `Subject must be ${ANNOUNCEMENT_SUBJECT_MAX_LENGTH} characters or fewer.`,
      subject,
      message,
    };
  }
  if (/[\r\n]/.test(subject)) {
    return { error: "Subject must be a single line.", subject, message };
  }
  if (message.length > ANNOUNCEMENT_MESSAGE_MAX_LENGTH) {
    return {
      error: `Message must be ${ANNOUNCEMENT_MESSAGE_MAX_LENGTH} characters or fewer.`,
      subject,
      message,
    };
  }

  return { error: null, subject, message };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function announcementHtml(message: string) {
  return `<p>${escapeHtml(message).replace(/\r?\n/g, "<br/>")}</p>`;
}

export async function getConfirmedUserEmailsForServiceRole() {
  const supabase = createAdminClient();
  const emails = new Set<string>();
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Could not load announcement recipients: ${error.message}`);

    for (const user of data.users) {
      if (user.email && user.email_confirmed_at && !user.deleted_at) {
        emails.add(user.email);
      }
    }

    if (data.users.length < perPage) break;
  }

  return [...emails];
}

export async function deliverAnnouncement({
  subject,
  message,
  sendSlack,
  sendEmail,
  recipients = [],
  recipientError,
}: {
  subject: string;
  message: string;
  sendSlack: boolean;
  sendEmail: boolean;
  recipients?: string[];
  recipientError?: string;
}): Promise<AnnouncementDeliveryResult> {
  const errors: string[] = [];
  let slack: AnnouncementDeliveryResult["slack"] = "not_requested";
  let email: AnnouncementDeliveryResult["email"] = "not_requested";
  let emailSentCount = 0;

  if (sendSlack) {
    try {
      await sendToSlack(subject, message);
      slack = "sent";
    } catch (error) {
      slack = "failed";
      const reason = error instanceof Error ? error.message : "Unknown Slack error";
      console.error("Announcement Slack delivery failed:", reason);
      errors.push("Slack delivery failed.");
    }
  }

  if (sendEmail) {
    if (recipientError) {
      email = "failed";
      errors.push(recipientError);
    } else {
      const result = await sendBulkEmail({
        recipients,
        subject,
        html: announcementHtml(message),
      });
      emailSentCount = result.acceptedRecipientCount;
      if (result.status === "sent") {
        email = "sent";
      } else if (result.status === "partial") {
        email = "partial";
        errors.push("One or more email recipients were rejected.");
      } else {
        email = "failed";
        errors.push(
          result.reason === "no_recipients"
            ? "No confirmed email recipients were found."
            : "Email delivery failed.",
        );
      }
    }
  }

  return {
    success: errors.length === 0,
    ...(errors.length > 0 ? { error: errors.join(" ") } : {}),
    slack,
    email,
    emailRecipientCount: recipients.length,
    emailSentCount,
  };
}

export async function recordAnnouncementEvent({
  context,
  subject,
  message,
  sendSlack,
  sendEmail,
  result,
}: {
  context: AnnouncementAuditContext;
  subject: string;
  message: string;
  sendSlack: boolean;
  sendEmail: boolean;
  result: AnnouncementDeliveryResult;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("announcement_events").insert({
    source: context.source,
    actor_id: context.actorId ?? null,
    slack_user_id: context.slackUserId ?? null,
    slack_team_id: context.slackTeamId ?? null,
    slack_channel_id: context.slackChannelId ?? null,
    subject_snapshot: subject,
    message_length: message.length,
    slack_requested: sendSlack,
    email_requested: sendEmail,
    slack_status: result.slack,
    email_status: result.email,
    email_recipient_count: result.emailRecipientCount,
    email_sent_count: result.emailSentCount,
    error_summary: result.error ?? null,
  });

  if (error) console.error("Could not record announcement audit event:", error.message);
}
