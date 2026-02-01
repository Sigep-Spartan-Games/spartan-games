// app/admin/scoring/page.tsx
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import ScoringEditor from "./scoring-editor";
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
      <div className="rounded-2xl border p-5">
        <div className="h-6 w-40 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-64 rounded bg-muted/30" />
      </div>

      <div className="rounded-2xl border p-5">
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
      {errorParam && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Admin error</div>
          <div className="mt-1 text-muted-foreground">{errorParam}</div>
        </div>
      )}

      {savedParam && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <div className="font-medium">Saved</div>
          <div className="mt-1 text-muted-foreground">
            Scoring rules updated.
          </div>
        </div>
      )}

      {resetParam && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <div className="font-medium">Reset</div>
          <div className="mt-1 text-muted-foreground">
            Scoring rules reset to defaults (10 per unit, +15 teammate).
          </div>
        </div>
      )}

      {rulesError ? (
        <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
          Error loading rules: {rulesError.message}
        </div>
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
