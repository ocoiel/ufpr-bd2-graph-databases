# Roteiro — Apresentação Graph Databases (Neo4j)

**BD2 · UFPR · Tema 9 · 17/06/2026**
Duração-alvo: **12–15 min** de fala + demo ao vivo.

---

## Antes de começar (checklist de 2 min)

```bash
# 1. Bancos no ar
docker compose ps              # bd2-neo4j e bd2-postgres "healthy"

# 2. App no ar
cd app && pnpm dev             # http://localhost:3000

# 3. Abas abertas no navegador:
#    - slides/index.html  (a apresentação)
#    - localhost:3000      (o app)
#    - localhost:7474      (Neo4j Browser, opcional p/ olá-mundo ao vivo)
```

> ⚠️ Postgres do projeto roda na porta **5433** (a 5432 já tinha um Postgres nativo na máquina). App, benchmark e ETL já apontam pra 5433.

**Controles dos slides:** `←` `→` navegam · `N` abre/fecha o roteiro embutido · `F` tela cheia · clicar na metade direita/esquerda também navega.

---

## Slide 1 — Abertura (~30s)

> "Bom dia. Nosso tema é **banco de dados de grafos**, usando o Neo4j. A ideia é começar do simples — o que é, pra que serve, um 'olá mundo' — e ir subindo até uma demonstração investigativa real com a base dos **Panama Papers**, comparando lado a lado com SQL."

Diga os nomes da dupla e o número do tema.

---

## Slide 2 — O que é (~1 min)

> "Banco relacional guarda **tabelas e linhas**. Banco de grafos guarda **nós e relacionamentos** — literalmente como você desenharia num quadro branco."

Três peças:
- **Nó** = uma coisa (pessoa, empresa).
- **Relacionamento** = uma ligação com **direção** e **tipo**.
- **Propriedades** = chave-valor, e elas existem tanto em nós **quanto** em relacionamentos.

> "A frase pra guardar: **o relacionamento é cidadão de primeira classe** — ele é armazenado, não recalculado com JOIN a cada consulta."

---

## Slide 3 — Pra que serve (~1 min)

> "Sempre que a pergunta é sobre o **caminho entre as coisas**, e não sobre as coisas isoladas, o grafo brilha."

Exemplos concretos: redes sociais (amigo de amigo), recomendação, detecção de fraude, logística, knowledge graphs pra IA, e o nosso caso — **investigação financeira**.

> "E é honesto dizer: não é bala de prata. Pra relatório tabular, soma e média em coluna, o relacional continua melhor."

---

## Slide 4 — Relacional vs Grafo (~1min30)

> "Mesma informação, dois modelos. No relacional, pra saber 'quem trabalha onde' eu preciso de uma **tabela de junção** e um JOIN pra reconstruir a ligação. No grafo, a ligação **já existe** como aresta."

**O ponto que importa pra demo:**
> "Cada 'pulo' a mais — amigo do amigo do amigo — no relacional é **mais um JOIN**. No grafo é só estender o desenho. É daí que vem a diferença de desempenho que a gente vai medir."

---

## Slide 5 — "Olá mundo" em Cypher (~1min30)

> "Cypher é a 'SQL dos grafos'. A sintaxe é **ASCII-art**: parênteses são nós, setas são relacionamentos."

- `CREATE` grava dois nós e a relação entre eles.
- `MATCH ... RETURN` casa o padrão e devolve.

Leia o MATCH em voz alta: *"casa o padrão pessoa-trabalha-em-empresa e devolve os nomes."*

**Opcional ao vivo (Neo4j Browser, localhost:7474):** cole o `CREATE`, depois o `MATCH`, mostre o nó e a aresta desenhados.

---

## Slide 6 — O dataset (~1 min)

> "Pra uma demo séria, dataset real: o **ICIJ Offshore Leaks** — a base por trás dos Panama, Paradise e Pandora Papers combinados. Tem pessoas, empresas offshore, intermediários (escritórios como o Mossack Fonseca) e endereços."

