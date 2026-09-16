import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || "sigep.spartangames@gmail.com";

export type BulkEmailDeliveryReport = {
  status: "sent" | "partial" | "failed" | "skipped";
  reason?: "no_recipients" | "test_recipient_missing";
  requestedRecipientCount: number;
  attemptedRecipientCount: number;
  acceptedRecipientCount: number;
  failedRecipientCount: number;
  failedBatchCount: number;
  testMode: boolean;
  errors: string[];
};

/**
 * When EMAIL_TEST_MODE=true, every outgoing email is diverted to
 * EMAIL_TEST_RECIPIENT instead of real users.
 */
function isTestMode(): boolean {
  return process.env.EMAIL_TEST_MODE === "true";
}

function getTestRecipient(): string | null {
  return process.env.EMAIL_TEST_RECIPIENT || null;
}

/** Send a single email. */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  let actualTo = to;

  if (isTestMode()) {
    const testRecipient = getTestRecipient();
    if (!testRecipient) {
      throw new Error(
        "EMAIL_TEST_MODE is enabled but EMAIL_TEST_RECIPIENT is not configured.",
      );
    }
    console.log(
      `[EMAIL_TEST_MODE] Diverting email from "${to}" to "${testRecipient}"`,
    );
    actualTo = testRecipient;
    subject = `[TEST] ${subject}`;
  }

  return transporter.sendMail({
    from: `"Spartan Games" <${FROM}>`,
    to: actualTo,
    subject,
    html,
  });
}

/** Send an email to many recipients (BCC for privacy) in batches. */
export async function sendBulkEmail({
  recipients,
  subject,
  html,
}: {
  recipients: string[];
  subject: string;
  html: string;
}): Promise<BulkEmailDeliveryReport> {
  const requestedRecipientCount = recipients.length;
  const testMode = isTestMode();

  if (requestedRecipientCount === 0) {
    return {
      status: "skipped",
      reason: "no_recipients",
      requestedRecipientCount,
      attemptedRecipientCount: 0,
      acceptedRecipientCount: 0,
      failedRecipientCount: 0,
      failedBatchCount: 0,
      testMode,
      errors: [],
    };
  }

  if (testMode) {
    const testRecipient = getTestRecipient();
    if (!testRecipient) {
      const message =
        "EMAIL_TEST_MODE is enabled but EMAIL_TEST_RECIPIENT is not configured.";
      console.error(message);
      return {
        status: "failed",
        reason: "test_recipient_missing",
        requestedRecipientCount,
        attemptedRecipientCount: 0,
        acceptedRecipientCount: 0,
        failedRecipientCount: requestedRecipientCount,
        failedBatchCount: 0,
        testMode,
        errors: [message],
      };
    }

    console.log(
      `[EMAIL_TEST_MODE] Diverting bulk email from ${requestedRecipientCount} real recipients to "${testRecipient}"`,
    );
    recipients = [testRecipient];
    subject = `[TEST] ${subject}`;
  }

  const batchSize = 50;
  const errors: string[] = [];
  let acceptedRecipientCount = 0;
  let failedRecipientCount = 0;
  let failedBatchCount = 0;

  for (let index = 0; index < recipients.length; index += batchSize) {
    const batch = recipients.slice(index, index + batchSize);

    try {
      const info = await transporter.sendMail({
        from: `"Spartan Games" <${FROM}>`,
        bcc: batch.join(", "),
        subject,
        html,
      });

      const rejectedCount = Array.isArray(info.rejected)
        ? Math.min(info.rejected.length, batch.length)
        : 0;
      const acceptedCount =
        Array.isArray(info.accepted) && info.accepted.length > 0
          ? Math.min(info.accepted.length, batch.length)
          : batch.length - rejectedCount;

      acceptedRecipientCount += acceptedCount;
      failedRecipientCount += batch.length - acceptedCount;

      if (acceptedCount < batch.length) {
        failedBatchCount += 1;
        errors.push(
          `Email provider rejected ${batch.length - acceptedCount} recipient(s) in batch ${index / batchSize + 1}.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error";
      console.error(`Email batch error (batch ${index / batchSize + 1}):`, message);
      errors.push(message);
      failedRecipientCount += batch.length;
      failedBatchCount += 1;
    }
  }

  const attemptedRecipientCount = recipients.length;
  const status =
    acceptedRecipientCount === attemptedRecipientCount
      ? "sent"
      : acceptedRecipientCount > 0
        ? "partial"
        : "failed";

  return {
    status,
    requestedRecipientCount,
    attemptedRecipientCount,
    acceptedRecipientCount,
    failedRecipientCount,
    failedBatchCount,
    testMode,
    errors,
  };
}
