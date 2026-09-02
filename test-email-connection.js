import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

// ── Configuration ──────────────────────────────────────────────────────
// Change this to YOUR personal email for testing:
const TEST_RECIPIENT = [process.env.EMAIL_TEST_RECIPIENT];
// ────────────────────────────────────────────────────────────────────────

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

async function main() {
  console.log("──────────────────────────────────────────");
  console.log("  Spartan Games — SMTP Test Tool");
  console.log("──────────────────────────────────────────");
  console.log("Host:", process.env.SMTP_HOST || "(not set)");
  console.log("User:", process.env.SMTP_USER || "(not set)");
  console.log("Port:", process.env.SMTP_PORT || "587 (default)");
  console.log("From:", FROM);
  console.log("Test Recipient:", TEST_RECIPIENT);
  console.log("");

  // Step 1: Verify SMTP connection
  console.log("[1/2] Verifying SMTP connection...");
  try {
    await transporter.verify();
    console.log("  ✅ SMTP Connection Successful!\n");
  } catch (error) {
    console.error("  ❌ SMTP Connection Failed:");
    console.error(" ", error.message || error);
    console.error("\n  Possible fixes:");
    console.error("  - Check SMTP_HOST, SMTP_USER, SMTP_PASS in .env.local");
    console.error("  - Make sure you're using a Brevo SMTP key (starts with xsmtpsib-), NOT a REST API key");
    console.error("  - Verify the key hasn't been revoked in Brevo dashboard");
    process.exit(1);
  }

  // Step 2: Send a test email
  console.log(`[2/2] Sending test email to ${TEST_RECIPIENT}...`);
  try {
    const info = await transporter.sendMail({
      from: `"Spartan Games (TEST)" <${FROM}>`,
      to: TEST_RECIPIENT,
      subject: "🧪 Spartan Games — SMTP Test Email",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; text-align: center;">
            <h1 style="color: #e2e8f0; font-size: 28px; margin: 0 0 8px 0;">🧪 SMTP Test Successful</h1>
            <p style="color: #94a3b8; font-size: 16px; margin: 0 0 24px 0;">Your Brevo SMTP configuration is working correctly.</p>
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 0 0 24px 0; text-align: left;">
              <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 8px 0;">✅ <strong style="color: #4ade80;">SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 8px 0;">✅ <strong style="color: #4ade80;">From:</strong> ${FROM}</p>
              <p style="color: #cbd5e1; font-size: 14px; margin: 0;">✅ <strong style="color: #4ade80;">Sent at:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              This is a test email — no action required.
            </p>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 16px;">
            SigEp Spartan Games • Test email — safe to ignore.
          </p>
        </div>
      `,
    });

    console.log("  ✅ Test email sent successfully!");
    console.log("  Message ID:", info.messageId);
    console.log(`\n  Check ${TEST_RECIPIENT} inbox (and spam folder).`);
  } catch (error) {
    console.error("  ❌ Failed to send test email:");
    console.error(" ", error.message || error);
    process.exit(1);
  }

  console.log("\n──────────────────────────────────────────");
  console.log("  All tests passed! Your SMTP config is ready.");
  console.log("──────────────────────────────────────────");
}

main();
