import "server-only";
import { runQuery, neo4jIntToNumber } from "./neo4j";
import type { GraphNode, GraphEdge, NodeKind, SearchHit } from "./types";

// Mapeia um node do driver Neo4j pra GraphNode tipado.
type Neo4jNode = {
  identity: { toNumber: () => number };
  labels: string[];
  properties: Record<string, unknown>;
};

type Neo4jRel = {
  identity: { toNumber: () => number };
  type: string;
  start: { toNumber: () => number };
  end: { toNumber: () => number };
  properties: Record<string, unknown>;
};

function nodeKindFromLabels(labels: string[]): NodeKind {
  for (const known of ["Officer", "Entity", "Intermediary", "Address"] as const) {
    if (labels.includes(known)) return known;
  }
  return "Other";
}

export function mapNode(n: Neo4jNode): GraphNode {
  const kind = nodeKindFromLabels(n.labels);
  const props = n.properties ?? {};
  const name =
    (props.name as string) ??
    (props.address as string) ??
    `${kind} #${n.identity.toNumber()}`;
  return {
    id: String(n.identity.toNumber()),
    kind,
    name,
    country: (props.countries as string) ?? (props.country as string),
    jurisdiction: props.jurisdiction_description as string,
    status: props.status as string,
    sourceID: props.sourceID as string,
    raw: props,
  };
}

export function mapRel(r: Neo4jRel): GraphEdge {
  return {
    id: `r${r.identity.toNumber()}`,
    type: r.type,
    source: String(r.start.toNumber()),
    target: String(r.end.toNumber()),
    link: r.properties?.link as string | undefined,
    startDate: r.properties?.start_date as string | undefined,
    endDate: r.properties?.end_date as string | undefined,
  };
}

// --- Queries ----------------------------------------------------------------

export const SEARCH_CYPHER = `
CALL {
  MATCH (n:Officer)       WHERE toLower(n.name) CONTAINS toLower($q) RETURN n, 'Officer'       AS kind
  UNION ALL
  MATCH (n:Entity)        WHERE toLower(n.name) CONTAINS toLower($q) RETURN n, 'Entity'        AS kind
  UNION ALL
  MATCH (n:Intermediary)  WHERE toLower(n.name) CONTAINS toLower($q) RETURN n, 'Intermediary'  AS kind
}
RETURN n, kind
LIMIT $limit
`;

export async function search(q: string, limit = 25): Promise<SearchHit[]> {
  const { records } = await runQuery<{ n: Neo4jNode; kind: NodeKind }>(
    SEARCH_CYPHER,
    { q, limit: BigInt(limit) },
  );
  return records.map((row) => {
    const m = mapNode(row.n);
    return {
      id: m.id,
      kind: row.kind,
      name: m.name,
      country: m.country,
      jurisdiction: m.jurisdiction,
    };
  });
}

export const NEIGHBORHOOD_CYPHER = `
MATCH (root) WHERE id(root) = $id
WITH root
CALL {
  WITH root
  MATCH (root)-[r]-(neigh)
  RETURN r, neigh
  LIMIT $limit
}
WITH root,
  collect(DISTINCT r) AS rels,
  collect(DISTINCT neigh) AS neighbors
RETURN root, rels, neighbors
`;

export async function neighborhood(id: string, limit = 80): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
}> {
  const { records } = await runQuery<{
    root: Neo4jNode;
    rels: Neo4jRel[];
    neighbors: Neo4jNode[];
  }>(NEIGHBORHOOD_CYPHER, { id: BigInt(id), limit: BigInt(limit) });

  if (records.length === 0) return { nodes: [], edges: [] };
  const row = records[0];
  const nodes = [row.root, ...row.neighbors.filter(Boolean)].map(mapNode);
  const edges = row.rels.filter(Boolean).map(mapRel);
  return { nodes, edges };
}

export const SHORTEST_PATH_CYPHER = `
MATCH (a), (b) WHERE id(a) = $sourceId AND id(b) = $targetId
MATCH path = shortestPath((a)-[*..$maxHops]-(b))
WITH path, nodes(path) AS ns, relationships(path) AS rs
RETURN ns, rs
`;

// (driver não interpola $maxHops em range, então construímos por string)
export async function shortestPath(
  sourceId: string,
  targetId: string,
  maxHops = 6,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; cypher: string }> {
  const cypher = `
MATCH (a), (b) WHERE id(a) = $sourceId AND id(b) = $targetId
MATCH path = shortestPath((a)-[*..${maxHops}]-(b))
RETURN nodes(path) AS ns, relationships(path) AS rs
`;
  const { records } = await runQuery<{ ns: Neo4jNode[]; rs: Neo4jRel[] }>(
    cypher,
    { sourceId: BigInt(sourceId), targetId: BigInt(targetId) },
  );
  if (records.length === 0) return { nodes: [], edges: [], cypher };
  const row = records[0];
  return {
    nodes: row.ns.map(mapNode),
    edges: row.rs.map(mapRel),
    cypher,
  };
}

