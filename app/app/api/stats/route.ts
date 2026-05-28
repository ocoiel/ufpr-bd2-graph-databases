import { NextResponse } from "next/server";
import { runQuery, neo4jIntToNumber } from "@/lib/neo4j";

export async function GET() {
  const cypher = `
CALL {
  MATCH (n) RETURN labels(n)[0] AS k, count(n) AS c
}
WITH collect({label: k, total: c}) AS nodes
CALL {
  MATCH ()-[r]->() RETURN type(r) AS t, count(r) AS c
}
WITH nodes, collect({type: t, total: c}) AS rels
RETURN nodes, rels
`;
  const { records } = await runQuery<{
    nodes: Array<{ label: string; total: { toNumber: () => number } }>;
    rels: Array<{ type: string; total: { toNumber: () => number } }>;
  }>(cypher);
  if (records.length === 0) return NextResponse.json({ nodes: [], rels: [] });
  const row = records[0];
  return NextResponse.json({
    nodes: row.nodes.map((n) => ({ label: n.label, total: neo4jIntToNumber(n.total) })),
    rels: row.rels.map((r) => ({ type: r.type, total: neo4jIntToNumber(r.total) })),
    cypher,
  });
}
