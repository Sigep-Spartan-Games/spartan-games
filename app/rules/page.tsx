export default function RulesPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Game Rules</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    How to play Spartan Games and win the season.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4 rounded-2xl border p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                        1
                    </div>
                    <h2 className="text-xl font-semibold">Join a Team</h2>
                    <p className="text-muted-foreground">
                        Teams consist of 2 Spartans. You can create a new team or join an
                        existing one using an invite code. Pair up with someone who will
                        push you to hit your goals.
                    </p>
                </div>

                <div className="space-y-4 rounded-2xl border p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                        2
                    </div>
                    <h2 className="text-xl font-semibold">Weekly Competition</h2>
                    <p className="text-muted-foreground">
                        The season is divided into weekly matchups (Monday to Monday). Points
                        accumulate during the week to determine the weekly winner. At the end
                        of the week, points reset, and a new battle begins.
                    </p>
                </div>

                <div className="space-y-4 rounded-2xl border p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                        3
                    </div>
                    <h2 className="text-xl font-semibold">Scoring Points</h2>
                    <p className="text-muted-foreground">
                        Submit your activities daily via the "Submit" tab. Activities vary
                        from gym workouts and running to mental challenges. Each activity has
                        a point value, and some have caps on how often you can do them.
                    </p>
                </div>

                <div className="space-y-4 rounded-2xl border p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                        4
                    </div>
                    <h2 className="text-xl font-semibold">The Championship</h2>
                    <p className="text-muted-foreground">
                        While every week has its own winner, your consistent performance
                        counts. Weekly wins and total points accumulated throughout the
                        season determine the ultimate Spartan Games Champions.
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-6">
                <h3 className="mb-4 text-lg font-semibold">Pro Tips</h3>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                    <li>
                        <strong className="text-foreground">Teammate Bonus:</strong> Do
                        activities together with your teammate to earn bonus points per
                        submission.
                    </li>
                    <li>
                        <strong className="text-foreground">Consistency is Key:</strong> Even
                        if you don't win the week, your points contribute to your season
                        total.
                    </li>
                    <li>
                        <strong className="text-foreground">Honesty Policy:</strong> The games
                        rely on the honor system. Be true to yourself and your brothers.
                    </li>
                </ul>
            </div>
        </div>
    );
}
