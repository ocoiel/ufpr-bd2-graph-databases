import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runQuery } from "@/lib/neo4j";
import { mapNode } from "@/lib/cypher";

const CreateSchema = z.object({
  kind: z.enum(["Officer", "Entity", "Intermediary", "Address"]),
  name: z.string().min(1),
  country: z.string().optional(),
  jurisdiction: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { kind, name, country, jurisdiction, note } = parsed.data;
  const cypher = `
CREATE (n:${kind} {name: $name, countries: $country, jurisdiction_description: $jurisdiction,
  note: $note, sourceID: 'demo-bd2-ufpr', created_at: datetime()})
RETURN n
`;
  const { records } = await runQuery<{ n: Parameters<typeof mapNode>[0] }>(
    cypher,
    {
      name,
      country: country ?? null,
      jurisdiction: jurisdiction ?? null,
      note: note ?? null,
    },
  );
  return NextResponse.json({ node: mapNode(records[0].n), cypher });
}

const UpdateSchema = z.object({
  id: z.string(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const cypher = `
MATCH (n) WHERE id(n) = $id
SET n += $props, n.updated_at = datetime()
RETURN n
`;
  const { records } = await runQuery<{ n: Parameters<typeof mapNode>[0] }>(
    cypher,
    { id: BigInt(parsed.data.id), props: parsed.data.props },
  );
  if (records.length === 0) {
    return NextResponse.json({ error: "node não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ node: mapNode(records[0].n), cypher });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }
  const cypher = `
MATCH (n) WHERE id(n) = $id
DETACH DELETE n
`;
  await runQuery(cypher, { id: BigInt(id) });
  return NextResponse.json({ ok: true, cypher });
}
