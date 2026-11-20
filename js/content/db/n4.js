// Trilha Bancos de Dados (PostgreSQL) — Nível 4: internals, performance e operação em produção
import { theory, quiz, order, fill, pgsql, debugPg, exPg } from '../helpers.js';

// Função temporária usada pelos corretores para olhar o plano de execução de uma consulta.
// Desliga o Seq Scan: a pergunta é "existe um índice que serve a esta consulta?" (as tabelas do app
// são pequenas, e o otimizador às vezes prefere ler tudo mesmo com o índice certo).
const PLANO = `CREATE FUNCTION pg_temp.plano(q text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE r text; acc text := '';
BEGIN PERFORM set_config('enable_seqscan', 'off', true);
  FOR r IN EXECUTE 'EXPLAIN (COSTS OFF) ' || q LOOP acc := acc || r || E'\\n'; END LOOP; RETURN acc; END $f$;
`;
const usaIndice = (q, padrao = 'Index') => `${PLANO}SELECT pg_temp.plano($q$${q}$q$) ~ '${padrao}' AS plano_ok;`;

const L_STORAGE = {
  id: 'db-4-1', title: 'Como o PostgreSQL guarda os dados: páginas, heap, TOAST e WAL',
  steps: [
    theory('Do arquivo à linha', `
Cada tabela é um conjunto de **arquivos** no diretório de dados (\`base/<oid do banco>/<relfilenode>\`), divididos em segmentos de 1 GB. Cada arquivo é uma sequência de **páginas** (blocos) de **8 KB**:

~~~
página de 8 KB
┌──────────────────────────────────────────┐
│ cabeçalho (24 bytes: LSN, checksum...)   │
│ ponteiros de linha → (1) (2) (3) ...     │
│              ... espaço livre ...        │
│ ... tupla 3 │ tupla 2 │ tupla 1          │
└──────────────────────────────────────────┘
~~~

- **heap**: a tabela em si, sem ordem garantida; linhas novas vão onde houver espaço (o *Free Space Map* registra onde)
- **ctid**: endereço físico da versão da linha, \`(página, posição)\`. Muda a cada UPDATE (nova versão)
- cada tupla tem um cabeçalho de ~23 bytes (\`xmin\`, \`xmax\`, flags): uma tabela com milhões de linhas pequenas paga esse custo em cada uma
- **alinhamento**: colunas são alinhadas a 2, 4 ou 8 bytes. Ordenar colunas de tipos grandes para pequenos (bigint, timestamptz, int, smallint, boolean, text) pode economizar espaço

**TOAST** (*The Oversized-Attribute Storage Technique*): valores grandes (> ~2 KB, como um JSONB ou texto longo) são **comprimidos** e/ou movidos para uma tabela auxiliar \`pg_toast.pg_toast_<oid>\`, em pedaços. A linha principal guarda só um ponteiro. Consequência: \`SELECT *\` em tabela com colunas TOAST lê muito mais do que \`SELECT id, status\`.

Funções úteis: \`pg_relation_size\` (só o heap), \`pg_indexes_size\`, \`pg_total_relation_size\` (heap + índices + TOAST), \`pg_size_pretty\`, \`pg_column_size(valor)\`.
`),
    theory('WAL e checkpoints: como o banco sobrevive a uma queda', `
O **WAL** (*Write-Ahead Log*) é a garantia de **durabilidade** (o D do ACID):

1. a transação altera páginas **na memória** (*shared buffers*)
2. antes de confirmar, o registro da mudança é gravado no **WAL** (arquivo sequencial, rápido) e sincronizado com o disco (\`fsync\`)
3. só então o COMMIT retorna ao cliente
4. as páginas "sujas" vão para os arquivos de dados **depois**, aos poucos

Se o servidor cair, o PostgreSQL **reaplica o WAL** a partir do último checkpoint e chega ao estado confirmado.

**Checkpoint**: momento em que todas as páginas sujas são gravadas nos arquivos de dados; WAL anterior a ele não é mais necessário para recuperação (pode ser reciclado ou arquivado). Configurações: \`checkpoint_timeout\` (padrão 5 min), \`max_wal_size\` (1 GB). Checkpoints frequentes demais geram picos de I/O; raros demais tornam a recuperação lenta.

**LSN** (*Log Sequence Number*): posição no WAL, como \`0/6988000\`. Replicação e backups falam em LSN.

O mesmo WAL serve para: recuperação de queda, **replicação** (as réplicas recebem e reaplicam o WAL) e **PITR** (guardar o WAL para voltar a qualquer instante).

\`synchronous_commit = off\` torna o COMMIT mais rápido sem esperar o fsync: numa queda, perde as últimas transações (sem corromper nada). Útil para dados descartáveis, nunca para dinheiro.

**PostgreSQL 18** trouxe **I/O assíncrono** (\`io_method\`): leituras sequenciais, bitmap scans e VACUUM pedem várias páginas ao sistema operacional de uma vez, acelerando leituras em discos de nuvem.
`),
    exPg('Tamanhos, páginas e o ponteiro para o TOAST', `
`, `SELECT c.relname AS tabela,
       c.relpages AS paginas_8kb,
       c.reltuples::bigint AS linhas_estimadas,
       pg_size_pretty(pg_relation_size(c.oid)) AS heap,
       pg_size_pretty(pg_indexes_size(c.oid)) AS indices,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
       c.reltoastrelid::regclass AS tabela_toast
FROM pg_class c
WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 6;`, `
\`relpages\` e \`reltuples\` são estimativas atualizadas pelo ANALYZE/VACUUM; o otimizador usa esses números para escolher planos.
`),
    exPg('O endereço físico muda a cada UPDATE', `
`, `SELECT ctid, id, saldo FROM contas WHERE id = 42;
UPDATE contas SET saldo = saldo + 1 WHERE id = 42;
SELECT ctid, id, saldo FROM contas WHERE id = 42;
SELECT pg_current_wal_lsn() AS posicao_atual_no_wal, current_setting('block_size') AS tamanho_pagina;`, `
A linha atualizada ganhou outro \`ctid\`. A versão antiga continua na página original até o VACUUM.
`),
    quiz('Qual é o tamanho padrão de uma página no PostgreSQL?', ['8 KB', '4 KB', '1 MB', '64 KB'], 0),
    quiz('O que garante que uma transação confirmada sobrevive a uma queda de energia?', ['O registro no WAL sincronizado em disco antes do COMMIT retornar', 'O checkpoint imediato', 'O VACUUM', 'Os shared buffers'], 0),
    quiz('Uma coluna JSONB de 50 KB em cada linha: onde ela fica guardada?', ['Comprimida e/ou fora da linha, na tabela TOAST associada', 'Dentro da página, sempre', 'No WAL', 'Num índice'], 0),
    quiz('synchronous_commit = off pode...', ['Perder as últimas transações confirmadas numa queda, sem corromper o banco', 'Corromper o banco', 'Desligar o WAL', 'Impedir a replicação'], 0),
    pgsql('Liste as **3 maiores tabelas** do esquema public pelo tamanho total (heap + índices + TOAST). Colunas `tabela` (relname) e `bytes` (pg_total_relation_size), da maior para a menor.',
      `SELECT relname AS tabela, pg_total_relation_size(oid) AS bytes FROM pg_class WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace ORDER BY bytes DESC LIMIT 3;`,
      { ordered: true }),
    pgsql('Calcule quantos **bytes por linha** a tabela `pedidos` ocupa no heap, em média: `pg_relation_size` dividido pelo número real de linhas. Coluna `bytes_por_linha` (inteiro, arredondado).',
      `SELECT round(pg_relation_size('pedidos')::numeric / (SELECT count(*) FROM pedidos))::int AS bytes_por_linha;`),
    pgsql('Compare o tamanho de um valor `atributos` (jsonb) com o mesmo valor convertido para texto, para o produto 1, usando `pg_column_size`. Colunas `jsonb_bytes`, `texto_bytes`.',
      `SELECT pg_column_size(atributos) AS jsonb_bytes, pg_column_size(atributos::text) AS texto_bytes FROM produtos WHERE id = 1;`),
  ],
};

