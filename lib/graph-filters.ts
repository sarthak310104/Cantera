import type { NetworkGraph } from "@/types";

export const LEAGUES: { label: string; country: string }[] = [
  { label: "Premier League", country: "England" },
  { label: "Serie A", country: "Italy" },
  { label: "La Liga", country: "Spain" },
  { label: "Bundesliga", country: "Germany" },
  { label: "Eredivisie", country: "Netherlands" },
];

/**
 * Narrows the full graph down to one country's clubs, the managers who
 * worked at those clubs (even if their career also touched other leagues),
 * and any tactics those managers employ. Everything else — including edges
 * where either end falls outside that set — is dropped.
 *
 * Pure and client-side: the full graph is already in memory, so filtering
 * here avoids a round-trip for what's fundamentally a view concern, not a
 * new query.
 */
export function filterGraphByCountry(graph: NetworkGraph, country: string | null): NetworkGraph {
  if (!country) return graph;

  const clubIds = new Set(
    graph.nodes.filter((n) => n.label === "Club" && n.country === country).map((n) => n.id)
  );

  const managerIds = new Set(
    graph.edges
      .filter((e) => e.type === "MANAGED_AT" && clubIds.has(e.targetId))
      .map((e) => e.sourceId)
  );

  const tacticIds = new Set(
    graph.edges
      .filter((e) => e.type === "EMPLOYS_TACTIC" && managerIds.has(e.sourceId))
      .map((e) => e.targetId)
  );

  const keepIds = new Set([...clubIds, ...managerIds, ...tacticIds]);

  return {
    nodes: graph.nodes.filter((n) => keepIds.has(n.id)),
    edges: graph.edges.filter((e) => keepIds.has(e.sourceId) && keepIds.has(e.targetId)),
  };
}