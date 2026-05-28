import { NextRequest, NextResponse } from "next/server";
import { pageRankAround } from "@/lib/cypher";

export async function GET(req: NextRequest) {
  const rootId = req.nextUrl.searchParams.get("rootId");
  const hops = Math.min(
    4,
    Math.max(1, Number(req.nextUrl.searchParams.get("hops") ?? 2)),
  );
  const limit = Math.min(
    100,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 25)),
  );
  if (!rootId) {
    return NextResponse.json({ error: "rootId é obrigatório" }, { status: 400 });
  }
  const start = performance.now();
  try {
    const result = await pageRankAround(rootId, hops, limit);
    return NextResponse.json({
      ...result,
      elapsedMs: Math.round(performance.now() - start),
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