const L_VACUUM = {
  id: 'db-4-2', title: 'Bloat, VACUUM, autovacuum e HOT',
  steps: [
    theory('Por que o PostgreSQL precisa de VACUUM', `
Com MVCC, UPDATE e DELETE deixam **versões mortas** (*dead tuples*). Elas ocupam espaço e deixam as varreduras mais lentas: isso é o **bloat** (inchaço).

**VACUUM** (comum):
- marca o espaço das versões mortas como reutilizável (não devolve ao sistema operacional, exceto páginas vazias no fim do arquivo)
- atualiza o **Visibility Map** (páginas "todas visíveis", que permitem *Index Only Scan* sem consultar o heap)
- **congela** (*freeze*) linhas antigas para evitar o **wraparound** do contador de transações (32 bits, ~2 bilhões): se o contador der a volta sem freeze, o banco para de aceitar escritas para se proteger
- roda **sem bloquear** leituras e escritas

**VACUUM FULL**: reescreve a tabela inteira compactada e devolve espaço ao disco, mas pega **ACCESS EXCLUSIVE** (ninguém lê nem escreve) durante todo o processo. Em produção, use alternativas online como **pg_repack** (extensão) ou, a partir do PostgreSQL 19, o comando **REPACK** (que unifica VACUUM FULL e CLUSTER, com opção concorrente).

**ANALYZE**: coleta estatísticas (amostra) para o otimizador. \`VACUUM ANALYZE\` faz os dois.

**Autovacuum**: processo em segundo plano que roda VACUUM/ANALYZE quando
\`linhas mortas > autovacuum_vacuum_threshold (50) + autovacuum_vacuum_scale_factor (0.2) × linhas\`.
Em tabela de 100 milhões de linhas, 20% = 20 milhões de linhas mortas antes de agir: por isso tabelas grandes recebem ajuste próprio:
~~~sql
ALTER TABLE pedidos SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01);
~~~

**O que impede o VACUUM de limpar:** uma transação **aberta há horas** (ou "idle in transaction"), um *replication slot* abandonado ou uma transação preparada esquecida seguram o "horizonte" (\`xmin\`): nenhuma versão mais nova que ele pode ser removida, em nenhuma tabela. É uma das causas mais comuns de bloat e lentidão progressiva em produção.
`),
    theory('HOT e fillfactor', `
**HOT** (*Heap-Only Tuple*): se o UPDATE **não altera nenhuma coluna indexada** e há **espaço na mesma página**, a nova versão fica na mesma página e os índices **não são tocados** (só um ponteiro interno é ajustado). Isso reduz muito o custo de escrita e o bloat dos índices.

Consequências práticas:
- cada índice a mais numa coluna atualizada com frequência impede HOT nessa coluna
- \`fillfactor\` (porcentagem de preenchimento das páginas, padrão 100) menor, como 80–90, deixa espaço livre em cada página para updates HOT em tabelas muito atualizadas:
~~~sql
ALTER TABLE contas SET (fillfactor = 85);   -- vale para páginas novas ou após reescrita
~~~

Para acompanhar: \`pg_stat_user_tables\` tem \`n_tup_upd\`, \`n_tup_hot_upd\`, \`n_dead_tup\`, \`last_autovacuum\`, \`last_autoanalyze\`. Uma proporção baixa de HOT em tabela muito atualizada sugere índices demais ou fillfactor alto.

Monitorar bloat: a extensão \`pgstattuple\` mede com precisão; consultas de estimativa comparam \`relpages\` com o tamanho esperado das linhas.
`),
    exPg('Vendo as configurações de autovacuum e ajustando uma tabela', `
`, `SELECT name, setting FROM pg_settings
WHERE name IN ('autovacuum', 'autovacuum_vacuum_threshold', 'autovacuum_vacuum_scale_factor',
               'autovacuum_analyze_scale_factor', 'autovacuum_freeze_max_age')
ORDER BY name;
ALTER TABLE pedidos SET (autovacuum_vacuum_scale_factor = 0.02, fillfactor = 90);
SELECT relname, reloptions FROM pg_class WHERE relname = 'pedidos';`, `
A configuração por tabela (\`reloptions\`) vale só para ela e sobrepõe o padrão do servidor.
`),
    exPg('VACUUM e a idade das transações', `
Este exemplo roda VACUUM (comando que não pode estar dentro de transação, por isso usa uma cópia do banco):
`, `UPDATE contas SET versao = versao + 1;
VACUUM (ANALYZE) contas;
SELECT relname, age(relfrozenxid) AS idade_xid, relpages
FROM pg_class WHERE relname = 'contas';`, `
\`age(relfrozenxid)\` mede quantas transações se passaram desde o último congelamento. O autovacuum força um VACUUM de congelamento quando passa de \`autovacuum_freeze_max_age\` (200 milhões).
`),
    quiz('O que o VACUUM comum faz com o espaço das versões mortas?', ['Marca como reutilizável na própria tabela (não devolve ao disco, salvo o fim do arquivo)', 'Devolve ao sistema operacional', 'Apaga a tabela', 'Move para o TOAST'], 0),
    quiz('Por que VACUUM FULL é perigoso em produção?', ['Pega ACCESS EXCLUSIVE: bloqueia leituras e escritas durante toda a reescrita', 'Apaga dados', 'Desliga o WAL', 'Não funciona em tabelas grandes'], 0),
    quiz('Uma tabela de 500 milhões de linhas com o scale_factor padrão (0.2) só recebe autovacuum depois de...', ['~100 milhões de linhas mortas: por isso reduzimos o scale_factor por tabela', '50 linhas mortas', '1 hora', 'Cada UPDATE'], 0),
    quiz('O bloat cresce em todas as tabelas e o VACUUM não remove nada. Causa provável:', ['Uma transação aberta há horas (ou idle in transaction) ou um replication slot abandonado segurando o horizonte', 'Falta de índices', 'fillfactor 100', 'WAL cheio'], 0),
    quiz('Um UPDATE é HOT (não toca nos índices) quando...', ['Não altera coluna indexada e há espaço livre na mesma página', 'Altera a chave primária', 'Usa FOR UPDATE', 'A tabela é particionada'], 0),
    pgsql('Configure a tabela `eventos` com `autovacuum_vacuum_scale_factor = 0.01` e `autovacuum_analyze_scale_factor = 0.005`, depois mostre `reloptions` dela.',
      `ALTER TABLE eventos SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_analyze_scale_factor = 0.005);
SELECT reloptions FROM pg_class WHERE relname = 'eventos';`),
    pgsql('Mostre, de `pg_stat_user_tables`, as colunas `relname`, `n_tup_upd`, `n_tup_hot_upd` e `n_dead_tup` da tabela `contas`.',
      `SELECT relname, n_tup_upd, n_tup_hot_upd, n_dead_tup FROM pg_stat_user_tables WHERE relname = 'contas';`),
  ],
};

const L_BTREE = {
  id: 'db-4-3', title: 'Índices B-tree: compostos, parciais, de expressão e cobertura',
  steps: [
    theory('O que um índice é e quanto custa', `
Um **B-tree** é uma árvore balanceada e ordenada: da raiz às folhas são poucos níveis (3 ou 4 para centenas de milhões de linhas). Cada folha guarda \`(valor da chave → ctid)\`. Serve para \`=\`, \`<\`, \`>\`, \`BETWEEN\`, \`IN\`, \`IS NULL\`, \`LIKE 'prefixo%'\` (com collation C ou \`text_pattern_ops\`) e para **ORDER BY** (as folhas já estão ordenadas).

**Custos:**
- cada INSERT grava em **todos** os índices da tabela; cada UPDATE de coluna indexada também (e perde o HOT)
- ocupa disco e memória (cache)
- um índice que nunca é usado é **só custo**. Encontre-os com \`pg_stat_user_indexes.idx_scan = 0\` (depois de um período representativo; cuidado com índices que garantem UNIQUE/PK)

**Foreign keys não ganham índice automaticamente** no PostgreSQL: a coluna \`pedidos.cliente_id\` só tem índice se você criar. Sem ele, joins por cliente e o DELETE de um cliente (que verifica os pedidos) varrem a tabela toda.

**CREATE INDEX CONCURRENTLY**: cria sem bloquear escritas (mais lento, não pode rodar dentro de transação). Em produção, é o padrão. Se falhar, deixa um índice \`INVALID\` que deve ser removido.
`),
    theory('Os tipos de índice B-tree que resolvem 90% dos casos', `
**Composto** \`(a, b)\`: ordenado por \`a\` e, dentro de cada \`a\`, por \`b\`. Regra da **esquerda para a direita**: serve para filtros em \`a\`, em \`a AND b\`, e \`a = x ORDER BY b\`; **não** serve bem para filtrar só por \`b\`. Ordem recomendada: colunas de **igualdade** primeiro, depois a de **intervalo/ordenação**:
~~~sql
-- WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT 10
CREATE INDEX ix_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);
~~~
(O PostgreSQL 18 adicionou o *skip scan*, que usa índices compostos mesmo sem filtro na primeira coluna quando ela tem poucos valores distintos, mas a regra continua valendo.)

**Parcial**: indexa só as linhas que interessam; menor e mais rápido:
~~~sql
CREATE INDEX ix_pedidos_pendentes ON pedidos (criado_em) WHERE status = 'pendente';
CREATE UNIQUE INDEX ux_email_ativo ON clientes (email) WHERE ativo;  -- unicidade só entre ativos
~~~

**De expressão** (funcional): a consulta precisa usar **a mesma expressão**:
~~~sql
CREATE INDEX ix_clientes_email_lower ON clientes (lower(email));
SELECT * FROM clientes WHERE lower(email) = 'ana@exemplo.com';   -- usa o índice
~~~

**Cobertura** (\`INCLUDE\`): guarda colunas extras nas folhas para permitir **Index Only Scan** (responder sem ir ao heap):
~~~sql
CREATE INDEX ix_pedidos_cliente_inc ON pedidos (cliente_id) INCLUDE (status, criado_em);
~~~
Index Only Scan só evita o heap em páginas marcadas como "todas visíveis" no Visibility Map, por isso depende de VACUUM em dia.
`),
    exPg('Antes e depois de um índice composto', `
`, `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)
SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 4321 ORDER BY criado_em DESC LIMIT 5;

CREATE INDEX ix_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);

EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)
SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 4321 ORDER BY criado_em DESC LIMIT 5;`, `
Sem índice: **Seq Scan** lendo centenas de páginas (\`Buffers: shared hit=...\`) e ordenando. Com o índice: **Index Scan** que já percorre na ordem certa e para no 5º resultado, lendo poucas páginas.
`),
    quiz('Índice em (uf, cidade). Qual consulta NÃO aproveita bem a ordem do índice?', ["WHERE cidade = 'Campinas'", "WHERE uf = 'SP'", "WHERE uf = 'SP' AND cidade = 'Campinas'", "WHERE uf = 'SP' ORDER BY cidade"], 0),
    quiz('A FK pedidos.cliente_id tem índice criado automaticamente pelo PostgreSQL?', ['Não: só PK e UNIQUE ganham índice automático', 'Sim, sempre', 'Só com ON DELETE CASCADE', 'Só em tabelas particionadas'], 0),
    quiz('Para garantir e-mail único apenas entre clientes ativos, use...', ['Um índice UNIQUE parcial: (email) WHERE ativo', 'UNIQUE (email, ativo)', 'Um CHECK', 'Uma trigger obrigatoriamente'], 0),
    quiz('Qual o custo de manter 12 índices numa tabela muito escrita?', ['Cada INSERT grava em 12 índices e UPDATEs em colunas indexadas perdem HOT', 'Nenhum', 'Só ocupa disco', 'Deixa os SELECTs mais lentos'], 0),
    pgsql('Crie um índice que faça a consulta `SELECT * FROM pedidos WHERE cliente_id = 777` usar índice (em vez de Seq Scan).',
      `CREATE INDEX ix_pedidos_cliente ON pedidos (cliente_id);`,
      { check: usaIndice('SELECT * FROM pedidos WHERE cliente_id = 777') }),
    pgsql('A busca de login é `WHERE lower(email) = \'cliente123@exemplo.com\'`. Crie o índice de **expressão** que a atende.',
      `CREATE INDEX ix_clientes_email_lower ON clientes (lower(email));`,
      { check: usaIndice(`SELECT id FROM clientes WHERE lower(email) = 'cliente123@exemplo.com'`) }),
    pgsql('A tela de operação lista pedidos **pendentes** por data: `SELECT id FROM pedidos WHERE status = \'pendente\' ORDER BY criado_em LIMIT 50`. Crie um índice **parcial** em `criado_em` só para pendentes.',
      `CREATE INDEX ix_pedidos_pendentes ON pedidos (criado_em) WHERE status = 'pendente';`,
      { check: `${PLANO}SELECT pg_temp.plano($q$SELECT id FROM pedidos WHERE status = 'pendente' ORDER BY criado_em LIMIT 50$q$) ~ 'Index' AS plano_ok, (SELECT count(*) FROM pg_indexes WHERE tablename = 'pedidos' AND indexdef ~ 'WHERE') AS parciais;` }),
    pgsql('Crie um índice de **cobertura** em `itens_pedido (produto_id)` incluindo `quantidade` e `preco_unitario`, para que a consulta de receita por produto possa usar Index Only Scan. Mostre a definição dele a partir de `pg_indexes` (coluna `indexdef`).',
      `CREATE INDEX ix_itens_produto_cov ON itens_pedido (produto_id) INCLUDE (quantidade, preco_unitario);
SELECT regexp_replace(indexdef, 'INDEX \\S+ ON', 'INDEX ON') AS indexdef FROM pg_indexes WHERE tablename = 'itens_pedido' AND indexdef ~ 'INCLUDE';`),
    pgsql('Liste os índices da tabela `produtos` que **nunca foram usados** (`idx_scan = 0`) segundo `pg_stat_user_indexes`. Coluna `indexrelname`.',
      `SELECT indexrelname FROM pg_stat_user_indexes WHERE relname = 'produtos' AND idx_scan = 0;`, { allowEmpty: true }),
  ],
};

