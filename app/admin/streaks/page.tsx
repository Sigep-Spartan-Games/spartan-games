import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { updateStreakSettings } from "./actions";

function StreaksSkeleton() {
    return (
        <div className="space-y-5">
            <div className="rounded-2xl border p-5">
                <div className="h-6 w-44 rounded bg-muted/40" />
                <div className="mt-2 h-4 w-72 rounded bg-muted/30" />
            </div>
            <div className="rounded-2xl border p-5">
                <div className="h-5 w-40 rounded bg-muted/35" />
                <div className="mt-3 h-10 w-full rounded bg-muted/20" />
            </div>
        </div>
    );
}

async function AdminStreaksInner({
    searchParams,
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    noStore();
    await requireAdmin("/admin/streaks");

    const sp = (await searchParams) ?? {};
    const ok = typeof sp.ok === "string" ? sp.ok : null;
    const err = typeof sp.error === "string" ? sp.error : null;

    const supabase = await createClient();
    const { data: settings } = await supabase
        .from("streak_settings")
        .select("*")
        .eq("id", true)
        .single();

    const dailyBonusIncrement = settings?.daily_bonus_increment ?? 1;
    const maxBonus = settings?.max_bonus ?? 10;

    return (
        <div className="space-y-5">
            {err && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <div className="font-medium">Error</div>
                    <div className="mt-1 text-muted-foreground">{err}</div>
                </div>
            )}

            {ok && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
                    <div className="font-medium">Success</div>
                    <div className="mt-1 text-muted-foreground">{ok}</div>
                </div>
            )}

            <div className="rounded-2xl border p-5 space-y-3">
                <div>
                    <h2 className="text-lg font-semibold">Streak Configuration</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure how streak bonuses are awarded.
                    </p>
                </div>

                <form action={updateStreakSettings} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <label htmlFor="daily_bonus_increment" className="text-sm font-medium">
                            Daily Bonus Increment
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Points added for each consecutive day (e.g., Day 1 = 1pt, Day 2 = 2pts).
                        </p>
                        <input
                            id="daily_bonus_increment"
                            name="daily_bonus_increment"
                            type="number"
                            min="0"
                            defaultValue={dailyBonusIncrement}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="max_bonus" className="text-sm font-medium">
                            Maximum Bonus
                        </label>
                        <p className="text-xs text-muted-foreground">
                            The maximum bonus points a team can earn from a streak per day.
                        </p>
                        <input
                            id="max_bonus"
                            name="max_bonus"
                            type="number"
                            min="0"
                            defaultValue={maxBonus}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        Save Settings
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function AdminStreaksPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    return (
        <Suspense fallback={<StreaksSkeleton />}>
            <AdminStreaksInner {...props} />
        </Suspense>
    );
}
