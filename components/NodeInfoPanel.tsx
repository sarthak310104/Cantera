"use client";

import type { NetworkGraph, NetworkNode } from "@/types";
import type { ManagerSummary } from "@/lib/queries";

type Props = {
  node: NetworkNode;
  graph: NetworkGraph;
  managers: ManagerSummary[];
  onClose: () => void;
};

export function NodeInfoPanel({ node, graph, managers, onClose }: Props) {
  const nameById = new Map(graph.nodes.map((n) => [n.id, n.name]));
  const managerExtra = managers.find((m) => m.id === node.id);

  const clubsManaged = graph.edges
    .filter((e) => e.type === "MANAGED_AT" && e.sourceId === node.id)
    .map((e) => ({ club: nameById.get(e.targetId), years: e.years }));

  const coached = graph.edges
    .filter((e) => e.type === "COACHED" && e.sourceId === node.id)
    .map((e) => nameById.get(e.targetId))
    .filter(Boolean);

  const coachedUnder = graph.edges
    .filter((e) => e.type === "COACHED" && e.targetId === node.id)
    .map((e) => nameById.get(e.sourceId))
    .filter(Boolean);

  const tactics = graph.edges
    .filter((e) => e.type === "EMPLOYS_TACTIC" && e.sourceId === node.id)
    .map((e) => nameById.get(e.targetId))
    .filter(Boolean);

  const rivals = graph.edges
    .filter((e) => e.type === "RIVAL_OF" && e.sourceId === node.id)
    .map((e) => nameById.get(e.targetId))
    .filter(Boolean);

  const managersHere = graph.edges
    .filter((e) => e.type === "MANAGED_AT" && e.targetId === node.id)
    .map((e) => ({ name: nameById.get(e.sourceId), years: e.years }));

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h2 style={{ fontSize: 15, marginBottom: 2 }}>{node.name}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--chalk-muted)",
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <p style={{ fontSize: 11, color: "var(--chalk-muted)", marginTop: 2, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {node.label}
      </p>

      <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 10 }}>
        {managerExtra?.nationality && (
          <div>
            <span style={{ color: "var(--chalk-muted)" }}>Nationality: </span>
            {managerExtra.nationality}
            {managerExtra.bornYear ? ` · b. ${managerExtra.bornYear}` : ""}
          </div>
        )}

        {clubsManaged.length > 0 && (
          <div>
            <div style={{ color: "var(--chalk-muted)", marginBottom: 2 }}>Managed at</div>
            {clubsManaged.map((c, i) => (
              <div key={i}>
                {c.club} <span style={{ color: "var(--chalk-muted)", fontSize: 11 }}>({c.years})</span>
              </div>
            ))}
          </div>
        )}

        {managersHere.length > 0 && (
          <div>
            <div style={{ color: "var(--chalk-muted)", marginBottom: 2 }}>Managed by</div>
            {managersHere.map((m, i) => (
              <div key={i}>
                {m.name} <span style={{ color: "var(--chalk-muted)", fontSize: 11 }}>({m.years})</span>
              </div>
            ))}
          </div>
        )}

        {coachedUnder.length > 0 && (
          <div>
            <div style={{ color: "var(--chalk-muted)", marginBottom: 2 }}>Coached under</div>
            {coachedUnder.join(", ")}
          </div>
        )}

        {coached.length > 0 && (
          <div>
            <div style={{ color: "var(--chalk-muted)", marginBottom: 2 }}>Coached</div>
            {coached.join(", ")}
          </div>
        )}

        {tactics.length > 0 && (
          <div>
            <div style={{ color: "var(--chalk-muted)", marginBottom: 2 }}>Tactics</div>
            {tactics.join(", ")}
          </div>
        )}

        {rivals.length > 0 && (
          <div>
            <div style={{ color: "var(--rival)", marginBottom: 2 }}>Rival</div>
            {rivals.join(", ")}
          </div>
        )}

        {clubsManaged.length === 0 &&
          managersHere.length === 0 &&
          coachedUnder.length === 0 &&
          coached.length === 0 &&
          tactics.length === 0 &&
          rivals.length === 0 && (
            <p style={{ color: "var(--chalk-muted)" }}>No connections in the current view.</p>
          )}
      </div>
    </aside>
  );
}