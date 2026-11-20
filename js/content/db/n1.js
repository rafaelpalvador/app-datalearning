// Trilha Bancos de Dados (PostgreSQL) — Nível 1: Fundamentos, arquitetura e modelagem relacional
import { theory, quiz, order, fill, pgsql, exPg } from '../helpers.js';

const L_SGBD = {
  id: 'db-1-1', title: 'Banco, SGBD, instância e ACID',
  steps: [
    theory('O que é um SGBD e por que PostgreSQL', `
Três palavras que costumam ser confundidas:

| termo | o que é | no PostgreSQL |
|---|---|---|
| **banco de dados** | o conjunto organizado de dados | um *database* (\`CREATE DATABASE erp\`) |
| **SGBD** | o software que guarda, protege e consulta os dados | o PostgreSQL em si |
| **instância** (ou *cluster*) | um servidor do SGBD rodando, com sua pasta de dados, memória e processos | um \`postgres\` escutando na porta 5432, com vários databases dentro |

Dentro de um database há **schemas** (pastas lógicas: \`public\`, \`financeiro\`, \`staging\`) e, dentro deles, tabelas, views, funções e índices. O nome completo de uma tabela é \`schema.tabela\`.

**Por que PostgreSQL como base deste curso:**
- segue o padrão **ANSI SQL** com rigor e implementa recursos avançados (window functions, CTEs recursivas, MERGE, JSONB, particionamento, tipos ricos)
- é **transacional de verdade**: até comandos de estrutura (\`CREATE TABLE\`, \`ALTER\`) participam de transações e podem ser desfeitos
- é **open source**, gratuito e base de serviços gerenciados (AWS RDS e Aurora, Google Cloud SQL e AlloyDB, Azure, Supabase, Neon)
- tem um ecossistema enorme de extensões (PostGIS, pgvector, TimescaleDB, Citus)

**Arquitetura cliente-servidor:** o servidor é um processo principal (*postmaster*) que cria **um processo por conexão**, mais processos de apoio (*checkpointer*, *WAL writer*, *autovacuum*, *background writer*). Clientes (o \`psql\`, o DBeaver, sua aplicação) conversam com ele pela rede. Por isso conexões são caras e, em produção, usa-se um *pool* de conexões (Nível 4).

> Neste app, você usa um **PostgreSQL 18 de verdade**, compilado para WebAssembly, rodando no seu aparelho. Ele tem uma conexão só; os laboratórios do curso mostram como subir o servidor completo com Docker.
`),
    theory('ACID na prática', `
Uma **transação** é um conjunto de comandos tratado como uma unidade. As garantias **ACID** são o que separa um SGBD sério de uma planilha:

| letra | garantia | exemplo concreto |
|---|---|---|
| **A**tomicidade | tudo ou nada | numa transferência, o débito e o crédito acontecem juntos ou nenhum acontece |
| **C**onsistência | a transação leva o banco de um estado válido a outro válido | um \`CHECK (saldo >= 0)\` impede o saque que deixaria o saldo negativo |
| **I**solamento | transações simultâneas não enxergam o "meio do caminho" umas das outras | dois caixas sacando da mesma conta ao mesmo tempo não geram saldo errado |
| **D**urabilidade | depois do COMMIT, o dado sobrevive a queda de energia | o PostgreSQL grava primeiro no **WAL** (Write-Ahead Log) e só confirma depois |

~~~sql
BEGIN;
UPDATE contas SET saldo = saldo - 100 WHERE id = 1;
UPDATE contas SET saldo = saldo + 100 WHERE id = 2;
COMMIT;      -- as duas mudanças passam a valer juntas
-- ROLLBACK; -- desfaria as duas
~~~

Sem \`BEGIN\`, cada comando é uma transação própria (*autocommit*). A consistência não é mágica: ela depende das **constraints** que **você** declara (NOT NULL, CHECK, UNIQUE, FK). O isolamento tem níveis e custos, assunto do Nível 3.
`),
    theory('Ambiente profissional: psql, Docker e cliente SQL', `
No mercado, ninguém administra banco só por ferramenta visual. O fluxo mínimo:

~~~bash
# sobe um PostgreSQL 18 isolado, com a pasta de dados num volume
docker run -d --name pg18 -e POSTGRES_PASSWORD=senha -p 5432:5432 \\
  -v pgdata:/var/lib/postgresql postgres:18

# entra no psql, o terminal oficial
docker exec -it pg18 psql -U postgres
~~~

Comandos do **psql** que você usa todo dia:

| comando | faz |
|---|---|
| \`\\l\` | lista databases |
| \`\\c erp\` | conecta no database erp |
| \`\\dn\` | lista schemas |
| \`\\dt\`, \`\\d pedidos\` | lista tabelas / descreve uma tabela (colunas, índices, FKs) |
| \`\\di\`, \`\\df\`, \`\\dv\` | índices, funções, views |
| \`\\x\` | resultado na vertical (linhas largas) |
| \`\\timing\` | mostra o tempo de cada comando |
| \`\\e\` | abre o último comando no editor |
| \`\\i arquivo.sql\` | executa um script |
| \`\\q\` | sai |

Clientes gráficos profissionais (**DBeaver**, **DataGrip**, **pgAdmin**) ajudam a navegar, mas você sempre escreve o SQL. A pasta \`labs/postgres\` do projeto tem um \`docker-compose.yml\` pronto com PostgreSQL 18, PgBouncer e Redis para os laboratórios.
`),
    theory('Revisão relâmpago de SQL (pré-requisito)', `
Esta trilha supõe o básico de SQL (a trilha **SQL** do app cobre do zero). Resumo do que você vai usar desde já:

~~~sql
SELECT uf, count(*) AS clientes          -- colunas e agregações
FROM clientes                             -- tabela
WHERE nome LIKE 'A%'                      -- filtro de linhas (% = qualquer texto, _ = um caractere)
GROUP BY uf                               -- um grupo por UF
HAVING count(*) > 10                      -- filtro de grupos (depois do GROUP BY)
ORDER BY clientes DESC                    -- ordenação
LIMIT 5;                                  -- só as 5 primeiras
~~~

- \`WHERE\` filtra **linhas** antes de agrupar; \`HAVING\` filtra **grupos** depois
- \`count(*)\` conta linhas; \`count(DISTINCT x)\` conta valores distintos; \`sum\`, \`avg\`, \`min\` e \`max\` resumem uma coluna
- \`JOIN ... ON\` junta tabelas pela chave (Nível 2 aprofunda)
- no PostgreSQL, \`ILIKE\` é o LIKE sem diferenciar maiúsculas

**Catálogo do sistema:** o próprio banco descreve a si mesmo em tabelas consultáveis. \`information_schema\` é o padrão SQL (portável): \`information_schema.tables\` lista tabelas e \`information_schema.columns\` lista colunas com \`data_type\` e \`ordinal_position\` (a posição na tabela). Os catálogos \`pg_*\` (\`pg_class\`, \`pg_constraint\`, \`pg_indexes\`) são específicos do PostgreSQL e mais completos.
`),
    exPg('Conversando com o PostgreSQL deste app', `
Consultas ao **catálogo** mostram o que existe no banco, como o \`\\d\` do psql faz por baixo dos panos.
`, `SELECT version();

SELECT table_name,
       (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;`, `
A primeira consulta mostra a versão (PostgreSQL 18). A segunda lista as tabelas do schema \`public\` com o número de colunas: é o mesmo catálogo que ferramentas como o DBeaver leem.
`),
    exPg('Atomicidade: o CHECK derruba a transação inteira', `
A conta 1 tem saldo limitado. Tentamos transferir um valor maior do que ela tem.
`, `SELECT id, saldo FROM contas WHERE id IN (1, 2);
-- tente executar o bloco abaixo trocando o valor: com 999999 o CHECK (saldo >= 0) falha
UPDATE contas SET saldo = saldo - 50 WHERE id = 1;
UPDATE contas SET saldo = saldo + 50 WHERE id = 2;
SELECT id, saldo FROM contas WHERE id IN (1, 2);`, `
Com 50, as duas contas mudam juntas. Troque os dois \`50\` por \`999999\` e execute: o PostgreSQL recusa com *violates check constraint* e **nenhuma** das duas atualizações vale. (Neste app, cada execução é desfeita no fim, então o banco volta ao original.)
`),
    quiz('Um servidor PostgreSQL na porta 5432 com os databases `erp` e `bi` é...', ['Uma instância (cluster) com dois databases', 'Dois SGBDs', 'Um schema com duas tabelas', 'Duas instâncias'], 0),
    quiz('Qual propriedade ACID garante que um pedido confirmado não some depois de uma queda de energia?', ['Durabilidade (graças ao WAL)', 'Atomicidade', 'Isolamento', 'Consistência'], 0),
    quiz('A consistência do ACID depende principalmente de...', ['Constraints declaradas no banco (CHECK, FK, UNIQUE, NOT NULL)', 'Usar ORM', 'Ter backup', 'Usar índices'], 0),
    quiz('No psql, qual comando descreve as colunas, índices e chaves de uma tabela?', ['\\d nome_da_tabela', '\\l', '\\q', '\\timing'], 0),
    pgsql('Usando `information_schema.tables`, liste o nome (`table_name`) das tabelas do schema `public` cujo nome começa com `p` (ex.: pedidos, produtos).',
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'p%';`),
    pgsql('Usando `information_schema.columns`, liste `column_name` e `data_type` das colunas da tabela `pedidos`, na ordem em que aparecem na tabela (`ordinal_position`).',
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pedidos' ORDER BY ordinal_position;`,
      { ordered: true }),
  ],
};

