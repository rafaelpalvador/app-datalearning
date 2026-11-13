import { theory, quiz, order, fill, sql } from './helpers.js';

export const SQL_COURSE = {
  id: 'sql',
  title: 'SQL do Zero ao Avançado',
  icon: '🗄️',
  color: '#1cb0f6',
  description: 'Consultas, filtros, agregações, JOINs, subqueries, CTEs, window functions, modelagem, performance e análises de negócio.',
  units: [
    // ───────────────────────────── UNIDADE 1
    {
      id: 'sql-u1', title: 'Primeiros passos', description: 'Bancos relacionais, SELECT, ordenação e limites',
      lessons: [
        {
          id: 'sql-1-1', title: 'O que é SQL?',
          steps: [
            theory('Bancos de dados relacionais', `
**SQL** (*Structured Query Language*) é a linguagem usada para conversar com bancos de dados relacionais — PostgreSQL, MySQL, SQL Server, Oracle, SQLite, BigQuery, Snowflake...

Um banco relacional organiza os dados em **tabelas**:

- cada **linha** (registro) representa uma coisa: um cliente, um pedido...
- cada **coluna** (atributo) guarda uma característica: nome, preço, data...
- a **chave primária** (*primary key*) identifica cada linha de forma única (ex.: \`id\`)
- a **chave estrangeira** (*foreign key*) aponta para a chave primária de outra tabela, criando relacionamentos

> Analistas de dados passam boa parte do dia escrevendo SQL: é a ferramenta nº 1 para extrair dados.
`),
            theory('Nosso banco: a DataShop', `
Durante o curso você vai consultar o banco de uma loja online fictícia:

| tabela | o que guarda |
|---|---|
| \`clientes\` | quem compra (nome, email, cidade, estado) |
| \`produtos\` | catálogo (nome, categoria, preço, estoque) |
| \`pedidos\` | cada compra (cliente, data, status) |
| \`itens_pedido\` | produtos de cada pedido (quantidade, preço) |
| \`funcionarios\` | equipe da empresa (cargo, salário, gerente) |

\`pedidos.cliente_id\` é uma **chave estrangeira** que aponta para \`clientes.id\`.

> Dica: o botão **Esquema** nos exercícios mostra todas as tabelas e colunas.
`),
            quiz('Em uma tabela, o que representa uma LINHA?', ['Um atributo, como "preço"', 'Um registro, como um cliente específico', 'O tipo de dado da coluna', 'O nome da tabela'], 1,
              'Cada linha é um registro (uma ocorrência). As colunas são os atributos.'),
            quiz('Qual é a função de uma chave primária?', ['Ordenar a tabela', 'Identificar cada linha de forma única', 'Criptografar os dados', 'Ligar o banco à internet'], 1,
              'A chave primária é única e não nula para cada linha — é a "identidade" do registro.'),
            quiz('`pedidos.cliente_id` aponta para `clientes.id`. Ela é uma...', ['Chave primária', 'Chave estrangeira', 'Índice único', 'View'], 1,
              'Chave estrangeira: uma coluna que referencia a chave primária de outra tabela.'),
            order('Monte a consulta que lista o nome de todos os clientes:', ['SELECT', 'nome', 'FROM', 'clientes', ';'], ['WHERE', 'TABLE']),
          ],
        },
        {
          id: 'sql-1-2', title: 'SELECT e FROM',
          steps: [
            theory('Sua primeira consulta', `
Toda consulta começa com **SELECT** (quais colunas) e **FROM** (de qual tabela):

~~~sql
SELECT nome, cidade
FROM clientes;
~~~

- \`*\` seleciona **todas** as colunas: \`SELECT * FROM clientes;\`
- você pode renomear colunas com **AS** (alias): \`SELECT nome AS cliente FROM clientes;\`
- é possível fazer contas: \`SELECT nome, preco * 0.9 AS preco_promo FROM produtos;\`

> SQL não diferencia maiúsculas de minúsculas nas palavras-chave, mas escrevê-las em MAIÚSCULAS é a convenção.
`),
            sql('Liste **todas as colunas** de todos os produtos.', 'SELECT * FROM produtos;', { starter: 'SELECT ' }),
            sql('Mostre apenas o **nome** e o **preco** de cada produto.', 'SELECT nome, preco FROM produtos;'),
            fill('Complete a consulta:', 'SELECT nome, email ___ clientes;', [['FROM']]),
            sql('Mostre o nome do produto e o preço com 10% de desconto, chamando essa coluna de **preco_promo**.',
              'SELECT nome, preco * 0.9 AS preco_promo FROM produtos;', { hint: 'Use preco * 0.9 AS preco_promo' }),
            quiz('Por que evitar `SELECT *` em relatórios de produção?', [
              'Porque é um erro de sintaxe',
              'Porque traz colunas desnecessárias, gasta mais recursos e quebra se a tabela mudar',
              'Porque só funciona no SQLite',
              'Porque ordena os dados de forma aleatória'], 1,
              'Selecionar só o necessário deixa a consulta mais rápida, barata (ex.: BigQuery cobra por coluna lida) e estável.'),
          ],
        },
        {
          id: 'sql-1-3', title: 'Ordenando, limitando e DISTINCT',
          steps: [
            theory('ORDER BY, LIMIT e DISTINCT', `
~~~sql
SELECT nome, preco
FROM produtos
ORDER BY preco DESC   -- ASC (padrão) = crescente; DESC = decrescente
LIMIT 3;              -- apenas as 3 primeiras linhas
~~~

- Ordene por várias colunas: \`ORDER BY categoria, preco DESC\`
- **OFFSET** pula linhas: \`LIMIT 10 OFFSET 20\` (paginação)
- **DISTINCT** remove linhas duplicadas: \`SELECT DISTINCT estado FROM clientes;\`

> Em SQL Server o equivalente de LIMIT é \`SELECT TOP 3 ...\`; no Oracle, \`FETCH FIRST 3 ROWS ONLY\`.
`),
            sql('Liste nome e preço dos **3 produtos mais caros**, do mais caro para o mais barato.',
              'SELECT nome, preco FROM produtos ORDER BY preco DESC LIMIT 3;', { ordered: true }),
            sql('Liste os **estados distintos** onde há clientes.', 'SELECT DISTINCT estado FROM clientes;'),
            sql('Liste nome, categoria e preço dos produtos ordenados por **categoria (A→Z)** e, dentro de cada categoria, pelo **preço do maior para o menor**.',
              'SELECT nome, categoria, preco FROM produtos ORDER BY categoria ASC, preco DESC;', { ordered: true }),
            order('Monte: os 5 clientes cadastrados mais recentemente', ['SELECT', 'nome', 'FROM', 'clientes', 'ORDER BY', 'data_cadastro', 'DESC', 'LIMIT 5'], ['ASC', 'GROUP BY']),
            quiz('O que `LIMIT 10 OFFSET 20` retorna?', ['As linhas 1 a 10', 'As linhas 21 a 30', 'As linhas 10 a 20', 'As linhas 20 a 30'], 1,
              'OFFSET 20 pula as 20 primeiras linhas; LIMIT 10 retorna as 10 seguintes (21 a 30).'),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 2
    {
      id: 'sql-u2', title: 'Filtrando dados', description: 'WHERE, operadores lógicos, LIKE, NULL e CASE',
      lessons: [
        {
          id: 'sql-2-1', title: 'WHERE e comparações',
          steps: [
            theory('Filtrando linhas com WHERE', `
**WHERE** mantém apenas as linhas que atendem a uma condição:

~~~sql
SELECT nome, preco
FROM produtos
WHERE preco > 1000;
~~~

| operador | significado |
|---|---|
| \`=\` | igual |
| \`<>\` ou \`!=\` | diferente |
| \`>\` \`>=\` \`<\` \`<=\` | maior, maior ou igual... |

Textos e datas vão entre **aspas simples**: \`WHERE status = 'entregue'\`.
`),
            sql('Liste nome e preço dos produtos que custam **mais de 1000**.', 'SELECT nome, preco FROM produtos WHERE preco > 1000;'),
            sql('Liste todos os pedidos (todas as colunas) com status **entregue**.', "SELECT * FROM pedidos WHERE status = 'entregue';"),
            fill('Complete para listar produtos sem estoque:', 'SELECT nome FROM produtos ___ estoque ___ 0;', [['WHERE'], ['=']]),
            quiz('Qual consulta está correta?', [
              'SELECT * FROM clientes WHERE estado = "SP" (aspas duplas)',
              "SELECT * FROM clientes WHERE estado = 'SP'",
              'SELECT * FROM clientes WHERE estado = SP',
              "SELECT * FROM clientes IF estado = 'SP'"], 1,
              'No padrão SQL, textos usam aspas simples. Aspas duplas são para nomes de colunas/tabelas (identificadores).'),
            sql('Liste os pedidos com status **diferente** de entregue.', "SELECT * FROM pedidos WHERE status <> 'entregue';"),
          ],
        },
        {
          id: 'sql-2-2', title: 'AND, OR, IN e BETWEEN',
          steps: [
            theory('Combinando condições', `
- **AND**: as duas condições precisam ser verdadeiras
- **OR**: basta uma ser verdadeira
- **NOT**: inverte a condição
- **IN**: igual a qualquer valor da lista → \`estado IN ('SP', 'RJ')\`
- **BETWEEN**: intervalo **inclusivo** → \`preco BETWEEN 100 AND 500\`

~~~sql
SELECT nome, preco FROM produtos
WHERE categoria = 'Acessórios' AND (preco < 100 OR estoque = 0);
~~~

> **AND tem precedência sobre OR.** Use parênteses sempre que misturar os dois!
`),
            sql("Liste nome e preço dos produtos da categoria **'Acessórios'** com preço **menor que 300**.",
              "SELECT nome, preco FROM produtos WHERE categoria = 'Acessórios' AND preco < 300;"),
            sql("Liste nome e estado dos clientes de **SP ou RJ** usando IN.", "SELECT nome, estado FROM clientes WHERE estado IN ('SP', 'RJ');"),
            sql('Liste os pedidos feitos **entre 2024-03-01 e 2024-05-31** (inclusive).',
              "SELECT * FROM pedidos WHERE data_pedido BETWEEN '2024-03-01' AND '2024-05-31';"),
            quiz("O que retorna `WHERE categoria = 'Livros' OR categoria = 'Móveis' AND preco > 2000`?", [
              'Livros e Móveis, todos com preço > 2000',
              'Todos os Livros + Móveis com preço > 2000',
              'Nada, a sintaxe é inválida',
              'Somente Móveis'], 1,
              "Como AND é avaliado primeiro, a condição vira: Livros OR (Móveis AND preco > 2000)."),
            sql("Liste os produtos que **não** são da categoria Eletrônicos nem Livros (use NOT IN).",
              "SELECT * FROM produtos WHERE categoria NOT IN ('Eletrônicos', 'Livros');"),
          ],
        },
        {
          id: 'sql-2-3', title: 'LIKE e valores NULL',
          steps: [
            theory('Buscando padrões com LIKE', `
**LIKE** compara textos com curingas:

- \`%\` = qualquer sequência de caracteres (inclusive vazia)
- \`_\` = exatamente um caractere

~~~sql
SELECT nome FROM produtos WHERE nome LIKE 'Livro%';  -- começa com "Livro"
SELECT nome FROM clientes WHERE email LIKE '%@email.com';
~~~

> No PostgreSQL, \`ILIKE\` ignora maiúsculas/minúsculas. No SQLite o LIKE já ignora para letras ASCII.
`),
            theory('O que é NULL?', `
**NULL** significa *ausência de valor* (desconhecido). Não é zero nem texto vazio!

- Qualquer comparação com NULL resulta em NULL (nem verdadeiro, nem falso): \`NULL = NULL\` não é verdadeiro
- Para testar use **IS NULL** / **IS NOT NULL**
- **COALESCE(a, b, ...)** devolve o primeiro valor não nulo

~~~sql
SELECT nome, COALESCE(email, 'sem email') AS contato
FROM clientes;
~~~
`),
            sql("Liste o nome dos produtos cujo nome **começa com 'Livro'**.", "SELECT nome FROM produtos WHERE nome LIKE 'Livro%';"),
            sql('Liste o nome dos clientes que **não têm email** cadastrado.', 'SELECT nome FROM clientes WHERE email IS NULL;'),
            quiz('`SELECT * FROM clientes WHERE email = NULL;` retorna...', ['Os clientes sem email', 'Nenhuma linha', 'Todos os clientes', 'Um erro de sintaxe'], 1,
              'Comparar com = NULL resulta em NULL (desconhecido), que o WHERE trata como falso. Use IS NULL.'),
            sql("Mostre o nome e o email de todos os clientes, trocando emails nulos por **'sem email'** (coluna chamada contato).",
              "SELECT nome, COALESCE(email, 'sem email') AS contato FROM clientes;"),
            sql("Liste os clientes cujo nome tem a **letra 'a' na segunda posição** (ex.: Carla, Gabriela).", "SELECT * FROM clientes WHERE nome LIKE '_a%';",
              { hint: 'Use _ para "um caractere qualquer".' }),
          ],
        },
        {
          id: 'sql-2-4', title: 'Expressões, funções e CASE',
          steps: [
            theory('Funções e expressões', `
Funções úteis do dia a dia:

| função | exemplo | resultado |
|---|---|---|
| \`UPPER/LOWER\` | \`UPPER('sql')\` | SQL |
| \`LENGTH\` | \`LENGTH('dados')\` | 5 |
| \`SUBSTR\` | \`SUBSTR('2024-03-15', 1, 7)\` | 2024-03 |
| \`ROUND\` | \`ROUND(3.14159, 2)\` | 3.14 |
| \`\\|\\|\` (concatenar) | \`nome \\|\\| ' - ' \\|\\| estado\` | Ana Souza - SP |
| \`REPLACE\` | \`REPLACE('a-b', '-', '/')\` | a/b |
| \`TRIM\` | \`TRIM('  x ')\` | x |

> No MySQL/SQL Server a concatenação usa \`CONCAT(a, b)\` ou \`+\`.
`),
            theory('CASE WHEN: o "if" do SQL', `
~~~sql
SELECT nome, preco,
  CASE
    WHEN preco >= 2000 THEN 'premium'
    WHEN preco >= 300  THEN 'intermediário'
    ELSE 'básico'
  END AS faixa
FROM produtos;
~~~

As condições são testadas **em ordem**; a primeira verdadeira vence. Sem ELSE, o resultado é NULL.
`),
            sql("Mostre nome, preço e uma coluna **faixa**: 'premium' se preço ≥ 2000, 'intermediário' se ≥ 300, senão 'básico'.",
              "SELECT nome, preco, CASE WHEN preco >= 2000 THEN 'premium' WHEN preco >= 300 THEN 'intermediário' ELSE 'básico' END AS faixa FROM produtos;"),
            sql('Mostre o nome do produto e o **valor total em estoque** (preco × estoque), arredondado para 2 casas, chamado valor_estoque.',
              'SELECT nome, ROUND(preco * estoque, 2) AS valor_estoque FROM produtos;'),
            sql("Mostre uma coluna chamada **etiqueta** no formato `NOME EM MAIÚSCULAS - estado` para cada cliente com estado preenchido.",
              "SELECT UPPER(nome) || ' - ' || estado AS etiqueta FROM clientes WHERE estado IS NOT NULL;"),
            quiz('Em um CASE sem ELSE, quando nenhuma condição é verdadeira o resultado é...', ['0', "''", 'NULL', 'Erro'], 2),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 3
    {
      id: 'sql-u3', title: 'Agregações', description: 'COUNT, SUM, AVG, GROUP BY e HAVING',
      lessons: [
        {
          id: 'sql-3-1', title: 'Funções de agregação',
          steps: [
            theory('Resumindo muitas linhas em uma', `
| função | o que faz |
|---|---|
| \`COUNT(*)\` | conta linhas |
| \`COUNT(coluna)\` | conta valores **não nulos** |
| \`COUNT(DISTINCT coluna)\` | conta valores distintos |
| \`SUM\` / \`AVG\` | soma / média |
| \`MIN\` / \`MAX\` | menor / maior |

~~~sql
SELECT COUNT(*) AS total, AVG(preco) AS preco_medio
FROM produtos;
~~~

> Agregações **ignoram NULL** (exceto \`COUNT(*)\`).
`),
            sql('Quantos clientes existem? (uma coluna, uma linha)', 'SELECT COUNT(*) FROM clientes;'),
            sql('Quantos clientes **têm email** preenchido?', 'SELECT COUNT(email) FROM clientes;'),
            quiz('Se uma tabela tem 10 linhas e a coluna email tem 2 NULLs, `COUNT(email)` retorna...', ['10', '8', '2', 'NULL'], 1),
            sql('Mostre o **menor**, o **maior** e o **preço médio** dos produtos (média arredondada para 2 casas), nessa ordem.',
              'SELECT MIN(preco), MAX(preco), ROUND(AVG(preco), 2) FROM produtos;'),
            sql('Quantas **categorias distintas** de produto existem?', 'SELECT COUNT(DISTINCT categoria) FROM produtos;'),
          ],
        },
        {
          id: 'sql-3-2', title: 'GROUP BY',
          steps: [
            theory('Agregando por grupos', `
**GROUP BY** divide as linhas em grupos e calcula a agregação para cada um:

~~~sql
SELECT categoria, COUNT(*) AS qtd, AVG(preco) AS preco_medio
FROM produtos
GROUP BY categoria;
~~~

**Regra de ouro:** toda coluna no SELECT que **não** está dentro de uma agregação precisa estar no GROUP BY.
`),
            sql('Mostre cada **categoria** e a **quantidade de produtos** nela.', 'SELECT categoria, COUNT(*) FROM produtos GROUP BY categoria;'),
            sql('Mostre cada **status** de pedido e quantos pedidos há em cada um, do mais frequente para o menos frequente.',
              'SELECT status, COUNT(*) AS qtd FROM pedidos GROUP BY status ORDER BY qtd DESC;', { ordered: true }),
            sql('Mostre cada **estado** e o número de clientes, ignorando clientes sem estado.',
              'SELECT estado, COUNT(*) FROM clientes WHERE estado IS NOT NULL GROUP BY estado;'),
            quiz('Qual consulta é inválida no SQL padrão?', [
              'SELECT categoria, COUNT(*) FROM produtos GROUP BY categoria',
              'SELECT categoria, nome, COUNT(*) FROM produtos GROUP BY categoria',
              'SELECT COUNT(*) FROM produtos',
              'SELECT categoria, MAX(preco) FROM produtos GROUP BY categoria'], 1,
              '`nome` não está no GROUP BY nem em uma agregação. PostgreSQL dá erro; SQLite e MySQL antigo aceitam, mas o valor é imprevisível.'),
            sql('Para cada pedido, mostre **pedido_id** e o **valor total** (soma de quantidade × preco_unitario), chamado total.',
              'SELECT pedido_id, SUM(quantidade * preco_unitario) AS total FROM itens_pedido GROUP BY pedido_id;'),
          ],
        },
        {
          id: 'sql-3-3', title: 'HAVING e ordem de execução',
          steps: [
            theory('Filtrando grupos com HAVING', `
- **WHERE** filtra **linhas** antes de agrupar
- **HAVING** filtra **grupos** depois de agregar

~~~sql
SELECT categoria, COUNT(*) AS qtd
FROM produtos
WHERE estoque > 0          -- linhas
GROUP BY categoria
HAVING COUNT(*) >= 2;      -- grupos
~~~

**Ordem lógica de execução** (diferente da ordem em que escrevemos!):

1. FROM / JOIN
2. WHERE
3. GROUP BY
4. HAVING
5. SELECT
6. DISTINCT
7. ORDER BY
8. LIMIT
`),
            sql('Mostre as categorias com **mais de 2 produtos** e a quantidade.', 'SELECT categoria, COUNT(*) FROM produtos GROUP BY categoria HAVING COUNT(*) > 2;'),
            sql('Mostre o **cliente_id** e o número de pedidos dos clientes com **3 ou mais pedidos**.',
              'SELECT cliente_id, COUNT(*) FROM pedidos GROUP BY cliente_id HAVING COUNT(*) >= 3;'),
            quiz('Por que `WHERE COUNT(*) > 2` dá erro?', [
              'Porque COUNT não existe',
              'Porque o WHERE é executado antes do agrupamento, quando a agregação ainda não existe',
              'Porque falta um ORDER BY',
              'Não dá erro'], 1),
            order('Coloque na ordem LÓGICA de execução:', ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY']),
            sql('Considerando só pedidos **entregues**, mostre cada cliente_id e quantos pedidos entregues tem, apenas para quem tem **pelo menos 2**.',
              "SELECT cliente_id, COUNT(*) FROM pedidos WHERE status = 'entregue' GROUP BY cliente_id HAVING COUNT(*) >= 2;"),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 4
    {
      id: 'sql-u4', title: 'JOINs', description: 'Combinando tabelas: INNER, LEFT, self join e UNION',
      lessons: [
        {
          id: 'sql-4-1', title: 'INNER JOIN',
          steps: [
            theory('Juntando tabelas', `
Os dados ficam espalhados em várias tabelas (normalização). O **JOIN** junta linhas relacionadas:

~~~sql
SELECT p.id, c.nome, p.data_pedido
FROM pedidos AS p
INNER JOIN clientes AS c
  ON c.id = p.cliente_id;
~~~

- \`p\` e \`c\` são **aliases** de tabela (economizam digitação)
- **ON** define a condição de ligação
- **INNER JOIN** (ou só JOIN) mantém apenas as linhas que têm correspondência **nos dois lados**
`),
            sql('Liste o **id do pedido**, o **nome do cliente** e a **data** de cada pedido.',
              'SELECT p.id, c.nome, p.data_pedido FROM pedidos p JOIN clientes c ON c.id = p.cliente_id;'),
            sql('Liste pedido_id, **nome do produto** e quantidade de cada item vendido.',
              'SELECT i.pedido_id, pr.nome, i.quantidade FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id;'),
            fill('Complete o JOIN:', 'SELECT c.nome, p.status\nFROM pedidos p\nJOIN clientes c ___ c.id = p.___;', [['ON'], ['cliente_id']]),
            sql('Liste o nome dos clientes e a data de pedidos **cancelados**.',
              "SELECT c.nome, p.data_pedido FROM pedidos p JOIN clientes c ON c.id = p.cliente_id WHERE p.status = 'cancelado';"),
            quiz('O cliente João não tem nenhum pedido. Em `clientes INNER JOIN pedidos`, ele...', ['Aparece com pedido NULL', 'Não aparece', 'Aparece duplicado', 'Causa erro'], 1,
              'INNER JOIN só mantém linhas com correspondência dos dois lados.'),
          ],
        },
        {
          id: 'sql-4-2', title: 'LEFT JOIN e anti-join',
          steps: [
            theory('LEFT, RIGHT e FULL JOIN', `
- **LEFT JOIN**: todas as linhas da tabela da **esquerda**; colunas da direita ficam NULL quando não há correspondência
- **RIGHT JOIN**: o espelho (todas as da direita)
- **FULL OUTER JOIN**: todas dos dois lados
- **CROSS JOIN**: produto cartesiano (todas as combinações)

~~~sql
SELECT c.nome, COUNT(p.id) AS qtd_pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id
GROUP BY c.id, c.nome;
~~~

**Anti-join** — achar quem *não* tem correspondência:

~~~sql
SELECT c.nome
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id
WHERE p.id IS NULL;
~~~
`),
            sql('Liste **todos** os clientes e a **quantidade de pedidos** de cada um (inclusive quem tem 0).',
              'SELECT c.nome, COUNT(p.id) FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id GROUP BY c.id, c.nome;',
              { hint: 'Use COUNT(p.id) e não COUNT(*) — por quê?' }),
            quiz('No exercício anterior, por que usar `COUNT(p.id)` em vez de `COUNT(*)`?', [
              'Porque é mais rápido',
              'Porque COUNT(*) contaria 1 para clientes sem pedidos (a linha com NULLs existe)',
              'Porque COUNT(*) não funciona com JOIN',
              'Não faz diferença'], 1),
            sql('Liste o nome dos produtos que **nunca foram vendidos**.',
              'SELECT pr.nome FROM produtos pr LEFT JOIN itens_pedido i ON i.produto_id = pr.id WHERE i.pedido_id IS NULL;'),
            sql('Liste o nome dos clientes que **nunca fizeram pedido**.',
              'SELECT c.nome FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL;'),
            quiz('Quantas linhas tem `A CROSS JOIN B` se A tem 4 linhas e B tem 5?', ['9', '5', '20', '4'], 2),
          ],
        },
        {
          id: 'sql-4-3', title: 'Múltiplos JOINs, self join e UNION',
          steps: [
            theory('Encadeando JOINs', `
Você pode juntar quantas tabelas precisar:

~~~sql
SELECT c.nome, SUM(i.quantidade * i.preco_unitario) AS faturamento
FROM clientes c
JOIN pedidos p      ON p.cliente_id = c.id
JOIN itens_pedido i ON i.pedido_id = p.id
WHERE p.status = 'entregue'
GROUP BY c.id, c.nome
ORDER BY faturamento DESC;
~~~

**Self join**: juntar a tabela com ela mesma. Útil para hierarquias (funcionário → gerente).
`),
            sql('Mostre o **nome do cliente** e o **faturamento** (soma de quantidade × preço) de pedidos **entregues**, do maior para o menor.',
              "SELECT c.nome, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM clientes c JOIN pedidos p ON p.cliente_id = c.id JOIN itens_pedido i ON i.pedido_id = p.id WHERE p.status = 'entregue' GROUP BY c.id, c.nome ORDER BY faturamento DESC;",
              { ordered: true }),
            sql('Mostre o faturamento total (quantidade × preço) por **categoria de produto**, considerando todos os pedidos que não foram cancelados.',
              "SELECT pr.categoria, SUM(i.quantidade * i.preco_unitario) FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id JOIN pedidos p ON p.id = i.pedido_id WHERE p.status <> 'cancelado' GROUP BY pr.categoria;"),
            sql('Liste o nome de cada funcionário e o **nome do seu gerente** (a CEO deve aparecer com gerente NULL).',
              'SELECT f.nome, g.nome AS gerente FROM funcionarios f LEFT JOIN funcionarios g ON g.id = f.gerente_id;'),
            theory('UNION e UNION ALL', `
Empilham resultados de consultas com **as mesmas colunas**:

- **UNION** remove duplicados
- **UNION ALL** mantém tudo (e é mais rápido)

~~~sql
SELECT nome, 'cliente' AS tipo FROM clientes
UNION ALL
SELECT nome, 'funcionário' FROM funcionarios;
~~~

Também existem **INTERSECT** (em ambos) e **EXCEPT** (no primeiro, mas não no segundo).
`),
            sql("Monte uma lista única de pessoas com colunas **nome** e **tipo** ('cliente' ou 'funcionario'), juntando clientes e funcionários.",
              "SELECT nome, 'cliente' AS tipo FROM clientes UNION ALL SELECT nome, 'funcionario' FROM funcionarios;"),
            quiz('Qual a diferença entre UNION e UNION ALL?', ['Nenhuma', 'UNION remove linhas duplicadas; UNION ALL mantém', 'UNION ALL ordena o resultado', 'UNION só funciona com 2 tabelas'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 5
    {
      id: 'sql-u5', title: 'Subconsultas e CTEs', description: 'Consultas dentro de consultas, WITH e recursão',
      lessons: [
        {
          id: 'sql-5-1', title: 'Subqueries',
          steps: [
            theory('Consultas dentro de consultas', `
Uma **subquery** é um SELECT dentro de outro. Pode aparecer em vários lugares:

~~~sql
-- escalar (retorna 1 valor) no WHERE
SELECT nome, preco FROM produtos
WHERE preco > (SELECT AVG(preco) FROM produtos);

-- lista, com IN
SELECT nome FROM clientes
WHERE id IN (SELECT cliente_id FROM pedidos WHERE status = 'cancelado');

-- no FROM (tabela derivada)
SELECT AVG(total) FROM (
  SELECT pedido_id, SUM(quantidade * preco_unitario) AS total
  FROM itens_pedido GROUP BY pedido_id
) t;
~~~
`),
            sql('Liste nome e preço dos produtos **mais caros que a média** de preços.',
              'SELECT nome, preco FROM produtos WHERE preco > (SELECT AVG(preco) FROM produtos);'),
            sql("Liste o nome dos clientes que já compraram algum produto da categoria **'Eletrônicos'** (sem repetir nomes).",
              "SELECT nome FROM clientes WHERE id IN (SELECT p.cliente_id FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id JOIN produtos pr ON pr.id = i.produto_id WHERE pr.categoria = 'Eletrônicos');"),
            sql('Calcule o **ticket médio** (valor médio por pedido) de todos os pedidos, arredondado para 2 casas.',
              'SELECT ROUND(AVG(total), 2) FROM (SELECT pedido_id, SUM(quantidade * preco_unitario) AS total FROM itens_pedido GROUP BY pedido_id) t;'),
            theory('EXISTS e subqueries correlacionadas', `
Uma subquery **correlacionada** usa colunas da consulta externa e é avaliada "para cada linha":

~~~sql
SELECT nome, categoria, preco
FROM produtos p1
WHERE preco = (SELECT MAX(preco) FROM produtos p2
               WHERE p2.categoria = p1.categoria);
~~~

**EXISTS** testa se a subquery retorna alguma linha:

~~~sql
SELECT c.nome FROM clientes c
WHERE EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id);
~~~
`),
            sql('Liste nome, categoria e preço do **produto mais caro de cada categoria** (use subquery correlacionada).',
              'SELECT nome, categoria, preco FROM produtos p1 WHERE preco = (SELECT MAX(preco) FROM produtos p2 WHERE p2.categoria = p1.categoria);'),
            sql('Usando **NOT EXISTS**, liste o nome dos clientes sem nenhum pedido.',
              'SELECT c.nome FROM clientes c WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id);'),
          ],
        },
        {
          id: 'sql-5-2', title: 'CTEs (WITH) e recursão',
          steps: [
            theory('Common Table Expressions', `
Uma **CTE** dá nome a uma subconsulta e deixa o código legível, como "variáveis" de SQL:

~~~sql
WITH totais AS (
  SELECT pedido_id, SUM(quantidade * preco_unitario) AS total
  FROM itens_pedido
  GROUP BY pedido_id
),
pedidos_mes AS (
  SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, t.total
  FROM pedidos p JOIN totais t ON t.pedido_id = p.id
)
SELECT mes, SUM(total) AS faturamento
FROM pedidos_mes
GROUP BY mes
ORDER BY mes;
~~~

> Em times de dados, CTEs são o padrão para queries longas (e a base do **dbt**).
`),
            sql('Usando CTE, calcule o **faturamento por mês** (formato AAAA-MM) de todos os pedidos, ordenado por mês. Colunas: mes, faturamento.',
              'WITH totais AS (SELECT pedido_id, SUM(quantidade * preco_unitario) AS total FROM itens_pedido GROUP BY pedido_id) SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, SUM(t.total) AS faturamento FROM pedidos p JOIN totais t ON t.pedido_id = p.id GROUP BY mes ORDER BY mes;',
              { ordered: true }),
            sql('Com uma CTE, encontre os clientes cujo faturamento total (todos os pedidos) é **maior que 5000**. Colunas: nome, total.',
              'WITH fat AS (SELECT p.cliente_id, SUM(i.quantidade * i.preco_unitario) AS total FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY p.cliente_id) SELECT c.nome, f.total FROM fat f JOIN clientes c ON c.id = f.cliente_id WHERE f.total > 5000;'),
            theory('CTE recursiva', `
Uma CTE pode referenciar a si mesma — perfeito para **hierarquias** e **sequências**:

~~~sql
WITH RECURSIVE hierarquia AS (
  SELECT id, nome, gerente_id, 0 AS nivel
  FROM funcionarios WHERE gerente_id IS NULL      -- âncora
  UNION ALL
  SELECT f.id, f.nome, f.gerente_id, h.nivel + 1   -- passo recursivo
  FROM funcionarios f
  JOIN hierarquia h ON f.gerente_id = h.id
)
SELECT * FROM hierarquia;
~~~
`),
            sql('Use uma CTE recursiva para listar **nome** e **nivel** hierárquico de todos os funcionários (CEO = nível 0).',
              'WITH RECURSIVE h AS (SELECT id, nome, 0 AS nivel FROM funcionarios WHERE gerente_id IS NULL UNION ALL SELECT f.id, f.nome, h.nivel + 1 FROM funcionarios f JOIN h ON f.gerente_id = h.id) SELECT nome, nivel FROM h;'),
            sql('Gere os números de **1 a 10** com uma CTE recursiva (uma coluna chamada n).',
              'WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 10) SELECT n FROM seq;', { ordered: true }),
            quiz('Qual a principal vantagem de CTEs sobre subqueries aninhadas?', ['São sempre mais rápidas', 'Legibilidade, reuso do mesmo bloco e possibilidade de recursão', 'Funcionam sem FROM', 'Criam tabelas permanentes'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 6
    {
      id: 'sql-u6', title: 'Window Functions', description: 'OVER, PARTITION BY, rankings, LAG/LEAD e acumulados',
      lessons: [
        {
          id: 'sql-6-1', title: 'OVER e PARTITION BY',
          steps: [
            theory('Agregação sem perder as linhas', `
**Window functions** calculam sobre um conjunto de linhas relacionadas, **sem colapsar** o resultado como o GROUP BY:

~~~sql
SELECT nome, categoria, preco,
       AVG(preco) OVER (PARTITION BY categoria) AS media_categoria
FROM produtos;
~~~

- **OVER()** transforma a função em janela
- **PARTITION BY** define os grupos (como um GROUP BY "local")
- **ORDER BY** dentro do OVER define a ordem (necessário para rankings e acumulados)
`),
            sql('Mostre nome, categoria, preço e o **preço médio da categoria** (coluna media_categoria, arredondada para 2 casas).',
              'SELECT nome, categoria, preco, ROUND(AVG(preco) OVER (PARTITION BY categoria), 2) AS media_categoria FROM produtos;'),
            sql('Mostre nome, salário e o **percentual do salário** do funcionário em relação ao total da folha (2 casas), coluna pct.',
              'SELECT nome, salario, ROUND(100.0 * salario / SUM(salario) OVER (), 2) AS pct FROM funcionarios;'),
            quiz('Qual a diferença entre `GROUP BY categoria` e `OVER (PARTITION BY categoria)`?', [
              'Nenhuma',
              'GROUP BY retorna 1 linha por grupo; a window function mantém todas as linhas',
              'PARTITION BY é mais lento sempre',
              'OVER só funciona com COUNT'], 1),
            sql('Para cada funcionário, mostre nome, departamento, salário e a **diferença** entre seu salário e a média do departamento (coluna diff, 2 casas).',
              'SELECT nome, departamento, salario, ROUND(salario - AVG(salario) OVER (PARTITION BY departamento), 2) AS diff FROM funcionarios;'),
          ],
        },
        {
          id: 'sql-6-2', title: 'Rankings: ROW_NUMBER, RANK, DENSE_RANK',
          steps: [
            theory('Funções de ranking', `
| salário | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 9000 | 1 | 1 | 1 |
| 8000 | 2 | 2 | 2 |
| 8000 | 3 | 2 | 2 |
| 7000 | 4 | **4** | **3** |

- **ROW_NUMBER**: numeração única, sem empates
- **RANK**: empates recebem o mesmo número e **pula** posições
- **DENSE_RANK**: empates recebem o mesmo número **sem pular**
- **NTILE(n)**: divide em n baldes (quartis, decis...)

Padrão clássico — **top N por grupo**:

~~~sql
WITH r AS (
  SELECT nome, categoria, preco,
         ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY preco DESC) AS rn
  FROM produtos
)
SELECT * FROM r WHERE rn = 1;
~~~
`),
            sql('Mostre nome, salário e a posição (coluna posicao) de cada funcionário no ranking de salários, do maior para o menor, usando **RANK**.',
              'SELECT nome, salario, RANK() OVER (ORDER BY salario DESC) AS posicao FROM funcionarios;'),
            sql('Usando ROW_NUMBER, liste nome, categoria e preço do **produto mais caro de cada categoria**.',
              'WITH r AS (SELECT nome, categoria, preco, ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY preco DESC) AS rn FROM produtos) SELECT nome, categoria, preco FROM r WHERE rn = 1;'),
            quiz('Salários: 10, 8, 8, 5. Qual o DENSE_RANK do salário 5 (ordem decrescente)?', ['3', '4', '2', '5'], 0),
            sql('Liste os **2 funcionários mais bem pagos de cada departamento** (nome, departamento, salario).',
              'WITH r AS (SELECT nome, departamento, salario, ROW_NUMBER() OVER (PARTITION BY departamento ORDER BY salario DESC) AS rn FROM funcionarios) SELECT nome, departamento, salario FROM r WHERE rn <= 2;'),
            sql('Divida os produtos em **4 quartis de preço** (NTILE) — colunas nome, preco, quartil (1 = mais baratos).',
              'SELECT nome, preco, NTILE(4) OVER (ORDER BY preco) AS quartil FROM produtos;'),
          ],
        },
        {
          id: 'sql-6-3', title: 'LAG, LEAD e acumulados',
          steps: [
            theory('Olhando para linhas vizinhas', `
- **LAG(col, n)**: valor de *n* linhas **antes**
- **LEAD(col, n)**: valor de *n* linhas **depois**
- **FIRST_VALUE / LAST_VALUE**: primeiro/último valor da janela

**Frames** controlam quais linhas entram na janela:

~~~sql
SUM(valor) OVER (ORDER BY mes
                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)  -- acumulado
AVG(valor) OVER (ORDER BY mes
                 ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)          -- média móvel 3 meses
~~~

Exemplo — crescimento mês a mês:

~~~sql
WITH m AS (...)
SELECT mes, faturamento,
       faturamento - LAG(faturamento) OVER (ORDER BY mes) AS variacao
FROM m;
~~~
`),
            sql('Para cada pedido, mostre id, data_pedido e a **data do pedido anterior do mesmo cliente** (coluna pedido_anterior), usando LAG.',
              'SELECT id, data_pedido, LAG(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido) AS pedido_anterior FROM pedidos;'),
            sql('Calcule o faturamento por mês (AAAA-MM) e o **faturamento acumulado** ao longo do ano. Colunas: mes, faturamento, acumulado. Ordene por mês.',
              'WITH m AS (SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY mes) SELECT mes, faturamento, SUM(faturamento) OVER (ORDER BY mes) AS acumulado FROM m ORDER BY mes;',
              { ordered: true }),
            sql('Mostre mes, faturamento e a **variação em relação ao mês anterior** (coluna variacao), ordenado por mês.',
              'WITH m AS (SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY mes) SELECT mes, faturamento, faturamento - LAG(faturamento) OVER (ORDER BY mes) AS variacao FROM m ORDER BY mes;',
              { ordered: true }),
            quiz('O que faz `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`?', ['Pega as 2 próximas linhas', 'Considera a linha atual e as 2 anteriores (janela de 3)', 'Considera toda a partição', 'Pula 2 linhas'], 1),
            sql('Calcule a **média móvel de 3 meses** do faturamento mensal (coluna media_movel, 2 casas). Colunas: mes, faturamento, media_movel.',
              'WITH m AS (SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY mes) SELECT mes, faturamento, ROUND(AVG(faturamento) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_movel FROM m ORDER BY mes;',
              { ordered: true }),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 7
    {
      id: 'sql-u7', title: 'Datas, textos e tipos', description: 'Manipulação de datas, CAST e diferenças entre bancos',
      lessons: [
        {
          id: 'sql-7-1', title: 'Trabalhando com datas',
          steps: [
            theory('Datas no SQL', `
Cada banco tem suas funções de data. No SQLite (usado aqui), datas são texto ISO \`AAAA-MM-DD\`:

| tarefa | SQLite | PostgreSQL | MySQL |
|---|---|---|---|
| ano | \`strftime('%Y', d)\` | \`EXTRACT(YEAR FROM d)\` | \`YEAR(d)\` |
| mês truncado | \`strftime('%Y-%m', d)\` | \`DATE_TRUNC('month', d)\` | \`DATE_FORMAT(d,'%Y-%m')\` |
| somar dias | \`date(d, '+7 days')\` | \`d + INTERVAL '7 days'\` | \`DATE_ADD(d, INTERVAL 7 DAY)\` |
| diferença em dias | \`julianday(a) - julianday(b)\` | \`a - b\` | \`DATEDIFF(a, b)\` |
| hoje | \`date('now')\` | \`CURRENT_DATE\` | \`CURDATE()\` |

> Sempre armazene datas em formato ISO (ou tipos DATE/TIMESTAMP) — ordenar e comparar fica trivial.
`),
            sql("Conte quantos pedidos foram feitos em cada mês, usando **strftime('%m', data_pedido)** como coluna mes.",
              "SELECT strftime('%m', data_pedido) AS mes, COUNT(*) FROM pedidos GROUP BY mes;"),
            sql('Para cada pedido, mostre id, data_pedido e a **data prevista de entrega** (7 dias depois), coluna previsao.',
              "SELECT id, data_pedido, date(data_pedido, '+7 days') AS previsao FROM pedidos;"),
            sql('Mostre o nome de cada cliente e **quantos dias** se passaram entre o cadastro e o primeiro pedido (coluna dias), apenas para quem tem pedidos.',
              'SELECT c.nome, CAST(julianday(MIN(p.data_pedido)) - julianday(c.data_cadastro) AS INTEGER) AS dias FROM clientes c JOIN pedidos p ON p.cliente_id = c.id GROUP BY c.id, c.nome;'),
            quiz('No PostgreSQL, qual expressão trunca uma data para o primeiro dia do mês?', ["DATE_TRUNC('month', d)", "strftime('%m', d)", 'MONTH(d)', "TRUNC(d, 'MM')"], 0,
              "DATE_TRUNC('month', d). No Oracle seria TRUNC(d, 'MM')."),
          ],
        },
        {
          id: 'sql-7-2', title: 'Tipos, CAST e NULLIF',
          steps: [
            theory('Conversão de tipos', `
- **CAST(valor AS tipo)** converte: \`CAST('42' AS INTEGER)\`, \`CAST(preco AS TEXT)\`
- PostgreSQL também aceita \`valor::integer\`
- **Divisão inteira**: em muitos bancos \`5 / 2 = 2\`! Use \`5 * 1.0 / 2\` ou CAST para obter 2.5
- **NULLIF(a, b)** retorna NULL se a = b — evita divisão por zero: \`x / NULLIF(y, 0)\`

Tipos comuns: \`INTEGER\`, \`BIGINT\`, \`NUMERIC(10,2)\` (dinheiro!), \`REAL/FLOAT\`, \`TEXT/VARCHAR(n)\`, \`DATE\`, \`TIMESTAMP\`, \`BOOLEAN\`, \`JSON\`.
`),
            quiz('Em PostgreSQL, quanto vale `SELECT 7 / 2;`?', ['3.5', '3', '4', 'Erro'], 1, 'Divisão entre inteiros é inteira. Use 7.0 / 2 ou CAST.'),
            sql('Calcule a **taxa de cancelamento** (%) dos pedidos com 2 casas decimais (coluna taxa).',
              "SELECT ROUND(100.0 * SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS taxa FROM pedidos;"),
            sql('Para cada produto, mostre nome e o **preço por unidade em estoque** (preco / estoque, 2 casas) usando NULLIF para evitar divisão por zero. Coluna razao.',
              'SELECT nome, ROUND(preco / NULLIF(estoque, 0), 2) AS razao FROM produtos;'),
            quiz('Qual tipo é mais adequado para valores monetários?', ['FLOAT', 'NUMERIC/DECIMAL', 'TEXT', 'INTEGER sempre'], 1,
              'FLOAT tem erros de arredondamento binário (0.1 + 0.2 ≠ 0.3). NUMERIC é exato. Alternativa: guardar centavos em INTEGER.'),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 8
    {
      id: 'sql-u8', title: 'Modificando e modelando', description: 'INSERT, UPDATE, DELETE, transações, DDL, normalização e views',
      lessons: [
        {
          id: 'sql-8-1', title: 'INSERT, UPDATE e DELETE',
          steps: [
            theory('DML: manipulando dados', `
~~~sql
INSERT INTO produtos (id, nome, categoria, preco, estoque)
VALUES (13, 'Mousepad XL', 'Acessórios', 59.90, 100);

UPDATE produtos
SET preco = preco * 1.05
WHERE categoria = 'Livros';

DELETE FROM pedidos
WHERE status = 'cancelado';
~~~

> ⚠️ **UPDATE e DELETE sem WHERE afetam a tabela inteira!** Rode um SELECT com o mesmo WHERE antes.
`),
            sql("Insira o produto id **13**, 'Mousepad XL', categoria 'Acessórios', preço 59.90, estoque 100.",
              "INSERT INTO produtos (id, nome, categoria, preco, estoque) VALUES (13, 'Mousepad XL', 'Acessórios', 59.90, 100);",
              { check: 'SELECT * FROM produtos ORDER BY id;' }),
            sql('Aumente em **10%** o preço de todos os produtos da categoria **Livros**.',
              "UPDATE produtos SET preco = preco * 1.10 WHERE categoria = 'Livros';",
              { check: 'SELECT id, ROUND(preco, 2) FROM produtos ORDER BY id;' }),
            sql('Apague os itens de pedido (itens_pedido) que pertencem a pedidos **cancelados**.',
              "DELETE FROM itens_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE status = 'cancelado');",
              { check: 'SELECT * FROM itens_pedido ORDER BY pedido_id, produto_id;' }),
            theory('Transações e ACID', `
Uma **transação** agrupa comandos que devem acontecer **todos ou nenhum**:

~~~sql
BEGIN;
UPDATE contas SET saldo = saldo - 100 WHERE id = 1;
UPDATE contas SET saldo = saldo + 100 WHERE id = 2;
COMMIT;   -- ou ROLLBACK para desfazer
~~~

**ACID**: **A**tomicidade, **C**onsistência, **I**solamento, **D**urabilidade.
`),
            quiz('O que acontece se der erro no meio de uma transação e você executar ROLLBACK?', ['Só o último comando é desfeito', 'Todos os comandos desde o BEGIN são desfeitos', 'Nada', 'O banco é apagado'], 1),
          ],
        },
        {
          id: 'sql-8-2', title: 'CREATE TABLE, constraints e views',
          steps: [
            theory('DDL: definindo estruturas', `
~~~sql
CREATE TABLE avaliacoes (
  id INTEGER PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
~~~

**Constraints** garantem qualidade dos dados: \`PRIMARY KEY\`, \`FOREIGN KEY/REFERENCES\`, \`NOT NULL\`, \`UNIQUE\`, \`CHECK\`, \`DEFAULT\`.

Outros comandos: \`ALTER TABLE ... ADD COLUMN\`, \`DROP TABLE\`, \`TRUNCATE\`.
`),
            sql("Crie a tabela **cupons** com: codigo (TEXT, chave primária), desconto (REAL, NOT NULL) e insira o cupom **'BEMVINDO'** com desconto **0.1**.",
              "CREATE TABLE cupons (codigo TEXT PRIMARY KEY, desconto REAL NOT NULL);\nINSERT INTO cupons VALUES ('BEMVINDO', 0.1);",
              { check: 'SELECT * FROM cupons;', hint: 'Dois comandos separados por ponto e vírgula.' }),
            theory('Normalização', `
Normalizar = organizar tabelas para **evitar redundância e anomalias**:

- **1FN**: valores atômicos (nada de "SP, RJ" numa célula), sem grupos repetidos
- **2FN**: 1FN + toda coluna depende da chave **inteira** (importa em chaves compostas)
- **3FN**: 2FN + nenhuma coluna depende de outra coluna não-chave

Em **analytics** muitas vezes fazemos o oposto (**desnormalizar**) em modelos dimensionais: **tabela fato** (eventos, ex.: vendas) + **dimensões** (cliente, produto, tempo) = *star schema*.
`),
            quiz('Guardar "cidade" e "estado" do cliente dentro da tabela pedidos (repetido em cada pedido) viola principalmente...', ['1FN', '3FN (dependência transitiva)', 'Nenhuma forma normal', 'ACID'], 1,
              'A cidade depende do cliente, não do pedido: dependência transitiva → viola a 3FN e gera redundância.'),
            sql('Crie uma **VIEW** chamada **vw_pedidos_entregues** com todas as colunas dos pedidos entregues.',
              "CREATE VIEW vw_pedidos_entregues AS SELECT * FROM pedidos WHERE status = 'entregue';",
              { check: 'SELECT * FROM vw_pedidos_entregues ORDER BY id;' }),
            quiz('Qual a diferença entre VIEW e tabela?', [
              'Nenhuma',
              'A VIEW é uma consulta salva; os dados não são copiados (exceto em views materializadas)',
              'A VIEW é mais rápida sempre',
              'A VIEW não pode ter JOIN'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 9
    {
      id: 'sql-u9', title: 'Performance e análises avançadas', description: 'Índices, plano de execução, coorte, funil e Pareto',
      lessons: [
        {
          id: 'sql-9-1', title: 'Índices e plano de execução',
          steps: [
            theory('Como o banco encontra os dados', `
Sem índice, o banco faz **full scan** (lê a tabela toda). Um **índice** (geralmente uma B-Tree) funciona como o índice remissivo de um livro.

~~~sql
CREATE INDEX idx_pedidos_cliente ON pedidos (cliente_id);
EXPLAIN QUERY PLAN SELECT * FROM pedidos WHERE cliente_id = 1;  -- SQLite
-- PostgreSQL: EXPLAIN ANALYZE ...
~~~

**Boas práticas:**
- indexe colunas usadas em **WHERE, JOIN e ORDER BY** com alta seletividade
- índices aceleram leituras, mas **deixam escritas mais lentas** e ocupam espaço
- funções na coluna podem impedir o uso do índice: \`WHERE UPPER(nome) = 'ANA'\`
- \`LIKE 'abc%'\` pode usar índice; \`LIKE '%abc'\` não
- em data warehouses (BigQuery, Snowflake) o conceito é **particionamento** e **clustering**
`),
            sql('Crie um índice chamado **idx_itens_produto** na coluna produto_id da tabela itens_pedido.',
              'CREATE INDEX idx_itens_produto ON itens_pedido (produto_id);',
              { check: "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name = 'idx_itens_produto';" }),
            quiz('Qual consulta provavelmente NÃO usa um índice em `nome`?', ["WHERE nome = 'Ana'", "WHERE nome LIKE 'An%'", "WHERE nome LIKE '%na'", 'ORDER BY nome'], 2),
            quiz('Qual é o custo de criar muitos índices?', ['Nenhum', 'INSERT/UPDATE/DELETE ficam mais lentos e usa-se mais disco', 'As consultas ficam mais lentas', 'O banco perde dados'], 1),
            quiz('Em SQL analítico, qual destas práticas mais reduz custo no BigQuery?', ['Usar SELECT *', 'Selecionar só as colunas necessárias e filtrar pela coluna de partição', 'Usar mais subqueries', 'Usar ORDER BY em tudo'], 1),
          ],
        },
        {
          id: 'sql-9-2', title: 'Análises de negócio com SQL',
          steps: [
            theory('Padrões de análise', `
Problemas que todo analista resolve com SQL:

- **Ticket médio**: faturamento / nº de pedidos
- **Coorte**: agrupar clientes pelo mês de entrada e acompanhar seu comportamento
- **Recorrência / retenção**: quem voltou a comprar?
- **Pareto (80/20)**: quais produtos geram a maior parte da receita?
- **Funil**: quantos chegam a cada etapa (pendente → enviado → entregue)

Ferramentas: CTEs + window functions + CASE WHEN.
`),
            sql('**Recorrência**: mostre quantos clientes compraram **uma única vez** e quantos compraram **mais de uma vez**. Colunas: tipo (\'único\' ou \'recorrente\'), clientes.',
              "WITH c AS (SELECT cliente_id, COUNT(*) AS n FROM pedidos GROUP BY cliente_id) SELECT CASE WHEN n = 1 THEN 'único' ELSE 'recorrente' END AS tipo, COUNT(*) AS clientes FROM c GROUP BY tipo;"),
            sql('**Coorte**: para cada mês de cadastro (AAAA-MM) dos clientes, mostre quantos clientes se cadastraram e quantos deles já fizeram ao menos um pedido. Colunas: coorte, cadastrados, compraram. Ordene pela coorte.',
              "SELECT SUBSTR(c.data_cadastro, 1, 7) AS coorte, COUNT(*) AS cadastrados, SUM(CASE WHEN EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id) THEN 1 ELSE 0 END) AS compraram FROM clientes c GROUP BY coorte ORDER BY coorte;",
              { ordered: true }),
            sql('**Pareto**: mostre o nome de cada produto vendido, sua receita e o **% acumulado da receita** (2 casas), do produto que mais fatura para o que menos fatura. Colunas: nome, receita, pct_acumulado.',
              'WITH r AS (SELECT pr.nome, SUM(i.quantidade * i.preco_unitario) AS receita FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id GROUP BY pr.id, pr.nome) SELECT nome, receita, ROUND(100.0 * SUM(receita) OVER (ORDER BY receita DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) / SUM(receita) OVER (), 2) AS pct_acumulado FROM r ORDER BY receita DESC;',
              { ordered: true }),
            sql("**Funil**: em uma única linha, mostre quantos pedidos estão em cada status usando agregação condicional. Colunas: pendente, enviado, entregue, cancelado.",
              "SELECT SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendente, SUM(CASE WHEN status = 'enviado' THEN 1 ELSE 0 END) AS enviado, SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) AS entregue, SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelado FROM pedidos;"),
            quiz('A técnica `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` é conhecida como...', ['Agregação condicional (pivot manual)', 'Self join', 'Subquery correlacionada', 'Normalização'], 0,
              'Ela "pivota" linhas em colunas. Alguns bancos têm PIVOT ou COUNT(*) FILTER (WHERE ...) no PostgreSQL.'),
          ],
        },
      ],
    },
  ],
};
