// Conteúdo adicional da trilha de SQL:
//  - examples: exemplos resolvidos (código + resultado real) inseridos antes dos exercícios
//  - lessons: lições novas para cobrir o currículo completo
import { theory, quiz, order, fill, sql, exSql } from './helpers.js';

// ───────────────────────────────────────────── EXEMPLOS RESOLVIDOS DAS LIÇÕES EXISTENTES
const examples = {
  'sql-1-1': [
    exSql('Sua primeira consulta, linha por linha', `
Vamos pedir ao banco o **nome** e a **cidade** de todos os clientes. Leia a consulta como uma frase:

> "Selecione nome e cidade **da** tabela clientes."

- \`SELECT nome, cidade\` → as duas colunas que queremos, separadas por vírgula
- \`FROM clientes\` → a tabela onde elas estão
- \`;\` → fim do comando
`, `SELECT nome, cidade
FROM clientes;`, `
O resultado tem **10 linhas** (uma por cliente) e **2 colunas**, na ordem em que foram pedidas. As outras colunas da tabela (email, estado...) continuam lá, só não foram pedidas.

**Experimente:** troque \`cidade\` por \`estado\` e clique em "Executar de novo".
`),
    exSql('Chave primária e chave estrangeira na prática', `
A tabela **pedidos** não guarda o nome do cliente: guarda só o número dele, na coluna \`cliente_id\`. Esse número é a **chave estrangeira**, que aponta para a **chave primária** \`id\` da tabela clientes.
`, `SELECT id, cliente_id, data_pedido, status
FROM pedidos
LIMIT 5;`, `
O pedido 1 tem \`cliente_id = 1\`: ele pertence ao cliente de \`id = 1\` na tabela clientes (Ana Souza). O pedido 3 também é da Ana. É assim que bancos relacionais evitam repetir o nome do cliente em cada pedido. Mais adiante, o **JOIN** vai juntar as duas tabelas por essa ligação.
`),
  ],
  'sql-1-2': [
    exSql('Colunas calculadas com alias', `
Queremos saber **quanto dinheiro está parado no estoque** de cada produto: preço × quantidade em estoque. Não existe essa coluna na tabela, mas podemos **calculá-la** no SELECT e dar um nome com \`AS\`.
`, `SELECT nome,
       preco,
       estoque,
       preco * estoque AS valor_em_estoque
FROM produtos;`, `
A quarta coluna não existe no banco: foi calculada linha a linha (o Notebook Pro 14 custa 5.200 e tem 8 unidades → 41.600). O alias \`valor_em_estoque\` virou o nome da coluna no resultado.

**Experimente:** apague \`AS valor_em_estoque\` e veja o nome feio que o banco dá à coluna.
`),
    exSql('SELECT * para explorar', `
Quando você ainda não conhece uma tabela, \`SELECT *\` com \`LIMIT\` mostra todas as colunas de algumas linhas, sem trazer a tabela inteira.
`, `SELECT *
FROM funcionarios
LIMIT 3;`, `
Agora sabemos que funcionarios tem id, nome, cargo, departamento, salario, gerente_id e data_admissao. Para um relatório, escolheríamos só as colunas necessárias.
`),
  ],
  'sql-1-3': [
    exSql('Ordenando por duas colunas', `
Queremos os produtos agrupados visualmente por categoria (A→Z) e, dentro de cada categoria, do mais caro para o mais barato.
`, `SELECT categoria, nome, preco
FROM produtos
ORDER BY categoria ASC, preco DESC;`, `
Veja que a segunda coluna do ORDER BY só entra em ação **dentro** de cada categoria: em "Acessórios" os preços descem, depois começa "Eletrônicos" de novo do mais caro.
`),
    exSql('Top 3 e valores distintos', `
Duas perguntas comuns: "quais os 3 produtos mais caros?" e "quais categorias existem?".
`, `SELECT nome, preco FROM produtos ORDER BY preco DESC LIMIT 3;`, `
O LIMIT é aplicado **depois** da ordenação, por isso pegamos os 3 maiores. Para listar categorias sem repetição, a consulta seria \`SELECT DISTINCT categoria FROM produtos;\` (teste trocando o código acima).
`),
  ],
  'sql-2-1': [
    exSql('Filtrando por texto e por número', `
O WHERE testa uma condição **em cada linha**; só as linhas em que ela é verdadeira aparecem. Textos vão entre aspas simples.
`, `SELECT nome, cidade, estado
FROM clientes
WHERE estado = 'SP';`, `
Só os clientes de São Paulo. Troque por \`WHERE estado <> 'SP'\` para ver todos os outros.
`),
    exSql('Filtrando datas', `
Datas no formato ISO ('AAAA-MM-DD') podem ser comparadas com > e <, porque a ordem alfabética coincide com a ordem cronológica.
`, `SELECT id, data_pedido, status
FROM pedidos
WHERE data_pedido >= '2024-06-01'
ORDER BY data_pedido;`, `
Todos os pedidos a partir de 1º de junho de 2024, em ordem cronológica.
`),
  ],
  'sql-2-2': [
    exSql('O perigo de esquecer os parênteses', `
Compare as duas consultas mentalmente: a de baixo **não tem parênteses** e por isso o AND é avaliado antes do OR.
`, `SELECT nome, categoria, preco
FROM produtos
WHERE categoria = 'Livros' OR categoria = 'Móveis' AND preco > 2000;`, `
Apareceram **todos os livros** (mesmo os baratos), mais os móveis acima de 2.000. Agora adicione parênteses em \`(categoria = 'Livros' OR categoria = 'Móveis')\` e execute: os livros baratos somem.
`),
    exSql('IN e BETWEEN', `
\`IN\` substitui uma lista de ORs; \`BETWEEN\` define uma faixa com os dois extremos incluídos.
`, `SELECT nome, preco
FROM produtos
WHERE categoria IN ('Acessórios', 'Livros')
  AND preco BETWEEN 50 AND 400;`, `
Produtos das duas categorias com preço de 50 a 400, inclusive.
`),
  ],
  'sql-2-3': [
    exSql('Encontrando dados faltantes', `
Alguns clientes não informaram o email. Para encontrá-los, o teste é \`IS NULL\` (nunca \`= NULL\`).
`, `SELECT nome, email
FROM clientes
WHERE email IS NULL;`, `
Dois clientes sem email (Carla e Henrique). Troque para \`WHERE email = NULL\` e execute: o resultado fica **vazio**, porque nada é "igual" a um valor desconhecido.
`),
    exSql('LIKE e COALESCE juntos', `
Queremos os clientes cujo nome **começa com a letra B ou C** e mostrar "sem email" quando o email estiver vazio.
`, `SELECT nome,
       COALESCE(email, 'sem email') AS contato
FROM clientes
WHERE nome LIKE 'B%' OR nome LIKE 'C%';`, `
\`'B%'\` significa "B seguido de qualquer coisa". O COALESCE devolve o email quando existe e o texto alternativo quando é NULL.
`),
  ],
  'sql-2-4': [
    exSql('CASE: classificando produtos', `
O CASE cria uma coluna nova a partir de regras, como um "se... senão" do Excel.
`, `SELECT nome, preco,
       CASE
         WHEN preco >= 2000 THEN 'premium'
         WHEN preco >= 300  THEN 'intermediário'
         ELSE 'básico'
       END AS faixa
FROM produtos
ORDER BY preco DESC;`, `
Cada produto caiu na **primeira** regra verdadeira, de cima para baixo.
`),
    exSql('Funções de texto e arredondamento', `
\`||\` concatena textos, \`UPPER\` deixa em maiúsculas e \`ROUND\` arredonda.
`, `SELECT UPPER(nome) || ' (' || estado || ')' AS rotulo,
       ROUND(LENGTH(nome) / 2.0, 1) AS metade_do_tamanho
FROM clientes
LIMIT 4;`, `
Repare no \`2.0\`: dividir por um número decimal garante resultado decimal.
`),
  ],
  'sql-3-1': [
    exSql('Resumo de uma tabela inteira', `
Agregações transformam muitas linhas em **uma**. Vamos resumir os produtos:
`, `SELECT COUNT(*)            AS qtd_produtos,
       ROUND(AVG(preco), 2) AS preco_medio,
       MIN(preco)          AS mais_barato,
       MAX(preco)          AS mais_caro,
       SUM(estoque)        AS unidades_em_estoque
FROM produtos;`, `
Uma única linha com 5 números que descrevem a tabela inteira.
`),
    exSql('COUNT(*) × COUNT(coluna)', `
A diferença entre as duas contagens revela os valores faltantes.
`, `SELECT COUNT(*)              AS clientes,
       COUNT(email)          AS com_email,
       COUNT(*) - COUNT(email) AS sem_email,
       COUNT(DISTINCT estado) AS estados
FROM clientes;`, `
10 clientes, 8 com email, 2 sem email. \`COUNT(DISTINCT estado)\` conta quantos estados diferentes aparecem.
`),
  ],
  'sql-3-2': [
    exSql('Uma linha por grupo', `
Pergunta: quantos produtos e qual o preço médio **em cada categoria**?
`, `SELECT categoria,
       COUNT(*)              AS qtd,
       ROUND(AVG(preco), 2)  AS preco_medio
FROM produtos
GROUP BY categoria
ORDER BY qtd DESC;`, `
4 categorias → 4 linhas. Cada número foi calculado só com os produtos daquela categoria.
`),
    exSql('Agrupando por duas colunas', `
Quantos pedidos houve em cada **status** e em cada **mês**? Agrupar por duas colunas cria um grupo para cada combinação.
`, `SELECT SUBSTR(data_pedido, 1, 7) AS mes,
       status,
       COUNT(*) AS pedidos
FROM pedidos
GROUP BY mes, status
ORDER BY mes, status;`, `
\`SUBSTR(data_pedido, 1, 7)\` pega os 7 primeiros caracteres da data ("2024-01"), ou seja, o ano-mês.
`),
  ],
  'sql-3-3': [
    exSql('WHERE e HAVING na mesma consulta', `
Pergunta: entre os pedidos **entregues** (filtro de linha → WHERE), quais clientes têm **2 ou mais** pedidos (filtro de grupo → HAVING)?
`, `SELECT cliente_id, COUNT(*) AS entregues
FROM pedidos
WHERE status = 'entregue'
GROUP BY cliente_id
HAVING COUNT(*) >= 2
ORDER BY entregues DESC;`, `
Ordem de execução: FROM → WHERE (só entregues) → GROUP BY (por cliente) → HAVING (só grupos com 2+) → SELECT → ORDER BY.
`),
  ],
  'sql-4-1': [
    exSql('Trazendo o nome do cliente para cada pedido', `
O pedido só tem \`cliente_id\`. Com o JOIN, buscamos o nome na tabela clientes usando a ligação \`p.cliente_id = c.id\`. \`p\` e \`c\` são **apelidos** (aliases) das tabelas, para escrever menos.
`, `SELECT p.id AS pedido, c.nome, p.data_pedido, p.status
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id
ORDER BY p.id
LIMIT 6;`, `
Cada pedido ganhou o nome do seu cliente. A Ana aparece em mais de um pedido porque tem vários.
`),
    exSql('Somando o valor de cada pedido', `
O valor de um pedido está nos seus **itens** (quantidade × preço unitário). Juntamos pedidos com itens e somamos por pedido.
`, `SELECT p.id AS pedido,
       SUM(i.quantidade * i.preco_unitario) AS valor
FROM pedidos p
JOIN itens_pedido i ON i.pedido_id = p.id
GROUP BY p.id
ORDER BY valor DESC
LIMIT 5;`, `
Este é o padrão mais comum em análise: **JOIN para juntar, GROUP BY para resumir**.
`),
  ],
  'sql-4-2': [
    exSql('LEFT JOIN mantém quem não tem par', `
Queremos **todos** os clientes com a quantidade de pedidos, inclusive quem nunca comprou.
`, `SELECT c.nome, COUNT(p.id) AS pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id
GROUP BY c.id, c.nome
ORDER BY pedidos;`, `
O João Pereira aparece com **0**. Troque \`COUNT(p.id)\` por \`COUNT(*)\` e veja que ele passa a ter 1, o erro clássico. Troque LEFT JOIN por JOIN e ele desaparece.
`),
    exSql('Anti-join: produtos nunca vendidos', `
Depois do LEFT JOIN, as linhas sem par têm NULL nas colunas da direita. Filtrar esses NULLs mostra o que **nunca** foi vendido.
`, `SELECT pr.nome
FROM produtos pr
LEFT JOIN itens_pedido i ON i.produto_id = pr.id
WHERE i.produto_id IS NULL;`, `
Se o resultado vier vazio, todos os produtos venderam pelo menos uma vez; se vier com linhas, esses são os produtos "encalhados".
`),
  ],
  'sql-4-3': [
    exSql('Quatro tabelas: receita por categoria e estado', `
Caminho das chaves: clientes ← pedidos ← itens_pedido → produtos.
`, `SELECT c.estado, pr.categoria,
       ROUND(SUM(i.quantidade * i.preco_unitario), 2) AS receita
FROM pedidos p
JOIN clientes c      ON c.id = p.cliente_id
JOIN itens_pedido i  ON i.pedido_id = p.id
JOIN produtos pr     ON pr.id = i.produto_id
WHERE p.status = 'entregue'
GROUP BY c.estado, pr.categoria
ORDER BY receita DESC
LIMIT 6;`, `
Cada JOIN acrescenta colunas de uma tabela nova. Depois de juntar tudo, filtramos e agrupamos normalmente.
`),
    exSql('Self join: quem é o gerente de quem', `
A mesma tabela entra duas vezes, com apelidos diferentes: \`f\` (funcionário) e \`g\` (gerente).
`, `SELECT f.nome AS funcionario, f.cargo, g.nome AS gerente
FROM funcionarios f
LEFT JOIN funcionarios g ON g.id = f.gerente_id;`, `
A CEO (Marina) não tem gerente: graças ao LEFT JOIN ela aparece com gerente NULL.
`),
  ],
  'sql-5-1': [
    exSql('Subquery escalar: acima da média', `
A subquery entre parênteses roda primeiro e devolve **um número** (a média). A consulta de fora compara cada produto com ele.
`, `SELECT nome, preco
FROM produtos
WHERE preco > (SELECT AVG(preco) FROM produtos)
ORDER BY preco DESC;`, `
Rode só \`SELECT AVG(preco) FROM produtos\` para ver o valor que foi usado no filtro.
`),
    exSql('NOT EXISTS: clientes sem pedidos', `
Para cada cliente, a subquery procura algum pedido dele. NOT EXISTS mantém quem **não tem nenhum**.
`, `SELECT nome
FROM clientes c
WHERE NOT EXISTS (
  SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id
);`, `
É a mesma resposta do anti-join com LEFT JOIN: o João. Escolha a forma que achar mais legível.
`),
  ],
  'sql-5-2': [
    exSql('CTE em duas etapas: ticket médio', `
Etapa 1 (CTE \`totais\`): valor de cada pedido. Etapa 2: média desses valores.
`, `WITH totais AS (
  SELECT pedido_id, SUM(quantidade * preco_unitario) AS valor
  FROM itens_pedido
  GROUP BY pedido_id
)
SELECT COUNT(*) AS pedidos, ROUND(AVG(valor), 2) AS ticket_medio
FROM totais;`, `
Para conferir a etapa 1, troque o SELECT final por \`SELECT * FROM totais\`.
`),
    exSql('CTE recursiva: números de 1 a 5', `
A âncora gera o 1; a parte recursiva soma 1 enquanto n < 5.
`, `WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 5
)
SELECT n FROM seq;`, `
Esse padrão gera calendários, percorre hierarquias (gerente → subordinados) e cria séries para preencher buracos.
`),
  ],
  'sql-6-1': [
    exSql('Média do departamento ao lado de cada pessoa', `
Com GROUP BY teríamos uma linha por departamento. Com \`OVER (PARTITION BY ...)\`, cada funcionário continua na sua linha e ganha a média do seu departamento.
`, `SELECT nome, departamento, salario,
       ROUND(AVG(salario) OVER (PARTITION BY departamento), 2) AS media_depto,
       salario - ROUND(AVG(salario) OVER (PARTITION BY departamento), 2) AS diferenca
FROM funcionarios
ORDER BY departamento, salario DESC;`, `
Diferença positiva = ganha acima da média do seu departamento.
`),
  ],
  'sql-6-2': [
    exSql('As três funções de ranking lado a lado', `
Vamos ranquear os clientes pelo **número de pedidos**. Vários clientes têm 2 pedidos: esses empates revelam a diferença entre as três funções.
`, `WITH qtd AS (
  SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id
)
SELECT cliente_id, pedidos,
       ROW_NUMBER() OVER (ORDER BY pedidos DESC) AS row_number,
       RANK()       OVER (ORDER BY pedidos DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY pedidos DESC) AS dense_rank
FROM qtd;`, `
Os seis clientes com 2 pedidos empatam: RANK dá 3 a todos e o próximo (com 1 pedido) vira 9; DENSE_RANK dá 3 a todos e o próximo vira 4; ROW_NUMBER numera 3, 4, 5... sem repetir (a ordem entre empatados é arbitrária).
`),
    exSql('Top 1 por grupo', `
O produto mais caro de cada categoria: ranking dentro da categoria numa CTE, filtro fora.
`, `WITH r AS (
  SELECT categoria, nome, preco,
         ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY preco DESC) AS rn
  FROM produtos
)
SELECT categoria, nome, preco FROM r WHERE rn = 1;`, `
Troque \`rn = 1\` por \`rn <= 2\` para o top 2 de cada categoria.
`),
  ],
  'sql-6-3': [
    exSql('Mês anterior, variação e acumulado', `
Primeiro somamos a receita por mês (CTE); depois LAG busca o mês anterior e SUM OVER acumula.
`, `WITH mensal AS (
  SELECT SUBSTR(data, 1, 7) AS mes, ROUND(SUM(receita), 2) AS receita
  FROM vendas_diarias
  GROUP BY mes
)
SELECT mes, receita,
       LAG(receita) OVER (ORDER BY mes) AS anterior,
       ROUND(100.0 * (receita - LAG(receita) OVER (ORDER BY mes)) / LAG(receita) OVER (ORDER BY mes), 1) AS var_pct,
       ROUND(SUM(receita) OVER (ORDER BY mes), 2) AS acumulado
FROM mensal;`, `
Janeiro não tem anterior (NULL), por isso a variação também é NULL. O acumulado de dezembro é a receita do ano.
`),
  ],
  'sql-7-1': [
    exSql('Extraindo partes de datas', `
\`strftime\` recebe um formato e uma data. \`%Y\` = ano, \`%m\` = mês, \`%w\` = dia da semana (0 = domingo).
`, `SELECT data_pedido,
       strftime('%Y', data_pedido) AS ano,
       strftime('%m', data_pedido) AS mes,
       strftime('%w', data_pedido) AS dia_semana,
       date(data_pedido, '+30 days') AS vencimento,
       CAST(julianday('2024-12-31') - julianday(data_pedido) AS INTEGER) AS dias_ate_fim_do_ano
FROM pedidos
LIMIT 5;`, `
Cada coluna nova foi calculada a partir da mesma data. \`date(..., '+30 days')\` soma dias; a diferença de julianday conta os dias entre duas datas.
`),
  ],
  'sql-7-2': [
    exSql('Divisão inteira e NULLIF', `
Compare as duas primeiras colunas: com inteiros, 7 / 2 perde a parte decimal.
`, `SELECT 7 / 2       AS divisao_inteira,
       7 / 2.0     AS divisao_decimal,
       CAST(7 AS REAL) / 2 AS com_cast,
       10 / NULLIF(0, 0) AS divisao_segura;`, `
\`NULLIF(0, 0)\` vira NULL, e 10 / NULL dá NULL em vez de erro ou resultado sem sentido.
`),
  ],
  'sql-8-1': [
    exSql('INSERT e UPDATE dentro de uma transação', `
Neste app cada execução usa um banco novo, então você pode experimentar sem medo. Inserimos um cliente, atualizamos a cidade e consultamos.
`, `INSERT INTO clientes (id, nome, email, cidade, estado, data_cadastro)
VALUES (11, 'Lia Moura', 'lia@email.com', 'Recife', 'PE', '2024-11-01');

UPDATE clientes SET cidade = 'Olinda' WHERE id = 11;

SELECT id, nome, cidade, estado FROM clientes WHERE id >= 9;`, `
A cliente 11 foi inserida e depois atualizada. Sem o \`WHERE id = 11\`, o UPDATE mudaria a cidade de **todos** os clientes.
`),
  ],
  'sql-8-2': [
    exSql('Criando tabela e view', `
Criamos uma tabela com restrições e uma view com uma regra de negócio.
`, `CREATE TABLE metas (
  mes   TEXT PRIMARY KEY,
  valor REAL NOT NULL CHECK (valor > 0)
);
INSERT INTO metas VALUES ('2024-01', 150000), ('2024-02', 140000);

CREATE VIEW vw_entregues AS
SELECT * FROM pedidos WHERE status = 'entregue';

SELECT (SELECT COUNT(*) FROM metas) AS metas,
       (SELECT COUNT(*) FROM vw_entregues) AS pedidos_entregues;`, `
Tente inserir \`('2024-03', -5)\` na tabela metas: o CHECK recusa. A view não guarda dados, executa a consulta a cada uso.
`),
  ],
  'sql-9-1': [
    exSql('Lendo um plano de execução', `
\`EXPLAIN QUERY PLAN\` mostra **como** o banco pretende executar a consulta. "SCAN" = lê a tabela inteira; "SEARCH ... USING INDEX" = usa um índice.
`, `CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
EXPLAIN QUERY PLAN
SELECT * FROM pedidos WHERE cliente_id = 3;`, `
Com o índice, o plano mostra **SEARCH ... USING INDEX idx_pedidos_cliente**. Apague a linha do CREATE INDEX e execute de novo: o plano vira **SCAN pedidos**.
`),
  ],
  'sql-9-2': [
    exSql('Pivot manual com agregação condicional', `
Uma linha por mês e uma coluna para cada status, contando com SUM(CASE ...).
`, `SELECT SUBSTR(data_pedido, 1, 7) AS mes,
       SUM(CASE WHEN status = 'entregue'  THEN 1 ELSE 0 END) AS entregue,
       SUM(CASE WHEN status = 'enviado'   THEN 1 ELSE 0 END) AS enviado,
       SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelado,
       COUNT(*) AS total
FROM pedidos
GROUP BY mes
ORDER BY mes;`, `
Cada CASE vale 1 nas linhas daquele status e 0 nas outras; o SUM conta os 1. É a técnica por trás de quase todo relatório "em colunas".
`),
  ],
  'sql-10-1': [
    exSql('O truque da diferença constante', `
Para datas consecutivas, data − número da linha é **constante**. Veja com os dias de janeiro da loja Online com receita acima de 8.000:
`, `WITH dias AS (
  SELECT data FROM vendas_diarias
  WHERE loja = 'Online' AND receita > 8000 AND data < '2024-02-01'
)
SELECT data,
       ROW_NUMBER() OVER (ORDER BY data) AS rn,
       julianday(data) - ROW_NUMBER() OVER (ORDER BY data) AS grupo
FROM dias;`, `
Enquanto os dias são seguidos, a coluna \`grupo\` não muda; quando há um buraco, ela salta. Agrupar por \`grupo\` dá cada sequência (ilha).
`),
  ],
  'sql-10-2': [
    exSql('Gerando um calendário completo', `
Uma CTE recursiva gera todos os dias de um período, e o LEFT JOIN mostra os dias sem pedido como zero.
`, `WITH RECURSIVE cal(dia) AS (
  SELECT '2024-03-01'
  UNION ALL
  SELECT date(dia, '+1 day') FROM cal WHERE dia < '2024-03-10'
)
SELECT cal.dia, COUNT(p.id) AS pedidos
FROM cal
LEFT JOIN pedidos p ON p.data_pedido = cal.dia
GROUP BY cal.dia;`, `
Sem o calendário, os dias sem pedido simplesmente não apareceriam, e gráficos e médias ficariam errados.
`),
  ],
};

