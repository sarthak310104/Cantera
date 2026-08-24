"use client";

import { useEffect, useMemo, useState } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import type { NetworkGraph, NetworkNode } from "@/types";

type PositionedNode = NetworkNode & { x: number; y: number };

type Props = {
  graph: NetworkGraph;
  /** Base layout width in graph coordinate units. Defaults to 640. */
  width?: number;
  /** Base layout height in graph coordinate units. Defaults to 480. */
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
  focusedNodeId?: string | null;
};

const EDGE_STYLE: Record<string, { stroke: string; dash?: string }> = {
  COACHED: { stroke: "var(--gold)" },
  MANAGED_AT: { stroke: "var(--chalk-muted)", dash: "2 4" },
  ASSISTANT_TO: { stroke: "var(--chalk-muted)", dash: "6 3" },
  EMPLOYS_TACTIC: { stroke: "rgba(244,241,232,0.25)", dash: "1 5" },
  RIVAL_OF: { stroke: "var(--rival)", dash: "4 2" },
};

const NODE_RADIUS: Record<NetworkNode["label"], number> = {
  Manager: 20,
  Person: 14,
  Club: 16,
  Tactic: 10,
};

const BASE_WIDTH = 1080;
const BASE_HEIGHT = 720;
const ZOOM_STEP = 0.2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

/**
 * Lays the graph out with a force simulation (run synchronously to
 * completion, not animated per-frame) then renders the result as static
 * SVG markers on dashed movement lines — the tactics-board look.
 *
 * Layout always happens in a fixed BASE_WIDTH x BASE_HEIGHT coordinate
 * space regardless of node count — stretching that space to fit more nodes
 * just left everything sparse and disconnected-looking. Zoom is handled
 * separately: the SVG's pixel width/height scale with the zoom level while
 * its viewBox stays fixed, so zooming in makes the same layout bigger
 * (and scrollable within the container) rather than recomputing positions.
 */
