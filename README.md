# Banco de Dados 2 — Trabalho Final

**Tema 9 — Graph Databases (Neo4j)** · UFPR · 17/06/2026

Demo investigativa sobre o dataset **real** do [ICIJ Offshore Leaks](https://offshoreleaks.icij.org/)
(Panama Papers + Paradise Papers + Pandora Papers + Bahamas Leaks + Offshore Leaks combinados —
**~2 milhões de nós e ~3,3 milhões de relações**), com comparação lado a lado **Cypher vs SQL** —
incluindo um benchmark que roda as mesmas perguntas nos dois bancos e mede.

> 🎤 **Slides da apresentação (ao vivo):** https://ocoiel.github.io/ufpr-bd2-graph-databases/
> Navegue com `←` `→` · tecla `N` abre o roteiro de cada slide · `F` tela cheia.

---

## 📸 Visão geral

**O app investigativo — "siga o dinheiro".** Busca uma pessoa/empresa, abre a vizinhança no grafo
e investiga a partir dali. Cada ação revela o **Cypher exato** executado, com o tempo:

![App Offshore Graph — busca por "brazil", grafo da vizinhança e o Cypher executado](docs/img/app-offshore-graph.png)

**"Olá, mundo" em Cypher** (Neo4j Browser) — a sintaxe é "ASCII-art": `()` é um nó, `-[]->` é um
relacionamento. O código se parece com o desenho:

![Neo4j Browser — CREATE de dois nós e uma relação, e o grafo resultante](docs/img/neo4j-ola-mundo.png)

---

## 🧱 Stack

- **Neo4j 5.26 Community** (plugins **GDS** + **APOC**) — banco de grafos
- **PostgreSQL 17** — banco relacional, espelho do grafo, para a comparação
- **Docker Compose** — orquestração local dos dois bancos
- **Next.js 16 + React 19 + Cytoscape.js** — front investigativo de visualização

---

## 🚀 Como baixar e rodar

### Pré-requisitos

- **Docker** + **Docker Compose** (Docker Desktop no Mac/Windows)
- **Node.js 20+** e **pnpm** (`npm i -g pnpm`)
- ~5 GB livres (dump do ICIJ + volumes dos bancos)

### Passo a passo

```bash
# 1. Clonar e configurar
git clone https://github.com/ocoiel/ufpr-bd2-graph-databases.git
cd ufpr-bd2-graph-databases
cp .env.example .env

# 2. Subir Neo4j + Postgres
docker compose up -d
#    (no 1º boot o Neo4j baixa os plugins GDS/APOC — aguarde ~1 min ficar "healthy")

# 3. Baixar o dump do ICIJ (~1.5 GB) para data/
curl -L -o data/icij-offshoreleaks-5.13.0.dump \
  https://offshoreleaks-data.icij.org/offshoreleaks/neo4j/icij-offshoreleaks-5.13.0.dump

# 4. Carregar o dump no Neo4j (rodar 1x — leva alguns minutos)
./scripts/load-neo4j-dump.sh

# 5. Instalar deps e espelhar o grafo no Postgres (rodar 1x — ~4 min)
cd app
pnpm install
pnpm mirror:pg --truncate

# 6. Subir o app
pnpm dev
```

### Acessos

| Serviço | URL | Credenciais |
|---|---|---|
| **App** | http://localhost:3000 | — |
| **Neo4j Browser** | http://localhost:7474 | `neo4j` / `panama-papers-2026` |
| **Postgres** | `psql -h localhost -U postgres offshoreleaks` | senha: `panama-papers-2026` |

> 💡 Se a porta **5432** já estiver ocupada por um Postgres local, edite `POSTGRES_PORT`
> no `.env` (ex.: `5433`) antes do `docker compose up`.

---

## 🔎 O app

Front investigativo no estilo "siga o dinheiro". Cada interação revela o Cypher por trás — é parte da demonstração.

- **Busca** — encontra Officers (pessoas), Entities (empresas) e Intermediaries por nome
- **Grafo** — vizinhança interativa (Cytoscape + layout fcose); clique num nó para expandir
- **Algoritmos (GDS)** — PageRank (mais influentes), Louvain (comunidades) e caminho mais curto
  entre dois nós, projetados sob demanda na vizinhança
- **CRUD** — cria / edita / remove nós e relações
- **Painel de Cypher** — mostra a query exata executada a cada ação, com o tempo

---

## ⚖️ SQL vs Cypher — o coração do trabalho

O mesmo grafo vive nos dois bancos: o ETL `pnpm mirror:pg` copia o Neo4j para o schema relacional de
`postgres/init/01_schema.sql`. Assim dá para fazer a **mesma pergunta** nos dois paradigmas e medir,
sobre **exatamente o mesmo dado**.

- **Queries comentadas**: `postgres/queries/sql_vs_cypher.sql` — cada SQL com o Cypher equivalente ao lado.
- **Catálogo executável**: `app/scripts/lib/query-pairs.mjs` — os pares como dados.
- **Benchmark**: `pnpm bench` — roda os pares nos dois bancos (aquecimento + repetições) e imprime uma
  tabela comparativa em Markdown.

```bash
cd app
pnpm bench --runs 5 --hops 6                 # tabela comparativa
node --env-file=../.env scripts/hop-sweep.mjs   # degradação do SQL por profundidade (2→6 hops)
```

### Resultado medido (neste dataset)

| Pergunta | Hops | Cypher | SQL | Vencedor |
|---|---|---|---|---|
| Buscar por nome | 0 | 80,9 ms | 70,0 ms | empate |
| Empresas controladas | 1 | 2,8 ms | 25,9 ms | **Cypher 9×** |
| Mesmo intermediário | 2 | 2,9 ms | 567,6 ms | **Cypher 193×** |
| Caminho mais curto | variável | 5,7 ms | timeout (>20 s) | **Cypher ✓** |
| PageRank (influência) | grafo | 367,9 ms | não existe | **Cypher ✓** |

**A tese:** a tradução SQL → Cypher é trivial (cada "seta" vira um JOIN), mas o desempenho empata só nos
casos rasos. A vantagem do grafo cresce de forma desproporcional com os hops — 2 hops já viram 4 JOINs,
e caminho de profundidade variável vira um CTE recursivo que estoura o `statement_timeout`. PageRank e
Louvain (GDS) nem têm equivalente declarativo em SQL puro.

---

## 🗂️ Dataset

Baixado de: https://offshoreleaks-data.icij.org/offshoreleaks/neo4j/icij-offshoreleaks-5.13.0.dump

- **Officer** (pessoa) · **Entity** (empresa offshore) · **Intermediary** (escritório) · **Address**
- ~2,0 mi nós · ~3,3 mi relações
- Licença: **Open Database License (ODbL)**. Sempre cite o ICIJ ao usar.

---

## 📁 Estrutura

```
.
├── docker-compose.yml          # Neo4j + Postgres
├── data/                       # dump do ICIJ (gitignored — baixar no passo 3)
├── docs/img/                   # screenshots do README
├── slides/                     # apresentação (deck HTML), roteiro e guia de estudo (PDF)
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
        ├── hop-sweep.mjs            # benchmark de profundidade (caminho mais curto)
        └── lib/query-pairs.mjs      # catálogo de pares de query
```

---

## 🎤 Apresentação

- **Slides (ao vivo):** https://ocoiel.github.io/ufpr-bd2-graph-databases/
- **Fontes:** `slides/index.html` (deck) · `slides/ROTEIRO.md` (roteiro falado) · `slides/Graph-Databases-ESTUDO.pdf` (guia de estudo)
