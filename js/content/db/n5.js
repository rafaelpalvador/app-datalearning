// Trilha Bancos de Dados (PostgreSQL) — Nível 5: ecossistema moderno e arquitetura de dados
import { theory, quiz, order, fill, pgsql, exPg } from '../helpers.js';

// Esquema estrela usado pelos exercícios de modelagem dimensional (criado dentro de cada execução).
const ESTRELA = `CREATE TABLE dim_data AS
SELECT to_char(d, 'YYYYMMDD')::int AS data_key, d::date AS data, extract(year FROM d)::int AS ano,
       extract(quarter FROM d)::int AS trimestre, extract(month FROM d)::int AS mes,
       to_char(d, 'TMMonth') AS nome_mes, extract(isodow FROM d)::int AS dia_semana,
       extract(isodow FROM d) IN (6, 7) AS fim_de_semana
FROM generate_series('2024-01-01'::date, '2026-12-31'::date, interval '1 day') d;
ALTER TABLE dim_data ADD PRIMARY KEY (data_key);
CREATE TABLE dim_produto AS
SELECT p.id AS produto_key, p.id AS produto_id, p.sku, p.nome, c.nome AS categoria, p.preco AS preco_lista
FROM produtos p JOIN categorias c ON c.id = p.categoria_id;
ALTER TABLE dim_produto ADD PRIMARY KEY (produto_key);
CREATE TABLE dim_cliente AS
SELECT id AS cliente_key, id AS cliente_id, nome, uf, segmento FROM clientes;
ALTER TABLE dim_cliente ADD PRIMARY KEY (cliente_key);
CREATE TABLE fato_vendas AS
SELECT to_char(p.criado_em, 'YYYYMMDD')::int AS data_key, i.produto_id AS produto_key, p.cliente_id AS cliente_key,
       p.id AS pedido_id, p.canal, i.quantidade, round(i.quantidade * i.preco_unitario * (1 - i.desconto / 100), 2) AS receita,
       round(i.quantidade * pr.custo, 2) AS custo
FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id JOIN produtos pr ON pr.id = i.produto_id
WHERE p.status IN ('pago', 'enviado', 'entregue');
`;

const L_OLAP = {
  id: 'db-5-1', title: 'OLTP × OLAP e modelagem dimensional (Kimball)',
  steps: [
    theory('Dois mundos com necessidades opostas', `
| | **OLTP** (transacional) | **OLAP** (analítico) |
|---|---|---|
| exemplo | o ERP, o app de pagamentos | o data warehouse, o dashboard da diretoria |
| operações | muitas, pequenas: inserir um pedido, ler um cliente | poucas, enormes: somar 2 bilhões de vendas por mês e região |
| modelo | **normalizado** (3FN): sem redundância, integridade | **dimensional**: desnormalizado para leitura |
| armazenamento típico | por **linha** (PostgreSQL, MySQL) | por **coluna** (BigQuery, Snowflake, ClickHouse, DuckDB, Redshift) |
| usuários | a aplicação | analistas, BI, ciência de dados |

Por que **colunar** é rápido para análise: \`SELECT sum(receita) FROM vendas\` lê só a coluna receita (não as 40 outras), e colunas do mesmo tipo comprimem muito (10× é comum). Em contrapartida, atualizar uma linha é caro.

Não se roda análise pesada no banco de produção: os dados são copiados (ETL/ELT, CDC) para o ambiente analítico.
`),
    theory('Esquema estrela', `
A **modelagem dimensional** de Ralph Kimball organiza os dados em torno de **processos de negócio** (vender, faturar, entregar):

- **Tabela fato**: os **eventos mensuráveis**, com chaves para as dimensões e **métricas** numéricas (quantidade, receita, custo). Muitas linhas, poucas colunas.
- **Dimensões**: o **contexto** descritivo, usado para filtrar e agrupar (data, produto, cliente, loja). Poucas linhas, muitas colunas textuais.

~~~
              dim_data
                 │
dim_cliente ── fato_vendas ── dim_produto
                 │
              dim_canal
~~~

**Os 4 passos de Kimball:**
1. escolher o **processo de negócio** (vendas)
2. declarar o **grão**: o que exatamente uma linha da fato representa ("um item de pedido"). É a decisão mais importante: nunca misture grãos na mesma fato
3. identificar as **dimensões** (quando, o quê, quem, onde, como)
4. identificar os **fatos** (métricas) coerentes com o grão

**Detalhes:**
- **dimensão de data** própria (gerada com \`generate_series\`), com ano, trimestre, mês, dia da semana, feriado, fim de semana: análises por calendário viram filtros simples
- **chaves substitutas** (surrogate keys) nas dimensões, independentes das chaves do sistema de origem
- métricas **aditivas** (receita: soma em qualquer dimensão), **semiaditivas** (saldo: soma entre contas, mas não ao longo do tempo) e **não aditivas** (preço unitário, porcentagens: recalcule a partir das partes)
- **floco de neve** (*snowflake*): dimensões normalizadas em sub-dimensões (produto → categoria → departamento). Economiza pouco espaço e complica as consultas; Kimball recomenda estrela
- **dimensões conformadas**: a mesma dim_cliente usada por vendas, cobrança e atendimento permite comparar processos ("matriz de barramento")
- **dimensão degenerada**: o número do pedido na fato, sem tabela própria
`),
    theory('Os três tipos de tabela fato', `
| tipo | uma linha representa | exemplo | atualizações |
|---|---|---|---|
| **transacional** | um evento no instante em que ocorre | item vendido, clique, pagamento | só INSERT |
| **snapshot periódico** | o estado no fim de cada período | saldo de cada conta no fim do dia; estoque por produto no fim do mês | INSERT por período |
| **snapshot acumulado** | o ciclo de vida de um processo com marcos definidos | pedido: data de compra, pagamento, envio, entrega (várias chaves de data na mesma linha) | UPDATE a cada marco |

Também existem **fatos sem fatos** (*factless*): registram que algo aconteceu (presença de aluno numa aula), sem métrica numérica.

O snapshot acumulado responde "quanto tempo do pagamento ao envio, em média?" com uma subtração simples; numa fato transacional, a mesma pergunta exige juntar vários eventos.
`),
    exPg('Montando o esquema estrela a partir do ERP', `
Criamos as dimensões de data, produto e cliente e a fato de vendas (grão: item de pedido pago, enviado ou entregue):
`, `${ESTRELA}
SELECT 'dim_data' AS tabela, count(*) FROM dim_data
UNION ALL SELECT 'dim_produto', count(*) FROM dim_produto
UNION ALL SELECT 'dim_cliente', count(*) FROM dim_cliente
UNION ALL SELECT 'fato_vendas', count(*) FROM fato_vendas;`, `
A dimensão de data tem uma linha por dia de 2024 a 2026. A fato tem uma linha por item vendido, com as chaves e as métricas.
`),
    exPg('A consulta típica de BI sobre a estrela', `
`, `${ESTRELA}
SELECT d.ano, d.trimestre, p.categoria,
       sum(f.receita) AS receita,
       round(100 * (sum(f.receita) - sum(f.custo)) / sum(f.receita), 1) AS margem_pct
FROM fato_vendas f
JOIN dim_data d ON d.data_key = f.data_key
JOIN dim_produto p ON p.produto_key = f.produto_key
WHERE d.ano = 2025
GROUP BY d.ano, d.trimestre, p.categoria
ORDER BY d.trimestre, receita DESC
LIMIT 8;`, `
Toda pergunta vira o mesmo padrão: fato no centro, JOIN com as dimensões, filtros e agrupamentos nos atributos delas. A margem (não aditiva) é recalculada a partir das somas.
`),
    quiz('Qual é a decisão mais importante ao desenhar uma tabela fato?', ['O grão: o que exatamente uma linha representa', 'O nome da tabela', 'O número de índices', 'Usar UUID'], 0),
    quiz('Saldo bancário diário por conta é uma métrica...', ['Semiaditiva: soma entre contas, mas não ao longo dos dias', 'Aditiva', 'Não aditiva', 'Degenerada'], 0),
    quiz('Uma tabela com uma linha por pedido e colunas data_compra, data_pagamento, data_envio, data_entrega, atualizada a cada etapa, é uma fato...', ['Snapshot acumulado', 'Transacional', 'Snapshot periódico', 'Sem fatos'], 0),
    quiz('Por que bancos colunares são rápidos em análises?', ['Leem só as colunas usadas e comprimem muito valores do mesmo tipo', 'Porque têm mais índices', 'Porque não usam disco', 'Porque são normalizados'], 0),
    pgsql('Usando o esquema estrela (já criado no código inicial), calcule a **receita por dia da semana** em 2025: colunas `dia_semana` (1 = segunda ... 7 = domingo) e `receita`. Ordene por dia_semana.',
      `${ESTRELA}SELECT d.dia_semana, sum(f.receita) AS receita FROM fato_vendas f JOIN dim_data d ON d.data_key = f.data_key WHERE d.ano = 2025 GROUP BY d.dia_semana ORDER BY d.dia_semana;`,
      { ordered: true, starter: `${ESTRELA}-- sua consulta aqui\n` }),
    pgsql('Na estrela, mostre a receita por **segmento** de cliente e **canal**, só em fins de semana de 2025. Colunas `segmento`, `canal`, `receita`.',
      `${ESTRELA}SELECT c.segmento, f.canal, sum(f.receita) AS receita FROM fato_vendas f JOIN dim_data d ON d.data_key = f.data_key JOIN dim_cliente c ON c.cliente_key = f.cliente_key WHERE d.ano = 2025 AND d.fim_de_semana GROUP BY c.segmento, f.canal;`,
      { starter: `${ESTRELA}-- sua consulta aqui\n` }),
    pgsql('Crie uma fato **snapshot periódico** `fato_saldo_mensal` com o saldo de faturas **em aberto** por cliente no fim de cada mês de 2025: para cada mês (último dia, coluna `mes_fim` date) e cliente, a soma do valor das faturas emitidas até aquele dia e não pagas até aquele dia (`pago_em IS NULL OR pago_em > mes_fim`). Depois mostre o total em aberto por mês (`mes_fim`, `em_aberto`), ordenado.',
      `CREATE TABLE fato_saldo_mensal AS
SELECT m.mes_fim, f.cliente_id, sum(f.valor) AS em_aberto
FROM (SELECT (d + interval '1 month' - interval '1 day')::date AS mes_fim FROM generate_series('2025-01-01'::date, '2025-12-01'::date, interval '1 month') d) m
JOIN faturas f ON f.emissao <= m.mes_fim AND (f.pago_em IS NULL OR f.pago_em > m.mes_fim)
GROUP BY m.mes_fim, f.cliente_id;
SELECT mes_fim, sum(em_aberto) AS em_aberto FROM fato_saldo_mensal GROUP BY mes_fim ORDER BY mes_fim;`,
      { ordered: true }),
  ],
};

