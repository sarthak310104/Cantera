"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NetworkGraph } from "@/components/NetworkGraph";
import { ManagerSearch } from "@/components/ManagerSearch";
import { CoachingCousinsPanel } from "@/components/CoachingCousinsPanel";
import { NodeInfoPanel } from "@/components/NodeInfoPanel";
import { Legend } from "@/components/Legend";
import { LEAGUES, filterGraphByCountry } from "@/lib/graph-filters";
import type { NetworkGraph as NetworkGraphType, NetworkNode } from "@/types";
import type { ManagerSummary } from "@/lib/queries";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

function HomeContent() {
  const searchParams = useSearchParams();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [fullGraph, setFullGraph] = useState<NetworkGraphType | null>(null);
  const [managers, setManagers] = useState<ManagerSummary[]>([]);
  const [focusedGraph, setFocusedGraph] = useState<NetworkGraphType | null>(null);
  const [focusedManagerId, setFocusedManagerId] = useState<string | null>(null);
  const [hops, setHops] = useState(3);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/network").then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load network");
        return res.json();
      }),
      fetch("/api/managers").then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load managers");
        return res.json();
      }),
    ])
      .then(([network, managerList]) => {
        setFullGraph(network);
        setManagers(managerList);
        setLoadState({ status: "ready" });
      })
      .catch((err) => setLoadState({ status: "error", message: err.message }));
  }, []);

  const focusManager = useCallback(
    async (managerId: string, hopsOverride?: number) => {
      setFocusedManagerId(managerId);
      const h = hopsOverride ?? hops;
      try {
        const res = await fetch(`/api/managers/${managerId}/lineage?hops=${h}`);
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load lineage");
        setFocusedGraph(await res.json());
      } catch {
        // Falls back to highlighting within the full graph if the lineage
        // fetch fails — the user still sees something rather than a dead end.
        setFocusedGraph(null);
      }
    },
    [hops]
  );

  // Supports deep links from /managers (e.g. "?manager=cruyff") — only runs
  // once the base data has loaded, and only reacts to the param actually
  // changing, so it doesn't refire on every unrelated re-render.
  useEffect(() => {
    const managerParam = searchParams.get("manager");
    if (loadState.status === "ready" && managerParam) {
      focusManager(managerParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadState.status, searchParams.get("manager")]);

  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      setSelectedNode(node);
      if (node.label === "Manager") {
        focusManager(node.id);
      }
    },
    [focusManager]
  );

  const clearFocus = () => {
    setFocusedManagerId(null);
    setFocusedGraph(null);
    setSelectedNode(null);
  };

  // The league filter only applies to the full-network view — once a
  // manager is focused, their lineage subgraph takes over regardless, which
  // is the right behavior (a focused lineage shouldn't silently hide part
  // of itself because of an unrelated filter).
  // Memoized so the object identity only changes when fullGraph or the
  // filter actually change — NetworkGraph re-runs its layout simulation
  // whenever the graph object reference changes, so without this, every
  // unrelated re-render (e.g. opening the info panel) would cause a jumpy
  // re-layout while a filter is active.
  const filteredFullGraph = useMemo(
    () => (fullGraph ? filterGraphByCountry(fullGraph, leagueFilter) : null),
    [fullGraph, leagueFilter]
  );
  const activeGraph = focusedGraph ?? filteredFullGraph;

  const stats = filteredFullGraph
    ? {
        managers: filteredFullGraph.nodes.filter((n) => n.label === "Manager").length,
        clubs: filteredFullGraph.nodes.filter((n) => n.label === "Club").length,
        nationalities: new Set(
          managers
            .filter((m) => filteredFullGraph.nodes.some((n) => n.id === m.id))
            .map((m) => m.nationality)
            .filter(Boolean)
        ).size,
        coachingLinks: filteredFullGraph.edges.filter((e) => e.type === "COACHED").length,
      }
    : null;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 28 }}>Cantera</h1>
            <p style={{ color: "var(--chalk-muted)", fontSize: 14, marginTop: 6 }}>
              Where coaches are grown, not appointed — a coaching-lineage graph.
            </p>
          </div>
          <Link href="/managers" style={{ fontSize: 13, color: "var(--chalk-muted)", whiteSpace: "nowrap" }}>
            Browse managers →
          </Link>
        </div>
        {stats && (
          <div
            style={{
              display: "flex",
              gap: 20,
              marginTop: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--chalk-muted)",
            }}
          >
            <span>
              <strong style={{ color: "var(--gold)" }}>{stats.managers}</strong> managers
            </span>
            <span>
              <strong style={{ color: "var(--gold)" }}>{stats.clubs}</strong> clubs
            </span>
            <span>
              <strong style={{ color: "var(--gold)" }}>{stats.nationalities}</strong> nationalities
            </span>
            <span>
              <strong style={{ color: "var(--gold)" }}>{stats.coachingLinks}</strong> coaching links
            </span>
          </div>
        )}
      </header>

      {loadState.status === "loading" && (
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--chalk-muted)" }}>
          Loading the pitch…
        </p>
      )}

      {loadState.status === "error" && (
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--rival)",
            borderRadius: 6,
            padding: 20,
            maxWidth: 480,
          }}
        >
          <h2 style={{ fontSize: 15, color: "var(--rival)" }}>Can&apos;t reach the database</h2>
          <p style={{ fontSize: 13, color: "var(--chalk-muted)", lineHeight: 1.6 }}>
            {loadState.message}. Check that your CognoDB instance is running and your{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>.env.local</code> credentials are correct.
          </p>
        </div>
      )}

      {loadState.status === "ready" && fullGraph && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              <ManagerSearch managers={managers} onSelect={(id) => focusManager(id)} />

              {focusedManagerId && (
                <>
                  <label style={{ fontSize: 12, color: "var(--chalk-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    Hops
                    <select
                      value={hops}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        setHops(h);
                        focusManager(focusedManagerId, h);
                      }}
                      style={{
                        background: "var(--panel)",
                        color: "var(--chalk)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "4px 8px",
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={clearFocus}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-strong)",
                      color: "var(--chalk)",
                      borderRadius: 4,
                      padding: "6px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ← Full network
                  </button>
                </>
              )}
            </div>

            {!focusedManagerId && (
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                <FilterChip active={leagueFilter === null} onClick={() => setLeagueFilter(null)}>
                  All leagues
                </FilterChip>
                {LEAGUES.map((league) => (
                  <FilterChip
                    key={league.country}
                    active={leagueFilter === league.country}
                    onClick={() => setLeagueFilter(league.country)}
                  >
                    {league.label}
                  </FilterChip>
                ))}
              </div>
            )}

            <Legend />
            {activeGraph && activeGraph.nodes.length === 0 ? (
              <p style={{ color: "var(--chalk-muted)", fontSize: 14 }}>
                {leagueFilter
                  ? "No managers found for this league in the current dataset."
                  : `No lineage found for this manager within ${hops} hops.`}
              </p>
            ) : (
              activeGraph && (
                <NetworkGraph
                  graph={activeGraph}
                  onNodeClick={handleNodeClick}
                  focusedNodeId={focusedManagerId}
                />
              )
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {selectedNode && activeGraph && (
              <NodeInfoPanel
                node={selectedNode}
                graph={activeGraph}
                managers={managers}
                onClose={() => setSelectedNode(null)}
              />
            )}
            <CoachingCousinsPanel />
          </div>
        </div>
      )}
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          <p style={{ fontFamily: "var(--font-mono)", color: "var(--chalk-muted)" }}>
            Loading the pitch…
          </p>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--garnet)" : "transparent",
        border: `1px solid ${active ? "var(--garnet)" : "var(--border-strong)"}`,
        color: "var(--chalk)",
        borderRadius: 20,
        padding: "5px 14px",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}