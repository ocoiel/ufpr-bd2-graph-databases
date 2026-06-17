// Sweep de profundidade — "e com 3, 4, 5 hops?".
//
// Mede o caminho mais curto (mesma pergunta) em Cypher vs SQL conforme a
// profundidade máxima cresce. É a prova visual da tese: no Cypher o tempo mal se
// move; no SQL o CTE recursivo cresce de forma desproporcional e estoura o timeout.
//
// Uso:
//   node --env-file=../.env scripts/hop-sweep.mjs                  # hops 2..6, 5 reps
//   node --env-file=../.env scripts/hop-sweep.mjs --runs 3 --max 6 --timeout 30000

import neo4j from "neo4j-driver";
import pg from "pg";

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? Number(argv[i + 1]) : d;
};
const RUNS = flag("runs", 5);
const MIN_HOPS = flag("min", 2);
const MAX_HOPS = flag("max", 6);
const PG_TIMEOUT_MS = flag("timeout", 30000);
const SRC_OVERRIDE = flag("src", null);
const TGT_OVERRIDE = flag("tgt", null);

const median = (xs) => {
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const fmt = (ms) => (ms == null ? "—" : `${ms.toFixed(1)} ms`);

async function one(session, cypher, params = {}) {
  const { records } = await session.run(cypher, params);
  return records[0] ?? null;
}

// Caminho mais curto em Cypher: o intervalo *..n não aceita parâmetro, então
// inlinamos o n (validado como inteiro).
async function timeCypher(session, s, t, hops) {
  const text = `MATCH (a) WHERE id(a) = $s
MATCH (b) WHERE id(b) = $t
MATCH path = shortestPath((a)-[*..${hops}]-(b))
RETURN length(path) AS hops`;
  await session.run(text, { s, t }); // aquecimento
  const times = [];
  let len = null;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const res = await session.run(text, { s, t });
    times.push(performance.now() - t0);
    len = res.records[0]?.get("hops") ?? len;
  }
  return { ms: median(times), len };
}

// Equivalente honesto em SQL: travessia NÃO direcionada via CTE recursivo. É isso
// que faz o frontier crescer exponencialmente conforme a profundidade aumenta.
async function timeSql(client, s, t, hops) {
  const text = `WITH RECURSIVE walk AS (
    SELECT $1::bigint AS node, ARRAY[$1::bigint] AS path, 0 AS depth
  UNION ALL
    SELECT nb.node, w.path || nb.node, w.depth + 1
      FROM walk w
      JOIN LATERAL (
        SELECT r.end_id   AS node FROM relationships r WHERE r.start_id = w.node
        UNION
        SELECT r.start_id AS node FROM relationships r WHERE r.end_id   = w.node
      ) nb ON true
     WHERE w.depth < $3 AND NOT (nb.node = ANY(w.path))
)
SELECT depth FROM walk WHERE node = $2 ORDER BY depth LIMIT 1`;
  try {
    await client.query(`SET statement_timeout = ${PG_TIMEOUT_MS}`);
    await client.query(text, [s, t, hops]); // aquecimento
    const times = [];
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      await client.query(text, [s, t, hops]);
      times.push(performance.now() - t0);
    }
    return { ms: median(times) };
  } catch (err) {
    if (err.code === "57014") return { ms: null, note: `timeout (>${PG_TIMEOUT_MS / 1000}s)` };
    return { ms: null, note: `erro: ${err.message.split("\n")[0]}` };
  } finally {
    await client.query("SET statement_timeout = 0").catch(() => {});
  }
}