const L_SCD = {
  id: 'db-5-2', title: 'Dimensões que mudam com o tempo (SCD)',
  steps: [
    theory('Os tipos de Slowly Changing Dimension', `
O cliente mudou de SP para MG. As vendas antigas devem aparecer em SP ou em MG? A resposta define o **tipo de SCD**:

| tipo | o que faz | histórico | exemplo |
|---|---|---|---|
| **0** | nunca muda (valor original) | — | data de cadastro, "UF original" |
| **1** | **sobrescreve** | perdido: todo o passado passa a aparecer com o valor novo | correção de erro de digitação |
| **2** | **nova linha** com nova chave substituta, \`valido_de\`, \`valido_ate\`, \`atual\` | completo: cada venda aponta para a versão vigente na época | UF, segmento, faixa de renda |
| **3** | coluna para o **valor anterior** (\`uf_anterior\`) | só a última mudança | reorganização de regiões, comparar "antes e depois" |
| **4** | mini-dimensão separada para atributos que mudam muito | | faixa de score |
| **6** | 1 + 2 + 3: linhas históricas (2) com uma coluna "valor atual" sobrescrita em todas (1) | os dois pontos de vista | relatório "como era" e "como é hoje" |

**SCD tipo 2 em detalhe:**
~~~
cliente_key | cliente_id | uf | valido_de  | valido_ate | atual
          1 |        42  | SP | 2024-01-01 | 2025-06-30 | false
       1001 |        42  | MG | 2025-07-01 | 9999-12-31 | true
~~~
- a fato guarda \`cliente_key\` (a versão), não \`cliente_id\`
- ao carregar uma venda, procura-se a versão vigente na **data da venda**
- carga incremental: comparar a origem com as versões \`atual = true\`; se um atributo rastreado mudou, **fechar** a versão atual (\`valido_ate\`, \`atual = false\`) e **inserir** a nova
- uma data "infinita" (9999-12-31) em \`valido_ate\` simplifica o \`BETWEEN\`

Ferramentas como o **dbt** implementam SCD2 com *snapshots* (\`dbt snapshot\`), usando estratégia por timestamp ou por comparação de colunas.
`),
    exPg('SCD tipo 2 passo a passo', `
`, `CREATE TABLE dim_cliente_h (
  cliente_key bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id bigint NOT NULL, nome text, uf text, segmento text,
  valido_de date NOT NULL, valido_ate date NOT NULL DEFAULT '9999-12-31', atual boolean NOT NULL DEFAULT true
);
-- carga inicial
INSERT INTO dim_cliente_h (cliente_id, nome, uf, segmento, valido_de)
SELECT id, nome, uf, segmento, '2024-01-01' FROM clientes WHERE id <= 5;
-- na origem, o cliente 3 mudou de UF em 2025-07-01
UPDATE clientes SET uf = 'MG' WHERE id = 3;
-- 1) fechar versões cujo atributo rastreado mudou
UPDATE dim_cliente_h d SET valido_ate = '2025-06-30', atual = false
FROM clientes c WHERE c.id = d.cliente_id AND d.atual AND (c.uf, c.segmento) IS DISTINCT FROM (d.uf, d.segmento);
-- 2) inserir a nova versão para quem não tem versão atual
INSERT INTO dim_cliente_h (cliente_id, nome, uf, segmento, valido_de)
SELECT c.id, c.nome, c.uf, c.segmento, '2025-07-01' FROM clientes c
WHERE c.id <= 5 AND NOT EXISTS (SELECT 1 FROM dim_cliente_h d WHERE d.cliente_id = c.id AND d.atual);
SELECT cliente_key, cliente_id, uf, valido_de, valido_ate, atual FROM dim_cliente_h ORDER BY cliente_id, valido_de;`, `
O cliente 3 tem duas linhas: a de SP, fechada em 30/06/2025, e a de MG, atual. \`IS DISTINCT FROM\` compara tratando NULL como valor (NULL ≠ 'SP' dá verdadeiro).
`),
    quiz('O analista quer que vendas de 2024 continuem atribuídas a SP mesmo após o cliente mudar para MG. Qual SCD?', ['Tipo 2', 'Tipo 1', 'Tipo 0', 'Nenhum'], 0),
    quiz('No SCD tipo 2, a tabela fato deve referenciar...', ['A chave substituta da versão (cliente_key) vigente na data do evento', 'O id do sistema de origem', 'Sempre a versão atual', 'O nome do cliente'], 0),
    quiz('Corrigir um nome digitado errado, sem interesse em histórico, é um caso de SCD...', ['Tipo 1 (sobrescrever)', 'Tipo 2', 'Tipo 3', 'Tipo 6'], 0),
    pgsql('Implemente **SCD tipo 1** com `MERGE`: crie `dim_prod` (`produto_id` PK, `nome`, `preco`) a partir dos produtos com id ≤ 10, aumente em 5% o preço dos produtos 1 a 3 na origem (`produtos`) e sincronize com MERGE (atualiza quando o preço difere, insere quando não existe). Mostre `produto_id`, `preco` de `dim_prod` ordenado.',
      `CREATE TABLE dim_prod AS SELECT id AS produto_id, nome, preco FROM produtos WHERE id <= 10;
ALTER TABLE dim_prod ADD PRIMARY KEY (produto_id);
UPDATE produtos SET preco = round(preco * 1.05, 2) WHERE id <= 3;
MERGE INTO dim_prod d
USING (SELECT id, nome, preco FROM produtos WHERE id <= 10) s ON d.produto_id = s.id
WHEN MATCHED AND d.preco IS DISTINCT FROM s.preco THEN UPDATE SET preco = s.preco, nome = s.nome
WHEN NOT MATCHED THEN INSERT (produto_id, nome, preco) VALUES (s.id, s.nome, s.preco);
SELECT produto_id, preco FROM dim_prod ORDER BY produto_id;`,
      { ordered: true }),
    pgsql('Implemente **SCD tipo 2** para o segmento dos clientes 1 a 10: crie `dim_cli2` (cliente_key IDENTITY PK, cliente_id, segmento, valido_de date, valido_ate date DEFAULT \'9999-12-31\', atual boolean DEFAULT true), carregue a versão inicial com valido_de `2024-01-01`, mude na origem o segmento dos clientes 2 e 5 para `corporativo`, feche as versões alteradas em `2025-12-31` e insira as novas com valido_de `2026-01-01`. Mostre `cliente_id`, `segmento`, `atual` das linhas dos clientes 2 e 5, ordenado por cliente_id e valido_de.',
      `CREATE TABLE dim_cli2 (cliente_key bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, cliente_id bigint NOT NULL, segmento text, valido_de date NOT NULL, valido_ate date NOT NULL DEFAULT '9999-12-31', atual boolean NOT NULL DEFAULT true);
INSERT INTO dim_cli2 (cliente_id, segmento, valido_de) SELECT id, segmento, '2024-01-01' FROM clientes WHERE id <= 10;
UPDATE clientes SET segmento = 'corporativo' WHERE id IN (2, 5);
UPDATE dim_cli2 d SET valido_ate = '2025-12-31', atual = false FROM clientes c WHERE c.id = d.cliente_id AND d.atual AND c.segmento IS DISTINCT FROM d.segmento;
INSERT INTO dim_cli2 (cliente_id, segmento, valido_de) SELECT c.id, c.segmento, '2026-01-01' FROM clientes c WHERE c.id <= 10 AND NOT EXISTS (SELECT 1 FROM dim_cli2 d WHERE d.cliente_id = c.id AND d.atual);
SELECT cliente_id, segmento, atual FROM dim_cli2 WHERE cliente_id IN (2, 5) ORDER BY cliente_id, valido_de;`,
      { ordered: true }),
    pgsql('**SCD tipo 3**: crie `dim_cli3` com `cliente_id`, `uf` e `uf_anterior` (NULL) para os clientes 1 a 5; mude a UF do cliente 1 para `RS` guardando a anterior. Mostre `cliente_id`, `uf`, `uf_anterior` ordenado.',
      `CREATE TABLE dim_cli3 AS SELECT id AS cliente_id, uf, NULL::text AS uf_anterior FROM clientes WHERE id <= 5;
UPDATE dim_cli3 SET uf_anterior = uf, uf = 'RS' WHERE cliente_id = 1;
SELECT cliente_id, uf, uf_anterior FROM dim_cli3 ORDER BY cliente_id;`,
      { ordered: true }),
  ],
};

