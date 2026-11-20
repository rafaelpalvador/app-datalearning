# Incidente 3 — CPU a 100% por índice ausente

1. Simule o "deploy" da tela de histórico de clientes com 50 sessões:
```bash
docker compose exec postgres pgbench -U aluno -d erp -n -c 50 -j 4 -T 120 -f /bench/cpu_sem_indice.pgbench
```
2. Em outro terminal, investigue enquanto roda:
```sql
SELECT count(*), state, left(query, 50) FROM pg_stat_activity GROUP BY 2, 3 ORDER BY 1 DESC;
SELECT calls, round(total_exec_time) AS ms_total, round(mean_exec_time, 1) AS ms_medio, left(query, 70)
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 5;
EXPLAIN (ANALYZE, BUFFERS) SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 123 ORDER BY criado_em DESC LIMIT 20;
```
3. Corrija **sem parar a escrita**:
```sql
CREATE INDEX CONCURRENTLY ix_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);
```
4. Rode o pgbench de novo e compare `latency average` e TPS. Registre antes/depois no runbook.
