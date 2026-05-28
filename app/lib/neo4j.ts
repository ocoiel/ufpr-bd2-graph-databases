import "server-only";
import neo4j, { Driver, Session, QueryResult } from "neo4j-driver";

let driver: Driver | null = null;

function getDriver(): Driver {
  if (driver) return driver;
  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "neo4j";
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionTimeout: 20_000,
  });
  return driver;
}

export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<{ records: T[]; summary: QueryResult["summary"] }> {
  const session: Session = getDriver().session({
    database: process.env.NEO4J_DATABASE ?? "neo4j",
  });
  try {
    const result = await session.run(cypher, params);
    const records = result.records.map((r) => r.toObject() as T);
    return { records, summary: result.summary };
  } finally {
    await session.close();
  }
}

export function neo4jIntToNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v);
}
