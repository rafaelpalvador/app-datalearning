-- Gerado por scripts/gerar-lab.mjs (escala 10). Não edite: rode o gerador de novo.
-- Nível 4 · Projeto: tuning de um sistema lento e plano de recuperação
-- Cada bloco é independente: rode um de cada vez no psql (\i) ou no DBeaver.

-- ===== Exemplo: Diagnóstico inicial: onde estão os Seq Scans =====
BEGIN;
EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)
SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 9876 ORDER BY criado_em DESC LIMIT 20;
ROLLBACK;

-- ===== Passo 3: Consulta 1. Crie o índice composto que atende SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 9876 ORDER BY criado_em DESC LIMIT 20 tanto no filtro quanto na ordenação (igualdade primeiro, depois a ordenação). =====
BEGIN;
CREATE INDEX ix_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);
-- conferência usada pelo app:
CREATE FUNCTION pg_temp.plano(q text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE r text; acc text := '';
BEGIN PERFORM set_config('enable_seqscan', 'off', true);
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP acc := acc || r || E'\n'; END LOOP; RETURN acc; END $f$;
SELECT pg_temp.plano($q$SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 9876 ORDER BY criado_em DESC LIMIT 20$q$) ~ 'Index' AS plano_ok, EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'pedidos' AND indexdef ~ '\(cliente_id, criado_em') AS composto;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 4: Consulta 4. Faturas vencidas em aberto: SELECT id, cliente_id, vencimento, valor FROM faturas WHERE pago_em IS NULL AND vencimento < '2025-12-01' ORDER BY vencimento. Crie um índice parcial que atenda a consulta. =====
BEGIN;
CREATE INDEX ix_faturas_abertas ON faturas (vencimento) WHERE pago_em IS NULL;
-- conferência usada pelo app:
CREATE FUNCTION pg_temp.plano(q text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE r text; acc text := '';
BEGIN PERFORM set_config('enable_seqscan', 'off', true);
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP acc := acc || r || E'\n'; END LOOP; RETURN acc; END $f$;
SELECT pg_temp.plano($q$SELECT id, cliente_id, vencimento, valor FROM faturas WHERE pago_em IS NULL AND vencimento < '2025-12-01' ORDER BY vencimento$q$) ~ 'Index' AS plano_ok, (SELECT count(*) FROM pg_indexes WHERE tablename = 'faturas' AND indexdef ~ 'WHERE') > 0 AS parcial;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 5: Consulta 5. SELECT i., p.nome FROM itens_pedido i JOIN produtos p ON p.id = i.produto_id WHERE i.pedido_id = 12345 já está rápida? Verifique: a PK de itens_pedido começa por pedido_id. Mostre a definição da PK de itens_pedido (coluna indexdef, de pg_indexes, filtrando por indexname = 'itens_pedido_p =====
BEGIN;
SELECT indexdef FROM pg_indexes WHERE indexname = 'itens_pedido_pkey';
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 6: Consulta 6. Busca de produto por trecho: SELECT id, nome FROM produtos WHERE nome ILIKE '%fone%'. Crie o índice adequado. =====
BEGIN;
CREATE INDEX ix_produtos_nome_trgm ON produtos USING gin (nome gin_trgm_ops);
-- conferência usada pelo app:
CREATE FUNCTION pg_temp.plano(q text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE r text; acc text := '';
BEGIN PERFORM set_config('enable_seqscan', 'off', true);
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP acc := acc || r || E'\n'; END LOOP; RETURN acc; END $f$;
SELECT pg_temp.plano($q$SELECT id, nome FROM produtos WHERE nome ILIKE '%fone%'$q$) ~ 'Index' AS plano_ok;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 7: Fechamento. Depois de criar os índices das consultas 1, 3 (e-mail em minúsculas), 4 e 6 numa única execução, liste os índices criados por você nas tabelas pedidos, clientes, faturas e produtos que não são PK nem UNIQUE: colunas tablename, indexname. Use os nomes ix_pedidos_cliente_data, ix_clientes_ =====
BEGIN;
CREATE INDEX ix_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);
CREATE INDEX ix_clientes_email_lower ON clientes (lower(email));
CREATE INDEX ix_faturas_abertas ON faturas (vencimento) WHERE pago_em IS NULL;
CREATE INDEX ix_produtos_nome_trgm ON produtos USING gin (nome gin_trgm_ops);
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('pedidos', 'clientes', 'faturas', 'produtos') AND indexname LIKE 'ix\_%';
ROLLBACK;  -- troque por COMMIT para manter
