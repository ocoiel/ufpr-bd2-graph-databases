import { NextRequest, NextResponse } from "next/server";
import { neighborhood, NEIGHBORHOOD_CYPHER } from "@/lib/cypher";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const limit = Math.min(
    500,
    Math.max(5, Number(req.nextUrl.searchParams.get("limit") ?? 80)),
  );
  const start = performance.now();
  const { nodes, edges } = await neighborhood(id, limit);
  return NextResponse.json({
    nodes,
    edges,
    cypher: NEIGHBORHOOD_CYPHER,
    elapsedMs: Math.round(performance.now() - start),
  });
}
