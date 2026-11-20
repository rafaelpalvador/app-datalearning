# Laboratório PostgreSQL do Datum

Ambiente real para os projetos e incidentes do curso **Bancos de Dados com PostgreSQL**:
PostgreSQL 18 (com `pg_stat_statements`, `auto_explain` e arquivamento de WAL), PgBouncer em modo
transaction, Redis e um segundo PostgreSQL para treinar restauração.

## Requisitos
- Docker Desktop (Windows 11/macOS) ou Docker Engine + plugin compose (Linux)
- Um cliente SQL: `psql` (já vem no contêiner), DBeaver, DataGrip ou pgAdmin

## Subir
```bash
cd labs/postgres
docker compose up -d
docker compose logs -f postgres     # a 1ª carga (≈ 4,5 milhões de linhas) leva alguns minutos
docker compose exec postgres psql -U aluno -d erp
```
Conexão nos clientes gráficos: host `localhost`, porta `5432` (direto) ou `6432` (via PgBouncer),
banco `erp`, usuário e senha `aluno`. Redis em `localhost:6379`.

## Tamanho da base
| escala | pedidos | itens de pedido | uso |
|---|---|---|---|
| 1 | 80 mil | 200 mil | a mesma base do app |
| 10 (padrão) | 800 mil | 2 milhões | Níveis 2 e 3 |
| 100 | 8 milhões | 20 milhões | tuning do Nível 4 |

Para trocar: `node scripts/gerar-lab.mjs 100` (na raiz do projeto) e depois `docker compose down -v && docker compose up -d`.

## Conteúdo
- `initdb/`: extensões e a carga da base (gerada a partir de `js/content/pg-dataset.js`, a mesma do app)
- `projetos/`: soluções de referência dos projetos de cada nível, prontas para `\i /projetos/arquivo.sql`
- `bench/`: scripts do `pgbench` (estresse do ledger, carga sem índice)
- `incidentes/`: roteiros de simulação
  1. transação travada bloqueando a aplicação
  2. tabela apagada e recuperada com PITR
  3. CPU a 100% por índice ausente
  4. 100 transferências simultâneas no ledger

> Senhas fixas e portas abertas servem só para estudo na sua máquina. Não exponha este ambiente na internet.