async function main() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI ?? "bolt://localhost:7687",
    neo4j.auth.basic(process.env.NEO4J_USER ?? "neo4j", process.env.NEO4J_PASSWORD ?? "neo4j"),
    { disableLosslessIntegers: true },
  );
  const session = driver.session({ database: process.env.NEO4J_DATABASE ?? "neo4j" });
  const client = new pg.Client({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "panama-papers-2026",
    database: process.env.POSTGRES_DB ?? "offshoreleaks",
  });
  await client.connect();

  try {
    // Origem/destino podem ser fixados via --src/--tgt (útil pra comparar um nó
    // hub vs um nó de grau moderado). Sem flags, descobre o hub automaticamente.
    if (SRC_OVERRIDE != null && TGT_OVERRIDE != null) {
      const src = neo4j.int(SRC_OVERRIDE), tgt = neo4j.int(TGT_OVERRIDE);
      const nm = await one(session, `MATCH (a) WHERE id(a)=$s RETURN a.name AS name`, { s: src });
      console.log(`Sweep de profundidade · caminho mais curto · ${RUNS} reps/medida · timeout SQL ${PG_TIMEOUT_MS / 1000}s`);
      console.log(`Origem: "${nm?.get("name")}" (${SRC_OVERRIDE}) → destino ${TGT_OVERRIDE}\n`);
      const rows = [];
      for (let h = MIN_HOPS; h <= MAX_HOPS; h++) {
        process.stdout.write(`· hops=${h}… `);
        const cy = await timeCypher(session, src, tgt, h);
        const sql = await timeSql(client, SRC_OVERRIDE, TGT_OVERRIDE, h);
        const winner = sql.ms == null ? "Cypher ✓" : `Cypher ${(sql.ms / cy.ms).toFixed(0)}×`;
        console.log(`Cypher ${fmt(cy.ms)} vs SQL ${sql.ms == null ? sql.note : fmt(sql.ms)} → ${winner}`);
        rows.push({ h, cy, sql, winner });
      }
      console.log("\n| Hops | Cypher | SQL | Vencedor |");
      console.log("| ---- | ------ | --- | -------- |");
      for (const r of rows) console.log(`| ${r.h} | ${fmt(r.cy.ms)} | ${r.sql.ms == null ? r.sql.note : fmt(r.sql.ms)} | ${r.winner} |`);
      return;
    }
    // Descobre dois officers conectados por um caminho de ~4 hops (destino garantido).
    const ofType = (await one(session,
      `MATCH (:Officer)-[r]->(:Entity) RETURN type(r) AS t, count(*) AS c ORDER BY c DESC LIMIT 1`)).get("t");
    const imType = (await one(session,
      `MATCH (:Intermediary)-[r]->(:Entity) RETURN type(r) AS t, count(*) AS c ORDER BY c DESC LIMIT 1`)).get("t");
    const hub = await one(session,
      `MATCH (o:Officer)-[r]->(:Entity) WITH o, count(*) AS deg ORDER BY deg DESC LIMIT 1
       RETURN id(o) AS id, o.name AS name`);
    const src = hub.get("id");
    const other = await one(session,
      `MATCH (o:Officer) WHERE id(o) = $id
       MATCH (o)-[:\`${ofType}\`]->()<-[:\`${imType}\`]-()-[:\`${imType}\`]->()<-[:\`${ofType}\`]-(x:Officer)
       WHERE id(x) <> id(o) RETURN id(x) AS id LIMIT 1`, { id: neo4j.int(src) });
    const tgt = other?.get("id");
    if (tgt == null) throw new Error("não achei par de officers conectado.");

    console.log(`Sweep de profundidade · caminho mais curto · ${RUNS} reps/medida · timeout SQL ${PG_TIMEOUT_MS / 1000}s`);
    console.log(`Origem: "${hub.get("name")}" (${src}) → destino ${tgt}\n`);

    const rows = [];
    for (let h = MIN_HOPS; h <= MAX_HOPS; h++) {
      process.stdout.write(`· hops=${h}… `);
      const cy = await timeCypher(session, src, tgt, h);
      const sql = await timeSql(client, src, tgt, h);
      const winner = sql.ms == null ? "Cypher ✓" : `Cypher ${(sql.ms / cy.ms).toFixed(0)}×`;
      console.log(`Cypher ${fmt(cy.ms)} vs SQL ${sql.ms == null ? sql.note : fmt(sql.ms)} → ${winner}`);
      rows.push({ h, cy, sql, winner });
    }

    // Tabela Markdown pros slides.
    console.log("\n| Hops | Cypher | SQL | Vencedor |");
    console.log("| ---- | ------ | --- | -------- |");
    for (const r of rows) {
      console.log(`| ${r.h} | ${fmt(r.cy.ms)} | ${r.sql.ms == null ? r.sql.note : fmt(r.sql.ms)} | ${r.winner} |`);
    }
  } finally {
    await session.close();
    await driver.close();
    await client.end();
  }
}

main().catch((err) => {
  console.error("\n✗ Sweep falhou:", err.message);
  process.exit(1);
});
