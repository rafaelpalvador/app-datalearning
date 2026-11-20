# Desafio do Nível 3 — 100 transferências simultâneas sem saldo negativo

```bash
docker compose exec postgres psql -U aluno -d erp -f /bench/ledger_setup.sql
docker compose exec postgres pgbench -U aluno -d erp -n -c 100 -j 8 -T 60 -f /bench/transferencias.pgbench
docker compose exec postgres psql -U aluno -d erp -f /bench/ledger_invariantes.sql
```
- Erros "saldo insuficiente" no pgbench são esperados (a regra funcionando).
- As três colunas de `ledger_invariantes.sql` devem ser `t`.
- Experimente quebrar de propósito: remova o `ORDER BY id` do `FOR UPDATE` e veja deadlocks no log
  (`docker compose logs postgres | grep -i deadlock`); remova o `FOR UPDATE` e veja a soma mudar
  se tirar também o CHECK.
- Repita via PgBouncer (porta 6432, modo transaction) com `-h pgbouncer -p 5432` e compare.
