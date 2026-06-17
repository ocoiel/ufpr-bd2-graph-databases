# 🎙 Roteiro de Apresentação — Graph Databases (Neo4j)

**BD2 · UFPR · Tema 9 · apresentação solo · alvo: ~15 min de fala + demo, sobra pra Q&A.**

Online: https://ocoiel.github.io/ufpr-bd2-graph-databases/
Controles: `←` `→` navegam · `N` abre as notas · `F` tela cheia.

---

## 🏆 As 4 regras de ouro pra impressionar

1. **Comece com o gancho, não com "meu nome é…".** A primeira frase tem que fisgar.
2. **Pausa depois de número forte.** Diga "193 vezes mais rápido" e *fique calado 2 segundos*. Deixa o número trabalhar.
3. **A demo é a estrela.** Slide é cenário; o app ao vivo é o show. Vá devagar nela.
4. **Olhe pra plateia, não pro slide.** Você sabe o conteúdo. Os slides são pra eles, não pra você.

> ⏱️ Se o tempo apertar, corte a fala dos slides 03 e 08 pela metade — nunca corte a demo.

---

## ░ CAPA — o gancho (45s)

*(Não leia o título. Encare a plateia e abra com a história.)*

> "Em 2016, **onze milhões de documentos** vazaram de um escritório de advocacia no Panamá. Esse vazamento derrubou o primeiro-ministro da Islândia, rendeu um Prêmio Pulitzer e expôs líderes do mundo inteiro escondendo dinheiro.
>
> Os jornalistas que investigaram isso tinham 2,6 terabytes de dados conectados. E eles **não** usaram Excel, nem um banco de dados tradicional. Usaram um **banco de grafos**.
>
> Hoje eu vou mostrar o que é isso — do zero — e por que, pra esse tipo de pergunta, ele simplesmente destrói o banco relacional."

🎬 *Agora sim:* "Sou o [nome], e esse é o Tema 9." → avança.

💡 Essa abertura faz uma promessa ("fica até o fim que tem Panama Papers ao vivo"). Cumpra ela.

---

## 01 — O que é um banco de grafos (1 min)

> "Primeiro o básico. Um banco **relacional** guarda **tabelas e linhas** — é planilha. Um banco de **grafos** guarda **nós e relacionamentos** — é literalmente o desenho que você faria num quadro branco.
>
> São três peças. **Nó** é uma coisa — um substantivo: uma pessoa, uma empresa. **Relacionamento** é a ligação — um verbo, com direção e tipo: 'TRABALHA_EM', 'É_DONO_DE'. E os dois carregam **propriedades**, pares chave-valor."

🎬 *Aponte o grafo à direita, seguindo as setas:*

> "Olha o desenho. **Ana** e **Bia** são nós — pessoas. A seta **TRABALHA_EM** ligando as duas à **ACME** é o relacionamento. E repara no **'desde 2020'** em cima da seta: propriedade vive até **na aresta**, não só no nó."

> "E aqui está o pulo do gato, guarda essa frase: nesse modelo, **o relacionamento é armazenado** — ele existe gravado, como essa seta. No relacional, a ligação não existe até você calcular ela com um JOIN. Essa diferença é o motor de tudo que vem hoje."

🌉 *Ponte:* "Mas tá — pra que serve isso na prática?"

---

## 02 — Pra que serve (1 min)

> "A regra é simples: o grafo brilha quando a pergunta é sobre o **caminho entre as coisas** — não sobre as coisas isoladas."

🎬 *Aponte o mapa de metrô à direita: siga a rota verde de A até B, passando pela baldeação no cruzamento.*

> "Pensa no mapa do metrô. 'Quantas estações tem a linha azul?' — isso é pergunta de tabela, você conta e pronto. Agora 'qual a rota daqui, do A, até o B?' — olha, ela sobe pela linha azul, faz uma **baldeação** aqui no cruzamento, e desce até o B. Essa resposta é um **caminho** — e é isso que o grafo faz bem."

