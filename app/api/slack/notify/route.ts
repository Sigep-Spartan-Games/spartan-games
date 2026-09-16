import { type NextRequest } from "next/server";

import { handleSlackAnnouncementCommand } from "@/lib/slack-command";

// Backward-compatible alias for Slack configurations that still target /notify.
export async function POST(request: NextRequest) {
  return handleSlackAnnouncementCommand(request);
}
