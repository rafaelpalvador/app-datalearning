-- Gerado por scripts/gerar-lab.mjs (escala 10). Não edite: rode o gerador de novo.
-- Nível 5 · Projeto final: da transação ao dashboard
-- Cada bloco é independente: rode um de cada vez no psql (\i) ou no DBeaver.

-- ===== Passo 2: Etapa 1 — dimensão de data. Gere dim_dia com uma linha por dia de 2025 (data date PK, mes int, trimestre int, fim_de_semana boolean) e mostre quantos dias de fim de semana há (coluna fins_de_semana). =====
BEGIN;
CREATE TABLE dim_dia AS SELECT d::date AS data, extract(month FROM d)::int AS mes, extract(quarter FROM d)::int AS trimestre, extract(isodow FROM d) IN (6, 7) AS fim_de_semana FROM generate_series('2025-01-01'::date, '2025-12-31'::date, interval '1 day') d;
ALTER TABLE dim_dia ADD PRIMARY KEY (data);
SELECT count(*) FILTER (WHERE fim_de_semana) AS fins_de_semana FROM dim_dia;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 3: Etapa 2 e 3 — SCD2 + fato. Crie dim_cli_h (cliente_key IDENTITY, cliente_id, segmento, valido_de date, valido_ate date) com duas versões para cada cliente de id ≤ 100: o segmento atual valendo de 2024-01-01 a 2025-06-30, e corporativo de 2025-07-01 a 9999-12-31. Depois some a receita (quantidade × p =====
BEGIN;
CREATE TABLE dim_cli_h (cliente_key bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, cliente_id bigint NOT NULL, segmento text NOT NULL, valido_de date NOT NULL, valido_ate date NOT NULL);
INSERT INTO dim_cli_h (cliente_id, segmento, valido_de, valido_ate) SELECT id, segmento, '2024-01-01', '2025-06-30' FROM clientes WHERE id <= 100;
INSERT INTO dim_cli_h (cliente_id, segmento, valido_de, valido_ate) SELECT id, 'corporativo', '2025-07-01', '9999-12-31' FROM clientes WHERE id <= 100;
SELECT d.segmento, sum(i.quantidade * i.preco_unitario) AS receita
FROM pedidos p
JOIN itens_pedido i ON i.pedido_id = p.id
JOIN dim_cli_h d ON d.cliente_id = p.cliente_id AND p.criado_em::date BETWEEN d.valido_de AND d.valido_ate
WHERE p.status = 'entregue' AND p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01' AND p.cliente_id <= 100
GROUP BY d.segmento;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 4: Etapa 4 — snapshot acumulado. Crie fato_pedido_ciclo com uma linha por pedido de 2025: pedido_id, comprado_em (criado_em), pago_em (o primeiro pagamento aprovado, ou NULL; dica: junte com uma agregação de pagamentos por pedido em vez de uma subconsulta por linha, pois pagamentos.pedido_id não tem ín =====
BEGIN;
CREATE TABLE fato_pedido_ciclo AS
SELECT p.id AS pedido_id, p.canal, p.criado_em AS comprado_em, pg.pago_em
FROM pedidos p
LEFT JOIN (SELECT pedido_id, min(pago_em) AS pago_em FROM pagamentos WHERE status = 'aprovado' GROUP BY pedido_id) pg ON pg.pedido_id = p.id
WHERE p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01';
SELECT canal, round(avg(extract(epoch FROM pago_em - comprado_em) / 3600)::numeric, 1) AS horas_ate_pagar
FROM fato_pedido_ciclo WHERE pago_em IS NOT NULL GROUP BY canal;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 5: Etapa 5 — métricas do dashboard. Para cada mês de 2025, a partir dos pedidos entregues: mes (date), receita (2 casas), clientes_ativos (distintos), ticket_medio (receita / pedidos, 2 casas) e crescimento_pct (variação da receita contra o mês anterior, em %, 1 casa; NULL em janeiro). Ordene por mês. =====
BEGIN;
WITH m AS (
  SELECT date_trunc('month', p.criado_em)::date AS mes, sum(i.quantidade * i.preco_unitario) AS receita,
         count(DISTINCT p.cliente_id) AS clientes_ativos, count(DISTINCT p.id) AS pedidos
  FROM pedidos p JOIN itens_pedido i ON i.pedido_id = p.id
  WHERE p.status = 'entregue' AND p.criado_em >= '2025-01-01' AND p.criado_em < '2026-01-01'
  GROUP BY 1
)
SELECT mes, round(receita, 2) AS receita, clientes_ativos, round(receita / pedidos, 2) AS ticket_medio,
       round(100 * (receita - lag(receita) OVER (ORDER BY mes)) / lag(receita) OVER (ORDER BY mes), 1) AS crescimento_pct
FROM m ORDER BY mes;
ROLLBACK;  -- troque por COMMIT para manter
