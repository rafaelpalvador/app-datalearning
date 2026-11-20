# Incidente 1 — "o sistema travou": uma transação esquecida bloqueando todo mundo

Abra **três terminais**.

**Terminal A** (o culpado: alguém abriu uma transação e foi almoçar)
```sql
docker compose exec postgres psql -U aluno -d erp
BEGIN;
UPDATE contas SET saldo = saldo + 1 WHERE id = 1;
-- não faça COMMIT
```

**Terminal B** (a aplicação tentando trabalhar)
```sql
docker compose exec postgres psql -U aluno -d erp
UPDATE contas SET saldo = saldo - 1 WHERE id = 1;   -- fica esperando
```

**Terminal C** (você, de plantão)
```sql
docker compose exec postgres psql -U aluno -d erp
-- quem está bloqueado e por quem?
SELECT pid, pg_blocking_pids(pid) AS bloqueado_por, state, wait_event_type, left(query, 60)
FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;

-- o que a raiz está fazendo e há quanto tempo?
SELECT pid, usename, state, now() - xact_start AS idade, query
FROM pg_stat_activity WHERE pid = <pid_da_raiz>;

-- "idle in transaction": cancelar a consulta não resolve; derrube a sessão
SELECT pg_terminate_backend(<pid_da_raiz>);
```
O terminal B destrava na hora. No terminal A, o próximo comando mostra que a conexão caiu.

**Prevenção (escreva no runbook):** `idle_in_transaction_session_timeout`, `lock_timeout` em migrações,
alerta para transações com mais de 5 minutos (`now() - xact_start`).
