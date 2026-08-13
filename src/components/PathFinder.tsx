"use client";

import { useEffect, useMemo, useState } from "react";
import type { CareerPath, Role, SkillBridge } from "@/lib/types";
import { EmptyState, LoadingBlock } from "./EmptyState";
import { PathDiagram } from "./PathDiagram";

type Props = {
  roles: Role[];
  disabled?: boolean;
};

export function PathFinder({ roles, disabled }: Props) {
  const domains = useMemo(
    () => Array.from(new Set(roles.map((r) => r.domain))).sort(),
    [roles],
  );

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  useEffect(() => {
    if (roles.length === 0) return;
    setFromId((prev) => prev || roles.find((r) => r.id === "role-fe")?.id || roles[0].id);
    setToId(
      (prev) =>
        prev || roles.find((r) => r.id === "role-ai")?.id || roles[1]?.id || roles[0].id,
    );
  }, [roles]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<CareerPath | null>(null);
  const [bridges, setBridges] = useState<SkillBridge[] | null>(null);

  async function run() {
    if (!fromId || !toId || disabled) return;
    setLoading(true);
    setError(null);
    setPath(null);
    setBridges(null);

    try {
      const [pathRes, bridgeRes] = await Promise.all([
        fetch(`/api/path?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`),
        fetch(`/api/bridges?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`),
      ]);

      const pathJson = await pathRes.json();
      const bridgeJson = await bridgeRes.json();

      if (!pathRes.ok) {
        setError(pathJson.error || "Could not find a path.");
      } else {
        setPath(pathJson.path);
      }

      if (bridgeRes.ok) {
        setBridges(bridgeJson.bridges || []);
      }
    } catch {
      setError("Something went wrong talking to the API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="pathfinder" className="panel rounded-[1.75rem] p-6 md:p-8">
      <div className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.18em] text-sage">Pathfinder</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-cream md:text-4xl">
          Trace a career through the graph
        </h2>
        <p className="mt-3 text-fog">
          Pick where you are and where you want to go. Lattice runs a multi-hop
          traversal on <code className="text-mist">TRANSITIONS_TO</code> edges,
          then surfaces bridge roles connected by overlapping skills.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="block text-sm text-fog">
          From role
          <select
            className="mt-2 w-full rounded-xl border border-fog/20 bg-ink px-4 py-3 text-cream outline-none focus:border-copper"
            value={fromId}
            disabled={disabled || roles.length === 0}
            onChange={(e) => setFromId(e.target.value)}
          >
            {domains.map((domain) => (
              <optgroup key={domain} label={domain}>
                {roles
                  .filter((r) => r.domain === domain)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="block text-sm text-fog">
          Target role
          <select
            className="mt-2 w-full rounded-xl border border-fog/20 bg-ink px-4 py-3 text-cream outline-none focus:border-copper"
            value={toId}
            disabled={disabled || roles.length === 0}
            onChange={(e) => setToId(e.target.value)}
          >
            {domains.map((domain) => (
              <optgroup key={domain} label={domain}>
                {roles
                  .filter((r) => r.domain === domain)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={run}
            disabled={disabled || loading || !fromId || !toId}
            className="w-full rounded-xl bg-copper px-6 py-3 font-semibold text-ink transition hover:bg-copper-bright disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
          >
            {loading ? "Traversing…" : "Find path"}
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {loading && <LoadingBlock label="Finding path" />}

        {!loading && error && (
          <EmptyState title="No path yet" body={error} />
        )}

        {!loading && !error && !path && (
          <EmptyState
            title="Ready when you are"
            body="Choose two roles to see transition hops and skill bridges."
          />
        )}

        {path && (
          <div className="space-y-5 fade-up">
            <PathDiagram
              steps={path.steps.map((step, i) => ({
                label: step.role.name,
                meta:
                  i < path.transitionHints.length
                    ? `${path.transitionHints[i].frequency} · ${path.transitionHints[i].difficulty}`
                    : step.role.level,
              }))}
            />

            <ol className="space-y-3">
              {path.steps.map((step, i) => (
                <li
                  key={`${step.role.id}-${i}`}
                  className="rounded-2xl border border-fog/15 bg-ink/40 px-4 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-[family-name:var(--font-display)] text-lg text-cream">
                      {step.role.name}
                    </p>
                    <span className="text-xs uppercase tracking-wider text-sage">
                      {step.role.level} · {step.role.domain}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-fog">{step.role.description}</p>
                  {i < path.transitionHints.length && (
                    <p className="mt-3 text-sm text-mist">
                      Next hop is{" "}
                      <span className="text-copper-bright">
                        {path.transitionHints[i].frequency}
                      </span>{" "}
                      and{" "}
                      <span className="text-copper-bright">
                        {path.transitionHints[i].difficulty}
                      </span>{" "}
                      difficulty
                      {step.viaSkills && step.viaSkills.length > 0 && (
                        <>
                          {" "}
                          · shared skills: {step.viaSkills.slice(0, 4).join(", ")}
                        </>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {bridges && (
          <div className="fade-up-delay">
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-cream">
              Skill bridges
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-fog">
              Roles that sit between your start and goal via overlapping{" "}
              <code className="text-mist">REQUIRES</code> skills — a 2-hop pattern
              that gets messy as self-joins in SQL.
            </p>

            {bridges.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No bridge roles"
                  body="These two roles do not share intermediate skill overlap in the seed graph."
                />
              </div>
            ) : (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {bridges.map((bridge) => (
                  <li
                    key={bridge.role.id}
                    className="rounded-2xl border border-fog/15 bg-ink/35 px-4 py-4"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-[family-name:var(--font-display)] text-lg text-cream">
                        {bridge.role.name}
                      </p>
                      <span className="text-xs text-sage">score {bridge.bridgeScore}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-wider text-fog">
                      Shared with start
                    </p>
                    <p className="text-sm text-mist">
                      {bridge.sharedWithFrom.slice(0, 5).join(", ")}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wider text-fog">
                      Shared with target
                    </p>
                    <p className="text-sm text-mist">
                      {bridge.sharedWithTo.slice(0, 5).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