const L_DW = {
  id: 'db-5-3', title: 'Data warehouses na nuvem, lakehouse e DuckDB',
  steps: [
    theory('O panorama analítico', `
| sistema | modelo | destaque |
|---|---|---|
| **BigQuery** (Google) | *serverless*: sem servidor para dimensionar | cobra por **bytes lidos** (ou capacidade reservada); particionamento por data e **clustering** reduzem o custo |
| **Snowflake** | armazenamento separado de computação (*virtual warehouses*) | escala cada carga de trabalho à parte; *time travel*, *zero-copy clone* |
| **Redshift** (AWS) | colunar MPP baseado em PostgreSQL antigo | integrado ao ecossistema AWS; *sort keys* e *dist keys* |
| **ClickHouse** | colunar open source, extremamente rápido | análises em tempo real sobre logs/eventos; motor MergeTree |
| **DuckDB** | colunar **embutido** (como o SQLite, para análise) | roda no notebook ou dentro de um processo; lê Parquet/CSV direto; ótimo para até centenas de GB numa máquina |
| **Databricks / Spark** | lakehouse | processamento distribuído sobre arquivos |

**Lakehouse**: dados em arquivos **Parquet** (colunar, comprimido) num armazenamento de objetos (S3, GCS), com uma camada de tabela transacional por cima (**Delta Lake**, **Apache Iceberg**, Hudi) que traz ACID, versões e evolução de esquema. Vários motores (Spark, Trino, DuckDB, Snowflake) leem as mesmas tabelas.

**ELT moderno**: extrair e carregar dados brutos (Fivetran, Airbyte, CDC com Debezium), transformar dentro do warehouse com SQL versionado (**dbt**: modelos, testes, documentação, linhagem), orquestrar (Airflow, Dagster). Camadas comuns: *bronze* (bruto) → *silver* (limpo) → *gold* (modelos dimensionais e métricas).

**Custos na nuvem**: \`SELECT *\` em BigQuery lê todas as colunas e cobra por elas; filtre pela coluna de partição; use tabelas agregadas para dashboards; limite consultas por usuário.

**PostgreSQL também serve para análise** até certo ponto: com índices BRIN, particionamento, materialized views, paralelismo e extensões colunares (Citus columnar, pg_duckdb, pg_mooncake), muitas empresas adiam o data warehouse por anos.
`),
    exPg('Consulta analítica em estilo DuckDB/BigQuery no Postgres', `
Grandes warehouses incentivam consultas com janelas e agregações sobre partições de data. O mesmo SQL roda aqui:
`, `SELECT date_trunc('month', criado_em)::date AS mes, canal,
       count(*) AS pedidos,
       round(100.0 * count(*) / sum(count(*)) OVER (PARTITION BY date_trunc('month', criado_em)::date), 1) AS participacao_pct
FROM pedidos
WHERE criado_em >= '2025-01-01' AND criado_em < '2025-04-01'
GROUP BY 1, 2
ORDER BY 1, 3 DESC;`, `
O filtro por intervalo de data é o que, num warehouse, ativa a poda de partições e reduz os bytes cobrados.
`),
    quiz('No BigQuery (modelo sob demanda), o que mais reduz o custo de uma consulta?', ['Ler menos colunas e filtrar pela coluna de partição/clustering', 'Adicionar LIMIT 10', 'Usar ORDER BY', 'Criar índices B-tree'], 0),
    quiz('O que Delta Lake e Apache Iceberg acrescentam a arquivos Parquet num data lake?', ['Transações ACID, versões (time travel) e evolução de esquema', 'Um servidor de banco relacional', 'Índices B-tree', 'Replicação síncrona'], 0),
    quiz('Para analisar 30 GB de arquivos Parquet no notebook, sem montar infraestrutura, uma escolha natural é...', ['DuckDB', 'Cassandra', 'Redis', 'Neo4j'], 0),
    order('Ordene as camadas de um pipeline ELT com dbt:', ['extrair e carregar o dado bruto (bronze)', 'limpar e padronizar (silver)', 'modelar fatos e dimensões (gold)', 'servir dashboards e métricas']),
  ],
};

