// Trilha Bancos de Dados (PostgreSQL) — Nível 3: SQL avançado, programação no banco e concorrência
import { theory, quiz, order, fill, pgsql, debugPg, exPg } from '../helpers.js';

const L_CTE = {
  id: 'db-3-1', title: 'CTEs: organizar, materializar e modificar',
  steps: [
    theory('WITH: consultas em etapas com nome', `
Uma **CTE** (*Common Table Expression*) dá nome a um resultado intermediário que a consulta principal usa como tabela:

~~~sql
WITH receita_pedido AS (
  SELECT pedido_id, sum(quantidade * preco_unitario) AS valor
  FROM itens_pedido GROUP BY pedido_id
),
por_cliente AS (
  SELECT p.cliente_id, count(*) AS pedidos, sum(r.valor) AS receita
  FROM pedidos p JOIN receita_pedido r ON r.pedido_id = p.id
  GROUP BY p.cliente_id
)
SELECT * FROM por_cliente ORDER BY receita DESC LIMIT 10;
~~~

Vantagens: lê-se de cima para baixo como um roteiro; cada etapa pode ser testada sozinha; uma CTE pode ser usada várias vezes.

**MATERIALIZED × NOT MATERIALIZED** (PostgreSQL 12+): por padrão, uma CTE usada **uma vez** e sem efeitos colaterais é "embutida" na consulta principal (o otimizador pode empurrar filtros para dentro dela). Usada **duas ou mais vezes**, ela é calculada uma vez e guardada. Você pode forçar:
- \`WITH x AS MATERIALIZED (...)\`: calcula uma vez (cerca de otimização, útil para isolar uma parte cara)
- \`WITH x AS NOT MATERIALIZED (...)\`: permite embutir mesmo se usada várias vezes

Antes do PostgreSQL 12, toda CTE era materializada, o que tornava CTEs uma "barreira de otimização": por isso há conselhos antigos dizendo que CTE é lenta.
`),
    theory('CTEs que modificam dados', `
No PostgreSQL, uma CTE pode conter \`INSERT\`, \`UPDATE\` ou \`DELETE\` com \`RETURNING\`, e a consulta principal usa as linhas devolvidas. Tudo acontece numa única instrução (atômica):

~~~sql
-- arquivar pedidos cancelados antigos: apaga e grava no histórico numa operação só
WITH removidos AS (
  DELETE FROM pedidos
  WHERE status = 'cancelado' AND criado_em < '2024-03-01'
  RETURNING *
)
INSERT INTO pedidos_arquivo SELECT * FROM removidos;
~~~

Todas as sub-instruções enxergam o **mesmo snapshot** (o estado antes da instrução): uma CTE não vê as mudanças feitas por outra CTE da mesma consulta, só pelas linhas de RETURNING.
`),
    exPg('Pipeline em CTEs: dos itens ao ranking de clientes', `
`, `WITH receita_pedido AS (
  SELECT pedido_id, sum(quantidade * preco_unitario * (1 - desconto / 100)) AS valor
  FROM itens_pedido GROUP BY pedido_id
),
por_cliente AS (
  SELECT p.cliente_id, count(*) AS pedidos, round(sum(r.valor), 2) AS receita
  FROM pedidos p JOIN receita_pedido r ON r.pedido_id = p.id
  WHERE p.status = 'entregue'
  GROUP BY p.cliente_id
)
SELECT c.nome, c.segmento, pc.pedidos, pc.receita
FROM por_cliente pc JOIN clientes c ON c.id = pc.cliente_id
ORDER BY pc.receita DESC
LIMIT 5;`, `
Cada etapa tem um nome e uma responsabilidade. Para depurar, troque o SELECT final por \`SELECT * FROM receita_pedido LIMIT 5\`.
`),
    exPg('CTE que apaga e arquiva numa instrução', `
`, `CREATE TABLE eventos_arquivo (LIKE eventos);
WITH removidos AS (
  DELETE FROM eventos WHERE ocorrido_em < '2025-01-15' RETURNING *
)
INSERT INTO eventos_arquivo SELECT * FROM removidos;
SELECT (SELECT count(*) FROM eventos_arquivo) AS arquivados,
       (SELECT count(*) FROM eventos WHERE ocorrido_em < '2025-01-15') AS restantes;`, `
Os eventos antigos saíram da tabela principal e entraram no arquivo numa operação atômica.
`),
    quiz('No PostgreSQL 12+, uma CTE usada uma única vez e sem efeitos colaterais normalmente é...', ['Embutida na consulta principal (o otimizador pode empurrar filtros para dentro)', 'Sempre materializada', 'Executada duas vezes', 'Ignorada'], 0),
    quiz('Duas CTEs de modificação na mesma instrução enxergam as mudanças uma da outra?', ['Não: todas usam o mesmo snapshot; só os RETURNING passam dados adiante', 'Sim, na ordem em que foram escritas', 'Só se forem MATERIALIZED', 'Dá erro'], 0),
    pgsql('Com duas CTEs (`receita_pedido` e `por_uf`), calcule a receita de pedidos entregues por `uf` do cliente. Colunas `uf`, `receita` (2 casas). Receita = quantidade × preco_unitario.',
      `WITH receita_pedido AS (SELECT pedido_id, sum(quantidade * preco_unitario) AS valor FROM itens_pedido GROUP BY pedido_id), por_uf AS (SELECT c.uf, sum(r.valor) AS receita FROM pedidos p JOIN receita_pedido r ON r.pedido_id = p.id JOIN clientes c ON c.id = p.cliente_id WHERE p.status = 'entregue' GROUP BY c.uf) SELECT uf, round(receita, 2) AS receita FROM por_uf;`),
    pgsql('Numa única instrução com CTE de modificação, **desative** os clientes (`ativo = false`) do segmento `varejo` sem nenhum pedido e devolva quantos foram desativados (coluna `desativados`).',
      `WITH alterados AS (UPDATE clientes c SET ativo = false WHERE c.segmento = 'varejo' AND NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id) RETURNING c.id) SELECT count(*) AS desativados FROM alterados;`),
  ],
};

