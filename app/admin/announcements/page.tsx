"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { sendAnnouncement } from "./actions";
import { toast } from "sonner";

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(false);
  const isSubmitting = React.useRef(false);

  async function handleSubmit(formData: FormData) {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    try {
      const result = await sendAnnouncement(formData);
      if (result.success) {
        toast.success("Announcement sent successfully! 🚀");
        // Reset form or redirect?
        // For now, maybe just clear the form?
        // window.location.reload(); // Simple way to clear
      } else {
        toast.error("Failed to send announcement: " + result.error);
        isSubmitting.current = false; // Reset on failure
      }
    } catch (e) {
      toast.error("An unexpected error occurred.");
      console.error(e);
      isSubmitting.current = false; // Reset on error
    } finally {
      setLoading(false);
      // We don't necessarily reset isSubmitting to false on success to prevent immediate resubmission
      // unless we clear the form. For now, let's reset it after a delay or let the reload handle it if added.
      setTimeout(() => {
        isSubmitting.current = false;
      }, 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Make an Announcement</CardTitle>
          <CardDescription>
            Send updates to the fraternity via Slack and Email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject / Title</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Event on Canavan Lawn at 3pm"
                required
              />
              <p className="text-sm text-muted-foreground">
                Used as the email subject and bolded header in Slack.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Details about the event, points, etc..."
                required
                className="min-h-[150px]"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox id="sendSlack" name="sendSlack" defaultChecked />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="sendSlack">Send to Slack</Label>
                  <p className="text-sm text-muted-foreground">
                    Post to the configured Slack channel.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox id="sendEmail" name="sendEmail" defaultChecked />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="sendEmail">Send Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Email all registered users.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Announcement
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
