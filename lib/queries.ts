import { runQuery } from "./db";
import type { NetworkGraph, NetworkNode, NetworkEdge } from "../types";

const EDGE_TYPES: NetworkEdge["type"][] = [
  "COACHED",
  "ASSISTANT_TO",
  "MANAGED_AT",
  "EMPLOYS_TACTIC",
  "RIVAL_OF",
];

/**
 * The whole graph, shaped for the tactics-board visualization. Small enough
 * dataset (a few dozen nodes) that returning it in one shot is simpler than
 * paginating — revisit if the seed data grows past a few hundred entities.
 */
export async function getFullNetwork(): Promise<NetworkGraph> {
  const nodeRows = await runQuery<{ id: string; labels: string[]; name: string }>(
    `MATCH (n)
     RETURN n.id AS id, labels(n) AS labels, n.name AS name`
  );

  const nodes: NetworkNode[] = nodeRows.map((row) => ({
    id: row.id,
    // Manager is the more specific label when a node carries both — a
    // Person who has also managed a club should render as a Manager.
    label: (row.labels.includes("Manager") ? "Manager" : row.labels[0]) as NetworkNode["label"],
    name: row.name,
  }));

  const edgeRows = await runQuery<{
    sourceId: string;
    targetId: string;
    type: string;
    years: string | null;
  }>(
    `MATCH (a)-[r]->(b)
     RETURN a.id AS sourceId, b.id AS targetId, type(r) AS type, r.years AS years`
  );

  const edges: NetworkEdge[] = edgeRows
    .filter((row): row is typeof row & { type: NetworkEdge["type"] } =>
      EDGE_TYPES.includes(row.type as NetworkEdge["type"])
    )
    .map((row) => ({
      sourceId: row.sourceId,
      targetId: row.targetId,
      type: row.type as NetworkEdge["type"],
      years: row.years ?? undefined,
    }));

  return { nodes, edges };
}

export type ManagerSummary = {
  id: string;
  name: string;
  nationality: string | null;
  bornYear: number | null;
  clubCount: number;
  protegeCount: number;
};

/** Every Manager with a couple of derived counts, for a browsable list page. */
export async function getManagers(): Promise<ManagerSummary[]> {
  return runQuery<ManagerSummary>(
    `MATCH (m:Manager)
     OPTIONAL MATCH (m)-[:MANAGED_AT]->(club)
     OPTIONAL MATCH (m)-[:COACHED]->(protege)
     RETURN m.id AS id, m.name AS name, m.nationality AS nationality, m.bornYear AS bornYear,
            count(DISTINCT club) AS clubCount, count(DISTINCT protege) AS protegeCount
     ORDER BY m.name`
  );
}

/**
 * Required multi-hop traversal: everyone within `hops` steps of a manager's
 * coaching lineage, in either direction (who coached them, who they coached,
 * and so on transitively). Returned as a subgraph so the UI can render it
 * with the same component used for the full network.
 *
 * Note: Cypher does not allow parameterizing a variable-length path's hop
 * count ([:COACHED*1..$hops] is not valid) — the bound has to be a literal
 * in the query text. We clamp it to a small integer range first so this
 * never becomes free-form string interpolation of user input.
 */
export async function getManagerLineage(managerId: string, hops = 3): Promise<NetworkGraph> {
  const clampedHops = Math.min(Math.max(Math.trunc(hops), 1), 5);

  // Pass 1: everyone within `clampedHops` steps of the start manager, in
  // either direction along COACHED (their mentors, their proteges, and so on
  // transitively). OPTIONAL MATCH so a manager with zero COACHED connections
  // still comes back as a single-node result instead of an empty one — a
  // required MATCH here would find no rows at all for an isolated manager,
  // which would incorrectly read as "manager not found".
  const nodeRows = await runQuery<{ id: string; labels: string[]; name: string }>(
    `MATCH (start:Manager {id: $managerId})
     OPTIONAL MATCH (start)-[:COACHED*1..${clampedHops}]-(other)
     WITH start, collect(DISTINCT other) AS others
     UNWIND others + [start] AS p
     RETURN DISTINCT p.id AS id, labels(p) AS labels, p.name AS name`,
    { managerId }
  );

  const nodes: NetworkNode[] = nodeRows.map((row) => ({
    id: row.id,
    label: (row.labels.includes("Manager") ? "Manager" : row.labels[0]) as NetworkNode["label"],
    name: row.name,
  }));

  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Pass 2: the actual COACHED edges connecting that same set of people, so
  // the UI can draw the lineage exactly as it exists in the graph rather
  // than inferring it from the node list.
  const nodeIds = nodes.map((n) => n.id);
  const edgeRows = await runQuery<{ sourceId: string; targetId: string }>(
    `MATCH (a:Manager)-[:COACHED]->(b)
     WHERE a.id IN $nodeIds AND b.id IN $nodeIds
     RETURN a.id AS sourceId, b.id AS targetId`,
    { nodeIds }
  );

  const edges: NetworkEdge[] = edgeRows.map((row) => ({
    sourceId: row.sourceId,
    targetId: row.targetId,
    type: "COACHED",
  }));

  return { nodes, edges };
}

export type CoachingCousinPair = {
  managerA: string;
  managerB: string;
  sharedInfluence: string;
};

/**
 * The headline "relational-awkward" query: pairs of managers connected
 * through shared coaching lineage (variable depth, either side) who never
 * managed the same club. In SQL this needs two independent recursive CTEs
 * (one per side of the pair) at unknown depth, joined and de-duplicated,
 * then anti-joined against club tenures — a single bidirectional
 * variable-length pattern with a negative existence check in Cypher.
 */
export async function getCoachingCousins(): Promise<CoachingCousinPair[]> {
  return runQuery<CoachingCousinPair>(
    `MATCH (a:Manager)-[:COACHED*1..3]->(common:Person)<-[:COACHED*1..3]-(b:Manager)
     WHERE a.id < b.id
       AND NOT EXISTS {
         MATCH (a)-[:MANAGED_AT]->(club)<-[:MANAGED_AT]-(b)
       }
     RETURN DISTINCT a.name AS managerA, b.name AS managerB, common.name AS sharedInfluence
     ORDER BY managerA, managerB`
  );
}