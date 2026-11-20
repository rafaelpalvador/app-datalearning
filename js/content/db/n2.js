// Trilha Bancos de Dados (PostgreSQL) — Nível 2: SQL profissional e lógica de negócio
import { theory, quiz, order, fill, pgsql, debugPg, exPg } from '../helpers.js';

const L_SUBLING = {
  id: 'db-2-1', title: 'DDL, DML, DCL e TCL: o SQL que altera o banco',
  steps: [
    theory('As sublinguagens', `
| sigla | nome | comandos | para quê |
|---|---|---|---|
| **DDL** | Data Definition | \`CREATE\`, \`ALTER\`, \`DROP\`, \`TRUNCATE\`, \`COMMENT\` | estrutura |
| **DML** | Data Manipulation | \`INSERT\`, \`UPDATE\`, \`DELETE\`, \`MERGE\` | dados |
| **DQL** | Data Query | \`SELECT\` | consulta |
| **DCL** | Data Control | \`GRANT\`, \`REVOKE\` | permissões |
| **TCL** | Transaction Control | \`BEGIN\`, \`COMMIT\`, \`ROLLBACK\`, \`SAVEPOINT\` | transações |

No PostgreSQL, a DDL é **transacional**: \`BEGIN; ALTER TABLE ...; ROLLBACK;\` desfaz a mudança de estrutura. Isso torna migrações muito mais seguras do que em bancos onde DDL faz commit implícito (MySQL, Oracle).
`),
    theory('DML moderno no PostgreSQL', `
**RETURNING**: devolve as linhas afetadas, sem um SELECT extra (essencial para pegar o id gerado):
~~~sql
INSERT INTO clientes (nome, uf, cidade, segmento, criado_em)
VALUES ('Lia Moura', 'PE', 'Recife', 'varejo', now())
RETURNING id, criado_em;
~~~

**UPDATE ... FROM** (atualizar usando outra tabela) e **DELETE ... USING**:
~~~sql
UPDATE produtos p SET ativo = false
FROM categorias c
WHERE c.id = p.categoria_id AND c.nome = 'Ficção';

DELETE FROM eventos e USING clientes c
WHERE c.id = e.cliente_id AND NOT c.ativo;
~~~

**Upsert com ON CONFLICT** (insere ou atualiza, atômico):
~~~sql
INSERT INTO estoque (produto_id, qtd) VALUES (10, 5)
ON CONFLICT (produto_id) DO UPDATE SET qtd = estoque.qtd + EXCLUDED.qtd;   -- EXCLUDED = a linha que tentou entrar
-- ou: ON CONFLICT DO NOTHING
~~~
Exige um índice único/PK no alvo do conflito.

**MERGE** (padrão SQL, PostgreSQL 15+; RETURNING com \`merge_action()\` no 17+):
~~~sql
MERGE INTO estoque t
USING entradas s ON t.produto_id = s.produto_id
WHEN MATCHED AND s.qtd = 0 THEN DELETE
WHEN MATCHED THEN UPDATE SET qtd = t.qtd + s.qtd
WHEN NOT MATCHED THEN INSERT (produto_id, qtd) VALUES (s.produto_id, s.qtd);
~~~
MERGE permite várias ações (inclusive DELETE) numa passada; ON CONFLICT é mais simples e lida melhor com concorrência no caso de inserção simultânea da mesma chave.

**PostgreSQL 18**: \`RETURNING old.*, new.*\` mostra o valor antes e depois num UPDATE.
`),
    theory('DCL: papéis e privilégios', `
No PostgreSQL, usuários e grupos são **roles**. O princípio é o do **menor privilégio**: cada aplicação ou pessoa recebe só o necessário.

~~~sql
CREATE ROLE leitura NOLOGIN;                         -- papel "grupo"
GRANT USAGE ON SCHEMA public TO leitura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO leitura;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO leitura;  -- tabelas futuras

CREATE ROLE analista LOGIN PASSWORD '...' IN ROLE leitura;   -- usuário que herda o grupo
REVOKE ALL ON pagamentos FROM leitura;                       -- tira um privilégio
~~~

Privilégios por objeto: \`SELECT\`, \`INSERT\`, \`UPDATE\`, \`DELETE\`, \`TRUNCATE\`, \`REFERENCES\`, \`TRIGGER\` (tabelas); \`USAGE\`, \`CREATE\` (schemas); \`EXECUTE\` (funções). Dá para limitar por **coluna**: \`GRANT SELECT (id, nome) ON clientes TO suporte\`. A aplicação **nunca** deve conectar como superusuário nem como dona das tabelas.
`),
    exPg('RETURNING, ON CONFLICT e MERGE', `
`, `CREATE TABLE estoque (produto_id int PRIMARY KEY, qtd int NOT NULL CHECK (qtd >= 0));
INSERT INTO estoque VALUES (1, 10), (2, 5);

INSERT INTO estoque VALUES (2, 3), (3, 7)
ON CONFLICT (produto_id) DO UPDATE SET qtd = estoque.qtd + EXCLUDED.qtd;

MERGE INTO estoque t
USING (VALUES (1, 0), (4, 2)) AS s(produto_id, qtd) ON t.produto_id = s.produto_id
WHEN MATCHED AND s.qtd = 0 THEN DELETE
WHEN MATCHED THEN UPDATE SET qtd = t.qtd + s.qtd
WHEN NOT MATCHED THEN INSERT VALUES (s.produto_id, s.qtd)
RETURNING merge_action() AS acao, t.*;`, `
O ON CONFLICT somou 3 ao produto 2 e inseriu o 3. O MERGE apagou o produto 1 (chegou com qtd 0) e inseriu o 4, e o RETURNING mostra qual ação aconteceu em cada linha.
`),
    quiz('Qual vantagem a DDL transacional do PostgreSQL traz para migrações?', ['Uma migração que falha no meio pode ser desfeita inteira com ROLLBACK', 'Deixa o ALTER TABLE mais rápido', 'Dispensa backup', 'Nenhuma'], 0),
    quiz('No `ON CONFLICT ... DO UPDATE`, o que é `EXCLUDED`?', ['A linha que tentou ser inserida e conflitou', 'A linha antiga apagada', 'Uma tabela de log', 'O valor padrão'], 0),
    quiz('Uma aplicação web só precisa ler e gravar pedidos. Qual a configuração certa?', ['Um role próprio com SELECT/INSERT/UPDATE só nas tabelas necessárias', 'Conectar como postgres (superusuário)', 'Conectar como dono das tabelas', 'GRANT ALL em tudo'], 0),
    pgsql('Insira o cliente "Lia Moura" (uf `PE`, cidade `Recife`, segmento `varejo`, criado_em `now()`) e devolva, com **RETURNING**, as colunas `nome` e `uf` da linha inserida.',
      `INSERT INTO clientes (nome, uf, cidade, segmento, criado_em) VALUES ('Lia Moura', 'PE', 'Recife', 'varejo', now()) RETURNING nome, uf;`),
    pgsql('Desative (`ativo = false`) todos os produtos da categoria de nome **Ficção** usando `UPDATE ... FROM categorias`, e devolva com RETURNING o `id` dos produtos alterados.',
      `UPDATE produtos p SET ativo = false FROM categorias c WHERE c.id = p.categoria_id AND c.nome = 'Ficção' RETURNING p.id;`,
      { allowEmpty: true }),
    pgsql('Crie `estoque (produto_id int PRIMARY KEY, qtd int NOT NULL)`, insira (1, 10), e depois faça um **upsert** de (1, 4) e (2, 6) que **some** a quantidade quando o produto já existir. Termine com `SELECT * FROM estoque ORDER BY produto_id`.',
      `CREATE TABLE estoque (produto_id int PRIMARY KEY, qtd int NOT NULL);
INSERT INTO estoque VALUES (1, 10);
INSERT INTO estoque VALUES (1, 4), (2, 6) ON CONFLICT (produto_id) DO UPDATE SET qtd = estoque.qtd + EXCLUDED.qtd;
SELECT * FROM estoque ORDER BY produto_id;`,
      { ordered: true }),
    pgsql('Crie o role `leitura` (NOLOGIN), conceda a ele `SELECT` em `pedidos` e mostre os privilégios com `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = \'leitura\'`.',
      `CREATE ROLE leitura NOLOGIN;
GRANT SELECT ON pedidos TO leitura;
SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'leitura';`),
  ],
};

