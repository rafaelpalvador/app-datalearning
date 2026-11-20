-- Gerado por scripts/gerar-lab.mjs (escala 10). Não edite: rode o gerador de novo.
-- Nível 2 · Projeto: saneamento de dados e relatórios gerenciais
-- Cada bloco é independente: rode um de cada vez no psql (\i) ou no DBeaver.

-- ===== Exemplo: Staging com tipos corretos e motivo de rejeição =====
BEGIN;
WITH limpa AS (
  SELECT linha, pedido_ext,
         nullif(lower(trim(email)), '') AS email,
         CASE
           WHEN data_txt ~ '^\d{4}-\d{2}-\d{2}$' AND pg_input_is_valid(data_txt, 'date') THEN data_txt::date
           WHEN data_txt ~ '^\d{2}/\d{2}/\d{4}$'
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
FROM limpa;
ROLLBACK;

-- ===== Passo 4: Relatório 1 — ticket médio por canal (pedidos não cancelados nem devolvidos): receita = soma de quantidade × preco_unitario × (1 − desconto/100). Colunas canal, pedidos, receita, ticket_medio (2 casas). =====
BEGIN;
SELECT p.canal, count(DISTINCT p.id) AS pedidos, round(sum(i.quantidade * i.preco_unitario * (1 - i.desconto / 100)), 2) AS receita, round(sum(i.quantidade * i.preco_unitario * (1 - i.desconto / 100)) / count(DISTINCT p.id), 2) AS ticket_medio FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id WHERE p.status NOT IN ('cancelado', 'devolvido') GROUP BY p.canal;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 5: Relatório 2 — taxa de cancelamento por mês de 2025 (date_trunc no criado_em): colunas mes (date), pedidos, cancelados, taxa (% com 2 casas). Ordene por mês. =====
BEGIN;
SELECT date_trunc('month', criado_em)::date AS mes, count(*) AS pedidos, count(*) FILTER (WHERE status = 'cancelado') AS cancelados, round(100.0 * count(*) FILTER (WHERE status = 'cancelado') / count(*), 2) AS taxa FROM pedidos WHERE criado_em >= '2025-01-01' AND criado_em < '2026-01-01' GROUP BY 1 ORDER BY 1;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 6: Relatório 3 — curva ABC: receita por produto (pedidos entregues), percentual acumulado da receita do maior para o menor e a classe (A até 80%, B até 95%, C acima). Mostre só a contagem de produtos por classe: colunas classe, produtos. Dica: sum(receita) OVER (ORDER BY receita DESC) dá o acumulado. =====
BEGIN;
WITH r AS (SELECT i.produto_id, sum(i.quantidade * i.preco_unitario) AS receita FROM itens_pedido i JOIN pedidos p ON p.id = i.pedido_id WHERE p.status = 'entregue' GROUP BY i.produto_id), a AS (SELECT produto_id, 100.0 * sum(receita) OVER (ORDER BY receita DESC, produto_id) / sum(receita) OVER () AS acumulado FROM r) SELECT CASE WHEN acumulado <= 80 THEN 'A' WHEN acumulado <= 95 THEN 'B' ELSE 'C' END AS classe, count(*) AS produtos FROM a GROUP BY 1;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 7: Relatório 4 — recorrência: percentual de clientes que compraram (pedido entregue) e têm 2 ou mais pedidos entregues. Coluna recorrencia_pct (2 casas). =====
BEGIN;
SELECT round(100.0 * count(*) FILTER (WHERE n >= 2) / count(*), 2) AS recorrencia_pct FROM (SELECT cliente_id, count(*) AS n FROM pedidos WHERE status = 'entregue' GROUP BY cliente_id) t;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 8: Saneamento — deduplicação: na importacao_vendas, mantenha só a primeira linha (menor linha) de cada pedido_ext usando DISTINCT ON e conte quantas sobram. Coluna pedidos_unicos. =====
BEGIN;
SELECT count(*) AS pedidos_unicos FROM (SELECT DISTINCT ON (pedido_ext) linha FROM importacao_vendas ORDER BY pedido_ext, linha) t;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 9: Saneamento — valores: converta valor_txt para numeric (remova tudo que não for dígito ou vírgula/ponto com regexp_replace, troque vírgula por ponto) e mostre a soma dos valores válidos, numa coluna total (2 casas). =====
BEGIN;
SELECT round(sum(nullif(replace(regexp_replace(coalesce(valor_txt, ''), '[^0-9,.]', '', 'g'), ',', '.'), '')::numeric), 2) AS total FROM importacao_vendas;
ROLLBACK;  -- troque por COMMIT para manter
