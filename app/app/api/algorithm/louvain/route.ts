import { NextRequest, NextResponse } from "next/server";
import { louvainAround } from "@/lib/cypher";

export async function GET(req: NextRequest) {
  const rootId = req.nextUrl.searchParams.get("rootId");
  const hops = Math.min(
    4,
    Math.max(1, Number(req.nextUrl.searchParams.get("hops") ?? 2)),
  );
  if (!rootId) {
    return NextResponse.json({ error: "rootId é obrigatório" }, { status: 400 });
  }
  const start = performance.now();
  try {
    const result = await louvainAround(rootId, hops);
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
