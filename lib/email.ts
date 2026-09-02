// lib/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM = process.env.SMTP_FROM || "sigep.spartangames@gmail.com";

/**
 * Safety check: when EMAIL_TEST_MODE=true, all outgoing emails are diverted
 * to EMAIL_TEST_RECIPIENT instead of real users. This catches every code path
 * (startGames, endGames, announcements, Slack commands) in one place.
 */
function isTestMode(): boolean {
    return process.env.EMAIL_TEST_MODE === "true";
}

function getTestRecipient(): string | null {
    return process.env.EMAIL_TEST_RECIPIENT || null;
}

/** Send a single email */
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
            console.warn("[EMAIL_TEST_MODE] No EMAIL_TEST_RECIPIENT set — skipping email.");
            return null;
        }
        console.log(`[EMAIL_TEST_MODE] Diverting email from "${to}" → "${testRecipient}"`);
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

/** Send an email to many recipients (BCC for privacy) in batches */
export async function sendBulkEmail({
    recipients,
    subject,
    html,
}: {
    recipients: string[];
    subject: string;
    html: string;
}) {
    if (recipients.length === 0) return { sent: 0, errors: [] };

    // ── Test Mode: divert ALL recipients to a single test address ──
    if (isTestMode()) {
        const testRecipient = getTestRecipient();
        if (!testRecipient) {
            console.warn("[EMAIL_TEST_MODE] No EMAIL_TEST_RECIPIENT set — skipping bulk email.");
            return { sent: 0, errors: [] };
        }
        console.log(
            `[EMAIL_TEST_MODE] Diverting bulk email from ${recipients.length} real recipients → "${testRecipient}"`
        );
        recipients = [testRecipient];
        subject = `[TEST] ${subject}`;
    }

    // Brevo free tier allows ~300 emails/day. Batch in groups of 50 to avoid
    // hitting per-request limits.
    const BATCH_SIZE = 50;
    const errors: string[] = [];
    let sent = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);

        try {
            await transporter.sendMail({
                from: `"Spartan Games" <${FROM}>`,
                bcc: batch.join(", "),
                subject,
                html,
            });
            sent += batch.length;
        } catch (error) {
            const errMsg =
                error instanceof Error ? error.message : "Unknown email error";
            console.error(`Email batch error (batch ${i / BATCH_SIZE + 1}):`, errMsg);
            errors.push(errMsg);
        }
    }

    return { sent, errors };
}
