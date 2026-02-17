import crypto from "crypto";

/**
 * Send a message to the configured Slack Webhook URL.
 */
export async function sendToSlack(subject: string, message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL is not defined in environment variables.");
    // In production, we might want to throw an error, but for dev/if not set up, warn is better
    // throw new Error("SLACK_WEBHOOK_URL not configured");
    return;
  }

  // Formatting the message for Slack
  // Using blocks for better formatting
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
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
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

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature),
  );
}
