-- Nível 3 · prepara o teste de estresse do ledger (rode uma vez):
--   docker compose exec postgres psql -U aluno -d erp -f /bench/ledger_setup.sql
CREATE TABLE IF NOT EXISTS transferencias (
  chave text PRIMARY KEY,
  origem int NOT NULL, destino int NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  feita_em timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION transferir(p_chave text, p_origem int, p_destino int, p_valor numeric)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_saldo numeric;
BEGIN
  IF p_valor <= 0 OR p_origem = p_destino THEN RETURN 'invalida'; END IF;
  INSERT INTO transferencias (chave, origem, destino, valor) VALUES (p_chave, p_origem, p_destino, p_valor)
  ON CONFLICT (chave) DO NOTHING;
  IF NOT FOUND THEN RETURN 'repetida'; END IF;
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

-- Foto do estado antes do teste
CREATE TABLE IF NOT EXISTS ledger_antes AS SELECT sum(saldo) AS total FROM contas;