const L_RECURSIVA = {
  id: 'db-3-2', title: 'CTEs recursivas: hierarquias e grafos',
  steps: [
    theory('Como a recursão funciona', `
~~~sql
WITH RECURSIVE arvore AS (
  -- 1) âncora: o ponto de partida
  SELECT codigo, nome, pai, 1 AS nivel, codigo AS caminho
  FROM plano_contas WHERE pai IS NULL
  UNION ALL
  -- 2) passo recursivo: junta a tabela com as linhas encontradas na rodada anterior
  SELECT f.codigo, f.nome, f.pai, a.nivel + 1, a.caminho || ' > ' || f.codigo
  FROM plano_contas f JOIN arvore a ON f.pai = a.codigo
)
SELECT * FROM arvore ORDER BY caminho;
~~~

O PostgreSQL executa a âncora, depois repete o passo recursivo **só sobre as linhas novas** da rodada anterior, até uma rodada não produzir nada.

Aplicações reais: **plano de contas contábil** (somar lançamentos nas contas-pai), **árvore de categorias** (todos os produtos de "Eletrônicos" e subcategorias), **organograma** (todos os subordinados de um diretor), lista de materiais (BOM), rotas em grafos, e **gerar séries** quando não há \`generate_series\`.

**Cuidados:**
- garanta que a recursão **termina** (hierarquia sem ciclos, ou um limite \`WHERE nivel < 20\`)
- **ciclos**: o PostgreSQL 14+ tem \`CYCLE codigo SET em_ciclo USING caminho\`, que marca e interrompe ciclos; antes, usava-se um array de visitados (\`WHERE NOT f.id = ANY(visitados)\`)
- **ordem de busca**: \`SEARCH DEPTH FIRST BY codigo SET ordem\` (ou BREADTH FIRST) produz uma coluna para ordenar como árvore
- use \`UNION ALL\`; \`UNION\` remove duplicatas a cada rodada (útil só para grafos com caminhos repetidos)
`),
    exPg('Organograma: todos os subordinados do Diretor de Dados', `
`, `WITH RECURSIVE equipe AS (
  SELECT id, nome, cargo, gerente_id, 0 AS nivel
  FROM funcionarios WHERE id = 2
  UNION ALL
  SELECT f.id, f.nome, f.cargo, f.gerente_id, e.nivel + 1
  FROM funcionarios f JOIN equipe e ON f.gerente_id = e.id
)
SELECT nivel, cargo, count(*) AS pessoas
FROM equipe GROUP BY nivel, cargo ORDER BY nivel, cargo;`, `
Nível 0 é o diretor, nível 1 seus coordenadores, nível 2 os analistas de cada coordenador. A mesma consulta serve para qualquer profundidade.
`),
    exPg('Árvore de categorias com SEARCH DEPTH FIRST', `
`, `WITH RECURSIVE arvore AS (
  SELECT id, nome, pai_id, 1 AS nivel FROM categorias WHERE pai_id IS NULL
  UNION ALL
  SELECT c.id, c.nome, c.pai_id, a.nivel + 1 FROM categorias c JOIN arvore a ON c.pai_id = a.id
) SEARCH DEPTH FIRST BY id SET ordem
SELECT repeat('    ', nivel - 1) || nome AS categoria, nivel
FROM arvore ORDER BY ordem
LIMIT 15;`, `
\`SEARCH DEPTH FIRST\` cria a coluna \`ordem\`, que lista cada pai seguido dos seus filhos, como num explorador de arquivos.
`),
    quiz('Numa CTE recursiva, o passo recursivo é aplicado sobre...', ['As linhas produzidas na rodada anterior', 'A tabela inteira a cada rodada', 'Apenas a âncora', 'Todas as linhas já produzidas'], 0),
    quiz('Como evitar loop infinito numa hierarquia que pode ter ciclos (A gerencia B, B gerencia A)?', ['Usar CYCLE (PG14+) ou um array de visitados, e/ou limitar a profundidade', 'Usar UNION ALL', 'Não há como', 'Usar ORDER BY'], 0),
    pgsql('Liste todas as subcategorias (em qualquer nível) de **Eletrônicos** (id 1), sem incluir a própria Eletrônicos. Colunas `id`, `nome`.',
      `WITH RECURSIVE sub AS (SELECT id, nome FROM categorias WHERE pai_id = 1 UNION ALL SELECT c.id, c.nome FROM categorias c JOIN sub s ON c.pai_id = s.id) SELECT id, nome FROM sub;`),
    pgsql('Conte quantos **produtos** pertencem à árvore de **Eletrônicos** (categoria 1 e todas as descendentes). Coluna `produtos`.',
      `WITH RECURSIVE arvore AS (SELECT id FROM categorias WHERE id = 1 UNION ALL SELECT c.id FROM categorias c JOIN arvore a ON c.pai_id = a.id) SELECT count(*) AS produtos FROM produtos WHERE categoria_id IN (SELECT id FROM arvore);`),
    pgsql('Monte o plano de contas com o **caminho** completo (ex.: `3 > 3.1 > 3.1.1`) e o nível de cada conta. Colunas `codigo`, `nivel`, `caminho`; ordene por `caminho`.',
      `WITH RECURSIVE arvore AS (SELECT codigo, 1 AS nivel, codigo AS caminho FROM plano_contas WHERE pai IS NULL UNION ALL SELECT f.codigo, a.nivel + 1, a.caminho || ' > ' || f.codigo FROM plano_contas f JOIN arvore a ON f.pai = a.codigo) SELECT codigo, nivel, caminho FROM arvore ORDER BY caminho;`,
      { ordered: true }),
  ],
};

