"use client";

import type { GraphStats } from "@/lib/types";

type Props = {
  status: "loading" | "ok" | "error";
  message?: string;
  stats?: GraphStats | null;
};

export function StatusBanner({ status, message, stats }: Props) {
  if (status === "loading") {
    return (
      <div className="panel rounded-2xl px-4 py-3 text-sm text-fog">
        Checking CognoDB connection…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-cream"
      >
        <p className="font-[family-name:var(--font-display)] text-base text-danger">
          Database unreachable
        </p>
        <p className="mt-1 text-fog">{message}</p>
      </div>
    );
  }

  return (
    <div className="panel flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl px-4 py-3 text-sm text-fog">
      <span className="inline-flex items-center gap-2 text-mist">
        <span className="h-2 w-2 rounded-full bg-leaf shadow-[0_0_12px_rgba(61,122,98,0.8)]" />
        CognoDB connected
      </span>
      {stats && (
        <>
          <span>{stats.roles} roles</span>
          <span>{stats.skills} skills</span>
          <span>{stats.people} people</span>
          <span>{stats.relationships} relationships</span>
        </>
      )}
    </div>
  );
}
