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
import { Loader2, Mail, MessageSquareText, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
        toast.success("Announcement sent successfully!");
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
      <PageHeader
        title="Announcements"
        description="Send competition updates through the configured Slack channel and email list."
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Make an announcement</CardTitle>
          <CardDescription>
            Choose the delivery channels and compose your message.
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

            <fieldset>
              <legend className="app-label mb-3">Delivery channels</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  htmlFor="sendSlack"
                  className="flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border bg-muted/15 p-4 transition-colors hover:bg-muted/30"
                >
                  <Checkbox id="sendSlack" name="sendSlack" defaultChecked />
                  <MessageSquareText aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                  <span className="space-y-1 leading-none">
                    <span className="block text-sm font-medium">Send to Slack</span>
                    <span className="block text-sm leading-relaxed text-muted-foreground">
                      Post to the configured Slack channel.
                    </span>
                  </span>
                </label>

                <label
                  htmlFor="sendEmail"
                  className="flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border bg-muted/15 p-4 transition-colors hover:bg-muted/30"
                >
                  <Checkbox id="sendEmail" name="sendEmail" defaultChecked />
                  <Mail aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                  <span className="space-y-1 leading-none">
                    <span className="block text-sm font-medium">Send Email</span>
                    <span className="block text-sm leading-relaxed text-muted-foreground">
                      Email all registered users.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <Button
              type="submit"
              disabled={loading}
              variant="competition"
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!loading && <Send aria-hidden="true" className="h-4 w-4" />}
              Send Announcement
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
