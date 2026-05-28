import { NextRequest, NextResponse } from "next/server";
import { search, SEARCH_CYPHER } from "@/lib/cypher";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 25)),
  );
  if (q.length < 2) {
    return NextResponse.json({ hits: [], cypher: SEARCH_CYPHER });
  }
  const start = performance.now();
  const hits = await search(q, limit);
  return NextResponse.json({
    hits,
    cypher: SEARCH_CYPHER,
    elapsedMs: Math.round(performance.now() - start),
  });
}
