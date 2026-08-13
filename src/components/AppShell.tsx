"use client";

import { useEffect, useState } from "react";
import type { ApiErrorBody, GraphStats, Role } from "@/lib/types";
import { PathFinder } from "./PathFinder";
import { RoleExplorer } from "./RoleExplorer";
import { StatusBanner } from "./StatusBanner";

export function AppShell() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>();
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [healthRes, rolesRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/roles"),
        ]);

        const health = await healthRes.json();
        const rolesJson = await rolesRes.json();

        if (cancelled) return;

        if (!healthRes.ok) {
          const body = health as ApiErrorBody;
          setStatus("error");
          setMessage(body.error);
          return;
        }

        setStats(health.stats);
        setRoles(rolesJson.roles || []);
        setStatus("ok");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Could not reach the Lattice API.");
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const disabled = status !== "ok";

  return (
    <div className="ambient relative min-h-screen">
      <div className="grain" aria-hidden />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-6 md:px-8">
        <header className="flex items-center justify-between gap-4 fade-up">
          <a
            href="#top"
            className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-cream md:text-3xl"
          >
            Lattice
          </a>
          <nav className="flex items-center gap-4 text-sm text-fog">
            <a href="#pathfinder" className="hover:text-cream">
              Pathfinder
            </a>
            <a href="#explore" className="hover:text-cream">
              Explore
            </a>
            <a href="#why" className="hover:text-cream">
              Why graph
            </a>
          </nav>
        </header>

        <main id="top" className="mt-10 space-y-10 md:mt-14 md:space-y-14">
          <section className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="fade-up">
              <p className="text-sm uppercase tracking-[0.2em] text-sage">
                Career graph explorer
              </p>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-[0.95] text-cream md:text-7xl">
                Lattice
              </h1>
              <p className="mt-5 max-w-xl text-lg text-fog md:text-xl">
                Careers are not ladders — they are networks of skills, roles, and
                people. Lattice maps those connections on CognoDB so you can find
                a path worth walking.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#pathfinder"
                  className="rounded-xl bg-copper px-5 py-3 font-semibold text-ink transition hover:bg-copper-bright"
                >
                  Find a path
                </a>
                <a
                  href="#explore"
                  className="rounded-xl border border-fog/30 px-5 py-3 text-mist transition hover:border-mist hover:text-cream"
                >
                  Explore roles
                </a>
              </div>
            </div>

            <div className="fade-up-delay">
              <HeroGraph />
            </div>
          </section>

          <div className="fade-up-delay-2">
            <StatusBanner status={status} message={message} stats={stats} />
          </div>

          <PathFinder roles={roles} disabled={disabled} />
          <RoleExplorer roles={roles} disabled={disabled} />

          <section id="why" className="panel rounded-[1.75rem] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.18em] text-sage">
              Why a graph database?
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-cream md:text-4xl">
              Relationships are the product
            </h2>
            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <WhyCard
                title="Variable-length paths"
                body="“How do I go from Frontend Engineer to AI Engineer in ≤6 hops?” is a native shortestPath traversal — not a fragile recursive CTE."
              />
              <WhyCard
                title="Skill bridges"
                body="Finding roles that connect two careers via shared skills is a 2-hop pattern over REQUIRES. In SQL it becomes repeated self-joins and set arithmetic."
              />
              <WhyCard
                title="Neighborhood queries"
                body="Related roles, people, and skills fan out from one node. The model stays readable as the graph grows; join tables do not."
              />
            </div>
          </section>
        </main>

        <footer className="mt-16 border-t border-fog/15 pt-6 text-sm text-fog">
          <p>
            Lattice · CognoDB take-home · openCypher over Bolt with the official
            Neo4j JavaScript driver.
          </p>
        </footer>
      </div>
    </div>
  );
}

function WhyCard({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-display)] text-xl text-cream">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-fog">{body}</p>
    </div>
  );
}

function HeroGraph() {
  return (
    <div className="panel relative overflow-hidden rounded-[1.75rem] p-4 md:p-5">
      <svg viewBox="0 0 420 320" className="h-auto w-full" aria-hidden>
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3d7a62" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#071512" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="420" height="320" fill="url(#glow)" />

        <line x1="70" y1="160" x2="160" y2="90" className="path-line" stroke="#c9854a" strokeWidth="1.5" />
        <line x1="160" y1="90" x2="250" y2="140" className="path-line" stroke="#c9854a" strokeWidth="1.5" />
        <line x1="250" y1="140" x2="340" y2="80" className="path-line" stroke="#c9854a" strokeWidth="1.5" />
        <line x1="160" y1="90" x2="210" y2="220" stroke="#6f9a86" strokeWidth="1.2" opacity="0.7" />
        <line x1="250" y1="140" x2="210" y2="220" stroke="#6f9a86" strokeWidth="1.2" opacity="0.7" />
        <line x1="210" y1="220" x2="320" y2="250" stroke="#6f9a86" strokeWidth="1.2" opacity="0.7" />
        <line x1="70" y1="160" x2="120" y2="250" stroke="#6f9a86" strokeWidth="1.2" opacity="0.55" />

        <HeroNode x={70} y={160} label="Frontend" />
        <HeroNode x={160} y={90} label="Full-stack" />
        <HeroNode x={250} y={140} label="ML Eng" />
        <HeroNode x={340} y={80} label="AI Eng" accent />
        <HeroNode x={210} y={220} label="Python" small />
        <HeroNode x={320} y={250} label="RAG" small />
        <HeroNode x={120} y={250} label="React" small />
      </svg>
    </div>
  );
}

function HeroNode({
  x,
  y,
  label,
  small,
  accent,
}: {
  x: number;
  y: number;
  label: string;
  small?: boolean;
  accent?: boolean;
}) {
  const r = small ? 18 : 28;
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={accent ? "#c9854a" : "#0e2420"}
        stroke={accent ? "#e0a56a" : "#a8c4b8"}
        strokeWidth="1.5"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill={accent ? "#071512" : "#f3f7f4"}
        fontSize={small ? 8 : 10}
        fontFamily="var(--font-body)"
      >
        {label}
      </text>
    </g>
  );
}