// ───────────────────────────────────────────── LIÇÕES NOVAS

const L_INTRO = {
  id: 'sql-0-1', title: 'Dados, tabelas e bancos de dados',
  steps: [
    theory('O que é um banco de dados', `
Quase todo sistema que você usa guarda informações: o app do banco guarda suas transações, a loja online guarda produtos e pedidos, o hospital guarda consultas. Esses dados ficam num **banco de dados**: um conjunto organizado de informações, guardado de forma que possa ser **consultado e atualizado** com segurança por muitas pessoas ao mesmo tempo.

O programa que administra o banco se chama **SGBD** (Sistema Gerenciador de Banco de Dados). Os mais usados:

| SGBD | onde aparece |
|---|---|
| **PostgreSQL** | empresas de tecnologia, sistemas web, análise |
| **MySQL / MariaDB** | sites e sistemas web |
| **SQL Server** | empresas que usam Microsoft |
| **Oracle** | grandes empresas, bancos |
| **SQLite** | dentro de apps e celulares (é o que este app usa) |
| **BigQuery, Snowflake, Redshift, Databricks** | *data warehouses* na nuvem, feitos para análise de grandes volumes |

**Por que não usar só planilhas?** Planilhas são ótimas para poucos dados e uso pessoal. Bancos de dados aguentam milhões de linhas, garantem regras (um pedido não pode apontar para um cliente que não existe), permitem acesso simultâneo e registram tudo com segurança.
`),
    theory('Tabelas, linhas e colunas', `
Num **banco relacional**, os dados ficam em **tabelas**, parecidas com uma aba de planilha:

| id | nome | cidade | estado |
|---|---|---|---|
| 1 | Ana Souza | São Paulo | SP |
| 2 | Bruno Lima | Rio de Janeiro | RJ |

- Cada **linha** (registro) é **um item** do mundo real: um cliente
- Cada **coluna** (campo) é **uma característica** desse item: o nome, a cidade
- Toda coluna tem um **tipo**: número inteiro, número decimal, texto, data
- A célula vazia é representada por **NULL** ("valor desconhecido")

Cada tabela descreve **um tipo de coisa**: clientes numa tabela, produtos em outra, pedidos em outra. Isso evita repetir informação: o nome do cliente fica escrito **uma vez**, e os pedidos apenas apontam para ele.
`),
    theory('Chaves: como as tabelas se ligam', `
**Chave primária (PK):** a coluna que identifica cada linha de forma única. Nunca se repete e nunca é NULL. Em clientes, é \`id\`.

**Chave estrangeira (FK):** uma coluna que **guarda a chave primária de outra tabela**, criando a ligação. Em pedidos, \`cliente_id\` guarda o id do cliente que fez o pedido.

~~~text
clientes                 pedidos
+----+------------+      +----+------------+------------+
| id | nome       |      | id | cliente_id | status     |
+----+------------+      +----+------------+------------+
| 1  | Ana Souza  | <─── | 1  | 1          | entregue   |
| 2  | Bruno Lima | <─── | 2  | 2          | entregue   |
|    |            | <─── | 3  | 1          | entregue   |
+----+------------+      +----+------------+------------+
~~~

O pedido 3 é da Ana porque \`cliente_id = 1\`. Um cliente pode ter **muitos** pedidos, e cada pedido pertence a **um** cliente: é uma relação **um-para-muitos**, a mais comum.

O desenho de todas as tabelas e ligações é o **esquema** (ou modelo) do banco. Neste app, o botão "Tabelas" mostra o esquema a qualquer momento.
`),
    theory('O banco deste app', `
Você vai praticar com o banco de uma **loja online**:

| tabela | o que guarda | chave | liga com |
|---|---|---|---|
| clientes | quem compra | id | — |
| produtos | o que é vendido | id | — |
| pedidos | cada compra | id | cliente_id → clientes |
| itens_pedido | produtos de cada pedido | (pedido_id, produto_id) | pedidos e produtos |
| funcionarios | equipe da loja | id | gerente_id → funcionarios |

E com tabelas para estatística: \`vendas_diarias\` (receita por dia e loja), \`experimento_ab\` (teste A/B) e \`avaliacoes\` (notas de produtos).

**SQL** (*Structured Query Language*) é a linguagem para conversar com bancos relacionais. Ela é **declarativa**: você descreve **o que** quer ("os clientes de SP"), e o banco decide **como** buscar. Cada SGBD tem pequenas variações (os **dialetos**), mas o núcleo que você vai aprender funciona em todos.
`),
    exSql('Olhando uma tabela pela primeira vez', `
Este é um exemplo para você só **observar**: o comando abaixo mostra todas as colunas das 5 primeiras linhas da tabela produtos. Nas próximas lições você vai entender cada palavra.
`, `SELECT * FROM produtos LIMIT 5;`, `
Repare nas colunas e nos tipos: \`id\` e \`estoque\` são inteiros, \`preco\` é decimal, \`nome\` e \`categoria\` são textos.
`),
    quiz('Numa tabela de clientes, o que cada **linha** representa?', ['Um cliente', 'Uma característica, como o nome', 'O tipo de dado da coluna', 'Uma consulta'], 0, 'Linha = registro = um item do mundo real. Coluna = uma característica.'),
    quiz('Qual a função da coluna `cliente_id` na tabela pedidos?', ['Identificar o cliente que fez o pedido (chave estrangeira)', 'Numerar os pedidos', 'Guardar o nome do cliente', 'Nenhuma, é redundante'], 0, 'Ela guarda o id de clientes, ligando cada pedido ao seu cliente.'),
    quiz('O que significa NULL numa célula?', ['O valor é desconhecido ou não foi informado', 'O número zero', 'Um texto vazio sempre', 'Um erro no banco'], 0),
    quiz('Um cliente pode ter vários pedidos e cada pedido tem um cliente. Que tipo de relação é essa?', ['Um-para-muitos', 'Um-para-um', 'Muitos-para-muitos', 'Nenhuma'], 0),
    quiz('Por que o nome do cliente não é repetido em cada pedido?', ['Para evitar repetição e inconsistências: o nome fica numa tabela só e os pedidos apontam para ele', 'Porque o SQL não aceita textos repetidos', 'Para o banco ficar mais lento', 'Por segurança apenas'], 0),
  ],
};

