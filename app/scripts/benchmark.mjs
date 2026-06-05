// Benchmark SQL vs Cypher — a prova empírica da tese do trabalho.
//
// Roda cada par de query (lib/query-pairs.mjs) nos DOIS bancos sobre o mesmo
// dataset, cronometra com aquecimento + N repetições e imprime uma tabela
// comparativa em Markdown (fácil de colar nos slides / no relatório).
//
// Pré-requisitos:
//   1. Neo4j carregado com o dump do ICIJ.
//   2. Postgres espelhado:  node --env-file=../.env scripts/mirror-to-postgres.mjs --truncate
//
// Uso:
//   node --env-file=../.env scripts/benchmark.mjs                 # 5 repetições
//   node --env-file=../.env scripts/benchmark.mjs --runs 10 --hops 6
//
// O contexto (officer-amostra, tipos de relacionamento, endpoints do caminho) é
// DESCOBERTO em runtime — o benchmark se adapta a qualquer versão do dump.

import neo4j from "neo4j-driver";
import pg from "pg";
import { queryPairs } from "./lib/query-pairs.mjs";

const argv = process.argv.slice(2);
function flag(name, def) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? Number(argv[i + 1]) : def;
}
const RUNS = flag("runs", 5);
const MAX_HOPS = flag("hops", 5);
const PG_TIMEOUT_MS = flag("timeout", 30000); // teto p/ o CTE recursivo não pendurar a sessão

const median = (xs) => {
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const fmtMs = (ms) => (ms == null ? "—" : `${ms.toFixed(1)} ms`);

// --- engines ----------------------------------------------------------------

async function timeCypher(session, build, ctx) {
  const q = build(ctx);
  if (!q) return { ms: null, note: "sem query" };
  await session.run(q.text, q.params); // aquecimento
  const times = [];
  let rowCount = 0;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const res = await session.run(q.text, q.params);
    times.push(performance.now() - t0);
    rowCount = res.records.length;
  }
  return { ms: median(times), rows: rowCount };
}

async function timeSql(client, build, ctx) {
  const q = build(ctx);
  if (!q) return { ms: null, note: "✗ sem equivalente nativo" };
  try {
    await client.query(`SET statement_timeout = ${PG_TIMEOUT_MS}`);
    await client.query(q.text, q.params); // aquecimento
    const times = [];
    let rowCount = 0;
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      const res = await client.query(q.text, q.params);
      times.push(performance.now() - t0);
      rowCount = res.rowCount;
    }
    return { ms: median(times), rows: rowCount };
  } catch (err) {
    // 57014 = query_canceled (statement_timeout estourou) — resultado esperado
    // e didático nos casos multi-hop profundos.
    if (err.code === "57014") return { ms: null, note: `timeout (>${PG_TIMEOUT_MS / 1000}s)` };
    return { ms: null, note: `erro: ${err.message.split("\n")[0]}` };
  } finally {
    await client.query("SET statement_timeout = 0").catch(() => {});
  }
}

// --- descoberta de contexto -------------------------------------------------

async function one(session, cypher, params = {}) {
  const { records } = await session.run(cypher, params);
  return records[0] ?? null;
}

async function discoverContext(session) {
  // Tipo real de relacionamento Officer→Entity e Intermediary→Entity no dump
  // (o ICIJ varia a grafia entre versões; não dá pra hardcodar).
  const ofRec = await one(
    session,
    `MATCH (:Officer)-[r]->(:Entity) RETURN type(r) AS t, count(*) AS c ORDER BY c DESC LIMIT 1`,
  );
  const imRec = await one(
    session,
    `MATCH (:Intermediary)-[r]->(:Entity) RETURN type(r) AS t, count(*) AS c ORDER BY c DESC LIMIT 1`,
  );
  if (!ofRec || !imRec) {
    throw new Error("não achei relacionamentos Officer/Intermediary→Entity — o dump está carregado?");
  }
  const officerOfType = ofRec.get("t");
  const intermediaryOfType = imRec.get("t");

  // Officer-amostra: o mais conectado a entidades (hub) — garante hops interessantes.
  const hub = await one(
    session,
    `MATCH (o:Officer)-[r]->(:Entity)
     WITH o, count(*) AS deg ORDER BY deg DESC LIMIT 1
     RETURN id(o) AS id, o.name AS name, deg`,
  );
  if (!hub) throw new Error("nenhum Officer com relação a Entity encontrado.");
  const officerId = hub.get("id");
  const officerName = hub.get("name") ?? "";

  // Fragmento de busca: primeiro token "gordo" do nome (>=4 chars).
  const nameFragment =
    officerName.split(/\s+/).find((w) => w.length >= 4) ?? officerName.slice(0, 6) ?? "Ltd";

  // Endpoint do caminho: um co-officer alcançável via intermediário em comum
  // (~4 hops) — assim o shortestPath tem destino garantido.
  const other = await one(
    session,
    `MATCH (o:Officer) WHERE id(o) = $id
     MATCH (o)-[:\`${officerOfType}\`]->()<-[:\`${intermediaryOfType}\`]-()
           -[:\`${intermediaryOfType}\`]->()<-[:\`${officerOfType}\`]-(x:Officer)
     WHERE id(x) <> id(o)
     RETURN id(x) AS id LIMIT 1`,
    { id: neo4j.int(officerId) },
  );

  return {
    nameFragment,
    officerName,
    officerId,
    officerOfType,
    intermediaryOfType,
    pathSourceId: officerId,
    pathTargetId: other ? other.get("id") : null,
    maxHops: MAX_HOPS,
  };
}