const L_OUTROS = {
  id: 'db-4-4', title: 'GIN, GiST, BRIN, Hash e busca textual',
  steps: [
    theory('Cada estrutura para um tipo de pergunta', `
| tipo | estrutura | perguntas que responde | exemplo |
|---|---|---|---|
| **B-tree** | árvore ordenada | =, <, >, ordenação | quase tudo |
| **Hash** | tabela hash | só \`=\` | chaves longas só comparadas por igualdade (raro preferir a B-tree) |
| **GIN** | índice invertido (elemento → linhas) | "contém": \`@>\`, \`?\`, \`&&\`, busca textual, trigramas | JSONB, arrays, \`tsvector\`, \`LIKE '%x%'\` com pg_trgm |
| **GiST** | árvore genérica de "regiões" | sobreposição, proximidade, vizinho mais próximo | geometria (PostGIS), intervalos (\`tsrange\`), exclusion constraints |
| **SP-GiST** | árvores particionadas no espaço | dados com distribuição não balanceada | pontos, prefixos, IPs |
| **BRIN** | resumo (mín./máx.) por bloco de páginas | intervalos em dados **fisicamente ordenados** | logs e eventos por data, em tabelas enormes; minúsculo |

**GIN para JSONB**: \`jsonb_ops\` (padrão: suporta \`@>\`, \`?\`, \`?|\`, \`?&\`) ou \`jsonb_path_ops\` (menor e mais rápido, só \`@>\` e jsonpath).
~~~sql
CREATE INDEX ix_produtos_attr ON produtos USING gin (atributos jsonb_path_ops);
SELECT * FROM produtos WHERE atributos @> '{"cor": "azul"}';   -- usa o índice
~~~
GIN é rápido para ler e caro para escrever (usa uma "fila pendente" que é incorporada depois: \`fastupdate\`).

**pg_trgm** (trigramas): quebra o texto em pedaços de 3 letras; permite índice para \`LIKE '%cabo%'\`, \`ILIKE\` e similaridade (\`similarity\`, operador \`%\`), algo que B-tree não faz:
~~~sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ix_produtos_nome_trgm ON produtos USING gin (nome gin_trgm_ops);
~~~

**BRIN** só ajuda se a coluna estiver **correlacionada com a ordem física** (\`pg_stats.correlation\` perto de 1 ou -1), como uma tabela de eventos que só recebe INSERT em ordem de tempo. Com dados embaralhados, o resumo de cada bloco cobre "tudo" e o índice não filtra nada.

**Exclusion constraint (GiST)**: impede sobreposição, como duas reservas da mesma sala no mesmo horário:
~~~sql
CREATE EXTENSION btree_gist;
ALTER TABLE reservas ADD EXCLUDE USING gist (sala WITH =, periodo WITH &&);
~~~
`),
    theory('Busca textual nativa', `
O PostgreSQL tem **full-text search** sem serviço externo:
- \`to_tsvector('portuguese', texto)\`: normaliza (minúsculas, remove *stopwords* como "de", reduz ao radical: "pagamentos" → "pagament")
- \`to_tsquery\`, \`plainto_tsquery\`, \`websearch_to_tsquery('portuguese', 'cabo -hdmi')\`: a pergunta
- \`@@\`: "o documento casa com a pergunta?"
- \`ts_rank\`: relevância para ordenar
- índice GIN sobre o tsvector (de preferência numa **coluna gerada**):
~~~sql
ALTER TABLE produtos ADD COLUMN busca tsvector
  GENERATED ALWAYS AS (to_tsvector('portuguese', nome)) STORED;
CREATE INDEX ix_produtos_busca ON produtos USING gin (busca);
SELECT nome FROM produtos WHERE busca @@ websearch_to_tsquery('portuguese', 'notebook gamer');
~~~
Para catálogos pequenos e médios, isso dispensa Elasticsearch. A extensão \`unaccent\` ignora acentos.
`),
    exPg('BRIN: só funciona com dados em ordem física', `
`, `CREATE TABLE eventos_ordenados AS SELECT * FROM eventos ORDER BY ocorrido_em;
ANALYZE eventos_ordenados;
CREATE INDEX ix_ev_brin ON eventos_ordenados USING brin (ocorrido_em);
SELECT tablename, attname, round(correlation::numeric, 3) AS correlacao
FROM pg_stats WHERE attname = 'ocorrido_em' AND tablename IN ('eventos', 'eventos_ordenados');
SELECT pg_size_pretty(pg_relation_size('ix_ev_brin')) AS tamanho_brin;
EXPLAIN (COSTS OFF)
SELECT count(*) FROM eventos_ordenados WHERE ocorrido_em >= '2025-03-01' AND ocorrido_em < '2025-03-02';`, `
Na cópia ordenada, a correlação é 1 e o plano usa **Bitmap Index Scan** no BRIN, um índice de poucos KB. Na tabela original (correlação perto de 0), o mesmo índice seria inútil.
`),
    exPg('Busca de produtos por trecho e por palavras', `
`, `CREATE INDEX ix_produtos_nome_trgm ON produtos USING gin (nome gin_trgm_ops);
EXPLAIN (COSTS OFF) SELECT id, nome FROM produtos WHERE nome ILIKE '%cabo%';
SELECT id, nome, round(similarity(nome, 'cabo hdmi')::numeric, 2) AS similaridade
FROM produtos ORDER BY nome <-> 'cabo hdmi' LIMIT 5;`, `
O operador \`<->\` do pg_trgm é a "distância" (1 − similaridade): ordenar por ele traz os nomes mais parecidos, tolerando erros de digitação.
`),
    quiz("Para acelerar WHERE nome ILIKE '%mouse%' use...", ['GIN com gin_trgm_ops (pg_trgm)', 'B-tree em nome', 'Hash em nome', 'BRIN em nome'], 0),
    quiz('BRIN em eventos(ocorrido_em) não ajudou nada. O que verificar primeiro?', ['pg_stats.correlation: os dados precisam estar fisicamente ordenados pela coluna', 'Se o índice é UNIQUE', 'O fillfactor', 'O tamanho da página'], 0),
    quiz('Para impedir duas reservas sobrepostas da mesma sala, use...', ['EXCLUDE USING gist (sala WITH =, periodo WITH &&)', 'UNIQUE (sala, periodo)', 'CHECK', 'Índice BRIN'], 0),
    quiz('jsonb_path_ops comparado ao jsonb_ops padrão...', ['É menor e mais rápido, mas só suporta @> e jsonpath', 'Suporta mais operadores', 'É um B-tree', 'Não usa GIN'], 0),
    pgsql('Crie um índice GIN (`jsonb_path_ops`) em `produtos.atributos` para acelerar a consulta `WHERE atributos @> \'{"cor": "preto"}\'`.',
      `CREATE INDEX ix_produtos_attr ON produtos USING gin (atributos jsonb_path_ops);`,
      { check: usaIndice(`SELECT id FROM produtos WHERE atributos @> '{"cor": "preto"}'`) }),
    pgsql('Crie um índice de trigramas em `clientes.nome` que permita `WHERE nome ILIKE \'%silva%\'` usar índice.',
      `CREATE INDEX ix_clientes_nome_trgm ON clientes USING gin (nome gin_trgm_ops);`,
      { check: usaIndice(`SELECT id FROM clientes WHERE nome ILIKE '%silva%'`) }),
    pgsql("Usando busca textual em português, conte os produtos cujo nome casa com `websearch_to_tsquery('portuguese', 'cabo')`. Coluna `produtos`.",
      `SELECT count(*) AS produtos FROM produtos WHERE to_tsvector('portuguese', nome) @@ websearch_to_tsquery('portuguese', 'cabo');`),
  ],
};

