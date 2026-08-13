export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      <div className="skeleton h-4 w-2/5 rounded-full" />
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="skeleton h-24 w-full rounded-2xl" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-fog/25 px-5 py-8 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg text-mist">{title}</p>
      <p className="mt-2 text-sm text-fog">{body}</p>
    </div>
  );
}