const L_TEXTO = {
  id: 'sql-2-5', title: 'Funções de texto',
  steps: [
    theory('Por que tratar textos', `
Dados digitados por pessoas chegam bagunçados: "ana souza", " Ana Souza ", "ANA SOUZA". Para comparar, agrupar e exibir, precisamos **padronizar**. As funções de texto do SQL fazem isso coluna inteira de uma vez.

| função | o que faz | exemplo | resultado |
|---|---|---|---|
| \`UPPER(t)\` | maiúsculas | \`UPPER('sp')\` | SP |
| \`LOWER(t)\` | minúsculas | \`LOWER('Ana@X.com')\` | ana@x.com |
| \`LENGTH(t)\` | número de caracteres | \`LENGTH('Ana')\` | 3 |
| \`TRIM(t)\` | remove espaços das pontas | \`TRIM('  Ana ')\` | Ana |
| \`SUBSTR(t, início, n)\` | pedaço do texto (começa em 1) | \`SUBSTR('2024-03-10', 1, 4)\` | 2024 |
| \`REPLACE(t, de, para)\` | troca trechos | \`REPLACE('a-b-c', '-', '')\` | abc |
| \`INSTR(t, busca)\` | posição da 1ª ocorrência (0 se não achar) | \`INSTR('ana@x.com', '@')\` | 4 |
| \`a || b\` | concatena | \`'Ana' || ' ' || 'Lima'\` | Ana Lima |

Nomes variam entre bancos: \`SUBSTRING\`, \`POSITION\`/\`STRPOS\`, \`CONCAT\`, \`CHAR_LENGTH\`. A ideia é a mesma.
`),
    theory('Combinando funções: o domínio do email', `
Funções podem ser **encadeadas**, uma dentro da outra. Para pegar o domínio de "bruno@email.com":

1. \`INSTR(email, '@')\` → posição do @ = 6
2. Tudo depois do @ começa na posição 6 + 1 = 7
3. \`SUBSTR(email, 7)\` sem o terceiro argumento pega **até o fim** → "email.com"

~~~sql
SELECT email, SUBSTR(email, INSTR(email, '@') + 1) AS dominio
FROM clientes;
~~~

**Comparações sem diferenciar maiúsculas:** \`WHERE LOWER(nome) = 'ana souza'\`.

**Cuidado com NULL:** qualquer função aplicada a NULL devolve NULL, e concatenar com NULL dá NULL. Use COALESCE quando precisar de um valor padrão.

**Desempenho:** aplicar função à coluna no WHERE (\`WHERE UPPER(nome) = ...\`) impede o uso de índices nessa coluna. Em tabelas grandes, padronize os dados na entrada.
`),
    exSql('Padronizando e extraindo', `
Primeiro nome, tamanho do nome e domínio do email de cada cliente:
`, `SELECT nome,
       SUBSTR(nome, 1, INSTR(nome, ' ') - 1) AS primeiro_nome,
       LENGTH(nome) AS tamanho,
       SUBSTR(email, INSTR(email, '@') + 1) AS dominio
FROM clientes
LIMIT 5;`, `
O primeiro nome é tudo antes do primeiro espaço: da posição 1 até (posição do espaço − 1). Quem não tem email fica com domínio NULL.
`),
    sql('Mostre o **nome** de cada produto em **maiúsculas** (coluna `nome_maiusculo`) e a quantidade de caracteres do nome (coluna `tamanho`). Ordene do nome mais longo para o mais curto.',
      `SELECT UPPER(nome) AS nome_maiusculo, LENGTH(nome) AS tamanho FROM produtos ORDER BY tamanho DESC, nome_maiusculo;`,
      { ordered: true, hint: 'Use `UPPER(nome)` e `LENGTH(nome)`. Desempate pelo nome para a ordem ficar estável.' }),
    sql('Crie a coluna `primeiro_nome` com o primeiro nome de cada **funcionário** (tudo antes do primeiro espaço), junto com o `cargo`.',
      `SELECT SUBSTR(nome, 1, INSTR(nome, ' ') - 1) AS primeiro_nome, cargo FROM funcionarios;`,
      { hint: '`INSTR(nome, \' \')` dá a posição do espaço; pegue da posição 1 até a anterior a ele.' }),
    sql('Liste os **domínios de email distintos** dos clientes (coluna `dominio`), ignorando quem não tem email.',
      `SELECT DISTINCT SUBSTR(email, INSTR(email, '@') + 1) AS dominio FROM clientes WHERE email IS NOT NULL;`),
    sql('Mostre `nome` e `email_padrao` (o email em **minúsculas**, ou o texto `sem email` quando for NULL) de todos os clientes.',
      `SELECT nome, COALESCE(LOWER(email), 'sem email') AS email_padrao FROM clientes;`),
    quiz('Qual o resultado de `SUBSTR(\'2024-03-15\', 6, 2)`?', ['03', '2024', '15', '-0'], 0, 'Começa na 6ª posição (o "0" de 03) e pega 2 caracteres.'),
    quiz('O que `TRIM(\'  Datum  \')` devolve?', ['"Datum" sem espaços nas pontas', '"Datum  "', 'O número de espaços', 'NULL'], 0),
    quiz('Por que `WHERE UPPER(email) = \'ANA@EMAIL.COM\'` pode ficar lento em tabelas enormes?', ['A função aplicada à coluna impede o uso do índice dessa coluna', 'UPPER é proibido no WHERE', 'Porque compara números', 'Não fica lento'], 0),
  ],
};

