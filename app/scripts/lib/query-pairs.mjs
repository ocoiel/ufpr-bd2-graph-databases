// Catálogo de pares de query SQL ↔ Cypher — fonte única de verdade da comparação.
//
// Cada par é a MESMA pergunta de negócio expressa nos dois paradigmas. O harness
// de benchmark (../benchmark.mjs) injeta o contexto descoberto em runtime
// (ids/nomes de amostra, tipos de relacionamento reais do dump) e cronometra os
// dois lados no mesmo dataset. Esse é o ponto da demo: a tradução é trivial nos
// casos rasos e cresce de forma desproporcional no SQL conforme os hops aumentam.
//
// Cada builder recebe `ctx` e devolve { text, params } — ou `null` quando aquele
// paradigma simplesmente não tem equivalente nativo (ex.: PageRank em SQL).
//
// ctx = {
//   nameFragment,       // trecho de nome p/ busca textual (ex.: "Mossack")
//   officerName,        // nome exato do officer-amostra (hub bem conectado)
//   officerId,          // id(o) no Neo4j == officers.node_id no Postgres
//   officerOfType,      // tipo real Officer→Entity no dump (ex.: "officer_of")
//   intermediaryOfType, // tipo real Intermediary→Entity no dump
//   pathSourceId,       // origem do shortestPath
//   pathTargetId,       // destino do shortestPath (null => par é pulado)
//   maxHops,            // profundidade máxima do caminho
// }

// Cypher não aceita o tipo de relacionamento como parâmetro ($x), então o nome
// precisa ser interpolado na string. Citamos com crase e validamos antes de
// injetar para evitar surpresas com tipos exóticos.
function relPattern(type) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(type)) {
    throw new Error(`tipo de relacionamento inesperado: ${JSON.stringify(type)}`);
  }
  return `\`${type}\``;
}

export const queryPairs = [
  {
    id: "search-by-name",
    title: "Buscar pessoa por nome",
    hops: 0,
    expected: "empate",
    why: "Busca rasa: um índice resolve nos dois bancos.",
    cypher: (ctx) => ({
      text: `MATCH (o:Officer)
WHERE toLower(o.name) CONTAINS toLower($q)
RETURN o.name AS name
LIMIT 25`,
      params: { q: ctx.nameFragment },
    }),
    sql: (ctx) => ({
      text: `SELECT name FROM officers WHERE name ILIKE $1 LIMIT 25`,
      params: [`%${ctx.nameFragment}%`],
    }),
  },

  {
    id: "entities-controlled",
    title: "Empresas que a pessoa controla",
    hops: 1,
    expected: "empate",
    why: "1 hop: um JOIN indexado empata com o pattern do Cypher.",
    cypher: (ctx) => ({
      text: `MATCH (o:Officer)-[r]->(e:Entity)
WHERE id(o) = $id
RETURN e.name AS name
LIMIT 100`,
      params: { id: ctx.officerId },
    }),
    sql: (ctx) => ({
      text: `SELECT e.name
  FROM relationships r
  JOIN entities e ON e.node_id = r.end_id
 WHERE r.start_id = $1
 LIMIT 100`,
      params: [ctx.officerId],
    }),
  },

  {
    id: "co-officers-via-intermediary",
    title: "Quem mais usou o mesmo intermediário",
    hops: 2,
    expected: "Cypher",
    why: "2 hops com volta: o SQL já precisa de 4 JOINs sobre a tabela de relações.",
    cypher: (ctx) => ({
      text: `MATCH (o:Officer) WHERE id(o) = $id
MATCH (o)-[:${relPattern(ctx.officerOfType)}]->(e1)
      <-[:${relPattern(ctx.intermediaryOfType)}]-(i)
      -[:${relPattern(ctx.intermediaryOfType)}]->(e2)
      <-[:${relPattern(ctx.officerOfType)}]-(other:Officer)
WHERE id(other) <> id(o)
RETURN DISTINCT other.name AS name
LIMIT 100`,
      params: { id: ctx.officerId },
    }),
    sql: (ctx) => ({
      text: `SELECT DISTINCT other.name
  FROM relationships r1
  JOIN relationships r2 ON r2.end_id   = r1.end_id   AND r2.rel_type = $2
  JOIN relationships r3 ON r3.start_id = r2.start_id AND r3.rel_type = $2
  JOIN relationships r4 ON r4.end_id   = r3.end_id   AND r4.rel_type = $3
  JOIN officers other  ON other.node_id = r4.start_id
 WHERE r1.start_id = $1 AND r1.rel_type = $3
   AND other.node_id <> $1
 LIMIT 100`,
      params: [
        ctx.officerId,
        ctx.intermediaryOfType.toLowerCase(),
        ctx.officerOfType.toLowerCase(),
      ],
    }),
  },

  {
    id: "shortest-path",
    title: "Caminho mais curto entre duas pessoas",
    hops: "até maxHops",
    expected: "Cypher",
    why: "Profundidade variável: shortestPath é uma linha; em SQL vira CTE recursivo que explode.",
    requires: (ctx) => ctx.pathTargetId != null,
    cypher: (ctx) => ({
      // maxHops é inlined: o intervalo *..n do Cypher não aceita parâmetro.
      text: `MATCH (a) WHERE id(a) = $s
MATCH (b) WHERE id(b) = $t
MATCH path = shortestPath((a)-[*..${Number(ctx.maxHops)}]-(b))
RETURN length(path) AS hops`,
      params: { s: ctx.pathSourceId, t: ctx.pathTargetId },
    }),
    sql: (ctx) => ({
      // Equivalente honesto do shortestPath: travessia NÃO direcionada (segue
      // start->end e end->start). É justamente isso que faz o frontier crescer
      // exponencialmente — em grafo denso costuma estourar o statement_timeout.
      text: `WITH RECURSIVE walk AS (
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
SELECT path, depth FROM walk WHERE node = $2 ORDER BY depth LIMIT 1`,
      params: [ctx.pathSourceId, ctx.pathTargetId, Number(ctx.maxHops)],
    }),
  },

  {
    id: "pagerank",
    title: "PageRank — nós mais influentes",
    hops: "grafo inteiro",
    expected: "Cypher (SQL não suporta)",
    why: "Algoritmo de grafo: nativo via GDS; em SQL puro não há equivalente declarativo.",
    cypher: (ctx) => ({
      // PageRank na vizinhança de 2 hops do officer-amostra (espelha o que o app
      // faz): projeta o subgrafo, roda o GDS e descarta a projeção.
      text: `MATCH (root) WHERE id(root) = $id
CALL apoc.path.subgraphAll(root, {maxLevel: 2}) YIELD nodes, relationships
CALL gds.graph.project.cypher(
  'bench-pr-' + toString(timestamp()),
  'UNWIND $ns AS n RETURN id(n) AS id',
  'UNWIND $rels AS r RETURN id(startNode(r)) AS source, id(endNode(r)) AS target',
  {parameters: {ns: nodes, rels: relationships}}
) YIELD graphName, nodeCount
CALL gds.pageRank.stream(graphName, {maxIterations: 20, dampingFactor: 0.85})
YIELD nodeId, score
WITH graphName, nodeId, score ORDER BY score DESC LIMIT 25
WITH graphName, collect(score) AS scores
CALL gds.graph.drop(graphName, false) YIELD graphName AS dropped
RETURN size(scores) AS top`,
      params: { id: ctx.officerId },
    }),
    // Sem equivalente em SQL puro — exige loop iterativo em PL/pgSQL ou exportar
    // o grafo p/ outra ferramenta. Esse é um dos pontos onde graph DB ganha por design.
    sql: () => null,
  },
];
