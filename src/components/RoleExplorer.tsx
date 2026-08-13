"use client";

import { useEffect, useMemo, useState } from "react";
import type { NeighborResult, Role } from "@/lib/types";
import { EmptyState, LoadingBlock } from "./EmptyState";

type Props = {
  roles: Role[];
  disabled?: boolean;
};

export function RoleExplorer({ roles, disabled }: Props) {
  const domains = useMemo(
    () => Array.from(new Set(roles.map((r) => r.domain))).sort(),
    [roles],
  );
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NeighborResult | null>(null);

  useEffect(() => {
    if (roles.length === 0) return;
    setRoleId((prev) => prev || roles.find((r) => r.id === "role-be")?.id || roles[0].id);
  }, [roles]);

  useEffect(() => {
    if (!roleId || disabled) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/neighbor?roleId=${encodeURIComponent(roleId)}`,
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setData(null);
          setError(json.error || "Could not load role.");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError("Something went wrong talking to the API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [roleId, disabled]);

  return (
    <section id="explore" className="panel rounded-[1.75rem] p-6 md:p-8">
      <div className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.18em] text-sage">Explore</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-cream md:text-4xl">
          Neighborhood of a role
        </h2>
        <p className="mt-3 text-fog">
          See required skills, people who held the role, and adjacent roles that
          share the same skill nodes.
        </p>
      </div>

      <label className="mt-6 block max-w-md text-sm text-fog">
        Role
        <select
          className="mt-2 w-full rounded-xl border border-fog/20 bg-ink px-4 py-3 text-cream outline-none focus:border-copper"
          value={roleId}
          disabled={disabled || roles.length === 0}
          onChange={(e) => setRoleId(e.target.value)}
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

      <div className="mt-8">
        {loading && <LoadingBlock label="Loading role neighborhood" />}
        {!loading && error && <EmptyState title="Could not explore" body={error} />}
        {!loading && !error && !data && (
          <EmptyState title="Pick a role" body="Role details will appear here." />
        )}

        {data && !loading && (
          <div className="grid gap-6 lg:grid-cols-3 fade-up">
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border border-fog/15 bg-ink/40 px-4 py-4">
                <p className="font-[family-name:var(--font-display)] text-2xl text-cream">
                  {data.role.name}
                </p>
                <p className="mt-1 text-sm text-sage">
                  {data.role.level} · {data.role.domain}
                </p>
                <p className="mt-3 text-sm text-fog">{data.role.description}</p>
              </div>

              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl text-cream">
                  Skills
                </h3>
                {data.topSkills.length === 0 ? (
                  <p className="mt-2 text-sm text-fog">No skills linked.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {data.topSkills.map(({ skill, importance }) => (
                      <li
                        key={skill.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-fog/10 px-3 py-2 text-sm"
                      >
                        <span className="text-mist">{skill.name}</span>
                        <span className="text-xs uppercase tracking-wider text-sage">
                          {importance}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-xl text-cream">
                Related roles
              </h3>
              {data.relatedRoles.length === 0 ? (
                <EmptyState title="No neighbors" body="No overlapping skills found." />
              ) : (
                <ul className="space-y-3">
                  {data.relatedRoles.map((item) => (
                    <li
                      key={item.role.id}
                      className="rounded-2xl border border-fog/15 bg-ink/35 px-4 py-3"
                    >
                      <button
                        type="button"
                        className="text-left font-[family-name:var(--font-display)] text-lg text-cream hover:text-copper-bright"
                        onClick={() => setRoleId(item.role.id)}
                      >
                        {item.role.name}
                      </button>
                      <p className="mt-1 text-xs text-sage">
                        {item.score} shared skill{item.score === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm text-fog">
                        {item.sharedSkills.slice(0, 4).join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-xl text-cream">
                People
              </h3>
              {data.people.length === 0 ? (
                <EmptyState
                  title="No people yet"
                  body="Seed data has no person linked to this role."
                />
              ) : (
                <ul className="space-y-3">
                  {data.people.map(({ person, company }) => (
                    <li
                      key={person.id}
                      className="rounded-2xl border border-fog/15 bg-ink/35 px-4 py-3"
                    >
                      <p className="font-[family-name:var(--font-display)] text-lg text-cream">
                        {person.name}
                      </p>
                      <p className="text-sm text-fog">{person.headline}</p>
                      {company && (
                        <p className="mt-1 text-xs uppercase tracking-wider text-sage">
                          {company}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