const L_WIN1 = {
  id: 'db-3-3', title: 'Window functions: ranking e navegação',
  steps: [
    theory('OVER: calcular sem colapsar linhas', `
\`função() OVER (PARTITION BY ... ORDER BY ... frame)\`
- **PARTITION BY**: divide as linhas em grupos independentes (como GROUP BY, mas sem colapsar)
- **ORDER BY**: ordem dentro da partição (obrigatória para ranking e navegação)
- **frame**: quais linhas da partição entram no cálculo (próxima lição)

**Ranqueamento:**
| função | empates | exemplo com valores 10, 8, 8, 5 |
|---|---|---|
| \`row_number()\` | numera sem repetir | 1, 2, 3, 4 |
| \`rank()\` | repete e pula | 1, 2, 2, 4 |
| \`dense_rank()\` | repete sem pular | 1, 2, 2, 3 |
| \`ntile(n)\` | divide em n grupos de tamanho parecido | quartis, decis |
| \`percent_rank()\`, \`cume_dist()\` | posição relativa (0 a 1) | |

**Navegação:**
| função | devolve |
|---|---|
| \`lag(x, n, padrão)\` | valor n linhas **antes** |
| \`lead(x, n, padrão)\` | valor n linhas **depois** |
| \`first_value(x)\`, \`last_value(x)\`, \`nth_value(x, n)\` | valor em uma posição do frame |

Janelas são calculadas **depois** do WHERE/GROUP BY/HAVING: para filtrar por elas, use subconsulta ou CTE. A cláusula \`WINDOW w AS (...)\` evita repetir a mesma definição.
`),
    theory('Padrões que caem em entrevista', `
1. **Top N por grupo**: \`row_number() OVER (PARTITION BY grupo ORDER BY valor DESC)\` numa CTE, filtrar \`rn <= N\` fora
2. **Deduplicar mantendo o mais recente**: \`row_number() OVER (PARTITION BY chave ORDER BY atualizado_em DESC)\` e manter \`rn = 1\`
3. **Variação contra o período anterior**: \`valor - lag(valor) OVER (ORDER BY mes)\`
4. **Tempo entre eventos do mesmo usuário**: \`ocorrido_em - lag(ocorrido_em) OVER (PARTITION BY usuario ORDER BY ocorrido_em)\`
5. **Primeira compra / última compra**: \`first_value(...) OVER (PARTITION BY cliente ORDER BY data)\`
6. **N-ésimo maior valor**: \`dense_rank()\` = N
7. **Participação no total**: \`valor / sum(valor) OVER ()\`

\`last_value\` com ORDER BY tem uma pegadinha: o frame padrão termina na **linha atual**. Use \`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\`.
`),
    exPg('Os três rankings e a navegação lado a lado', `
`, `SELECT id, nome, salario,
       row_number() OVER w AS rn,
       rank()       OVER w AS rk,
       dense_rank() OVER w AS drk,
       lag(salario) OVER w AS salario_acima,
       salario - lead(salario) OVER w AS diferenca_para_o_proximo
FROM funcionarios
WHERE departamento = 'Diretoria' OR cargo LIKE 'Diretor%' OR cargo = 'Coordenador'
WINDOW w AS (ORDER BY salario DESC)
ORDER BY salario DESC;`, `
Os coordenadores têm o mesmo salário: \`rank\` repete e pula, \`dense_rank\` repete sem pular, \`row_number\` numera em ordem arbitrária. \`lag\` e \`lead\` olham a linha anterior e a seguinte na mesma ordenação.
`),
    quiz('Para listar os 3 produtos mais caros de **cada** categoria, a abordagem padrão é...', ['row_number() OVER (PARTITION BY categoria ORDER BY preco DESC) numa CTE e filtrar rn <= 3', 'ORDER BY preco DESC LIMIT 3', 'GROUP BY categoria com max(preco)', 'Uma subconsulta com LIMIT 3 no WHERE'], 0),
    quiz('Valores 100, 90, 90, 80: qual o dense_rank do 80?', ['3', '4', '2', '1'], 0),
    pgsql('Para cada categoria, liste os **2 produtos mais caros** (empate: menor id primeiro). Colunas `categoria_id`, `id`, `preco`.',
      `WITH r AS (SELECT categoria_id, id, preco, row_number() OVER (PARTITION BY categoria_id ORDER BY preco DESC, id) AS rn FROM produtos) SELECT categoria_id, id, preco FROM r WHERE rn <= 2;`),
    pgsql('Para o cliente 1, mostre cada pedido (`id`, `criado_em`) e os **dias desde o pedido anterior** do mesmo cliente (coluna `dias_desde_anterior`, inteiro; NULL no primeiro). Ordene por data.',
      `SELECT id, criado_em, extract(day FROM criado_em - lag(criado_em) OVER (ORDER BY criado_em))::int AS dias_desde_anterior FROM pedidos WHERE cliente_id = 1 ORDER BY criado_em;`,
      { ordered: true }),
    pgsql('Encontre o **terceiro maior salário distinto** da empresa usando `dense_rank`. Coluna `salario`.',
      `SELECT DISTINCT salario FROM (SELECT salario, dense_rank() OVER (ORDER BY salario DESC) AS dr FROM funcionarios) t WHERE dr = 3;`),
    pgsql('Para cada cliente com pedidos, mostre `cliente_id`, a data do **primeiro** pedido (`primeiro`) e a do **último** (`ultimo`) usando `first_value` e `last_value` com o frame completo. Mostre só os clientes 1 a 5 (uma linha por cliente).',
      `SELECT DISTINCT cliente_id, first_value(criado_em) OVER w AS primeiro, last_value(criado_em) OVER w AS ultimo FROM pedidos WHERE cliente_id <= 5 WINDOW w AS (PARTITION BY cliente_id ORDER BY criado_em ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING);`),
  ],
};

const L_WIN2 = {
  id: 'db-3-4', title: 'Molduras, médias móveis, saldos e análise de coortes',
  steps: [
    theory('ROWS, RANGE e GROUPS', `
O **frame** define o pedaço da partição que entra no cálculo para cada linha:

~~~sql
sum(valor) OVER (ORDER BY dia ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)   -- soma móvel de 7 linhas
~~~

| modo | conta | uso |
|---|---|---|
| \`ROWS\` | linhas físicas | "as últimas 7 linhas" |
| \`RANGE\` | valores do ORDER BY | "os últimos 7 **dias**", mesmo com dias faltando: \`RANGE BETWEEN interval '6 days' PRECEDING AND CURRENT ROW\` |
| \`GROUPS\` | grupos de valores iguais (pares de empate) | "os 3 últimos valores distintos" |

Limites: \`UNBOUNDED PRECEDING\`, \`n PRECEDING\`, \`CURRENT ROW\`, \`n FOLLOWING\`, \`UNBOUNDED FOLLOWING\`. Exclusões: \`EXCLUDE CURRENT ROW\`.

**Frame padrão**: com ORDER BY é \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, o que gera o **acumulado**, e linhas com o mesmo valor de ordenação (empates) entram juntas. Para um saldo linha a linha, use ROWS ou desempate a ordenação.

**ROWS × RANGE com buracos**: se não houve venda num dia, "7 linhas" pode cobrir 9 dias. Para janelas de calendário, use RANGE com interval ou complete o calendário com \`generate_series\` antes.
`),
    theory('Análise de coortes (retenção)', `
Uma **coorte** é o grupo de clientes que **começou no mesmo período**. A tabela de retenção mostra, para cada coorte, quantos continuam ativos N períodos depois:

1. **Primeira atividade de cada cliente**: \`min(data) OVER (PARTITION BY cliente)\` ou um GROUP BY
2. **Idade de cada atividade**: meses entre a coorte e a atividade
3. **Contar clientes distintos** por (coorte, idade)
4. **Dividir pelo tamanho da coorte** (idade 0)

~~~sql
WITH atividade AS (
  SELECT cliente_id, date_trunc('month', ocorrido_em)::date AS mes FROM eventos GROUP BY 1, 2
),
coorte AS (
  SELECT cliente_id, mes, min(mes) OVER (PARTITION BY cliente_id) AS coorte FROM atividade
)
SELECT coorte,
       (extract(year FROM age(mes, coorte)) * 12 + extract(month FROM age(mes, coorte)))::int AS idade,
       count(DISTINCT cliente_id) AS clientes
FROM coorte GROUP BY 1, 2;
~~~

Para a porcentagem: \`clientes / first_value(clientes) OVER (PARTITION BY coorte ORDER BY idade)\`.
`),
    exPg('Receita diária, média móvel de 7 dias e acumulado do mês', `
`, `WITH dia AS (
  SELECT p.criado_em::date AS dia, sum(i.quantidade * i.preco_unitario) AS receita
  FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id
  WHERE p.status = 'entregue' AND p.criado_em >= '2025-03-01' AND p.criado_em < '2025-04-01'
  GROUP BY 1
)
SELECT dia, round(receita, 0) AS receita,
       round(avg(receita) OVER (ORDER BY dia RANGE BETWEEN interval '6 days' PRECEDING AND CURRENT ROW), 0) AS media_7d,
       round(sum(receita) OVER (PARTITION BY date_trunc('month', dia) ORDER BY dia), 0) AS acumulado_mes
FROM dia ORDER BY dia LIMIT 10;`, `
A média móvel usa RANGE com \`interval\`, então considera 7 dias de calendário. O acumulado reinicia a cada mês graças ao PARTITION BY.
`),
    quiz('Para uma média móvel de "7 dias corridos" numa série que pode ter dias sem venda, use...', ["RANGE BETWEEN interval '6 days' PRECEDING AND CURRENT ROW", 'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW', 'GROUPS BETWEEN 6 PRECEDING AND CURRENT ROW', 'Não há como'], 0),
    quiz('Qual é o frame padrão quando a janela tem ORDER BY?', ['RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (acumulado, empates juntos)', 'A partição inteira', 'Só a linha atual', 'ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING'], 0),
    pgsql('Mostre o **saldo acumulado** da conta 1: para cada lançamento (`id`, `criado_em`, `valor`), a coluna `saldo_movimentos` = soma dos valores até aquele lançamento (ordene por criado_em, id; frame ROWS). Ordene a saída igual.',
      `SELECT id, criado_em, valor, sum(valor) OVER (ORDER BY criado_em, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS saldo_movimentos FROM lancamentos WHERE conta_id = 1 ORDER BY criado_em, id;`,
      { ordered: true }),
    pgsql('Calcule a receita mensal de 2025 (pedidos entregues, quantidade × preço) e a **média móvel de 3 meses** (ROWS, 2 anteriores e o atual). Colunas `mes` (date), `receita`, `media_3m` (ambas com 2 casas). Ordene por mês.',
      `WITH m AS (SELECT date_trunc('month', p.criado_em)::date AS mes, sum(i.quantidade * i.preco_unitario) AS receita FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE p.status = 'entregue' AND p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01' GROUP BY 1) SELECT mes, round(receita, 2) AS receita, round(avg(receita) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_3m FROM m ORDER BY mes;`,
      { ordered: true }),
    pgsql('**Coortes**: usando `eventos`, calcule o tamanho de cada coorte mensal (clientes cuja primeira atividade foi naquele mês). Colunas `coorte` (date), `clientes`.',
      `WITH primeira AS (SELECT cliente_id, date_trunc('month', min(ocorrido_em))::date AS coorte FROM eventos GROUP BY cliente_id) SELECT coorte, count(*) AS clientes FROM primeira GROUP BY coorte;`),
    pgsql('**Retenção**: para a coorte de **janeiro de 2025**, conte quantos clientes distintos tiveram atividade em cada mês seguinte (idade em meses 0, 1, 2...). Colunas `idade`, `clientes`. Ordene por idade.',
      `WITH atividade AS (SELECT cliente_id, date_trunc('month', ocorrido_em)::date AS mes FROM eventos GROUP BY 1, 2), coorte AS (SELECT cliente_id, min(mes) AS coorte FROM atividade GROUP BY cliente_id) SELECT (extract(year FROM age(a.mes, c.coorte)) * 12 + extract(month FROM age(a.mes, c.coorte)))::int AS idade, count(DISTINCT a.cliente_id) AS clientes FROM atividade a JOIN coorte c ON c.cliente_id = a.cliente_id WHERE c.coorte = '2025-01-01' GROUP BY 1 ORDER BY 1;`,
      { ordered: true }),
  ],
};