const L_EXPLAIN = {
  id: 'db-4-5', title: 'EXPLAIN: lendo planos de execução',
  steps: [
    theory('Como o otimizador decide', `
O PostgreSQL tem um otimizador **baseado em custo**: gera planos possíveis, estima o custo de cada um (em unidades arbitrárias, a partir de \`seq_page_cost\`, \`random_page_cost\`, \`cpu_tuple_cost\`...) e executa o mais barato. As estimativas vêm das **estatísticas** (\`pg_stats\`): número de valores distintos (\`n_distinct\`), valores mais comuns (\`most_common_vals\`), histograma, fração de NULL, **correlação** com a ordem física.

- \`EXPLAIN consulta\`: mostra o plano escolhido e as **estimativas** (não executa)
- \`EXPLAIN (ANALYZE, BUFFERS) consulta\`: **executa** e mostra tempos reais, linhas reais e páginas lidas. Cuidado: com UPDATE/DELETE, executa de verdade (use dentro de BEGIN ... ROLLBACK)

Lendo uma linha:
~~~
Index Scan using pedidos_pkey on pedidos  (cost=0.29..8.31 rows=1 width=58) (actual time=0.02..0.02 rows=1.00 loops=1)
  Index Cond: (id = 10)
  Buffers: shared hit=3 read=1
~~~
- \`cost=início..total\`: custo estimado para a primeira linha e para todas
- \`rows\` estimado × \`actual rows\`: **a diferença entre eles é a pista nº 1** de plano ruim (estatística desatualizada, colunas correlacionadas, função opaca)
- \`loops\`: quantas vezes o nó rodou (multiplique tempo e linhas)
- \`Buffers: shared hit\` = páginas vindas da memória; \`read\` = do disco/SO

O plano é uma **árvore**: leia de dentro para fora (os nós mais indentados executam primeiro e entregam linhas ao pai).
`),
    theory('Nós de acesso e de junção', `
**Acesso:**
| nó | quando |
|---|---|
| **Seq Scan** | lê a tabela inteira; ótimo quando se quer boa parte das linhas |
| **Index Scan** | percorre o índice e busca cada linha no heap; ótimo para poucas linhas ou para entregar ordenado |
| **Index Only Scan** | responde só com o índice (colunas todas no índice e páginas "visíveis") |
| **Bitmap Index Scan + Bitmap Heap Scan** | junta os ctids de um ou mais índices num mapa, depois lê as páginas em ordem física; bom para quantidades médias e para combinar índices (\`BitmapAnd/Or\`) |

**Junção:**
| algoritmo | como | bom para |
|---|---|---|
| **Nested Loop** | para cada linha de fora, procura na de dentro (de preferência por índice) | lado externo pequeno, índice no interno |
| **Hash Join** | monta uma tabela hash do lado menor e varre o maior | junções grandes por igualdade |
| **Merge Join** | percorre os dois lados já ordenados | entradas já ordenadas (índices), junções grandes |

Outros nós: \`Sort\` (com \`Sort Method: external merge Disk\` quando não cabe em \`work_mem\`), \`HashAggregate\`/\`GroupAggregate\`, \`Limit\`, \`Gather\` (paralelismo), \`Memoize\` (cache do lado interno de um Nested Loop).

**Quando a estimativa erra:** rode \`ANALYZE tabela\`; aumente a amostra de uma coluna (\`ALTER TABLE t ALTER COLUMN c SET STATISTICS 1000\`); crie **estatísticas estendidas** para colunas correlacionadas (\`CREATE STATISTICS ... (dependencies, ndistinct, mcv) ON uf, cidade FROM clientes\`): sem elas o otimizador supõe que \`uf = 'SP' AND cidade = 'Campinas'\` são independentes e subestima as linhas.

Ferramentas visuais: explain.dalibo.com, explain.depesz.com (cole o plano em texto ou JSON).
`),
    exPg('EXPLAIN ANALYZE de uma junção com agregação', `
`, `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)
SELECT c.uf, count(*) AS pedidos
FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
WHERE p.criado_em >= '2025-06-01' AND p.criado_em < '2025-07-01'
GROUP BY c.uf;`, `
Leia de dentro para fora: Seq Scan em pedidos com filtro de data, Hash da tabela clientes, **Hash Join**, depois agregação. Repare em "Rows Removed by Filter": muitas linhas lidas e descartadas indicam que um índice em \`criado_em\` ajudaria.
`),
    exPg('Estatísticas que o otimizador usa', `
`, `SELECT attname, null_frac, n_distinct, most_common_vals::text AS mais_comuns, round(correlation::numeric, 3) AS correlacao
FROM pg_stats WHERE tablename = 'pedidos' AND attname IN ('status', 'canal', 'cupom')
ORDER BY attname;`, `
\`n_distinct\` positivo é a contagem de valores distintos; negativo é uma fração do total de linhas (-1 = todos distintos).
`),
    quiz('No EXPLAIN ANALYZE, rows=50 estimado e actual rows=480000. O que isso indica?', ['Estimativa muito errada: estatísticas desatualizadas ou colunas correlacionadas; o plano provavelmente é ruim', 'Está tudo certo', 'O índice está corrompido', 'Falta memória'], 0),
    quiz('Qual algoritmo de junção monta uma tabela em memória com o lado menor?', ['Hash Join', 'Nested Loop', 'Merge Join', 'Seq Scan'], 0),
    quiz('Sort Method: external merge Disk no plano significa...', ['A ordenação não coube em work_mem e usou arquivos temporários', 'Está ordenando por índice', 'Usou paralelismo', 'O disco está cheio'], 0),
    quiz('Cuidado ao rodar EXPLAIN ANALYZE com DELETE porque...', ['Ele executa de verdade: use dentro de BEGIN ... ROLLBACK', 'Não funciona com DELETE', 'Apaga as estatísticas', 'Trava o servidor'], 0),
    order('Ordene a investigação de uma consulta lenta:', ['reproduzir com EXPLAIN (ANALYZE, BUFFERS)', 'achar o nó que gasta mais tempo ou lê mais páginas', 'comparar linhas estimadas e reais', 'agir: índice, reescrita ou estatísticas', 'medir de novo']),
    pgsql('Consulte `pg_stats` e mostre `attname` e `n_distinct` das colunas `uf` e `segmento` da tabela `clientes`, ordenado por attname.',
      `SELECT attname, n_distinct FROM pg_stats WHERE tablename = 'clientes' AND attname IN ('uf', 'segmento') ORDER BY attname;`, { ordered: true }),
    pgsql('Crie **estatísticas estendidas** chamadas `st_clientes_local` (dependencies e ndistinct) sobre `uf, cidade` de `clientes`, rode ANALYZE na tabela e mostre `stxname` de `pg_statistic_ext`.',
      `CREATE STATISTICS st_clientes_local (dependencies, ndistinct) ON uf, cidade FROM clientes;
ANALYZE clientes;
SELECT stxname FROM pg_statistic_ext WHERE stxname = 'st_clientes_local';`),
  ],
};