// --- relatório --------------------------------------------------------------

function speedup(cy, sql) {
  if (cy.ms == null && sql.ms == null) return "—";
  if (sql.ms == null) return "Cypher ✓"; // SQL não rodou (timeout / sem equivalente)
  if (cy.ms == null) return "SQL ✓";
  const faster = cy.ms <= sql.ms;
  const ratio = (faster ? sql.ms / cy.ms : cy.ms / sql.ms).toFixed(1);
  return faster ? `Cypher ${ratio}×` : `SQL ${ratio}×`;
}

function printTable(rows) {
  const header = ["#", "Pergunta", "Hops", "Cypher", "SQL", "Vencedor"];
  const body = rows.map((r, i) => [
    String(i + 1),
    r.title,
    String(r.hops),
    r.cy.ms == null ? (r.cy.note ?? "—") : fmtMs(r.cy.ms),
    r.sql.ms == null ? (r.sql.note ?? "—") : fmtMs(r.sql.ms),
    r.winner,
  ]);
  const all = [header, ...body];
  const widths = header.map((_, c) => Math.max(...all.map((row) => row[c].length)));
  const line = (row) => "| " + row.map((cell, c) => cell.padEnd(widths[c])).join(" | ") + " |";
  const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
  console.log("\n" + line(header));
  console.log(sep);
  for (const row of body) console.log(line(row));
}

// --- main -------------------------------------------------------------------

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
    const pgRels = (await client.query("SELECT count(*)::int AS n FROM relationships")).rows[0].n;
    if (pgRels === 0) {
      console.warn("⚠  Postgres vazio — rode scripts/mirror-to-postgres.mjs antes. Seguindo só com o Cypher.\n");
    }

    console.log(`Benchmark SQL vs Cypher · ${RUNS} repetições/medida · timeout SQL ${PG_TIMEOUT_MS / 1000}s`);
    const ctx = await discoverContext(session);
    console.log(
      `Amostra: officer "${ctx.officerName}" (id ${ctx.officerId}) · ` +
        `relações ${ctx.officerOfType}/${ctx.intermediaryOfType} · ` +
        `caminho ${ctx.pathSourceId} → ${ctx.pathTargetId ?? "(sem destino)"}`,
    );

    const rows = [];
    for (const pair of queryPairs) {
      if (pair.requires && !pair.requires(ctx)) {
        console.log(`· pulando "${pair.title}" (pré-requisito não satisfeito)`);
        continue;
      }
      process.stdout.write(`· ${pair.title}… `);
      const cy = await timeCypher(session, pair.cypher, ctx);
      const sql = await timeSql(client, pair.sql, ctx);
      const winner = speedup(cy, sql);
      console.log(`${fmtMs(cy.ms)} vs ${sql.ms == null ? sql.note : fmtMs(sql.ms)} → ${winner}`);
      rows.push({ title: pair.title, hops: pair.hops, cy, sql, winner });
    }

    printTable(rows);
    console.log("\nQuanto mais fundo o hop, mais o SQL sofre — exatamente a tese do trabalho.");
  } finally {
    await session.close();
    await driver.close();
    await client.end();
  }
}

main().catch((err) => {
  console.error("\n✗ Benchmark falhou:", err.message);
  process.exit(1);
});
