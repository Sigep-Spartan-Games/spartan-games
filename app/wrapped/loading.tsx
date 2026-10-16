export default function WrappedLoading() {
  return (
    <div className="fixed inset-0 z-50 min-h-[100dvh] animate-pulse bg-[#17121b] p-5 sm:p-8" aria-label="Loading Wrapped">
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <div className="h-1 w-full rounded-full bg-[#d9cce1]/15" />
        <div className="my-auto space-y-5">
          <div className="h-12 w-12 rounded-lg bg-[#d9cce1]/10" />
          <div className="h-14 max-w-3xl rounded-lg bg-[#d9cce1]/10" />
          <div className="h-7 max-w-md rounded-lg bg-[#d9cce1]/10" />
        </div>
      </div>
    </div>
  );
}