const L_NOSQL = {
  id: 'db-5-4', title: 'NoSQL: Redis, MongoDB, Cassandra, grafos e o teorema CAP',
  steps: [
    theory('CAP, PACELC e por que existem tantos bancos', `
**Teorema CAP**: num sistema distribuído, quando acontece uma **partição de rede** (P), é preciso escolher entre **consistência** (C: todos veem o mesmo dado, ou recebem erro) e **disponibilidade** (A: todos recebem resposta, talvez desatualizada). Partições acontecem; a escolha real é C ou A durante elas.

**PACELC** completa: se há **P**artição, escolha **A** ou **C**; **E**lse (em operação normal), escolha entre **L**atência e **C**onsistência. Exemplos: Cassandra e DynamoDB tendem a PA/EL (disponíveis e rápidos, consistência eventual ajustável); bancos relacionais com réplica síncrona tendem a PC/EC.

Cada família de NoSQL abre mão de algo do modelo relacional (joins, transações amplas, esquema rígido) para ganhar outra coisa (latência, escala horizontal, flexibilidade):

| família | exemplos | modelo | quando usar |
|---|---|---|---|
| **chave-valor** | **Redis**, Valkey, DynamoDB | chave → valor (string, hash, lista, set, sorted set, stream) | cache, sessão, contadores, rate limiting, ranking, filas leves |
| **documento** | **MongoDB**, Couchbase, Firestore | documentos JSON/BSON flexíveis | agregados lidos juntos (catálogo, perfil, conteúdo), esquema que varia |
| **colunar larga** | **Cassandra**, ScyllaDB, Bigtable | linhas por partição, modelado **por consulta** | escrita massiva distribuída (IoT, telemetria, mensagens), multi-região |
| **grafo** | **Neo4j**, Neptune | nós e arestas com propriedades | relações profundas: fraude, recomendação, redes |
| **busca** | Elasticsearch, OpenSearch | índice invertido | busca textual, logs |
| **vetorial** | pgvector, Pinecone, Qdrant, Milvus | vetores de alta dimensão | busca semântica, RAG |

**Persistência poliglota**: cada parte do sistema usa o banco que a serve melhor, mas cada banco a mais é um sistema a operar, monitorar e manter consistente. Comece pelo PostgreSQL (que tem JSONB, busca textual, pgvector, filas com SKIP LOCKED) e adicione outro quando houver um motivo medido.
`),
    theory('Redis na prática', `
Redis guarda tudo **na memória** (com persistência opcional: snapshots RDB e log AOF), com operações atômicas em microssegundos.

**Cache-aside** (o padrão mais comum):
~~~python
def buscar_produto(id):
    chave = f"produto:{id}"
    em_cache = redis.get(chave)
    if em_cache:
        return json.loads(em_cache)              # acerto: não toca no banco
    produto = db.query("SELECT ... WHERE id = %s", id)
    redis.set(chave, json.dumps(produto), ex=300)  # TTL de 5 minutos
    return produto
# na alteração do produto: redis.delete(f"produto:{id}")  (invalidação)
~~~
Riscos: dado desatualizado até o TTL ou a invalidação; **cache stampede** (a chave expira e mil requisições vão ao banco ao mesmo tempo: use lock ou expiração antecipada aleatória).

**Outros padrões:**
- **rate limiting**: \`INCR limite:usuario:42:202611201530\` + \`EXPIRE 60\` → se passar de 100, recusa (contador por janela de tempo)
- **ranking**: *sorted set* (\`ZADD ranking 1500 "ana"\`, \`ZREVRANGE ranking 0 9\`)
- **sessões** com TTL
- **filas e eventos**: listas (\`LPUSH\`/\`BRPOP\`), **Streams** (\`XADD\`/\`XREADGROUP\`, com grupos de consumidores e confirmação) e Pub/Sub (sem persistência)
- **locks distribuídos** (\`SET chave valor NX PX 30000\`)

Redis **não** é o lugar da verdade para dados que não podem ser perdidos: é acelerador.
`),
    theory('MongoDB, Cassandra e grafos', `
**MongoDB (documentos)**: modelagem guiada pelo **acesso**.
- **embutir** quando os dados são lidos juntos e pertencem ao "dono" (itens dentro do pedido; endereços dentro do cliente)
- **referenciar** quando crescem sem limite, são compartilhados ou consultados isoladamente (pedidos de um cliente não vão dentro do cliente: o documento tem limite de 16 MB)
- tem índices, agregações (*aggregation pipeline*), transações multi-documento (desde a 4.0) e réplicas/sharding
- no PostgreSQL, **JSONB + GIN** cobre boa parte desses casos com joins e transações de brinde

**Cassandra (colunar larga)**: **modele uma tabela por consulta**.
- a **chave de partição** decide em qual nó a linha mora; a **chave de clustering** ordena dentro da partição: \`PRIMARY KEY ((sensor_id, dia), instante)\`
- não há joins; a mesma informação é **duplicada** em várias tabelas, uma para cada padrão de leitura
- **consistência ajustável** por operação: com fator de replicação N, leituras com R réplicas e escritas com W réplicas são fortemente consistentes quando **R + W > N** (ex.: N = 3, QUORUM em ambos: 2 + 2 > 3)
- escreve muito rápido (LSM tree: memtable + SSTables com compactação)

**Grafos (Neo4j, Cypher)**: relações são cidadãs de primeira classe.
~~~
MATCH (a:Pessoa {nome: 'Ana'})-[:AMIGO*1..3]-(b:Pessoa) RETURN DISTINCT b.nome
~~~
"Amigos até 3 graus" é uma linha em Cypher; no SQL, é uma **CTE recursiva** (Nível 3), que funciona bem para profundidades moderadas. Para caminhos profundos e algoritmos de grafo (PageRank, comunidades, caminho mínimo) em volume, um banco de grafos se paga. O padrão SQL/PGQ (consultas de grafo dentro do SQL, SQL:2023) já existe em alguns bancos e é discutido para o PostgreSQL.
`),
    exPg('Documento no PostgreSQL: o pedido como um agregado JSON', `
O mesmo "documento" que o MongoDB guardaria, montado a partir das tabelas relacionais:
`, `SELECT jsonb_pretty(jsonb_build_object(
  'pedido', p.id,
  'status', p.status,
  'cliente', jsonb_build_object('id', c.id, 'nome', c.nome, 'uf', c.uf),
  'itens', (SELECT jsonb_agg(jsonb_build_object('produto', i.produto_id, 'qtd', i.quantidade, 'preco', i.preco_unitario))
            FROM itens_pedido i WHERE i.pedido_id = p.id)
)) AS documento
FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
WHERE p.id = 1;`, `
Uma API pode servir esse JSON direto do banco. Você escolhe por consulta se quer o formato relacional ou o documento.
`),
    exPg('Grafo com CTE recursiva: caminhos na hierarquia', `
"Quem está até 2 níveis abaixo do Diretor de Dados" (o equivalente a \`-[:GERENCIA*1..2]->\` em Cypher):
`, `WITH RECURSIVE caminho AS (
  SELECT id, nome, 0 AS grau, ARRAY[id] AS rota FROM funcionarios WHERE id = 2
  UNION ALL
  SELECT f.id, f.nome, c.grau + 1, c.rota || f.id
  FROM funcionarios f JOIN caminho c ON f.gerente_id = c.id
  WHERE c.grau < 2 AND NOT f.id = ANY(c.rota)
)
SELECT grau, count(*) AS pessoas, min(rota::text) AS exemplo_de_rota FROM caminho GROUP BY grau ORDER BY grau;`, `
O array \`rota\` registra o caminho e impede ciclos, como um banco de grafos faz internamente.
`),
    quiz('Durante uma partição de rede, um sistema que escolhe responder sempre (talvez com dado velho) prioriza...', ['Disponibilidade (A)', 'Consistência (C)', 'Latência', 'Durabilidade'], 0),
    quiz('Cassandra com fator de replicação 3. Qual combinação garante leitura do último valor escrito?', ['Escrita QUORUM (2) e leitura QUORUM (2): R + W > N', 'Escrita ONE e leitura ONE', 'Escrita ONE e leitura QUORUM', 'Nenhuma'], 0),
    quiz('No cache-aside, o que acontece quando a chave não está no Redis?', ['A aplicação lê do banco e grava no cache com TTL', 'O Redis busca no banco sozinho', 'Retorna erro', 'O banco grava no Redis por trigger'], 0),
    quiz('No MongoDB, os pedidos de um cliente (podendo chegar a milhares) devem ficar...', ['Em documentos próprios que referenciam o cliente', 'Embutidos no documento do cliente', 'Num único array gigante', 'No Redis'], 0),
    quiz('Para limitar cada usuário a 100 requisições por minuto, a estrutura clássica no Redis é...', ['INCR numa chave por usuário e minuto, com EXPIRE', 'Um sorted set global', 'Pub/Sub', 'Um documento JSON'], 0),
    pgsql('Monte em JSONB o "documento" do cliente 7: um objeto com `id`, `nome` e `pedidos` (array de objetos `{id, status}` dos pedidos dele, ordenados por id). Coluna `doc` (jsonb).',
      `SELECT jsonb_build_object('id', c.id, 'nome', c.nome, 'pedidos', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'status', p.status) ORDER BY p.id), '[]'::jsonb) FROM pedidos p WHERE p.cliente_id = c.id)) AS doc FROM clientes c WHERE c.id = 7;`),
    pgsql('Simule um **rate limiter** de janela fixa em SQL: crie `limites (chave text PRIMARY KEY, contador int)`, registre 3 requisições do usuário 42 no minuto `202611201530` com `INSERT ... ON CONFLICT DO UPDATE SET contador = limites.contador + 1` (o equivalente ao INCR) e mostre `chave` e `contador`.',
      `CREATE TABLE limites (chave text PRIMARY KEY, contador int NOT NULL);
INSERT INTO limites VALUES ('rl:42:202611201530', 1) ON CONFLICT (chave) DO UPDATE SET contador = limites.contador + 1;
INSERT INTO limites VALUES ('rl:42:202611201530', 1) ON CONFLICT (chave) DO UPDATE SET contador = limites.contador + 1;
INSERT INTO limites VALUES ('rl:42:202611201530', 1) ON CONFLICT (chave) DO UPDATE SET contador = limites.contador + 1;
SELECT chave, contador FROM limites;`),
  ],
};

