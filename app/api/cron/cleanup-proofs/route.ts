import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron authentication is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const dateKey = new Date().toISOString().slice(0, 10);
  const deduplicationKey = `submission-proofs:${dateKey}`;
  const { data: existing } = await supabase
    .from("job_runs")
    .select("id, status, attempt_count")
    .eq("job_type", "cleanup_proofs")
    .eq("deduplication_key", deduplicationKey)
    .maybeSingle();

  if (existing?.status === "completed") {
    return NextResponse.json({ success: true, status: "already_completed" });
  }

  const { data: job, error: jobError } = await supabase
    .from("job_runs")
    .upsert(
      {
        job_type: "cleanup_proofs",
        deduplication_key: deduplicationKey,
        status: "running",
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
        attempt_count: (existing?.attempt_count ?? 0) + 1,
      },
      { onConflict: "job_type,deduplication_key" },
    )
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? "Could not create job run" }, { status: 500 });
  }

  try {
    const { data: attachments, error: fetchError } = await supabase
      .from("submission_attachments")
      .select("id, bucket_id, object_path")
      .is("purged_at", null)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: true })
      .limit(250);
    if (fetchError) throw new Error(fetchError.message);

    let purged = 0;
    const byBucket = new Map<string, typeof attachments>();
    for (const attachment of attachments ?? []) {
      const rows = byBucket.get(attachment.bucket_id) ?? [];
      rows.push(attachment);
      byBucket.set(attachment.bucket_id, rows);
    }

    for (const [bucket, rows] of byBucket) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(rows.map((row) => row.object_path));

      if (removeError) {
        await supabase
          .from("submission_attachments")
          .update({ last_cleanup_error: removeError.message })
          .in("id", rows.map((row) => row.id));
        continue;
      }

      const { error: markError } = await supabase
        .from("submission_attachments")
        .update({ purged_at: new Date().toISOString(), last_cleanup_error: null })
        .in("id", rows.map((row) => row.id));
      if (markError) throw new Error(markError.message);
      purged += rows.length;
    }

    await supabase
      .from("job_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        metadata: { candidates: attachments?.length ?? 0, purged },
      })
      .eq("id", job.id);

    return NextResponse.json({ success: true, candidates: attachments?.length ?? 0, purged });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cleanup error";
    await supabase
      .from("job_runs")
      .update({ status: "failed", completed_at: new Date().toISOString(), error_message: message })
      .eq("id", job.id);
    return NextResponse.json({ error: "Proof cleanup failed", details: message }, { status: 500 });
  }
}