> "Por isso grafo está em todo lugar: rede social com 'amigos de amigos', recomendação da Netflix, detecção de fraude em banco, e investigação financeira — o nosso caso."

> "E olha como é concreto: no **LinkedIn**, aquele '1º, 2º, 3º grau' de conexão é exatamente isso — a **distância em hops** entre você e outra pessoa. '2º grau' = dois pulos no grafo."

💡 Gancho que cativa (pode usar aqui ou guardar): *"Aliás, se você já usou o Google, já usou um algoritmo de grafo — o PageRank. E eu vou rodar o mesmo PageRank na demo daqui a pouco."*

> "E pra ser honesto: **não é bala de prata**. Pra relatório, soma, média — o relacional continua melhor. Cada um no que é bom."

🌉 *Ponte:* "Então como é que a gente conversa com um grafo?"

---

## 03 — Relacional vs. Grafo (1 min)

*(Slide de dois códigos lado a lado. Não leia os códigos — explique a ideia.)*

> "Mesma pergunta — 'em que empresa a Ana trabalha?' — dos dois lados.
>
> No **SQL**, à esquerda: preciso de três tabelas e **dois JOINs** só pra reconstruir uma ligação que eu nem guardei.
>
> No **grafo**, à direita: eu só **desenho** o que procuro — Ana, seta, empresa. A ligação já está lá."

🎬 *Pausa, e crava o ponto central:*

> "E aqui está o que importa pro resto da palestra: cada **pulo a mais** — amigo do amigo do amigo — no SQL é **mais um JOIN**. No grafo, é só esticar o desenho com mais uma seta. Segura essa ideia."

🌉 *Ponte (vira o tom — aqui começa o show):* "Ah, e essa linguagem que vocês viram à direita tem nome: **Cypher** — virou padrão ISO em 2024, o mesmo comitê do SQL. Agora deixa eu mostrar onde isso foi usado de verdade — e não é com dado de brinquedo."

> 💡 *Quer mostrar a linguagem na prática (CREATE/MATCH ao vivo)? Tem o slide "olá mundo" no **apêndice** — pula até ele ou faz no Neo4j Browser.*

---

## 04 — O maior vazamento da história (1 min 30) ⭐

*(Volte ao gancho da abertura — agora com os números na tela.)*

> "Os **Panama Papers**. O maior vazamento de dados da história do jornalismo."

🎬 *Aponte os números, um a um, com pausa:*

> "**Onze milhões e meio** de documentos. **2,6 terabytes**. Detalhando **214 mil empresas offshore**. Investigados por **107 veículos de imprensa em 80 países**, por mais de um ano."

🎬 *Leia a citação do memo — é o momento mais impactante do slide:*

> "E olha o que estava num memo interno do escritório: *'95% do nosso trabalho consiste em vender empresas para evitar impostos.'* Eles **sabiam** exatamente o que faziam."

> "Veio de uma fonte anônima, derrubou o premiê da Islândia, recuperou mais de **1,2 bilhão de dólares**. E o detalhe que importa pra gente: o consórcio de jornalistas usou **Neo4j** — um banco de grafos — e publicou a base como grafo aberto."

🌉 *Ponte:* "E isso não é uma coisa distante, lá fora…"

---

## 05 — Os Panama Papers também são daqui (1 min) → LANÇA A DEMO

> "Trazendo pro nosso mundo: os Panama Papers revelaram que **ao menos 57 investigados na Operação Lava Jato** abriram mais de 100 empresas offshore. Tem político de vários partidos e figura pública brasileira nessa base."

🎬 *Aponte o lado direito:*

> "E o melhor: o **nosso dataset** — esse que tá rodando aqui — tem **4.495 pessoas e 1.532 empresas do Brasil**. Inclusive a própria 'Mossack Fonseca do Brasil'."

🎬 *Vire pro computador. Mude pro app (localhost:3000).*