const L_VETOR = {
  id: 'db-5-5', title: 'Bancos vetoriais e busca semântica (pgvector)',
  steps: [
    theory('Embeddings e similaridade', `
Um **embedding** é um vetor de números (ex.: 768 ou 1536 dimensões) gerado por um modelo de IA a partir de um texto, imagem ou produto, de forma que **coisas parecidas ficam próximas** no espaço. "Fone sem fio" e "headphone bluetooth" ficam perto, mesmo sem palavras em comum.

**Busca semântica / RAG** (*Retrieval-Augmented Generation*): transforma a pergunta em vetor, busca os trechos de documentos mais próximos e os entrega a um modelo de linguagem como contexto.

**Medidas de distância:**
| medida | fórmula | pgvector |
|---|---|---|
| euclidiana (L2) | \`√Σ(aᵢ − bᵢ)²\` | \`<->\` |
| produto interno | \`Σ aᵢbᵢ\` (negativo no operador) | \`<#>\` |
| **cosseno** | \`1 − (a·b)/(‖a‖‖b‖)\` | \`<=>\` |

Com vetores normalizados (comprimento 1), as três ordenam igual; a similaridade de **cosseno** é a mais usada para texto.

**pgvector** traz o tipo \`vector(n)\` e índices de vizinho aproximado (ANN):
~~~sql
CREATE EXTENSION vector;
CREATE TABLE documentos (id bigserial PRIMARY KEY, texto text, embedding vector(1536));
CREATE INDEX ON documentos USING hnsw (embedding vector_cosine_ops);
SELECT id, texto FROM documentos ORDER BY embedding <=> $1 LIMIT 5;   -- $1 = vetor da pergunta
~~~

| índice | como funciona | prós e contras |
|---|---|---|
| **HNSW** | grafo de várias camadas ligando vizinhos | melhor relação velocidade × qualidade; criação mais lenta e mais memória; parâmetros \`m\`, \`ef_construction\`, \`hnsw.ef_search\` |
| **IVFFlat** | divide em \`lists\` grupos (k-means) e busca nos \`probes\` mais próximos | cria rápido, menos memória; precisa de dados antes de criar; qualidade depende de \`probes\` |

São índices **aproximados**: trocam um pouco de **recall** (achar todos os vizinhos verdadeiros) por velocidade. Filtros combinados (\`WHERE categoria = 'x'\`) exigem cuidado: o PostgreSQL 18 + pgvector 0.8 trouxeram *iterative scans* para não perder resultados.

Alternativas dedicadas: Pinecone, Qdrant, Milvus, Weaviate. Vantagem do pgvector: vetores ao lado dos dados de negócio, com joins, transações, RLS e backup únicos.
`),
    exPg('Similaridade de cosseno "na mão" com arrays', `
O pgvector não faz parte do PostgreSQL embutido no app, mas a matemática é a mesma. Vetores de 4 dimensões para 5 produtos:
`, `CREATE TABLE emb (produto text PRIMARY KEY, v float8[] NOT NULL);
INSERT INTO emb VALUES
  ('fone bluetooth',     '{0.9, 0.1, 0.0, 0.2}'),
  ('headphone sem fio',  '{0.85, 0.15, 0.05, 0.25}'),
  ('caixa de som',       '{0.6, 0.2, 0.1, 0.7}'),
  ('cafeteira',          '{0.0, 0.9, 0.4, 0.1}'),
  ('liquidificador',     '{0.05, 0.85, 0.5, 0.0}');
CREATE FUNCTION cosseno(a float8[], b float8[]) RETURNS float8 LANGUAGE sql IMMUTABLE AS $$
  SELECT sum(x * y) / (sqrt(sum(x * x)) * sqrt(sum(y * y))) FROM unnest(a, b) AS t(x, y)
$$;
SELECT produto, round(cosseno(v, '{0.88, 0.12, 0.02, 0.22}')::numeric, 4) AS similaridade
FROM emb ORDER BY similaridade DESC;`, `
O vetor de busca (algo como "fone sem fio") fica mais próximo dos dois fones; os eletrodomésticos ficam no fim. Com pgvector, \`ORDER BY v <=> $1\` faz isso com índice HNSW sobre milhões de linhas.
`),
    quiz('Qual operador do pgvector calcula a distância de cosseno?', ['<=>', '<->', '<#>', '@>'], 0),
    quiz('Comparado ao IVFFlat, o índice HNSW...', ['Costuma dar melhor recall por velocidade, mas é mais lento para criar e usa mais memória', 'É exato', 'Não precisa de memória', 'Só funciona com distância L2'], 0),
    quiz('Índices ANN (HNSW, IVFFlat) são "aproximados" porque...', ['Podem não devolver todos os vizinhos verdadeiros, em troca de velocidade', 'Arredondam os vetores', 'Ignoram dimensões', 'Só funcionam com vetores normalizados'], 0),
    pgsql('Com a tabela `emb` e a função `cosseno` do código inicial, traga os **2 produtos mais similares** a `{0.1, 0.8, 0.45, 0.05}`. Colunas `produto` e `similaridade` (4 casas), do mais para o menos similar.',
      `CREATE TABLE emb (produto text PRIMARY KEY, v float8[] NOT NULL);
INSERT INTO emb VALUES ('fone bluetooth', '{0.9, 0.1, 0.0, 0.2}'), ('headphone sem fio', '{0.85, 0.15, 0.05, 0.25}'), ('caixa de som', '{0.6, 0.2, 0.1, 0.7}'), ('cafeteira', '{0.0, 0.9, 0.4, 0.1}'), ('liquidificador', '{0.05, 0.85, 0.5, 0.0}');
CREATE FUNCTION cosseno(a float8[], b float8[]) RETURNS float8 LANGUAGE sql IMMUTABLE AS $$ SELECT sum(x * y) / (sqrt(sum(x * x)) * sqrt(sum(y * y))) FROM unnest(a, b) AS t(x, y) $$;
SELECT produto, round(cosseno(v, '{0.1, 0.8, 0.45, 0.05}')::numeric, 4) AS similaridade FROM emb ORDER BY similaridade DESC LIMIT 2;`,
      { ordered: true, starter: `CREATE TABLE emb (produto text PRIMARY KEY, v float8[] NOT NULL);
INSERT INTO emb VALUES ('fone bluetooth', '{0.9, 0.1, 0.0, 0.2}'), ('headphone sem fio', '{0.85, 0.15, 0.05, 0.25}'), ('caixa de som', '{0.6, 0.2, 0.1, 0.7}'), ('cafeteira', '{0.0, 0.9, 0.4, 0.1}'), ('liquidificador', '{0.05, 0.85, 0.5, 0.0}');
CREATE FUNCTION cosseno(a float8[], b float8[]) RETURNS float8 LANGUAGE sql IMMUTABLE AS $$ SELECT sum(x * y) / (sqrt(sum(x * x)) * sqrt(sum(y * y))) FROM unnest(a, b) AS t(x, y) $$;
-- sua consulta aqui
` }),
    pgsql('Crie a função `dist_l2(a float8[], b float8[])` (distância **euclidiana**: raiz da soma dos quadrados das diferenças) e calcule a distância entre `{1, 2, 3}` e `{4, 6, 3}`. Coluna `distancia`.',
      `CREATE FUNCTION dist_l2(a float8[], b float8[]) RETURNS float8 LANGUAGE sql IMMUTABLE AS $$ SELECT sqrt(sum((x - y) ^ 2)) FROM unnest(a, b) AS t(x, y) $$;
SELECT dist_l2('{1, 2, 3}', '{4, 6, 3}') AS distancia;`),
  ],
};

