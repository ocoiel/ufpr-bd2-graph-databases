"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Core, ElementDefinition } from "cytoscape";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import type { GraphNode, GraphEdge } from "@/lib/types";
import { KIND_COLOR } from "@/lib/utils";

cytoscape.use(fcose);

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightIds?: string[];
  communityById?: Record<string, number>;
  onNodeClick?: (node: GraphNode) => void;
  selectedId?: string;
}

const COMMUNITY_PALETTE = [
  "#f59e0b", "#0ea5e9", "#a855f7", "#10b981",
  "#ec4899", "#eab308", "#06b6d4", "#8b5cf6",
  "#f97316", "#22c55e", "#3b82f6", "#ef4444",
];

export default function GraphView({
  nodes,
  edges,
  highlightIds,
  communityById,
  onNodeClick,
  selectedId,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const elements: ElementDefinition[] = useMemo(() => {
    const els: ElementDefinition[] = [];
    for (const n of nodes) {
      const color = communityById?.[n.id] !== undefined
        ? COMMUNITY_PALETTE[communityById[n.id] % COMMUNITY_PALETTE.length]
        : KIND_COLOR[n.kind];
      els.push({
        group: "nodes",
        data: {
          id: n.id,
          label: n.name,
          kind: n.kind,
          color,
          highlighted: highlightIds?.includes(n.id) ? 1 : 0,
        },
      });
    }
    const seen = new Set<string>();
    for (const e of edges) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      els.push({
        group: "edges",
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.type.replace(/_/g, " "),
          highlighted: highlightIds?.includes(e.id) ? 1 : 0,
        },
      });
    }
    return els;
  }, [nodes, edges, highlightIds, communityById]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (cyRef.current) {
      cyRef.current.destroy();
    }
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      wheelSensitivity: 0.2,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            "border-color": "#0a0a0a",
            "border-width": 2,
            label: "data(label)",
            color: "#fafafa",
            "font-size": 11,
            "font-weight": 500,
            "text-outline-color": "#09090b",
            "text-outline-width": 2,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-max-width": "160px",
            "text-wrap": "ellipsis",
            width: 28,
            height: 28,
            "transition-property": "width height border-width opacity",
            "transition-duration": 180,
          },
        },
        {
          selector: 'node[highlighted = 1]',
          style: {
            "border-color": "#fafafa",
            "border-width": 3,
            width: 38,
            height: 38,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#fafafa",
            "border-width": 4,
            width: 44,
            height: 44,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#3f3f46",
            "target-arrow-color": "#52525b",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.9,
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 9,
            color: "#71717a",
            "text-rotation": "autorotate",
            "text-background-color": "#09090b",
            "text-background-opacity": 0.7,
            "text-background-padding": "2px",
            "transition-property": "line-color width opacity",
            "transition-duration": 180,
          },
        },
        {
          selector: 'edge[highlighted = 1]',
          style: {
            width: 3,
            "line-color": "#f59e0b",
            "target-arrow-color": "#f59e0b",
          },
        },
        {
          selector: ".faded",
          style: { opacity: 0.18 },
        },
      ],
      layout: {
        name: "fcose",
        animationDuration: 600,
        nodeSeparation: 100,
        idealEdgeLength: () => 110,
        nodeRepulsion: () => 8000,
        gravity: 0.25,
        randomize: false,
        quality: "default",
        fit: true,
        padding: 60,
      } as unknown as cytoscape.LayoutOptions,
    });

    cy.on("layoutstop", () => {
      cy.animate({ fit: { eles: cy.nodes(), padding: 80 }, duration: 350 });
    });

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      const found = nodes.find((n) => n.id === id);
      if (found) onNodeClick?.(found);
    });

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      cy.elements().addClass("faded");
      node.closedNeighborhood().removeClass("faded");
    });
    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("faded");
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, nodes, onNodeClick]);

  useEffect(() => {
    if (!cyRef.current || !selectedId) return;
    const node = cyRef.current.getElementById(selectedId);
    if (node && node.length > 0) {
      cyRef.current.elements().unselect();
      node.select();
      cyRef.current.animate({
        center: { eles: node },
        zoom: Math.max(cyRef.current.zoom(), 0.9),
        duration: 400,
      });
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-zinc-950"
    />
  );
}