const L_PROG = {
  id: 'db-3-5', title: 'Views, materialized views, funções, procedures e triggers',
  steps: [
    theory('Views e materialized views', `
| objeto | guarda dados? | quando usar |
|---|---|---|
| **VIEW** | não: executa a consulta a cada uso | esconder complexidade, padronizar regras ("pedido válido"), controlar acesso por colunas |
| **MATERIALIZED VIEW** | sim: guarda o resultado | consultas caras lidas muitas vezes (dashboards), aceitando dados um pouco desatualizados |

~~~sql
CREATE VIEW vw_pedidos_entregues AS
SELECT * FROM pedidos WHERE status = 'entregue';     -- view comum: só a consulta é guardada

CREATE MATERIALIZED VIEW mv_receita_mensal AS
SELECT date_trunc('month', p.criado_em)::date AS mes, sum(i.quantidade * i.preco_unitario) AS receita
FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id
WHERE p.status = 'entregue' GROUP BY 1;

CREATE UNIQUE INDEX ON mv_receita_mensal (mes);           -- necessário para o refresh concorrente
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_receita_mensal;  -- recalcula sem bloquear leituras
~~~
Sem \`CONCURRENTLY\`, o REFRESH bloqueia quem lê a view até terminar. Com ele, o PostgreSQL calcula a nova versão ao lado e aplica as diferenças (mais lento, mas sem bloquear leitores). Agende o refresh (cron, pg_cron, orquestrador).

Uma view simples (uma tabela, sem agregação) é **atualizável**: INSERT/UPDATE nela vão para a tabela. \`WITH CHECK OPTION\` impede gravar linhas que a view não mostraria.
`),
    theory('Funções, procedures e triggers', `
**Função** (\`CREATE FUNCTION\`): recebe parâmetros e devolve valor ou tabela; roda dentro da transação de quem chama.
~~~sql
CREATE FUNCTION margem(p_preco numeric, p_custo numeric) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$ SELECT round((p_preco - p_custo) / p_preco * 100, 2) $$;
~~~
Volatilidade: \`IMMUTABLE\` (mesma entrada, mesma saída: pode ir em índice), \`STABLE\` (não muda dentro de uma consulta, ex.: lê tabelas), \`VOLATILE\` (padrão; ex.: \`random()\`, grava dados).

**PL/pgSQL**: linguagem procedural (variáveis, IF, LOOP, exceções):
~~~sql
CREATE FUNCTION saldo_conta(p_id int) RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE v numeric;
BEGIN
  SELECT saldo INTO v FROM contas WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'conta % não existe', p_id; END IF;
  RETURN v;
END $$;
~~~

**Procedure** (\`CREATE PROCEDURE\`, chamada com \`CALL\`): pode fazer \`COMMIT\`/\`ROLLBACK\` no meio (útil para processar lotes grandes em várias transações).

**Trigger**: função executada automaticamente em INSERT/UPDATE/DELETE (\`BEFORE\` ou \`AFTER\`, \`FOR EACH ROW\` ou \`FOR EACH STATEMENT\`). Dentro dela, \`NEW\` e \`OLD\` são a linha nova e a antiga, e \`TG_OP\` diz a operação. Usos legítimos: **auditoria**, \`atualizado_em\` automático, manter tabelas de resumo, validações entre linhas.

**Quando evitar lógica no banco:** regras de negócio que mudam toda semana, que precisam de testes unitários rápidos e de deploy junto com a aplicação, ou que chamam serviços externos, ficam melhor na aplicação. Triggers "escondidos" surpreendem quem lê o código e dificultam depurar desempenho. No banco, fique com o que protege a **integridade** dos dados e com o que precisa ser **atômico** com eles.
`),
    exPg('Trigger de auditoria genérico', `
`, `CREATE TABLE auditoria (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela text, operacao text, antes jsonb, depois jsonb, em timestamptz DEFAULT now()
);
CREATE FUNCTION fn_auditar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auditoria (tabela, operacao, antes, depois)
  VALUES (TG_TABLE_NAME, TG_OP,
          CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER tg_contas_auditoria AFTER INSERT OR UPDATE OR DELETE ON contas
FOR EACH ROW EXECUTE FUNCTION fn_auditar();

UPDATE contas SET saldo = saldo + 10 WHERE id IN (1, 2);
SELECT operacao, antes ->> 'saldo' AS saldo_antes, depois ->> 'saldo' AS saldo_depois FROM auditoria;`, `
A mesma função serve para qualquer tabela: \`to_jsonb(OLD)\` e \`to_jsonb(NEW)\` guardam a linha inteira antes e depois.
`),
    quiz('Para um dashboard que lê a mesma agregação pesada centenas de vezes por hora, com tolerância de alguns minutos de atraso, use...', ['Materialized view com REFRESH CONCURRENTLY agendado', 'View simples', 'Trigger em cada pedido', 'Tabela temporária'], 0),
    quiz('O que REFRESH MATERIALIZED VIEW CONCURRENTLY exige?', ['Um índice UNIQUE na materialized view', 'Que a view não tenha JOIN', 'Superusuário', 'Nada'], 0),
    quiz('Uma função que só calcula a partir dos parâmetros, sem ler tabelas, deve ser declarada...', ['IMMUTABLE (permite usá-la em índices)', 'VOLATILE', 'STABLE', 'SECURITY DEFINER'], 0),
    pgsql('Crie a view `vw_pedidos_validos` com os pedidos que **não** estão cancelados nem devolvidos, e conte quantos ela tem (coluna `pedidos`).',
      `CREATE VIEW vw_pedidos_validos AS SELECT * FROM pedidos WHERE status NOT IN ('cancelado', 'devolvido');
SELECT count(*) AS pedidos FROM vw_pedidos_validos;`),
    pgsql('Crie a função SQL `margem_pct(p_preco numeric, p_custo numeric)` IMMUTABLE que devolve `round((p_preco - p_custo) / p_preco * 100, 2)`, e use-a para mostrar a margem média dos produtos (coluna `margem_media`, 2 casas).',
      `CREATE FUNCTION margem_pct(p_preco numeric, p_custo numeric) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT round((p_preco - p_custo) / p_preco * 100, 2) $$;
SELECT round(avg(margem_pct(preco, custo)), 2) AS margem_media FROM produtos;`),
    pgsql('Crie um trigger **BEFORE UPDATE** em `produtos` que impeça baixar o preço em mais de 50% (a função deve `RAISE EXCEPTION` nesse caso e devolver NEW caso contrário). Depois, atualize o produto 1 com um aumento de 10% e mostre o novo `preco`.',
      `CREATE FUNCTION fn_trava_preco() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.preco < OLD.preco * 0.5 THEN
    RAISE EXCEPTION 'redução de preço acima de 50%% no produto %', OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_trava_preco BEFORE UPDATE OF preco ON produtos FOR EACH ROW EXECUTE FUNCTION fn_trava_preco();
UPDATE produtos SET preco = round(preco * 1.1, 2) WHERE id = 1;
SELECT preco FROM produtos WHERE id = 1;`,
      { check: `SELECT (SELECT preco FROM produtos WHERE id = 1) AS preco, (SELECT count(*) FROM pg_trigger WHERE tgname = 'tg_trava_preco') AS trigger_existe` }),
  ],
};

