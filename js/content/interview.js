import { sql, py } from './helpers.js';
import { PY_VENDAS, PY_STATS, PY_STATS_NOTE } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];
const S = { setup: PY_STATS, setupNote: PY_STATS_NOTE, packages: PD };

// Níveis de carreira usados para organizar os problemas.
export const LEVELS = [
  { id: 1, name: 'Júnior', desc: { sql: 'Filtros, agregações e JOINs do dia a dia', python: 'Estruturas de dados, funções e pandas básico' } },
  { id: 2, name: 'Pleno', desc: { sql: 'Subqueries, window functions e pivot', python: 'groupby, merge, pivot e manipulação de texto' } },
  { id: 3, name: 'Sênior', desc: { sql: 'Coortes, sequências, deduplicação e top-N', python: 'Coortes, sessões, recursão e algoritmos eficientes' } },
  { id: 4, name: 'Especialista', desc: { sql: 'Estatística e experimentos direto no SQL', python: 'Testes A/B, bootstrap, regressão e streaming' } },
];

// p(id, título, nível, minutos-alvo, passo, explicação do conceito em Markdown)
const p = (id, title, level, minutes, step, concept) => ({ id, title, level, minutes, step, concept: concept.trim() });

// ════════════════════════════════════════════════════════════ SQL
export const INTERVIEW_SQL = [
  // ───────── Júnior
  p('iv-1', 'Segundo produto mais caro', 1, 4,
    sql('Retorne **nome** e **preco** do produto com o **segundo maior preço** (sem usar LIMIT/OFFSET).',
      'SELECT nome, preco FROM produtos WHERE preco = (SELECT MAX(preco) FROM produtos WHERE preco < (SELECT MAX(preco) FROM produtos));',
      { hint: 'O maior preço entre os que são menores que o maior preço.' }),
    `Clássico de entrevista. A subquery interna acha o máximo; a do meio acha o maior valor **abaixo** dele. Alternativas: \`DENSE_RANK() OVER (ORDER BY preco DESC) = 2\` (lida melhor com empates e generaliza para o N-ésimo) ou \`LIMIT 1 OFFSET 1\` sobre os preços distintos.`),
  p('iv-2', 'Cidades com mais de um cliente', 1, 3,
    sql('Liste as **cidades** com mais de um cliente e a quantidade (colunas cidade, qtd), da maior quantidade para a menor e, no empate, por cidade A→Z.',
      'SELECT cidade, COUNT(*) AS qtd FROM clientes WHERE cidade IS NOT NULL GROUP BY cidade HAVING COUNT(*) > 1 ORDER BY qtd DESC, cidade;',
      { ordered: true }),
    `\`GROUP BY\` + \`HAVING\` filtra **grupos** depois da agregação. Repare no desempate do \`ORDER BY\` (qtd DESC, cidade): entrevistadores observam se você garante uma ordem determinística. E o \`WHERE cidade IS NOT NULL\` evita um grupo "NULL".`),
  p('iv-3', 'Estoque zerado', 1, 2,
    sql('Liste nome e preço dos produtos **sem estoque** que custam **mais de 100**.',
      'SELECT nome, preco FROM produtos WHERE estoque = 0 AND preco > 100;'),
    `Filtro simples com duas condições. Em entrevistas, use o tempo que sobra para comentar: "num banco grande, um índice em \`(estoque, preco)\` ajudaria esta consulta".`),
  p('sq1-4', 'Clientes sem e-mail por estado', 1, 3,
    sql('Para cada **estado**, quantos clientes **não têm e-mail**? Mostre só estados com pelo menos um. Colunas: estado, sem_email.',
      'SELECT estado, COUNT(*) AS sem_email FROM clientes WHERE email IS NULL GROUP BY estado;'),
    `Testa o tratamento de **NULL**: \`email = NULL\` nunca é verdadeiro, use \`IS NULL\`. Variação comum: contar com e sem e-mail na mesma linha via \`SUM(CASE WHEN email IS NULL THEN 1 ELSE 0 END)\`.`),
  p('sq1-5', 'Categorias mais vendidas', 1, 4,
    sql('Mostre as **3 categorias** com mais **unidades vendidas** (soma da quantidade em itens_pedido). Colunas: categoria, unidades. Da maior para a menor.',
      'SELECT pr.categoria, SUM(i.quantidade) AS unidades FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id GROUP BY pr.categoria ORDER BY unidades DESC LIMIT 3;',
      { ordered: true }),
    `JOIN entre a tabela de fatos (\`itens_pedido\`) e a dimensão (\`produtos\`), seguido de agregação e top-N. Atenção: a pergunta pede **unidades**, não número de linhas: \`SUM(quantidade)\`, não \`COUNT(*)\`.`),
  p('sq1-6', 'Pedidos por mês', 1, 3,
    sql('Conte os pedidos de cada mês de 2024 (formato AAAA-MM). Colunas: mes, pedidos. Ordene por mês.',
      'SELECT SUBSTR(data_pedido, 1, 7) AS mes, COUNT(*) AS pedidos FROM pedidos GROUP BY mes ORDER BY mes;',
      { ordered: true }),
    `Truncar datas para agrupar por período é rotina. Cada banco tem sua função: \`strftime('%Y-%m', d)\` (SQLite), \`DATE_TRUNC('month', d)\` (PostgreSQL), \`FORMAT_DATE('%Y-%m', d)\` (BigQuery).`),
  p('sq1-7', 'Salário por departamento', 1, 3,
    sql('Mostre cada departamento, o número de funcionários e o **salário médio** (2 casas), do maior salário médio para o menor. Colunas: departamento, funcionarios, salario_medio.',
      'SELECT departamento, COUNT(*) AS funcionarios, ROUND(AVG(salario), 2) AS salario_medio FROM funcionarios GROUP BY departamento ORDER BY salario_medio DESC;',
      { ordered: true }),
    `Agregações múltiplas no mesmo \`GROUP BY\`. Note que é possível ordenar pelo **alias** (\`salario_medio\`) porque o ORDER BY roda depois do SELECT na ordem lógica de execução.`),
  p('sq1-8', 'Ticket médio dos entregues', 1, 4,
    sql('Calcule o **ticket médio** dos pedidos **entregues**: valor médio por pedido (quantidade × preço somados por pedido), 2 casas. Uma coluna, ticket.',
      "SELECT ROUND(AVG(total), 2) AS ticket FROM (SELECT i.pedido_id, SUM(i.quantidade * i.preco_unitario) AS total FROM itens_pedido i JOIN pedidos p ON p.id = i.pedido_id WHERE p.status = 'entregue' GROUP BY i.pedido_id) t;"),
    `Erro clássico: fazer \`AVG(quantidade * preco)\` direto, o que dá a média por **item**, não por **pedido**. Primeiro agregue até o grão certo (pedido), depois tire a média. Pensar no **grão** da tabela é uma das habilidades mais avaliadas.`),
  p('sq1-9', 'Produtos mais bem avaliados', 1, 4,
    sql('Liste os produtos com **pelo menos 30 avaliações** e sua **nota média** (2 casas), da maior para a menor. Colunas: nome, avaliacoes, nota_media.',
      'SELECT pr.nome, COUNT(*) AS avaliacoes, ROUND(AVG(a.nota), 2) AS nota_media FROM avaliacoes a JOIN produtos pr ON pr.id = a.produto_id GROUP BY pr.id, pr.nome HAVING COUNT(*) >= 30 ORDER BY nota_media DESC;',
      { ordered: true }),
    `O \`HAVING COUNT(*) >= 30\` evita que um produto com 2 notas 5 apareça no topo: médias com poucas observações são instáveis. Em produção usa-se também **média bayesiana** (puxar a média para a geral quando há poucas avaliações).`),
  p('sq1-10', 'Clientes de 2024 que compraram', 1, 3,
    sql('Liste o nome dos clientes **cadastrados em 2024** que já fizeram **algum pedido** (sem repetir). Coluna: nome.',
      "SELECT DISTINCT c.nome FROM clientes c JOIN pedidos p ON p.cliente_id = c.id WHERE c.data_cadastro >= '2024-01-01';"),
    `JOIN + \`DISTINCT\` resolve, mas \`EXISTS\` comunica melhor a intenção ("existe ao menos um pedido") e evita duplicar linhas: \`WHERE EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id)\`.`),
  // ───────── Pleno
  p('iv-4', 'Acima da média do departamento', 2, 5,
    sql('Liste nome, departamento e salário dos funcionários que ganham **mais que a média do próprio departamento**.',
      'SELECT nome, departamento, salario FROM funcionarios f WHERE salario > (SELECT AVG(salario) FROM funcionarios g WHERE g.departamento = f.departamento);',
      { hint: 'Subquery correlacionada, ou AVG(salario) OVER (PARTITION BY departamento) numa CTE.' }),
    `Duas soluções: **subquery correlacionada** (recalcula a média para cada linha) ou **window function** \`AVG(salario) OVER (PARTITION BY departamento)\` numa CTE, que em geral é mais eficiente e legível. Mostrar as duas impressiona.`),
  p('iv-5', 'Primeira compra de cada cliente', 2, 6,
    sql('Para cada cliente que comprou, mostre **nome**, a **data do primeiro pedido** e o **id desse pedido** (colunas nome, data_pedido, pedido_id).',
      'WITH r AS (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY data_pedido) AS rn FROM pedidos p) SELECT c.nome, r.data_pedido, r.id AS pedido_id FROM r JOIN clientes c ON c.id = r.cliente_id WHERE rn = 1;'),
    `Padrão **"primeira/última linha por grupo"**: \`ROW_NUMBER() OVER (PARTITION BY grupo ORDER BY data)\` e filtre \`rn = 1\`. Só \`MIN(data)\` não basta, porque a pergunta também pede o id do pedido. Em BigQuery/Snowflake existe o atalho \`QUALIFY rn = 1\`.`),
  p('iv-6', 'Participação por categoria', 2, 5,
    sql('Mostre cada categoria e seu **percentual da receita total** (quantidade × preço de todos os itens), com 2 casas, do maior para o menor. Colunas: categoria, pct.',
      'SELECT pr.categoria, ROUND(100.0 * SUM(i.quantidade * i.preco_unitario) / (SELECT SUM(quantidade * preco_unitario) FROM itens_pedido), 2) AS pct FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id GROUP BY pr.categoria ORDER BY pct DESC;',
      { ordered: true }),
    `Percentual do total: divida pelo total geral via subquery escalar ou \`SUM(SUM(x)) OVER ()\` (window sobre a agregação). Use \`100.0\` para forçar divisão decimal: em vários bancos, inteiro ÷ inteiro trunca.`),
  p('iv-7', 'Melhor cliente por estado', 2, 7,
    sql('Para cada **estado**, mostre o cliente com **maior faturamento** (todos os pedidos). Colunas: estado, nome, faturamento.',
      'WITH f AS (SELECT c.estado, c.nome, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM clientes c JOIN pedidos p ON p.cliente_id = c.id JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY c.id, c.estado, c.nome), r AS (SELECT *, RANK() OVER (PARTITION BY estado ORDER BY faturamento DESC) AS rk FROM f) SELECT estado, nome, faturamento FROM r WHERE rk = 1;'),
    `**Top-1 por grupo** em duas etapas: agregue (CTE \`f\`), depois ranqueie (CTE \`r\`). \`RANK\` mantém empates; \`ROW_NUMBER\` escolhe um só. Diga ao entrevistador qual comportamento você escolheu e por quê.`),
  p('iv-8', 'Intervalo médio entre compras', 2, 8,
    sql('Para clientes com **2 ou mais pedidos**, calcule o **intervalo médio em dias** entre pedidos consecutivos (1 casa decimal). Colunas: cliente_id, media_dias.',
      'WITH g AS (SELECT cliente_id, julianday(data_pedido) - julianday(LAG(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido)) AS dias FROM pedidos) SELECT cliente_id, ROUND(AVG(dias), 1) AS media_dias FROM g WHERE dias IS NOT NULL GROUP BY cliente_id;',
      { hint: 'LAG(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido) e julianday().' }),
    `\`LAG\` traz o pedido anterior do mesmo cliente; a diferença de datas dá o intervalo. O primeiro pedido de cada cliente fica com NULL e é descartado. Métrica muito usada para prever recompra e churn.`),
  p('sq2-6', 'Compradores multicategoria', 2, 5,
    sql('Liste o nome dos clientes que compraram produtos de **pelo menos 2 categorias diferentes**, com a quantidade de categorias. Colunas: nome, categorias. Da maior quantidade para a menor e, no empate, por nome.',
      'SELECT c.nome, COUNT(DISTINCT pr.categoria) AS categorias FROM clientes c JOIN pedidos p ON p.cliente_id = c.id JOIN itens_pedido i ON i.pedido_id = p.id JOIN produtos pr ON pr.id = i.produto_id GROUP BY c.id, c.nome HAVING COUNT(DISTINCT pr.categoria) >= 2 ORDER BY categorias DESC, c.nome;',
      { ordered: true }),
    `\`COUNT(DISTINCT ...)\` dentro do \`HAVING\`. Quatro tabelas encadeadas: desenhe o caminho cliente → pedido → item → produto antes de escrever. Base de análises de **cross-sell**.`),
  p('sq2-7', 'Melhor produto de cada categoria', 2, 6,
    sql('Para cada categoria, mostre o produto com a **maior nota média** nas avaliações (2 casas). Colunas: categoria, nome, nota_media.',
      'WITH m AS (SELECT pr.categoria, pr.nome, AVG(a.nota) AS media FROM avaliacoes a JOIN produtos pr ON pr.id = a.produto_id GROUP BY pr.id, pr.categoria, pr.nome), r AS (SELECT *, RANK() OVER (PARTITION BY categoria ORDER BY media DESC) AS rk FROM m) SELECT categoria, nome, ROUND(media, 2) AS nota_media FROM r WHERE rk = 1;'),
    `Agregação seguida de ranking dentro da partição. Arredonde **só na apresentação**: ranquear valores arredondados pode criar empates artificiais.`),
  p('sq2-8', 'Teste A/B lado a lado', 2, 5,
    sql('Monte uma tabela com uma linha por **dispositivo** e colunas com a taxa de conversão do grupo A e do grupo B (4 casas). Colunas: dispositivo, taxa_a, taxa_b. Ordene por dispositivo.',
      "SELECT dispositivo, ROUND(AVG(CASE WHEN grupo = 'A' THEN converteu END), 4) AS taxa_a, ROUND(AVG(CASE WHEN grupo = 'B' THEN converteu END), 4) AS taxa_b FROM experimento_ab GROUP BY dispositivo ORDER BY dispositivo;",
      { ordered: true }),
    `**Pivot manual** com agregação condicional: \`AVG(CASE WHEN grupo = 'A' THEN converteu END)\`. O CASE sem ELSE gera NULL para o outro grupo, e o AVG ignora NULLs. Com \`ELSE 0\` a média ficaria errada!`),
  p('sq2-9', 'Melhor dia da semana por loja', 2, 7,
    sql("Para cada loja, qual **dia da semana** (0 = domingo, via strftime('%w', data)) tem a **maior receita média**? Colunas: loja, dia_semana, media (2 casas).",
      "WITH m AS (SELECT loja, strftime('%w', data) AS dia_semana, AVG(receita) AS media FROM vendas_diarias GROUP BY loja, dia_semana), r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY loja ORDER BY media DESC) AS rn FROM m) SELECT loja, dia_semana, ROUND(media, 2) AS media FROM r WHERE rn = 1;"),
    `Agregar por duas dimensões e escolher o máximo por grupo. Este padrão aparece em análise de **sazonalidade** para planejar escala de equipe e campanhas.`),
  p('sq2-10', 'Tamanho das equipes', 2, 4,
    sql('Para cada gestor, mostre o nome e o número de **subordinados diretos**, do maior para o menor (no empate, por nome). Colunas: gestor, subordinados.',
      'SELECT g.nome AS gestor, COUNT(*) AS subordinados FROM funcionarios f JOIN funcionarios g ON g.id = f.gerente_id GROUP BY g.id, g.nome ORDER BY subordinados DESC, g.nome;',
      { ordered: true }),
    `**Self join**: a tabela funcionarios aparece duas vezes, uma como subordinado (f) e outra como gestor (g). Para contar subordinados **indiretos** também, seria preciso uma CTE recursiva.`),
  // ───────── Sênior
  p('iv-9', 'Mediana do ticket', 3, 8,
    sql('Calcule a **mediana do valor dos pedidos** (soma de quantidade × preço por pedido) **usando window functions**, sem a função median(). Uma coluna, 2 casas.',
      'WITH t AS (SELECT pedido_id, SUM(quantidade * preco_unitario) AS v FROM itens_pedido GROUP BY pedido_id), o AS (SELECT v, ROW_NUMBER() OVER (ORDER BY v) AS rn, COUNT(*) OVER () AS n FROM t) SELECT ROUND(AVG(v), 2) FROM o WHERE rn IN ((n + 1) / 2, (n + 2) / 2);',
      { hint: 'Numere os valores ordenados (ROW_NUMBER) e conte o total (COUNT(*) OVER ()). A mediana é a média das posições (n+1)/2 e (n+2)/2 (divisão inteira).' }),
    `Truque universal: com n ímpar, (n+1)/2 e (n+2)/2 apontam para a mesma posição; com n par, para as duas do meio. A média delas é a mediana. Em PostgreSQL: \`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY v)\`.`),
  p('iv-10', 'Retenção em 60 dias', 3, 9,
    sql('Quantos clientes fizeram um **segundo pedido em até 60 dias** depois do primeiro? Uma coluna com a contagem.',
      'WITH o AS (SELECT cliente_id, data_pedido, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY data_pedido) AS rn FROM pedidos), a AS (SELECT o1.cliente_id FROM o o1 JOIN o o2 ON o2.cliente_id = o1.cliente_id AND o1.rn = 1 AND o2.rn = 2 WHERE julianday(o2.data_pedido) - julianday(o1.data_pedido) <= 60) SELECT COUNT(*) FROM a;'),
    `Numere os pedidos de cada cliente e junte o 1º com o 2º. Alternativa mais curta: \`LEAD(data_pedido)\` sobre a primeira linha. Retenção D30/D60/D90 é pergunta frequente em empresas de produto.`),
  p('iv-11', 'Campeão de vendas por categoria', 3, 8,
    sql('Para cada categoria, mostre o produto com a **maior quantidade vendida** (inclua empates). Colunas: categoria, nome, unidades.',
      'WITH q AS (SELECT pr.categoria, pr.nome, SUM(i.quantidade) AS unidades FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id GROUP BY pr.id, pr.categoria, pr.nome), r AS (SELECT *, RANK() OVER (PARTITION BY categoria ORDER BY unidades DESC) AS rk FROM q) SELECT categoria, nome, unidades FROM r WHERE rk = 1;',
      { hint: 'RANK() mantém os empates; ROW_NUMBER() não.' }),
    `A exigência de **manter empates** decide a função: \`RANK\` ou \`DENSE_RANK\`. Ler o enunciado com atenção a esse detalhe é metade da nota.`),
  p('iv-12', 'Crescimento mês a mês', 3, 8,
    sql('Mostre mês (AAAA-MM), faturamento e o **crescimento percentual** em relação ao mês anterior (2 casas; NULL no primeiro mês), ordenado por mês. Colunas: mes, faturamento, crescimento_pct.',
      'WITH m AS (SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY mes) SELECT mes, faturamento, ROUND(100.0 * (faturamento - LAG(faturamento) OVER (ORDER BY mes)) / LAG(faturamento) OVER (ORDER BY mes), 2) AS crescimento_pct FROM m ORDER BY mes;',
      { ordered: true }),
    `\`LAG\` sobre a série mensal. Cuidado com meses **sem vendas**: eles não aparecem no GROUP BY e o LAG compara com um mês mais antigo. Em produção, gere um calendário completo (CTE recursiva) e faça LEFT JOIN.`),
  p('sq3-5', 'Maior sequência acima da média', 3, 12,
    sql('Na loja **Online**, qual a **maior sequência de dias consecutivos** com receita **acima da média da loja**? Uma coluna, dias.',
      "WITH m AS (SELECT AVG(receita) AS media FROM vendas_diarias WHERE loja = 'Online'), d AS (SELECT data, julianday(data) - ROW_NUMBER() OVER (ORDER BY data) AS grp FROM vendas_diarias, m WHERE loja = 'Online' AND receita > m.media) SELECT MAX(n) AS dias FROM (SELECT grp, COUNT(*) AS n FROM d GROUP BY grp);",
      { hint: 'Gaps & islands: data − ROW_NUMBER() é constante dentro de uma sequência de dias seguidos.' }),
    `**Gaps and islands**: depois de filtrar os dias que atendem à condição, \`data − ROW_NUMBER()\` fica constante enquanto os dias são consecutivos. Agrupe por essa diferença e conte. Um dos problemas favoritos de entrevistas sênior.`),
  p('sq3-6', 'Dia do primeiro milhão', 3, 9,
    sql('Para cada loja, em que **data** a **receita acumulada** de 2024 passou de **1.000.000**? Colunas: loja, data. Ordene por data.',
      'WITH a AS (SELECT loja, data, SUM(receita) OVER (PARTITION BY loja ORDER BY data) AS acumulado FROM vendas_diarias) SELECT loja, MIN(data) AS data FROM a WHERE acumulado >= 1000000 GROUP BY loja ORDER BY data;',
      { ordered: true }),
    `Soma acumulada com window (\`SUM ... OVER (PARTITION BY loja ORDER BY data)\`) e depois o **primeiro** dia que cruza o limiar com \`MIN(data)\`. Padrão de "marco atingido" (milésimo cliente, meta batida...).`),
  p('sq3-7', 'Pico da média móvel', 3, 9,
    sql('Calcule a receita **total por dia** (todas as lojas) e a **média móvel de 7 dias**. Em qual dia a média móvel foi **máxima**? Colunas: data, media_movel (2 casas).',
      'WITH t AS (SELECT data, SUM(receita) AS total FROM vendas_diarias GROUP BY data), m AS (SELECT data, AVG(total) OVER (ORDER BY data ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS mm FROM t) SELECT data, ROUND(mm, 2) AS media_movel FROM m ORDER BY mm DESC LIMIT 1;'),
    `Agregue primeiro ao grão diário, depois aplique a janela \`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\`. Aplicar a janela antes de agregar as lojas misturaria linhas de lojas diferentes na janela, um erro sutil.`),
  p('sq3-8', 'Deduplicação de avaliações', 3, 8,
    sql('Alguns clientes avaliaram o mesmo produto mais de uma vez. Mantendo apenas a avaliação **mais recente** (maior data; no empate, maior id) de cada par cliente-produto, quantas avaliações restam e qual a nota média (2 casas)? Colunas: avaliacoes, nota_media.',
      'WITH r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY cliente_id, produto_id ORDER BY data_avaliacao DESC, id DESC) AS rn FROM avaliacoes) SELECT COUNT(*) AS avaliacoes, ROUND(AVG(nota), 2) AS nota_media FROM r WHERE rn = 1;'),
    `Deduplicar com \`ROW_NUMBER() OVER (PARTITION BY chave ORDER BY critério DESC)\` e \`rn = 1\` é o padrão de toda camada de dados "limpa" (dbt, data warehouse). O desempate por id deixa o resultado **determinístico**.`),
  p('sq3-9', 'Top 2 produtos por mês', 3, 9,
    sql('Para cada mês (AAAA-MM), mostre os **2 produtos de maior receita** (quantidade × preço). Colunas: mes, nome, receita. Ordene por mês e receita decrescente.',
      'WITH m AS (SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, pr.nome, SUM(i.quantidade * i.preco_unitario) AS receita FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id JOIN produtos pr ON pr.id = i.produto_id GROUP BY mes, pr.id, pr.nome), r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY mes ORDER BY receita DESC, nome) AS rn FROM m) SELECT mes, nome, receita FROM r WHERE rn <= 2 ORDER BY mes, receita DESC;',
      { ordered: true }),
    `Top-N por grupo com N > 1: mesma receita do top-1, trocando \`rn = 1\` por \`rn <= 2\`. Use um desempate (\`nome\`) para não depender da ordem física das linhas.`),
  p('sq3-10', 'Receita por usuário no teste', 3, 6,
    sql('No experimento, calcule por grupo: usuários, conversões, receita total e **receita por usuário** (ARPU, 2 casas). Colunas: grupo, usuarios, conversoes, receita, arpu.',
      'SELECT grupo, COUNT(*) AS usuarios, SUM(converteu) AS conversoes, ROUND(SUM(valor_compra), 2) AS receita, ROUND(SUM(valor_compra) / COUNT(*), 2) AS arpu FROM experimento_ab GROUP BY grupo;'),
    `Num teste A/B, a métrica de decisão costuma ser **receita por usuário**, que combina conversão e ticket. Um grupo pode converter mais e vender mais barato; o ARPU captura o efeito líquido.`),
  // ───────── Especialista
  p('sq4-1', 'Teste A/B em SQL puro', 4, 12,
    sql('Calcule o **z** do teste de duas proporções entre B e A: z = (pB − pA) ÷ √(p·(1−p)·(1/nA + 1/nB)), onde p é a taxa combinada. Colunas: taxa_a, taxa_b, z (4 casas cada).',
      "WITH g AS (SELECT grupo, COUNT(*) AS n, AVG(converteu) AS taxa, SUM(converteu) AS conv FROM experimento_ab GROUP BY grupo), a AS (SELECT * FROM g WHERE grupo = 'A'), b AS (SELECT * FROM g WHERE grupo = 'B'), pool AS (SELECT (a.conv + b.conv) * 1.0 / (a.n + b.n) AS p FROM a, b) SELECT ROUND(a.taxa, 4) AS taxa_a, ROUND(b.taxa, 4) AS taxa_b, ROUND((b.taxa - a.taxa) / SQRT(pool.p * (1 - pool.p) * (1.0 / a.n + 1.0 / b.n)), 4) AS z FROM a, b, pool;"),
    `Montar o teste em SQL mostra domínio de estatística e de CTEs. Com |z| > 1,96, a diferença é significativa a 5% (bicaudal). Reporte também o lift e o intervalo de confiança da diferença.`),
  p('sq4-2', 'Intervalo de confiança da conversão', 4, 8,
    sql('Para cada grupo, calcule a taxa de conversão e o **IC de 95%**: p ± 1,96·√(p(1−p)/n), 4 casas. Colunas: grupo, taxa, ic_inf, ic_sup.',
      'WITH g AS (SELECT grupo, COUNT(*) AS n, AVG(converteu) AS p FROM experimento_ab GROUP BY grupo) SELECT grupo, ROUND(p, 4) AS taxa, ROUND(p - 1.96 * SQRT(p * (1 - p) / n), 4) AS ic_inf, ROUND(p + 1.96 * SQRT(p * (1 - p) / n), 4) AS ic_sup FROM g;'),
    `IC de proporção pela aproximação normal (Wald). Para taxas muito baixas ou amostras pequenas, o intervalo de **Wilson** é mais preciso. Mencionar isso diferencia um especialista.`),
  p('sq4-3', 'Alerta de anomalia', 4, 14,
    sql('Na loja **Online**, liste os dias cujo z-score da receita, calculado contra os **28 dias anteriores** (sem incluir o dia), é **maior que 3**. Use média e desvio populacional da janela. Colunas: data, receita, z (2 casas).',
      "WITH w AS (SELECT data, receita, AVG(receita) OVER j AS media, AVG(receita * receita) OVER j AS media2, COUNT(*) OVER j AS n FROM vendas_diarias WHERE loja = 'Online' WINDOW j AS (ORDER BY data ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING)) SELECT data, receita, ROUND((receita - media) / SQRT(media2 - media * media), 2) AS z FROM w WHERE n = 28 AND (receita - media) / SQRT(media2 - media * media) > 3;",
      { hint: 'WINDOW j AS (ORDER BY data ROWS BETWEEN 28 PRECEDING AND 1 PRECEDING); desvio = SQRT(AVG(x²) − AVG(x)²).' }),
    `Monitoramento de métricas em SQL: janela que **exclui o dia atual** (\`... AND 1 PRECEDING\`), desvio pela identidade E[X²] − E[X]², e \`n = 28\` para ignorar o início da série sem histórico. A cláusula \`WINDOW\` evita repetir a definição da janela.`),
  p('sq4-4', 'Percentil 90 por loja', 4, 10,
    sql('Calcule o **percentil 90** da receita diária de cada loja pelo método **nearest-rank** (o valor na posição ⌈0,9·n⌉ dos dados ordenados). Colunas: loja, p90.',
      'WITH o AS (SELECT loja, receita, ROW_NUMBER() OVER (PARTITION BY loja ORDER BY receita) AS rn, COUNT(*) OVER (PARTITION BY loja) AS n FROM vendas_diarias) SELECT loja, receita AS p90 FROM o WHERE rn = CAST(0.9 * n AS INTEGER) + (CASE WHEN 0.9 * n > CAST(0.9 * n AS INTEGER) THEN 1 ELSE 0 END);',
      { hint: 'Posição = teto de 0,9·n: CAST(0.9*n AS INTEGER) + 1 quando houver parte fracionária.' }),
    `Percentis sem função nativa: ordene, numere, e pegue a posição desejada. Existem vários métodos (nearest-rank, interpolação linear do \`PERCENTILE_CONT\`); diga qual está usando, porque os resultados diferem um pouco.`),
  p('sq4-5', 'Regressão linear em SQL', 4, 12,
    sql('Ajuste a reta **receita = a + b·visitantes** por mínimos quadrados: b = (E[xy] − E[x]E[y]) ÷ (E[x²] − E[x]²), a = E[y] − b·E[x]. Colunas: b, a (2 casas).',
      'WITH s AS (SELECT AVG(visitantes) AS mx, AVG(receita) AS my, AVG(visitantes * receita) AS mxy, AVG(visitantes * visitantes) AS mxx FROM vendas_diarias) SELECT ROUND((mxy - mx * my) / (mxx - mx * mx), 2) AS b, ROUND(my - (mxy - mx * my) / (mxx - mx * mx) * mx, 2) AS a FROM s;'),
    `Regressão simples cabe em uma linha de agregações. Útil para estimativas rápidas direto no warehouse. Para regressão múltipla e diagnósticos, leve os dados para Python (statsmodels).`),
  p('sq4-6', 'Preço × satisfação', 4, 10,
    sql('Existe relação entre **preço** e **nota média** dos produtos? Calcule a correlação de Pearson entre o preço de cada produto e sua nota média (uma linha por produto), 4 casas. Uma coluna, r.',
      'WITH m AS (SELECT pr.preco AS x, AVG(a.nota) AS y FROM avaliacoes a JOIN produtos pr ON pr.id = a.produto_id GROUP BY pr.id, pr.preco) SELECT ROUND((AVG(x * y) - AVG(x) * AVG(y)) / (SQRT(AVG(x * x) - AVG(x) * AVG(x)) * SQRT(AVG(y * y) - AVG(y) * AVG(y))), 4) AS r FROM m;'),
    `Primeiro leve os dados ao **grão** da análise (um ponto por produto), depois correlacione. Com apenas 12 pontos, qualquer correlação é frágil: comente o tamanho da amostra.`),
  p('sq4-7', 'Regra 80/20', 4, 12,
    sql('Quantos produtos são necessários para atingir **80% da receita** (quantidade × preço)? Conte os produtos, do que mais fatura para o que menos, até o primeiro cuja receita acumulada alcança 80%. Uma coluna, produtos.',
      'WITH r AS (SELECT produto_id, SUM(quantidade * preco_unitario) AS receita FROM itens_pedido GROUP BY produto_id), a AS (SELECT receita, SUM(receita) OVER (ORDER BY receita DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acum, SUM(receita) OVER () AS total FROM r) SELECT COUNT(*) + 1 AS produtos FROM a WHERE acum < 0.8 * total;',
      { hint: 'Conte quantos ficam abaixo de 80% no acumulado e some 1 (o que cruza a linha).' }),
    `Análise de **Pareto**: receita acumulada ordenada de forma decrescente. O "+1" inclui o produto que cruza o limiar. Usado em gestão de estoque (curva ABC).`),
  p('sq4-8', 'Cadeia de comando', 4, 12,
    sql("Para cada funcionário, monte a **cadeia até a CEO** como texto, por exemplo 'Yasmin Castro > Sofia Cardoso > Paulo Ribeiro > Marina Teixeira'. Colunas: nome, cadeia. Ordene por nome.",
      "WITH RECURSIVE c(id, nome, atual, cadeia) AS (SELECT id, nome, gerente_id, nome FROM funcionarios UNION ALL SELECT c.id, c.nome, f.gerente_id, c.cadeia || ' > ' || f.nome FROM c JOIN funcionarios f ON f.id = c.atual) SELECT nome, cadeia FROM c WHERE atual IS NULL ORDER BY nome;",
      { ordered: true, hint: 'CTE recursiva que sobe pelo gerente_id concatenando nomes até chegar em quem não tem gerente.' }),
    `CTE recursiva "de baixo para cima": cada passo sobe um nível (\`gerente_id\`) e concatena o nome. A recursão termina quando \`atual\` fica NULL (chegou à CEO). Usada em organogramas, categorias aninhadas e grafos.`),
  p('sq4-9', 'Semana de maior crescimento', 4, 12,
    sql("Agrupe a receita total por **semana** (strftime('%W', data)) e encontre a semana com o **maior crescimento percentual** em relação à semana anterior. Colunas: semana, receita, crescimento_pct (2 casas).",
      "WITH s AS (SELECT strftime('%W', data) AS semana, SUM(receita) AS receita FROM vendas_diarias GROUP BY semana), c AS (SELECT semana, receita, 100.0 * (receita - LAG(receita) OVER (ORDER BY semana)) / LAG(receita) OVER (ORDER BY semana) AS cresc FROM s) SELECT semana, ROUND(receita, 2) AS receita, ROUND(cresc, 2) AS crescimento_pct FROM c ORDER BY cresc DESC LIMIT 1;"),
    `Semanas incompletas (início e fim do ano) distorcem crescimentos. Numa entrevista, aponte isso e sugira comparar só semanas completas, ou normalizar por número de dias.`),
  p('sq4-10', 'Lift por segmento', 4, 10,
    sql('Para cada dispositivo, mostre a conversão de A e de B e o **lift** percentual de B sobre A (2 casas). Colunas: dispositivo, taxa_a, taxa_b, lift_pct (taxas com 4 casas). Ordene pelo maior lift.',
      "WITH t AS (SELECT dispositivo, AVG(CASE WHEN grupo = 'A' THEN converteu END) AS a, AVG(CASE WHEN grupo = 'B' THEN converteu END) AS b FROM experimento_ab GROUP BY dispositivo) SELECT dispositivo, ROUND(a, 4) AS taxa_a, ROUND(b, 4) AS taxa_b, ROUND(100.0 * (b - a) / a, 2) AS lift_pct FROM t ORDER BY lift_pct DESC;",
      { ordered: true }),
    `Análise por **segmento** depois do teste. Cuidado: segmentos têm amostras menores (intervalos mais largos) e testar muitos segmentos aumenta falsos positivos. Trate como **hipóteses** para novos testes, não como conclusões.`),
];