const L_ALGEBRA = {
  id: 'db-1-2', title: 'Álgebra relacional: a matemática por trás do SQL',
  steps: [
    theory('Relações e as operações fundamentais', `
O modelo relacional (Codd, 1970) trata cada tabela como uma **relação**: um conjunto de tuplas (linhas) com os mesmos atributos (colunas). Por ser um **conjunto**, a ordem das linhas não tem significado e, na teoria, não há linhas repetidas.

A **álgebra relacional** é o conjunto de operações que recebem relações e devolvem relações. Todo \`SELECT\` é traduzido internamente para uma combinação delas:

| operação | símbolo | o que faz | em SQL |
|---|---|---|---|
| **seleção** | σ (sigma) | filtra linhas por uma condição | \`WHERE\` |
| **projeção** | π (pi) | escolhe colunas | lista do \`SELECT\` |
| **produto cartesiano** | × | combina cada linha de A com cada linha de B | \`CROSS JOIN\` |
| **junção** | ⋈ | produto + seleção pela condição de ligação | \`JOIN ... ON\` |
| **união** | ∪ | linhas de A ou de B | \`UNION\` |
| **diferença** | − | linhas de A que não estão em B | \`EXCEPT\` |
| **interseção** | ∩ | linhas em A e em B | \`INTERSECT\` |
| **renomeação** | ρ (rho) | dá outro nome a relação/atributo | \`AS\` |

Exemplo: "nome dos clientes de SP" é π<sub>nome</sub>(σ<sub>uf='SP'</sub>(clientes)) = \`SELECT nome FROM clientes WHERE uf = 'SP'\`.
`),
    theory('Por que isso importa no dia a dia', `
1. **O otimizador pensa em álgebra.** Ele reescreve a consulta em expressões equivalentes e escolhe a mais barata: empurrar a seleção para antes da junção (filtrar cedo), reordenar junções, transformar subconsultas em junções. Quando você entende as equivalências, entende os planos de execução (Nível 4).
2. **SQL não é exatamente álgebra relacional.** O SQL trabalha com **multiconjuntos** (permite linhas repetidas) e com **NULL** (lógica de três valores). Por isso existe \`DISTINCT\` e \`UNION\` × \`UNION ALL\`: a teoria pura remove duplicatas sempre; o SQL só quando você pede.
3. **Junção = produto + seleção.** Um JOIN sem condição vira produto cartesiano: 10 mil clientes × 80 mil pedidos = 800 milhões de linhas. Esse é o erro clássico que derruba servidores.

**Equivalências úteis:**
- σ<sub>c1 ∧ c2</sub>(R) = σ<sub>c1</sub>(σ<sub>c2</sub>(R)): condições com AND podem ser aplicadas em qualquer ordem
- σ<sub>c</sub>(R ⋈ S) = σ<sub>c</sub>(R) ⋈ S, se c só usa colunas de R: filtrar antes de juntar
- R ∩ S = R − (R − S)
`),
    exPg('As operações em SQL', `
Cada consulta abaixo corresponde a uma operação da álgebra. Execute e compare as contagens.
`, `SELECT 'seleção (σ uf = SP)' AS operacao, count(*) AS linhas FROM clientes WHERE uf = 'SP'
UNION ALL
SELECT 'projeção (π uf) com DISTINCT', count(*) FROM (SELECT DISTINCT uf FROM clientes) x
UNION ALL
SELECT 'produto (categorias × 2 status)', count(*) FROM categorias CROSS JOIN (VALUES ('a'), ('b')) v(s)
UNION ALL
SELECT 'diferença (clientes − com pedido)', count(*) FROM (SELECT id FROM clientes EXCEPT SELECT cliente_id FROM pedidos) d;`, `
A projeção com \`DISTINCT\` devolve 15 UFs: sem ele, o SQL devolveria 10 mil linhas repetidas (multiconjunto). O produto tem 31 × 2 = 62 linhas. A diferença mostra os clientes que nunca compraram.
`),
    quiz('Em álgebra relacional, a cláusula WHERE corresponde a...', ['Seleção (σ)', 'Projeção (π)', 'Produto (×)', 'União (∪)'], 0),
    quiz('Por que o SQL tem UNION e UNION ALL, se a álgebra relacional só tem a união?', ['Porque o SQL trabalha com multiconjuntos (linhas repetidas são permitidas)', 'Por compatibilidade com Excel', 'Porque UNION ALL é mais preciso', 'Não há motivo'], 0),
    quiz('Um JOIN sem condição entre 10 mil clientes e 80 mil pedidos produz...', ['800 milhões de linhas (produto cartesiano)', '90 mil linhas', '80 mil linhas', 'Um erro de sintaxe'], 0),
    pgsql('Usando **EXCEPT** (diferença), liste os `id` de produtos que **nunca** apareceram em `itens_pedido`.',
      `SELECT id FROM produtos EXCEPT SELECT produto_id FROM itens_pedido;`, { allowEmpty: true }),
    pgsql('Usando **INTERSECT**, liste os `id` de clientes que compraram pelo canal `app` **e** também pelo canal `loja`. Mostre só a quantidade, numa coluna `clientes`.',
      `SELECT count(*) AS clientes FROM (SELECT cliente_id FROM pedidos WHERE canal = 'app' INTERSECT SELECT cliente_id FROM pedidos WHERE canal = 'loja') x;`),
  ],
};