const L_ANTI = {
  id: 'db-4-6', title: 'Consultas que matam a performance (e como reescrever)',
  steps: [
    theory('Predicados não-SARGable e conversões implícitas', `
**SARGable** (*Search ARGument able*): um filtro que o índice consegue usar. Regra: **deixe a coluna "nua"** de um lado da comparação.

| ruim (não usa índice em criado_em) | bom |
|---|---|
| \`WHERE date(criado_em) = '2025-03-10'\` | \`WHERE criado_em >= '2025-03-10' AND criado_em < '2025-03-11'\` |
| \`WHERE extract(year FROM criado_em) = 2025\` | \`WHERE criado_em >= '2025-01-01' AND criado_em < '2026-01-01'\` |
| \`WHERE preco * 1.1 > 100\` | \`WHERE preco > 100 / 1.1\` |
| \`WHERE id::text = '123'\` | \`WHERE id = 123\` |
| \`WHERE lower(email) = $1\` sem índice de expressão | crie o índice em \`lower(email)\` ou normalize na gravação |
| \`WHERE nome LIKE '%ana'\` | pg_trgm, ou guardar o texto invertido |
| \`WHERE coalesce(cupom, '') = ''\` | \`WHERE cupom IS NULL OR cupom = ''\` |

**Conversão implícita**: comparar uma coluna \`bigint\` com um parâmetro \`numeric\`, ou \`text\` com \`varchar\` de collation diferente, pode forçar a conversão **da coluna** e impedir o índice. Em ORMs, confira o tipo dos parâmetros; no plano, procure \`::numeric\` aplicado à coluna.

**OR entre colunas diferentes** (\`WHERE cliente_id = 1 OR cupom = 'X'\`) pode virar Seq Scan; o PostgreSQL combina índices com BitmapOr, ou reescreva com \`UNION\`.
`),
    theory('Paginação, N+1 e outros vilões', `
**OFFSET grande**: \`ORDER BY id LIMIT 20 OFFSET 500000\` lê e descarta 500 mil linhas a cada página. **Paginação por chave** (*keyset* / *seek*): guarde o último valor visto e continue dele:
~~~sql
-- primeira página
SELECT id, criado_em FROM pedidos ORDER BY criado_em DESC, id DESC LIMIT 20;
-- próximas: passe a última (criado_em, id) recebida
SELECT id, criado_em FROM pedidos
WHERE (criado_em, id) < ('2025-06-01 10:00', 51234)       -- comparação de linha
ORDER BY criado_em DESC, id DESC LIMIT 20;
~~~
Com índice em \`(criado_em DESC, id DESC)\`, cada página custa o mesmo, seja a 1ª ou a 10.000ª. O desempate (\`id\`) garante ordem total. Contra: não dá para "pular para a página 537".

**N+1**: a aplicação busca 100 pedidos e faz 100 consultas para buscar o cliente de cada um. Resolva com JOIN, \`WHERE id = ANY($1)\` ou o *eager loading* do ORM.

**Outros:**
- \`SELECT *\` traz colunas TOAST e impede Index Only Scan
- \`count(*)\` exato de tabela gigante para mostrar "1.234.567 resultados": use estimativa (\`reltuples\`) ou limite
- \`NOT IN (subconsulta)\` com NULL (Nível 2) e que não vira anti-join: prefira \`NOT EXISTS\`
- funções \`VOLATILE\` no WHERE executadas linha a linha
- transações longas e "idle in transaction" segurando locks e o VACUUM
`),
    exPg('Mesma pergunta, planos diferentes', `
`, `CREATE INDEX ix_pedidos_criado ON pedidos (criado_em);
EXPLAIN (COSTS OFF) SELECT count(*) FROM pedidos WHERE date(criado_em AT TIME ZONE 'UTC') = '2025-03-10';
EXPLAIN (COSTS OFF) SELECT count(*) FROM pedidos WHERE criado_em >= '2025-03-10 00:00+00' AND criado_em < '2025-03-11 00:00+00';`, `
A primeira aplica uma função à coluna: Seq Scan na tabela toda. A segunda usa o intervalo e o índice.
`),
    exPg('OFFSET × keyset', `
`, `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT id FROM pedidos ORDER BY id LIMIT 20 OFFSET 70000;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT id FROM pedidos WHERE id > 70000 ORDER BY id LIMIT 20;`, `
Com OFFSET, o índice entrega 70.020 linhas para 20 serem usadas. Com keyset, entrega exatamente 20.
`),
    quiz("Por que WHERE extract(year FROM criado_em) = 2025 não usa o índice em criado_em?", ['A coluna está dentro de uma função: o índice guarda criado_em, não extract(year...)', 'Porque 2025 é inteiro', 'Porque extract é lento', 'Usa sim'], 0),
    quiz('A página 5.000 de uma listagem com OFFSET demora 4 s. A solução estrutural é...', ['Paginação por chave (keyset): WHERE (data, id) < (último visto) ORDER BY data, id LIMIT n', 'Aumentar o work_mem', 'Criar mais índices', 'Usar SELECT *'], 0),
    quiz('O ORM faz 1 consulta para listar 200 pedidos e mais 200 para os clientes. Isso é...', ['O problema N+1: resolva com JOIN ou WHERE id = ANY(...)', 'Normal e eficiente', 'Um deadlock', 'Bloat'], 0),
    quiz('Qual reescrita desta contagem de março de 2025 permite usar um índice em criado_em?', ["WHERE criado_em >= '2025-03-01 00:00+00' AND criado_em < '2025-04-01 00:00+00'", "WHERE date_trunc('month', criado_em) = '2025-03-01'", "WHERE criado_em::date BETWEEN '2025-03-01' AND '2025-03-31'", "WHERE extract(month FROM criado_em) = 3 AND extract(year FROM criado_em) = 2025"], 0,
      'Só a primeira deixa a coluna "nua": as demais aplicam função ou conversão à coluna, e o índice em criado_em não se aplica.',
      `SELECT count(*) FROM pedidos\nWHERE to_char(criado_em AT TIME ZONE 'UTC', 'YYYY-MM') = '2025-03';`),
    pgsql('Conte os pedidos de **março de 2025** (UTC) com um filtro **SARGable** em `criado_em` (intervalo meio-aberto). Coluna `pedidos`.',
      `SELECT count(*) AS pedidos FROM pedidos WHERE criado_em >= '2025-03-01 00:00+00' AND criado_em < '2025-04-01 00:00+00';`),
    pgsql('Implemente a **próxima página** de uma listagem de pedidos por `id` decrescente: a última linha vista foi o id **40000**. Traga os próximos 10 ids (`id`), em ordem.',
      `SELECT id FROM pedidos WHERE id < 40000 ORDER BY id DESC LIMIT 10;`, { ordered: true }),
    pgsql('Keyset com desempate: listando pedidos por `(criado_em, id)` crescentes, a última linha vista tem `criado_em = \'2025-05-01 00:00:00+00\'` e `id = 100`. Traga os próximos 10 (`id`, `criado_em`) usando comparação de linha.',
      `SELECT id, criado_em FROM pedidos WHERE (criado_em, id) > ('2025-05-01 00:00:00+00', 100) ORDER BY criado_em, id LIMIT 10;`, { ordered: true }),
    pgsql('Em vez de `count(*)` exato, mostre a **estimativa** de linhas de `eventos` a partir de `pg_class.reltuples` (coluna `estimativa`, bigint).',
      `SELECT reltuples::bigint AS estimativa FROM pg_class WHERE relname = 'eventos';`),
  ],
};

const L_PARTICAO = {
  id: 'db-4-7', title: 'Particionamento e estratégias de escala',
  steps: [
    theory('Particionamento declarativo', `
Uma tabela **particionada** é uma tabela "mãe" sem dados próprios; as linhas vão para **partições** (tabelas filhas) conforme a **chave de partição**:

| tipo | regra | exemplo |
|---|---|---|
| **RANGE** | intervalos | eventos por mês |
| **LIST** | lista de valores | pedidos por país/região |
| **HASH** | resto da divisão do hash | espalhar clientes em 16 partes iguais |

~~~sql
CREATE TABLE eventos_p (
  id bigint, cliente_id bigint, tipo text, ocorrido_em timestamptz NOT NULL, dados jsonb
) PARTITION BY RANGE (ocorrido_em);

CREATE TABLE eventos_p_2025_01 PARTITION OF eventos_p FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE eventos_p_2025_02 PARTITION OF eventos_p FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE eventos_p_padrao  PARTITION OF eventos_p DEFAULT;   -- o que não couber em nenhuma
~~~

**Ganhos:**
- **partition pruning**: consultas com filtro na chave leem só as partições relevantes
- **manutenção barata**: apagar um mês antigo é \`DROP TABLE\` (ou \`ALTER TABLE ... DETACH PARTITION ... CONCURRENTLY\`) instantâneo, em vez de um DELETE de milhões de linhas que gera bloat
- VACUUM e índices menores por partição

**Custos e regras:**
- a chave de partição deve aparecer nos filtros das consultas mais frequentes, senão todas as partições são lidas
- PK e UNIQUE precisam **incluir a chave de partição**
- partições demais (milhares) pesam no planejamento; ferramentas como **pg_partman** criam e removem partições automaticamente
- particionar só vale para tabelas realmente grandes (dezenas de GB) ou com ciclo de vida por tempo

**Escalar além de um servidor:**
- **réplicas de leitura**: desviam consultas de leitura (relatórios) do primário
- **sharding**: dividir os dados entre vários servidores pela chave (ex.: \`tenant_id\`). No PostgreSQL, a extensão **Citus** faz isso de forma transparente; a alternativa é sharding na aplicação. Custa caro em complexidade: joins e transações entre shards, rebalanceamento
- antes de qualquer um: índices certos, consultas corretas, cache e hardware adequado resolvem a maior parte dos casos
`),
    exPg('Partition pruning em ação', `
`, `CREATE TABLE ev_p (id bigint, cliente_id bigint, tipo text, ocorrido_em timestamptz NOT NULL) PARTITION BY RANGE (ocorrido_em);
CREATE TABLE ev_p_2025_01 PARTITION OF ev_p FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE ev_p_2025_02 PARTITION OF ev_p FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE ev_p_resto PARTITION OF ev_p DEFAULT;
INSERT INTO ev_p SELECT id, cliente_id, tipo, ocorrido_em FROM eventos;
SELECT tableoid::regclass AS particao, count(*) FROM ev_p GROUP BY 1 ORDER BY 1;
EXPLAIN (COSTS OFF) SELECT count(*) FROM ev_p WHERE ocorrido_em >= '2025-02-10' AND ocorrido_em < '2025-02-20';`, `
\`tableoid::regclass\` mostra em qual partição cada linha caiu. No plano, só **ev_p_2025_02** é lida: as outras foram podadas.
`),
    quiz('Qual é a vantagem operacional de particionar logs por mês?', ['Remover um mês antigo vira DROP/DETACH de partição, instantâneo e sem bloat', 'Todas as consultas ficam mais rápidas', 'Dispensa índices', 'Permite JOIN entre servidores'], 0),
    quiz('Numa tabela particionada por data, a PRIMARY KEY (id) sozinha...', ['Não é permitida: a PK precisa incluir a chave de partição, como (id, ocorrido_em)', 'É obrigatória', 'É criada automaticamente', 'Só funciona em LIST'], 0),
    quiz('Uma consulta sem filtro na chave de partição...', ['Lê todas as partições (sem pruning)', 'Dá erro', 'Lê só a partição DEFAULT', 'Lê só a mais recente'], 0),
    pgsql('Crie a tabela `pedidos_canal` particionada por **LIST** em `canal` com as partições `pedidos_canal_digital` (site, app), `pedidos_canal_marketplace` (marketplace) e `pedidos_canal_loja` (loja). Copie `id, cliente_id, canal, criado_em` de `pedidos` e mostre quantas linhas cada partição recebeu (colunas `particao` como texto, `linhas`).',
      `CREATE TABLE pedidos_canal (id bigint, cliente_id bigint, canal text NOT NULL, criado_em timestamptz) PARTITION BY LIST (canal);
CREATE TABLE pedidos_canal_digital PARTITION OF pedidos_canal FOR VALUES IN ('site', 'app');
CREATE TABLE pedidos_canal_marketplace PARTITION OF pedidos_canal FOR VALUES IN ('marketplace');
CREATE TABLE pedidos_canal_loja PARTITION OF pedidos_canal FOR VALUES IN ('loja');
INSERT INTO pedidos_canal SELECT id, cliente_id, canal, criado_em FROM pedidos;
SELECT tableoid::regclass::text AS particao, count(*) AS linhas FROM pedidos_canal GROUP BY 1;`),
    pgsql('Crie `lanc_p` particionada por **RANGE** em `criado_em` com as partições de 1º semestre (`lanc_p_s1`: 2025-01-01 a 2025-07-01) e 2º semestre de 2025 (`lanc_p_s2`: 2025-07-01 a 2026-01-01), copie `id, conta_id, valor, criado_em` de `lancamentos` e garanta que a consulta de julho lê só uma partição.',
      `CREATE TABLE lanc_p (id bigint, conta_id int, valor numeric(14,2), criado_em timestamptz NOT NULL) PARTITION BY RANGE (criado_em);
CREATE TABLE lanc_p_s1 PARTITION OF lanc_p FOR VALUES FROM ('2025-01-01') TO ('2025-07-01');
CREATE TABLE lanc_p_s2 PARTITION OF lanc_p FOR VALUES FROM ('2025-07-01') TO ('2026-01-01');
INSERT INTO lanc_p SELECT id, conta_id, valor, criado_em FROM lancamentos;`,
      { check: `${PLANO}SELECT pg_temp.plano($q$SELECT sum(valor) FROM lanc_p WHERE criado_em >= '2025-07-01' AND criado_em < '2025-08-01'$q$) !~ 'lanc_p_s1' AS so_uma_particao, (SELECT count(*) FROM lanc_p) AS linhas;` }),
  ],
};

