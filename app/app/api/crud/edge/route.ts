import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery } from "@/lib/neo4j";

const EdgeSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  type: z.string().min(1).regex(/^[A-Z_][A-Z0-9_]*$/i, {
    message: "tipo precisa ser identificador (sem espaços/aspas)",
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = EdgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  // tipo é injetado por interpolação (validado por regex acima — sem espaço/aspas).
  const cypher = `
MATCH (a), (b) WHERE id(a) = $sourceId AND id(b) = $targetId
MERGE (a)-[r:\`${parsed.data.type}\`]->(b)
ON CREATE SET r.created_at = datetime(), r.sourceID = 'demo-bd2-ufpr'
RETURN id(r) AS id, type(r) AS type
`;
  const { records } = await runQuery<{
    id: { toNumber: () => number };
    type: string;
  }>(cypher, {
    sourceId: BigInt(parsed.data.sourceId),
    targetId: BigInt(parsed.data.targetId),
  });
  return NextResponse.json({ id: String(records[0].id.toNumber()), cypher });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }
  const cypher = `
MATCH ()-[r]-() WHERE id(r) = $id DELETE r
`;
  await runQuery(cypher, { id: BigInt(id) });
  return NextResponse.json({ ok: true, cypher });
}
