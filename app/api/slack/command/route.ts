import { NextRequest, NextResponse } from "next/server";
import { sendToSlack, verifySlackRequest } from "@/lib/slack";
import { internalBroadcastAnnouncement } from "@/app/admin/announcements/actions";

// Slack sends application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const formData = new URLSearchParams(text);

    // Verify request
    const isValid = await verifySlackRequest(req, text);
    if (!isValid) {
      // Only enforce in production or if secret is present
      if (
        process.env.NODE_ENV === "production" ||
        process.env.SLACK_SIGNING_SECRET
      ) {
        return new NextResponse("Invalid signature", { status: 401 });
      }
    }

    const command = formData.get("command");
    const content = formData.get("text") || "";
    // const userId = formData.get("user_id");
    // const userName = formData.get("user_name");

    if (command === "/spartangamesbot" || command === "/spartan-games-notify") {
      // Parse content: "Subject | Message" or just "Message"
      // Let's assume the first line is subject, rest is message, OR split by some delimiter
      // For simplicity: Subject is "Slack Announcement", Message is content.
      // OR better: try to detect a split.

      let subject = "📢 Spartan Games Announcement";
      let message = content;

      // reuse the action logic?
      // The action takes FormData. Let's constructs it.
      const actionFormData = new FormData();
      actionFormData.append("subject", subject);
      actionFormData.append("message", message);
      actionFormData.append("sendSlack", "on"); // Echo back to slack?
      actionFormData.append("sendEmail", "on");

      // Execute the announcement
      // Note: verifySlackRequest ensures this is likely from an admin if we restrict the command visibility in Slack
      // But ideally we check the user_id against a list of allowed slack users.
      // For now, allow it.

      // We need a Service Role client to bypass Auth/RLS because this request
      // comes from Slack (no user cookies).
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!serviceRoleKey || !supabaseUrl) {
        console.error(
          "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL",
        );
        return new NextResponse(
          "Configuration error: Missing Service Role Key. Cannot send emails.",
          { status: 200 },
        );
      }

      // Create a Supabase client with the Service Role key
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Call the internal broadcast function directly
      const result = await internalBroadcastAnnouncement(
        supabase,
        subject,
        message,
        // undefined, // Image removed
        true, // Send to Slack (echo)
        true, // Send to Email
      );

      if (result.success) {
        return new NextResponse("Announcement sent! 🚀", { status: 200 });
      } else {
        return new NextResponse(
          `Failed to send: ${JSON.stringify(result.error)}`,
          { status: 200 },
        );
      }
    }

    return new NextResponse("Unknown command", { status: 200 });
  } catch (error) {
    console.error("Slack command error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
