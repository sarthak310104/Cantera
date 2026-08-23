"use client";

import { useCallback, useEffect, useState } from "react";
import { NetworkGraph } from "@/components/NetworkGraph";
import { ManagerSearch } from "@/components/ManagerSearch";
import { CoachingCousinsPanel } from "@/components/CoachingCousinsPanel";
import type { NetworkGraph as NetworkGraphType, NetworkNode } from "@/types";
import type { ManagerSummary } from "@/lib/queries";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

export default function HomePage() {
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [fullGraph, setFullGraph] = useState<NetworkGraphType | null>(null);
  const [managers, setManagers] = useState<ManagerSummary[]>([]);
  const [focusedGraph, setFocusedGraph] = useState<NetworkGraphType | null>(null);
  const [focusedManagerId, setFocusedManagerId] = useState<string | null>(null);
  const [hops, setHops] = useState(3);

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

  const handleNodeClick = useCallback(
    (node: NetworkNode) => {
      if (node.label === "Manager") {
        focusManager(node.id);
      }
    },
    [focusManager]
  );

  const clearFocus = () => {
    setFocusedManagerId(null);
    setFocusedGraph(null);
  };

  const activeGraph = focusedGraph ?? fullGraph;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28 }}>Cantera</h1>
        <p style={{ color: "var(--chalk-muted)", fontSize: 14, marginTop: 6 }}>
          Where coaches are grown, not appointed — a coaching-lineage graph.
        </p>
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

            {activeGraph && activeGraph.nodes.length === 0 ? (
              <p style={{ color: "var(--chalk-muted)", fontSize: 14 }}>
                No lineage found for this manager within {hops} hops.
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

          <CoachingCousinsPanel />
        </div>
      )}
    </main>
  );
}