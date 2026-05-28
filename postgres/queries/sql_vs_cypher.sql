-- Queries de exemplo pra comparação SQL vs Cypher.
-- Cada query SQL aqui tem equivalente Cypher de UMA linha — esse é o ponto da demo.

-- ============================================================================
-- 1. Buscar uma pessoa por nome (SHALLOW — SQL é tão rápido quanto Cypher)
-- ============================================================================
-- Cypher: MATCH (o:Officer) WHERE o.name CONTAINS 'Putin' RETURN o LIMIT 25;
-- SQL:
SELECT * FROM officers
 WHERE name ILIKE '%Putin%'
 LIMIT 25;

-- ============================================================================
-- 2. Empresas offshore que uma pessoa controla (1 HOP — empate)
-- ============================================================================
-- Cypher:
--   MATCH (o:Officer {name:'X'})-[:OFFICER_OF]->(e:Entity) RETURN e;
-- SQL:
SELECT e.*
  FROM officers o
  JOIN relationships r ON r.start_id = o.node_id AND r.rel_type = 'officer_of'
  JOIN entities e ON e.node_id = r.end_id
 WHERE o.name = 'X';

-- ============================================================================
-- 3. "Quem mais usou o mesmo intermediário?" (2 HOPS — SQL começa a sofrer)
-- ============================================================================
-- Cypher:
--   MATCH (o:Officer {name:'X'})-[:OFFICER_OF]->(e1)<-[:INTERMEDIARY_OF]-(i)
--   -[:INTERMEDIARY_OF]->(e2)<-[:OFFICER_OF]-(other:Officer)
--   WHERE other.name <> 'X'
--   RETURN DISTINCT other.name;
-- SQL (4 JOINs):
SELECT DISTINCT other.name
  FROM officers o
  JOIN relationships r1 ON r1.start_id = o.node_id  AND r1.rel_type = 'officer_of'
  JOIN relationships r2 ON r2.end_id   = r1.end_id  AND r2.rel_type = 'intermediary_of'
  JOIN relationships r3 ON r3.start_id = r2.start_id AND r3.rel_type = 'intermediary_of'
  JOIN relationships r4 ON r4.end_id   = r3.end_id  AND r4.rel_type = 'officer_of'
  JOIN officers other ON other.node_id = r4.start_id
 WHERE o.name = 'X' AND other.node_id <> o.node_id;

-- ============================================================================
-- 4. Caminho mais curto entre duas pessoas (UNBOUNDED — SQL é horror)
-- ============================================================================
-- Cypher (1 linha!):
--   MATCH path = shortestPath((a:Officer {name:'A'})-[*..6]-(b:Officer {name:'B'}))
--   RETURN path;
--
-- SQL (CTE recursivo, lento, limite de profundidade):
WITH RECURSIVE paths AS (
    SELECT
        start_id, end_id,
        ARRAY[start_id, end_id] AS path,
        1 AS depth
      FROM relationships
     WHERE start_id = (SELECT node_id FROM officers WHERE name = 'A' LIMIT 1)
    UNION ALL
    SELECT
        p.start_id, r.end_id,
        p.path || r.end_id,
        p.depth + 1
      FROM paths p
      JOIN relationships r ON r.start_id = p.end_id
     WHERE p.depth < 6
       AND NOT (r.end_id = ANY(p.path))
)
SELECT * FROM paths
 WHERE end_id = (SELECT node_id FROM officers WHERE name = 'B' LIMIT 1)
 ORDER BY depth
 LIMIT 1;
-- ^ Em datasets grandes, isso pode explodir em memória ou demorar minutos.
--   No Neo4j, shortestPath usa BFS bidirecional otimizado.

-- ============================================================================
-- 5. PageRank — pessoas mais "influentes" no grafo
-- ============================================================================
-- Cypher (com GDS):
--   CALL gds.pageRank.stream('offshore-graph')
--   YIELD nodeId, score
--   RETURN gds.util.asNode(nodeId).name AS name, score
--   ORDER BY score DESC LIMIT 20;
--
-- SQL: NÃO TEM EQUIVALENTE NATIVO. PageRank precisa ser implementado manualmente
-- via iteração (loop em PL/pgSQL) ou exportado pra Python/Spark/etc.
-- Esse é um dos pontos onde graph DB ganha por design.
