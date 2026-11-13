import { sql, py } from './helpers.js';
import { PY_VENDAS } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];

// Problemas clássicos de entrevista para vagas de dados, usando o banco da DataShop.
// minutes = tempo-alvo; resolver dentro dele vale bônus de XP.
const p = (id, title, level, minutes, step) => ({ id, title, level, minutes, step });

export const INTERVIEW = [
  p('iv-1', 'Segundo produto mais caro', 'fácil', 4,
    sql('Retorne **nome** e **preco** do produto com o **segundo maior preço** (sem usar LIMIT/OFFSET).',
      'SELECT nome, preco FROM produtos WHERE preco = (SELECT MAX(preco) FROM produtos WHERE preco < (SELECT MAX(preco) FROM produtos));',
      { hint: 'O maior preço entre os que são menores que o maior preço.' })),
  p('iv-2', 'Cidades com mais de um cliente', 'fácil', 3,
    sql('Liste as **cidades** com mais de um cliente e a quantidade (colunas cidade, qtd), da maior quantidade para a menor e, no empate, por cidade A→Z.',
      'SELECT cidade, COUNT(*) AS qtd FROM clientes WHERE cidade IS NOT NULL GROUP BY cidade HAVING COUNT(*) > 1 ORDER BY qtd DESC, cidade;',
      { ordered: true })),
  p('iv-3', 'Estoque zerado', 'fácil', 2,
    sql('Liste nome e preço dos produtos **sem estoque** que custam **mais de 100**.',
      'SELECT nome, preco FROM produtos WHERE estoque = 0 AND preco > 100;')),
  p('iv-4', 'Acima da média do departamento', 'médio', 5,
    sql('Liste nome, departamento e salário dos funcionários que ganham **mais que a média do próprio departamento**.',
      'SELECT nome, departamento, salario FROM funcionarios f WHERE salario > (SELECT AVG(salario) FROM funcionarios g WHERE g.departamento = f.departamento);',
      { hint: 'Subquery correlacionada — ou AVG(salario) OVER (PARTITION BY departamento) numa CTE.' })),
  p('iv-5', 'Primeira compra de cada cliente', 'médio', 6,
    sql('Para cada cliente que comprou, mostre **nome**, a **data do primeiro pedido** e o **id desse pedido** (colunas nome, data_pedido, pedido_id).',
      'WITH r AS (SELECT p.*, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY data_pedido) AS rn FROM pedidos p) SELECT c.nome, r.data_pedido, r.id AS pedido_id FROM r JOIN clientes c ON c.id = r.cliente_id WHERE rn = 1;')),
  p('iv-6', 'Participação por categoria', 'médio', 5,
    sql('Mostre cada categoria e seu **percentual da receita total** (quantidade × preço de todos os itens), com 2 casas, do maior para o menor. Colunas: categoria, pct.',
      'SELECT pr.categoria, ROUND(100.0 * SUM(i.quantidade * i.preco_unitario) / (SELECT SUM(quantidade * preco_unitario) FROM itens_pedido), 2) AS pct FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id GROUP BY pr.categoria ORDER BY pct DESC;',
      { ordered: true })),
  p('iv-7', 'Melhor cliente por estado', 'médio', 7,
    sql('Para cada **estado**, mostre o cliente com **maior faturamento** (todos os pedidos). Colunas: estado, nome, faturamento.',
      'WITH f AS (SELECT c.estado, c.nome, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM clientes c JOIN pedidos p ON p.cliente_id = c.id JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY c.id, c.estado, c.nome), r AS (SELECT *, RANK() OVER (PARTITION BY estado ORDER BY faturamento DESC) AS rk FROM f) SELECT estado, nome, faturamento FROM r WHERE rk = 1;')),
  p('iv-8', 'Intervalo médio entre compras', 'médio', 8,
    sql('Para clientes com **2 ou mais pedidos**, calcule o **intervalo médio em dias** entre pedidos consecutivos (1 casa decimal). Colunas: cliente_id, media_dias.',
      'WITH g AS (SELECT cliente_id, julianday(data_pedido) - julianday(LAG(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido)) AS dias FROM pedidos) SELECT cliente_id, ROUND(AVG(dias), 1) AS media_dias FROM g WHERE dias IS NOT NULL GROUP BY cliente_id;',
      { hint: 'LAG(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido) e julianday().' })),
  p('iv-9', 'Mediana do ticket', 'difícil', 8,
    sql('Calcule a **mediana do valor dos pedidos** (soma de quantidade × preço por pedido). O SQLite não tem MEDIAN: use window functions. Uma coluna, 2 casas.',
      'WITH t AS (SELECT pedido_id, SUM(quantidade * preco_unitario) AS v FROM itens_pedido GROUP BY pedido_id), o AS (SELECT v, ROW_NUMBER() OVER (ORDER BY v) AS rn, COUNT(*) OVER () AS n FROM t) SELECT ROUND(AVG(v), 2) FROM o WHERE rn IN ((n + 1) / 2, (n + 2) / 2);',
      { hint: 'Numere os valores ordenados (ROW_NUMBER) e conte o total (COUNT(*) OVER ()). A mediana é a média das posições (n+1)/2 e (n+2)/2 (divisão inteira).' })),
  p('iv-10', 'Retenção em 60 dias', 'difícil', 9,
    sql('Quantos clientes fizeram um **segundo pedido em até 60 dias** depois do primeiro? Uma coluna com a contagem.',
      'WITH o AS (SELECT cliente_id, data_pedido, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY data_pedido) AS rn FROM pedidos), a AS (SELECT o1.cliente_id FROM o o1 JOIN o o2 ON o2.cliente_id = o1.cliente_id AND o1.rn = 1 AND o2.rn = 2 WHERE julianday(o2.data_pedido) - julianday(o1.data_pedido) <= 60) SELECT COUNT(*) FROM a;')),
  p('iv-11', 'Campeão de vendas por categoria', 'difícil', 8,
    sql('Para cada categoria, mostre o produto com a **maior quantidade vendida** (inclua empates). Colunas: categoria, nome, unidades.',
      'WITH q AS (SELECT pr.categoria, pr.nome, SUM(i.quantidade) AS unidades FROM itens_pedido i JOIN produtos pr ON pr.id = i.produto_id GROUP BY pr.id, pr.categoria, pr.nome), r AS (SELECT *, RANK() OVER (PARTITION BY categoria ORDER BY unidades DESC) AS rk FROM q) SELECT categoria, nome, unidades FROM r WHERE rk = 1;',
      { hint: 'RANK() mantém os empates; ROW_NUMBER() não.' })),
  p('iv-12', 'Crescimento mês a mês', 'difícil', 8,
    sql('Mostre mês (AAAA-MM), faturamento e o **crescimento percentual** em relação ao mês anterior (2 casas; NULL no primeiro mês), ordenado por mês. Colunas: mes, faturamento, crescimento_pct.',
      'WITH m AS (SELECT SUBSTR(p.data_pedido, 1, 7) AS mes, SUM(i.quantidade * i.preco_unitario) AS faturamento FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id GROUP BY mes) SELECT mes, faturamento, ROUND(100.0 * (faturamento - LAG(faturamento) OVER (ORDER BY mes)) / LAG(faturamento) OVER (ORDER BY mes), 2) AS crescimento_pct FROM m ORDER BY mes;',
      { ordered: true })),
  p('iv-13', 'Top 2 clientes (pandas)', 'fácil', 4,
    py('Com o DataFrame `vendas`, crie `top2`: uma Series com a **receita total dos 2 clientes que mais faturaram**, indexada pelo nome do cliente, em ordem decrescente.',
      r`top2 = vendas.groupby("cliente")["valor"].sum().nlargest(2)`,
      r`assert list(top2.index) == ["Ana", "Bruno"]
assert abs(top2.iloc[0] - 6326.8) < 1e-6`,
      { setup: PY_VENDAS, packages: PD })),
  p('iv-14', 'Taxa de cancelamento (pandas)', 'médio', 5,
    py('Crie `taxa`: uma Series com a **proporção de pedidos cancelados por estado** (0 a 1), indexada pelo estado.',
      r`taxa = vendas.assign(canc=vendas["status"] == "cancelado").groupby("estado")["canc"].mean()`,
      r`assert abs(taxa["MG"] - 1.0) < 1e-9
assert abs(taxa["SP"] - 0.0) < 1e-9
assert abs(taxa["PE"] - 1.0) < 1e-9
assert len(taxa) == 6`,
      { setup: PY_VENDAS, packages: PD, hint: 'A média de uma coluna booleana é a proporção de True.' })),
  p('iv-15', 'Primeira compra (pandas)', 'médio', 5,
    py('Crie `primeira`: um DataFrame com **a primeira venda de cada cliente** (a de menor data), com todas as colunas, ordenado por cliente.',
      r`primeira = vendas.sort_values("data").drop_duplicates("cliente").sort_values("cliente")`,
      r`assert len(primeira) == 9
assert primeira.loc[primeira["cliente"] == "Ana", "pedido"].iloc[0] == 1
assert list(primeira["cliente"]) == sorted(primeira["cliente"])`,
      { setup: PY_VENDAS, packages: PD })),
  p('iv-16', 'Frequências sem bibliotecas', 'fácil', 4,
    py('Escreva `frequencias(itens)` que devolve um dicionário com quantas vezes cada item aparece, **sem usar** `collections.Counter`.',
      r`def frequencias(itens):
    contagem = {}
    for item in itens:
        contagem[item] = contagem.get(item, 0) + 1
    return contagem`,
      r`assert frequencias(["SP", "RJ", "SP"]) == {"SP": 2, "RJ": 1}
assert frequencias([]) == {}`,
      { starter: 'def frequencias(itens):\n    ' })),
];
