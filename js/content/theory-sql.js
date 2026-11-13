// Aprofundamento teórico das lições de SQL.
// Cada lição recebe cards completos que vêm ANTES de qualquer exercício.
import { theory } from './helpers.js';

export const SQL_THEORY = {
  'sql-1-1': [
    theory('Anatomia de uma consulta', `
Toda consulta SQL é uma **pergunta** feita ao banco. A forma mais simples tem duas partes:

~~~sql
SELECT nome          -- QUAIS colunas você quer ver
FROM clientes;       -- DE QUAL tabela
~~~

- **SELECT** lista as colunas, separadas por vírgula
- **FROM** diz a tabela de onde elas vêm
- O **ponto e vírgula** encerra o comando
- Palavras-chave (SELECT, FROM) não diferenciam maiúsculas de minúsculas, mas a convenção é escrevê-las em MAIÚSCULAS para facilitar a leitura

O resultado é sempre **uma nova tabela** (linhas e colunas), mesmo que tenha uma única célula. Nada é alterado no banco: consultas com SELECT só leem os dados.

**Por que a chave primária importa?** Ela identifica cada linha de forma única e nunca se repete nem fica vazia. É por ela que outras tabelas fazem referência a um registro (a chave estrangeira \`pedidos.cliente_id\` aponta para \`clientes.id\`). Sem uma identidade única, não seria possível saber de qual cliente é cada pedido.
`),
  ],
  'sql-1-2': [
    theory('SELECT em detalhe: colunas, cálculos e boas práticas', `
**Colunas calculadas.** No SELECT você pode escrever expressões com as colunas:

~~~sql
SELECT nome, preco, estoque, preco * estoque AS valor_em_estoque
FROM produtos;
~~~

Os operadores aritméticos são \`+ - * /\`. O **alias** (\`AS nome\`) dá um nome legível à coluna calculada; sem ele, o banco usa a própria expressão como nome.

**SELECT \\* na prática.** O asterisco é ótimo para **explorar** uma tabela, mas deve ser evitado em consultas que vão para relatórios e sistemas (produção):

- traz colunas que ninguém usa, o que **gasta processamento, memória e rede**
- em bancos na nuvem como BigQuery e Snowflake, você **paga pelo volume de colunas lidas**
- se alguém adicionar ou remover uma coluna da tabela, o resultado **muda de formato** e pode **quebrar** quem consome a consulta

Por isso, em produção, liste explicitamente as colunas necessárias.

**Ordem das colunas.** O resultado vem na ordem em que as colunas aparecem no SELECT, não na ordem da tabela.
`),
  ],
  'sql-1-3': [
    theory('Ordenação, limites e duplicados em detalhe', `
**ORDER BY** pode receber várias colunas: a segunda só desempata a primeira.

~~~sql
SELECT categoria, nome, preco FROM produtos
ORDER BY categoria ASC, preco DESC;
-- dentro de cada categoria (A→Z), do mais caro para o mais barato
~~~

**LIMIT n** devolve apenas as n primeiras linhas **depois** da ordenação; sem ORDER BY, quais linhas vêm primeiro não é garantido. **OFFSET k** pula as k primeiras linhas, o que permite **paginação**:

| página (10 por página) | cláusula | linhas retornadas |
|---|---|---|
| 1ª | \`LIMIT 10 OFFSET 0\` | 1 a 10 |
| 2ª | \`LIMIT 10 OFFSET 10\` | 11 a 20 |
| 3ª | \`LIMIT 10 OFFSET 20\` | 21 a 30 |

**DISTINCT** remove linhas repetidas considerando **todas as colunas do SELECT** juntas: \`SELECT DISTINCT cidade, estado\` devolve cada par cidade-estado uma vez.

**Ordem em que o banco executa** (diferente da ordem em que escrevemos): FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT. Por isso dá para ordenar por um alias definido no SELECT.
`),
  ],
  'sql-2-1': [
    theory('Comparações, aspas e tipos', `
**Aspas simples e aspas duplas não são a mesma coisa:**

- **'texto'** (aspas simples) é um **valor**: \`WHERE status = 'entregue'\`
- **"coluna"** (aspas duplas) é um **nome** de coluna ou tabela, usado quando o nome tem espaço ou acento: \`SELECT "valor total"\`
- Sem aspas, \`WHERE estado = SP\` é interpretado como uma **coluna chamada SP**, o que dá erro

**Diferente de:** \`<>\` é o padrão SQL; \`!=\` também funciona na maioria dos bancos.

**Comparando textos e datas.** Textos são comparados letra a letra (ordem alfabética) e, em muitos bancos, diferenciam maiúsculas de minúsculas. Datas no formato ISO \`'AAAA-MM-DD'\` podem ser comparadas diretamente:

~~~sql
SELECT * FROM pedidos WHERE data_pedido >= '2024-06-01';
~~~

**Igualdade com número decimal.** Comparar valores calculados com \`=\` pode falhar por arredondamento binário (0,1 + 0,2 não é exatamente 0,3). Prefira faixas (\`>=\` e \`<\`) ou arredonde antes.
`),
  ],
  'sql-2-2': [
    theory('Precedência e listas em detalhe', `
**Precedência.** Como na matemática (multiplicação antes da soma), no SQL o **NOT** é avaliado primeiro, depois o **AND**, e por último o **OR**:

~~~sql
WHERE categoria = 'Livros' OR categoria = 'Móveis' AND preco > 2000
-- é lido como:
WHERE categoria = 'Livros' OR (categoria = 'Móveis' AND preco > 2000)
-- traz TODOS os livros, mais os móveis acima de 2000
~~~

Se a intenção era "livros ou móveis, mas só os caros", os parênteses são obrigatórios:

~~~sql
WHERE (categoria = 'Livros' OR categoria = 'Móveis') AND preco > 2000
~~~

**IN** é um atalho para vários OR na mesma coluna: \`estado IN ('SP', 'RJ')\` equivale a \`estado = 'SP' OR estado = 'RJ'\`. **NOT IN** é o contrário.

**BETWEEN a AND b** inclui **os dois extremos**: \`preco BETWEEN 100 AND 500\` aceita 100 e 500. Com datas e horários, cuidado: \`BETWEEN '2024-03-01' AND '2024-03-31'\` não inclui horários do dia 31 depois da meia-noite numa coluna com hora.
`),
  ],
  'sql-2-3': [
    theory('NULL em detalhe: a lógica de três valores', `
Com NULL, uma condição pode ser **verdadeira, falsa ou desconhecida**. O WHERE só mantém as linhas **verdadeiras**.

| expressão | resultado |
|---|---|
| \`NULL = NULL\` | desconhecido (não verdadeiro!) |
| \`NULL <> 'x'\` | desconhecido |
| \`NULL + 10\` | NULL |
| \`email IS NULL\` | verdadeiro quando o email está vazio |

Por isso \`WHERE email = NULL\` **nunca** retorna linhas: a comparação nunca é verdadeira. O teste certo é \`IS NULL\` / \`IS NOT NULL\`.

**COALESCE(a, b, c)** devolve o primeiro valor que não for NULL. Usos típicos: trocar ausentes por um texto (\`COALESCE(email, 'sem email')\`) ou por zero antes de somar.

**LIKE** em detalhe: \`%\` casa com qualquer sequência (inclusive vazia) e \`_\` com exatamente um caractere. Assim, \`'_a%'\` significa "qualquer primeira letra, depois a letra a, depois qualquer coisa". Atenção: \`NOT LIKE\` também ignora as linhas com NULL.
`),
  ],
  'sql-2-4': [
    theory('Concatenação, arredondamento e CASE em detalhe', `
**Concatenar textos** no SQLite e no PostgreSQL usa o operador de duas barras verticais: \`nome || ' - ' || estado\` gera "Ana Souza - SP". Se uma das partes for NULL, o resultado inteiro vira NULL; envolva com COALESCE quando necessário.

**ROUND(x, n)** arredonda para n casas decimais. Arredonde **no final** do cálculo, não nas etapas intermediárias, para não acumular erro.

**CASE WHEN** avalia as condições **de cima para baixo** e para na primeira verdadeira. Por isso a ordem importa:

~~~sql
CASE
  WHEN preco >= 2000 THEN 'premium'        -- testado primeiro
  WHEN preco >= 300  THEN 'intermediário'  -- só chega aqui quem tem preço < 2000
  ELSE 'básico'
END
~~~

Se as condições fossem invertidas (\`>= 300\` primeiro), um produto de 5.000 cairia em "intermediário". Sem o **ELSE**, linhas que não atendem nenhuma condição recebem **NULL**.
`),
  ],
  'sql-3-1': [
    theory('Como as agregações tratam NULL', `
Funções de agregação **ignoram NULL**, com uma exceção:

| função | o que conta ou calcula | com NULL |
|---|---|---|
| \`COUNT(*)\` | linhas | conta todas as linhas |
| \`COUNT(coluna)\` | valores preenchidos | **não conta** os NULL |
| \`COUNT(DISTINCT coluna)\` | valores diferentes | ignora NULL |
| \`SUM\`, \`AVG\`, \`MIN\`, \`MAX\` | sobre os valores | ignoram NULL |

Exemplo: a tabela clientes tem 10 linhas e 2 emails vazios. \`COUNT(*)\` dá 10 e \`COUNT(email)\` dá **8**. A diferença entre os dois é uma forma rápida de medir **dados faltantes**.

**AVG ignora NULL**, o que pode enganar: a média de (10, NULL, 20) é 15, não 10. Se ausência significa zero no seu negócio, use \`AVG(COALESCE(x, 0))\`.

Sem GROUP BY, uma consulta com agregação devolve **uma única linha** resumindo a tabela inteira.
`),
  ],
  'sql-3-2': [
    theory('GROUP BY passo a passo', `
Imagine a consulta \`SELECT categoria, COUNT(*) FROM produtos GROUP BY categoria\`:

1. O banco **separa** as linhas em montes, um por valor de categoria (Acessórios, Eletrônicos, Livros, Móveis)
2. **Calcula** a agregação em cada monte
3. **Devolve uma linha por monte**

**Regra de ouro.** Cada coluna no SELECT precisa ser **uma chave do agrupamento** ou estar **dentro de uma agregação**. Em \`SELECT categoria, nome, COUNT(*) ... GROUP BY categoria\`, o monte "Acessórios" tem vários nomes: qual deles mostrar? O PostgreSQL recusa com erro; o SQLite e o MySQL antigo aceitam e escolhem um nome qualquer, o que gera resultados enganosos.

**Agrupar por várias colunas** cria um grupo para cada combinação: \`GROUP BY estado, cidade\`.

**Ordenar pelo resultado agregado** é comum: \`ORDER BY COUNT(*) DESC\` ou pelo alias (\`ORDER BY qtd DESC\`).

**Agregar expressões** também é permitido: \`SUM(quantidade * preco_unitario)\` soma o valor de cada item do grupo.
`),
  ],
  'sql-3-3': [
    theory('Por que WHERE não aceita agregações', `
Siga a **ordem lógica**: o WHERE é avaliado **linha a linha, antes** do GROUP BY. Naquele momento os grupos ainda não existem, então \`COUNT(*)\` não tem valor. Por isso \`WHERE COUNT(*) > 2\` é um erro ("uso indevido de agregação").

O HAVING é avaliado **depois** do agrupamento, quando cada grupo já tem seu COUNT, SUM etc.

| quero filtrar... | uso |
|---|---|
| linhas pelo valor de uma coluna (\`status = 'entregue'\`) | **WHERE** |
| grupos pelo resultado de uma agregação (\`COUNT(*) >= 3\`) | **HAVING** |

**Dica de desempenho:** filtre o máximo possível no WHERE. Menos linhas entram no agrupamento, então a consulta fica mais rápida. Use HAVING só para condições que dependem do agregado.

As duas cláusulas podem aparecer juntas: primeiro o WHERE seleciona as linhas, depois o GROUP BY agrupa, e por fim o HAVING descarta grupos.
`),
  ],
  'sql-4-1': [
    theory('Como o JOIN combina as linhas', `
Pense no INNER JOIN como: **para cada pedido, procure o cliente cujo id é igual ao cliente_id do pedido**, e junte as colunas dos dois numa linha só.

| pedidos.id | cliente_id | | clientes.id | nome |
|---|---|---|---|---|
| 1 | 1 | → | 1 | Ana Souza |
| 2 | 2 | → | 2 | Bruno Lima |
| 3 | 1 | → | 1 | Ana Souza |

Consequências:

- Cada pedido encontra **exatamente um** cliente, então o resultado tem **o mesmo número de linhas que pedidos** (20)
- Um cliente com 3 pedidos aparece **3 vezes**
- Um cliente **sem pedidos** (como o João) **não aparece**: no INNER JOIN, só ficam as linhas com par dos dois lados

**Colunas com o mesmo nome** nas duas tabelas (como \`id\`) precisam do prefixo da tabela ou do alias: \`p.id\`, \`c.id\`. Sem prefixo, o banco reclama de nome ambíguo.

A cláusula **ON** define o critério de ligação; quase sempre é chave estrangeira = chave primária.
`),
  ],
  'sql-4-2': [
    theory('LEFT JOIN e contagens: o detalhe que engana', `
No LEFT JOIN, um cliente **sem pedidos** continua no resultado, numa linha em que **todas as colunas de pedidos são NULL**:

| c.nome | p.id |
|---|---|
| Ana Souza | 1 |
| Ana Souza | 3 |
| João Pereira | NULL |

Ao agrupar por cliente e contar:

- \`COUNT(*)\` conta **linhas**: o João tem 1 linha, então daria **1 pedido** (errado!)
- \`COUNT(p.id)\` conta **valores não nulos** de p.id: o João tem NULL, então dá **0** (certo)

Regra prática: depois de um LEFT JOIN, **conte uma coluna da tabela da direita** (de preferência a chave primária).

**Anti-join.** Filtrar \`WHERE p.id IS NULL\` depois do LEFT JOIN mantém exatamente quem **não tem** correspondência: clientes sem pedido, produtos nunca vendidos.

**CROSS JOIN** combina cada linha de A com cada linha de B, sem condição: 4 linhas × 5 linhas = **20 linhas**. Útil para gerar combinações (todas as lojas × todos os meses).
`),
  ],
  'sql-4-3': [
    theory('Montando JOINs maiores sem erro', `
Ao encadear tabelas, desenhe o **caminho das chaves** antes de escrever:

clientes (id) ← pedidos (cliente_id) ← itens_pedido (pedido_id) → produtos (id)

**Cuidado com a multiplicação de linhas.** Um pedido com 2 itens vira 2 linhas depois do JOIN com itens_pedido. Isso é o que queremos para somar valores de itens, mas se você contar pedidos depois desse JOIN, use \`COUNT(DISTINCT p.id)\`.

**Self join** usa a mesma tabela duas vezes com aliases diferentes:

~~~sql
SELECT f.nome AS funcionario, g.nome AS gerente
FROM funcionarios f
LEFT JOIN funcionarios g ON g.id = f.gerente_id;
~~~

Use LEFT JOIN para não perder quem não tem gerente (a CEO).

**UNION × UNION ALL.** As duas consultas empilhadas precisam ter o **mesmo número de colunas, em tipos compatíveis**; os nomes vêm da primeira. **UNION** remove linhas duplicadas (e por isso precisa ordenar ou comparar tudo, ficando mais lento); **UNION ALL** mantém todas as linhas. Use UNION ALL sempre que duplicados forem impossíveis ou desejados.
`),
  ],
  'sql-5-1': [
    theory('Tipos de subquery e quando usar cada uma', `
| tipo | devolve | onde aparece | exemplo |
|---|---|---|---|
| escalar | 1 valor | WHERE, SELECT | \`preco > (SELECT AVG(preco) FROM produtos)\` |
| de lista | 1 coluna | WHERE ... IN | \`id IN (SELECT cliente_id FROM pedidos)\` |
| de tabela | várias colunas | FROM | \`FROM (SELECT ...) t\` (precisa de alias) |
| correlacionada | depende da linha externa | WHERE, SELECT | \`WHERE preco = (SELECT MAX(preco) FROM produtos p2 WHERE p2.categoria = p1.categoria)\` |

**EXISTS e NOT EXISTS** testam se a subquery devolve **pelo menos uma linha**; o conteúdo das colunas não importa, por isso se escreve \`SELECT 1\`:

~~~sql
-- clientes que NUNCA compraram
SELECT nome FROM clientes c
WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id);
~~~

**Armadilha do NOT IN com NULL.** Se a subquery de um NOT IN devolver algum NULL, a condição nunca é verdadeira e a consulta não retorna nada. NOT EXISTS não tem esse problema; prefira-o.

**Ticket médio** é o caso típico de subquery no FROM: primeiro somamos por pedido, depois tiramos a média desses totais.
`),
  ],
  'sql-5-2': [
    theory('Por que as CTEs são o padrão no mercado', `
Comparando a mesma lógica escrita com subqueries aninhadas e com CTEs:

- **Legibilidade:** a CTE lê-se de cima para baixo, em etapas com nome (\`totais\`, \`pedidos_mes\`), como um roteiro. Subqueries aninhadas leem-se de dentro para fora
- **Reuso:** uma CTE definida uma vez pode ser usada várias vezes na mesma consulta; a subquery teria de ser copiada
- **Depuração:** dá para testar cada etapa trocando o SELECT final por \`SELECT * FROM etapa\`
- **Recursão:** só CTEs permitem que uma etapa se refira a si mesma (\`WITH RECURSIVE\`)

**Desempenho:** em geral, uma CTE e a subquery equivalente rodam igual; o otimizador do banco reescreve as duas. CTEs não são "tabelas temporárias", a não ser que o banco decida materializá-las.

**Como funciona a recursão:** a parte **âncora** gera as primeiras linhas; a parte **recursiva** é executada repetidamente sobre as linhas novas até não surgir nenhuma. Sempre inclua uma **condição de parada** (\`WHERE n < 10\`, ou uma hierarquia que termina), senão a consulta roda para sempre.
`),
  ],
  'sql-6-1': [
    theory('Janela inteira, partições e o que cada linha vê', `
Uma window function calcula, **para cada linha**, um valor sobre um conjunto de linhas chamado **janela**:

| escrita | janela de cada linha |
|---|---|
| \`OVER ()\` | **todas** as linhas do resultado |
| \`OVER (PARTITION BY categoria)\` | as linhas da **mesma categoria** |
| \`OVER (ORDER BY data)\` | da primeira linha **até a atual** (acumulado) |

Exemplo: \`SELECT nome, COUNT(*) OVER () AS total FROM produtos\` devolve as **12 linhas**, cada uma com o valor **12**, porque a janela de todas é a tabela inteira e nada é colapsado.

**Percentual do total** é um uso clássico: \`100.0 * salario / SUM(salario) OVER ()\`.

**Diferença para a média do grupo:** \`salario - AVG(salario) OVER (PARTITION BY departamento)\` mostra quem ganha acima ou abaixo da média do seu departamento, sem precisar de JOIN com uma tabela agregada.

Window functions são calculadas **depois** do WHERE e do GROUP BY e antes do ORDER BY final. Por isso não dá para filtrar por elas no WHERE: use uma CTE e filtre na consulta de fora.
`),
  ],
  'sql-6-2': [
    theory('Escolhendo a função de ranking certa', `
Como decidir:

- **ROW_NUMBER** quando você precisa de **exatamente N linhas por grupo** (top 1 por categoria, deduplicação). Em empates, a escolha é arbitrária; inclua um desempate no ORDER BY para resultado estável
- **RANK** quando empates devem **dividir a posição** e a contagem deve pular ("dois segundos lugares, depois o quarto")
- **DENSE_RANK** quando empates dividem a posição **sem pular** ("1º, 2º, 2º, 3º"): bom para "N-ésimo maior valor distinto"
- **NTILE(n)** para dividir em n grupos de tamanho parecido (quartis, decis, segmentação de clientes)

Exemplo com salários 10, 8, 8, 5 em ordem decrescente:

| salário | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 10 | 1 | 1 | 1 |
| 8 | 2 | 2 | 2 |
| 8 | 3 | 2 | 2 |
| 5 | 4 | 4 | **3** |

**Top N por grupo** sempre tem duas etapas: calcular o ranking numa CTE e filtrar (\`WHERE rn <= N\`) na consulta de fora.
`),
  ],
  'sql-6-3': [
    theory('Frames: controlando quais linhas entram na janela', `
Quando há ORDER BY no OVER, você pode definir o **frame** com \`ROWS BETWEEN início AND fim\`:

| expressão | significado |
|---|---|
| \`UNBOUNDED PRECEDING\` | desde a primeira linha da partição |
| \`n PRECEDING\` | n linhas antes da atual |
| \`CURRENT ROW\` | a linha atual |
| \`n FOLLOWING\` | n linhas depois |

\`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\` considera a linha atual e as 2 anteriores: uma janela de **3 linhas**. Na média móvel de 3 meses, os dois primeiros meses têm janela menor (1 e 2 linhas).

**LAG e LEAD** aceitam um deslocamento e um valor padrão: \`LAG(faturamento, 1, 0)\` usa 0 quando não há mês anterior. Sem o padrão, o resultado é NULL, e qualquer conta com NULL dá NULL (por isso a variação do primeiro mês aparece vazia).

**Crescimento percentual:** \`100.0 * (atual - anterior) / anterior\`. Cuidado com divisão por zero (use NULLIF no denominador).
`),
  ],
  'sql-7-1': [
    theory('Calculando com datas no SQLite', `
No SQLite, as datas são texto ISO, e algumas funções fazem as contas:

- \`strftime(formato, data)\` extrai partes: \`'%Y'\` ano, \`'%m'\` mês com 2 dígitos, \`'%d'\` dia, \`'%w'\` dia da semana (0 = domingo), \`'%Y-%m'\` ano-mês
- \`date(data, '+7 days')\` soma ou subtrai intervalos: \`'-1 month'\`, \`'+1 year'\`, \`'start of month'\`
- \`julianday(data)\` converte a data num número de dias contínuo; **a diferença entre dois julianday é o número de dias** entre as datas

Como \`julianday\` devolve número decimal (dias e frações de dia), usamos **CAST(... AS INTEGER)** para ficar com dias inteiros:

~~~sql
SELECT CAST(julianday('2024-03-10') - julianday('2024-03-01') AS INTEGER);  -- 9
~~~

**CAST(valor AS tipo)** converte um valor para outro tipo (INTEGER, REAL, TEXT). A lição seguinte detalha os tipos.

Para agrupar por mês, tanto \`strftime('%Y-%m', data)\` quanto \`SUBSTR(data, 1, 7)\` funcionam com datas ISO.
`),
  ],
  'sql-7-2': [
    theory('Números exatos, aproximados e divisão segura', `
**Por que não FLOAT para dinheiro?** Tipos REAL/FLOAT guardam números em binário e não representam exatamente frações decimais como 0,1. Somando milhares de valores, aparecem centavos "fantasmas" (0,1 + 0,2 = 0,30000000000000004). Use:

- **NUMERIC(p, s) / DECIMAL**: número exato com p dígitos, s deles após a vírgula (\`NUMERIC(12,2)\` para reais)
- ou **centavos em INTEGER** (R$ 19,90 vira 1990)

**Divisão inteira.** Em PostgreSQL, SQL Server e outros, inteiro ÷ inteiro descarta a parte decimal: \`7 / 2 = 3\`. Para obter 3,5, transforme um dos lados em decimal: \`7.0 / 2\`, \`7 * 1.0 / 2\` ou \`CAST(7 AS REAL) / 2\`. Taxas e percentuais calculados como \`COUNT / COUNT\` sofrem exatamente esse problema.

**NULLIF(a, b)** devolve NULL quando a = b; caso contrário devolve a. Como dividir por NULL dá NULL (e não erro), \`x / NULLIF(y, 0)\` evita a divisão por zero.

**Taxa em percentual com agregação condicional:** \`100.0 * SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*)\`.
`),
  ],
  'sql-8-1': [
    theory('Modificando dados com segurança', `
Antes de um UPDATE ou DELETE em produção:

1. Escreva primeiro um **SELECT com o mesmo WHERE** e confira as linhas afetadas
2. Rode dentro de uma **transação**, para poder desfazer
3. Confirme a quantidade de linhas alteradas que o banco informa

**Transação e ROLLBACK.** Entre \`BEGIN\` e \`COMMIT\`, as alterações ficam pendentes. Se algo der errado no meio, **ROLLBACK desfaz todos os comandos desde o BEGIN**, e o banco volta ao estado anterior, como se nada tivesse acontecido. É o que garante que uma transferência não debite uma conta sem creditar a outra.

**ACID** em uma frase cada:
- **Atomicidade:** tudo ou nada
- **Consistência:** as regras (constraints) continuam válidas
- **Isolamento:** transações simultâneas não se atrapalham
- **Durabilidade:** depois do COMMIT, a alteração sobrevive a uma queda de energia

**DELETE com subquery:** \`DELETE FROM itens_pedido WHERE pedido_id IN (SELECT id FROM pedidos WHERE status = 'cancelado')\` apaga só os itens dos pedidos cancelados.
`),
  ],
  'sql-8-2': [
    theory('Views: consultas com nome', `
Uma **VIEW** é uma **consulta salva** com um nome, que depois pode ser usada como se fosse uma tabela:

~~~sql
CREATE VIEW vw_pedidos_entregues AS
SELECT * FROM pedidos WHERE status = 'entregue';

SELECT COUNT(*) FROM vw_pedidos_entregues;
~~~

**View × tabela:**
- a tabela **guarda dados**; a view **não copia dados**: a cada uso, a consulta é executada sobre as tabelas atuais
- por isso a view está sempre atualizada e não ocupa espaço extra
- uma **view materializada** (PostgreSQL, Snowflake, BigQuery) guarda o resultado para ficar rápida, e precisa ser **atualizada (refresh)**

Usos: esconder a complexidade de JOINs, padronizar regras de negócio ("o que é um pedido válido") e controlar acesso (o usuário vê a view, não a tabela inteira).

**Normalização na prática.** Guardar cidade e estado do cliente dentro de cada pedido repete a informação: se o cliente mudar de cidade, é preciso atualizar vários pedidos, e eles podem ficar inconsistentes. A cidade depende do **cliente**, não do pedido: é uma **dependência transitiva**, o que viola a 3FN. A solução é guardá-la só na tabela de clientes e buscá-la por JOIN.
`),
  ],
  'sql-9-1': [
    theory('Custo dos índices e otimização no data warehouse', `
**Índices não são de graça:**
- cada INSERT, UPDATE e DELETE precisa atualizar **todos os índices** da tabela, o que torna as escritas mais lentas
- ocupam espaço em disco e memória
- índices pouco usados só atrapalham: crie para as consultas frequentes e meça

**Quando o índice não é usado:** funções sobre a coluna (\`WHERE UPPER(nome) = 'ANA'\`), curinga no início do LIKE (\`'%na'\`), conversões de tipo implícitas e filtros que retornam grande parte da tabela (aí ler tudo sai mais barato).

**Data warehouses (BigQuery, Snowflake, Redshift)** guardam os dados **por coluna** e cobram ou demoram conforme o volume lido. As práticas que mais reduzem custo:

1. **Selecionar só as colunas necessárias** (nunca \`SELECT *\`)
2. **Filtrar pela coluna de partição** (normalmente a data), para ler só as partições relevantes
3. Usar **clustering** nas colunas mais filtradas
4. Agregar em tabelas intermediárias o que é consultado com frequência
`),
  ],
  'sql-9-2': [
    theory('Agregação condicional: transformar linhas em colunas', `
A técnica \`SUM(CASE WHEN condição THEN 1 ELSE 0 END)\` se chama **agregação condicional**. Ela conta (ou soma) só as linhas que atendem a uma condição, e permite colocar vários contadores lado a lado, **transformando linhas em colunas** (um "pivot manual"):

~~~sql
SELECT
  SUM(CASE WHEN status = 'entregue'  THEN 1 ELSE 0 END) AS entregue,
  SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelado
FROM pedidos;
~~~

Variações: \`AVG(CASE WHEN ... THEN 1.0 ELSE 0 END)\` dá a **proporção**; \`SUM(CASE WHEN ... THEN valor END)\` soma valores de um subconjunto. Alguns bancos têm atalhos: \`COUNT(*) FILTER (WHERE status = 'entregue')\` no PostgreSQL, \`COUNTIF\` no BigQuery e o operador **PIVOT** no SQL Server e no Snowflake.

**Métricas de negócio que você vai calcular:**
- **Recorrência:** clientes com mais de um pedido ÷ clientes que compraram
- **Coorte:** clientes agrupados pelo mês de entrada, acompanhados ao longo do tempo
- **Pareto (80/20):** percentual acumulado da receita do maior para o menor produto
- **Funil:** quantos chegam a cada etapa (pendente → enviado → entregue)
`),
  ],
  'sql-10-1': [
    theory('Medianas e filtros nas ilhas', `
Para decidir quais dias "contam" como parte de uma sequência, compare com uma referência robusta, como a **mediana** (o valor do meio, metade acima e metade abaixo).

O SQLite deste app tem a função de agregação \`median(coluna)\`. Em outros bancos: \`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY coluna)\` (PostgreSQL), \`MEDIAN(coluna)\` (Snowflake), \`APPROX_QUANTILES(coluna, 2)[OFFSET(1)]\` (BigQuery).

Receita completa de gaps & islands:

1. **Filtre** os dias que atendem à condição (receita acima da mediana)
2. Calcule \`julianday(data) - ROW_NUMBER() OVER (ORDER BY data)\`: o valor fica **igual** enquanto as datas forem consecutivas
3. **Agrupe** por esse valor: cada grupo é uma ilha; \`MIN(data)\`, \`MAX(data)\` e \`COUNT(*)\` dão início, fim e tamanho
4. Use **HAVING** para manter só as ilhas de tamanho mínimo

Para os **buracos**, compare cada evento com o próximo via \`LEAD(data)\`: onde a diferença passa do limite, há um buraco.
`),
  ],
};