const L_CONCEITUAL = {
  id: 'db-1-3', title: 'Modelagem conceitual: entidades e relacionamentos',
  steps: [
    theory('Do negócio ao diagrama', `
Modelar é decidir **o que** o banco precisa representar antes de pensar em tabelas. O vício a eliminar: "criar uma planilha dentro do banco" (uma tabela enorme com tudo repetido).

A modelagem tem três camadas:

| camada | pergunta | produto |
|---|---|---|
| **conceitual** | quais coisas e relações existem no negócio? | DER (diagrama entidade-relacionamento) |
| **lógica** | como isso vira tabelas, chaves e relacionamentos? | esquema relacional |
| **física** | quais tipos, índices, partições e parâmetros no SGBD escolhido? | DDL (\`CREATE TABLE\`...) |

**Elementos do modelo conceitual:**
- **Entidade**: algo com identidade própria que o negócio precisa registrar (Cliente, Pedido, Produto). Entidade **fraca** depende de outra para existir (Item de pedido não existe sem Pedido)
- **Atributo**: característica da entidade
  - simples (nome) ou **composto** (endereço = rua + número + cidade)
  - monovalorado ou **multivalorado** (telefones de um cliente → vira tabela própria)
  - **derivado**: calculável a partir de outros (idade a partir da data de nascimento; total do pedido a partir dos itens) → normalmente **não** se armazena
  - **identificador**: o que distingue uma ocorrência das outras
- **Relacionamento**: associação entre entidades ("Cliente **faz** Pedido")
`),
    theory('Cardinalidade e entidades associativas', `
A **cardinalidade** diz quantas ocorrências de uma entidade se associam a uma da outra:

| tipo | exemplo | como vira tabela (camada lógica) |
|---|---|---|
| **1:1** | Funcionário — Crachá | FK com UNIQUE em um dos lados (ou a mesma tabela) |
| **1:N** | Cliente — Pedidos | FK no lado N (\`pedidos.cliente_id\`) |
| **N:N** | Pedido — Produto | **tabela associativa** com as duas FKs (\`itens_pedido\`) |

Também se define a **participação** (cardinalidade mínima): todo pedido **precisa** ter cliente (obrigatória → \`NOT NULL\` na FK); um cliente **pode** não ter pedidos (opcional).

**Entidade associativa**: quando o relacionamento N:N tem atributos próprios, ele vira entidade. Em "Pedido contém Produto", a quantidade e o preço praticado pertencem ao **relacionamento**, não ao pedido nem ao produto: por isso \`itens_pedido\` guarda \`quantidade\`, \`preco_unitario\` e \`desconto\`.

**Notação "pé de galinha" (crow's foot)**, a mais usada em ferramentas:
~~~text
clientes ||--o{ pedidos       um cliente tem zero ou muitos pedidos
pedidos  ||--|{ itens_pedido  um pedido tem um ou muitos itens
produtos ||--o{ itens_pedido  um produto aparece em zero ou muitos itens
~~~
\`||\` = exatamente um, \`o{\` = zero ou muitos, \`|{\` = um ou muitos.

**Relacionamento recursivo** (autorrelacionamento): Funcionário gerencia Funcionário (\`funcionarios.gerente_id\`), Categoria contém Categoria (\`categorias.pai_id\`).
`),
    exPg('Lendo os relacionamentos do banco do curso', `
As chaves estrangeiras declaradas **são** os relacionamentos do modelo. O catálogo \`pg_constraint\` lista todas:
`, `SELECT conrelid::regclass AS tabela,
       confrelid::regclass AS referencia,
       pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE contype = 'f'
ORDER BY 1, 2;`, `
Cada linha é uma seta do DER: \`pedidos → clientes\` (1:N), \`itens_pedido → pedidos\` e \`itens_pedido → produtos\` (a tabela associativa do N:N), e os autorrelacionamentos \`categorias → categorias\` e \`funcionarios → funcionarios\`.
`),
    quiz('Um aluno pode se matricular em várias turmas, e cada turma tem vários alunos. A nota do aluno na turma deve ficar em...', ['Uma tabela associativa matrícula(aluno_id, turma_id, nota)', 'Na tabela alunos', 'Na tabela turmas', 'Num campo de texto com todas as notas'], 0),
    quiz('"Idade do cliente" quando já existe "data de nascimento" é um atributo...', ['Derivado: normalmente não se armazena', 'Composto', 'Multivalorado', 'Identificador'], 0),
    quiz('Um cliente pode ter vários telefones. Como modelar?', ['Tabela telefones com FK para clientes (atributo multivalorado vira tabela)', 'Colunas telefone1, telefone2, telefone3', 'Um texto com os telefones separados por vírgula', 'Uma coluna JSON sempre'], 0),
    quiz('Em `clientes ||--o{ pedidos`, o `o{` do lado de pedidos significa...', ['Zero ou muitos pedidos por cliente', 'Exatamente um pedido', 'Um ou muitos pedidos', 'Nenhum pedido'], 0),
    order('Ordene as camadas da modelagem, da mais abstrata para a mais concreta:', ['conceitual', 'lógica', 'física']),
    pgsql('Quais tabelas têm **autorrelacionamento** (FK apontando para a própria tabela)? Use `pg_constraint` e mostre a coluna `tabela` (`conrelid::regclass`).',
      `SELECT conrelid::regclass AS tabela FROM pg_constraint WHERE contype = 'f' AND conrelid = confrelid;`),
  ],
};

