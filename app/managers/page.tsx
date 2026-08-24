"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ManagerSummary } from "@/lib/queries";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; managers: ManagerSummary[] };

export default function ManagersPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    fetch("/api/managers")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load managers");
        return res.json();
      })
      .then((managers: ManagerSummary[]) => setState({ status: "ready", managers }))
      .catch((err) => setState({ status: "error", message: err.message }));
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <Link href="/" style={{ fontSize: 13, color: "var(--chalk-muted)" }}>
        ← Back to network
      </Link>
      <h1 style={{ fontSize: 24, marginTop: 12, marginBottom: 4 }}>Managers</h1>
      <p style={{ color: "var(--chalk-muted)", fontSize: 14, marginBottom: 24 }}>
        Every manager in the dataset, browsable without the graph.
      </p>

      {state.status === "loading" && (
        <p style={{ fontFamily: "var(--font-mono)", color: "var(--chalk-muted)" }}>Loading…</p>
      )}

      {state.status === "error" && (
        <p style={{ color: "var(--rival)" }}>Couldn&apos;t load managers: {state.message}</p>
      )}

      {state.status === "ready" && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--panel)", textAlign: "left" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Nationality</th>
                <th style={thStyle}>Born</th>
                <th style={thStyle}>Clubs managed</th>
                <th style={thStyle}>Proteges coached</th>
              </tr>
            </thead>
            <tbody>
              {state.managers.map((m, i) => (
                <tr key={m.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                  <td style={tdStyle}>
                    <Link href={`/?manager=${m.id}`} style={{ color: "var(--chalk)" }}>
                      {m.name}
                    </Link>
                  </td>
                  <td style={tdStyle}>{m.nationality ?? "—"}</td>
                  <td style={tdStyle}>{m.bornYear ?? "—"}</td>
                  <td style={tdStyle}>{m.clubCount}</td>
                  <td style={tdStyle}>{m.protegeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontWeight: 500, color: "var(--chalk-muted)" };
const tdStyle: React.CSSProperties = { padding: "10px 14px" };