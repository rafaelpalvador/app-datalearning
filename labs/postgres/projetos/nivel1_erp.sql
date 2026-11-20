-- Gerado por scripts/gerar-lab.mjs (escala 10). Não edite: rode o gerador de novo.
-- Nível 1 · Projeto: modelagem e DDL de um ERP financeiro
-- Cada bloco é independente: rode um de cada vez no psql (\i) ou no DBeaver.

-- ===== Exemplo: Modelo de referência para conferir depois =====
BEGIN;
CREATE TABLE erp_contratos (
  id            bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publico_id    uuid          NOT NULL DEFAULT uuidv7() UNIQUE,          -- id exposto em APIs
  cliente_id    bigint        NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
  valor_mensal  numeric(14,2) NOT NULL CHECK (valor_mensal > 0),
  vigencia      daterange     NOT NULL,                                   -- [inicio, fim)
  status        text          NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','encerrado'))
);
CREATE TABLE erp_faturas (
  id               bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id       bigint        NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
  contrato_id      bigint        REFERENCES erp_contratos (id) ON DELETE RESTRICT,   -- opcional
  valor            numeric(14,2) NOT NULL CHECK (valor > 0),
  emissao          date          NOT NULL,
  vencimento       date          NOT NULL,
  CONSTRAINT fatura_datas CHECK (vencimento >= emissao)
);
SELECT table_name, count(*) AS colunas
FROM information_schema.columns WHERE table_name LIKE 'erp_%' GROUP BY table_name;
ROLLBACK;

-- ===== Passo 3: Parte 1 — pagamentos parciais. Crie erp_faturas2 (id bigint IDENTITY PK, valor numeric(14,2) NOT NULL CHECK > 0) e erp_parcelas (id bigint IDENTITY PK, fatura_id bigint NOT NULL FK para erp_faturas2 com ON DELETE RESTRICT, valor numeric(14,2) NOT NULL CHECK > 0, pago_em timestamptz NOT NULL). A corr =====
BEGIN;
CREATE TABLE erp_faturas2 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  valor numeric(14,2) NOT NULL CHECK (valor > 0)
);
CREATE TABLE erp_parcelas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fatura_id bigint NOT NULL REFERENCES erp_faturas2 (id) ON DELETE RESTRICT,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  pago_em timestamptz NOT NULL
);
-- conferência usada pelo app:
SELECT conrelid::regclass AS tabela, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid IN ('erp_faturas2'::regclass, 'erp_parcelas'::regclass) AND contype IN ('c','f') ORDER BY 1, 2, 3
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 4: Parte 2 — auditoria. Crie erp_auditoria com: id bigint IDENTITY PK; tabela text NOT NULL; registro_id bigint NOT NULL; operacao text NOT NULL com CHECK em ('INSERT','UPDATE','DELETE'); antes jsonb; depois jsonb; usuario text NOT NULL DEFAULT current_user; ocorrido_em timestamptz NOT NULL DEFAULT now =====
BEGIN;
CREATE TABLE erp_auditoria (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela text NOT NULL,
  registro_id bigint NOT NULL,
  operacao text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  antes jsonb,
  depois jsonb,
  usuario text NOT NULL DEFAULT current_user,
  ocorrido_em timestamptz NOT NULL DEFAULT now()
);
-- conferência usada pelo app:
SELECT column_name, data_type, is_nullable, column_default IS NOT NULL AS tem_default FROM information_schema.columns WHERE table_name = 'erp_auditoria' ORDER BY ordinal_position
ROLLBACK;  -- troque por COMMIT para manter

-- ===== Passo 5: Parte 3 — regra "não pagar mais que a fatura". Uma constraint CHECK não enxerga outras linhas, então a regra precisa de outra técnica. Escreva a consulta de verificação que lista as faturas de faturas (tabela do curso) cujo pago_em é anterior à emissao (dados inconsistentes). Mostre id, emissao, pag =====
BEGIN;
SELECT id, emissao, pago_em FROM faturas WHERE pago_em < emissao;
ROLLBACK;  -- troque por COMMIT para manter
