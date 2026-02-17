"use server";

import { sendToSlack } from "@/lib/slack";
import { sendBulkEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/admin";

export async function sendAnnouncement(formData: FormData) {
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;
  const sendSlack = formData.get("sendSlack") === "on";
  const sendEmail = formData.get("sendEmail") === "on";

  if (!subject || !message) {
    return {
      success: false,
      error: "Subject and Message are required.",
    };
  }

  const errors: string[] = [];

  const imageFile = formData.get("image");
  let imageUrl: string | undefined;

  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    // 1. Upload Image
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Use admin client for upload
    const { supabase } = await requireAdmin("/admin/announcements");
    const { error: uploadError } = await supabase.storage
      .from("announcements")
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      errors.push("Failed to upload image.");
    } else {
      // 2. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("announcements").getPublicUrl(filePath);
      imageUrl = publicUrl;
    }
  }

  // 1. Send to Slack
  if (sendSlack) {
    try {
      await sendToSlack(subject, message, imageUrl);
    } catch (err) {
      console.warn("Slack warning:", err); // Warn instead of error for now
      // errors.push("Failed to send to Slack."); // Don't block success if just Slack fails (e.g. no webhook)
    }
  }

  // 2. Send to Email
  if (sendEmail) {
    try {
      // Use the same pattern as admin/settings/actions.ts
      // This uses the logged-in admin's client (cookies) to call an RPC function
      // responsible for fetching emails. This avoids needing the Service Role key directly here.
      // Note: We still need the Service Key in lib/email.ts if using it there? No, lib/email uses SMTP env vars.

      const { supabase } = await requireAdmin("/admin/announcements");

      // Fetch all user emails using the RPC function (same as settings/actions.ts)
      const { data, error } = await supabase.rpc("get_all_user_emails");

      if (error) {
        console.error("Error fetching user emails via RPC:", error.message);
        errors.push("Could not fetch user emails.");
      }

      const recipients = ["loffm300334@gmail.com"];
      console.log(
        "TEST MODE: Sending to " +
          recipients[0] +
          ". Real user count: " +
          (data?.length || 0),
      );

      // const recipients = (data ?? []).map(
      //   (row: { email: string }) => row.email,
      // );

      // FOR TESTING: Uncomment to send only to yourself
      // const recipients = ["loffm300334@gmail.com"];

      if (recipients.length > 0) {
        const imageHtml = imageUrl
          ? `<img src="${imageUrl}" alt="Announcement Image" style="max-width: 100%; height: auto; margin-top: 10px;" /><br/>`
          : "";

        const { errors: emailErrors } = await sendBulkEmail({
          recipients,
          subject,
          html: `<p>${message.replace(/\n/g, "<br/>")}</p>${imageHtml}`,
        });

        if (emailErrors.length > 0) {
          errors.push(...emailErrors);
        }
      }
    } catch (err) {
      console.error("Email error:", err);
      errors.push("Failed to send emails.");
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(", ") };
  }

  return { success: true };
}