const L_MVCC = {
  id: 'db-3-6', title: 'Transações, MVCC e níveis de isolamento',
  steps: [
    theory('MVCC: cada transação vê uma fotografia', `
O PostgreSQL usa **MVCC** (*Multi-Version Concurrency Control*): um UPDATE não sobrescreve a linha; ele cria uma **nova versão** e marca a antiga como "expirada". Cada versão (tupla) tem:
- \`xmin\`: id da transação que a criou
- \`xmax\`: id da transação que a apagou/atualizou (0 se viva)

Cada consulta usa um **snapshot**: a lista de transações já confirmadas naquele instante. Uma versão é visível se foi criada por transação confirmada antes do snapshot e não foi apagada por uma confirmada antes dele.

Consequências:
- **leitores não bloqueiam escritores e escritores não bloqueiam leitores**: o SELECT lê a versão antiga enquanto alguém atualiza a linha
- versões mortas se acumulam (**bloat**) até o **VACUUM** limpá-las (Nível 4)
- dois escritores na **mesma linha** ainda esperam um pelo outro (lock de linha)

\`SAVEPOINT\` cria um ponto de retorno dentro da transação: \`ROLLBACK TO SAVEPOINT x\` desfaz só o trecho depois dele, e a transação continua.
`),
    theory('Níveis de isolamento e anomalias', `
| anomalia | o que é |
|---|---|
| **dirty read** | ler dado de outra transação ainda não confirmada |
| **non-repeatable read** | ler a mesma linha duas vezes e ver valores diferentes (outra transação confirmou um UPDATE no meio) |
| **phantom read** | repetir uma consulta com filtro e aparecerem/sumirem linhas (INSERT/DELETE confirmado no meio) |
| **lost update** | duas transações leem, calculam e gravam: a segunda apaga o efeito da primeira |
| **write skew** | cada transação verifica uma regra lendo dados, grava coisas diferentes, e juntas violam a regra (ex.: dois médicos de plantão saem ao mesmo tempo, cada um vendo que o outro ficou) |

| nível (\`SET TRANSACTION ISOLATION LEVEL ...\`) | no PostgreSQL |
|---|---|
| Read Uncommitted | **tratado como Read Committed** (o PostgreSQL nunca faz dirty read) |
| **Read Committed** (padrão) | cada **comando** vê um snapshot novo: evita dirty read; permite non-repeatable, phantom, lost update (com read-modify-write na aplicação) e write skew |
| **Repeatable Read** | um snapshot para a **transação inteira**: evita non-repeatable e também phantom (mais forte que o padrão exige); se outra transação já alterou a linha que você quer alterar, dá **erro de serialização** (evita lost update); permite write skew |
| **Serializable** | SSI (*Serializable Snapshot Isolation*): detecta padrões que levariam a write skew e aborta uma das transações com \`could not serialize access\` |

Em Repeatable Read e Serializable, a aplicação **precisa repetir** a transação quando receber erro de serialização (SQLSTATE \`40001\`).

**Evitando lost update em Read Committed:** faça a conta no próprio UPDATE (\`SET saldo = saldo - 100\`, atômico), ou trave a linha antes de ler (\`SELECT ... FOR UPDATE\`), ou use controle **otimista** com versão (\`UPDATE ... SET versao = versao + 1 WHERE id = $1 AND versao = $2\`, e confira se 1 linha foi afetada).
`),
    exPg('Vendo as versões: xmin, xmax e ctid', `
Colunas de sistema mostram o MVCC em ação. Dentro da mesma transação, atualizamos uma conta e olhamos de novo:
`, `SELECT id, saldo, xmin, xmax, ctid FROM contas WHERE id = 1;
UPDATE contas SET saldo = saldo + 1 WHERE id = 1;
SELECT id, saldo, xmin, xmax, ctid, txid_current() AS minha_transacao FROM contas WHERE id = 1;`, `
Depois do UPDATE, a linha tem outro \`ctid\` (posição física: é uma **nova versão**) e o \`xmin\` passou a ser a transação atual. A versão antiga continua no disco até o VACUUM.
`),
    exPg('SAVEPOINT: desfazendo só uma parte', `
Este exemplo controla a transação manualmente (por isso roda numa cópia descartável do banco).
`, `BEGIN;
UPDATE contas SET saldo = saldo + 100 WHERE id = 3;
SAVEPOINT antes_do_erro;
UPDATE contas SET saldo = saldo - 999999 WHERE id = 4 AND false;  -- imagine um passo que deu errado
ROLLBACK TO SAVEPOINT antes_do_erro;
UPDATE contas SET versao = versao + 1 WHERE id = 3;
COMMIT;
SELECT id, saldo, versao FROM contas WHERE id IN (3, 4);`, `
O primeiro UPDATE e o último ficaram valendo; o trecho entre o SAVEPOINT e o ROLLBACK TO foi desfeito, sem abortar a transação inteira.
`),
    quiz('No PostgreSQL, o nível Read Uncommitted permite dirty reads?', ['Não: ele se comporta como Read Committed', 'Sim', 'Só em tabelas temporárias', 'Só com SERIALIZABLE desligado'], 0),
    quiz('Dois plantonistas consultam "há outro médico de plantão?", veem que sim, e cada um sai do plantão. Que anomalia é essa e qual nível a evita?', ['Write skew; Serializable', 'Dirty read; Read Committed', 'Phantom; Repeatable Read', 'Lost update; Read Uncommitted'], 0),
    quiz('Em Repeatable Read, sua transação tenta atualizar uma linha que outra transação alterou e confirmou depois do seu snapshot. O que acontece?', ['Erro de serialização (40001): a aplicação deve repetir a transação', 'A alteração da outra é sobrescrita', 'Espera para sempre', 'Lê a versão nova e segue'], 0),
    quiz('Por que leitores não bloqueiam escritores no PostgreSQL?', ['Por causa do MVCC: o leitor enxerga a versão antiga enquanto o escritor cria uma nova', 'Porque não há locks', 'Porque SELECT usa FOR UPDATE', 'Por causa do WAL'], 0),
    pgsql('Mostre o nível de isolamento padrão da sessão (`SHOW transaction_isolation`). A coluna se chama `transaction_isolation`.',
      `SHOW transaction_isolation;`),
    pgsql('Implemente **controle otimista**: atualize o saldo da conta 5 para 100.00 **somente se** a `versao` ainda for 0, incrementando a versão, e devolva com RETURNING `id`, `saldo`, `versao`.',
      `UPDATE contas SET saldo = 100.00, versao = versao + 1 WHERE id = 5 AND versao = 0 RETURNING id, saldo, versao;`),
    pgsql('Dentro de uma transação, use um **SAVEPOINT** para que um depósito de 50 na conta 7 valha, mas um segundo UPDATE (zerar o saldo da conta 7) seja desfeito com ROLLBACK TO SAVEPOINT. Confirme e mostre o `saldo` final da conta 7.',
      `BEGIN;
UPDATE contas SET saldo = saldo + 50 WHERE id = 7;
SAVEPOINT s1;
UPDATE contas SET saldo = 0 WHERE id = 7;
ROLLBACK TO SAVEPOINT s1;
COMMIT;
SELECT saldo FROM contas WHERE id = 7;`),
  ],
};