const L_MIGRA = {
  id: 'db-5-6', title: 'Migrations, mudanças sem parada e CI/CD de banco',
  steps: [
    theory('Esquema versionado', `
Mudanças de esquema são **código**: ficam no repositório, revisadas em pull request, aplicadas em ordem e registradas no banco.

| ferramenta | estilo | como funciona |
|---|---|---|
| **Flyway** | SQL puro | arquivos \`V1__criar_clientes.sql\`, \`V2__add_email.sql\`; tabela \`flyway_schema_history\` registra o que já rodou (com checksum) |
| **Liquibase** | changelogs XML/YAML/SQL | *changesets* com id e autor; suporta *rollback* declarado e *preconditions* |
| **Alembic** (Python/SQLAlchemy) | scripts Python \`upgrade()\`/\`downgrade()\` | gera rascunhos comparando os modelos com o banco (*autogenerate*: sempre revise) |
| também | Django migrations, Rails, Prisma, sqitch, dbmate, Atlas | |

Regras:
- migração aplicada **nunca é editada**: corrija com uma nova
- a mesma sequência roda em desenvolvimento, teste, homologação e produção
- *down migrations* são úteis em desenvolvimento; em produção, "voltar" costuma ser uma **nova migração para frente** (dados já foram gravados no formato novo)
- separe mudanças de **esquema** de migrações de **dados** grandes (backfill em lotes, fora da transação da migração)
`),
    theory('Expand and contract: mudar sem derrubar', `
Durante um deploy, a versão antiga e a nova da aplicação rodam **ao mesmo tempo**. Uma mudança incompatível (renomear coluna) quebra uma delas. O padrão **expand/contract** (ou *parallel change*) resolve em fases:

Exemplo: renomear \`clientes.email\` para \`email_contato\`:
1. **expand**: \`ADD COLUMN email_contato text\` (compatível com as duas versões)
2. **gravação dupla**: a aplicação nova grava nas duas colunas (ou um trigger copia)
3. **backfill** em lotes: \`UPDATE ... SET email_contato = email WHERE id BETWEEN x AND y\` (lotes pequenos, sem travar a tabela nem gerar um WAL gigante de uma vez)
4. **migrar leituras** para a coluna nova; verificar
5. **contract**: parar de gravar na antiga e, num deploy posterior, \`DROP COLUMN email\`

**Operações seguras e perigosas no PostgreSQL:**
| operação | risco | versão segura |
|---|---|---|
| \`ADD COLUMN ... DEFAULT x\` | seguro desde o PG 11 (não reescreve a tabela) para defaults constantes | |
| \`ADD COLUMN ... DEFAULT now()\`/volátil | reescreve a tabela | adicionar sem default, preencher em lotes |
| \`CREATE INDEX\` | bloqueia escritas durante a criação | \`CREATE INDEX CONCURRENTLY\` |
| \`ADD FOREIGN KEY\` / \`ADD CHECK\` | varre a tabela com lock forte | \`ADD CONSTRAINT ... NOT VALID\` (vale só para linhas novas) e depois \`VALIDATE CONSTRAINT\` (lock fraco) |
| \`SET NOT NULL\` | varre a tabela | criar \`CHECK (col IS NOT NULL) NOT VALID\`, validar, então \`SET NOT NULL\` (usa o CHECK validado); o PG 18 aceita \`NOT NULL ... NOT VALID\` diretamente |
| \`ALTER COLUMN TYPE\` | geralmente reescreve | coluna nova + backfill + troca |
| qualquer DDL | fila de locks bloqueando SELECTs | \`SET lock_timeout = '3s'\` e repetir |

**CI/CD de banco:**
- cada pull request sobe um PostgreSQL descartável (contêiner Docker, *Testcontainers*), aplica **todas** as migrações do zero e roda os testes
- testes de banco com **pgTAP** (\`SELECT has_table('clientes')\`, \`SELECT results_eq(...)\`) ou nos testes da aplicação
- *linters* de migração (squawk, strong_migrations) apontam operações perigosas antes do merge
- em produção: backup verificado antes, migração automática no pipeline, monitoramento de locks durante, plano de reversão escrito
`),
    exPg('Expand/contract e constraint NOT VALID na prática', `
`, `-- 1) expand
ALTER TABLE clientes ADD COLUMN email_contato text;
-- 3) backfill em lotes (aqui, dois lotes)
UPDATE clientes SET email_contato = email WHERE id BETWEEN 1 AND 5000;
UPDATE clientes SET email_contato = email WHERE id BETWEEN 5001 AND 10000;
-- regra nova só para linhas futuras, depois validada sem lock forte
ALTER TABLE clientes ADD CONSTRAINT ck_email_formato CHECK (email_contato LIKE '%@%') NOT VALID;
ALTER TABLE clientes VALIDATE CONSTRAINT ck_email_formato;
SELECT conname, convalidated FROM pg_constraint WHERE conname = 'ck_email_formato';
SELECT count(*) FILTER (WHERE email_contato IS DISTINCT FROM email) AS diferentes FROM clientes;`, `
Com NOT VALID, o ALTER é instantâneo; o VALIDATE varre a tabela com um lock que não impede leituras e escritas. Zero linhas diferentes: o backfill está completo e a leitura pode migrar.
`),
    quiz('Renomear uma coluna diretamente durante um deploy contínuo quebra...', ['A versão antiga da aplicação, que ainda roda e usa o nome antigo', 'Nada', 'Só os índices', 'O WAL'], 0),
    quiz('Como adicionar uma FK numa tabela de 500 milhões de linhas sem bloquear a operação?', ['ADD CONSTRAINT ... NOT VALID e depois VALIDATE CONSTRAINT', 'ADD CONSTRAINT direto', 'Desligar as FKs', 'VACUUM FULL antes'], 0),
    quiz('Uma migração Flyway já aplicada em produção tinha um erro. O que fazer?', ['Criar uma nova migração que corrige (nunca editar a aplicada)', 'Editar o arquivo antigo', 'Apagar a tabela de histórico', 'Rodar à mão sem registrar'], 0),
    order('Ordene o padrão expand/contract para trocar uma coluna:', ['adicionar a coluna nova', 'gravar nas duas colunas', 'backfill em lotes', 'migrar as leituras para a nova', 'remover a coluna antiga']),
    pgsql('**Expand** seguro: adicione a coluna `telefone` (text) em `clientes`, faça o backfill com `\'(11) 0000-0000\'` em lotes de 2.500 ids (4 UPDATEs cobrindo 1 a 10000) e mostre quantos clientes ficaram sem telefone (coluna `sem_telefone`, deve ser 0).',
      `ALTER TABLE clientes ADD COLUMN telefone text;
UPDATE clientes SET telefone = '(11) 0000-0000' WHERE id BETWEEN 1 AND 2500;
UPDATE clientes SET telefone = '(11) 0000-0000' WHERE id BETWEEN 2501 AND 5000;
UPDATE clientes SET telefone = '(11) 0000-0000' WHERE id BETWEEN 5001 AND 7500;
UPDATE clientes SET telefone = '(11) 0000-0000' WHERE id BETWEEN 7501 AND 10000;
SELECT count(*) FILTER (WHERE telefone IS NULL) AS sem_telefone FROM clientes;`),
    pgsql('Adicione a regra "quantidade até 1000" em `itens_pedido` de forma segura: CHECK chamado `ck_qtd_max` com **NOT VALID**, depois **VALIDATE**. Mostre `conname` e `convalidated` de `pg_constraint`.',
      `ALTER TABLE itens_pedido ADD CONSTRAINT ck_qtd_max CHECK (quantidade <= 1000) NOT VALID;
ALTER TABLE itens_pedido VALIDATE CONSTRAINT ck_qtd_max;
SELECT conname, convalidated FROM pg_constraint WHERE conname = 'ck_qtd_max';`),
    pgsql('Simule a tabela de histórico de um migrador: crie `schema_history (versao int PRIMARY KEY, descricao text, aplicada_em timestamptz DEFAULT now())`, registre as versões 1 (`criar clientes`) e 2 (`adicionar telefone`) e mostre a **versão atual** do esquema (coluna `versao_atual`).',
      `CREATE TABLE schema_history (versao int PRIMARY KEY, descricao text NOT NULL, aplicada_em timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_history (versao, descricao) VALUES (1, 'criar clientes'), (2, 'adicionar telefone');
SELECT max(versao) AS versao_atual FROM schema_history;`),
  ],
};

