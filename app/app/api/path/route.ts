import { NextRequest, NextResponse } from "next/server";
import { shortestPath } from "@/lib/cypher";

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source");
  const target = req.nextUrl.searchParams.get("target");
  const maxHops = Math.min(
    10,
    Math.max(1, Number(req.nextUrl.searchParams.get("hops") ?? 6)),
  );
  if (!source || !target) {
    return NextResponse.json(
      { error: "source e target são obrigatórios" },
      { status: 400 },
    );
  }
  const start = performance.now();
  const result = await shortestPath(source, target, maxHops);
  return NextResponse.json({
    ...result,
    elapsedMs: Math.round(performance.now() - start),
  });
}
