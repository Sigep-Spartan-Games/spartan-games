export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-full max-w-sm rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 rounded-lg border bg-card p-5">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-4 h-7 w-32 rounded bg-muted/70" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-b p-4 last:border-b-0">
            <div className="h-4 w-full rounded bg-muted/70" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