const L_LOCKS = {
  id: 'db-3-7', title: 'Locks, SKIP LOCKED e deadlocks',
  steps: [
    theory('Locks de linha e de tabela', `
**Locks de linha** (só travam escritores e quem pede lock na mesma linha; leitores comuns não esperam):
| cláusula | bloqueia | uso |
|---|---|---|
| \`FOR UPDATE\` | UPDATE, DELETE e outros FOR UPDATE/SHARE na linha | ler para depois alterar (saldo) |
| \`FOR NO KEY UPDATE\` | igual, mas permite FKs apontarem para a linha | o que o UPDATE comum usa |
| \`FOR SHARE\` | alterações (vários podem compartilhar) | garantir que a linha não mude enquanto você usa |
| \`FOR KEY SHARE\` | só alteração da chave/DELETE | o que a verificação de FK usa |

Modificadores: \`NOWAIT\` (erro imediato se travada) e \`SKIP LOCKED\` (pula as travadas).

**Locks de tabela**: comandos pegam locks automaticamente (\`ACCESS SHARE\` no SELECT, \`ROW EXCLUSIVE\` no INSERT/UPDATE, \`ACCESS EXCLUSIVE\` em muitos \`ALTER TABLE\`, \`DROP\`, \`TRUNCATE\`, \`VACUUM FULL\`). Um ACCESS EXCLUSIVE esperando na fila bloqueia **todos** os SELECTs que chegam depois dele: por isso migrações em produção usam \`SET lock_timeout = '2s'\` e tentam de novo.

**Advisory locks**: travas por número, definidas pela aplicação (\`pg_advisory_xact_lock(42)\`), para coordenar tarefas (ex.: só um worker processa o fechamento do mês).

A view \`pg_locks\` (junto com \`pg_stat_activity\` e \`pg_blocking_pids(pid)\`) mostra quem segura e quem espera cada lock.
`),
    theory('Filas com SKIP LOCKED e prevenção de deadlocks', `
**Fila de tarefas no Postgres**: vários workers pegam trabalhos sem pegar o mesmo duas vezes e sem esperar uns pelos outros:
~~~sql
UPDATE tarefas SET status = 'processando', pego_em = now()
WHERE id = (
  SELECT id FROM tarefas WHERE status = 'pendente'
  ORDER BY criado_em
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
~~~

**Deadlock**: A trava a linha 1 e quer a 2; B trava a 2 e quer a 1. Ninguém avança. O PostgreSQL detecta (após \`deadlock_timeout\`, 1 s por padrão) e **aborta uma** das transações com erro \`40P01\`.

Prevenção:
1. **Ordem consistente**: sempre travar recursos na mesma ordem (ex.: contas por id crescente numa transferência)
2. **Transações curtas**: nada de esperar resposta de API ou do usuário com locks abertos
3. **Travar tudo de uma vez**: \`SELECT ... WHERE id IN (a, b) ORDER BY id FOR UPDATE\`
4. **Tratar o erro**: repetir a transação quando receber \`40P01\` ou \`40001\`
5. \`lock_timeout\` e \`statement_timeout\` para não esperar indefinidamente

Diagnóstico em produção: \`log_lock_waits = on\` registra esperas longas; \`SELECT pid, pg_blocking_pids(pid), state, query FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0\` mostra a cadeia de bloqueio; \`pg_cancel_backend(pid)\` cancela a consulta e \`pg_terminate_backend(pid)\` derruba a conexão (último recurso).
`),
    exPg('Os locks que a sua transação segura', `
\`pg_locks\` mostra, inclusive, os locks da própria sessão. Travamos duas contas e olhamos:
`, `SELECT id, saldo FROM contas WHERE id IN (10, 20) ORDER BY id FOR UPDATE;
SELECT locktype, relation::regclass AS objeto, mode, granted
FROM pg_locks
WHERE pid = pg_backend_pid() AND relation IS NOT NULL
ORDER BY relation::regclass::text, mode;`, `
A transação tem \`RowShareLock\` na tabela \`contas\` (o modo pedido por SELECT FOR UPDATE) e locks no índice da PK. Os locks de linha em si ficam marcados na própria tupla (no \`xmax\`), não em \`pg_locks\`, o que permite travar milhões de linhas sem esgotar memória.
`),
    exPg('Fila de tarefas com SKIP LOCKED', `
`, `CREATE TABLE tarefas (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, status text NOT NULL DEFAULT 'pendente', criado_em timestamptz NOT NULL DEFAULT now());
INSERT INTO tarefas (criado_em) SELECT now() + g * interval '1 second' FROM generate_series(1, 5) g;
UPDATE tarefas SET status = 'processando'
WHERE id = (SELECT id FROM tarefas WHERE status = 'pendente' ORDER BY criado_em FOR UPDATE SKIP LOCKED LIMIT 1)
RETURNING id, status;`, `
Cada worker que rodar esse UPDATE ao mesmo tempo recebe uma tarefa diferente: as já travadas por outro worker são puladas em vez de causar espera.
`),
    quiz('Transferência de A para B e de B para A ao mesmo tempo podem gerar deadlock. A prevenção clássica é...', ['Travar as duas contas sempre na mesma ordem (menor id primeiro)', 'Usar Read Uncommitted', 'Não usar transação', 'Aumentar o deadlock_timeout'], 0),
    quiz('Para N workers consumirem uma fila no Postgres sem pegar a mesma tarefa e sem esperar, use...', ['SELECT ... FOR UPDATE SKIP LOCKED', 'SELECT ... FOR SHARE', 'LOCK TABLE tarefas', 'NOWAIT sem tratamento'], 0),
    quiz('Um ALTER TABLE esperando um lock ACCESS EXCLUSIVE numa tabela muito lida pode...', ['Bloquear todos os SELECTs que chegarem depois dele na fila; use lock_timeout e tente de novo', 'Não afeta ninguém', 'Só afetar escritas', 'Ser ignorado'], 0),
    quiz('O PostgreSQL detectou um deadlock. O que acontece?', ['Uma das transações é abortada com erro 40P01; a aplicação deve repetir', 'As duas esperam para sempre', 'O servidor reinicia', 'Ambas são confirmadas'], 0),
    order('Ordene os passos de uma transferência segura contra deadlock:', ['BEGIN', 'travar as duas contas por id crescente (FOR UPDATE)', 'verificar o saldo', 'atualizar as duas contas', 'COMMIT']),
    pgsql('Trave as contas 30 e 15 **na ordem de id crescente** com `FOR UPDATE` e devolva `id` e `saldo` nessa ordem.',
      `SELECT id, saldo FROM contas WHERE id IN (15, 30) ORDER BY id FOR UPDATE;`, { ordered: true }),
    pgsql('Crie a tabela `fila` (id IDENTITY PK, status text NOT NULL DEFAULT \'pendente\'), insira 3 tarefas e pegue a primeira pendente com **FOR UPDATE SKIP LOCKED**, mudando o status para `processando`. Devolva `id` e `status` com RETURNING.',
      `CREATE TABLE fila (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, status text NOT NULL DEFAULT 'pendente');
INSERT INTO fila DEFAULT VALUES; INSERT INTO fila DEFAULT VALUES; INSERT INTO fila DEFAULT VALUES;
UPDATE fila SET status = 'processando' WHERE id = (SELECT id FROM fila WHERE status = 'pendente' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id, status;`),
    pgsql('Use um **advisory lock** de transação para o número 2025 (`pg_advisory_xact_lock`) e confirme em `pg_locks` que ele está concedido: mostre `locktype` e `granted` dos locks do tipo `advisory` da sua sessão.',
      `SELECT pg_advisory_xact_lock(2025);
SELECT locktype, granted FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();`),
  ],
};