const L_LOGICA = {
  id: 'db-1-4', title: 'Modelagem lógica: chaves primárias e estrangeiras',
  steps: [
    theory('Chave natural × chave substituta', `
Toda tabela precisa de uma **chave primária (PK)**: única, nunca nula e, de preferência, **imutável**.

| tipo | exemplo | vantagens | riscos |
|---|---|---|---|
| **natural** | CPF, ISBN, código do país | já existe no negócio, evita duplicidade real | muda (CPF digitado errado, regras novas), pode ser longa, dado pessoal espalhado em FKs |
| **substituta** (*surrogate*) | número sequencial, UUID | estável, curta, sem significado | não impede duplicidade do mundo real **sozinha** |

A prática profissional: **PK substituta + UNIQUE na chave natural**. Assim as FKs usam um número estável e o banco ainda impede dois clientes com o mesmo CPF.

**Gerando chaves substitutas no PostgreSQL:**

| forma | observação |
|---|---|
| \`SERIAL\` / \`BIGSERIAL\` | atalho antigo: cria uma sequence e um DEFAULT; permissões e dono da sequence dão trabalho |
| \`GENERATED ALWAYS AS IDENTITY\` | **padrão SQL**, recomendado; \`ALWAYS\` impede inserir id "na mão" por engano (\`BY DEFAULT\` permite) |
| \`uuid\` com \`gen_random_uuid()\` (**UUIDv4**) | aleatório: ótimo para gerar fora do banco e para não expor volume; ruim para índice B-tree (inserções espalhadas, páginas fragmentadas) |
| \`uuidv7()\` (**PostgreSQL 18**) | começa com o instante de criação: ordenado no tempo, então inserções vão para o fim do índice como um sequencial, mantendo as vantagens do UUID |

Use \`bigint\` (não \`int\`) para tabelas que podem passar de 2,1 bilhões de linhas ao longo da vida do sistema.
`),
    theory('Chaves estrangeiras e chaves compostas', `
A **chave estrangeira (FK)** garante a **integridade referencial**: o valor precisa existir na tabela referenciada.

~~~sql
CREATE TABLE pedidos (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id  bigint NOT NULL REFERENCES clientes (id),
  ...
);
~~~

- \`NOT NULL\` na FK = participação **obrigatória** (todo pedido tem cliente)
- FK que aceita NULL = participação **opcional** (\`funcionarios.gerente_id\` é NULL para a CEO)
- **O PostgreSQL não cria índice automaticamente na coluna da FK** (só na PK/UNIQUE referenciada). Sem índice em \`pedidos.cliente_id\`, apagar um cliente obriga a varrer a tabela de pedidos inteira para checar referências, e os JOINs ficam lentos. Regra prática: **indexe as FKs** (Nível 4)

**Chave composta**: PK formada por mais de uma coluna. Natural em tabelas associativas:

~~~sql
CREATE TABLE itens_pedido (
  pedido_id   bigint REFERENCES pedidos (id),
  produto_id  int    REFERENCES produtos (id),
  quantidade  int    NOT NULL,
  PRIMARY KEY (pedido_id, produto_id)   -- o mesmo produto não aparece duas vezes no mesmo pedido
);
~~~

**Mapeamento conceitual → lógico:** entidade → tabela; atributo → coluna; 1:N → FK no lado N; N:N → tabela associativa com PK composta (ou PK própria + UNIQUE no par); 1:1 → FK com UNIQUE; multivalorado → tabela filha.
`),
    exPg('IDENTITY, UUIDv4 e UUIDv7 lado a lado', `
Criamos três tabelas iguais com tipos de chave diferentes e inserimos 5 linhas em cada.
`, `CREATE TABLE t_identity (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, x int);
CREATE TABLE t_uuid4 (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, x int);
CREATE TABLE t_uuid7 (id uuid DEFAULT uuidv7() PRIMARY KEY, x int);
INSERT INTO t_identity (x) SELECT g FROM generate_series(1, 5) g;
INSERT INTO t_uuid4 (x) SELECT g FROM generate_series(1, 5) g;
INSERT INTO t_uuid7 (x) SELECT g FROM generate_series(1, 5) g;
SELECT 'identity' AS tipo, id::text, x FROM t_identity
UNION ALL SELECT 'uuidv4', id::text, x FROM t_uuid4
UNION ALL SELECT 'uuidv7', id::text, x FROM t_uuid7;`, `
Os UUIDv7 começam todos com o mesmo prefixo (o horário) e crescem na ordem de inserção; os UUIDv4 são totalmente aleatórios. Tente inserir um id manual em \`t_identity\` (\`INSERT INTO t_identity (id, x) VALUES (99, 1)\`): o \`ALWAYS\` recusa.
`),
    quiz('Qual a prática recomendada para a tabela de clientes com CPF?', ['PK substituta (IDENTITY) + UNIQUE no CPF', 'CPF como PK e sem UNIQUE', 'Sem PK, só UNIQUE no CPF', 'PK composta de nome e CPF'], 0),
    quiz('Por que UUIDv7 é melhor que UUIDv4 como PK em tabelas que crescem muito?', ['É ordenado no tempo: inserções vão para o fim do índice B-tree, sem fragmentar', 'Ocupa menos bytes', 'É mais aleatório', 'É mais seguro'], 0),
    quiz('O PostgreSQL cria índice automaticamente na coluna de uma chave estrangeira?', ['Não: só na PK/UNIQUE referenciada; indexe a FK você mesmo', 'Sim, sempre', 'Só se a tabela for grande', 'Só em FKs compostas'], 0),
    quiz('Uma FK que aceita NULL representa uma participação...', ['Opcional', 'Obrigatória', 'Recursiva', 'N:N'], 0),
    pgsql('Crie a tabela `telefones` com: `id` bigint IDENTITY (ALWAYS) como PK, `cliente_id` bigint **obrigatório** referenciando `clientes(id)`, `numero` text obrigatório, e garanta que o mesmo número não se repita para o mesmo cliente (UNIQUE composto). A correção confere a estrutura pelo catálogo.',
      `CREATE TABLE telefones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id bigint NOT NULL REFERENCES clientes (id),
  numero text NOT NULL,
  UNIQUE (cliente_id, numero)
);`,
      { check: `SELECT c.column_name, c.is_nullable, c.is_identity, (SELECT string_agg(pg_get_constraintdef(k.oid), ' | ' ORDER BY pg_get_constraintdef(k.oid)) FROM pg_constraint k WHERE k.conrelid = 'telefones'::regclass) AS constraints FROM information_schema.columns c WHERE c.table_name = 'telefones' ORDER BY c.ordinal_position`, ordered: true,
        hint: 'Use `GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `NOT NULL REFERENCES clientes (id)` e `UNIQUE (cliente_id, numero)`.' }),
    pgsql('Crie a tabela associativa `produto_fornecedor` ligando `produtos(id)` (int) a uma tabela `fornecedores` que você também deve criar (`id` int IDENTITY PK, `nome` text NOT NULL). A associativa tem `produto_id`, `fornecedor_id`, `preco_compra` numeric(12,2) NOT NULL e PK composta (produto_id, fornecedor_id).',
      `CREATE TABLE fornecedores (id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY, nome text NOT NULL);
CREATE TABLE produto_fornecedor (
  produto_id int REFERENCES produtos (id),
  fornecedor_id int REFERENCES fornecedores (id),
  preco_compra numeric(12,2) NOT NULL,
  PRIMARY KEY (produto_id, fornecedor_id)
);`,
      { check: `SELECT conname IS NOT NULL AS ok, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'produto_fornecedor'::regclass ORDER BY contype, def`, ordered: true }),
  ],
};

