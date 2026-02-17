import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function main() {
  console.log("Testing SMTP Connection...");
  console.log("Host:", process.env.SMTP_HOST);
  console.log("User:", process.env.SMTP_USER);
  console.log("Port:", process.env.SMTP_PORT);

  try {
    await transporter.verify();
    console.log("✅ SMTP Connection Successful!");
  } catch (error) {
    console.error("❌ SMTP Connection Failed:");
    console.error(error);
  }
}

main();