const L_AGGCOND = {
  id: 'sql-3-4', title: 'Agregação condicional e estatísticas em SQL',
  steps: [
    theory('Contando só o que interessa', `
Muitas perguntas de negócio pedem **várias contagens lado a lado**: quantos pedidos entregues, quantos cancelados e qual a taxa de cancelamento. A ferramenta é colocar um **CASE dentro da agregação**:

~~~sql
SELECT COUNT(*) AS total,
       SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
       ROUND(100.0 * SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 1) AS taxa_cancel
FROM pedidos;
~~~

Como funciona: o CASE vale **1** nas linhas canceladas e **0** nas outras; somar os 1 é contar as canceladas.

Variações úteis:

| objetivo | expressão |
|---|---|
| contar condição | \`SUM(CASE WHEN cond THEN 1 ELSE 0 END)\` |
| proporção direta | \`AVG(CASE WHEN cond THEN 1.0 ELSE 0 END)\` |
| somar valores de um subconjunto | \`SUM(CASE WHEN cond THEN valor ELSE 0 END)\` |
| média de um subconjunto | \`AVG(CASE WHEN cond THEN valor END)\` (sem ELSE: os outros viram NULL e são ignorados) |

No PostgreSQL existe o atalho \`COUNT(*) FILTER (WHERE cond)\`; no BigQuery, \`COUNTIF(cond)\`.
`),
    theory('Estatística descritiva com SQL', `
Dá para calcular as principais estatísticas sem sair do banco:

| estatística | SQL |
|---|---|
| média | \`AVG(x)\` |
| mediana | \`median(x)\` neste app; \`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)\` no PostgreSQL |
| desvio padrão | \`STDDEV_SAMP(x)\` (PostgreSQL); em qualquer banco: \`SQRT(AVG(x*x) - AVG(x)*AVG(x))\` (populacional) |
| amplitude | \`MAX(x) - MIN(x)\` |
| proporção | \`AVG(coluna_0_ou_1)\` |

**Histograma em SQL:** crie faixas com divisão inteira e conte:

~~~sql
SELECT CAST(receita / 2000 AS INTEGER) * 2000 AS faixa_inicio, COUNT(*) AS dias
FROM vendas_diarias
GROUP BY faixa_inicio
ORDER BY faixa_inicio;
~~~

\`CAST(receita / 2000 AS INTEGER)\` descarta a parte decimal: 7.316 / 2.000 = 3,66 → 3 → faixa que começa em 6.000.

**Percentual do total** com window function: \`100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()\`.
`),
    exSql('Painel de conversão por dispositivo', `
Para cada dispositivo do teste A/B: usuários, conversões, taxa e ticket médio de quem comprou.
`, `SELECT dispositivo,
       COUNT(*) AS usuarios,
       SUM(converteu) AS conversoes,
       ROUND(AVG(converteu), 4) AS taxa,
       ROUND(AVG(CASE WHEN converteu = 1 THEN valor_compra END), 2) AS ticket_compradores
FROM experimento_ab
GROUP BY dispositivo;`, `
Como \`converteu\` é 0/1, \`SUM\` conta conversões e \`AVG\` dá a taxa direto. O ticket usa CASE sem ELSE para considerar só quem comprou.
`),
    exSql('Histograma de receita diária', `
Faixas de 2.000 reais, contando quantos dias caem em cada uma:
`, `SELECT CAST(receita / 2000 AS INTEGER) * 2000 AS faixa_inicio,
       COUNT(*) AS dias,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM vendas_diarias
GROUP BY faixa_inicio
ORDER BY faixa_inicio;`, `
Lendo de cima para baixo você vê a **forma da distribuição**: onde a maioria dos dias se concentra e se há uma cauda de dias muito bons.
`),
    sql('Para cada **loja** de `vendas_diarias`, mostre: `dias` (contagem), `dias_acima_8000` (dias com receita > 8000) e `pct_acima` (percentual desses dias, 1 casa).',
      `SELECT loja, COUNT(*) AS dias, SUM(CASE WHEN receita > 8000 THEN 1 ELSE 0 END) AS dias_acima_8000, ROUND(100.0 * SUM(CASE WHEN receita > 8000 THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_acima FROM vendas_diarias GROUP BY loja;`),
    sql('Calcule para a tabela `experimento_ab`, numa linha só: `taxa_a` e `taxa_b` (taxas de conversão de cada grupo, 4 casas).',
      `SELECT ROUND(AVG(CASE WHEN grupo = 'A' THEN converteu END), 4) AS taxa_a, ROUND(AVG(CASE WHEN grupo = 'B' THEN converteu END), 4) AS taxa_b FROM experimento_ab;`,
      { hint: 'Use `AVG(CASE WHEN grupo = \'A\' THEN converteu END)`: sem ELSE, o outro grupo vira NULL e é ignorado.' }),
    sql('Por loja, calcule `media`, `mediana` e `amplitude` (máximo − mínimo) da receita, todas com 2 casas.',
      `SELECT loja, ROUND(AVG(receita), 2) AS media, ROUND(median(receita), 2) AS mediana, ROUND(MAX(receita) - MIN(receita), 2) AS amplitude FROM vendas_diarias GROUP BY loja;`),
    quiz('O que `AVG(CASE WHEN status = \'cancelado\' THEN 1.0 ELSE 0 END)` calcula?', ['A proporção de pedidos cancelados', 'O número de cancelados', 'A média de valor dos cancelados', 'Sempre 1'], 0),
    quiz('Em `AVG(CASE WHEN grupo = \'B\' THEN valor END)`, o que acontece com as linhas do grupo A?', ['Viram NULL e são ignoradas pelo AVG', 'Contam como zero', 'Dão erro', 'Entram com o valor delas'], 0),
  ],
};