const L_FISICA = {
  id: 'db-1-5', title: 'Modelagem física: escolhendo os tipos certos',
  steps: [
    theory('Números e dinheiro', `
| tipo | faixa / precisão | use para |
|---|---|---|
| \`smallint\` (2 bytes) | ±32 mil | códigos pequenos |
| \`integer\` (4 bytes) | ±2,1 bilhões | contagens, ids de tabelas pequenas |
| \`bigint\` (8 bytes) | ±9,2 quintilhões | ids de tabelas grandes, somas grandes |
| \`numeric(p, s)\` | **exato**, até 131 mil dígitos | **dinheiro**, quantidades fracionadas exatas |
| \`real\` / \`double precision\` | **aproximado** (binário, 6 / 15 dígitos) | medidas científicas, estatística, coordenadas |

**Nunca use \`float\` para dinheiro.** Frações decimais como 0,1 não têm representação exata em binário:

~~~sql
SELECT 0.1::float8 + 0.2::float8 = 0.3;      -- false (0.30000000000000004)
SELECT 0.1::numeric + 0.2::numeric = 0.3;    -- true
~~~

Em milhões de lançamentos, o erro acumulado vira centavos que não fecham na conciliação. \`numeric(12,2)\` = até 10 dígitos antes da vírgula e 2 depois. Evite o tipo \`money\` (depende da configuração de moeda do servidor).
`),
    theory('Datas, textos, booleanos e tipos ricos', `
**Data e hora:**
| tipo | guarda | quando usar |
|---|---|---|
| \`date\` | só a data | vencimentos, aniversários |
| \`timestamp\` (sem fuso) | data e hora "de parede", sem saber de qual fuso | quase nunca: ambíguo entre fusos e horário de verão |
| \`timestamptz\` | um **instante absoluto** (guardado em UTC, exibido no fuso da sessão) | **eventos**: criação de pedido, pagamento, login |
| \`interval\` | duração | prazos, SLA |

\`timestamptz\` não guarda o fuso: ele converte a entrada para UTC e mostra no \`TimeZone\` da sessão. Um evento registrado em São Paulo e lido em Lisboa mostra a hora certa em cada lugar.

**Texto:** no PostgreSQL, \`text\` e \`varchar\` têm o **mesmo desempenho**. \`varchar(n)\` só acrescenta um limite de tamanho; prefira \`text\` com um \`CHECK (length(col) <= n)\` quando o limite for regra de negócio (mudar um CHECK é mais barato que mudar o tipo). \`char(n)\` completa com espaços e quase nunca é o que você quer.

**Booleano:** \`boolean\` (true/false/NULL), não \`'S'/'N'\` nem 0/1.

**Tipos ricos:** \`uuid\`, \`jsonb\` (documento binário indexável), arrays (\`text[]\`), \`inet\`/\`cidr\` (IPs), intervalos (\`daterange\`, \`tstzrange\`), \`enum\`.

**Enum × tabela de domínio:** \`CREATE TYPE status AS ENUM (...)\` é compacto, mas acrescentar ou renomear valores exige \`ALTER TYPE\` e remover não é simples; uma tabela de domínio com FK (ou um \`CHECK (status IN (...))\`) é mais flexível.
`),
    exPg('Dinheiro, fuso horário e tamanho dos tipos', `
`, `SELECT 0.1::float8 + 0.2::float8 AS soma_float,
       0.1::numeric + 0.2::numeric AS soma_numeric,
       pg_column_size(1::smallint) AS bytes_smallint,
       pg_column_size(1::bigint) AS bytes_bigint,
       pg_column_size(123456.78::numeric(12,2)) AS bytes_numeric,
       timestamptz '2025-03-10 15:00:00-03' AT TIME ZONE 'UTC' AS em_utc,
       timestamptz '2025-03-10 15:00:00-03' AT TIME ZONE 'Europe/Lisbon' AS em_lisboa;`, `
O float mostra o erro binário; o numeric soma exato. O mesmo instante aparece como 18:00 em UTC e 18:00 em Lisboa (mesmo fuso de UTC em março), enquanto em São Paulo era 15:00.
`),
    quiz('Qual tipo usar para o valor de uma fatura?', ['numeric(12,2)', 'double precision', 'real', 'money'], 0),
    quiz('Para registrar o instante em que um pagamento foi aprovado, num sistema usado em vários fusos, o tipo certo é...', ['timestamptz', 'timestamp', 'date', 'text'], 0),
    quiz('No PostgreSQL, comparado a varchar(255), o tipo text é...', ['Igual em desempenho; varchar só adiciona um limite de tamanho', 'Mais lento', 'Mais rápido sempre', 'Proibido em índices'], 0),
    pgsql('Mostre se `0.1 + 0.2 = 0.3` é verdadeiro em `double precision` (coluna `com_float`) e em `numeric` (coluna `com_numeric`).',
      `SELECT 0.1::float8 + 0.2::float8 = 0.3::float8 AS com_float, 0.1::numeric + 0.2::numeric = 0.3::numeric AS com_numeric;`),
    pgsql('Crie a tabela `contratos` com: `id` bigint IDENTITY PK; `cliente_id` bigint NOT NULL FK para clientes; `valor_mensal` **numeric(12,2)** NOT NULL; `inicio` **date** NOT NULL; `assinado_em` **timestamptz** NOT NULL; `ativo` **boolean** NOT NULL DEFAULT true; `observacao` **text**.',
      `CREATE TABLE contratos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id bigint NOT NULL REFERENCES clientes (id),
  valor_mensal numeric(12,2) NOT NULL,
  inicio date NOT NULL,
  assinado_em timestamptz NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacao text
);`,
      { check: `SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'contratos' AND column_name <> 'id' ORDER BY ordinal_position`, ordered: true }),
  ],
};

