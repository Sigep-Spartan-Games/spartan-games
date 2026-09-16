import { NextRequest, NextResponse } from "next/server";

import {
  deliverAnnouncement,
  getConfirmedUserEmailsForServiceRole,
  recordAnnouncementEvent,
  validateAnnouncement,
} from "@/lib/announcements";
import { authorizeSlackCommand, verifySlackRequest } from "@/lib/slack";

const SUPPORTED_COMMANDS = new Set(["/spartangamesbot", "/spartan-games-notify"]);

export async function handleSlackAnnouncementCommand(request: NextRequest) {
  try {
    const body = await request.text();

    if (!process.env.SLACK_SIGNING_SECRET) {
      console.error("SLACK_SIGNING_SECRET is not configured");
      return new NextResponse("Slack command integration is not configured", {
        status: 503,
      });
    }

    if (!(await verifySlackRequest(request, body))) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const form = new URLSearchParams(body);
    const command = form.get("command");
    if (!command || !SUPPORTED_COMMANDS.has(command)) {
      return new NextResponse("Unknown command", { status: 200 });
    }

    const authorization = authorizeSlackCommand({
      teamId: form.get("team_id"),
      userId: form.get("user_id"),
      channelId: form.get("channel_id"),
    });
    if (!authorization.allowed) {
      console.warn("Rejected Slack announcement command:", authorization.reason);
      return new NextResponse("You are not authorized to send Spartan Games announcements.", {
        status: 200,
      });
    }

    const parsed = validateAnnouncement(
      "Spartan Games Announcement",
      form.get("text") ?? "",
    );
    if (parsed.error) return new NextResponse(parsed.error, { status: 200 });

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Supabase service-role configuration is missing");
      return new NextResponse("Announcement service is not configured.", {
        status: 200,
      });
    }

    let recipients: string[] = [];
    let recipientError: string | undefined;
    try {
      recipients = await getConfirmedUserEmailsForServiceRole();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown recipient error";
      console.error("Slack announcement recipient lookup failed:", reason);
      recipientError = "Could not load email recipients.";
    }

    const result = await deliverAnnouncement({
      subject: parsed.subject,
      message: parsed.message,
      sendSlack: true,
      sendEmail: true,
      recipients,
      recipientError,
    });

    await recordAnnouncementEvent({
      context: {
        source: "slack_command",
        slackUserId: form.get("user_id"),
        slackTeamId: form.get("team_id"),
        slackChannelId: form.get("channel_id"),
      },
      subject: parsed.subject,
      message: parsed.message,
      sendSlack: true,
      sendEmail: true,
      result,
    });

    if (!result.success) {
      return new NextResponse(
        `Announcement partially failed. Slack: ${result.slack}; email: ${result.email}.`,
        { status: 200 },
      );
    }

    return new NextResponse(
      `Announcement sent to Slack and ${result.emailSentCount} email recipient${result.emailSentCount === 1 ? "" : "s"}.`,
      { status: 200 },
    );
  } catch (error) {
    console.error("Slack command error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