const L_CLOUD = {
  id: 'db-5-7', title: 'Bancos gerenciados na nuvem e arquitetura de referência',
  steps: [
    theory('Gerenciado × autogerenciado', `
| serviço | o que é |
|---|---|
| **Amazon RDS for PostgreSQL** | PostgreSQL gerenciado: backups automáticos com PITR, réplicas, Multi-AZ (réplica síncrona em outra zona com failover automático) |
| **Amazon Aurora PostgreSQL** | compatível com PostgreSQL, com armazenamento distribuído próprio (6 cópias em 3 zonas), réplicas com atraso de milissegundos, versão serverless |
| **Google Cloud SQL / AlloyDB** | gerenciado padrão / compatível com motor analítico colunar acoplado |
| **Azure Database for PostgreSQL (Flexible Server)** | gerenciado na Azure |
| **Neon, Supabase, Crunchy Bridge, Aiven** | PostgreSQL gerenciado com extras: *branching* de banco (Neon), API e autenticação prontas (Supabase) |

**O que o gerenciado resolve:** instalação, atualizações menores, backups e PITR, réplicas, failover, monitoramento básico, criptografia em repouso.
**O que continua com você:** modelagem, índices, consultas, migrações, dimensionamento, custo, segurança de acesso (roles, rede privada), planos de recuperação testados, **upgrades de versão principal** (planejar e testar).

Limitações típicas: sem superusuário real, extensões só da lista do provedor, parâmetros parcialmente configuráveis, custo de saída de dados.

**Quanto custa um banco na nuvem:** instância (CPU/memória, por hora), armazenamento e IOPS, backup além do incluído, transferência entre zonas/regiões, réplicas. Réplicas de leitura e instâncias superdimensionadas são os vilões comuns da fatura.
`),
    theory('Arquitetura de referência do capstone', `
O projeto final do curso, montado no laboratório Docker (\`labs/postgres\`), junta tudo:

~~~
           ┌──────────┐   cache-aside   ┌─────────┐
 API  ───► │ PgBouncer│◄───────────────►│  Redis  │  sessões, rate limit, cache de produto
           └────┬─────┘                 └─────────┘
                ▼
         ┌──────────────┐  WAL   ┌──────────────┐
         │ PostgreSQL 18│ ─────► │   réplica    │  leituras de relatório
         │  (primário)  │        └──────────────┘
         └──────┬───────┘
                │ arquivamento de WAL + backup base  →  storage (PITR)
                │ CDC / extração noturna
                ▼
         ┌──────────────┐
         │ DuckDB / DW  │  esquema estrela (fatos e dimensões, SCD2)  →  dashboards
         └──────────────┘
~~~

**Entregáveis:**
1. modelo OLTP normalizado (Nível 1) com constraints e migrações versionadas (Flyway ou Alembic)
2. carga de 2 milhões de linhas e consultas de relatório (Nível 2)
3. ledger com transferências concorrentes testado com \`pgbench\` (Nível 3)
4. índices e planos justificados, backup + PITR testado, runbook de incidentes (Nível 4)
5. Redis com cache-aside e rate limiting na API; esquema estrela com SCD2 carregado no DuckDB; um dashboard com as métricas da diretoria (Nível 5)
6. pipeline de CI que sobe o banco, aplica as migrações do zero e roda os testes

Documente as decisões (por que estrela, por que esse índice, por que esse nível de isolamento): em entrevistas para engenharia de dados, backend e DBA, **o porquê** vale mais do que o comando.
`),
    quiz('Mesmo num banco totalmente gerenciado, qual destas responsabilidades continua sendo sua?', ['Índices, consultas, modelagem e testar a recuperação', 'Aplicar patches do sistema operacional', 'Trocar discos com defeito', 'Instalar o PostgreSQL'], 0),
    quiz('O Multi-AZ do RDS serve principalmente para...', ['Alta disponibilidade: réplica síncrona em outra zona com failover automático', 'Escalar leituras', 'Backup lógico', 'Reduzir custo'], 0),
    quiz('No capstone, por que o DuckDB/DW recebe os dados em vez de os dashboards consultarem o primário?', ['Para que análises pesadas não disputem recursos com as transações de produção', 'Porque o PostgreSQL não faz GROUP BY', 'Por exigência do Redis', 'Para evitar backups'], 0),
    order('Ordene o caminho de um dado até o dashboard no capstone:', ['a API grava a venda no PostgreSQL (via PgBouncer)', 'o WAL vai para a réplica e para o arquivamento', 'a extração/CDC leva a venda ao ambiente analítico', 'a carga atualiza fatos e dimensões (SCD2)', 'o dashboard consulta o esquema estrela']),
  ],
};