const L_NORMAL = {
  id: 'db-1-6', title: 'Normalização: 1FN, 2FN, 3FN, BCNF, 4FN e 5FN',
  steps: [
    theory('Anomalias: o problema que a normalização resolve', `
Considere a "planilha dentro do banco":

| pedido | data | cliente | cidade_cliente | produto | categoria | qtd |
|---|---|---|---|---|---|---|
| 1 | 05/01 | Ana | SP | Mouse | Periféricos | 2 |
| 1 | 05/01 | Ana | SP | Teclado | Periféricos | 1 |
| 2 | 07/01 | Ana | SP | Monitor | Monitores | 1 |

Problemas (**anomalias**):
- **Atualização**: Ana muda de cidade → é preciso atualizar várias linhas; esquecer uma deixa o banco contraditório
- **Inserção**: não dá para cadastrar um produto novo sem inventar um pedido
- **Exclusão**: apagar o pedido 2 apaga a única informação de que o Monitor é da categoria Monitores

A causa é misturar fatos diferentes numa tabela. A ferramenta para separá-los é a **dependência funcional (DF)**: X → Y significa "conhecendo X, Y fica determinado". Aqui: \`pedido → data, cliente\`; \`cliente → cidade_cliente\`; \`produto → categoria\`; \`(pedido, produto) → qtd\`.
`),
    theory('As formas normais', `
| forma | regra | violação típica | correção |
|---|---|---|---|
| **1FN** | valores **atômicos**, sem grupos repetidos | \`telefones = '1199..., 1198...'\` ou colunas \`produto1, produto2\` | uma linha por valor, em tabela filha |
| **2FN** | 1FN + todo atributo não-chave depende da chave **inteira** (só importa com chave composta) | em itens(pedido, produto, qtd, **categoria**), categoria depende só de produto | mover categoria para produtos |
| **3FN** | 2FN + nenhum atributo não-chave depende de **outro não-chave** (sem dependência transitiva) | em pedidos(id, cliente, **cidade_cliente**): id → cliente → cidade | cidade fica em clientes |
| **BCNF** | todo determinante é **chave candidata** | aula(aluno, disciplina, professor) com professor → disciplina, mas professor não é chave | separar professor→disciplina |
| **4FN** | sem **dependências multivaloradas** independentes na mesma tabela | funcionario_habilidade_idioma(func, habilidade, idioma): habilidades e idiomas são independentes e geram combinações | duas tabelas: func_habilidade, func_idioma |
| **5FN** | sem dependências de **junção** que permitam decompor sem perda em 3+ tabelas | fornecedor-peça-projeto com regra cíclica | decompor nas três associações |

Frase clássica para a 3FN: "cada atributo depende **da chave, da chave inteira e de nada além da chave**".

**Desnormalização consciente:** em sistemas analíticos (Nível 5) ou para desempenho medido, duplica-se dado de propósito (ex.: guardar \`total\` no pedido). Faça só com motivo medido e com um mecanismo que mantenha a cópia correta (trigger, job, view materializada).
`),
    exPg('Encontrando uma dependência transitiva nos dados', `
Se a tabela de pedidos guardasse a UF do cliente, cada cliente teria a mesma UF repetida em todos os pedidos. Montamos essa "planilha" e mostramos a redundância:
`, `WITH planilha AS (
  SELECT p.id AS pedido, p.cliente_id, c.uf AS uf_cliente
  FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
)
SELECT count(*) AS linhas_na_planilha,
       count(DISTINCT cliente_id) AS fatos_realmente_distintos,
       count(*) - count(DISTINCT cliente_id) AS copias_redundantes_da_uf
FROM planilha;`, `
São 80 mil cópias da UF para cerca de 10 mil fatos reais. Uma mudança de UF exigiria atualizar dezenas de linhas por cliente. Na 3FN, a UF fica uma vez em \`clientes\`.
`),
    quiz('Uma coluna `telefones` com o texto "11999990000, 1133330000" viola qual forma normal?', ['1FN (valor não atômico)', '2FN', '3FN', 'BCNF'], 0),
    quiz('Em itens(pedido_id, produto_id, quantidade, nome_produto), com PK (pedido_id, produto_id), nome_produto viola...', ['2FN: depende só de parte da chave (produto_id)', '1FN', '3FN apenas', '4FN'], 0),
    quiz('Em pedidos(id, cliente_id, email_cliente), email_cliente viola...', ['3FN: dependência transitiva id → cliente_id → email', '2FN', '1FN', '5FN'], 0),
    quiz('Um funcionário tem várias habilidades e fala vários idiomas, independentes entre si. Guardar tudo em func_hab_idioma(func, habilidade, idioma) viola...', ['4FN (dependências multivaloradas independentes)', '1FN', '2FN', 'Nenhuma'], 0),
    quiz('Quando desnormalizar é aceitável?', ['Com motivo medido (desempenho, analítico) e um mecanismo que mantenha a cópia correta', 'Sempre que der preguiça de fazer JOIN', 'Nunca', 'Só em tabelas pequenas'], 0),
    pgsql('Verifique a dependência funcional `produto_id → preco_unitario` em `itens_pedido`: liste os produtos que aparecem com **mais de um preço unitário diferente** (coluna `produto_id`). Se não houver nenhum, a DF vale nos dados.',
      `SELECT produto_id FROM itens_pedido GROUP BY produto_id HAVING count(DISTINCT preco_unitario) > 1;`, { allowEmpty: true }),
    pgsql('Verifique se `cidade → uf` vale em `clientes` (cada cidade em uma só UF). Mostre o número de cidades que aparecem em mais de uma UF, numa coluna `violacoes`.',
      `SELECT count(*) AS violacoes FROM (SELECT cidade FROM clientes GROUP BY cidade HAVING count(DISTINCT uf) > 1) x;`),
  ],
};

