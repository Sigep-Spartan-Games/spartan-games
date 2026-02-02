"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

export function RulesModal() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/20 bg-amber-200/5 px-3 py-1.5 text-sm font-medium text-amber-200/80 transition-colors hover:bg-amber-200/10 hover:text-amber-200"
            >
                <Info className="h-4 w-4" />
                <span>Rules</span>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent onClose={() => setOpen(false)}>
                    <DialogHeader>
                        <DialogTitle>Game Rules</DialogTitle>
                        <DialogDescription>
                            How to play Spartan Games and win the season.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 text-sm">
                        {/* Rule 1 */}
                        <div className="flex gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                                1
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-100">Join a Team</h3>
                                <p className="mt-1 text-muted-foreground">
                                    Teams consist of 2 Spartans. Pair up with someone who will
                                    push you to hit your goals.
                                </p>
                            </div>
                        </div>

                        {/* Rule 2 */}
                        <div className="flex gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                                2
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-100">Weekly Competition</h3>
                                <p className="mt-1 text-muted-foreground">
                                    The season is divided into weekly matchups (Monday to Monday).
                                    Points reset each week.
                                </p>
                            </div>
                        </div>

                        {/* Rule 3 */}
                        <div className="flex gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                                3
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-100">Scoring Points</h3>
                                <p className="mt-1 text-muted-foreground">
                                    Submit activities daily. Each activity has a point value.
                                    Doing activities with your teammate earns bonus points.
                                </p>
                            </div>
                        </div>

                        {/* Rule 4 */}
                        <div className="flex gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                                4
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-100">The Championship</h3>
                                <p className="mt-1 text-muted-foreground">
                                    Weekly wins and total points determine the ultimate Spartan
                                    Games Champions.
                                </p>
                            </div>
                        </div>

                        {/* Pro Tips */}
                        <div className="rounded-xl border border-amber-200/10 bg-muted/20 p-4">
                            <h4 className="mb-2 font-semibold text-amber-100">Pro Tips</h4>
                            <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
                                <li>
                                    <strong className="text-foreground">Teammate Bonus:</strong> Do
                                    activities together for bonus points.
                                </li>
                                <li>
                                    <strong className="text-foreground">Consistency:</strong> Even
                                    if you don&apos;t win, points count toward the season.
                                </li>
                                <li>
                                    <strong className="text-foreground">Honesty:</strong> The games
                                    rely on the honor system.
                                </li>
                            </ul>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