export const PAGERANK_CYPHER = `
CALL gds.graph.exists('offshore') YIELD exists
WITH exists
CALL apoc.do.when(
  exists, '',
  "CALL gds.graph.project('offshore', ['Officer','Entity','Intermediary'],
    {OFFICER_OF: {orientation: 'UNDIRECTED'}, INTERMEDIARY_OF: {orientation: 'UNDIRECTED'}})
   YIELD graphName RETURN graphName"
) YIELD value
CALL gds.pageRank.stream('offshore', { maxIterations: 20, dampingFactor: 0.85 })
YIELD nodeId, score
WITH nodeId, score
WHERE score > 0
RETURN nodeId, score
ORDER BY score DESC LIMIT $limit
`;

// versão simplificada que assume o subgrafo já projetado:
// usamos GDS apenas dentro da vizinhança expandida do nó-foco.
export async function pageRankAround(
  rootId: string,
  hops = 2,
  limit = 25,
): Promise<{
  rows: Array<{ id: string; name: string; kind: NodeKind; score: number }>;
  cypher: string;
}> {
  const cypher = `
MATCH (root) WHERE id(root) = $rootId
CALL apoc.path.subgraphNodes(root, {maxLevel: ${hops}, relationshipFilter: ''})
YIELD node
WITH collect(DISTINCT node) AS nodes
CALL gds.graph.project.cypher(
  'subg-' + toString(timestamp()),
  'UNWIND $ns AS n RETURN id(n) AS id',
  'UNWIND $ns AS a UNWIND $ns AS b
   MATCH (a)-[r]-(b) WHERE id(a) < id(b) RETURN id(a) AS source, id(b) AS target',
  {parameters: {ns: nodes}}
) YIELD graphName, nodeCount
CALL gds.pageRank.stream(graphName, {maxIterations: 20, dampingFactor: 0.85})
YIELD nodeId, score
WITH graphName, nodeId, score
ORDER BY score DESC LIMIT $limit
WITH graphName, collect({nodeId: nodeId, score: score}) AS rows
CALL gds.graph.drop(graphName, false) YIELD graphName AS dropped
UNWIND rows AS row
WITH gds.util.asNode(row.nodeId) AS n, row.score AS score
RETURN id(n) AS id, labels(n) AS labels, n.name AS name, score
ORDER BY score DESC
`;
  const { records } = await runQuery<{
    id: { toNumber: () => number };
    labels: string[];
    name: string;
    score: number;
  }>(cypher, { rootId: BigInt(rootId), limit: BigInt(limit) });
  return {
    rows: records.map((r) => ({
      id: String(r.id.toNumber ? r.id.toNumber() : r.id),
      name: r.name ?? "—",
      kind: nodeKindFromLabels(r.labels),
      score: typeof r.score === "number" ? r.score : Number(r.score),
    })),
    cypher,
  };
}

export const LOUVAIN_CYPHER = `subgraph + gds.louvain.stream`;

export async function louvainAround(
  rootId: string,
  hops = 2,
): Promise<{
  rows: Array<{ id: string; name: string; kind: NodeKind; community: number }>;
  cypher: string;
}> {
  const cypher = `
MATCH (root) WHERE id(root) = $rootId
CALL apoc.path.subgraphNodes(root, {maxLevel: ${hops}}) YIELD node
WITH collect(DISTINCT node) AS nodes
CALL gds.graph.project.cypher(
  'lvn-' + toString(timestamp()),
  'UNWIND $ns AS n RETURN id(n) AS id',
  'UNWIND $ns AS a UNWIND $ns AS b
   MATCH (a)-[r]-(b) WHERE id(a) < id(b) RETURN id(a) AS source, id(b) AS target',
  {parameters: {ns: nodes}}
) YIELD graphName
CALL gds.louvain.stream(graphName) YIELD nodeId, communityId
WITH graphName, collect({nodeId: nodeId, communityId: communityId}) AS rows
CALL gds.graph.drop(graphName, false) YIELD graphName AS dropped
UNWIND rows AS row
WITH gds.util.asNode(row.nodeId) AS n, row.communityId AS community
RETURN id(n) AS id, labels(n) AS labels, n.name AS name, community
ORDER BY community
`;
  const { records } = await runQuery<{
    id: { toNumber: () => number };
    labels: string[];
    name: string;
    community: { toNumber: () => number } | number;
  }>(cypher, { rootId: BigInt(rootId) });
  return {
    rows: records.map((r) => ({
      id: String(r.id.toNumber ? r.id.toNumber() : r.id),
      name: r.name ?? "—",
      kind: nodeKindFromLabels(r.labels),
      community: typeof r.community === "number"
        ? r.community
        : neo4jIntToNumber(r.community),
    })),
    cypher,
  };
}