const L_INTEGRIDADE = {
  id: 'db-1-7', title: 'Integridade no banco: constraints e políticas referenciais',
  steps: [
    theory('Constraints: regras que o banco garante', `
Validação só na aplicação falha: há scripts, importações, outra aplicação, um estagiário no psql. **Regras de negócio essenciais vão no banco**:

| constraint | garante | exemplo |
|---|---|---|
| \`NOT NULL\` | valor obrigatório | \`email text NOT NULL\` |
| \`UNIQUE\` | não repete (NULLs não colidem entre si, a não ser com \`NULLS NOT DISTINCT\`, PG15+) | \`UNIQUE (cpf)\` |
| \`PRIMARY KEY\` | UNIQUE + NOT NULL | |
| \`CHECK\` | expressão verdadeira (ou NULL) | \`CHECK (valor > 0)\`, \`CHECK (vencimento >= emissao)\` |
| \`DEFAULT\` | valor quando omitido | \`criado_em timestamptz DEFAULT now()\` |
| \`FOREIGN KEY\` | valor existe na tabela referenciada | \`REFERENCES clientes (id)\` |
| \`EXCLUDE\` | nenhum par de linhas conflita pela regra (com GiST) | duas reservas da mesma sala sem sobreposição de horário |

Detalhes que derrubam entrevistas:
- \`CHECK\` com resultado **NULL passa** (lógica de três valores): \`CHECK (desconto <= 100)\` aceita desconto NULL; combine com NOT NULL se necessário
- \`UNIQUE\` parcial: \`CREATE UNIQUE INDEX ON contratos (cliente_id) WHERE ativo\` → no máximo **um contrato ativo** por cliente
- Dê **nomes** às constraints (\`CONSTRAINT faturas_valor_positivo CHECK (valor > 0)\`): mensagens de erro e migrações ficam legíveis
- **Colunas geradas**: \`total numeric GENERATED ALWAYS AS (qtd * preco) STORED\` (no PG 18, o padrão passou a ser VIRTUAL, calculada na leitura)
`),
    theory('Políticas referenciais: o que acontece ao apagar o "pai"', `
\`REFERENCES pai (id) ON DELETE <ação> ON UPDATE <ação>\`:

| ação | ao apagar o pai | quando usar |
|---|---|---|
| \`NO ACTION\` (padrão) / \`RESTRICT\` | **impede** se houver filhos | quase sempre: pedidos de um cliente não podem sumir |
| \`CASCADE\` | apaga os filhos junto | filhos sem sentido sozinhos: itens de um pedido |
| \`SET NULL\` | põe NULL na FK dos filhos | relação opcional: gerente demitido, subordinados ficam sem gerente |
| \`SET DEFAULT\` | põe o DEFAULT | raro |

Diferença NO ACTION × RESTRICT: NO ACTION verifica no fim do comando (e pode ser **adiada** para o COMMIT com \`DEFERRABLE INITIALLY DEFERRED\`); RESTRICT verifica imediatamente.

**Cuidado com CASCADE:** um \`DELETE FROM clientes WHERE ...\` com cascatas encadeadas pode apagar pedidos, pagamentos e faturas em silêncio. Em dados financeiros, prefira **não apagar**: use exclusão lógica (\`ativo = false\` ou \`excluido_em timestamptz\`) e mantenha auditoria.
`),
    exPg('As constraints em ação', `
Cada INSERT abaixo viola uma regra. Execute um de cada vez (comente os outros com \`--\`) para ver a mensagem.
`, `SELECT conname, pg_get_constraintdef(oid) AS regra
FROM pg_constraint
WHERE conrelid = 'faturas'::regclass;
-- INSERT INTO faturas (cliente_id, emissao, vencimento, valor) VALUES (1, '2025-05-10', '2025-05-01', 100);   -- CHECK vencimento >= emissao
-- INSERT INTO faturas (cliente_id, emissao, vencimento, valor) VALUES (999999, '2025-05-10', '2025-06-10', 100); -- FK cliente inexistente
-- INSERT INTO faturas (cliente_id, emissao, vencimento, valor) VALUES (1, '2025-05-10', '2025-06-10', -5);    -- CHECK valor > 0`, `
A consulta ao catálogo mostra as regras da tabela \`faturas\`. Descomente um INSERT por vez: o PostgreSQL recusa cada um com uma mensagem que cita a constraint violada.
`),
    exPg('ON DELETE CASCADE apaga em silêncio', `
\`itens_pedido\` referencia \`pedidos\` com ON DELETE CASCADE. Apagar um pedido leva os itens junto:
`, `SELECT count(*) AS itens_do_pedido_10 FROM itens_pedido WHERE pedido_id = 10;
DELETE FROM pagamentos WHERE pedido_id = 10;   -- pagamentos não tem CASCADE: sem isto, o DELETE abaixo falharia
DELETE FROM pedidos WHERE id = 10;
SELECT count(*) AS itens_depois FROM itens_pedido WHERE pedido_id = 10;`, `
Os itens sumiram junto com o pedido. Já \`pagamentos\` usa a política padrão (NO ACTION): apagar um pedido pago sem antes tratar o pagamento é recusado, que é o comportamento certo para dados financeiros.
`),
    quiz('`CHECK (desconto <= 100)` aceita uma linha com desconto NULL?', ['Sim: CHECK com resultado NULL passa; use NOT NULL junto', 'Não', 'Só se houver DEFAULT', 'Dá erro de sintaxe'], 0),
    quiz('Para impedir que um cliente tenha dois contratos **ativos** ao mesmo tempo, use...', ['Índice UNIQUE parcial: UNIQUE (cliente_id) WHERE ativo', 'UNIQUE (cliente_id)', 'CHECK (ativo)', 'Trigger obrigatório'], 0),
    quiz('Qual política referencial usar entre pedidos e clientes num ERP?', ['RESTRICT/NO ACTION: não deixar apagar cliente com pedidos', 'CASCADE', 'SET NULL', 'Nenhuma FK'], 0),
    pgsql('Crie a tabela `centros_custo` (`id` int IDENTITY PK, `codigo` text NOT NULL **UNIQUE**, `nome` text NOT NULL, `orcamento` numeric(14,2) NOT NULL com a constraint nomeada `cc_orcamento_nao_negativo` que exige orçamento >= 0).',
      `CREATE TABLE centros_custo (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  orcamento numeric(14,2) NOT NULL,
  CONSTRAINT cc_orcamento_nao_negativo CHECK (orcamento >= 0)
);`,
      { check: `SELECT contype, conname = 'cc_orcamento_nao_negativo' AS nome_ok, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'centros_custo'::regclass ORDER BY contype, def`, ordered: true }),
    pgsql('Garanta no banco que um cliente tenha no máximo **um contrato ativo**: crie a tabela `contratos_cli` (`id` bigint IDENTITY PK, `cliente_id` bigint NOT NULL FK clientes, `ativo` boolean NOT NULL) e um **índice único parcial** `um_ativo_por_cliente` em `cliente_id` só para linhas com `ativo`.',
      `CREATE TABLE contratos_cli (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id bigint NOT NULL REFERENCES clientes (id),
  ativo boolean NOT NULL
);
CREATE UNIQUE INDEX um_ativo_por_cliente ON contratos_cli (cliente_id) WHERE ativo;`,
      { check: `SELECT indexname, indexdef ~* 'UNIQUE' AS unico, indexdef ~* 'WHERE ativo' AS parcial FROM pg_indexes WHERE tablename = 'contratos_cli' AND indexname = 'um_ativo_por_cliente'` }),
    pgsql('Crie a tabela `reservas_sala` (`id` int IDENTITY PK, `sala` int NOT NULL, `inicio` timestamptz NOT NULL, `fim` timestamptz NOT NULL) com um CHECK **`reserva_periodo_valido`** exigindo `fim > inicio`. Depois mostre quantas constraints CHECK a tabela tem (coluna `checks`).',
      `CREATE TABLE reservas_sala (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sala int NOT NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  CONSTRAINT reserva_periodo_valido CHECK (fim > inicio)
);
SELECT count(*) AS checks FROM pg_constraint WHERE conrelid = 'reservas_sala'::regclass AND contype = 'c';`,
      { check: `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'reservas_sala'::regclass AND contype = 'c'` }),
  ],
};

