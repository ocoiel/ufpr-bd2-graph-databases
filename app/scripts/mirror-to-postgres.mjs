// ETL Neo4j → Postgres.
//
// O Neo4j é a fonte de verdade (carregado do dump do ICIJ via scripts/load-neo4j-dump.sh).
// Este script espelha os nós e relacionamentos para o schema relacional de
// postgres/init/01_schema.sql, pra que a comparação SQL vs Cypher rode sobre
// EXATAMENTE o mesmo dataset nos dois bancos.
//
// Uso:
//   node --env-file=../.env scripts/mirror-to-postgres.mjs            # carrega tudo
//   node --env-file=../.env scripts/mirror-to-postgres.mjs --truncate # recarrega do zero
//   node --env-file=../.env scripts/mirror-to-postgres.mjs --limit 50000
//
// Notas:
// - id(n) no Neo4j vira node_id no Postgres (mesma chave nos dois lados).
// - rel_type é gravado em minúsculas (consistente com postgres/queries/sql_vs_cypher.sql).
// - Colunas DATE do schema ficam NULL: as datas do ICIJ vêm em formatos variados
//   ("12-DEC-2008", vazio, ...) e a comparação não depende delas. Mantém o load robusto.

import neo4j from "neo4j-driver";
import pg from "pg";

const argv = process.argv.slice(2);
const TRUNCATE = argv.includes("--truncate");
const limitFlag = argv.indexOf("--limit");
const LIMIT = limitFlag >= 0 ? Number(argv[limitFlag + 1]) : Infinity;
const BATCH = 5000;

const NEO4J_URI = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER ?? "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? "neo4j";

// Mapa label do Neo4j -> { tabela, colunas, projeção das props }.
// `cols` é a ordem das colunas no INSERT; `pick` extrai os valores na mesma ordem
// a partir das propriedades do nó (faltando => NULL).
const NODE_SPECS = {
  Officer: {
    table: "officers",
    cols: ["node_id", "name", "country", "countries", "sourceID", "valid_until", "note"],
    pick: (id, p) => [id, s(p.name), s(p.country_codes ?? p.country), s(p.countries), s(p.sourceID), s(p.valid_until), s(p.note)],
  },
  Entity: {
    table: "entities",
    cols: ["node_id", "name", "original_name", "former_name", "jurisdiction", "jurisdiction_desc", "company_type", "address", "status", "service_provider", "sourceID", "valid_until", "note"],
    pick: (id, p) => [id, s(p.name), s(p.original_name), s(p.former_name), s(p.jurisdiction), s(p.jurisdiction_description), s(p.company_type), s(p.address), s(p.status), s(p.service_provider), s(p.sourceID), s(p.valid_until), s(p.note)],
  },
  Intermediary: {
    table: "intermediaries",
    cols: ["node_id", "name", "country", "countries", "status", "sourceID", "valid_until", "note"],
    pick: (id, p) => [id, s(p.name), s(p.country_codes ?? p.country), s(p.countries), s(p.status), s(p.sourceID), s(p.valid_until), s(p.note)],
  },
  Address: {
    table: "addresses",
    cols: ["node_id", "address", "name", "country", "countries", "sourceID", "valid_until", "note"],
    pick: (id, p) => [id, s(p.address ?? p.name), s(p.name), s(p.country_codes ?? p.country), s(p.countries), s(p.sourceID), s(p.valid_until), s(p.note)],
  },
};

// Normaliza uma prop em texto não-vazio ou null.
function s(v) {
  if (v == null) return null;
  const str = String(v).trim();
  return str.length ? str : null;
}

// INSERT multi-linha parametrizado: ($1,$2,..),($n,..) — uma ida ao banco por batch.
async function insertBatch(client, table, cols, rows) {
  if (rows.length === 0) return;
  const width = cols.length;
  const placeholders = rows
    .map((_, r) => `(${cols.map((_, c) => `$${r * width + c + 1}`).join(",")})`)
    .join(",");
  const flat = rows.flat();
  await client.query(
    `INSERT INTO ${table} (${cols.join(",")}) VALUES ${placeholders}
     ON CONFLICT DO NOTHING`,
    flat,
  );
}