// ════════════════════════════════════════════════════════════ PYTHON
export const INTERVIEW_PY = [
  // ───────── Júnior
  p('iv-16', 'Frequências sem bibliotecas', 1, 4,
    py('Escreva `frequencias(itens)` que devolve um dicionário com quantas vezes cada item aparece, **sem usar** `collections.Counter`.',
      r`def frequencias(itens):
    contagem = {}
    for item in itens:
        contagem[item] = contagem.get(item, 0) + 1
    return contagem`,
      r`assert frequencias(["SP", "RJ", "SP"]) == {"SP": 2, "RJ": 1}
assert frequencias([]) == {}`,
      { starter: 'def frequencias(itens):\n    ' }),
    `\`dict.get(chave, 0)\` evita o KeyError na primeira ocorrência. Complexidade O(n). Depois de mostrar a versão manual, cite \`collections.Counter(itens)\` e \`pd.Series(itens).value_counts()\`.`),
  p('iv-13', 'Top 2 clientes (pandas)', 1, 4,
    py('Com o DataFrame `vendas`, crie `top2`: uma Series com a **receita total dos 2 clientes que mais faturaram**, indexada pelo nome do cliente, em ordem decrescente.',
      r`top2 = vendas.groupby("cliente")["valor"].sum().nlargest(2)`,
      r`assert list(top2.index) == ["Ana", "Bruno"]
assert abs(top2.iloc[0] - 6326.8) < 1e-6`,
      { setup: PY_VENDAS, packages: PD }),
    `\`groupby().sum()\` seguido de \`nlargest(n)\` é mais eficiente que ordenar tudo com \`sort_values\` e pegar o \`head\`.`),
  p('py1-3', 'Limpeza de nomes', 1, 4,
    py('Escreva `limpar(nomes)` que remove espaços nas pontas, coloca em Title Case, **remove duplicados** e devolve a lista **ordenada**.',
      r`def limpar(nomes):
    return sorted({n.strip().title() for n in nomes})`,
      r`assert limpar(["  ana souza", "ANA SOUZA", "bruno lima "]) == ["Ana Souza", "Bruno Lima"]
assert limpar([]) == []`,
      { starter: 'def limpar(nomes):\n    ' }),
    `Uma **set comprehension** normaliza e deduplica de uma vez; \`sorted\` devolve uma lista nova. Normalize **antes** de deduplicar, ou "ANA" e "ana" contariam como diferentes.`),
  p('py1-4', 'Média ignorando ausentes', 1, 3,
    py('Escreva `media_valida(valores)` que calcula a média ignorando `None`; se não houver nenhum valor válido, devolva `None`.',
      r`def media_valida(valores):
    validos = [v for v in valores if v is not None]
    if not validos:
        return None
    return sum(validos) / len(validos)`,
      r`assert media_valida([10, None, 20]) == 15
assert media_valida([None, None]) is None
assert media_valida([]) is None`,
      { starter: 'def media_valida(valores):\n    ' }),
    `Trate os casos de borda (lista vazia, tudo nulo) **antes** que o entrevistador pergunte. Use \`is not None\`, porque \`if v\` descartaria o valor 0 por engano.`),
  p('py1-5', 'Contagem por status', 1, 3,
    py('Crie `por_status`: um **dicionário** {status: quantidade} das vendas em `vendas`.',
      r`por_status = vendas["status"].value_counts().to_dict()`,
      r`assert por_status == {"entregue": 10, "cancelado": 2}`,
      { setup: PY_VENDAS, packages: PD }),
    `\`value_counts()\` já ordena do mais frequente para o menos frequente; \`.to_dict()\` converte para tipos nativos do Python. Com \`normalize=True\`, ele dá as proporções.`),
  p('py1-6', 'Inverter um dicionário', 1, 4,
    py('Escreva `inverter(d)` que transforma {produto: categoria} em {categoria: [produtos...]} mantendo a ordem de aparição.',
      r`def inverter(d):
    out = {}
    for k, v in d.items():
        out.setdefault(v, []).append(k)
    return out`,
      r`assert inverter({"mouse": "acc", "tv": "ele", "cabo": "acc"}) == {"acc": ["mouse", "cabo"], "ele": ["tv"]}`,
      { starter: 'def inverter(d):\n    ' }),
    `\`setdefault\` cria a lista na primeira vez. Alternativa: \`collections.defaultdict(list)\`. Dicionários preservam a ordem de inserção desde o Python 3.7.`),
  p('py1-7', 'Filtrar e ordenar', 1, 3,
    py('Crie `grandes`: as vendas **entregues** com valor **acima de 3000**, ordenadas do maior valor para o menor, apenas com as colunas `cliente` e `valor`.',
      r`grandes = vendas.loc[(vendas["status"] == "entregue") & (vendas["valor"] > 3000), ["cliente", "valor"]].sort_values("valor", ascending=False)`,
      r`assert list(grandes.columns) == ["cliente", "valor"]
assert list(grandes["valor"]) == [5479.0, 5289.9, 3977.8, 3958.0, 3697.0]`,
      { setup: PY_VENDAS, packages: PD }),
    `Máscara booleana com \`&\` e parênteses, seleção de colunas no \`loc\` e ordenação. É o "SELECT ... WHERE ... ORDER BY" do pandas.`),
  // ───────── Pleno
  p('iv-14', 'Taxa de cancelamento (pandas)', 2, 5,
    py('Crie `taxa`: uma Series com a **proporção de pedidos cancelados por estado** (0 a 1), indexada pelo estado.',
      r`taxa = vendas.assign(canc=vendas["status"] == "cancelado").groupby("estado")["canc"].mean()`,
      r`assert abs(taxa["MG"] - 1.0) < 1e-9
assert abs(taxa["SP"] - 0.0) < 1e-9
assert abs(taxa["PE"] - 1.0) < 1e-9
assert len(taxa) == 6`,
      { setup: PY_VENDAS, packages: PD, hint: 'A média de uma coluna booleana é a proporção de True.' }),
    `Truque central: a **média de um booleano é uma proporção**. O mesmo vale em SQL com \`AVG(CASE WHEN ... THEN 1 ELSE 0 END)\`.`),
  p('iv-15', 'Primeira compra (pandas)', 2, 5,
    py('Crie `primeira`: um DataFrame com **a primeira venda de cada cliente** (a de menor data), com todas as colunas, ordenado por cliente.',
      r`primeira = vendas.sort_values("data").drop_duplicates("cliente").sort_values("cliente")`,
      r`assert len(primeira) == 9
assert primeira.loc[primeira["cliente"] == "Ana", "pedido"].iloc[0] == 1
assert list(primeira["cliente"]) == sorted(primeira["cliente"])`,
      { setup: PY_VENDAS, packages: PD }),
    `Ordenar e manter a primeira ocorrência com \`drop_duplicates\` é o equivalente pandas do \`ROW_NUMBER() ... = 1\`. Alternativa: \`vendas.loc[vendas.groupby("cliente")["data"].idxmin()]\`.`),
  p('py2-3', 'Clientes sem pedido', 2, 5,
    py('Usando `clientes` e `pedidos`, crie `sem_pedido`: a **lista de nomes** dos clientes que nunca fizeram pedido, em ordem alfabética.',
      r`m = clientes.merge(pedidos, on="cliente_id", how="left", indicator=True)
sem_pedido = sorted(m.loc[m["_merge"] == "left_only", "nome"])`,
      r`assert sem_pedido == ["Davi", "João"]`,
      { setup: r`import pandas as pd
clientes = pd.DataFrame({"cliente_id": [1, 2, 3, 4, 5], "nome": ["Ana", "Bruno", "Carla", "João", "Davi"]})
pedidos = pd.DataFrame({"pedido": [1, 2, 3, 4], "cliente_id": [1, 2, 1, 3], "valor": [100, 250, 80, 40]})`, packages: PD }),
    `**Anti-join** no pandas: \`merge(how="left", indicator=True)\` e filtre \`left_only\`. Alternativa mais curta: \`clientes[~clientes.cliente_id.isin(pedidos.cliente_id)]\`.`),
  p('py2-4', 'Receita por loja e mês', 2, 6,
    py('Crie `tabela`: uma **pivot_table** com os meses (1 a 12) nas linhas, as lojas nas colunas e a **receita total** nos valores.',
      r`tabela = diarias.assign(mes=diarias["data"].dt.month).pivot_table(index="mes", columns="loja", values="receita", aggfunc="sum")`,
      r`assert tabela.shape == (12, 3)
assert abs(tabela.loc[12, "Online"] - diarias[(diarias.data.dt.month == 12) & (diarias.loja == "Online")].receita.sum()) < 1e-6`, S),
    `\`assign\` cria a coluna derivada sem modificar o DataFrame original; \`pivot_table\` faz o GROUP BY de duas chaves e gira o resultado. Formato perfeito para heatmaps.`),
  p('py2-5', 'Acumulado por cliente', 2, 5,
    py('Adicione em `vendas` a coluna `acumulado`: a soma acumulada do `valor` de **cada cliente** em ordem de data.',
      r`vendas = vendas.sort_values(["cliente", "data"])
vendas["acumulado"] = vendas.groupby("cliente")["valor"].cumsum()`,
      r`ana = vendas[vendas.cliente == "Ana"].sort_values("data")
assert list(ana["acumulado"].round(1)) == [5289.9, 6098.8, 6326.8]`,
      { setup: PY_VENDAS, packages: PD }),
    `\`groupby().cumsum()\` é o \`SUM() OVER (PARTITION BY ... ORDER BY ...)\` do pandas. Ordene antes, porque o cumsum segue a ordem atual das linhas.`),
  p('py2-6', 'Média móvel sem pandas', 2, 6,
    py('Escreva `media_movel(valores, janela)` que devolve a lista de médias de cada janela completa, em **O(n)** (mantendo a soma corrente).',
      r`def media_movel(valores, janela):
    if janela <= 0 or janela > len(valores):
        return []
    soma = sum(valores[:janela])
    out = [soma / janela]
    for i in range(janela, len(valores)):
        soma += valores[i] - valores[i - janela]
        out.append(soma / janela)
    return out`,
      r`assert media_movel([1, 2, 3, 4, 5], 2) == [1.5, 2.5, 3.5, 4.5]
assert media_movel([10, 20, 30], 3) == [20.0]
assert media_movel([1, 2], 5) == []`,
      { starter: 'def media_movel(valores, janela):\n    ' }),
    `A janela deslizante evita recalcular a soma inteira a cada passo (que seria O(n·k)): soma o que entra, subtrai o que sai. Esse padrão aparece em muitos problemas de algoritmos.`),
  p('py2-7', 'Analisando logs', 2, 7,
    py('A lista `linhas` tem logs de servidor. Use **regex** para extrair o código HTTP de cada linha e crie `contagem`: um dicionário {código (int): quantidade}.',
      r`import re
contagem = {}
for linha in linhas:
    m = re.search(r'" (\d{3}) ', linha)
    if m:
        cod = int(m.group(1))
        contagem[cod] = contagem.get(cod, 0) + 1`,
      r`assert contagem == {200: 3, 404: 1, 500: 1}`,
      { setup: r`linhas = [
    '10.0.0.1 - - [01/Jan/2024:10:00:00] "GET /home HTTP/1.1" 200 512',
    '10.0.0.2 - - [01/Jan/2024:10:00:01] "GET /api/x HTTP/1.1" 404 128',
    '10.0.0.1 - - [01/Jan/2024:10:00:02] "POST /login HTTP/1.1" 200 64',
    '10.0.0.3 - - [01/Jan/2024:10:00:03] "GET /api/y HTTP/1.1" 500 32',
    '10.0.0.4 - - [01/Jan/2024:10:00:04] "GET /home HTTP/1.1" 200 512',
]`, starter: 'import re\n' }),
    `Extração com regex é cobrada em vagas que lidam com dados brutos. Ancore o padrão no contexto (\`" ddd \`) para não capturar outros números da linha. Em volume, \`pd.Series.str.extract\` vetoriza a mesma ideia.`),
  // ───────── Sênior
  p('py3-1', 'Maior sequência (pandas)', 3, 10,
    py('Na loja **Online**, encontre a **maior sequência de dias consecutivos** com receita acima da **mediana** da loja. Guarde o tamanho em `maior`.',
      r`o = diarias[diarias["loja"] == "Online"].sort_values("data")
acima = o["receita"] > o["receita"].median()
grupo = (acima != acima.shift()).cumsum()
maior = int(acima.groupby(grupo).sum().max())`,
      r`o = diarias[diarias.loja == "Online"].sort_values("data")
a = (o.receita > o.receita.median()).tolist()
best = cur = 0
for x in a:
    cur = cur + 1 if x else 0
    best = max(best, cur)
assert maior == best`, S),
    `Truque de **gaps & islands** no pandas: \`(serie != serie.shift()).cumsum()\` cria um id que muda a cada troca de valor; agrupando por ele, cada "ilha" vira um grupo. Somar os True dá o tamanho de cada sequência.`),
  p('py3-2', 'Tabela de coorte', 3, 12,
    py('Com o DataFrame `pedidos` (cliente, data), monte `coorte`: uma tabela com o **mês da primeira compra** nas linhas, o **número de meses desde a primeira compra** (0, 1, 2...) nas colunas e a **quantidade de clientes ativos** nos valores (use `pivot_table` com `aggfunc="nunique"`).',
      r`pedidos["data"] = pd.to_datetime(pedidos["data"])
pedidos["mes"] = pedidos["data"].dt.to_period("M")
pedidos["coorte"] = pedidos.groupby("cliente")["mes"].transform("min")
pedidos["idade"] = (pedidos["mes"] - pedidos["coorte"]).apply(lambda x: x.n)
coorte = pedidos.pivot_table(index="coorte", columns="idade", values="cliente", aggfunc="nunique")`,
      r`assert coorte.loc[pd.Period("2024-01", "M"), 0] == 3
assert coorte.loc[pd.Period("2024-01", "M"), 1] == 2
assert coorte.loc[pd.Period("2024-02", "M"), 0] == 2`,
      { setup: r`import pandas as pd
pedidos = pd.DataFrame({
    "cliente": ["a", "b", "c", "a", "b", "d", "e", "a", "d"],
    "data": ["2024-01-03", "2024-01-10", "2024-01-20", "2024-02-02", "2024-02-15", "2024-02-05", "2024-02-20", "2024-03-01", "2024-03-09"],
})`, packages: PD }),
    `Análise de **coorte**: (1) mês de cada pedido, (2) coorte = mês do primeiro pedido do cliente (\`transform("min")\`), (3) idade = diferença em meses, (4) pivot contando clientes únicos. Dividindo cada linha pela coluna 0, obtém-se a **curva de retenção**.`),
  p('py3-3', 'Manter o registro mais recente', 3, 6,
    py('O DataFrame `cadastros` tem várias versões por `cliente_id`. Crie `atual` com **apenas a versão mais recente** (maior `atualizado_em`) de cada cliente, ordenado por cliente_id e com índice novo.',
      r`atual = (cadastros.sort_values("atualizado_em")
         .drop_duplicates("cliente_id", keep="last")
         .sort_values("cliente_id")
         .reset_index(drop=True))`,
      r`assert list(atual["cliente_id"]) == [1, 2, 3]
assert list(atual["email"]) == ["ana@novo.com", "bia@x.com", "caio@y.com"]
assert list(atual.index) == [0, 1, 2]`,
      { setup: r`import pandas as pd
cadastros = pd.DataFrame({
    "cliente_id": [1, 2, 1, 3, 2],
    "email": ["ana@velho.com", "bia@antigo.com", "ana@novo.com", "caio@y.com", "bia@x.com"],
    "atualizado_em": pd.to_datetime(["2024-01-01", "2024-01-05", "2024-03-01", "2024-02-01", "2024-02-10"]),
})`, packages: PD }),
    `Deduplicação "última versão vence" (padrão de **SCD tipo 1**). Ordenar pela data e usar \`keep="last"\` é simples e vetorizado. Encadear métodos entre parênteses deixa o código legível.`),
  p('py3-4', 'Achatar JSON aninhado', 3, 10,
    py('Escreva `achatar(d)` que transforma um dicionário aninhado em um dicionário plano com chaves unidas por ponto, por exemplo {"a": {"b": 1}} → {"a.b": 1}. Listas devem ficar como estão.',
      r`def achatar(d, prefixo=""):
    out = {}
    for k, v in d.items():
        chave = f"{prefixo}.{k}" if prefixo else k
        if isinstance(v, dict):
            out.update(achatar(v, chave))
        else:
            out[chave] = v
    return out`,
      r`assert achatar({"id": 1, "cliente": {"nome": "Ana", "end": {"uf": "SP"}}, "itens": [1, 2]}) == {"id": 1, "cliente.nome": "Ana", "cliente.end.uf": "SP", "itens": [1, 2]}
assert achatar({}) == {}`,
      { starter: 'def achatar(d, prefixo=""):\n    ' }),
    `**Recursão** com prefixo acumulado. Este é o problema que \`pd.json_normalize\` resolve; implementá-lo mostra que você entende o que a ferramenta faz. Cuidado com dicionários vazios aninhados: aqui eles somem.`),
  p('py3-5', 'Top 2 por grupo (pandas)', 3, 6,
    py('Crie `top`: para cada `categoria` em `vendas`, as **2 vendas de maior valor**, com as colunas categoria, cliente e valor, ordenado por categoria e valor decrescente, com índice novo.',
      r`top = (vendas.sort_values(["categoria", "valor"], ascending=[True, False])
       .groupby("categoria").head(2)[["categoria", "cliente", "valor"]]
       .reset_index(drop=True))`,
      r`assert len(top) == 8
assert list(top[top.categoria == "Eletrônicos"]["valor"]) == [5479.0, 5289.9]`,
      { setup: PY_VENDAS, packages: PD }),
    `Ordene uma vez e use \`groupby().head(n)\`: muito mais rápido que \`apply\` com \`nlargest\` em cada grupo. Equivale ao \`ROW_NUMBER() <= 2\` do SQL.`),
  p('py3-6', 'Sessionização', 3, 12,
    py('Em `eventos` (usuario, ts), uma nova **sessão** começa quando o usuário fica **mais de 30 minutos** sem eventos. Crie `sessoes`: uma Series {usuario: número de sessões}.',
      r`eventos = eventos.sort_values(["usuario", "ts"])
gap = eventos.groupby("usuario")["ts"].diff()
nova = gap.isna() | (gap > pd.Timedelta(minutes=30))
sessoes = nova.groupby(eventos["usuario"]).sum()`,
      r`assert sessoes["u1"] == 2 and sessoes["u2"] == 3`,
      { setup: r`import pandas as pd
eventos = pd.DataFrame({
    "usuario": ["u1", "u1", "u1", "u2", "u2", "u2", "u2"],
    "ts": pd.to_datetime(["2024-01-01 10:00", "2024-01-01 10:20", "2024-01-01 11:30", "2024-01-01 09:00", "2024-01-01 10:00", "2024-01-01 10:10", "2024-01-01 12:00"]),
})`, packages: PD }),
    `Sessionização: diferença para o evento anterior do mesmo usuário (\`diff\`); uma sessão nova começa no primeiro evento ou após um intervalo maior que o limite. Somar os True dá o número de sessões. A mesma lógica funciona em SQL com \`LAG\`.`),
  p('py3-7', 'Pares que somam o alvo', 3, 6,
    py('Escreva `pares(precos, alvo)` que devolve a lista de pares (i, j), com i < j, cujos preços somam `alvo`, em **O(n)** usando um dicionário.',
      r`def pares(precos, alvo):
    vistos = {}
    out = []
    for j, p in enumerate(precos):
        for i in vistos.get(alvo - p, []):
            out.append((i, j))
        vistos.setdefault(p, []).append(j)
    return out`,
      r`assert pares([10, 20, 30, 40, 10], 50) == [(1, 2), (0, 3), (3, 4)]
assert pares([1, 2], 10) == []`,
      { starter: 'def pares(precos, alvo):\n    ' }),
    `Variação do clássico **two-sum**: em vez de testar todos os pares (O(n²)), guarde os índices de cada valor já visto e procure o complemento (alvo − p) em O(1).`),
  // ───────── Especialista
  p('py4-1', 'Função de teste A/B', 4, 12,
    py('Escreva `teste_ab(conv_a, n_a, conv_b, n_b)` que devolve um dicionário com `lift` (relativo), `z` e `p_valor` (bicaudal) do teste z de duas proporções. Depois aplique aos dados de `ab` e guarde em `resultado`.',
      r`from math import erf, sqrt
def teste_ab(conv_a, n_a, conv_b, n_b):
    pa, pb = conv_a / n_a, conv_b / n_b
    p = (conv_a + conv_b) / (n_a + n_b)
    z = (pb - pa) / sqrt(p * (1 - p) * (1 / n_a + 1 / n_b))
    p_valor = 2 * (1 - 0.5 * (1 + erf(abs(z) / sqrt(2))))
    return {"lift": (pb - pa) / pa, "z": z, "p_valor": p_valor}
g = ab.groupby("grupo")["converteu"].agg(["sum", "count"])
resultado = teste_ab(g.loc["A", "sum"], g.loc["A", "count"], g.loc["B", "sum"], g.loc["B", "count"])`,
      r`r1 = teste_ab(100, 1000, 130, 1000)
assert abs(r1["lift"] - 0.3) < 1e-9
assert abs(r1["z"] - 2.1027) < 1e-3
assert 0.03 < r1["p_valor"] < 0.04
assert resultado["z"] > 0 and resultado["p_valor"] < 0.05`,
      { ...S, starter: 'from math import erf, sqrt\n' }),
    `Encapsular o teste numa função reutilizável e **validá-la com um caso calculado à mão** (100/1000 contra 130/1000, z ≈ 2,10) é exatamente o que se espera de alguém sênior em experimentação.`),
  p('py4-2', 'Bootstrap da diferença', 4, 12,
    py('Estime por **bootstrap** o IC 95% da **diferença de ARPU** (receita por usuário, B − A): 2.000 reamostras com `rng = np.random.default_rng(1)`, reamostrando cada grupo separadamente. Guarde as diferenças em `difs` e o intervalo em `ic` (array com os percentis 2,5 e 97,5).',
      r`a = ab.loc[ab["grupo"] == "A", "valor_compra"].to_numpy()
b = ab.loc[ab["grupo"] == "B", "valor_compra"].to_numpy()
rng = np.random.default_rng(1)
difs = np.array([rng.choice(b, len(b)).mean() - rng.choice(a, len(a)).mean() for _ in range(2000)])
ic = np.percentile(difs, [2.5, 97.5])`,
      r`a = ab[ab.grupo == "A"].valor_compra; b = ab[ab.grupo == "B"].valor_compra
assert len(difs) == 2000
obs = b.mean() - a.mean()
assert ic[0] < obs < ic[1]`, S),
    `Receita por usuário tem distribuição muito assimétrica (muitos zeros), o que torna o bootstrap uma escolha natural. Reamostre **cada grupo separadamente**, preservando os tamanhos. Se o IC não contém 0, a diferença é significativa a 5%.`),
  p('py4-3', 'Tamanho da amostra', 4, 10,
    py('Escreva `n_por_grupo(p1, p2, alfa=0.05, poder=0.8)` que calcula o tamanho de amostra por grupo para detectar a diferença entre duas proporções: n = (z₁₋α/₂ + z_poder)² · (p1(1−p1) + p2(1−p2)) ÷ (p1 − p2)², arredondado **para cima**. Use z = 1,959964 para α = 0,05 e 0,841621 para poder = 0,8.',
      r`from math import ceil
def n_por_grupo(p1, p2, alfa=0.05, poder=0.8):
    z_a = 1.959964
    z_b = 0.841621
    return ceil((z_a + z_b) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p1 - p2) ** 2)`,
      r`assert n_por_grupo(0.10, 0.12) == 3839
assert n_por_grupo(0.10, 0.13) == 1772`,
      { starter: 'from math import ceil\n' }),
    `Calcular o tamanho da amostra **antes** do teste evita experimentos sem poder. Detectar um efeito duas vezes menor exige cerca de **4x mais usuários**, porque n é proporcional a 1/(diferença)². Em produção: \`statsmodels.stats.power\`.`),
  p('py4-4', 'Regressão múltipla na mão', 4, 14,
    py('Ajuste **receita ~ visitantes + pedidos** em `diarias` com `np.linalg.lstsq` (inclua uma coluna de 1s para o intercepto). Guarde os coeficientes em `coef` (intercepto, visitantes, pedidos) e o R² em `r2`.',
      r`X = np.column_stack([np.ones(len(diarias)), diarias["visitantes"], diarias["pedidos"]])
y = diarias["receita"].to_numpy(dtype=float)
coef, *_ = np.linalg.lstsq(X, y, rcond=None)
previsto = X @ coef
r2 = 1 - ((y - previsto) ** 2).sum() / ((y - y.mean()) ** 2).sum()`,
      r`X = np.column_stack([np.ones(len(diarias)), diarias.visitantes, diarias.pedidos]); y = diarias.receita.to_numpy(dtype=float)
c, *_ = np.linalg.lstsq(X, y, rcond=None)
assert np.allclose(coef, c)
r2_simples = np.corrcoef(diarias.visitantes, y)[0, 1] ** 2
assert r2 > r2_simples`, S),
    `Mínimos quadrados em forma matricial: β = argmin ||Xβ − y||². Pedidos explicam a receita muito melhor que visitantes, já que receita ≈ pedidos × ticket. Discuta **multicolinearidade**: visitantes e pedidos são correlacionados, e os coeficientes individuais ficam instáveis.`),
  p('py4-5', 'Média e variância em streaming', 4, 12,
    py('Implemente a classe `Welford` com `atualizar(x)` e as propriedades `media` e `variancia` (amostral) usando o **algoritmo de Welford**, que processa um valor por vez sem guardar a lista.',
      r`class Welford:
    def __init__(self):
        self.n = 0
        self._media = 0.0
        self._m2 = 0.0
    def atualizar(self, x):
        self.n += 1
        delta = x - self._media
        self._media += delta / self.n
        self._m2 += delta * (x - self._media)
    @property
    def media(self):
        return self._media
    @property
    def variancia(self):
        return self._m2 / (self.n - 1) if self.n > 1 else 0.0`,
      r`import statistics
w = Welford()
dados = [10, 12, 9, 15, 11, 13]
for x in dados:
    w.atualizar(x)
assert abs(w.media - statistics.mean(dados)) < 1e-12
assert abs(w.variancia - statistics.variance(dados)) < 1e-12`,
      { starter: 'class Welford:\n    ' }),
    `Welford é **numericamente estável** (evita o cancelamento catastrófico da fórmula E[X²] − E[X]² com números grandes) e funciona em **streaming**, com memória O(1). Aparece em entrevistas de engenharia de dados e sistemas de métricas em tempo real.`),
  p('py4-6', 'Par mais correlacionado', 4, 8,
    py('Na matriz de correlação de `visitantes`, `pedidos` e `receita` (tabela `diarias`), encontre o **par de colunas distintas** com maior correlação. Guarde em `par` como tupla ordenada alfabeticamente e o valor em `valor`.',
      r`c = diarias[["visitantes", "pedidos", "receita"]].corr()
melhor = None
for i in c.columns:
    for j in c.columns:
        if i < j and (melhor is None or c.loc[i, j] > melhor[2]):
            melhor = (i, j, c.loc[i, j])
par = (melhor[0], melhor[1])
valor = melhor[2]`,
      r`c = diarias[["visitantes", "pedidos", "receita"]].corr()
assert par == ("pedidos", "visitantes")
assert abs(valor - c.loc["pedidos", "visitantes"]) < 1e-12`, S),
    `Percorrer só o **triângulo superior** (i < j) evita a diagonal (sempre 1) e pares repetidos. Em matrizes grandes: \`c.where(np.triu(np.ones(c.shape), 1).astype(bool)).stack().idxmax()\`.`),
  p('py4-7', 'Detector de anomalias reutilizável', 4, 12,
    py('Escreva `anomalias(serie, janela=28, limite=3)` que devolve os **índices** da Series onde o z-score contra a janela **anterior** (média e desvio móveis deslocados 1) passa do limite em módulo. Aplique à receita **total diária** (soma das lojas, indexada pela data) e guarde em `dias`.',
      r`def anomalias(serie, janela=28, limite=3):
    media = serie.rolling(janela).mean().shift(1)
    desvio = serie.rolling(janela).std().shift(1)
    z = (serie - media) / desvio
    return list(serie.index[z.abs() > limite])
total = diarias.groupby("data")["receita"].sum()
dias = anomalias(total)`,
      r`s = pd.Series([10.0] * 30 + [100.0] + [10.5, 9.5] * 5)
s.iloc[::2] += 0.5
r1 = anomalias(s, janela=10)
assert 30 in r1
t = diarias.groupby("data").receita.sum()
assert isinstance(dias, list) and len(dias) >= 1`, S),
    `Transformar uma análise em **função testável**, com parâmetros e um caso sintético de teste (uma série com um pico conhecido), é o que separa o especialista de quem só roda notebooks.`),
];

export const INTERVIEW = [...INTERVIEW_SQL, ...INTERVIEW_PY];
