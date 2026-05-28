-- Schema SQL equivalente ao grafo ICIJ Offshore Leaks.
-- Modelagem relacional clássica: 4 tabelas de "nós" + 1 tabela de "relações"
-- (typical many-to-many com tipo). Esse schema é o ponto de comparação:
-- queries multi-hop aqui viram JOINs/CTEs aninhados; em Cypher, é uma linha.

CREATE TABLE officers (
    node_id     BIGINT PRIMARY KEY,
    name        TEXT NOT NULL,
    country     TEXT,
    countries   TEXT,
    sourceID    TEXT,
    valid_until TEXT,
    note        TEXT
);

CREATE TABLE entities (
    node_id           BIGINT PRIMARY KEY,
    name              TEXT NOT NULL,
    original_name     TEXT,
    former_name       TEXT,
    jurisdiction      TEXT,
    jurisdiction_desc TEXT,
    company_type      TEXT,
    address           TEXT,
    incorporation_date DATE,
    inactivation_date  DATE,
    struck_off_date    DATE,
    status            TEXT,
    service_provider  TEXT,
    sourceID          TEXT,
    valid_until       TEXT,
    note              TEXT
);

CREATE TABLE intermediaries (
    node_id     BIGINT PRIMARY KEY,
    name        TEXT NOT NULL,
    country     TEXT,
    countries   TEXT,
    status      TEXT,
    sourceID    TEXT,
    valid_until TEXT,
    note        TEXT
);

CREATE TABLE addresses (
    node_id     BIGINT PRIMARY KEY,
    address     TEXT NOT NULL,
    name        TEXT,
    country     TEXT,
    countries   TEXT,
    sourceID    TEXT,
    valid_until TEXT,
    note        TEXT
);

-- Tabela única de relações com tipo discriminador.
-- Mesma ideia das edges no grafo: (start) -[type {props}]-> (end).
-- Em Cypher isso é nativo; aqui precisamos de campos genéricos + checagem por aplicação.
CREATE TABLE relationships (
    id         BIGSERIAL PRIMARY KEY,
    rel_type   TEXT NOT NULL,
    start_id   BIGINT NOT NULL,
    end_id     BIGINT NOT NULL,
    link       TEXT,
    status     TEXT,
    start_date DATE,
    end_date   DATE,
    sourceID   TEXT
);

CREATE INDEX idx_rel_start    ON relationships (start_id);
CREATE INDEX idx_rel_end      ON relationships (end_id);
CREATE INDEX idx_rel_type     ON relationships (rel_type);
CREATE INDEX idx_rel_start_end ON relationships (start_id, end_id);

CREATE INDEX idx_officers_name      ON officers      USING gin (to_tsvector('simple', name));
CREATE INDEX idx_entities_name      ON entities      USING gin (to_tsvector('simple', name));
CREATE INDEX idx_intermediaries_name ON intermediaries USING gin (to_tsvector('simple', name));

-- View unificada de "qualquer nó" — espelha o conceito de Node do Neo4j.
-- Útil pra queries que percorrem relações sem saber o tipo do nó.
CREATE VIEW all_nodes AS
    SELECT node_id, name, 'Officer'      AS kind FROM officers
UNION ALL
    SELECT node_id, name, 'Entity'       AS kind FROM entities
UNION ALL
    SELECT node_id, name, 'Intermediary' AS kind FROM intermediaries
UNION ALL
    SELECT node_id, address AS name, 'Address' AS kind FROM addresses;

COMMENT ON VIEW all_nodes IS
'Espelho relacional do conceito de Node — em Neo4j isso é gratuito, em SQL exige UNION ALL.';