const L_BACKUP = {
  id: 'db-4-8', title: 'Backup, PITR, replicação e alta disponibilidade',
  steps: [
    theory('Backup lógico × físico', `
| | **lógico** (\`pg_dump\`, \`pg_dumpall\`) | **físico** (\`pg_basebackup\`, pgBackRest, Barman, WAL-G) |
|---|---|---|
| o que copia | comandos SQL / formato próprio para recriar objetos e dados | os arquivos do diretório de dados |
| granularidade | um banco, um esquema, uma tabela | o servidor (cluster) inteiro |
| restauração | \`pg_restore\` (paralelo com \`-j\`), pode ir para outra versão | mesma versão principal, mesma arquitetura |
| velocidade em TB | lenta | rápida |
| volta a um instante passado? | não: só ao momento do dump | **sim**, com o WAL arquivado (PITR) |

~~~bash
pg_dump -Fc -d erp -f erp.dump            # formato custom (comprimido, restauração seletiva)
pg_restore -d erp_teste -j 4 erp.dump      # restaura com 4 processos
pg_dumpall --globals-only > globais.sql   # roles e tablespaces (pg_dump não inclui)
~~~

**Incremental**: o PostgreSQL 17 trouxe backup incremental nativo (\`pg_basebackup --incremental\` + \`pg_combinebackup\`); ferramentas como pgBackRest fazem isso há anos, com compressão, criptografia e envio para S3.

**Regra de ouro: backup que não foi restaurado em teste não existe.** Agende restaurações automáticas e meça o tempo.

**RPO** (*Recovery Point Objective*): quanto dado é aceitável perder (ex.: 5 min). **RTO** (*Recovery Time Objective*): quanto tempo para voltar (ex.: 30 min). Eles definem a estratégia.
`),
    theory('PITR: voltar ao segundo antes do erro', `
**Point-In-Time Recovery** = backup base + todo o WAL desde então. Se alguém rodou \`DROP TABLE pedidos\` às 14:32:10, você restaura até 14:32:09.

**Preparação (antes do incidente):**
~~~
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'pgbackrest --stanza=erp archive-push %p'   # ou cópia para storage seguro
~~~
+ backups base periódicos (\`pg_basebackup\` ou a ferramenta).

**Restauração:**
1. parar o servidor (ou subir **outro**, para não destruir evidências) e restaurar o backup base mais recente **anterior** ao incidente
2. configurar \`restore_command\` (como buscar os arquivos de WAL) e o alvo: \`recovery_target_time = '2026-03-10 14:32:09-03'\` (ou \`recovery_target_xid\`, \`recovery_target_lsn\`, \`recovery_target_name\` criado com \`pg_create_restore_point\`)
3. criar o arquivo \`recovery.signal\` no diretório de dados e iniciar
4. o servidor reaplica o WAL até o alvo e pausa (\`recovery_target_action = 'pause'\`): confira os dados, então \`SELECT pg_wal_replay_resume()\` ou promova
5. em geral, recupera-se num **servidor separado** e copia-se só a tabela perdida (\`pg_dump -t\`) de volta para produção, sem descartar o que aconteceu depois

Arquivos \`recovery.conf\` não existem mais desde o PostgreSQL 12: tudo vai no \`postgresql.conf\` + arquivo de sinal.
`),
    theory('Replicação, failover e pool de conexões', `
**Replicação física (streaming)**: réplicas recebem o WAL do primário em tempo real e ficam idênticas, **somente leitura** (*hot standby*).
- **assíncrona** (padrão): o primário não espera a réplica; numa queda pode perder os últimos instantes
- **síncrona** (\`synchronous_standby_names\`): o COMMIT espera a réplica confirmar; zero perda, mais latência
- **replication slots** garantem que o primário guarde o WAL que a réplica ainda não recebeu. Slot abandonado = WAL acumulando até **encher o disco** (monitore \`pg_replication_slots\`)
- **lag** de réplica: \`pg_stat_replication\` no primário; leituras na réplica podem estar segundos atrasadas (cuidado com "gravei e não li")

**Replicação lógica** (\`CREATE PUBLICATION\` / \`CREATE SUBSCRIPTION\`): replica **mudanças de linha** de tabelas escolhidas; funciona entre versões diferentes (migração de versão com pouca parada), alimenta outros sistemas e é a base de **CDC** (*Change Data Capture*, como o Debezium enviando mudanças para Kafka).

**Alta disponibilidade (HA)**: o PostgreSQL não faz failover sozinho. **Patroni** (com etcd/Consul) é o padrão de mercado: detecta a queda do primário, promove a réplica mais adequada e evita *split-brain* (dois primários). Em nuvem, serviços gerenciados (RDS Multi-AZ, Aurora, Cloud SQL HA) fazem isso por você.

**Pool de conexões**: cada conexão do PostgreSQL é um **processo** (alguns MB de memória); milhares de conexões degradam o servidor. **PgBouncer** fica no meio:
| modo | conexão real devolvida ao pool | limitações |
|---|---|---|
| session (padrão) | ao desconectar | nenhuma, mas reaproveita pouco |
| **transaction** | ao fim de cada transação | o mais usado; quebra recursos de sessão: \`SET\` fora de transação, \`LISTEN\`, advisory locks de sessão, tabelas temporárias que atravessam transações, \`PREPARE\` em SQL (prepared statements do protocolo são suportados desde o PgBouncer 1.21) |
| statement | a cada comando | não permite transações de vários comandos |

Dimensionamento: poucas dezenas de conexões reais por núcleo de CPU costumam bastar; o pool absorve milhares de clientes.
`),
    quiz('Às 14:32 alguém apagou uma tabela. Qual técnica permite voltar ao estado de 14:31:59?', ['PITR: backup base + WAL arquivado com recovery_target_time', 'pg_dump da noite anterior', 'VACUUM', 'Réplica síncrona (que também recebeu o DROP)'], 0),
    quiz('Por que uma réplica de streaming não protege contra um DROP TABLE acidental?', ['Ela reaplica o WAL do primário, incluindo o DROP, em segundos', 'Porque é somente leitura', 'Porque é assíncrona', 'Protege sim'], 0),
    quiz('Um replication slot de uma réplica desligada há semanas pode...', ['Acumular WAL até encher o disco do primário', 'Acelerar o primário', 'Apagar dados', 'Nada'], 0),
    quiz('No PgBouncer em modo transaction, o que deixa de funcionar de forma confiável?', ['SET de sessão, LISTEN/NOTIFY, advisory locks de sessão e tabelas temporárias entre transações', 'SELECT', 'COMMIT', 'Índices'], 0),
    quiz('Para migrar do PostgreSQL 14 para o 18 com poucos minutos de parada, uma estratégia é...', ['Replicação lógica para o servidor novo e troca da aplicação', 'pg_dump de 2 TB', 'Copiar os arquivos de dados', 'VACUUM FULL'], 0),
    order('Ordene uma restauração PITR:', ['restaurar o backup base anterior ao incidente', 'configurar restore_command e recovery_target_time', 'criar recovery.signal', 'iniciar o servidor e deixar reaplicar o WAL', 'conferir os dados e promover (ou copiar a tabela)']),
    fill('Complete com a sigla do objetivo de recuperação que define quanto dado é aceitável perder.', 'objetivo de ponto de recuperação: ___ = 5 minutos', [['RPO']]),
    fill('Complete com o arquivo que coloca o servidor em modo de recuperação até o alvo configurado.', 'touch $PGDATA/___', [['recovery.signal']]),
  ],
};