const L_JOINS2 = {
  id: 'sql-4-4', title: 'RIGHT e FULL JOIN, INTERSECT e EXCEPT',
  steps: [
    theory('Todos os tipos de JOIN', `
Imagine duas listas: clientes e pedidos. Os JOINs diferem no que fazem com quem **não tem par**:

| JOIN | mantém | linhas sem par |
|---|---|---|
| **INNER JOIN** | só quem tem par dos dois lados | descartadas |
| **LEFT JOIN** | todas da tabela da **esquerda** | da direita viram NULL |
| **RIGHT JOIN** | todas da tabela da **direita** | da esquerda viram NULL |
| **FULL OUTER JOIN** | todas dos **dois** lados | NULL no lado que faltar |
| **CROSS JOIN** | todas as combinações (produto cartesiano) | — |

\`A RIGHT JOIN B\` é o mesmo que \`B LEFT JOIN A\`; por isso, na prática, quase todo mundo escreve LEFT JOIN e escolhe a ordem das tabelas.

**FULL OUTER JOIN** é usado para **reconciliar** duas fontes: o que está no sistema A e não no B, e vice-versa (ex.: pedidos do site × pedidos do ERP).

**JOIN com condição extra:** a cláusula ON pode ter mais de uma condição. Num LEFT JOIN, colocar o filtro da tabela da direita no **ON** mantém as linhas da esquerda; colocá-lo no **WHERE** as elimina:

~~~sql
-- todos os clientes, contando só pedidos ENTREGUES
SELECT c.nome, COUNT(p.id) AS entregues
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status = 'entregue'
GROUP BY c.id, c.nome;
~~~
`),
    theory('Operações de conjunto', `
Além de UNION, há duas operações que comparam **resultados inteiros** de consultas:

| operação | devolve |
|---|---|
| \`A UNION B\` | linhas em A **ou** em B (sem duplicados) |
| \`A UNION ALL B\` | todas as linhas de A e de B, com duplicados |
| \`A INTERSECT B\` | linhas que estão em A **e** em B |
| \`A EXCEPT B\` | linhas de A que **não** estão em B (no Oracle: MINUS) |

Regras: as consultas precisam ter o **mesmo número de colunas** e tipos compatíveis; a comparação usa **todas as colunas**.

~~~sql
-- clientes que compraram em janeiro E em março
SELECT cliente_id FROM pedidos WHERE data_pedido LIKE '2024-01%'
INTERSECT
SELECT cliente_id FROM pedidos WHERE data_pedido LIKE '2024-03%';
~~~

EXCEPT é outra forma de fazer anti-join; INTERSECT é outra forma de semi-join (EXISTS).
`),
    exSql('FULL OUTER JOIN para reconciliar', `
Vamos comparar a lista de produtos com a lista de produtos vendidos. Em vez de duas consultas, um FULL JOIN mostra as duas faltas de uma vez.
`, `WITH vendidos AS (
  SELECT DISTINCT produto_id FROM itens_pedido
)
SELECT pr.id AS id_cadastro, v.produto_id AS id_vendido, pr.nome
FROM produtos pr
FULL OUTER JOIN vendidos v ON v.produto_id = pr.id
ORDER BY pr.id;`, `
Linhas com \`id_vendido\` NULL = produto cadastrado que nunca vendeu. Se houvesse \`id_cadastro\` NULL, seria uma venda de produto que não existe no cadastro (problema de integridade).
`),
    exSql('LEFT JOIN com filtro no ON × no WHERE', `
Queremos todos os clientes com a contagem de pedidos **cancelados**. O filtro de status vai no ON.
`, `SELECT c.nome, COUNT(p.id) AS cancelados
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status = 'cancelado'
GROUP BY c.id, c.nome
ORDER BY cancelados DESC, c.nome;`, `
Todos os 10 clientes aparecem. Mova \`AND p.status = 'cancelado'\` para um WHERE e execute: sobram só os clientes com cancelamento, porque o WHERE descarta as linhas NULL.
`),
    sql('Liste os `cliente_id` que fizeram pedido no **1º semestre** de 2024 (antes de 2024-07-01) E também no **2º semestre** (a partir de 2024-07-01). Use INTERSECT.',
      `SELECT cliente_id FROM pedidos WHERE data_pedido < '2024-07-01' INTERSECT SELECT cliente_id FROM pedidos WHERE data_pedido >= '2024-07-01';`),
    sql('Usando EXCEPT, liste os `id` de clientes que **nunca** fizeram pedido.',
      `SELECT id FROM clientes EXCEPT SELECT cliente_id FROM pedidos;`),
    sql('Mostre **todos** os clientes (`nome`) e quantos pedidos **entregues** cada um tem (`entregues`), incluindo quem tem zero. Ordene por `entregues` decrescente e depois por nome.',
      `SELECT c.nome, COUNT(p.id) AS entregues FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status = 'entregue' GROUP BY c.id, c.nome ORDER BY entregues DESC, c.nome;`,
      { ordered: true, hint: 'Coloque o filtro de status no ON do LEFT JOIN, não no WHERE.' }),
    quiz('`A RIGHT JOIN B` é equivalente a...', ['B LEFT JOIN A', 'A LEFT JOIN B', 'A INNER JOIN B', 'A FULL JOIN B'], 0),
    quiz('Para encontrar registros que estão em um sistema e faltam no outro, **nos dois sentidos**, de uma vez, use...', ['FULL OUTER JOIN', 'INNER JOIN', 'CROSS JOIN', 'UNION ALL'], 0),
    quiz('Num LEFT JOIN, colocar o filtro da tabela da direita no WHERE (em vez do ON)...', ['Elimina as linhas da esquerda sem par, virando na prática um INNER JOIN', 'Não muda nada', 'Dá erro', 'Duplica as linhas'], 0),
  ],
};

