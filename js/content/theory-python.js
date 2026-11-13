// Aprofundamento teórico das lições de Python.
// Cada lição recebe cards completos que vêm ANTES dos exercícios.
import { theory } from './helpers.js';

export const PY_THEORY = {
  'py-1-1': [
    theory('Variáveis, operadores e índices em detalhe', `
**Variável** é um nome que aponta para um valor. Python descobre o tipo sozinho (tipagem dinâmica), e \`type(x)\` mostra qual é.

**Operadores aritméticos:**

| operador | exemplo | resultado |
|---|---|---|
| \`+ - *\` | \`7 * 2\` | 14 |
| \`/\` divisão | \`7 / 2\` | 3.5 (sempre float) |
| \`//\` divisão inteira | \`7 // 2\` | 3 |
| \`%\` resto | \`7 % 2\` | 1 |
| \`**\` potência | \`2 ** 3\` | 8 |

**Índices e fatias de lista.** O primeiro elemento é o índice **0**; índices negativos contam do fim (\`-1\` é o último). A fatia \`lista[início:fim]\` inclui o início e **exclui o fim**:

~~~python
v = [10, 20, 30, 40]
v[1:3]    # [20, 30]  → posições 1 e 2
v[:2]     # [10, 20]  → do começo até antes da 2
v[2:]     # [30, 40]  → da 2 até o fim
~~~

**Média de uma lista:** \`sum(v) / len(v)\`: a soma dividida pela quantidade.

**f-strings** inserem valores num texto: \`f"Total: {total}"\`. Dentro das chaves dá para formatar: \`{valor:.2f}\` mostra 2 casas decimais, \`{n:,}\` separa milhares.
`),
  ],
  'py-1-2': [
    theory('Quando usar cada coleção', `
- **list**: sequência ordenada que pode crescer (\`append\`) e ter repetidos. Ex.: valores de vendas
- **dict**: associa **chave → valor**. Buscar pela chave é instantâneo. Ex.: um registro (\`{"nome": "Ana", "estado": "SP"}\`) ou uma contagem por categoria
- **tuple**: sequência que não muda. Ex.: coordenadas, linhas devolvidas por um banco
- **set**: conjunto **sem repetidos**. Ex.: valores distintos, "já vi este id?"

**Acessando chaves com segurança.** \`cliente["email"]\` dá **KeyError** se a chave não existir. \`cliente.get("email", "sem email")\` devolve o valor padrão no lugar do erro.

**Por que o set é rápido para checar?** Ele usa uma tabela de espalhamento (hash): \`x in conjunto\` leva o mesmo tempo com 10 ou com 10 milhões de itens. Em uma lista, \`x in lista\` compara item por item.

**Contar distintos:** \`len(set(lista))\`: transforma em set (remove repetidos) e conta.
`),
  ],
  'py-1-3': [
    theory('Condições, laços e comprehensions passo a passo', `
**if / elif / else** testa as condições de cima para baixo e executa **só o primeiro bloco verdadeiro**. A indentação (4 espaços) define o que pertence a cada bloco.

**Funções** recebem parâmetros e devolvem um resultado com \`return\`. Ao executar \`return\`, a função termina na hora, então não é preciso \`else\` depois de um \`return\`.

**for** percorre os itens de qualquer coleção. \`range(n)\` gera 0, 1, ..., n-1 (**sem** incluir n): \`range(3)\` é 0, 1, 2.

**List comprehension** é um laço que monta uma lista numa linha:

~~~python
resultado = []                 # forma longa
for x in range(3):
    resultado.append(x * 2)

resultado = [x * 2 for x in range(3)]   # mesma coisa: [0, 2, 4]
~~~

Com filtro: \`[v for v in pedidos if v > 500]\` mantém só os maiores que 500.

**Dict comprehension** cria dicionários: \`{k: v * 1.1 for k, v in precos.items()}\`. O \`.items()\` devolve pares (chave, valor) que são desempacotados em \`k, v\`.

**while** repete **enquanto** uma condição for verdadeira, e é usado quando não se sabe de antemão quantas voltas serão (ler páginas de uma API até acabar):

~~~python
n = 1
while n <= 3:
    print(n)
    n += 1      # sem isso, o laço nunca termina
~~~
`),
  ],
  'py-2-1': [
    theory('Arrays, shape e funções do NumPy', `
**Vetorização** significa aplicar uma operação ao array inteiro de uma vez, sem escrever o laço: \`precos * 0.85\` multiplica cada elemento. O laço existe, mas roda em C, sobre memória contígua de um único tipo, por isso é tão rápido.

**Métodos de resumo:** \`a.sum()\`, \`a.mean()\`, \`a.std()\` (desvio padrão **populacional** por padrão; use \`ddof=1\` para o amostral), \`a.min()\`, \`a.max()\`, \`a.argmax()\` (a **posição** do maior valor).

**Criando arrays:**
- \`np.arange(1, 10)\` → 1, 2, ..., 9 (o fim é exclusivo, como no range)
- \`.reshape(3, 3)\` reorganiza os 9 valores numa matriz 3×3, preenchendo linha por linha
- \`a.shape\` mostra as dimensões: \`(3, 3)\`

**Matrizes:**

~~~python
m = np.arange(1, 10).reshape(3, 3)
# [[1 2 3]
#  [4 5 6]
#  [7 8 9]]
np.diag(m)      # diagonal principal: [1 5 9]
np.trace(m)     # SOMA da diagonal: 15
m[0, 2]         # linha 0, coluna 2 → 3
m[:, 1]         # coluna 1 inteira → [2 5 8]
~~~
`),
  ],
  'py-2-2': [
    theory('Máscaras e eixos em detalhe', `
**Máscara booleana** é um array de True/False do mesmo tamanho dos dados. Usada como índice, ela mantém só as posições True.

**Combinando condições:** no NumPy e no pandas use \`&\` (E), \`|\` (OU) e \`~\` (NÃO), **com parênteses em cada condição**. As palavras \`and\`/\`or\` do Python não funcionam com arrays e dão erro ("truth value of an array is ambiguous").

**Contar com máscara:** True vale 1 e False vale 0, então \`(v > 100).sum()\` conta quantos valores passam; \`(v > 100).mean()\` dá a **proporção**.

**np.where(condição, se_sim, se_não)** é o if/else vetorizado.

**Eixos:** pense em \`axis\` como **a dimensão que desaparece**:

| matriz shape (4, 3) | resultado | significado |
|---|---|---|
| \`m.sum(axis=0)\` | shape (3,) | soma descendo as linhas → **uma por coluna** |
| \`m.sum(axis=1)\` | shape (4,) | soma ao longo das colunas → **uma por linha** |

**Padronização (z-score):** \`(m - m.mean(axis=0)) / m.std(axis=0)\`. O broadcasting estica as médias de shape (3,) para todas as 4 linhas. Depois disso, cada coluna tem média 0 e desvio 1.
`),
  ],
  'py-3-1': [
    theory('Lendo dados e primeiras perguntas', `
**Ler de um texto em vez de um arquivo.** \`pd.read_csv\` espera um caminho de arquivo ou um objeto "parecido com arquivo". \`io.StringIO(texto)\` embrulha uma string para ela se comportar como um arquivo aberto, o que é útil quando o CSV veio de uma API ou está numa variável:

~~~python
import io
import pandas as pd
texto = "produto,valor\\nMouse,89.9\\nTeclado,199.0"
df = pd.read_csv(io.StringIO(texto))
~~~

**Linhas e colunas:** \`df.shape\` devolve a tupla \`(linhas, colunas)\`; \`df.shape[0]\` é o número de linhas (igual a \`len(df)\`).

**Contagens:**
- \`s.nunique()\` → quantos valores **distintos**
- \`s.value_counts()\` → uma Series com a frequência de cada valor, **do mais frequente para o menos**
- \`s.idxmax()\` → o **rótulo do índice** onde está o maior valor; \`s.idxmin()\`, o do menor

Juntando: \`vendas["estado"].value_counts().idxmax()\` responde "qual estado aparece mais vezes".

**info × describe:** \`df.info()\` mostra tipo e quantidade de não nulos de cada coluna (diagnóstico de estrutura); \`df.describe()\` mostra estatísticas (média, quartis...) das colunas numéricas.
`),
  ],
  'py-3-2': [
    theory('Filtros no pandas: regras que evitam erros', `
**Cada condição entre parênteses.** \`df[df["estado"] == "SP" & df["valor"] > 3000]\` dá erro, porque \`&\` é avaliado antes de \`==\` e \`>\`. O certo é:

~~~python
df[(df["estado"] == "SP") & (df["valor"] > 3000)]
~~~

**Use & e |, não and e or** (mesma regra do NumPy).

**loc × iloc:**
- \`loc[linhas, colunas]\` usa **rótulos** e aceita máscaras: \`df.loc[mascara, ["cliente", "valor"]]\` filtra linhas e escolhe colunas numa operação só. No loc, uma fatia **inclui o fim**
- \`iloc\` usa **posições inteiras**, e a fatia exclui o fim, como numa lista

**isin** testa pertencimento a uma lista (o \`IN\` do SQL): \`df["estado"].isin(["SP", "RJ", "MG"])\`.

**query** escreve o filtro como texto, com \`and\`/\`or\` e aspas simples para os valores: \`df.query("estado == 'RJ' and valor > 3000")\`. É mais legível em filtros longos; para usar uma variável Python dentro dele, prefixe com \`@\`: \`df.query("valor > @limite")\`.
`),
  ],
  'py-3-3': [
    theory('Novas colunas, faixas e mapeamentos', `
**Coluna calculada:** atribuir a um nome novo cria a coluna em todas as linhas: \`df["liquido"] = df["valor"] * 0.85\`.

**Ordenar e pegar o topo:** \`df.sort_values("valor", ascending=False).head(3)\` (ou \`df.nlargest(3, "valor")\`). \`sort_values\` **devolve um novo DataFrame**; o original não muda, a não ser que você reatribua.

**pd.cut** transforma números em **faixas**. Os \`bins\` são os limites, e cada intervalo é aberto à esquerda e fechado à direita: com \`bins=[0, 500, 2000, np.inf]\`, o valor 500 cai em "(0, 500]", ou seja, em "baixo". \`np.inf\` (infinito) garante que nenhum valor grande fique de fora. São necessários **um label a menos que o número de bins**.

**map** troca cada valor usando um dicionário: \`df["estado"].map({"SP": "Sudeste", "BA": "Nordeste"})\`. Valores que não estão no dicionário viram **NaN**, o que ajuda a detectar categorias esquecidas.

**apply × vetorização:** \`apply\` chama uma função Python **linha a linha**, então é lento. Use-o só quando não houver forma vetorizada (aritmética, \`np.where\`, \`.str\`, \`.dt\`, \`map\`).
`),
  ],
  'py-4-1': [
    theory('groupby em detalhe', `
\`df.groupby("estado")["valor"].sum()\` segue três passos:

1. **Split:** separa as linhas por estado
2. **Apply:** soma a coluna valor em cada grupo
3. **Combine:** junta os resultados numa **Series indexada pelo estado**

**Várias métricas com nomes:** a *named aggregation* recebe \`nome_novo=("coluna", "função")\`:

~~~python
df.groupby("categoria").agg(
    receita=("valor", "sum"),
    pedidos=("pedido", "count"),
).reset_index()
~~~

O \`reset_index()\` transforma a chave do grupo (que virou índice) de volta em coluna comum.

**agg × transform:**

| método | devolve | equivale no SQL |
|---|---|---|
| \`agg\` / \`sum()\` | **uma linha por grupo** | GROUP BY |
| \`transform("sum")\` | **um valor por linha original**, repetindo o total do grupo | SUM(...) OVER (PARTITION BY ...) |

Por isso \`df["valor"] / df.groupby("categoria")["valor"].transform("sum")\` dá a participação de cada venda no total da sua categoria: o denominador tem o mesmo tamanho do DataFrame.
`),
  ],
  'py-4-2': [
    theory('merge e concat em detalhe', `
**merge** combina tabelas lado a lado por uma chave, como o JOIN:

- \`on="cliente_id"\` quando a coluna tem o mesmo nome nos dois lados; \`left_on\`/\`right_on\` quando os nomes são diferentes
- \`how="inner"\` mantém só quem tem par dos dois lados; \`how="left"\` mantém todas as linhas da tabela da esquerda (sem par, as colunas da direita viram NaN)

**Anti-join com indicator.** \`indicator=True\` cria a coluna \`_merge\` dizendo de onde veio cada linha: \`"both"\`, \`"left_only"\` ou \`"right_only"\`. Filtrar \`_merge == "left_only"\` depois de um left merge devolve os registros da esquerda **sem correspondência** (clientes que nunca compraram).

**concat** empilha DataFrames com as mesmas colunas, como o **UNION ALL**: duplicados são mantidos. Por padrão, os índices originais são preservados (pode haver dois índices 0); \`ignore_index=True\` cria um índice novo 0, 1, 2, ...

**Cuidado com chaves duplicadas:** se a chave se repete nos dois lados, o merge multiplica as linhas (como no SQL). \`validate="many_to_one"\` faz o pandas dar erro se isso acontecer.
`),
  ],
  'py-4-3': [
    theory('Formatos largo e longo', `
**Longo** (tidy): cada linha é **uma observação**.

| loja | mes | valor |
|---|---|---|
| A | jan | 10 |
| A | fev | 12 |

**Largo**: uma coluna para cada categoria.

| loja | jan | fev |
|---|---|---|
| A | 10 | 12 |

O formato longo é o melhor para agrupar, filtrar e gerar gráficos; o largo é melhor para leitura humana e relatórios.

- **pivot_table** (longo → largo): \`index\` vira as linhas, \`columns\` vira as colunas, \`values\` é o que é agregado com \`aggfunc\`. Combinações sem dados ficam NaN; \`fill_value=0\` as troca por zero
- **melt** (largo → longo): \`id_vars\` são as colunas que **permanecem**; as outras viram pares (\`var_name\`, \`value_name\`)
- **crosstab** conta as combinações de duas colunas (uma tabela de frequência cruzada); \`normalize="index"\` transforma em proporções por linha
`),
  ],
  'py-5-1': [
    theory('Imputação: por que a mediana', `
**isna().sum()** funciona assim: \`isna()\` cria um DataFrame de True/False, e \`sum()\` soma por coluna (True = 1), então devolve o **número de nulos por coluna**.

**Média ou mediana para preencher?** A média é puxada por valores extremos. Idades 20, 22, 25, 27 e 95: a média é **37,8**, uma idade que não representa ninguém; a mediana é **25**. Por isso:

- **mediana** quando há **outliers ou assimetria** (renda, preços, tempos)
- **média** quando a distribuição é simétrica
- **moda** ou um rótulo ("Desconhecida") para **categorias**

**Limitações de qualquer imputação:** ela reduz artificialmente a variabilidade e pode esconder um padrão (se os nulos não forem aleatórios, por exemplo clientes que não informam renda). Uma boa prática é criar uma coluna indicadora (\`idade_faltante\`) antes de preencher.

**Duplicados:** \`drop_duplicates()\` considera a linha inteira; \`subset=["email"]\` olha só certas colunas, e \`keep="first"\`/\`"last"\` escolhe qual cópia manter. A ordem importa: imputar antes de remover duplicados pode transformar linhas quase iguais em idênticas.
`),
  ],
  'py-5-2': [
    theory('Métodos .str, conversões e o método do IQR', `
**Métodos .str** aplicam operações de texto à coluna inteira (vetorizado) e podem ser **encadeados**:

- \`.str.strip()\` remove espaços das pontas; \`.str.title()\` coloca a inicial maiúscula em cada palavra
- \`.str.replace("R$", "", regex=False)\` troca um trecho literal (\`regex=False\` evita que \`$\` e \`.\` sejam lidos como símbolos especiais de expressão regular)
- \`.str.split("@")\` divide em uma lista; \`.str[1]\` pega o segundo pedaço

**Do formato brasileiro para número:** "R$ 1.299,90" → remova "R$" → remova o ponto de milhar → troque a vírgula por ponto → \`astype(float)\` = 1299.9. A **ordem** importa: se trocar a vírgula antes de remover os pontos, você perde a casa decimal.

**errors="coerce"** em \`pd.to_numeric\` e \`pd.to_datetime\`: o que não puder ser convertido vira **NaN/NaT** em vez de dar erro. Depois, conte os nulos para ver quantos valores eram inválidos.

**Outliers pelo IQR:** IQR = Q3 − Q1 (a faixa dos 50% centrais). São outliers os valores abaixo de **Q1 − 1,5·IQR** ou acima de **Q3 + 1,5·IQR**. É a mesma regra dos "bigodes" do boxplot. \`s.quantile([0.25, 0.75])\` devolve Q1 e Q3 de uma vez.
`),
  ],
  'py-6-1': [
    theory('Séries temporais: índice de datas, períodos e variações', `
**Por que converter para datetime?** Como texto, "2024-10-01" não sabe que é uma data: não dá para extrair o mês nem agrupar por semana. \`pd.to_datetime\` converte, e o acessor \`.dt\` libera \`year\`, \`month\`, \`day_name()\` etc.

**resample** agrupa por período de tempo e exige que a **data seja o índice** (por isso o \`set_index("data")\`):

| código | período |
|---|---|
| \`"D"\` | dia |
| \`"W"\` | semana |
| \`"MS"\` | mês, rotulado pelo **início** do mês |
| \`"ME"\` | mês, rotulado pelo **fim** do mês |
| \`"QS"\` / \`"YS"\` | trimestre / ano |

Diferente do groupby, o resample cria **todos os períodos**, inclusive os vazios (com soma 0).

**Comparando com o período anterior:**
- \`shift(1)\` desloca a série uma posição: cada mês recebe o valor do mês anterior (o LAG do SQL)
- \`pct_change()\` = \`(atual − anterior) / anterior\`; o primeiro valor é NaN, porque não há anterior
- \`cumsum()\` soma acumulada; \`rolling(3).mean()\` média móvel dos últimos 3 períodos
`),
  ],
  'py-7-1': [
    theory('Anatomia de um gráfico no matplotlib', `
Um gráfico no matplotlib tem dois objetos principais:

- **Figure (fig):** a "folha" inteira, que pode ter vários gráficos
- **Axes (ax):** um gráfico dentro da folha, com seus eixos, título e marcas

\`fig, ax = plt.subplots()\` cria os dois. A partir daí, tudo é feito pelos métodos do \`ax\`:

| método | o que faz |
|---|---|
| \`ax.bar(x, alturas)\` | barras |
| \`ax.plot(x, y)\` | linha |
| \`ax.scatter(x, y)\` | dispersão |
| \`ax.hist(valores, bins=20)\` | histograma |
| \`ax.set_title\`, \`ax.set_xlabel\`, \`ax.set_ylabel\` | textos |

Para um gráfico de barras a partir de um groupby, a Series resultante já traz o que é preciso: \`receita.index\` são os rótulos (categorias) e \`receita.values\` são as alturas.

Cada barra desenhada vira um objeto em \`ax.patches\`, e é assim que os testes conferem quantas barras foram criadas.
`),
  ],
  'py-8-1': [
    theory('JSON e separadores regionais', `
**JSON** é o formato de texto mais comum das APIs. Ele mapeia diretamente para Python: objeto \`{}\` → dict, lista \`[]\` → list, \`true/false\` → True/False, \`null\` → None.

- \`json.loads(texto)\` converte **uma string** JSON em objetos Python (o "s" é de string)
- \`json.load(arquivo)\` lê de um **arquivo aberto**
- \`json.dumps(obj)\` faz o caminho inverso

**pd.json_normalize** transforma uma lista de dicionários em DataFrame, e "achata" campos aninhados com ponto: \`{"cliente": {"nome": "Ana"}}\` vira a coluna \`cliente.nome\`.

**CSV no padrão brasileiro.** Como a vírgula é o separador decimal no Brasil, o Excel exporta CSV com **ponto e vírgula** separando colunas: \`1.299,90;SP\`. Informe os dois parâmetros:

~~~python
pd.read_csv(io.StringIO(texto), sep=";", decimal=",")
~~~

Sem \`decimal=","\`, a coluna fica como texto e somar dá erro ou concatena strings. Arquivos antigos também podem exigir \`encoding="latin-1"\`.

**Parquet** guarda os dados por coluna, com tipos e compressão: dá para ler só as colunas necessárias, e os arquivos ficam muito menores que CSV.
`),
  ],
  'py-8-2': [
    theory('Paginação, códigos HTTP e novas tentativas', `
**Paginação.** APIs não devolvem milhares de registros de uma vez: mandam uma página e indicam a próxima (\`"next": 2\`) ou \`None\` quando acabou. Como não se sabe quantas páginas existem, usa-se **while**:

~~~python
todos = []
pagina = 1
while pagina is not None:
    resp = buscar(pagina)
    todos.extend(resp["results"])   # extend junta os itens da lista na outra
    pagina = resp["next"]
~~~

**Códigos de status HTTP:**

| código | significado |
|---|---|
| 200 | OK |
| 400 | requisição mal formada |
| 401 / 403 | sem autenticação / sem permissão |
| 404 | não encontrado |
| **429** | **muitas requisições**: espere e tente de novo |
| 500 / 503 | erro ou indisponibilidade do servidor |

**Retry (nova tentativa).** Erros temporários (429, 503, rede) costumam passar sozinhos. O padrão é: tente, capture a exceção com \`try/except\`, e tente de novo até um limite; se todas falharem, **levante o último erro** com \`raise\` para não esconder o problema. Em produção, espere cada vez mais entre as tentativas (*backoff exponencial*: 1 s, 2 s, 4 s...).

**Segredos** (tokens, senhas) nunca ficam no código nem no repositório: use variáveis de ambiente ou um cofre de segredos.
`),
  ],
  'py-8-3': [
    theory('HTML, seletores CSS e atributos', `
Uma página HTML é uma árvore de **tags**: \`<div class="produto" data-preco="89.9"><span class="nome">Mouse</span></div>\`.

- **tag** (\`div\`, \`span\`, \`a\`, \`table\`) é o tipo do elemento
- **class** e **id** identificam elementos para estilo e para seleção
- **atributos** (\`href\`, \`data-preco\`) guardam informações extras

**Seletores CSS** no BeautifulSoup:

| seletor | encontra |
|---|---|
| \`soup.select("div.produto")\` | **todos** os div com classe produto (lista) |
| \`card.select_one(".nome")\` | o **primeiro** elemento com classe nome |
| \`soup.select("#total")\` | o elemento com id total |
| \`soup.select("table tr")\` | linhas dentro de tabelas |

**Texto e atributos:** \`.get_text(strip=True)\` devolve o texto sem espaços nas pontas; \`elemento["data-preco"]\` lê um atributo, sempre **como texto**, então converta com \`float()\`.

**Por que o scraping às vezes não encontra nada:** requests baixa só o HTML inicial. Se o site monta o conteúdo com JavaScript depois, é preciso um navegador automatizado (Selenium, Playwright) ou, melhor, chamar diretamente a API que o site usa.
`),
  ],
  'py-8-4': [
    theory('Conexão, cursor e parâmetros no sqlite3', `
O fluxo do **DB-API** (padrão de todos os drivers Python de banco):

1. \`con = sqlite3.connect("loja.db")\` abre a conexão (\`":memory:"\` cria um banco temporário na memória)
2. \`con.execute(sql, parametros)\` (ou \`cur = con.cursor(); cur.execute(...)\`) roda um comando
3. Para ler o resultado: \`fetchone()\` devolve **a próxima linha como tupla**; \`fetchall()\` devolve uma lista de tuplas
4. \`con.commit()\` confirma alterações; \`con.close()\` fecha

~~~python
n = con.execute("SELECT COUNT(*) FROM pedidos").fetchone()[0]
# fetchone() → (20,)   e o [0] pega o primeiro valor da tupla → 20
~~~

**SQL injection.** Montar o SQL juntando texto (\`f"... WHERE nome = '{nome}'"\`) permite que um valor malicioso como \`' OR '1'='1\` mude a consulta. Com **parâmetros** (\`?\` no sqlite3, \`%s\` no psycopg, \`:nome\` no SQLAlchemy), o driver envia o valor separado do comando, e ele nunca é interpretado como SQL.

**Com pandas:** \`pd.read_sql(sql, con)\` devolve um DataFrame; \`df.to_sql("tabela", con, index=False, if_exists="replace")\` grava. \`index=False\` evita gravar o índice do pandas como uma coluna extra.
`),
  ],
  'py-9-1': [
    theory('Média, mediana, assimetria e correlação na prática', `
**Média × mediana revelam a forma da distribuição:**
- média ≈ mediana → distribuição aproximadamente **simétrica**
- média **>** mediana → **assimetria à direita**: poucos valores muito altos puxam a média (salários, renda, preços de imóveis)
- média **<** mediana → assimetria à esquerda (notas de prova fácil)

**Desvio padrão** mede o quanto os valores se afastam da média em média. O pandas usa o **amostral** por padrão (divide por n − 1); o NumPy usa o **populacional** (divide por n).

**Correlação de Pearson** (\`s1.corr(s2)\`) vai de −1 a 1: perto de 1, crescem juntas; perto de −1, uma sobe quando a outra desce; perto de 0, **sem relação linear** (pode haver relação curva).

**Correlação não é causalidade.** Duas variáveis podem andar juntas porque uma **terceira** influencia ambas: a **variável de confusão**. Sorvetes e afogamentos sobem juntos porque os dois aumentam no **verão**; proibir sorvete não reduziria afogamentos. Para afirmar causa, é preciso um experimento (teste A/B) ou métodos de inferência causal (vistos na trilha de Estatística).
`),
  ],
  'py-9-2': [
    theory('Escolhendo a ferramenta certa', `
**Dados maiores que a memória.** O pandas carrega tudo na RAM (e costuma usar de 2 a 5 vezes o tamanho do arquivo). Para um CSV de 20 GB:

- **Polars** tem o modo **lazy** (\`pl.scan_csv\`): monta um plano, otimiza (lê só as colunas e linhas necessárias) e executa em **streaming**, em pedaços, sem carregar tudo
- **DuckDB** roda SQL direto sobre CSV/Parquet, também em streaming
- **PySpark/Dask** distribuem o trabalho entre várias máquinas quando nem isso basta

**Machine learning clássico:** **scikit-learn** tem a mesma interface para todos os modelos (\`fit\`, \`predict\`), além de pré-processamento e validação cruzada. XGBoost/LightGBM são os campeões em dados tabulares.

**Transformação no warehouse:** o **dbt** organiza transformações como arquivos SQL versionados no Git, com dependências entre modelos, **testes** (não nulo, único) e documentação gerada.

**Orquestração:** **Airflow, Prefect e Dagster** agendam e encadeiam etapas (extrair → tratar → carregar), refazem tentativas em caso de falha e mostram o histórico de execuções.

**ETL × ELT:** no ETL, os dados são transformados antes de carregar; no ELT (comum com dbt), carrega-se o dado bruto no warehouse e transforma-se lá dentro. A ordem lógica é sempre **extrair → transformar/validar → carregar → monitorar**.
`),
  ],
  'py-10-1': [
    theory('np.select e o tipo category', `
**np.select** é o if/elif/else vetorizado para **várias condições**:

~~~python
condicoes = [df["valor"] >= 3000, df["valor"] >= 1000]
escolhas  = ["alto", "médio"]
df["faixa"] = np.select(condicoes, escolhas, default="baixo")
~~~

As condições são avaliadas **na ordem**: a primeira verdadeira vence (como o CASE WHEN do SQL). \`default\` vale quando nenhuma é verdadeira.

**Tipo category.** Uma coluna de texto guarda cada string separadamente: um milhão de "Loja Centro" ocupam um milhão de strings. O tipo \`category\` guarda a lista de valores distintos **uma vez** e, em cada linha, só um **código inteiro** pequeno. A economia é grande quando há **poucos valores distintos que se repetem muito**.

**Medindo memória:** \`s.memory_usage(deep=True)\` devolve os bytes usados (o \`deep=True\` conta o conteúdo real das strings). A economia relativa é \`1 − depois / antes\`.

**Por que a multiplicação direta é a mais rápida:** \`df["preco"] * df["qtd"]\` é uma única operação vetorizada em C. \`apply(axis=1)\` e \`iterrows\` chamam código Python para cada linha.
`),
  ],
  'py-10-2': [
    theory('Geradores e agregação em lotes', `
**Gerador** é uma função com \`yield\`. Em vez de montar a lista inteira e devolver no fim, ela **entrega um item por vez** e pausa até o próximo ser pedido:

~~~python
def contar(n):
    for i in range(n):
        yield i          # entrega i e pausa aqui

for x in contar(3):     # 0, 1, 2 (um por vez, memória constante)
    print(x)
~~~

**Lotes com gerador:** vá acumulando numa lista; quando ela chegar a n itens, faça \`yield\` dela e comece uma nova. No fim, entregue o que sobrou (se não estiver vazio).

**chunksize no read_csv:** \`pd.read_csv(io.StringIO(texto), chunksize=100)\` não devolve um DataFrame, e sim um **iterador de DataFrames** de 100 linhas cada.

**Combinando resultados parciais:**

| agregação | combinação dos lotes |
|---|---|
| soma, contagem | soma das somas / contagens |
| mínimo, máximo | mínimo dos mínimos / máximo dos máximos |
| média | **soma total ÷ contagem total** (não é a média das médias, que erra se os lotes tiverem tamanhos diferentes) |
| mediana | **não combina exatamente**: exige todos os valores ou um algoritmo aproximado |
`),
  ],
  'py-10-3': [
    theory('Dataclasses, exceções e testes', `
**Dataclass** cria uma classe de dados sem escrever \`__init__\`: você declara os campos com tipos, e o Python gera o construtor.

~~~python
from dataclasses import dataclass, field

@dataclass
class Pedido:
    id: int
    itens: list = field(default_factory=list)   # lista nova para cada pedido
    desconto: float = 0.0
~~~

- Campos **sem padrão** vêm antes dos campos com padrão
- Para listas e dicionários, use \`field(default_factory=list)\`: um padrão \`[]\` seria compartilhado por todos os objetos
- \`@property\` cria um atributo calculado: \`pedido.total\` (sem parênteses)

**Levantando erros de validação:** \`raise ValueError("mensagem clara")\` interrompe a função e avisa quem chamou o que está errado. Valide **no começo** do pipeline (falhar cedo): colunas ausentes (\`{"a", "b"} - set(df.columns)\`, diferença de conjuntos), nulos (\`.isna().any()\`) e valores impossíveis (\`(df["valor"] < 0).any()\`).

**Funções testáveis** recebem tudo por parâmetro e devolvem o resultado, sem ler arquivos, variáveis globais ou o relógio por dentro. Assim o teste só precisa chamar a função com um DataFrame pequeno e conferir a saída com \`assert\`.
`),
  ],
};