const L_PROJETO5 = {
  id: 'db-5-8', title: 'Projeto final: da transação ao dashboard',
  steps: [
    theory('O que você vai construir aqui', `
Nesta lição, você monta no PostgreSQL do app a parte analítica do capstone, a partir do ERP:

1. uma **dimensão de data** gerada
2. uma **dimensão de cliente SCD2**
3. a **fato de vendas** com grão de item, apontando para a versão do cliente vigente na data da venda
4. um **snapshot acumulado** de pedidos (compra → pagamento)
5. as **métricas** para o dashboard

No laboratório Docker, as mesmas etapas viram modelos dbt ou scripts carregando o DuckDB, com o Redis e o PgBouncer na frente da API.
`),
    pgsql('**Etapa 1 — dimensão de data.** Gere `dim_dia` com uma linha por dia de 2025 (`data` date PK, `mes` int, `trimestre` int, `fim_de_semana` boolean) e mostre quantos dias de fim de semana há (coluna `fins_de_semana`).',
      `CREATE TABLE dim_dia AS SELECT d::date AS data, extract(month FROM d)::int AS mes, extract(quarter FROM d)::int AS trimestre, extract(isodow FROM d) IN (6, 7) AS fim_de_semana FROM generate_series('2025-01-01'::date, '2025-12-31'::date, interval '1 day') d;
ALTER TABLE dim_dia ADD PRIMARY KEY (data);
SELECT count(*) FILTER (WHERE fim_de_semana) AS fins_de_semana FROM dim_dia;`),
    pgsql('**Etapa 2 e 3 — SCD2 + fato.** Crie `dim_cli_h` (cliente_key IDENTITY, cliente_id, segmento, valido_de date, valido_ate date) com **duas versões** para cada cliente de id ≤ 100: o segmento atual valendo de 2024-01-01 a 2025-06-30, e `corporativo` de 2025-07-01 a 9999-12-31. Depois some a receita (quantidade × preço) dos pedidos **entregues** de 2025 desses clientes **por segmento da versão vigente na data do pedido**. Colunas `segmento`, `receita`.',
      `CREATE TABLE dim_cli_h (cliente_key bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, cliente_id bigint NOT NULL, segmento text NOT NULL, valido_de date NOT NULL, valido_ate date NOT NULL);
INSERT INTO dim_cli_h (cliente_id, segmento, valido_de, valido_ate) SELECT id, segmento, '2024-01-01', '2025-06-30' FROM clientes WHERE id <= 100;
INSERT INTO dim_cli_h (cliente_id, segmento, valido_de, valido_ate) SELECT id, 'corporativo', '2025-07-01', '9999-12-31' FROM clientes WHERE id <= 100;
SELECT d.segmento, sum(i.quantidade * i.preco_unitario) AS receita
FROM pedidos p
JOIN itens_pedido i ON i.pedido_id = p.id
JOIN dim_cli_h d ON d.cliente_id = p.cliente_id AND p.criado_em::date BETWEEN d.valido_de AND d.valido_ate
WHERE p.status = 'entregue' AND p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01' AND p.cliente_id <= 100
GROUP BY d.segmento;`),
    pgsql('**Etapa 4 — snapshot acumulado.** Crie `fato_pedido_ciclo` com uma linha por pedido de 2025: `pedido_id`, `comprado_em` (criado_em), `pago_em` (o **primeiro** pagamento aprovado, ou NULL; dica: junte com uma agregação de `pagamentos` por pedido em vez de uma subconsulta por linha, pois `pagamentos.pedido_id` não tem índice). Depois calcule as **horas médias** entre compra e pagamento por `canal` (coluna `horas_ate_pagar`, 1 casa), só para pedidos pagos. Colunas `canal`, `horas_ate_pagar`.',
      `CREATE TABLE fato_pedido_ciclo AS
SELECT p.id AS pedido_id, p.canal, p.criado_em AS comprado_em, pg.pago_em
FROM pedidos p
LEFT JOIN (SELECT pedido_id, min(pago_em) AS pago_em FROM pagamentos WHERE status = 'aprovado' GROUP BY pedido_id) pg ON pg.pedido_id = p.id
WHERE p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01';
SELECT canal, round(avg(extract(epoch FROM pago_em - comprado_em) / 3600)::numeric, 1) AS horas_ate_pagar
FROM fato_pedido_ciclo WHERE pago_em IS NOT NULL GROUP BY canal;`),
    pgsql('**Etapa 5 — métricas do dashboard.** Para cada mês de 2025, a partir dos pedidos entregues: `mes` (date), `receita` (2 casas), `clientes_ativos` (distintos), `ticket_medio` (receita / pedidos, 2 casas) e `crescimento_pct` (variação da receita contra o mês anterior, em %, 1 casa; NULL em janeiro). Ordene por mês.',
      `WITH m AS (
  SELECT date_trunc('month', p.criado_em)::date AS mes, sum(i.quantidade * i.preco_unitario) AS receita,
         count(DISTINCT p.cliente_id) AS clientes_ativos, count(DISTINCT p.id) AS pedidos
  FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id
  WHERE p.status = 'entregue' AND p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01'
  GROUP BY 1
)
SELECT mes, round(receita, 2) AS receita, clientes_ativos, round(receita / pedidos, 2) AS ticket_medio,
       round(100 * (receita - lag(receita) OVER (ORDER BY mes)) / lag(receita) OVER (ORDER BY mes), 1) AS crescimento_pct
FROM m ORDER BY mes;`,
      { ordered: true }),
    quiz('Na etapa 3, por que a junção usa a data do pedido entre valido_de e valido_ate?', ['Para atribuir cada venda à versão do cliente vigente quando ela aconteceu (SCD2)', 'Para acelerar a consulta', 'Porque a FK exige', 'Para remover duplicatas'], 0),
    quiz('Concluído o curso, qual frase resume a postura de um bom engenheiro de dados ou DBA?', ['Medir antes de otimizar, proteger a integridade no banco e testar a recuperação', 'Desnormalizar tudo desde o início', 'Usar o banco da moda', 'Evitar índices'], 0),
  ],
};

export const DB_N5 = {
  id: 'db-u5', level: 5, title: 'Ecossistema moderno: OLAP, NoSQL, vetores, nuvem e migrations',
  description: 'Modelagem dimensional e SCD, warehouses e DuckDB, Redis/MongoDB/Cassandra/grafos, pgvector, migrations sem parada e arquitetura. Entregável: capstone da transação ao dashboard',
  lessons: [L_OLAP, L_SCD, L_DW, L_NOSQL, L_VETOR, L_MIGRA, L_CLOUD, L_PROJETO5],
};