> "Chega de slide. Bora **seguir o dinheiro** ao vivo."

---

## 🎬 DEMO AO VIVO (≈ 3-4 min) — o coração

> ⚠️ Vá **devagar**. Narre cada clique. Aponte o painel de baixo (o Cypher real) toda vez.

**1. Busca (rasa).**
> "Vou buscar… 'Mossack Fonseca'." *(ou 'Brazil', ou 'Albrecht' pra vizinhança rica)*
🎬 Clique num resultado → abre a vizinhança no grafo.
> "Olha aqui embaixo: esse é o Cypher **real** que rodou, com o tempo. Buscar por nome é raso — aqui o SQL empata com o grafo. Guardem isso."

**2. Multi-hop (o pulo do gato).**
🎬 Clique pra expandir a vizinhança; mostre o grafo crescer.
> "Agora a graça. Um pulo: as empresas que essa pessoa controla. Dois pulos com volta: **quem mais usou o mesmo intermediário** que ela — o jeito clássico de achar laços escondidos."
🎬 *Aponte o slide de trás na cabeça / ou comente:*
> "Isso que eu fiz com um clique, em SQL seriam **quatro JOINs**. Mesma pergunta — aqui é um desenho, lá é um quebra-cabeça."

**3. (Opcional) Algoritmos** — *ou deixe pro slide 08. Se fizer agora:*
🎬 Aba **Algoritmos** → **Louvain** → o grafo se repinta por comunidade.
> "E o grafo não só busca — ele analisa. Isso aqui agrupou a rede em comunidades sozinho."

🌉 *Ponte:* "Tá, mas 'parece' rápido. Será que é mesmo? A gente **mediu**."

---

## 06 — SQL vs. Cypher, medido (gráfico) (2 min) ⭐⭐

*(O slide-chave. Escala logarítmica.)*

> "Mesmo dataset nos dois bancos — Neo4j e Postgres. Mesma pergunta. Com aquecimento e cinco repetições. E **atenção**: essa escala é **logarítmica** — cada degrau pra cima é **dez vezes** mais tempo."

🎬 *Caminhe pela esquerda → direita do gráfico:*

> "Na **busca**, à esquerda: empatam — barras iguais. Jogo limpo.
> Um pulo: o grafo já é 9 vezes mais rápido.
> Dois pulos: **193 vezes**." *(PAUSA. Deixa o número bater.)*
> "O caminho de profundidade variável? A barra vermelha **fura o teto** — o SQL **não termina**, estoura o timeout.
> E o PageRank: nem tem barra vermelha. Em SQL puro **não existe**."

🎬 *Resuma apontando a distância entre as barras:*

> "Essa distância entre o verde e o vermelho **é** a vantagem do grafo. E ela cresce da esquerda pra direita — quanto mais a pergunta depende de conexões, mais o grafo ganha."

🌉 *Ponte:* "E aí vem a pergunta de um milhão: **por quê?** Por que essa diferença é tão brutal?"

---

## 07 — Por quê? Index-free adjacency (1 min 15)

> "O nome técnico é **index-free adjacency**. Tradução: cada nó guarda, gravado nele, um **ponteiro direto** pros vizinhos. Seguir uma ligação custa o mesmo tendo dois mil ou dois **bilhões** de nós no banco. Por isso o multi-hop não degrada."

🎬 *Use a analogia da rede social (está no slide):*

> "Pensa no Instagram. Pra ver os amigos de um amigo, você abre o perfil dele — a lista **já está ali**, na mão. Um pulo, instantâneo.
>
> O jeito relacional seria, **a cada amigo**, abrir uma planilha com **todas as amizades da plataforma inteira** e filtrar. Filtrar bilhões de linhas uma vez já dói. 'Amigo do amigo do amigo'? Trava."

> "E é por isso que índice não salva o SQL no caminho variável: o problema é **algorítmico**, não de índice."