export function NetworkGraph({ graph, width = BASE_WIDTH, height = BASE_HEIGHT, onNodeClick, focusedNodeId }: Props) {
  const [positioned, setPositioned] = useState<PositionedNode[] | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (graph.nodes.length === 0) {
      setPositioned([]);
      return;
    }

    const simNodes = graph.nodes.map((n) => ({ ...n }));
    const simLinks = graph.edges.map((e) => ({ source: e.sourceId, target: e.targetId }));

    // A hard clamp applied only after ticking finishes undoes the spacing
    // the collide force worked out — it slams anyone near the edge into a
    // much smaller region all at once. A soft boundary force that nudges
    // stray nodes back gently, applied on every tick, lets collision
    // detection keep working correctly throughout the whole simulation.
    const maxRadius = Math.max(...Object.values(NODE_RADIUS));
    const margin = maxRadius + 20;
    function boundingForce(alpha: number) {
      for (const n of simNodes as any[]) {
        if (n.x < margin) n.vx += (margin - n.x) * 0.08 * alpha;
        if (n.x > width - margin) n.vx -= (n.x - (width - margin)) * 0.08 * alpha;
        if (n.y < margin) n.vy += (margin - n.y) * 0.08 * alpha;
        if (n.y > height - margin - 20) n.vy -= (n.y - (height - margin - 20)) * 0.08 * alpha;
      }
    }

    const simulation = forceSimulation(simNodes as any)
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", forceManyBody().strength(-320))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "collide",
        forceCollide((d: any) => NODE_RADIUS[d.label as NetworkNode["label"]] + 22)
      )
      .force("bounds", boundingForce as any)
      .stop();

    // 500 ticks (up from 300) gives the larger node count enough iterations
    // to actually settle into a spread-out layout rather than stopping
    // partway through convergence.
    for (let i = 0; i < 500; i++) simulation.tick();

    // Final safety clamp for any rare outlier the soft force didn't fully
    // catch — should rarely trigger now that boundaries are respected
    // throughout the simulation rather than only at the end.
    simNodes.forEach((n: any) => {
      n.x = Math.max(maxRadius + 8, Math.min(width - maxRadius - 8, n.x));
      n.y = Math.max(maxRadius + 8, Math.min(height - maxRadius - 28, n.y));
    });

    setPositioned(simNodes as PositionedNode[]);
    setZoom(1);
  }, [graph, width, height]);

  const nodeById = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    (positioned ?? []).forEach((n) => map.set(n.id, n));
    return map;
  }, [positioned]);

  // When a node is focused, dim everything not directly connected to it.
  const connectedIds = useMemo(() => {
    if (!focusedNodeId) return null;
    const ids = new Set<string>([focusedNodeId]);
    graph.edges.forEach((e) => {
      if (e.sourceId === focusedNodeId) ids.add(e.targetId);
      if (e.targetId === focusedNodeId) ids.add(e.sourceId);
    });
    return ids;
  }, [focusedNodeId, graph.edges]);

  if (!positioned) {
    return (
      <div style={{ color: "var(--chalk-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        Laying out the pitch…
      </div>
    );
  }

  if (positioned.length === 0) {
    return (
      <div style={{ color: "var(--chalk-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        No data to show.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        overflowX: "auto",
        overflowY: "auto",
        width: "100%",
        minWidth: 0,
        maxHeight: "70vh",
        border: "1px solid var(--border)",
        borderRadius: 6,
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 8,
          left: 8,
          zIndex: 5,
          display: "inline-flex",
          gap: 4,
          background: "var(--panel)",
          border: "1px solid var(--border-strong)",
          borderRadius: 4,
          padding: 4,
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
          aria-label="Zoom out"
          style={zoomButtonStyle}
        >
          −
        </button>
        <button
          onClick={() => setZoom(1)}
          aria-label="Reset zoom"
          style={{ ...zoomButtonStyle, fontSize: 11, width: "auto", padding: "0 8px" }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
          aria-label="Zoom in"
          style={zoomButtonStyle}
        >
          +
        </button>
      </div>

      <svg
        width={width * zoom}
        height={height * zoom}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Coaching lineage network graph"
        style={{ display: "block" }}
      >
        <defs>
          <marker id="arrow-gold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--gold)" />
          </marker>
        </defs>

        {graph.edges.map((edge, i) => {
          const source = nodeById.get(edge.sourceId);
          const target = nodeById.get(edge.targetId);
          if (!source || !target) return null;
          const style = EDGE_STYLE[edge.type] ?? { stroke: "var(--chalk-muted)" };
          const dimmed = connectedIds && !(connectedIds.has(edge.sourceId) && connectedIds.has(edge.targetId));
          return (
            <line
              key={`${edge.sourceId}-${edge.targetId}-${i}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={style.stroke}
              strokeWidth={edge.type === "COACHED" ? 1.5 : 1}
              strokeDasharray={style.dash}
              opacity={dimmed ? 0.08 : edge.type === "COACHED" ? 0.85 : 0.4}
              markerEnd={edge.type === "COACHED" ? "url(#arrow-gold)" : undefined}
            />
          );
        })}

        {positioned.map((node) => {
          const radius = NODE_RADIUS[node.label] ?? 12;
          const dimmed = connectedIds && !connectedIds.has(node.id);
          const isFocused = node.id === focusedNodeId;
          const fill =
            node.label === "Manager" || node.label === "Person"
              ? "var(--garnet)"
              : node.label === "Club"
                ? "var(--panel-hover)"
                : "rgba(244,241,232,0.08)";
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              opacity={dimmed ? 0.25 : 1}
              style={{ cursor: onNodeClick ? "pointer" : "default" }}
              onClick={() => onNodeClick?.(node)}
            >
              <circle
                r={radius}
                fill={fill}
                stroke={isFocused ? "var(--gold)" : "var(--border-strong)"}
                strokeWidth={isFocused ? 2.5 : 1}
              />
              <text
                y={radius + 14}
                textAnchor="middle"
                fill="var(--chalk)"
                fontFamily="var(--font-body)"
                fontSize={11}
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const zoomButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  color: "var(--chalk)",
  fontSize: 15,
  cursor: "pointer",
  borderRadius: 3,
};