async function mirrorNodes(session, client, label) {
  const spec = NODE_SPECS[label];
  let cursor = -1;
  let total = 0;
  for (;;) {
    if (total >= LIMIT) break;
    const want = Math.min(BATCH, LIMIT - total);
    // Paginação por cursor de id(n) — eficiente e estável (sem SKIP em milhões).
    const { records } = await session.run(
      `MATCH (n:${label}) WHERE id(n) > $cursor
       RETURN id(n) AS id, properties(n) AS props
       ORDER BY id(n) LIMIT $want`,
      { cursor: neo4j.int(cursor), want: neo4j.int(want) },
    );
    if (records.length === 0) break;
    const rows = records.map((rec) => {
      const id = rec.get("id");
      cursor = id;
      return spec.pick(id, rec.get("props") ?? {});
    });
    await insertBatch(client, spec.table, spec.cols, rows);
    total += rows.length;
    process.stdout.write(`\r  ${label}: ${total.toLocaleString("pt-BR")} nós…`);
  }
  process.stdout.write(`\r  ${label}: ${total.toLocaleString("pt-BR")} nós ✓\n`);
  return total;
}

async function mirrorRelationships(session, client) {
  const cols = ["rel_type", "start_id", "end_id", "link", "status", "sourceID"];
  let cursor = -1;
  let total = 0;
  for (;;) {
    if (total >= LIMIT) break;
    const want = Math.min(BATCH, LIMIT - total);
    const { records } = await session.run(
      `MATCH (a)-[r]->(b) WHERE id(r) > $cursor
       RETURN id(r) AS rid, type(r) AS t, id(a) AS s, id(b) AS e,
              r.link AS link, r.status AS status, r.sourceID AS src
       ORDER BY id(r) LIMIT $want`,
      { cursor: neo4j.int(cursor), want: neo4j.int(want) },
    );
    if (records.length === 0) break;
    const rows = records.map((rec) => {
      cursor = rec.get("rid");
      return [
        String(rec.get("t")).toLowerCase(),
        rec.get("s"),
        rec.get("e"),
        s(rec.get("link")),
        s(rec.get("status")),
        s(rec.get("src")),
      ];
    });
    await insertBatch(client, "relationships", cols, rows);
    total += rows.length;
    process.stdout.write(`\r  relationships: ${total.toLocaleString("pt-BR")} arestas…`);
  }
  process.stdout.write(`\r  relationships: ${total.toLocaleString("pt-BR")} arestas ✓\n`);
  return total;
}

async function main() {
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    { disableLosslessIntegers: true }, // id(n) volta como number — simplifica o mapeamento
  );
  const client = new pg.Client({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "panama-papers-2026",
    database: process.env.POSTGRES_DB ?? "offshoreleaks",
  });

  const session = driver.session({ database: process.env.NEO4J_DATABASE ?? "neo4j" });
  await client.connect();

  try {
    const { rows: cnt } = await client.query("SELECT count(*)::int AS n FROM relationships");
    if (cnt[0].n > 0 && !TRUNCATE) {
      console.error(
        `Postgres já tem ${cnt[0].n.toLocaleString("pt-BR")} relações carregadas.\n` +
          `Rode com --truncate pra recarregar do zero, ou apague antes manualmente.`,
      );
      process.exitCode = 1;
      return;
    }

    if (TRUNCATE) {
      console.log("→ TRUNCATE nas tabelas (officers, entities, intermediaries, addresses, relationships)…");
      await client.query(
        "TRUNCATE officers, entities, intermediaries, addresses, relationships RESTART IDENTITY CASCADE",
      );
    }

    const started = Date.now();
    console.log(`→ Espelhando nós (batch=${BATCH}${Number.isFinite(LIMIT) ? `, limit=${LIMIT}` : ""})…`);
    let nodes = 0;
    for (const label of Object.keys(NODE_SPECS)) {
      nodes += await mirrorNodes(session, client, label);
    }

    console.log("→ Espelhando relacionamentos…");
    const rels = await mirrorRelationships(session, client);

    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `\n✓ Espelhamento concluído em ${secs}s — ${nodes.toLocaleString("pt-BR")} nós, ${rels.toLocaleString("pt-BR")} relações.`,
    );
  } finally {
    await session.close();
    await driver.close();
    await client.end();
  }
}

main().catch((err) => {
  console.error("\n✗ Falha no espelhamento:", err.message);
  process.exit(1);
});