const L_PROJETO1 = {
  id: 'db-1-8', title: 'Projeto: modelagem e DDL de um ERP financeiro',
  steps: [
    theory('O desafio do nível', `
Você vai projetar o núcleo de um **ERP comercial e financeiro** e escrever o DDL completo, justificando cada chave e tipo. Requisitos:

1. **clientes** (já existe no banco do curso)
2. **contratos** de um cliente, com valor mensal, vigência e status
3. **pedidos** e **itens** (já existem; observe as escolhas)
4. **faturas** emitidas para um cliente, opcionalmente ligadas a um contrato
5. **pagamentos parciais**: uma fatura pode ser paga em várias parcelas; nunca pagar mais que o valor
6. **centros de custo**: cada fatura é atribuída a um centro de custo
7. **auditoria**: toda alteração relevante registra quem, quando, o quê (antes e depois)

**Decisões que você deve justificar:**
- PK: \`bigint IDENTITY\` (sequencial interno) × \`uuidv7\` (ids expostos em APIs)
- dinheiro em \`numeric(14,2)\`; datas de vencimento em \`date\`; eventos em \`timestamptz\`
- status com \`CHECK (status IN (...))\` ou tabela de domínio
- \`ON DELETE RESTRICT\` em tudo que é financeiro; exclusão lógica em vez de DELETE
- auditoria em \`jsonb\` (antes/depois) para não depender do formato de cada tabela

Nos exercícios a seguir, cada parte é criada e conferida pelo catálogo do PostgreSQL. O script completo comentado está em \`labs/postgres/projetos/nivel1_erp.sql\`.
`),
    exPg('Modelo de referência para conferir depois', `
Uma versão do modelo para comparar com a sua (rode e leia as escolhas).
`, `CREATE TABLE erp_contratos (
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
FROM information_schema.columns WHERE table_name LIKE 'erp_%' GROUP BY table_name;`, `
Repare no \`daterange\` para vigência (um tipo de intervalo nativo), no id público \`uuidv7\` separado da PK interna, e nas regras de data como CHECK nomeado.
`),
    pgsql('**Parte 1 — pagamentos parciais.** Crie `erp_faturas2` (`id` bigint IDENTITY PK, `valor` numeric(14,2) NOT NULL CHECK > 0) e `erp_parcelas` (`id` bigint IDENTITY PK, `fatura_id` bigint NOT NULL FK para erp_faturas2 com **ON DELETE RESTRICT**, `valor` numeric(14,2) NOT NULL CHECK > 0, `pago_em` timestamptz NOT NULL). A correção confere as FKs e CHECKs.',
      `CREATE TABLE erp_faturas2 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  valor numeric(14,2) NOT NULL CHECK (valor > 0)
);
CREATE TABLE erp_parcelas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fatura_id bigint NOT NULL REFERENCES erp_faturas2 (id) ON DELETE RESTRICT,
  valor numeric(14,2) NOT NULL CHECK (valor > 0),
  pago_em timestamptz NOT NULL
);`,
      { check: `SELECT conrelid::regclass AS tabela, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid IN ('erp_faturas2'::regclass, 'erp_parcelas'::regclass) AND contype IN ('c','f') ORDER BY 1, 2, 3`, ordered: true }),
    pgsql('**Parte 2 — auditoria.** Crie `erp_auditoria` com: `id` bigint IDENTITY PK; `tabela` text NOT NULL; `registro_id` bigint NOT NULL; `operacao` text NOT NULL com CHECK em (\'INSERT\',\'UPDATE\',\'DELETE\'); `antes` jsonb; `depois` jsonb; `usuario` text NOT NULL DEFAULT `current_user`; `ocorrido_em` timestamptz NOT NULL DEFAULT `now()`.',
      `CREATE TABLE erp_auditoria (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela text NOT NULL,
  registro_id bigint NOT NULL,
  operacao text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  antes jsonb,
  depois jsonb,
  usuario text NOT NULL DEFAULT current_user,
  ocorrido_em timestamptz NOT NULL DEFAULT now()
);`,
      { check: `SELECT column_name, data_type, is_nullable, column_default IS NOT NULL AS tem_default FROM information_schema.columns WHERE table_name = 'erp_auditoria' ORDER BY ordinal_position`, ordered: true }),
    pgsql('**Parte 3 — regra "não pagar mais que a fatura".** Uma constraint CHECK não enxerga outras linhas, então a regra precisa de outra técnica. Escreva a consulta de **verificação** que lista as faturas de `faturas` (tabela do curso) cujo `pago_em` é anterior à `emissao` (dados inconsistentes). Mostre `id`, `emissao`, `pago_em`.',
      `SELECT id, emissao, pago_em FROM faturas WHERE pago_em < emissao;`, { allowEmpty: true,
        hint: 'Compare as duas colunas no WHERE. Regras entre linhas (soma das parcelas ≤ valor) são garantidas com trigger ou com a função de pagamento (Nível 3).' }),
    quiz('Por que guardar `antes` e `depois` da auditoria em jsonb?', ['Uma única tabela de auditoria serve para qualquer tabela, sem depender das colunas de cada uma', 'jsonb é mais rápido que qualquer outro tipo', 'É obrigatório no PostgreSQL', 'Para economizar espaço sempre'], 0),
    quiz('Como garantir que a soma das parcelas nunca passe do valor da fatura?', ['Com trigger ou pela função de pagamento com bloqueio da fatura (FOR UPDATE), pois CHECK não vê outras linhas', 'Com CHECK (sum(valor) <= fatura.valor)', 'Com UNIQUE', 'Não é possível no banco'], 0),
  ],
};

export const DB_N1 = {
  id: 'db-u1', level: 1, title: 'Fundamentos, arquitetura e modelagem relacional',
  description: 'SGBD, ACID, álgebra relacional, DER, chaves, tipos, normalização e integridade. Entregável: DDL de um ERP financeiro',
  lessons: [L_SGBD, L_ALGEBRA, L_CONCEITUAL, L_LOGICA, L_FISICA, L_NORMAL, L_INTEGRIDADE, L_PROJETO1],
};
