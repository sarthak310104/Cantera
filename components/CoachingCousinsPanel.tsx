"use client";

import { useEffect, useState } from "react";
import type { CoachingCousinPair } from "@/lib/queries";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pairs: CoachingCousinPair[] };

export function CoachingCousinsPanel() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coaching-cousins")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
        return res.json();
      })
      .then((pairs: CoachingCousinPair[]) => {
        if (!cancelled) setState({ status: "ready", pairs });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "16px 18px",
        width: 280,
      }}
    >
      <h2 style={{ fontSize: 14, marginBottom: 4 }}>Coaching cousins</h2>
      <p style={{ fontSize: 12, color: "var(--chalk-muted)", marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
        Managers connected through shared coaching influence who never worked at the same club.
      </p>

      {state.status === "loading" && (
        <p style={{ fontSize: 13, color: "var(--chalk-muted)", fontFamily: "var(--font-mono)" }}>
          Tracing lineage…
        </p>
      )}

      {state.status === "error" && (
        <p style={{ fontSize: 13, color: "var(--rival)" }}>Couldn&apos;t load this: {state.message}</p>
      )}

      {state.status === "ready" && state.pairs.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--chalk-muted)" }}>No pairs found in the current dataset.</p>
      )}

      {state.status === "ready" && state.pairs.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {state.pairs.map((pair, i) => (
            <li key={i} style={{ fontSize: 13, borderTop: i > 0 ? "1px solid var(--border)" : "none", paddingTop: i > 0 ? 10 : 0 }}>
              <div>
                <strong style={{ fontWeight: 500 }}>{pair.managerA}</strong>
                {" & "}
                <strong style={{ fontWeight: 500 }}>{pair.managerB}</strong>
              </div>
              <div style={{ color: "var(--chalk-muted)", fontSize: 12, marginTop: 2 }}>
                via {pair.sharedInfluence}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}