const L_ORDEM = {
  id: 'db-2-2', title: 'Ordem lógica de execução',
  steps: [
    theory('Escrevemos numa ordem, o banco processa em outra', `
| ordem de escrita | ordem lógica de processamento |
|---|---|
| SELECT | 1. **FROM** e **JOIN** (monta as linhas de origem) |
| FROM / JOIN | 2. **WHERE** (filtra linhas) |
| WHERE | 3. **GROUP BY** (agrupa) |
| GROUP BY | 4. **HAVING** (filtra grupos) |
| HAVING | 5. funções de janela (\`OVER\`) |
| ORDER BY | 6. **SELECT** (calcula expressões e aliases) |
| LIMIT | 7. **DISTINCT** |
| | 8. **ORDER BY** |
| | 9. **LIMIT / OFFSET** |

Consequências que aparecem em toda entrevista:
- **Alias do SELECT não existe no WHERE**: \`SELECT valor * 2 AS dobro ... WHERE dobro > 10\` dá erro (o WHERE roda antes). No ORDER BY, funciona
- **Agregação não vai no WHERE**: \`WHERE count(*) > 1\` dá erro; use HAVING
- **Window function não vai no WHERE nem no HAVING**: para filtrar por \`row_number()\`, use uma subconsulta ou CTE
- **DISTINCT acontece depois do SELECT**: \`SELECT DISTINCT uf, cidade\` considera as duas colunas
- **LIMIT sem ORDER BY** devolve linhas quaisquer (não há ordem garantida)

O PostgreSQL ainda aceita, como extensão, alias e número da coluna no GROUP BY (\`GROUP BY 1\`), mas o padrão é repetir a expressão. O plano físico pode executar em outra ordem (o otimizador empurra filtros e reordena joins), mas o **resultado** é sempre o da ordem lógica.
`),
    exPg('Por que o alias não funciona no WHERE', `
A primeira consulta funciona; descomente a segunda e veja o erro.
`, `SELECT id, round(preco - custo, 2) AS margem
FROM produtos
ORDER BY margem DESC     -- ORDER BY roda depois do SELECT: o alias existe
LIMIT 5;
-- SELECT id, preco - custo AS margem FROM produtos WHERE margem > 1000;   -- erro: column "margem" does not exist`, `
O ORDER BY enxerga \`margem\` porque é processado depois do SELECT. No WHERE, o alias ainda não foi calculado: repita a expressão (\`WHERE preco - custo > 1000\`) ou use uma subconsulta/CTE.
`),
    order('Ordene as etapas de processamento lógico de uma consulta:', ['FROM', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT']),
    quiz('Por que `SELECT count(*) AS n FROM pedidos GROUP BY cliente_id WHERE n > 5` está errado?', ['WHERE vem antes do GROUP BY e não enxerga agregados nem aliases: use HAVING count(*) > 5', 'Falta DISTINCT', 'count(*) não aceita alias', 'Está certo'], 0),
    debugPg('Esta consulta deveria listar os produtos com margem (preço − custo) acima de 2000, mas dá erro. Corrija mantendo as colunas `id` e `margem`.',
      `SELECT id, preco - custo AS margem FROM produtos WHERE margem > 2000;`,
      `SELECT id, preco - custo AS margem FROM produtos WHERE preco - custo > 2000;`),
    pgsql('Liste os 5 clientes (`cliente_id`, `pedidos`) com mais pedidos **entregues**, desempatando pelo `cliente_id` menor.',
      `SELECT cliente_id, count(*) AS pedidos FROM pedidos WHERE status = 'entregue' GROUP BY cliente_id ORDER BY pedidos DESC, cliente_id LIMIT 5;`,
      { ordered: true }),
  ],
};

const L_JOINS = {
  id: 'db-2-3', title: 'Junções em profundidade, anti-join e LATERAL',
  steps: [
    theory('Todos os JOINs e o que fazem com quem não tem par', `
| junção | resultado |
|---|---|
| \`INNER JOIN\` | só pares que satisfazem o ON |
| \`LEFT JOIN\` | todas as linhas da esquerda; sem par, colunas da direita viram NULL |
| \`RIGHT JOIN\` | o espelho do LEFT (raramente usado: inverta as tabelas e use LEFT) |
| \`FULL OUTER JOIN\` | todas as linhas dos dois lados (reconciliação entre sistemas) |
| \`CROSS JOIN\` | todas as combinações (calendário × lojas, produtos × meses) |
| **self join** | a tabela com ela mesma, com aliases diferentes (hierarquias, comparar linhas) |

**Filtro no ON × no WHERE em LEFT JOIN**: condição sobre a tabela da direita no \`WHERE\` elimina as linhas sem par (vira INNER na prática). Para "todos os clientes e seus pedidos **de 2025**", a condição de data vai no \`ON\`.

**Multiplicação de linhas**: juntar pedidos (1) com itens (N) e com pagamentos (N) na mesma consulta multiplica itens × pagamentos e infla somas. Agregue cada lado antes (subconsulta/CTE) e depois junte.
`),
    theory('Semi-join, anti-join e a armadilha do NOT IN', `
**Semi-join** ("tem pelo menos um"): \`WHERE EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id)\`. Não duplica o cliente mesmo que ele tenha 50 pedidos (um JOIN duplicaria).

**Anti-join** ("não tem nenhum"), três formas:
~~~sql
-- 1) NOT EXISTS (recomendada: correta com NULL e bem otimizada)
SELECT c.id FROM clientes c WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id);
-- 2) LEFT JOIN ... IS NULL (equivalente)
SELECT c.id FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL;
-- 3) NOT IN (perigosa)
SELECT c.id FROM clientes c WHERE c.id NOT IN (SELECT cliente_id FROM pedidos);
~~~
Se a subconsulta do \`NOT IN\` tiver **um único NULL**, o resultado é **vazio**: \`x NOT IN (1, NULL)\` vira \`x <> 1 AND x <> NULL\`, e \`x <> NULL\` é desconhecido. Além disso, o otimizador do PostgreSQL não transforma NOT IN em anti-join eficiente. **Use NOT EXISTS.**

**LATERAL**: uma subconsulta no FROM que enxerga as colunas das tabelas à esquerda, executada por linha. Perfeita para "top N por grupo":
~~~sql
SELECT c.id, ult.*
FROM clientes c
CROSS JOIN LATERAL (
  SELECT p.id AS pedido, p.criado_em FROM pedidos p
  WHERE p.cliente_id = c.id ORDER BY p.criado_em DESC LIMIT 3
) ult;                                  -- os 3 pedidos mais recentes de cada cliente
~~~
\`LEFT JOIN LATERAL (...) ON true\` mantém quem não tem nenhum.
`),
    exPg('A armadilha do NOT IN com um NULL', `
`, `SELECT
  (SELECT count(*) FROM clientes c WHERE c.id NOT IN (SELECT cliente_id FROM pedidos)) AS not_in_sem_null,
  (SELECT count(*) FROM clientes c WHERE c.id NOT IN (SELECT cliente_id FROM pedidos UNION ALL SELECT NULL)) AS not_in_com_um_null,
  (SELECT count(*) FROM clientes c WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id)) AS not_exists;`, `
Basta um NULL na lista para o NOT IN devolver **zero** clientes, enquanto NOT EXISTS continua certo.
`),
    exPg('Top 3 por cliente com LATERAL', `
`, `SELECT c.id AS cliente, ult.pedido, ult.criado_em::date AS data
FROM clientes c
CROSS JOIN LATERAL (
  SELECT p.id AS pedido, p.criado_em FROM pedidos p
  WHERE p.cliente_id = c.id ORDER BY p.criado_em DESC LIMIT 3
) ult
WHERE c.id <= 3
ORDER BY c.id, ult.criado_em DESC;`, `
Para cada cliente, a subconsulta lateral roda com o \`c.id\` daquela linha e devolve até 3 pedidos.
`),
    quiz('Por que `NOT EXISTS` é preferível a `NOT IN (subconsulta)`?', ['NOT IN devolve vazio se a subconsulta tiver um NULL, e o otimizador trata NOT EXISTS como anti-join', 'NOT EXISTS é mais curto', 'NOT IN não existe no PostgreSQL', 'Não há diferença'], 0),
    quiz('Somar `itens.valor` e `pagamentos.valor` juntando pedidos, itens e pagamentos na mesma consulta...', ['Infla as somas: itens × pagamentos multiplicam as linhas; agregue cada lado antes', 'É o jeito certo', 'Dá erro', 'Só funciona com FULL JOIN'], 0),
    pgsql('Liste quantos clientes **ativos** nunca fizeram pedido, usando **NOT EXISTS**. Coluna `clientes_sem_pedido`.',
      `SELECT count(*) AS clientes_sem_pedido FROM clientes c WHERE c.ativo AND NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id);`),
    pgsql('Para **todos** os clientes do segmento `corporativo`, mostre `id` e `pedidos_2025` (quantidade de pedidos criados em 2025), incluindo quem tem zero. Ordene por `id`.',
      `SELECT c.id, count(p.id) AS pedidos_2025 FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01' WHERE c.segmento = 'corporativo' GROUP BY c.id ORDER BY c.id;`,
      { ordered: true, hint: 'A condição de data vai no ON do LEFT JOIN; no WHERE, ela descartaria quem tem zero.' }),
    pgsql('Usando **self join** em `funcionarios`, mostre o nome de cada coordenador (`cargo = \'Coordenador\'`) e o nome do seu gerente. Colunas `coordenador`, `gerente`.',
      `SELECT f.nome AS coordenador, g.nome AS gerente FROM funcionarios f JOIN funcionarios g ON g.id = f.gerente_id WHERE f.cargo = 'Coordenador';`),
    pgsql('Com **LATERAL**, mostre para os clientes de `id` 1 a 5 o valor do **maior pedido** de cada um (soma de quantidade × preco_unitario dos itens). Colunas `cliente_id`, `maior_pedido`; ordene por cliente.',
      `SELECT c.id AS cliente_id, m.maior_pedido FROM clientes c CROSS JOIN LATERAL (SELECT max(t.total) AS maior_pedido FROM (SELECT sum(i.quantidade * i.preco_unitario) AS total FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE p.cliente_id = c.id GROUP BY p.id) t) m WHERE c.id <= 5 ORDER BY c.id;`,
      { ordered: true }),
  ],
};

const L_AGG = {
  id: 'db-2-4', title: 'Agregações avançadas: FILTER, ROLLUP, CUBE e GROUPING SETS',
  steps: [
    theory('FILTER e funções de agregação úteis', `
**FILTER** (padrão SQL, suportado pelo PostgreSQL) aplica uma condição a uma agregação só, deixando a consulta muito mais legível que \`SUM(CASE WHEN ...)\`:
~~~sql
SELECT canal,
       count(*)                                  AS pedidos,
       count(*) FILTER (WHERE status = 'cancelado') AS cancelados,
       round(100.0 * count(*) FILTER (WHERE status = 'cancelado') / count(*), 2) AS taxa_cancel
FROM pedidos GROUP BY canal;
~~~

Agregações além de COUNT/SUM/AVG:
| função | devolve |
|---|---|
| \`string_agg(x, ', ' ORDER BY x)\` | textos concatenados |
| \`array_agg(x)\` / \`jsonb_agg(x)\` | array / JSON com os valores |
| \`bool_and\`, \`bool_or\` | todos / algum verdadeiro |
| \`percentile_cont(0.5) WITHIN GROUP (ORDER BY x)\` | mediana (interpolada) |
| \`percentile_disc(0.9) WITHIN GROUP (ORDER BY x)\` | percentil 90 (valor existente) |
| \`mode() WITHIN GROUP (ORDER BY x)\` | moda |
| \`stddev_samp\`, \`var_samp\`, \`corr(y, x)\`, \`regr_slope(y, x)\` | estatísticas |
`),
    theory('Subtotais: ROLLUP, CUBE e GROUPING SETS', `
Relatórios gerenciais pedem **subtotais e total geral** na mesma tabela. Em vez de vários UNION ALL:

| cláusula | gera os agrupamentos |
|---|---|
| \`GROUP BY ROLLUP (a, b)\` | (a, b), (a), () → hierárquico: detalhe, subtotal por a, total geral |
| \`GROUP BY CUBE (a, b)\` | (a, b), (a), (b), () → todas as combinações |
| \`GROUP BY GROUPING SETS ((a), (b), ())\` | exatamente os conjuntos listados |

Nas linhas de subtotal, as colunas "somadas" aparecem como **NULL**. Para diferenciar esse NULL de um NULL real nos dados, use \`GROUPING(col)\`: vale 1 quando a coluna foi agregada naquela linha.
~~~sql
SELECT CASE WHEN GROUPING(uf) = 1 THEN 'TOTAL' ELSE uf END AS uf,
       segmento, count(*)
FROM clientes
GROUP BY ROLLUP (uf, segmento)
ORDER BY GROUPING(uf), uf, GROUPING(segmento), segmento;
~~~
`),
    exPg('Relatório de vendas por canal com subtotais', `
`, `SELECT CASE WHEN GROUPING(canal) = 1 THEN 'TOTAL GERAL' ELSE canal END AS canal,
       CASE WHEN GROUPING(status) = 1 THEN '(todos)' ELSE status END AS status,
       count(*) AS pedidos
FROM pedidos
WHERE status IN ('entregue', 'cancelado')
GROUP BY ROLLUP (canal, status)
ORDER BY GROUPING(canal), canal, GROUPING(status), status;`, `
Para cada canal aparecem as linhas de detalhe, depois o subtotal "(todos)" do canal, e no fim o TOTAL GERAL: o ROLLUP gerou (canal, status), (canal) e ().
`),
    quiz('Qual a diferença entre ROLLUP (a, b) e CUBE (a, b)?', ['ROLLUP gera (a,b), (a), (); CUBE também gera (b)', 'São iguais', 'CUBE só funciona com números', 'ROLLUP não gera total geral'], 0),
    quiz('Para que serve GROUPING(col)?', ['Indica se a coluna foi agregada naquela linha (subtotal), distinguindo do NULL dos dados', 'Conta grupos', 'Ordena grupos', 'Remove subtotais'], 0),
    pgsql('Por `metodo` de pagamento, mostre `pagamentos` (total), `aprovados`, `recusados` e `estornados` usando **FILTER**.',
      `SELECT metodo, count(*) AS pagamentos, count(*) FILTER (WHERE status = 'aprovado') AS aprovados, count(*) FILTER (WHERE status = 'recusado') AS recusados, count(*) FILTER (WHERE status = 'estornado') AS estornados FROM pagamentos GROUP BY metodo;`),
    pgsql('Mostre a **mediana** (`percentile_cont(0.5)`) e o **percentil 90** (`percentile_disc(0.9)`) do valor dos pagamentos aprovados, por `metodo`. Colunas `metodo`, `mediana`, `p90` (mediana arredondada a 2 casas).',
      `SELECT metodo, round(percentile_cont(0.5) WITHIN GROUP (ORDER BY valor)::numeric, 2) AS mediana, percentile_disc(0.9) WITHIN GROUP (ORDER BY valor) AS p90 FROM pagamentos WHERE status = 'aprovado' GROUP BY metodo;`),
    pgsql('Conte os clientes por `uf` e `segmento` com **ROLLUP**, gerando subtotais por UF e o total geral. Colunas `uf`, `segmento`, `clientes` (deixe os NULLs dos subtotais como estão).',
      `SELECT uf, segmento, count(*) AS clientes FROM clientes GROUP BY ROLLUP (uf, segmento);`),
    pgsql('Com **GROUPING SETS**, numa consulta só, conte os pedidos por `canal` e, separadamente, por `status` (sem combinação dos dois e sem total geral). Colunas `canal`, `status`, `pedidos`.',
      `SELECT canal, status, count(*) AS pedidos FROM pedidos GROUP BY GROUPING SETS ((canal), (status));`),
  ],
};

const L_SUBQ = {
  id: 'db-2-5', title: 'Subconsultas, ANY/ALL e operadores de conjunto',
  steps: [
    theory('Onde e como usar subconsultas', `
| tipo | devolve | exemplo |
|---|---|---|
| escalar | 1 valor | \`WHERE preco > (SELECT avg(preco) FROM produtos)\` |
| de lista | 1 coluna | \`WHERE categoria_id IN (SELECT id FROM categorias WHERE pai_id = 11)\` |
| de tabela (derivada) | uma tabela | \`FROM (SELECT ...) t\` (alias obrigatório) |
| correlacionada | depende da linha de fora | \`WHERE preco > (SELECT avg(p2.preco) FROM produtos p2 WHERE p2.categoria_id = p.categoria_id)\` |

**ANY / ALL** comparam com cada elemento de uma lista ou array:
- \`x = ANY (subconsulta)\` equivale a \`IN\`
- \`x > ALL (subconsulta)\` = maior que todos (cuidado: com lista **vazia**, ALL é verdadeiro)
- \`id = ANY ('{1,2,3}'::int[])\` é o jeito idiomático de passar uma lista como parâmetro

Uma subconsulta escalar que devolve **mais de uma linha** dá erro em tempo de execução (*more than one row returned by a subquery*).

**Correlacionada × JOIN:** o otimizador do PostgreSQL transforma IN/EXISTS em joins automaticamente, mas subconsultas escalares correlacionadas no SELECT são executadas por linha. Em tabelas grandes, prefira JOIN com agregação prévia ou janela.
`),
    theory('UNION, INTERSECT, EXCEPT', `
| operador | resultado | duplicatas |
|---|---|---|
| \`UNION\` | linhas de A ou B | remove (custa ordenar/hash) |
| \`UNION ALL\` | linhas de A e B | mantém (mais rápido) |
| \`INTERSECT\` / \`INTERSECT ALL\` | linhas em A e em B | |
| \`EXCEPT\` / \`EXCEPT ALL\` | linhas de A que não estão em B | |

Regras: mesmo número de colunas, tipos compatíveis, nomes vêm da primeira consulta, \`ORDER BY\` no fim vale para o resultado combinado. Use \`UNION ALL\` sempre que duplicatas forem impossíveis ou desejadas: \`UNION\` desnecessário é um desperdício comum.

**Reconciliação** é o uso clássico: "o que está no sistema A e não no B" (\`EXCEPT\`) nos dois sentidos, ou \`FULL OUTER JOIN\` com as diferenças lado a lado.
`),
    exPg('Correlacionada: produtos mais caros que a média da sua categoria', `
`, `SELECT p.id, p.nome, p.categoria_id, p.preco,
       round((SELECT avg(p2.preco) FROM produtos p2 WHERE p2.categoria_id = p.categoria_id), 2) AS media_categoria
FROM produtos p
WHERE p.preco > 3 * (SELECT avg(p2.preco) FROM produtos p2 WHERE p2.categoria_id = p.categoria_id)
ORDER BY p.preco DESC
LIMIT 8;`, `
A subconsulta é recalculada para cada produto usando a categoria daquela linha. Funciona, mas em tabelas grandes a versão com janela (\`avg(preco) OVER (PARTITION BY categoria_id)\`, Nível 3) costuma ser mais eficiente.
`),
    quiz('`WHERE x > ALL (SELECT ... )` com a subconsulta retornando zero linhas é...', ['Verdadeiro para todo x', 'Falso para todo x', 'NULL', 'Erro'], 0),
    quiz('Quando usar UNION ALL em vez de UNION?', ['Sempre que duplicatas forem impossíveis ou desejadas: evita o custo de remover repetidas', 'Nunca', 'Só com números', 'Quando há ORDER BY'], 0),
    pgsql('Liste `id` e `preco` dos produtos cujo preço é **maior que o de todos** os produtos da categoria 112 (Periféricos), usando **ALL**.',
      `SELECT id, preco FROM produtos WHERE preco > ALL (SELECT preco FROM produtos WHERE categoria_id = 112);`),
    pgsql('Usando `= ANY` com um array literal, conte os pedidos dos canais `app` e `site` (coluna `pedidos`).',
      `SELECT count(*) AS pedidos FROM pedidos WHERE canal = ANY ('{app,site}'::text[]);`),
    pgsql('**Reconciliação**: liste os `id` de pedidos com status `entregue` que **não têm** pagamento aprovado, usando **EXCEPT**.',
      `SELECT id FROM pedidos WHERE status = 'entregue' EXCEPT SELECT pedido_id FROM pagamentos WHERE status = 'aprovado';`),
  ],
};

const L_TRATAMENTO = {
  id: 'db-2-6', title: 'NULL, CASE, datas e expressões regulares',
  steps: [
    theory('Lógica de três valores e funções de NULL', `
Toda comparação com NULL dá **UNKNOWN**, e o WHERE só mantém TRUE:

| expressão | resultado |
|---|---|
| \`NULL = NULL\` | UNKNOWN |
| \`TRUE AND UNKNOWN\` | UNKNOWN |
| \`FALSE AND UNKNOWN\` | FALSE |
| \`TRUE OR UNKNOWN\` | TRUE |
| \`NOT UNKNOWN\` | UNKNOWN |

Ferramentas:
- \`IS NULL\` / \`IS NOT NULL\`
- \`a IS DISTINCT FROM b\`: comparação que trata NULL como valor (NULL IS DISTINCT FROM NULL = false)
- \`COALESCE(a, b, c)\`: primeiro não nulo
- \`NULLIF(a, b)\`: NULL se a = b (evita divisão por zero: \`x / NULLIF(y, 0)\`)
- \`CASE WHEN ... THEN ... ELSE ... END\`: avaliado de cima para baixo; sem ELSE devolve NULL
- \`count(col)\` ignora NULL; \`avg\` ignora NULL (a média de (10, NULL, 20) é 15)
`),
    theory('Datas e intervalos no PostgreSQL', `
| função | exemplo | resultado |
|---|---|---|
| \`date_trunc('month', ts)\` | 2025-03-17 14:00 | 2025-03-01 00:00 |
| \`extract(dow FROM d)\` | dia da semana (0 = domingo) | |
| \`d + 30\` / \`ts + interval '2 hours'\` | aritmética | |
| \`d2 - d1\` (date) | número de dias (inteiro) | |
| \`age(d2, d1)\` | intervalo "simbólico" (anos, meses, dias) | |
| \`generate_series('2025-01-01'::date, '2025-12-01', '1 month')\` | uma linha por mês | |
| \`ts AT TIME ZONE 'America/Sao_Paulo'\` | converte instante para hora local | |
| \`to_char(d, 'DD/MM/YYYY')\`, \`to_date('31/12/2025', 'DD/MM/YYYY')\` | formatar / interpretar | |

**Filtrar período com faixa semiaberta** (\`>= início AND < fim\`) em vez de \`BETWEEN\` ou de \`date_trunc(col)\`: funciona com hora, não perde o último dia e permite usar índice.

**Validar antes de converter** (PostgreSQL 16+): \`pg_input_is_valid('31/02/2025', 'date')\` devolve false em vez de erro, perfeito para limpar importações.
`),
    theory('Expressões regulares', `
| operador / função | faz |
|---|---|
| \`texto ~ 'padrão'\` / \`~*\` | casa (sensível / insensível a maiúsculas) |
| \`!~\` | não casa |
| \`regexp_replace(t, padrão, troca, 'g')\` | substitui (flag g = todas) |
| \`regexp_match(t, '(\\d{5})-(\\d{3})')\` | array com os grupos capturados |
| \`regexp_matches(t, p, 'g')\` | todas as ocorrências (uma linha cada) |
| \`substring(t FROM 'padrão')\` | primeiro trecho que casa |
| \`regexp_count\`, \`regexp_like\` (PG15+) | contar / testar |

Padrões comuns: \`'^\\d{11}$'\` (11 dígitos, CPF sem máscara), \`'\\D'\` (não dígito: \`regexp_replace(cpf, '\\D', '', 'g')\`), \`'^[^@\\s]+@[^@\\s]+\\.[a-z]{2,}$'\` (email simples). Funções de texto: \`lower\`, \`upper\`, \`trim\`, \`btrim(x, 'chars')\`, \`split_part(email, '@', 2)\`, \`left\`, \`right\`, \`length\`, \`initcap\`, \`replace\`, \`format()\`.
`),
    exPg('Datas e textos', `
`, `SELECT date_trunc('month', criado_em)::date AS mes,
       count(*) AS pedidos,
       count(*) FILTER (WHERE extract(dow FROM criado_em) IN (0, 6)) AS no_fim_de_semana
FROM pedidos
WHERE criado_em >= '2025-01-01' AND criado_em < '2025-04-01'
GROUP BY 1 ORDER BY 1;

SELECT data_txt, pg_input_is_valid(data_txt, 'date') AS valida,
       regexp_replace(coalesce(valor_txt, ''), '[^0-9,]', '', 'g') AS so_numeros
FROM importacao_vendas WHERE linha IN (17, 41, 4, 3);`, `
O filtro semiaberto pega exatamente o primeiro trimestre. Na segunda consulta, \`pg_input_is_valid\` identifica datas impossíveis (31/02) ou textos como "ontem" sem quebrar a consulta.
`),
    quiz('Qual o resultado de `NULL IS DISTINCT FROM NULL`?', ['false', 'true', 'NULL', 'Erro'], 0),
    quiz('Para filtrar os pedidos de março de 2025 numa coluna timestamptz indexada, o melhor é...', ["criado_em >= '2025-03-01' AND criado_em < '2025-04-01'", "date_trunc('month', criado_em) = '2025-03-01'", "to_char(criado_em, 'YYYY-MM') = '2025-03'", "criado_em BETWEEN '2025-03-01' AND '2025-03-31'"], 0),
    pgsql('Conte as faturas por **faixa de atraso** em relação a `2025-12-31` (só as **não pagas**, `pago_em IS NULL`): `a vencer` (vencimento >= 2025-12-31), `1-30`, `31-60`, `61-90` e `90+` dias de atraso. Colunas `faixa`, `faturas`.',
      `SELECT CASE WHEN vencimento >= date '2025-12-31' THEN 'a vencer' WHEN date '2025-12-31' - vencimento <= 30 THEN '1-30' WHEN date '2025-12-31' - vencimento <= 60 THEN '31-60' WHEN date '2025-12-31' - vencimento <= 90 THEN '61-90' ELSE '90+' END AS faixa, count(*) AS faturas FROM faturas WHERE pago_em IS NULL GROUP BY 1;`,
      { hint: 'Subtrair duas datas dá o número de dias. Use CASE com as faixas em ordem crescente.' }),
    pgsql('Na `importacao_vendas`, conte quantas linhas têm `data_txt` que **não** é uma data válida (`pg_input_is_valid(data_txt, \'date\')` falso). Coluna `datas_invalidas`. Observação: o formato DD/MM/YYYY é ambíguo para o PostgreSQL, então conte só o que ele mesmo rejeita.',
      `SELECT count(*) AS datas_invalidas FROM importacao_vendas WHERE NOT pg_input_is_valid(data_txt, 'date');`),
    pgsql('Extraia o **domínio** dos emails dos clientes (`split_part`) e conte os clientes por domínio, ignorando emails nulos. Colunas `dominio`, `clientes`.',
      `SELECT split_part(email, '@', 2) AS dominio, count(*) AS clientes FROM clientes WHERE email IS NOT NULL GROUP BY 1;`),
    pgsql('Na `importacao_vendas`, normalize o status (`lower(trim(status_txt))`, e NULL vira `desconhecido` com COALESCE) e conte as linhas por status normalizado. Colunas `status`, `linhas`.',
      `SELECT coalesce(lower(trim(status_txt)), 'desconhecido') AS status, count(*) AS linhas FROM importacao_vendas GROUP BY 1;`),
  ],
};

const L_JSONB = {
  id: 'db-2-7', title: 'JSONB e arrays: dados semiestruturados',
  steps: [
    theory('JSONB: quando e como', `
\`jsonb\` guarda JSON num formato binário, indexável. Útil para atributos que variam por tipo de produto, payloads de eventos e integrações. **Não** substitui colunas para dados estruturados que você filtra, agrega e valida sempre.

| operador | exemplo | resultado |
|---|---|---|
| \`->\` | \`atributos -> 'cor'\` | valor JSON (\`"azul"\`) |
| \`->>\` | \`atributos ->> 'cor'\` | **texto** (\`azul\`) |
| \`#>>\` | \`dados #>> '{endereco,cidade}'\` | texto num caminho |
| \`@>\` | \`atributos @> '{"cor":"azul"}'\` | contém (usa índice GIN) |
| \`?\` | \`atributos ? 'garantia_meses'\` | tem a chave |
| \`||\` | \`atributos || '{"novo":true}'\` | mescla |
| \`-\` | \`atributos - 'cor'\` | remove chave |

Funções: \`jsonb_build_object\`, \`jsonb_agg\`, \`jsonb_array_elements\` (uma linha por elemento), \`jsonb_each\`, \`jsonb_set\`, \`jsonb_path_query\` (JSONPath: \`'$.tags[*] ? (@ == "promo")'\`).

Converta antes de comparar números: \`(atributos ->> 'peso_kg')::numeric > 5\`.
`),
    theory('Arrays', `
Colunas \`text[]\`, \`int[]\` etc. Bons para listas pequenas que não precisam de relacionamento (tags). Para itens com atributos e integridade, use tabela filha.

| operação | exemplo |
|---|---|
| literal | \`'{a,b,c}'::text[]\`, \`ARRAY[1, 2, 3]\` |
| acesso (começa em **1**) | \`tags[1]\` |
| contém / sobrepõe | \`tags @> ARRAY['promo']\`, \`tags && ARRAY['promo','novo']\` |
| pertence | \`'promo' = ANY (tags)\` |
| explodir | \`unnest(tags)\` (uma linha por elemento) |
| agregar | \`array_agg(x)\`, \`cardinality(arr)\` |
`),
    exPg('Consultando atributos JSONB dos produtos', `
`, `SELECT atributos ->> 'cor' AS cor,
       count(*) AS produtos,
       round(avg((atributos ->> 'peso_kg')::numeric), 2) AS peso_medio,
       count(*) FILTER (WHERE atributos @> '{"tags": ["promo"]}') AS em_promo
FROM produtos
GROUP BY 1 ORDER BY 2 DESC;

SELECT id, tag FROM produtos, jsonb_array_elements_text(atributos -> 'tags') AS tag WHERE id <= 4;`, `
\`->>\` devolve texto (por isso o cast para numeric no peso). \`@>\` testa se o documento contém o fragmento. \`jsonb_array_elements_text\` explode o array de tags em linhas.
`),
    quiz('Qual a diferença entre `->` e `->>`?', ['`->` devolve JSON; `->>` devolve texto', 'Nenhuma', '`->>` só funciona com arrays', '`->` é mais rápido sempre'], 0),
    quiz('Qual operador consulta "documentos que contêm `{"cor":"azul"}`" e pode usar índice GIN?', ['@>', '->>', '||', '#>>'], 0),
    pgsql('Conte os produtos por `garantia_meses` (atributo do JSONB `atributos`, convertido para int). Colunas `garantia_meses`, `produtos`.',
      `SELECT (atributos ->> 'garantia_meses')::int AS garantia_meses, count(*) AS produtos FROM produtos GROUP BY 1;`),
    pgsql('Liste o `id` dos produtos **ativos** cuja cor é `azul` **e** que pesam mais de 10 kg (use `@>` para a cor e `->>` com cast para o peso).',
      `SELECT id FROM produtos WHERE ativo AND atributos @> '{"cor": "azul"}' AND (atributos ->> 'peso_kg')::numeric > 10;`),
    pgsql('Na tabela `eventos`, conte as visitas por `dispositivo` (chave do JSONB `dados`). Colunas `dispositivo`, `visitas`.',
      `SELECT dados ->> 'dispositivo' AS dispositivo, count(*) AS visitas FROM eventos WHERE tipo = 'visita' GROUP BY 1;`),
  ],
};

const L_PROJETO2 = {
  id: 'db-2-8', title: 'Projeto: saneamento de dados e relatórios gerenciais',
  steps: [
    theory('O desafio do nível', `
A tabela \`importacao_vendas\` veio de um sistema legado: 20 mil linhas, tudo como texto, com:
- **duplicatas** de \`pedido_ext\`
- **emails** com espaços e maiúsculas, e nulos
- **datas** em dois formatos (\`YYYY-MM-DD\` e \`DD/MM/YYYY\`), além de "ontem" e "31/02/2025"
- **valores** com \`R$\`, vírgula decimal e nulos
- **status** com grafias diferentes

O roteiro profissional:
1. **Perfilar** (quantos nulos, formatos, duplicatas) antes de mexer
2. **Padronizar** numa tabela de *staging* com tipos corretos, registrando as linhas rejeitadas e o motivo (nunca descartar em silêncio)
3. **Deduplicar** com regra explícita (manter a primeira linha de cada pedido)
4. **Relatórios** sobre os dados limpos e sobre a base principal

Técnicas: \`CASE\` + regex para escolher o formato da data, \`to_date\`, \`pg_input_is_valid\`, \`regexp_replace\`, \`DISTINCT ON\` (PostgreSQL: a primeira linha de cada grupo pela ordem do ORDER BY).

O laboratório local (\`labs/postgres\`) gera a mesma base com **2 milhões** de linhas para você medir o impacto das consultas.
`),
    theory('Os relatórios gerenciais', `
| relatório | ideia |
|---|---|
| **Ticket médio** | receita ÷ número de pedidos (não a média de itens) |
| **Curva ABC** | produtos ordenados por receita; acumulado ≤ 80% = A, ≤ 95% = B, resto = C (usa janela de soma acumulada, prévia do Nível 3) |
| **Inadimplência por faixa** | faturas em aberto por dias de atraso |
| **Taxa de cancelamento** | cancelados ÷ total, por canal e mês |
| **Recorrência** | clientes com 2+ pedidos ÷ clientes que compraram |
| **Receita por segmento e UF** | com subtotais (ROLLUP) |

Regra de ouro: deixe claro o **critério** (receita bruta ou líquida de desconto? pedidos cancelados entram?) e calcule taxas a partir das contagens, nunca como média de taxas.
`),
    exPg('Staging com tipos corretos e motivo de rejeição', `
`, `WITH limpa AS (
  SELECT linha, pedido_ext,
         nullif(lower(trim(email)), '') AS email,
         CASE
           WHEN data_txt ~ '^\\d{4}-\\d{2}-\\d{2}$' AND pg_input_is_valid(data_txt, 'date') THEN data_txt::date
           WHEN data_txt ~ '^\\d{2}/\\d{2}/\\d{4}$'
                AND pg_input_is_valid(substr(data_txt, 7, 4) || '-' || substr(data_txt, 4, 2) || '-' || substr(data_txt, 1, 2), 'date')
             THEN (substr(data_txt, 7, 4) || '-' || substr(data_txt, 4, 2) || '-' || substr(data_txt, 1, 2))::date
         END AS data,
         nullif(replace(regexp_replace(coalesce(valor_txt, ''), '[^0-9,.]', '', 'g'), ',', '.'), '')::numeric(12,2) AS valor,
         lower(trim(status_txt)) AS status
  FROM importacao_vendas
)
SELECT count(*) AS linhas,
       count(*) FILTER (WHERE data IS NULL) AS sem_data_valida,
       count(*) FILTER (WHERE valor IS NULL) AS sem_valor,
       count(*) FILTER (WHERE email IS NULL) AS sem_email,
       count(*) - count(DISTINCT pedido_ext) AS duplicatas
FROM limpa;`, `
A data "31/02/2025" passa no padrão DD/MM/YYYY, mas não existe: remontá-la como \`2025-02-31\` e testar com \`pg_input_is_valid\` a rejeita sem quebrar a consulta (\`to_date\` daria erro). O perfil mostra quanto de cada problema existe antes de decidir o que fazer.
`),
    pgsql('**Relatório 1 — ticket médio por canal** (pedidos não cancelados nem devolvidos): receita = soma de quantidade × preco_unitario × (1 − desconto/100). Colunas `canal`, `pedidos`, `receita`, `ticket_medio` (2 casas).',
      `SELECT p.canal, count(DISTINCT p.id) AS pedidos, round(sum(i.quantidade * i.preco_unitario * (1 - i.desconto / 100)), 2) AS receita, round(sum(i.quantidade * i.preco_unitario * (1 - i.desconto / 100)) / count(DISTINCT p.id), 2) AS ticket_medio FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE p.status NOT IN ('cancelado', 'devolvido') GROUP BY p.canal;`),
    pgsql('**Relatório 2 — taxa de cancelamento por mês de 2025** (`date_trunc` no criado_em): colunas `mes` (date), `pedidos`, `cancelados`, `taxa` (% com 2 casas). Ordene por mês.',
      `SELECT date_trunc('month', criado_em)::date AS mes, count(*) AS pedidos, count(*) FILTER (WHERE status = 'cancelado') AS cancelados, round(100.0 * count(*) FILTER (WHERE status = 'cancelado') / count(*), 2) AS taxa FROM pedidos WHERE criado_em >= '2025-01-01' AND criado_em < '2026-01-01' GROUP BY 1 ORDER BY 1;`,
      { ordered: true }),
    pgsql('**Relatório 3 — curva ABC**: receita por produto (pedidos entregues), percentual acumulado da receita do maior para o menor e a classe (A até 80%, B até 95%, C acima). Mostre só a contagem de produtos por classe: colunas `classe`, `produtos`. Dica: `sum(receita) OVER (ORDER BY receita DESC)` dá o acumulado.',
      `WITH r AS (SELECT i.produto_id, sum(i.quantidade * i.preco_unitario) AS receita FROM itens_pedido i JOIN pedidos p ON p.id = i.pedido_id WHERE p.status = 'entregue' GROUP BY i.produto_id), a AS (SELECT produto_id, 100.0 * sum(receita) OVER (ORDER BY receita DESC, produto_id) / sum(receita) OVER () AS acumulado FROM r) SELECT CASE WHEN acumulado <= 80 THEN 'A' WHEN acumulado <= 95 THEN 'B' ELSE 'C' END AS classe, count(*) AS produtos FROM a GROUP BY 1;`),
    pgsql('**Relatório 4 — recorrência**: percentual de clientes que compraram (pedido entregue) e têm **2 ou mais** pedidos entregues. Coluna `recorrencia_pct` (2 casas).',
      `SELECT round(100.0 * count(*) FILTER (WHERE n >= 2) / count(*), 2) AS recorrencia_pct FROM (SELECT cliente_id, count(*) AS n FROM pedidos WHERE status = 'entregue' GROUP BY cliente_id) t;`),
    pgsql('**Saneamento — deduplicação**: na `importacao_vendas`, mantenha só a **primeira linha** (menor `linha`) de cada `pedido_ext` usando **DISTINCT ON** e conte quantas sobram. Coluna `pedidos_unicos`.',
      `SELECT count(*) AS pedidos_unicos FROM (SELECT DISTINCT ON (pedido_ext) linha FROM importacao_vendas ORDER BY pedido_ext, linha) t;`,
      { hint: '`SELECT DISTINCT ON (pedido_ext) ... ORDER BY pedido_ext, linha` fica com a primeira linha de cada pedido.' }),
    pgsql('**Saneamento — valores**: converta `valor_txt` para numeric (remova tudo que não for dígito ou vírgula/ponto com `regexp_replace`, troque vírgula por ponto) e mostre a **soma** dos valores válidos, numa coluna `total` (2 casas).',
      `SELECT round(sum(nullif(replace(regexp_replace(coalesce(valor_txt, ''), '[^0-9,.]', '', 'g'), ',', '.'), '')::numeric), 2) AS total FROM importacao_vendas;`),
  ],
};

export const DB_N2 = {
  id: 'db-u2', level: 2, title: 'SQL profissional e lógica de negócio',
  description: 'DML moderno, ordem de execução, junções, agregações avançadas, tratamento de dados e JSONB. Entregável: saneamento e relatórios gerenciais',
  lessons: [L_SUBLING, L_ORDEM, L_JOINS, L_AGG, L_SUBQ, L_TRATAMENTO, L_JSONB, L_PROJETO2],
};
