# Incidente 2 — tabela apagada por engano: recuperação até o segundo anterior (PITR)

O laboratório já arquiva o WAL em `/arquivo_wal` (veja `conf/postgresql.conf`).

## 1. Backup base (antes do "desastre")
```bash
docker compose exec postgres pg_basebackup -U aluno -D /backups/base -Ft -z -P -X none
```

## 2. Gere atividade e cometa o erro
```bash
docker compose exec postgres psql -U aluno -d erp -c "INSERT INTO lancamentos (conta_id, valor, descricao, criado_em) VALUES (1, 10, 'antes do erro', now());"
docker compose exec postgres psql -U aluno -d erp -c "SELECT now();"     # ANOTE este horário
docker compose exec postgres psql -U aluno -d erp -c "DROP TABLE faturas;"
docker compose exec postgres psql -U aluno -d erp -c "SELECT pg_switch_wal();"   # força o arquivamento do WAL atual
```

## 3. Restaure num servidor separado até o horário anotado
```bash
docker compose --profile restauracao up -d postgres-restaurado
docker compose stop postgres-restaurado
docker compose run --rm --entrypoint bash postgres-restaurado -c '
  set -e
  D=/var/lib/postgresql/18/docker
  rm -rf "$D" && mkdir -p "$D" && cd "$D"
  tar -xzf /backups/base/base.tar.gz
  echo "restore_command = '"'"'cp /arquivo_wal/%f %p'"'"'"            >> postgresql.auto.conf
  echo "recovery_target_time = '"'"'COLE_O_HORARIO_AQUI'"'"'"         >> postgresql.auto.conf
  echo "recovery_target_action = '"'"'pause'"'"'"                     >> postgresql.auto.conf
  touch recovery.signal
  chown -R postgres:postgres "$D" && chmod 700 "$D"'
docker compose start postgres-restaurado
docker compose logs -f postgres-restaurado      # espere "recovery stopping before ..." / "pausing at the end of recovery"
```

## 4. Confira e devolva só a tabela
```bash
docker compose exec postgres-restaurado psql -U aluno -d erp -c "SELECT count(*) FROM faturas;"   # voltou!
docker compose exec postgres-restaurado pg_dump -U aluno -d erp -t faturas -Fc -f /tmp/faturas.dump
docker compose cp postgres-restaurado:/tmp/faturas.dump ./faturas.dump
docker compose cp ./faturas.dump postgres:/tmp/faturas.dump
docker compose exec postgres pg_restore -U aluno -d erp /tmp/faturas.dump
```
Meça quanto tempo levou do passo 3 ao 4: esse é o seu **RTO** real. O intervalo entre o último WAL arquivado e o erro é o **RPO**.