const L_WIN2 = {
  id: 'sql-6-4', title: 'Funções de valor e de distribuição',
  steps: [
    theory('Pegando valores de outras linhas da janela', `
Além de LAG e LEAD, existem funções que buscam um valor numa posição da janela:

| função | devolve |
|---|---|
| \`FIRST_VALUE(x) OVER (...)\` | o valor da **primeira** linha da janela |
| \`LAST_VALUE(x) OVER (...)\` | o valor da **última** linha da janela |
| \`NTH_VALUE(x, n) OVER (...)\` | o valor da n-ésima linha |

**Pegadinha do LAST_VALUE:** com ORDER BY, a janela padrão vai do início **até a linha atual**, então a "última" é a própria linha. Para olhar a partição inteira, declare o frame:

~~~sql
LAST_VALUE(salario) OVER (
  PARTITION BY departamento ORDER BY salario
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
~~~

Uso típico: comparar cada linha com o primeiro valor do grupo ("quanto o cliente gastou a mais que na primeira compra?").
`),
    theory('Funções de distribuição: posição relativa', `
| função | fórmula | leitura |
|---|---|---|
| \`PERCENT_RANK()\` | (rank − 1) ÷ (n − 1) | de 0 (menor) a 1 (maior) |
| \`CUME_DIST()\` | linhas com valor ≤ atual ÷ n | fração de linhas até esta, de 1/n a 1 |
| \`NTILE(k)\` | divide em k grupos de tamanho parecido | quartis (k = 4), decis (k = 10) |

Com 10 funcionários ordenados por salário, o 3º menor tem PERCENT_RANK = 2/9 ≈ 0,22 e CUME_DIST = 3/10 = 0,3.

**Cláusula WINDOW:** quando a mesma janela aparece várias vezes, dê um nome a ela:

~~~sql
SELECT nome, salario,
       RANK() OVER w, PERCENT_RANK() OVER w
FROM funcionarios
WINDOW w AS (ORDER BY salario);
~~~
`),
    exSql('Primeira compra × compra atual', `
Para cada pedido, a data do **primeiro** pedido do mesmo cliente:
`, `SELECT cliente_id, id AS pedido, data_pedido,
       FIRST_VALUE(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido) AS primeira_compra,
       CAST(julianday(data_pedido) - julianday(FIRST_VALUE(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido)) AS INTEGER) AS dias_desde_primeira
FROM pedidos
ORDER BY cliente_id, data_pedido;`, `
Na primeira compra de cada cliente, \`dias_desde_primeira\` é 0; nas seguintes, mostra há quanto tempo o cliente compra.
`),
    exSql('Posição relativa dos salários', `
`, `SELECT nome, salario,
       ROUND(PERCENT_RANK() OVER w, 2) AS percent_rank,
       ROUND(CUME_DIST() OVER w, 2) AS cume_dist,
       NTILE(4) OVER w AS quartil
FROM funcionarios
WINDOW w AS (ORDER BY salario);`, `
O menor salário tem percent_rank 0; o maior, 1. O NTILE(4) colocou os funcionários em 4 grupos (quartis).
`),
    sql('Para cada produto, mostre `categoria`, `nome`, `preco` e `mais_caro_categoria`: o preço do produto **mais caro da sua categoria** (use FIRST_VALUE).',
      `SELECT categoria, nome, preco, FIRST_VALUE(preco) OVER (PARTITION BY categoria ORDER BY preco DESC) AS mais_caro_categoria FROM produtos;`),
    sql('Mostre `nome`, `salario` e `pct_rank` (PERCENT_RANK por salário crescente, 2 casas) dos funcionários. Ordene por salário.',
      `SELECT nome, salario, ROUND(PERCENT_RANK() OVER (ORDER BY salario), 2) AS pct_rank FROM funcionarios ORDER BY salario;`,
      { ordered: true }),
    sql('Divida os dias da loja **Online** em **4 quartis** de receita (NTILE). Mostre, por quartil, `dias`, `min_receita` e `max_receita`. Ordene pelo quartil.',
      `WITH q AS (SELECT receita, NTILE(4) OVER (ORDER BY receita) AS quartil FROM vendas_diarias WHERE loja = 'Online') SELECT quartil, COUNT(*) AS dias, MIN(receita) AS min_receita, MAX(receita) AS max_receita FROM q GROUP BY quartil ORDER BY quartil;`,
      { ordered: true }),
    quiz('Por que `LAST_VALUE(x) OVER (ORDER BY data)` costuma devolver o próprio valor da linha?', ['Porque o frame padrão termina na linha atual', 'Porque LAST_VALUE está quebrado', 'Porque falta PARTITION BY', 'Porque ORDER BY é ignorado'], 0),
    quiz('Com 5 linhas, qual o PERCENT_RANK da maior?', ['1', '0,8', '5', '0,2'], 0, '(rank − 1) ÷ (n − 1) = (5 − 1) ÷ 4 = 1.'),
  ],
};