const L_PROJETO3 = {
  id: 'db-3-8', title: 'Projeto: ledger financeiro à prova de race conditions',
  steps: [
    theory('O desafio do nível', `
Construir o núcleo de um sistema de **transferências** (um *ledger* contábil) que, com 100 requisições simultâneas tentando sacar da mesma conta, **nunca** produz saldo negativo e **nunca** fica preso em deadlock sem tratamento.

**Defesas em camadas:**
1. **Constraint** \`CHECK (saldo >= 0)\` em \`contas\`: a última linha de defesa (mesmo um bug não deixa o saldo negativo)
2. **Função \`transferir\`** que faz tudo numa transação:
   - valida entrada (valor > 0, contas diferentes)
   - **trava as duas contas em ordem de id** com \`FOR UPDATE\` (evita lost update e deadlock)
   - verifica saldo e lança erro claro se insuficiente
   - atualiza os saldos e grava **dois lançamentos** (débito e crédito), mantendo a soma total constante (partidas dobradas)
3. **Idempotência**: cada pedido de transferência tem uma **chave única** (\`UNIQUE\`); repetir a mesma requisição (retry da rede) não transfere duas vezes
4. **Invariantes verificáveis**: soma dos saldos não muda com transferências; saldo de cada conta = saldo inicial + soma dos seus lançamentos

**Teste de estresse:** no laboratório local (Docker), \`pgbench\` dispara 100 clientes simultâneos chamando a função; depois as consultas de invariante devem continuar verdadeiras. No app, você constrói e testa a lógica numa conexão.
`),
    exPg('A função de transferência de referência', `
`, `CREATE TABLE transferencias (
  chave text PRIMARY KEY,
  origem int NOT NULL, destino int NOT NULL, valor numeric(14,2) NOT NULL CHECK (valor > 0),
  feita_em timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION transferir(p_chave text, p_origem int, p_destino int, p_valor numeric) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE v_saldo numeric;
BEGIN
  IF p_valor <= 0 OR p_origem = p_destino THEN RAISE EXCEPTION 'transferência inválida'; END IF;
  -- idempotência: a mesma chave não transfere duas vezes
  INSERT INTO transferencias (chave, origem, destino, valor) VALUES (p_chave, p_origem, p_destino, p_valor)
  ON CONFLICT (chave) DO NOTHING;
  IF NOT FOUND THEN RETURN 'repetida'; END IF;
  -- trava as duas contas sempre em ordem crescente de id (sem deadlock)
  PERFORM 1 FROM contas WHERE id IN (p_origem, p_destino) ORDER BY id FOR UPDATE;
  SELECT saldo INTO v_saldo FROM contas WHERE id = p_origem;
  IF v_saldo < p_valor THEN RAISE EXCEPTION 'saldo insuficiente na conta %', p_origem; END IF;
  UPDATE contas SET saldo = saldo - p_valor, versao = versao + 1 WHERE id = p_origem;
  UPDATE contas SET saldo = saldo + p_valor, versao = versao + 1 WHERE id = p_destino;
  INSERT INTO lancamentos (conta_id, valor, descricao, criado_em) VALUES
    (p_origem, -p_valor, 'transferência ' || p_chave, now()),
    (p_destino, p_valor, 'transferência ' || p_chave, now());
  RETURN 'ok';
END $$;

SELECT sum(saldo) AS total_antes FROM contas;
SELECT transferir('tx-1', 1, 2, 10), transferir('tx-1', 1, 2, 10) AS repetida;
SELECT sum(saldo) AS total_depois FROM contas;`, `
A segunda chamada com a mesma chave devolve "repetida" e não transfere de novo. A soma total dos saldos não muda: o dinheiro só troca de conta.
`),
    pgsql('**Parte 1 — invariante.** Mostre se existe alguma conta com saldo negativo (coluna `contas_negativas`, deve ser 0) e a soma total dos saldos (coluna `total`). Esta é a consulta que você roda depois do teste de estresse.',
      `SELECT count(*) FILTER (WHERE saldo < 0) AS contas_negativas, sum(saldo) AS total FROM contas;`),
    pgsql('**Parte 2 — função.** Crie `transferir(p_origem int, p_destino int, p_valor numeric) RETURNS void` em PL/pgSQL que: lança exceção se `p_valor <= 0`; trava as duas contas em ordem de id com FOR UPDATE; lança exceção `saldo insuficiente` se a origem não tiver saldo; atualiza os dois saldos e grava os dois lançamentos (valor negativo na origem, positivo no destino, descrição `transferência`, criado_em `now()`). Por fim, transfira 10 da conta com maior saldo para a conta 1 e mostre a soma total dos saldos (coluna `total`).',
      `CREATE FUNCTION transferir(p_origem int, p_destino int, p_valor numeric) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_saldo numeric;
BEGIN
  IF p_valor <= 0 THEN RAISE EXCEPTION 'valor inválido'; END IF;
  PERFORM 1 FROM contas WHERE id IN (p_origem, p_destino) ORDER BY id FOR UPDATE;
  SELECT saldo INTO v_saldo FROM contas WHERE id = p_origem;
  IF v_saldo < p_valor THEN RAISE EXCEPTION 'saldo insuficiente'; END IF;
  UPDATE contas SET saldo = saldo - p_valor WHERE id = p_origem;
  UPDATE contas SET saldo = saldo + p_valor WHERE id = p_destino;
  INSERT INTO lancamentos (conta_id, valor, descricao, criado_em) VALUES (p_origem, -p_valor, 'transferência', now()), (p_destino, p_valor, 'transferência', now());
END $$;
SELECT transferir((SELECT id FROM contas ORDER BY saldo DESC, id LIMIT 1), 1, 10);
SELECT sum(saldo) AS total FROM contas;`,
      { check: `SELECT (SELECT sum(saldo) FROM contas) AS total, (SELECT count(*) FROM lancamentos WHERE descricao = 'transferência') AS lancamentos_novos, (SELECT count(*) FROM pg_proc WHERE proname = 'transferir') AS funcao` }),
    pgsql('**Parte 3 — estresse sequencial.** Usando a função de referência simplificada abaixo (já no código inicial), execute **200 transferências** de 3,00 entre contas aleatórias com um bloco `DO`, capturando a exceção de saldo insuficiente (`EXCEPTION WHEN raise_exception THEN NULL`). Depois mostre `contas_negativas` e `total`.',
      `CREATE FUNCTION transferir(p_origem int, p_destino int, p_valor numeric) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v numeric;
BEGIN
  PERFORM 1 FROM contas WHERE id IN (p_origem, p_destino) ORDER BY id FOR UPDATE;
  SELECT saldo INTO v FROM contas WHERE id = p_origem;
  IF v < p_valor THEN RAISE EXCEPTION 'saldo insuficiente'; END IF;
  UPDATE contas SET saldo = saldo - p_valor WHERE id = p_origem;
  UPDATE contas SET saldo = saldo + p_valor WHERE id = p_destino;
END $$;
DO $$
BEGIN
  FOR i IN 1..200 LOOP
    BEGIN
      PERFORM transferir(1 + (i * 7) % 1000, 1 + (i * 13) % 1000, 3.00);
    EXCEPTION WHEN raise_exception THEN NULL;
    END;
  END LOOP;
END $$;
SELECT count(*) FILTER (WHERE saldo < 0) AS contas_negativas, sum(saldo) AS total FROM contas;`,
      { starter: `CREATE FUNCTION transferir(p_origem int, p_destino int, p_valor numeric) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v numeric;
BEGIN
  PERFORM 1 FROM contas WHERE id IN (p_origem, p_destino) ORDER BY id FOR UPDATE;
  SELECT saldo INTO v FROM contas WHERE id = p_origem;
  IF v < p_valor THEN RAISE EXCEPTION 'saldo insuficiente'; END IF;
  UPDATE contas SET saldo = saldo - p_valor WHERE id = p_origem;
  UPDATE contas SET saldo = saldo + p_valor WHERE id = p_destino;
END $$;
-- escreva o bloco DO com o laço aqui
`, hint: 'Dentro do LOOP, abra um bloco `BEGIN ... EXCEPTION WHEN raise_exception THEN NULL; END;` em volta do PERFORM, para que uma transferência recusada não aborte as outras.' }),
    quiz('Por que o CHECK (saldo >= 0) continua necessário mesmo com a função travando e conferindo o saldo?', ['É a última linha de defesa: protege contra bugs, outros caminhos de escrita e scripts manuais', 'Não é necessário', 'Deixa a função mais rápida', 'É exigido pelo FOR UPDATE'], 0),
    quiz('O cliente do app reenviou a mesma transferência por causa de um timeout de rede. O que impede a duplicidade?', ['Uma chave de idempotência UNIQUE por requisição', 'O FOR UPDATE', 'O CHECK de saldo', 'O nível Serializable'], 0),
  ],
};

export const DB_N3 = {
  id: 'db-u3', level: 3, title: 'SQL avançado, programação no banco e concorrência',
  description: 'CTEs e recursão, window functions, coortes, objetos programáveis, MVCC, isolamento e locks. Entregável: ledger à prova de race conditions',
  lessons: [L_CTE, L_RECURSIVA, L_WIN1, L_WIN2, L_PROG, L_MVCC, L_LOCKS, L_PROJETO3],
};
