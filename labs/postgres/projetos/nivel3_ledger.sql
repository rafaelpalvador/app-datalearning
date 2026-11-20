-- Gerado por scripts/gerar-lab.mjs (escala 10). Não edite: rode o gerador de novo.
-- Nível 3 · Projeto: ledger financeiro à prova de race conditions
-- Cada bloco é independente: rode um de cada vez no psql (\i) ou no DBeaver.

-- ===== Exemplo: A função de transferência de referência =====
BEGIN;
CREATE TABLE transferencias (
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
SELECT sum(saldo) AS total_depois FROM contas;
ROLLBACK;

-- ===== Passo 3: Parte 1 — invariante. Mostre se existe alguma conta com saldo negativo (coluna contas_negativas, deve ser 0) e a soma total dos saldos (coluna total). Esta é a consulta que você roda depois do teste de estresse. =====
BEGIN;
SELECT count(*) FILTER (WHERE saldo < 0) AS contas_negativas, sum(saldo) AS total FROM contas;
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 4: Parte 2 — função. Crie transferir(p_origem int, p_destino int, p_valor numeric) RETURNS void em PL/pgSQL que: lança exceção se p_valor <= 0; trava as duas contas em ordem de id com FOR UPDATE; lança exceção saldo insuficiente se a origem não tiver saldo; atualiza os dois saldos e grava os dois lança =====
BEGIN;
CREATE FUNCTION transferir(p_origem int, p_destino int, p_valor numeric) RETURNS void LANGUAGE plpgsql AS $$
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
SELECT sum(saldo) AS total FROM contas;
-- conferência usada pelo app:
SELECT (SELECT sum(saldo) FROM contas) AS total, (SELECT count(*) FROM lancamentos WHERE descricao = 'transferência') AS lancamentos_novos, (SELECT count(*) FROM pg_proc WHERE proname = 'transferir') AS funcao
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 5: Parte 3 — estresse sequencial. Usando a função de referência simplificada abaixo (já no código inicial), execute 200 transferências de 3,00 entre contas aleatórias com um bloco DO, capturando a exceção de saldo insuficiente (EXCEPTION WHEN raise_exception THEN NULL). Depois mostre contas_negativas e =====
BEGIN;
CREATE FUNCTION transferir(p_origem int, p_destino int, p_valor numeric) RETURNS void LANGUAGE plpgsql AS $$
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
SELECT count(*) FILTER (WHERE saldo < 0) AS contas_negativas, sum(saldo) AS total FROM contas;
ROLLBACK;  -- troque por COMMIT para manter
