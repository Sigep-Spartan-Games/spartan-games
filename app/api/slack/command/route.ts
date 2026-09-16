import { type NextRequest } from "next/server";

import { handleSlackAnnouncementCommand } from "@/lib/slack-command";

export async function POST(request: NextRequest) {
  return handleSlackAnnouncementCommand(request);
}