const L_SEG = {
  id: 'db-4-9', title: 'Segurança: roles, privilégios, RLS e criptografia',
  steps: [
    theory('Roles e o princípio do menor privilégio', `
No PostgreSQL, **usuários e grupos são roles**. Um role com \`LOGIN\` é um usuário; sem LOGIN, funciona como grupo:

~~~sql
CREATE ROLE leitura NOLOGIN;
GRANT USAGE ON SCHEMA public TO leitura;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO leitura;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO leitura;  -- tabelas futuras

CREATE ROLE app_relatorios LOGIN PASSWORD '...' IN ROLE leitura;
~~~

Boas práticas:
- a aplicação **não** conecta como superusuário nem como dono das tabelas: dono = role de migração; aplicação = role com DML só nas tabelas dela
- \`REVOKE CREATE ON SCHEMA public FROM PUBLIC\` (padrão desde o PostgreSQL 15)
- roles predefinidos: \`pg_read_all_data\`, \`pg_write_all_data\`, \`pg_monitor\` (monitoramento sem superusuário), \`pg_signal_backend\`
- **SECURITY DEFINER**: função roda com os privilégios do **dono**; útil para expor uma operação controlada, perigosa se não fixar \`SET search_path = pg_catalog, public\` (senão alguém cria uma função com o mesmo nome num esquema anterior e sequestra a chamada)
- senhas com \`scram-sha-256\` (não \`md5\`); acesso controlado em \`pg_hba.conf\` (quem, de onde, qual método)
- **TLS** obrigatório na rede (\`ssl = on\`, \`hostssl\` no pg_hba, cliente com \`sslmode=verify-full\`)
- criptografia em repouso: disco/volume criptografado (nuvem faz por padrão); colunas sensíveis com \`pgcrypto\` ou criptografia na aplicação (a chave nunca no banco)
- **auditoria**: \`log_connections\`, \`log_statement = 'ddl'\` e a extensão **pgaudit**
- LGPD: minimizar dados pessoais, mascarar em ambientes de teste, controlar quem lê CPF/e-mail (views ou privilégios por coluna: \`GRANT SELECT (id, nome) ON clientes TO ...\`)
`),
    theory('Row-Level Security (RLS)', `
**RLS** filtra **quais linhas** cada role vê ou altera, no próprio banco. Essencial em sistemas multi-inquilino (*multi-tenant*):

~~~sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_vendedor_uf ON clientes
  FOR SELECT TO vendedores
  USING (uf = current_setting('app.uf'));               -- filtro de leitura

CREATE POLICY p_insere_uf ON clientes
  FOR INSERT TO vendedores
  WITH CHECK (uf = current_setting('app.uf'));          -- valida o que é gravado
~~~

- \`USING\`: quais linhas existentes são visíveis/afetadas (SELECT, UPDATE, DELETE)
- \`WITH CHECK\`: quais linhas novas/alteradas são aceitas (INSERT, UPDATE)
- sem nenhuma policy aplicável, o role **não vê nada** (negação por padrão)
- várias policies **PERMISSIVE** (padrão) combinam com **OR**; policies **RESTRICTIVE** combinam com **AND** (ex.: "e também só linhas não arquivadas")
- o **dono** da tabela e superusuários ignoram RLS, a menos que \`ALTER TABLE ... FORCE ROW LEVEL SECURITY\`; roles com \`BYPASSRLS\` também ignoram
- padrão multi-tenant: a aplicação faz \`SET LOCAL app.tenant_id = '42'\` no início de cada transação e as policies usam \`current_setting('app.tenant_id')\` (compatível com PgBouncer em modo transaction, por ser \`LOCAL\`)
- índices na coluna usada pela policy (\`tenant_id\`) são obrigatórios para desempenho
`),
    exPg('Testando uma policy com SET ROLE', `
`, `CREATE ROLE vendedor_sp NOLOGIN;
GRANT SELECT ON clientes TO vendedor_sp;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sp ON clientes FOR SELECT TO vendedor_sp USING (uf = 'SP');

SET LOCAL ROLE vendedor_sp;
SELECT current_user, count(*) AS clientes_visiveis, string_agg(DISTINCT uf, ',') AS ufs FROM clientes;
RESET ROLE;
SELECT current_user, count(*) AS todos_os_clientes FROM clientes;`, `
O mesmo SELECT devolve só os clientes de SP para \`vendedor_sp\`, sem nenhum WHERE na consulta. De volta ao role original (dono), vê tudo.
`),
    quiz('Uma tabela com RLS habilitado e nenhuma policy para o role "analista". O que ele vê?', ['Nenhuma linha (negação por padrão)', 'Todas as linhas', 'Dá erro de sintaxe', 'Só as linhas que ele criou'], 0),
    quiz('Duas policies PERMISSIVE para o mesmo role e comando se combinam com...', ['OR', 'AND', 'XOR', 'A última vence'], 0),
    quiz('O dono da tabela ignora o RLS a menos que...', ['ALTER TABLE ... FORCE ROW LEVEL SECURITY', 'Use SET ROLE', 'A policy seja RESTRICTIVE', 'Nunca ignora'], 0),
    quiz('Por que uma função SECURITY DEFINER deve fixar o search_path?', ['Para que ninguém sequestre chamadas criando objetos com o mesmo nome em outro esquema', 'Para ficar mais rápida', 'É exigência do PL/pgSQL', 'Para usar índices'], 0),
    pgsql('Crie o role `leitor_relatorios` (NOLOGIN), conceda SELECT apenas na tabela `pedidos` e mostre os privilégios dele em `information_schema.role_table_grants` (colunas `table_name`, `privilege_type`).',
      `CREATE ROLE leitor_relatorios NOLOGIN;
GRANT SELECT ON pedidos TO leitor_relatorios;
SELECT table_name, privilege_type FROM information_schema.role_table_grants WHERE grantee = 'leitor_relatorios';`),
    pgsql('Habilite RLS em `faturas`, crie o role `cobranca_corp` com SELECT em `faturas` e uma policy que só mostre faturas de clientes do segmento **corporativo** (use subconsulta em `clientes`). Lembre de dar SELECT em `clientes` também. Teste com `SET LOCAL ROLE cobranca_corp` e mostre a contagem de faturas visíveis (coluna `faturas`).',
      `CREATE ROLE cobranca_corp NOLOGIN;
GRANT SELECT ON faturas, clientes TO cobranca_corp;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_corp ON faturas FOR SELECT TO cobranca_corp USING (cliente_id IN (SELECT id FROM clientes WHERE segmento = 'corporativo'));
SET LOCAL ROLE cobranca_corp;
SELECT count(*) AS faturas FROM faturas;`),
    pgsql('Multi-tenant com configuração: habilite RLS em `pedidos`, crie o role `loja_app` com SELECT em `pedidos` e uma policy `USING (canal = current_setting(\'app.canal\'))`. Defina `SET LOCAL app.canal = \'loja\'`, troque para o role e conte os pedidos (coluna `pedidos`).',
      `CREATE ROLE loja_app NOLOGIN;
GRANT SELECT ON pedidos TO loja_app;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_canal ON pedidos FOR SELECT TO loja_app USING (canal = current_setting('app.canal'));
SET LOCAL app.canal = 'loja';
SET LOCAL ROLE loja_app;
SELECT count(*) AS pedidos FROM pedidos;`),
  ],
};

const L_OBS = {
  id: 'db-4-10', title: 'Observabilidade e resposta a incidentes',
  steps: [
    theory('O que olhar e onde', `
| pergunta | onde |
|---|---|
| quem está conectado e fazendo o quê, há quanto tempo? | \`pg_stat_activity\` (\`state\`, \`wait_event_type\`, \`wait_event\`, \`xact_start\`, \`query_start\`, \`query\`) |
| quem está bloqueando quem? | \`pg_blocking_pids(pid)\`, \`pg_locks\` |
| quais consultas consomem mais tempo no total? | extensão **pg_stat_statements** (\`total_exec_time\`, \`calls\`, \`mean_exec_time\`, \`rows\`, \`shared_blks_read\`) |
| tabelas lidas por Seq Scan demais? | \`pg_stat_user_tables\` (\`seq_scan\`, \`seq_tup_read\`, \`idx_scan\`) |
| índices inúteis? | \`pg_stat_user_indexes.idx_scan = 0\` |
| o cache está dando conta? | \`pg_statio_user_tables\` (\`heap_blks_hit\` / (\`hit\` + \`read\`)) e \`pg_stat_database\` |
| checkpoints, I/O | \`pg_stat_checkpointer\` (PG17+), \`pg_stat_io\` (PG16+) |
| replicação | \`pg_stat_replication\`, \`pg_replication_slots\` |
| VACUUM | \`pg_stat_user_tables\` (\`n_dead_tup\`, \`last_autovacuum\`), \`pg_stat_progress_vacuum\` |

**pg_stat_statements** é a primeira extensão a instalar em produção (\`shared_preload_libraries = 'pg_stat_statements'\`): ela agrupa consultas iguais com parâmetros diferentes e mostra o **custo total**. Otimize o que soma mais tempo (\`total_exec_time\`), não só a consulta mais lenta.

**Logs úteis:** \`log_min_duration_statement = '500ms'\` (consultas lentas), \`log_lock_waits = on\`, \`log_autovacuum_min_duration\`, \`log_temp_files = 0\` (sorts que foram para disco). A extensão \`auto_explain\` grava o plano das consultas lentas.

Ferramentas: pgBadger (relatório a partir dos logs), Prometheus + postgres_exporter + Grafana, pganalyze, PMM, painéis do provedor de nuvem.
`),
    theory('Roteiros de incidente', `
**1. "Tudo travou": transação bloqueando as outras**
~~~sql
SELECT pid, pg_blocking_pids(pid) AS bloqueado_por, state, now() - xact_start AS idade, left(query, 60)
FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;
-- encontre a raiz (o pid que bloqueia e não está bloqueado), veja o que ela faz:
SELECT pid, state, now() - xact_start AS idade, query FROM pg_stat_activity WHERE pid = <raiz>;
SELECT pg_cancel_backend(<raiz>);      -- tenta cancelar a consulta
SELECT pg_terminate_backend(<raiz>);   -- se for "idle in transaction", derruba a conexão
~~~
Prevenção: \`idle_in_transaction_session_timeout\`, \`statement_timeout\`, \`lock_timeout\` nas migrações.

**2. CPU a 100% de repente**
1. \`pg_stat_activity\`: muitas sessões ativas com a mesma consulta?
2. \`pg_stat_statements\` ordenado por \`total_exec_time\`: a consulta nova que apareceu no topo
3. \`EXPLAIN (ANALYZE, BUFFERS)\` dela: Seq Scan em tabela grande? (índice removido, deploy com consulta nova, estatística ruim após carga massiva)
4. \`CREATE INDEX CONCURRENTLY\` / \`ANALYZE\` / reverter o deploy

**3. Disco enchendo**: WAL acumulado (slot abandonado, \`archive_command\` falhando), bloat, arquivos temporários de sorts, logs. Confira \`pg_replication_slots\`, \`pg_stat_archiver\` (\`failed_count\`).

**4. Tabela apagada por engano**: PITR num servidor separado até o segundo anterior, \`pg_dump -t\` da tabela e restauração em produção (Nível 4, backup).

**5. Lentidão progressiva ao longo de semanas**: bloat e VACUUM bloqueado por transação antiga; \`SELECT max(now() - xact_start) FROM pg_stat_activity\`, \`age(datfrozenxid)\` de \`pg_database\`.

Depois de todo incidente: linha do tempo, causa raiz, ação preventiva (alerta, timeout, revisão de migração). Sem culpados.
`),
    exPg('Painel rápido do servidor', `
`, `SELECT pid, state, backend_type, now() - backend_start AS conectado_ha, left(query, 50) AS consulta
FROM pg_stat_activity;
SELECT relname, seq_scan, idx_scan,
       round(100.0 * heap_blks_hit / nullif(heap_blks_hit + heap_blks_read, 0), 1) AS cache_hit_pct
FROM pg_stat_user_tables JOIN pg_statio_user_tables USING (relid, relname)
ORDER BY seq_scan DESC LIMIT 5;`, `
No app há uma única sessão (o banco roda dentro dele). No laboratório Docker você vai abrir várias conexões, travar uma transação e caçá-la com essas consultas.
`),
    quiz('Para achar a consulta que mais consome o servidor ao longo do dia, use...', ['pg_stat_statements ordenado por total_exec_time', 'pg_stat_activity uma vez', 'EXPLAIN em todas', 'pg_class'], 0),
    quiz('Uma sessão está "idle in transaction" há 3 horas e segurando locks. Qual comando a encerra?', ['pg_terminate_backend(pid)', 'pg_cancel_backend(pid) apenas', 'VACUUM', 'ROLLBACK em outra sessão'], 0),
    quiz('A CPU foi a 100% logo após um deploy. Qual é um primeiro passo eficaz?', ['Ver em pg_stat_statements/pg_stat_activity qual consulta nova domina e olhar o plano dela', 'Reiniciar o servidor sem investigar', 'Rodar VACUUM FULL', 'Aumentar max_connections'], 0),
    quiz('Qual configuração encerra automaticamente sessões esquecidas com transação aberta?', ['idle_in_transaction_session_timeout', 'statement_timeout', 'deadlock_timeout', 'checkpoint_timeout'], 0),
    pgsql('Monte a consulta de diagnóstico de bloqueios: de `pg_stat_activity`, traga `pid`, `state` e `bloqueado_por` (resultado de `pg_blocking_pids(pid)`) das sessões que estão bloqueadas.',
      `SELECT pid, state, pg_blocking_pids(pid) AS bloqueado_por FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;`, { allowEmpty: true }),
    pgsql('Calcule a **taxa de acerto de cache** geral das tabelas do usuário: soma de `heap_blks_hit` sobre a soma de `heap_blks_hit + heap_blks_read` de `pg_statio_user_tables`, em porcentagem com 1 casa (coluna `cache_hit_pct`).',
      `SELECT round(100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0), 1) AS cache_hit_pct FROM pg_statio_user_tables;`),
    pgsql('Liste as tabelas com mais **varreduras sequenciais** do que varreduras por índice (ou sem nenhuma por índice) segundo `pg_stat_user_tables`. Colunas `relname`, `seq_scan`, `idx_scan`.',
      `SELECT relname, seq_scan, idx_scan FROM pg_stat_user_tables WHERE seq_scan > coalesce(idx_scan, 0);`, { allowEmpty: true }),
  ],
};

