# Banco de Dados 2 — Trabalho Final

**Tema 9 — Graph Databases (Neo4j)**
UFPR · Apresentação 17/06/2026

Demo investigativa sobre o dataset real do **ICIJ Offshore Leaks** (Panama Papers + Paradise Papers + Pandora Papers + Bahamas Leaks + Offshore Leaks combinados — ~810k entidades, ~3.3M relacionamentos), com comparação lado a lado **Cypher vs SQL**.

## Stack

- **Neo4j 5.26 Community** (com plugins GDS + APOC) — banco de grafos
- **PostgreSQL 17** — banco relacional pra comparação
- **Docker Compose** — orquestração local
- **Next.js + neovis.js** — frontend de visualização (a fazer)

## Setup rápido

```bash
cp .env.example .env
docker compose up -d                  # sobe Neo4j + Postgres
./scripts/load-neo4j-dump.sh          # carrega o dump (rodar 1x)
```

Acesse:
- Neo4j Browser: http://localhost:7474 — login `neo4j` / `panama-papers-2026`
- Postgres: `psql -h localhost -U postgres offshoreleaks` (senha mesma)

## Dataset

Baixado de: https://offshoreleaks-data.icij.org/offshoreleaks/neo4j/icij-offshoreleaks-5.13.0.dump

Licença: Open Database License (ODbL). Sempre cite o ICIJ ao usar.

## Estrutura

```
.
├── docker-compose.yml          # Neo4j + Postgres
├── data/                       # dump do ICIJ (gitignored)
├── postgres/
│   ├── init/                   # rodado na inicialização do Postgres
│   └── queries/                # queries de comparação SQL vs Cypher
├── scripts/                    # automações (load do dump, etc.)
└── app/                        # Next.js (a criar)
```