const L_MODEL = {
  id: 'sql-8-3', title: 'ALTER, DROP e modelagem para análise',
  steps: [
    theory('Alterando a estrutura: DDL', `
Os comandos que mudam a **estrutura** (e não os dados) formam a **DDL** (*Data Definition Language*):

| comando | o que faz |
|---|---|
| \`CREATE TABLE\` | cria uma tabela |
| \`ALTER TABLE t ADD COLUMN c TIPO\` | adiciona uma coluna (as linhas existentes ficam com NULL ou o DEFAULT) |
| \`ALTER TABLE t RENAME COLUMN a TO b\` | renomeia uma coluna |
| \`ALTER TABLE t RENAME TO novo\` | renomeia a tabela |
| \`DROP TABLE t\` | apaga a tabela **e todos os dados** |
| \`DROP VIEW v\`, \`DROP INDEX i\` | apaga view / índice |
| \`TRUNCATE TABLE t\` | esvazia a tabela (não existe no SQLite; use DELETE FROM t) |

Use \`IF EXISTS\` / \`IF NOT EXISTS\` para scripts que podem rodar mais de uma vez: \`DROP TABLE IF EXISTS tmp;\`.

As famílias de comandos SQL:
- **DQL**: consultar (SELECT)
- **DML**: manipular dados (INSERT, UPDATE, DELETE, MERGE)
- **DDL**: estrutura (CREATE, ALTER, DROP)
- **DCL**: permissões (GRANT, REVOKE)
- **TCL**: transações (BEGIN, COMMIT, ROLLBACK)
`),
    theory('Modelagem dimensional: fatos e dimensões', `
Sistemas que **registram operações** (o site, o ERP) usam modelos **normalizados** (3FN), ótimos para gravar sem repetir dados. Para **analisar**, os data warehouses usam o **modelo dimensional** (Kimball), em formato de **estrela**:

- **Tabela fato:** um registro por **evento medido** (uma venda, um clique), com chaves para as dimensões e **métricas numéricas** (quantidade, valor)
- **Tabelas dimensão:** o **contexto** dos eventos (cliente, produto, data, loja), com atributos descritivos para filtrar e agrupar

~~~text
            dim_cliente
                 |
dim_produto — fato_vendas — dim_data
                 |
             dim_loja
~~~

**Grão** é o que uma linha da fato representa ("um item de pedido"). Defini-lo é a primeira decisão do modelo; misturar grãos causa somas duplicadas.

**Tipos de métrica:** aditivas (receita: pode somar em qualquer dimensão), semiaditivas (saldo de estoque: não se soma ao longo do tempo), não aditivas (taxas e percentuais: recalcule a partir das partes, nunca some ou tire média de percentuais).

**Dimensões que mudam (SCD):** se o cliente muda de cidade, a **SCD tipo 1** sobrescreve (perde o histórico); a **SCD tipo 2** cria uma nova linha com datas de validade (\`valido_de\`, \`valido_ate\`), preservando a cidade correta de cada venda passada.
`),
    exSql('Montando uma fato de vendas', `
Uma view que transforma o modelo da loja numa tabela fato com grão "item de pedido":
`, `CREATE VIEW fato_vendas AS
SELECT p.id AS pedido_id,
       p.data_pedido AS data,
       p.cliente_id,
       i.produto_id,
       i.quantidade,
       i.quantidade * i.preco_unitario AS receita
FROM pedidos p
JOIN itens_pedido i ON i.pedido_id = p.id
WHERE p.status <> 'cancelado';

SELECT pr.categoria, SUM(f.quantidade) AS unidades, ROUND(SUM(f.receita), 2) AS receita
FROM fato_vendas f
JOIN produtos pr ON pr.id = f.produto_id
GROUP BY pr.categoria
ORDER BY receita DESC;`, `
A fato tem as métricas (quantidade, receita); a dimensão produtos dá o contexto (categoria). Toda pergunta vira "junte a fato com as dimensões e agregue".
`),
    sql('Adicione à tabela `produtos` a coluna `ativo` do tipo INTEGER com valor padrão 1, depois marque como inativo (0) o produto de id 5. Por fim, consulte `id`, `nome` e `ativo` de todos os produtos.',
      `ALTER TABLE produtos ADD COLUMN ativo INTEGER DEFAULT 1;
UPDATE produtos SET ativo = 0 WHERE id = 5;
SELECT id, nome, ativo FROM produtos;`,
      { hint: '`ALTER TABLE produtos ADD COLUMN ativo INTEGER DEFAULT 1;`' }),
    sql('Crie a view `vw_receita_mensal` com as colunas `mes` (AAAA-MM) e `receita` (soma de quantidade × preço_unitário dos pedidos **não cancelados**) e consulte-a ordenada por mês.',
      `CREATE VIEW vw_receita_mensal AS SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, SUM(i.quantidade * i.preco_unitario) AS receita FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE p.status <> 'cancelado' GROUP BY mes;
SELECT * FROM vw_receita_mensal ORDER BY mes;`,
      { ordered: true }),
    quiz('Numa modelagem em estrela, onde ficam as métricas numéricas como receita e quantidade?', ['Na tabela fato', 'Nas dimensões', 'Nas views', 'Nos índices'], 0),
    quiz('Qual o problema de calcular a "taxa de conversão média" tirando a média das taxas diárias?', ['Taxas são não aditivas: dias com poucos visitantes pesam igual a dias cheios; recalcule com total de conversões ÷ total de visitantes', 'Nenhum', 'Dá erro de tipo', 'O SQL não calcula médias de taxas'], 0),
    quiz('O cliente mudou de cidade e você precisa que as vendas antigas continuem com a cidade antiga. Qual estratégia?', ['SCD tipo 2 (nova linha com período de validade)', 'SCD tipo 1 (sobrescrever)', 'Apagar o cliente', 'DROP TABLE'], 0),
    order('Monte o comando que apaga a tabela tmp **somente se ela existir**:', ['DROP', 'TABLE', 'IF', 'EXISTS', 'tmp', ';'], ['DELETE', 'FROM']),
  ],
};

