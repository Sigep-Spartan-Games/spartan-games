import crypto from "crypto";

/**
 * Send a message to the configured Slack Webhook URL.
 */
export async function sendToSlack(subject: string, message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is not configured");
  }

  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/@(channel|here|everyone)/gi, "@\u200b$1");
  const messageSections = escapedMessage.match(/[\s\S]{1,3000}/g) ?? [""];

  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: subject,
          emoji: true,
        },
      },
      ...messageSections.map((text) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text,
        },
      })),
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to send to Slack: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.error("Error sending to Slack:", error);
    throw error;
  }
}

/**
 * Verify that a request came from Slack using the signing secret.
 */
export async function verifySlackRequest(
  req: Request,
  bodyText: string,
): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.warn("SLACK_SIGNING_SECRET is not configured.");
    return false;
  }

  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    return false;
  }

  // Check if timestamp is too old (replay attack protection)
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - parseInt(timestamp)) > 300) {
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${bodyText}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(sigBaseString)
      .digest("hex");

  const expected = Buffer.from(mySignature);
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && crypto.timingSafeEqual(expected, received)
  );
}

function commaSeparatedValues(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function authorizeSlackCommand({
  teamId,
  userId,
  channelId,
}: {
  teamId: string | null;
  userId: string | null;
  channelId: string | null;
}) {
  const allowedTeam = process.env.SLACK_ALLOWED_TEAM_ID?.trim();
  const allowedUsers = commaSeparatedValues(process.env.SLACK_ALLOWED_USER_IDS);
  const allowedChannels = commaSeparatedValues(
    process.env.SLACK_ALLOWED_CHANNEL_IDS,
  );

  if (!allowedTeam || allowedUsers.size === 0) {
    return {
      allowed: false,
      reason: "Slack command authorization is not configured",
    };
  }
  if (!teamId || teamId !== allowedTeam) {
    return { allowed: false, reason: "Slack workspace is not authorized" };
  }
  if (!userId || !allowedUsers.has(userId)) {
    return { allowed: false, reason: "Slack user is not authorized" };
  }
  if (
    allowedChannels.size > 0 &&
    (!channelId || !allowedChannels.has(channelId))
  ) {
    return { allowed: false, reason: "Slack channel is not authorized" };
  }

  return { allowed: true, reason: null };
}
