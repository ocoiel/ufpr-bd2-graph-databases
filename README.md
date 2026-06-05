# Banco de Dados 2 — Trabalho Final

**Tema 9 — Graph Databases (Neo4j)**
UFPR · Apresentação 17/06/2026

Demo investigativa sobre o dataset real do **ICIJ Offshore Leaks** (Panama Papers + Paradise Papers + Pandora Papers + Bahamas Leaks + Offshore Leaks combinados — ~810k entidades, ~3.3M relacionamentos), com comparação lado a lado **Cypher vs SQL** — incluindo um benchmark que roda as mesmas perguntas nos dois bancos.

## Stack

- **Neo4j 5.26 Community** (plugins GDS + APOC) — banco de grafos
- **PostgreSQL 17** — banco relacional, espelho do grafo, pra comparação
- **Docker Compose** — orquestração local
- **Next.js 16 + React 19 + Cytoscape.js** — front investigativo de visualização

## Setup rápido

```bash
cp .env.example .env
docker compose up -d                  # sobe Neo4j + Postgres
./scripts/load-neo4j-dump.sh          # carrega o dump do ICIJ no Neo4j (rodar 1x)

cd app
pnpm install
pnpm mirror:pg --truncate             # espelha o grafo no Postgres (rodar 1x)
pnpm dev                              # http://localhost:3000
```

Acesse:
- **App**: http://localhost:3000 — busca, visualização e algoritmos
- **Neo4j Browser**: http://localhost:7474 — login `neo4j` / `panama-papers-2026`
- **Postgres**: `psql -h localhost -U postgres offshoreleaks` (mesma senha)

## O app

Front investigativo no estilo "siga o dinheiro". Busca uma pessoa/empresa, abre a
vizinhança no grafo e investiga a partir dali.

- **Busca** — encontra Officers, Entities e Intermediaries por nome
- **Grafo** — vizinhança interativa (Cytoscape + layout fcose), clique pra expandir
- **Algoritmos (GDS)** — PageRank (mais influentes), Louvain (comunidades) e
  caminho mais curto entre dois nós, projetados sob demanda na vizinhança
- **CRUD** — cria/edita/remove nós e relações
- **Painel de Cypher** — mostra a query exata executada a cada ação, com o tempo

Cada interação no app revela o Cypher por trás — é parte da demonstração.

## SQL vs Cypher

O coração do trabalho. O mesmo grafo vive nos dois bancos (o ETL `pnpm mirror:pg`
copia o Neo4j pro schema relacional de `postgres/init/01_schema.sql`), então dá
pra fazer a mesma pergunta nos dois paradigmas e medir.

- **Queries comentadas**: `postgres/queries/sql_vs_cypher.sql` — cada query SQL com
  o Cypher equivalente ao lado.
- **Catálogo executável**: `app/scripts/lib/query-pairs.mjs` — os pares como dados.
- **Benchmark**: `pnpm bench` — roda os pares nos dois bancos, com aquecimento e
  repetições, e imprime uma tabela comparativa em Markdown:

```bash
cd app
pnpm bench --runs 10 --hops 6
```

A tese: a tradução é trivial e o desempenho empata nos casos rasos (busca por
índice, 1 hop), mas cresce de forma desproporcional no SQL conforme os hops
aumentam — 2 hops já viram 4 JOINs, e caminho de profundidade variável vira um
CTE recursivo que costuma estourar o `statement_timeout`. Em Cypher, é uma linha.
PageRank e Louvain (GDS) nem têm equivalente declarativo em SQL puro.

## Dataset

Baixado de: https://offshoreleaks-data.icij.org/offshoreleaks/neo4j/icij-offshoreleaks-5.13.0.dump

Licença: Open Database License (ODbL). Sempre cite o ICIJ ao usar.

## Estrutura

```
.
├── docker-compose.yml          # Neo4j + Postgres
├── data/                       # dump do ICIJ (gitignored)
├── postgres/
│   ├── init/                   # schema relacional (rodado na inicialização)
│   └── queries/                # queries comentadas SQL vs Cypher
├── scripts/
│   └── load-neo4j-dump.sh      # carrega o dump no Neo4j
└── app/                        # front Next.js + scripts de comparação
    ├── app/                    # rotas e API (busca, vizinhança, path, GDS, CRUD)
    ├── components/             # painéis e visualização do grafo
    ├── lib/                    # driver Neo4j, queries Cypher, tipos
    └── scripts/
        ├── mirror-to-postgres.mjs   # ETL Neo4j → Postgres
        ├── benchmark.mjs            # benchmark SQL vs Cypher
        └── lib/query-pairs.mjs      # catálogo de pares de query
```