const L_QUALIDADE = {
  id: 'sql-9-3', title: 'Qualidade de dados com SQL',
  steps: [
    theory('Por que checar a qualidade antes de analisar', `
Uma análise só é tão boa quanto os dados. Antes de qualquer relatório importante, rode **checagens de qualidade**. As dimensões clássicas:

| dimensão | pergunta | checagem em SQL |
|---|---|---|
| **completude** | falta valor? | \`COUNT(*) - COUNT(col)\` |
| **unicidade** | há duplicados? | \`GROUP BY chave HAVING COUNT(*) > 1\` |
| **validade** | o valor está no domínio? | \`WHERE nota NOT BETWEEN 1 AND 5\` |
| **integridade referencial** | a FK aponta para algo que existe? | LEFT JOIN + \`IS NULL\` |
| **consistência** | regras entre colunas batem? | \`WHERE data_entrega < data_pedido\` |
| **atualidade** | os dados estão em dia? | \`MAX(data)\` × hoje |

Em pipelines, essas consultas viram **testes automáticos** (dbt tests, Great Expectations): se alguma retornar linhas, o pipeline para e alguém é avisado.
`),
    theory('Encontrando e removendo duplicados', `
**Achar** chaves repetidas:

~~~sql
SELECT email, COUNT(*) AS vezes
FROM clientes
GROUP BY email
HAVING COUNT(*) > 1;
~~~

**Ver as linhas** duplicadas inteiras e escolher qual manter: numere as repetições com ROW_NUMBER e fique com a número 1 (a mais recente, por exemplo):

~~~sql
WITH r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY data_cadastro DESC) AS rn
  FROM clientes
)
SELECT * FROM r WHERE rn = 1;   -- uma linha por email
~~~

**Perfil rápido de uma coluna** (*profiling*): \`COUNT(*)\`, \`COUNT(col)\`, \`COUNT(DISTINCT col)\`, \`MIN\`, \`MAX\`. Em poucos segundos você descobre nulos, cardinalidade e valores absurdos.
`),
    exSql('Perfil da tabela de avaliações', `
Em uma consulta, o retrato de qualidade da tabela avaliacoes:
`, `SELECT COUNT(*)                         AS linhas,
       COUNT(DISTINCT id)               AS ids_distintos,
       SUM(CASE WHEN nota NOT BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS notas_invalidas,
       COUNT(*) - COUNT(nota)           AS notas_nulas,
       MIN(data_avaliacao)              AS primeira,
       MAX(data_avaliacao)              AS ultima
FROM avaliacoes;`, `
ids_distintos = linhas → id não se repete. Zero notas inválidas e nulas → a coluna está limpa. Primeira e última data mostram o período coberto.
`),
    exSql('Integridade referencial', `
Toda avaliação aponta para um produto existente?
`, `SELECT COUNT(*) AS avaliacoes_orfas
FROM avaliacoes a
LEFT JOIN produtos p ON p.id = a.produto_id
WHERE p.id IS NULL;`, `
Zero significa integridade ok. Uma linha órfã indicaria um produto apagado ou um id digitado errado.
`),
    sql('Verifique se há **pares (cliente_id, produto_id) avaliados mais de uma vez** em `avaliacoes`. Mostre `cliente_id`, `produto_id` e `vezes`, só para os repetidos, ordenando por `vezes` decrescente, depois cliente e produto.',
      `SELECT cliente_id, produto_id, COUNT(*) AS vezes FROM avaliacoes GROUP BY cliente_id, produto_id HAVING COUNT(*) > 1 ORDER BY vezes DESC, cliente_id, produto_id;`,
      { ordered: true }),
    sql('Faça o perfil da coluna `email` de clientes numa linha: `total`, `preenchidos`, `nulos` e `distintos`.',
      `SELECT COUNT(*) AS total, COUNT(email) AS preenchidos, COUNT(*) - COUNT(email) AS nulos, COUNT(DISTINCT email) AS distintos FROM clientes;`),
    sql('Para cada par (cliente_id, produto_id) de `avaliacoes`, mantenha só a avaliação **mais recente** (use ROW_NUMBER). Mostre quantas linhas sobram, numa coluna `linhas`.',
      `WITH r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY cliente_id, produto_id ORDER BY data_avaliacao DESC, id DESC) AS rn FROM avaliacoes) SELECT COUNT(*) AS linhas FROM r WHERE rn = 1;`),
    quiz('Qual checagem detecta pedidos de clientes que não existem no cadastro?', ['Integridade referencial (LEFT JOIN + IS NULL)', 'Completude', 'Atualidade', 'Unicidade'], 0),
    quiz('Para remover duplicados mantendo o registro mais recente de cada chave, a técnica padrão é...', ['ROW_NUMBER() OVER (PARTITION BY chave ORDER BY data DESC) e filtrar rn = 1', 'DISTINCT *', 'GROUP BY todas as colunas', 'DELETE sem WHERE'], 0),
  ],
};

export const SQL_PLUS = {
  examples,
  lessons: [
    { unit: 'sql-u1', first: true, lesson: L_INTRO },
    { unit: 'sql-u2', after: 'sql-2-4', lesson: L_TEXTO },
    { unit: 'sql-u3', after: 'sql-3-3', lesson: L_AGGCOND },
    { unit: 'sql-u4', after: 'sql-4-3', lesson: L_JOINS2 },
    { unit: 'sql-u6', after: 'sql-6-3', lesson: L_WIN2 },
    { unit: 'sql-u8', after: 'sql-8-2', lesson: L_MODEL },
    { unit: 'sql-u9', after: 'sql-9-2', lesson: L_QUALIDADE },
  ],
  units: [],
};