const L_PROJETO4 = {
  id: 'db-4-11', title: 'Projeto: tuning de um sistema lento e plano de recuperação',
  steps: [
    theory('O desafio do nível', `
O ERP do curso está lento. Em produção (20 milhões de linhas no laboratório Docker), estas consultas levam de 15 a 45 segundos; a meta é **menos de 50 ms** cada, sem quebrar as escritas:

1. **Histórico do cliente**: últimos 20 pedidos de um cliente, com status
2. **Fila de operação**: pedidos pendentes mais antigos
3. **Busca de cliente por e-mail** no login (sem diferenciar maiúsculas)
4. **Faturas vencidas** em aberto
5. **Itens de um pedido** com dados do produto
6. **Busca de produto por trecho do nome**

Método para cada uma: medir (\`EXPLAIN (ANALYZE, BUFFERS)\`), identificar o nó caro, escolher o índice mínimo (ou reescrever), medir de novo, e conferir o custo extra nas escritas.

**Entregável de operação** (no laboratório):
- política de backup com RPO de 5 min e RTO de 30 min: backup base diário + WAL contínuo
- **teste de PITR**: apagar uma tabela de propósito, anotar o horário, restaurar num contêiner separado até 1 segundo antes, provar que os dados voltaram
- runbook dos incidentes da lição anterior

Abaixo, você resolve cada consulta aqui no app: os corretores conferem o **plano** gerado, não só o resultado.
`),
    exPg('Diagnóstico inicial: onde estão os Seq Scans', `
`, `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF)
SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 9876 ORDER BY criado_em DESC LIMIT 20;`, `
Seq Scan em 80 mil pedidos para entregar 20 linhas, com Sort no final. Com 20 milhões de linhas, o mesmo plano lê gigabytes.
`),
    pgsql('**Consulta 1.** Crie o índice **composto** que atende `SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 9876 ORDER BY criado_em DESC LIMIT 20` tanto no filtro quanto na ordenação (igualdade primeiro, depois a ordenação).',
      `CREATE INDEX ix_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);`,
      { check: `${PLANO}SELECT pg_temp.plano($q$SELECT id, criado_em, status FROM pedidos WHERE cliente_id = 9876 ORDER BY criado_em DESC LIMIT 20$q$) ~ 'Index' AS plano_ok, EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'pedidos' AND indexdef ~ '\\(cliente_id, criado_em') AS composto;`,
        hint: 'Índice composto: primeiro a coluna de igualdade (cliente_id), depois a de ordenação (criado_em DESC).' }),
    pgsql("**Consulta 4.** Faturas vencidas em aberto: `SELECT id, cliente_id, vencimento, valor FROM faturas WHERE pago_em IS NULL AND vencimento < '2025-12-01' ORDER BY vencimento`. Crie um índice **parcial** que atenda a consulta.",
      `CREATE INDEX ix_faturas_abertas ON faturas (vencimento) WHERE pago_em IS NULL;`,
      { check: `${PLANO}SELECT pg_temp.plano($q$SELECT id, cliente_id, vencimento, valor FROM faturas WHERE pago_em IS NULL AND vencimento < '2025-12-01' ORDER BY vencimento$q$) ~ 'Index' AS plano_ok, (SELECT count(*) FROM pg_indexes WHERE tablename = 'faturas' AND indexdef ~ 'WHERE') > 0 AS parcial;` }),
    pgsql('**Consulta 5.** `SELECT i.*, p.nome FROM itens_pedido i JOIN produtos p ON p.id = i.produto_id WHERE i.pedido_id = 12345` já está rápida? Verifique: a PK de `itens_pedido` começa por `pedido_id`. Mostre a definição da PK de `itens_pedido` (coluna `indexdef`, de `pg_indexes`, filtrando por `indexname = \'itens_pedido_pkey\'`).',
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'itens_pedido_pkey';`),
    pgsql('**Consulta 6.** Busca de produto por trecho: `SELECT id, nome FROM produtos WHERE nome ILIKE \'%fone%\'`. Crie o índice adequado.',
      `CREATE INDEX ix_produtos_nome_trgm ON produtos USING gin (nome gin_trgm_ops);`,
      { check: usaIndice(`SELECT id, nome FROM produtos WHERE nome ILIKE '%fone%'`) }),
    pgsql('**Fechamento.** Depois de criar os índices das consultas 1, 3 (e-mail em minúsculas), 4 e 6 numa única execução, liste os índices criados por você nas tabelas `pedidos`, `clientes`, `faturas` e `produtos` que **não** são PK nem UNIQUE: colunas `tablename`, `indexname`. Use os nomes `ix_pedidos_cliente_data`, `ix_clientes_email_lower`, `ix_faturas_abertas`, `ix_produtos_nome_trgm`.',
      `CREATE INDEX ix_pedidos_cliente_data ON pedidos (cliente_id, criado_em DESC);
CREATE INDEX ix_clientes_email_lower ON clientes (lower(email));
CREATE INDEX ix_faturas_abertas ON faturas (vencimento) WHERE pago_em IS NULL;
CREATE INDEX ix_produtos_nome_trgm ON produtos USING gin (nome gin_trgm_ops);
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('pedidos', 'clientes', 'faturas', 'produtos') AND indexname LIKE 'ix\\_%';`),
    quiz('Cada índice criado no projeto acelera leituras. Qual verificação final é obrigatória antes de levar para produção?', ['Medir o impacto nas escritas e criar com CREATE INDEX CONCURRENTLY', 'Nenhuma', 'Rodar VACUUM FULL', 'Desligar o autovacuum'], 0),
    quiz('No teste de PITR, por que restaurar num servidor separado em vez de no de produção?', ['Para recuperar só a tabela perdida sem descartar tudo que aconteceu depois do incidente', 'Porque é obrigatório', 'Porque o PITR não funciona no primário', 'Para economizar disco'], 0),
  ],
};

export const DB_N4 = {
  id: 'db-u4', level: 4, title: 'Internals, performance e operação em produção',
  description: 'Páginas, WAL, VACUUM, todos os tipos de índice, EXPLAIN, antipadrões, particionamento, backup/PITR, replicação, segurança e incidentes. Entregável: tuning + plano de recuperação',
  lessons: [L_STORAGE, L_VACUUM, L_BTREE, L_OUTROS, L_EXPLAIN, L_ANTI, L_PARTICAO, L_BACKUP, L_SEG, L_OBS, L_PROJETO4],
};