Números: **2 milhões de nós, 3,3 milhões de relacionamentos**. Escala real, rodando local no Docker.

> "E o pulo do gato do trabalho: o **mesmo dataset** está espelhado no Neo4j **e** no PostgreSQL — pra fazer a mesma pergunta nos dois e medir."

---

## Slide 7 — Transição pra demo (~15s)

> "Chega de slide. Vamos pro app." → **Abrir localhost:3000.**

App estilo "siga o dinheiro": busca um nome, abre a vizinhança, investiga. **Cada ação mostra o Cypher real e o tempo.**

---

## Slide 8 — Query simples: busca (~1 min) — AO VIVO

1. Digitar **`Putin`** na busca.
2. Mostrar os resultados (Alexander Putin, Igor Putin, …).
3. Apontar o **painel inferior**: o Cypher é uma linha (`MATCH ... CONTAINS`).
4. Clicar num resultado → abre a vizinhança no grafo.

> "Essa é a operação **rasa**: aqui SQL e Cypher **empatam**, os dois usam índice. Guardem esse empate — a partir daqui o grafo abre vantagem."

---

## Slide 9 — Multi-hop (~2 min) — AO VIVO

> "Agora a graça: relacionamentos."

- **1 hop:** "quais empresas essa pessoa controla" — uma seta.
- **2 hops com volta:** "quem mais usou o **mesmo intermediário**" — o padrão investigativo clássico ("quem mais está ligado ao mesmo escritório de fachada?").

No app: expandir a vizinhança, mostrar o grafo crescer.

> "Repara no slide: no Cypher é **um padrão**. O mesmo em SQL já são **4 JOINs** sobre a tabela de relações. Mesma pergunta — um lado é um desenho, o outro é um quebra-cabeça."

---

## Slide 10 — Caminho mais curto (~1min30) — AO VIVO

> "O caso onde o SQL realmente sofre: 'qual a menor cadeia de conexões entre A e B?'. A profundidade é **desconhecida**."

- Cypher: `shortestPath`, **uma linha**.
- SQL: **CTE recursivo** — sem saber a profundidade, a busca explode.

No app: aba **Algoritmos → caminho mais curto** entre dois nós.

> "No nosso teste, a partir de um nó bem conectado, o SQL **estoura o timeout já em 3 hops**. O Cypher responde em ~6ms em qualquer profundidade."

---

## Slide 11 — O BENCHMARK (~2 min) — SLIDE-CHAVE

> "Isso não é achismo — a gente mediu. Mesmo dataset nos dois bancos, mesma pergunta, com aquecimento e 5 repetições. Comando: `pnpm bench`."

Ler a tabela de cima pra baixo:
- Busca rasa → **empate**.
- 1 hop → **Cypher 9×**.
- 2 hops → **Cypher ~190×**.
- Caminho variável → **SQL nem termina** (timeout).
- PageRank → **SQL não consegue nem expressar**.

> "A mensagem: quanto mais a pergunta depende de relacionamentos, mais o grafo ganha — de empate a ordens de grandeza."

---

## Slide 12 — "E com 3, 4, 5 hops?" (~1min30)

> "A escala com a profundidade **depende da densidade do nó de partida**."

- **Nó esparso** (poucas conexões): o SQL acompanha até uns 4–5 hops e só perde em 6.
- **Nó denso / hub** (muito conectado — o caso realmente interessante numa investigação): o SQL **estoura o timeout já em 3 hops**.

> "Nos dois casos o Cypher fica praticamente **constante, ~2 a 7ms**. Essa é a chave: o SQL não escala com a profundidade — ele escala com **densidade × profundidade**. O grafo não 'sente' a profundidade do mesmo jeito."

*(Gerado por `node scripts/hop-sweep.mjs` — dá pra rodar ao vivo se quiserem.)*

---

## Slide 13 — Algoritmos de grafo / GDS (~1min30) — AO VIVO

> "Último nível: o grafo não só consulta, ele **analisa a estrutura**. Via a biblioteca GDS do Neo4j."

