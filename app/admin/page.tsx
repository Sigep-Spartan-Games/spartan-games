export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage Spartan Games settings.
        </p>
      </div>

      {/* Scoring section */}
      <div className="rounded-2xl border p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Scoring</h2>
          <p className="text-sm text-muted-foreground">
            Point values are controlled by admins (team members can’t edit
            points).
          </p>
        </div>

        <div className="rounded-xl border p-4 text-sm space-y-2">
          <div className="font-medium">Current defaults</div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>
              Each activity scores{" "}
              <span className="font-medium text-foreground">
                10 points per unit
              </span>
              .
            </li>
            <li>
              Doing an activity with your teammate adds{" "}
              <span className="font-medium text-foreground">
                +15 bonus points
              </span>
              .
            </li>
            <li>
              Admins can change these values per activity (stored in{" "}
              <code className="px-1 py-0.5 rounded bg-muted">
                activity_rules
              </code>
              ).
            </li>
          </ul>
        </div>

        <div className="rounded-xl border p-4 text-sm">
          <div className="font-medium">Next to build</div>
          <div className="mt-1 text-muted-foreground">
            A table here that lists each activity and allows updating:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <span className="font-medium text-foreground">
                  points_per_unit
                </span>
              </li>
              <li>
                <span className="font-medium text-foreground">
                  teammate_bonus
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Other admin placeholders */}
      <div className="space-y-3">
        {[
          "Approve/reject submissions (optional)",
          "Manage teams and seasons",
          "Export results",
        ].map((item) => (
          <div key={item} className="rounded-2xl border p-4 text-sm">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
