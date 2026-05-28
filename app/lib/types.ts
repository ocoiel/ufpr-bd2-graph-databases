export type NodeKind = "Officer" | "Entity" | "Intermediary" | "Address" | "Other";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  name: string;
  country?: string;
  jurisdiction?: string;
  status?: string;
  sourceID?: string;
  raw?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type: string;
  source: string;
  target: string;
  link?: string;
  startDate?: string;
  endDate?: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cypher?: string;
  stats?: {
    elapsedMs?: number;
    dbHits?: number;
  };
}

export interface SearchHit {
  id: string;
  kind: NodeKind;
  name: string;
  country?: string;
  jurisdiction?: string;
}

export interface AlgorithmResult {
  algorithm: string;
  cypher: string;
  rows: Array<{
    nodeId: string;
    name: string;
    kind: NodeKind;
    score?: number;
    community?: number;
  }>;
  elapsedMs?: number;
}