- **PageRank** — o mesmo algoritmo do Google: quem são os nós mais **influentes**.
- **Louvain** — detecção de **comunidades** (clusters densamente ligados).

No app: aba **Algoritmos**, rodar na vizinhança. Mostrar o **ranking** (PageRank) e as **cores das comunidades** (Louvain) no grafo.

> "Isso, em SQL puro, **não existe**. Teria que exportar o grafo pra Python ou Spark. No Neo4j é uma chamada."

> 💡 Dica de demo: rode os algoritmos sobre a vizinhança de uma **pessoa comum** (resultado da busca), não sobre um intermediário gigante — o subgrafo de um hub é enorme e demora.

---

## Slide 14 — Quando usar / trade-offs (~1 min)

> "Pra fechar com equilíbrio: grafo **não substitui** o relacional."

- **Use grafo:** relacionamentos profundos e variáveis, caminhos, fraude, recomendação.
- **Use relacional:** dados tabulares, agregações, relatórios, transações simples.

> "Na prática se usa os dois — persistência poliglota, cada um no que é bom. Foi exatamente o que fizemos: espelhamos o mesmo dado nos dois."

---

## Slide 15 — Conclusão (~45s)

> "Recapitulando a tese: a **tradução** de SQL pra Cypher é trivial; o **desempenho**, não. Vai do empate na busca rasa às centenas de vezes nos multi-hop, até o ponto onde o SQL simplesmente não termina ou não consegue expressar. Quanto mais a pergunta é sobre conexões, mais o grafo ganha."

Stack: Neo4j 5.26 + GDS + APOC, PostgreSQL 17 (espelho), Next.js — tudo local em Docker.

---

## Slide 16 — Obrigado / Perguntas

Abrir pra perguntas. Munição mental pra Q&A abaixo.

---

## 🛟 Perguntas prováveis (e respostas curtas)

**"Por que o grafo é mais rápido no multi-hop?"**
> *Index-free adjacency*: cada nó guarda ponteiros diretos pros vizinhos. Seguir uma aresta é O(1) local, independente do tamanho total do banco. No SQL, cada hop é um JOIN que varre/indexa a tabela de relações inteira de novo.

**"Então é sempre melhor usar grafo?"**
> Não. Pra dado tabular, agregação e relatório, o relacional é mais simples e eficiente. Grafo ganha quando o **relacionamento** é o protagonista.

**"O Postgres não ficaria mais rápido com mais índices/tuning?"**
> Ajuda nos hops rasos, sim. Mas o problema do caminho de profundidade variável é **algorítmico** (a fronteira do CTE cresce exponencialmente) — índice não resolve. E PageRank/Louvain não têm equivalente declarativo.

**"O que é GDS e APOC?"**
> GDS = Graph Data Science, a lib de algoritmos (PageRank, Louvain, caminhos). APOC = biblioteca de utilitários/procedimentos do Neo4j.

**"Os dados são reais?"**
> Sim, ICIJ Offshore Leaks, licença ODbL. 2M nós / 3,3M relações. Carregado de um dump oficial.

**"Como garantem que é a mesma comparação?"**
> O Neo4j é a fonte; um script de ETL (`pnpm mirror:pg`) espelha **exatamente** os mesmos nós e relações pro schema relacional. `id` do Neo4j vira `node_id` no Postgres — mesma chave dos dois lados.

---

## 🔧 Se algo quebrar na hora

| Problema | Ação |
|---|---|
| App não conecta | `docker compose ps` — Neo4j "healthy"? Se reiniciou, espera ~60s (recarrega plugins). |
| Busca vazia | Tenta `Putin`, `Mossack`, `Limited`. |
| Algoritmo travando | Você rodou num hub gigante. Rode numa pessoa comum (poucos vizinhos). |
| Postgres "role does not exist" | Está batendo no Postgres nativo (5432). Confirme `POSTGRES_PORT=5433` no `.env` e `app/.env.local`. |
| Quer reprovar os números ao vivo | `cd app && pnpm bench` e `node --env-file=../.env scripts/hop-sweep.mjs`. |
