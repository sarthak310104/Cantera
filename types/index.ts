export type Person = {
  id: string;
  name: string;
  nationality?: string;
  bornYear?: number;
  /** True if this Person also carries the :Manager label in the graph. */
  isManager?: boolean;
};

export type Club = {
  id: string;
  name: string;
  country?: string;
};

export type Tactic = {
  id: string;
  name: string;
};

/** A single edge as returned from Cypher, used to draw the tactics-board graph. */
export type NetworkEdge = {
  sourceId: string;
  targetId: string;
  type: "COACHED" | "ASSISTANT_TO" | "MANAGED_AT" | "EMPLOYS_TACTIC" | "RIVAL_OF";
  years?: string;
};

export type NetworkNode = {
  id: string;
  label: "Person" | "Manager" | "Club" | "Tactic";
  name: string;
  /** Only present on Club nodes. Used for the league filter. */
  country?: string;
};

export type NetworkGraph = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};