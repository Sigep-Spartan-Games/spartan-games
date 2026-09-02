// app/admin/scoring/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import ScoringEditor from "./scoring-editor";
import { StatusBanner } from "@/components/ui/status-banner";
import {
  upsertActivityRulesBulk,
  updateActivityRule,
  resetActivityRulesDefaults,
  addActivityRule,
  deleteActivityRule,
} from "./actions";

function ScoringSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border p-5">
        <div className="h-6 w-40 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-64 rounded bg-muted/30" />
      </div>

      <div className="rounded-lg border p-5">
        <div className="h-4 w-56 rounded bg-muted/40" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-muted/25" />
          ))}
        </div>
      </div>
    </div>
  );
}

async function AdminScoringInner({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Cache Components-compatible opt-out
  noStore();

  const sp = (await searchParams) ?? {};
  const errorParam = typeof sp.error === "string" ? sp.error : null;
  const savedParam = typeof sp.saved === "string" ? sp.saved : null;
  const resetParam = typeof sp.reset === "string" ? sp.reset : null;

  // This reads auth/cookies -> must be inside Suspense
  const { supabase } = await requireAdmin("/admin/scoring");

  const { data: rules, error: rulesError } = await supabase
    .from("activity_rules")
    .select("*")
    .order("activity_key");

  return (
    <div className="space-y-5">
      {errorParam && <StatusBanner variant="error" title="Admin error">{errorParam}</StatusBanner>}

      {savedParam && <StatusBanner variant="success" title="Saved">Scoring rules updated.</StatusBanner>}

      {resetParam && (
        <StatusBanner variant="success" title="Reset">
          Scoring rules reset to defaults (10 per unit, +15 teammate).
        </StatusBanner>
      )}

      {rulesError ? (
        <StatusBanner variant="error" title="Scoring rules unavailable">
          {rulesError.message}
        </StatusBanner>
      ) : (
        <ScoringEditor
          rules={(rules ?? []) as any}
          saveAllAction={upsertActivityRulesBulk}
          updateAction={updateActivityRule}
          resetDefaultsAction={resetActivityRulesDefaults}
          addAction={addActivityRule}
          deleteAction={deleteActivityRule}
        />
      )}
    </div>
  );
}

export default function AdminScoringPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<ScoringSkeleton />}>
      <AdminScoringInner {...props} />
    </Suspense>
  );
}