🌉 *Ponte:* "E tem um último nível, onde o grafo faz algo que o SQL nem consegue tentar."

---

## 08 — Algoritmos de grafo / GDS (2 min — pode ser ao vivo)

> "O grafo não só consulta, ele **analisa a estrutura da rede**. Via uma biblioteca chamada GDS."

> "**PageRank** — sim, o algoritmo do Google — acha os nós mais **influentes**. Numa rede de offshores, os atores centrais.
> **Louvain** acha **comunidades**: grupos super conectados entre si. Tipo: uma família, as empresas de fachada dela, e o escritório que todos usaram — vira uma 'bolha' que o algoritmo enxerga sozinho."

🎬 *Se for fazer ao vivo:* volte ao app → aba **Algoritmos** → **Louvain** → o grafo se repinta em cores.
> "Cada cor é uma comunidade que ele descobriu. Isso, em SQL puro, **não existe** — você teria que exportar tudo pra Python ou Spark. No Neo4j é uma chamada de função."

🌉 *Ponte:* "Deixa eu fechar."

---

## ░ CONCLUSÃO (1 min)

> "O recado é esse: **escrever a mesma pergunta nos dois é fácil** — cada seta do Cypher vira um JOIN no SQL, quase mecânico. Por isso a comparação foi justa.
>
> O que muda **não é a escrita — é o desempenho**. E ele vai do empate, na busca rasa, até centenas de vezes no multi-hop, até onde o SQL simplesmente não termina nem consegue expressar."

🎬 *Frase final, devagar:*

> "Quanto mais a sua pergunta é sobre **conexões**, mais o grafo ganha. Foi por isso que os jornalistas dos Panama Papers escolheram um — não foi escolha acadêmica, foi necessidade."

> "E pra fechar com equilíbrio: grafo **não substitui** o relacional. A gente usou os dois no projeto. Cada um no que é bom."

---

## ░ OBRIGADO / Q&A

> "É isso. Tá tudo no ar e o código é aberto. **Perguntas?**"

💡 Respire. Você acabou no controle. Deixa as perguntas virem.

---

## 🛟 Q&A — respostas de 20 segundos

**"Por que o grafo é mais rápido no multi-hop?"**
> Index-free adjacency — cada nó aponta direto pros vizinhos, seguir uma aresta é custo fixo. No SQL cada hop é um JOIN que varre a tabela de novo.

**"Índice no Postgres não resolveria?"**
> Nos hops rasos ajuda. Mas o caminho de profundidade variável é problema **algorítmico** — a fronteira do CTE recursivo cresce exponencial. Índice não muda isso. E PageRank/Louvain não têm equivalente em SQL.

**"Então grafo é sempre melhor?"**
> Não. Pra dado tabular, agregação, relatório — relacional ganha. Grafo ganha quando o **relacionamento é o protagonista**.

**"A comparação é justa?"**
> Total. O Neo4j é a fonte; um ETL espelha os **mesmos** nós e relações pro Postgres. Mesma chave dos dois lados. Mesmo dado, mesma pergunta.

**"O que é Cypher / GQL / GDS / APOC?"**
> Cypher = a linguagem do Neo4j (hoje padrão ISO, GQL). GDS = biblioteca de algoritmos (PageRank, Louvain). APOC = utilitários do Neo4j.

**"E com 3, 4, 5 hops?"** *(tem slide no apêndice — navegue até ele)*
> Depende da densidade do nó. Num nó denso, o SQL estoura já no 3º hop; o Cypher fica constante. O SQL escala com densidade × profundidade.

---

## 🔧 Plano B (se algo travar)

| Problema | Ação |
|---|---|
| App não conecta | `docker compose ps`; se Neo4j reiniciou, ~60s. |
| Busca vazia | tente `Brazil`, `Mossack`, `Albrecht`. |
| Algoritmo lento | rode numa **pessoa comum**, não num hub. |
| Demo falhar | sem pânico — vá pro slide 07 (gráfico) e narre os números. |
