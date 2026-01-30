// app/admin/scoring/page.tsx
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import ScoringEditor from "./scoring-editor";
import { upsertActivityRulesBulk, resetActivityRulesDefaults } from "./actions";

export default async function AdminScoringPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  noStore();

  const sp = (await searchParams) ?? {};
  const errorParam = typeof sp.error === "string" ? sp.error : null;
  const savedParam = typeof sp.saved === "string" ? sp.saved : null;
  const resetParam = typeof sp.reset === "string" ? sp.reset : null;

  const { supabase } = await requireAdmin("/admin/scoring");

  const { data: rules, error: rulesError } = await supabase
    .from("activity_rules")
    .select("activity_key, points_per_unit, teammate_bonus")
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
          resetDefaultsAction={resetActivityRulesDefaults}
        />
      )}
    </div>
  );
}
