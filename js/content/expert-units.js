// Unidades de nível Especialista das trilhas de SQL e Python.
import { theory, quiz, order, sql, py, debugSql } from './helpers.js';
import { PY_STATS, PY_STATS_NOTE, PY_VENDAS } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];

// ════════════════════════════════════════════ SQL
export const SQL_EXPERT = {
  id: 'sql-u10', title: 'SQL de especialista', description: 'Gaps & islands, calendários, JSON, UPSERT e padrões de engenharia de dados',
  lessons: [
    {
      id: 'sql-10-1', title: 'Gaps & islands e sequências',
      steps: [
        theory('Encontrando sequências e buracos', `
"Quantos dias seguidos o cliente usou o app?", "quais períodos ficaram sem venda?": problemas de **gaps & islands** (buracos e ilhas).

O truque clássico: dentro de uma sequência de datas **consecutivas**, a diferença entre a data e o seu número de linha é **constante**.

~~~sql
WITH d AS (
  SELECT data,
         julianday(data) - ROW_NUMBER() OVER (ORDER BY data) AS ilha
  FROM dias_com_evento
)
SELECT MIN(data) AS inicio, MAX(data) AS fim, COUNT(*) AS dias
FROM d GROUP BY ilha;
~~~

Para os **buracos**, use \`LEAD(data)\` e veja onde a próxima data está a mais de 1 dia.
`),
        sql("Na loja **Shopping**, liste as **sequências (ilhas)** de pelo menos 4 dias consecutivos com receita acima da mediana da loja. Colunas: inicio, fim, dias. Ordene pelo início.",
          "WITH m AS (SELECT median(receita) AS md FROM vendas_diarias WHERE loja = 'Shopping'), d AS (SELECT data, julianday(data) - ROW_NUMBER() OVER (ORDER BY data) AS ilha FROM vendas_diarias, m WHERE loja = 'Shopping' AND receita > m.md) SELECT MIN(data) AS inicio, MAX(data) AS fim, COUNT(*) AS dias FROM d GROUP BY ilha HAVING COUNT(*) >= 4 ORDER BY inicio;",
          { ordered: true }),
        sql('Encontre os **buracos** entre pedidos: para cada cliente, os intervalos de **mais de 60 dias** sem comprar. Colunas: cliente_id, de, ate, dias. Ordene por cliente e data.',
          'WITH o AS (SELECT cliente_id, data_pedido AS de, LEAD(data_pedido) OVER (PARTITION BY cliente_id ORDER BY data_pedido) AS ate FROM pedidos) SELECT cliente_id, de, ate, CAST(julianday(ate) - julianday(de) AS INTEGER) AS dias FROM o WHERE ate IS NOT NULL AND julianday(ate) - julianday(de) > 60 ORDER BY cliente_id, de;',
          { ordered: true }),
        quiz('Por que `data − ROW_NUMBER()` identifica sequências consecutivas?', ['Porque ordena as datas', 'Porque, quando data e número de linha crescem juntos de 1 em 1, a diferença fica constante; ela só muda quando há um buraco', 'Porque remove duplicadas', 'Porque agrupa por mês'], 1),
      ],
    },
    {
      id: 'sql-10-2', title: 'Calendários, JSON e UPSERT',
      steps: [
        theory('Calendário completo com CTE recursiva', `
Agregações por dia **somem** com os dias sem dados, o que distorce médias móveis e gráficos. A solução é gerar um **calendário** e fazer LEFT JOIN:

~~~sql
WITH RECURSIVE cal(dia) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(dia, '+1 day') FROM cal WHERE dia < '2024-01-31'
)
SELECT cal.dia, COUNT(p.id) AS pedidos
FROM cal LEFT JOIN pedidos p ON p.data_pedido = cal.dia
GROUP BY cal.dia;
~~~

Em data warehouses: \`GENERATE_SERIES\` (PostgreSQL), \`GENERATE_DATE_ARRAY\` (BigQuery) ou uma tabela-dimensão de datas.
`),
        theory('JSON e UPSERT', `
**JSON** é comum em eventos e APIs. No SQLite:

~~~sql
SELECT json_extract('{"user": {"id": 7}}', '$.user.id');   -- 7
SELECT value FROM json_each('[10, 20, 30]');                -- uma linha por item
~~~
(PostgreSQL: \`->\`, \`->>\`, \`jsonb_array_elements\`; BigQuery: \`JSON_VALUE\`, \`UNNEST\`.)

**UPSERT** insere ou atualiza numa só instrução, base de cargas incrementais:

~~~sql
INSERT INTO estoque (produto_id, qtd) VALUES (2, 10)
ON CONFLICT(produto_id) DO UPDATE SET qtd = qtd + excluded.qtd;
~~~
(\`MERGE\` no SQL Server, Snowflake e BigQuery.)
`),
        sql('Gere o calendário de **janeiro de 2024** e mostre a quantidade de pedidos em cada dia, **incluindo os dias com zero**. Colunas: dia, pedidos. Ordene pelo dia.',
          "WITH RECURSIVE cal(dia) AS (SELECT '2024-01-01' UNION ALL SELECT date(dia, '+1 day') FROM cal WHERE dia < '2024-01-31') SELECT cal.dia, COUNT(p.id) AS pedidos FROM cal LEFT JOIN pedidos p ON p.data_pedido = cal.dia GROUP BY cal.dia ORDER BY cal.dia;",
          { ordered: true }),
        sql('Some os valores do array JSON `[120, 80, 300, 50]` usando `json_each`. Uma coluna, total.',
          "SELECT SUM(value) AS total FROM json_each('[120, 80, 300, 50]');"),
        sql("Crie a tabela **estoque_log** (produto_id INTEGER PRIMARY KEY, qtd INTEGER), insira (1, 5) e (2, 3) e depois faça um **UPSERT** de (2, 10) que **some** à quantidade existente e de (3, 4) que insira uma linha nova.",
          "CREATE TABLE estoque_log (produto_id INTEGER PRIMARY KEY, qtd INTEGER);\nINSERT INTO estoque_log VALUES (1, 5), (2, 3);\nINSERT INTO estoque_log VALUES (2, 10), (3, 4) ON CONFLICT(produto_id) DO UPDATE SET qtd = qtd + excluded.qtd;",
          { check: 'SELECT * FROM estoque_log ORDER BY produto_id;', hint: 'INSERT ... ON CONFLICT(produto_id) DO UPDATE SET qtd = qtd + excluded.qtd' }),
        debugSql('Esta média móvel diária de pedidos ignora os dias sem venda, então a janela de 7 linhas cobre mais de 7 dias. Corrija para usar um **calendário de janeiro** (dia, media_7d com 2 casas, ordenado pelo dia).',
          "WITH d AS (SELECT data_pedido AS dia, COUNT(*) AS n FROM pedidos WHERE data_pedido LIKE '2024-01%' GROUP BY dia) SELECT dia, ROUND(AVG(n) OVER (ORDER BY dia ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS media_7d FROM d ORDER BY dia;",
          "WITH RECURSIVE cal(dia) AS (SELECT '2024-01-01' UNION ALL SELECT date(dia, '+1 day') FROM cal WHERE dia < '2024-01-31'), d AS (SELECT cal.dia, COUNT(p.id) AS n FROM cal LEFT JOIN pedidos p ON p.data_pedido = cal.dia GROUP BY cal.dia) SELECT dia, ROUND(AVG(n) OVER (ORDER BY dia ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS media_7d FROM d ORDER BY dia;",
          { ordered: true }),
        quiz('Uma carga diária precisa inserir clientes novos e atualizar os existentes, sem duplicar. O padrão é...', ['DELETE + INSERT de tudo', 'UPSERT / MERGE pela chave', 'Só INSERT', 'TRUNCATE'], 1),
      ],
    },
  ],
};

// ════════════════════════════════════════════ PYTHON
export const PY_EXPERT = {
  id: 'py-u10', title: 'Python de especialista', description: 'Desempenho, dados maiores que a memória e código de produção',
  lessons: [
    {
      id: 'py-10-1', title: 'Desempenho: vetorização e memória',
      steps: [
        theory('Por que o seu código pandas está lento', `
Regras que resolvem a maior parte dos casos:

1. **Evite laços em Python** (\`for\`, \`iterrows\`, \`apply\` com função Python): use operações vetorizadas (\`np.where\`, \`np.select\`, aritmética de colunas, métodos \`.str\` e \`.dt\`)
2. **Tipos certos**: texto repetitivo como \`category\`; inteiros e floats menores (\`int32\`, \`float32\`) quando a precisão permite
3. **Filtre e selecione cedo**: leia só as colunas necessárias (\`usecols\`) e filtre antes de juntar
4. **Meça antes de otimizar**: \`%timeit\`, \`time.perf_counter()\`, \`df.memory_usage(deep=True)\`

| operação | custo relativo típico |
|---|---|
| laço Python linha a linha | 100x |
| \`apply\` com função Python | 30x |
| operação vetorizada pandas/NumPy | 1x |
`),
        py('Reescreva a função `classificar_loop` (que usa laço) de forma **vetorizada** com `np.select`: crie a coluna `faixa` em `vendas` com "alto" (valor ≥ 3000), "médio" (≥ 1000) ou "baixo".',
          r`vendas["faixa"] = np.select([vendas["valor"] >= 3000, vendas["valor"] >= 1000], ["alto", "médio"], default="baixo")`,
          r`esperado = [classificar_loop(v) for v in vendas["valor"]]
assert list(vendas["faixa"]) == esperado`,
          { setup: PY_VENDAS + r`
def classificar_loop(v):
    if v >= 3000:
        return "alto"
    if v >= 1000:
        return "médio"
    return "baixo"
`, packages: PD, hint: 'np.select(lista_de_condições, lista_de_valores, default=...) avalia as condições em ordem.' }),
        py('Converta as colunas de texto repetitivo `loja` de `diarias` para `category` e calcule `economia`: a fração de memória economizada pela coluna (1 − memória depois ÷ memória antes, com `memory_usage(deep=True)`).',
          r`antes = diarias["loja"].memory_usage(deep=True)
diarias["loja"] = diarias["loja"].astype("category")
depois = diarias["loja"].memory_usage(deep=True)
economia = 1 - depois / antes`,
          r`assert str(diarias["loja"].dtype) == "category"
assert 0.5 < economia < 1`, { setup: PY_STATS, setupNote: PY_STATS_NOTE, packages: PD }),
        quiz('Qual destas é a forma mais rápida de criar uma coluna `total = preco * qtd` num DataFrame grande?', ['for i, row in df.iterrows()', 'df.apply(lambda r: r.preco * r.qtd, axis=1)', 'df["preco"] * df["qtd"]', 'Uma list comprehension com zip'], 2),
      ],
    },
    {
      id: 'py-10-2', title: 'Dados maiores que a memória',
      steps: [
        theory('Geradores, lotes e streaming', `
Quando o arquivo não cabe na memória, **processe em pedaços** e mantenha só agregados:

~~~python
def ler_em_lotes(caminho, tamanho=100_000):
    for lote in pd.read_csv(caminho, chunksize=tamanho):
        yield lote

totais = {}
for lote in ler_em_lotes("vendas.csv"):
    for loja, valor in lote.groupby("loja")["receita"].sum().items():
        totais[loja] = totais.get(loja, 0) + valor
~~~

- **Geradores** (\`yield\`) produzem um item por vez, com memória constante
- Agregações que se **combinam** (soma, contagem, mín., máx.) funcionam em lotes; a **média** precisa de soma e contagem; a **mediana** exata não se combina (use aproximações como t-digest)
- Ferramentas para dados grandes: **Polars** (lazy + streaming), **DuckDB** (SQL sobre Parquet/CSV fora da memória), **PySpark/Dask** (cluster)
`),
        py('Escreva o gerador `em_lotes(itens, n)` que devolve listas de até `n` itens por vez (o último lote pode ser menor).',
          r`def em_lotes(itens, n):
    lote = []
    for item in itens:
        lote.append(item)
        if len(lote) == n:
            yield lote
            lote = []
    if lote:
        yield lote`,
          r`import types
g = em_lotes(range(7), 3)
assert isinstance(g, types.GeneratorType), "use yield para criar um gerador"
assert list(g) == [[0, 1, 2], [3, 4, 5], [6]]
assert list(em_lotes([], 3)) == []`,
          { starter: 'def em_lotes(itens, n):\n    ' }),
        py('O CSV em `texto` tem 1.098 linhas de vendas diárias. Leia em lotes de **100 linhas** (`pd.read_csv(io.StringIO(texto), chunksize=100)`) e acumule a **receita total por loja** num dicionário `totais` e a **média geral** da receita em `media` (usando soma e contagem acumuladas).',
          r`totais = {}
soma = 0.0
contagem = 0
for lote in pd.read_csv(io.StringIO(texto), chunksize=100):
    for loja, valor in lote.groupby("loja")["receita"].sum().items():
        totais[loja] = totais.get(loja, 0) + valor
    soma += lote["receita"].sum()
    contagem += len(lote)
media = soma / contagem`,
          r`ref = diarias.groupby("loja").receita.sum()
assert set(totais) == set(ref.index)
assert all(abs(totais[k] - ref[k]) < 1e-6 for k in ref.index)
assert abs(media - diarias.receita.mean()) < 1e-6`,
          { setup: PY_STATS + '\ntexto = diarias.assign(data=diarias["data"].dt.strftime("%Y-%m-%d")).to_csv(index=False)\n', setupNote: 'Já carregados: `texto` (o CSV das vendas diárias), `diarias` (para conferência), `io`, `pd` e `np`.', packages: PD }),
        quiz('Qual agregação **não** pode ser combinada exatamente a partir de resultados parciais por lote?', ['Soma', 'Contagem', 'Máximo', 'Mediana'], 3),
      ],
    },
    {
      id: 'py-10-3', title: 'Código de produção: tipos, validação e testes',
      steps: [
        theory('Do notebook ao pipeline', `
Análises que rodam todo dia precisam de código confiável:

- **Funções pequenas e puras**: entrada → saída, sem depender de variáveis globais
- **Type hints** e **dataclasses** documentam o formato dos dados
- **Validação** na entrada: falhe cedo e com mensagem clara (ou use **Pandera** / Great Expectations para esquemas de DataFrame)
- **Testes automatizados** com \`pytest\`: casos normais, de borda e de erro
- **Logs** (\`logging\`) em vez de \`print\`, e configuração fora do código

~~~python
from dataclasses import dataclass

@dataclass
class Item:
    preco: float
    qtd: int

    @property
    def total(self) -> float:
        return self.preco * self.qtd
~~~
`),
        py('Crie a dataclass `Pedido` com os campos `id: int`, `itens: list` (lista de tuplas (preço, quantidade)) e `desconto: float = 0.0`, e a propriedade `total` = soma de preço × quantidade, aplicando o desconto percentual (0,1 = 10%) e arredondando para 2 casas.',
          r`from dataclasses import dataclass, field

@dataclass
class Pedido:
    id: int
    itens: list = field(default_factory=list)
    desconto: float = 0.0

    @property
    def total(self) -> float:
        bruto = sum(preco * qtd for preco, qtd in self.itens)
        return round(bruto * (1 - self.desconto), 2)`,
          r`import dataclasses
assert dataclasses.is_dataclass(Pedido)
assert Pedido(1, [(10.0, 2), (5.5, 1)]).total == 25.5
assert Pedido(2, [(100.0, 1)], desconto=0.1).total == 90.0
assert Pedido(3, []).total == 0`,
          { starter: 'from dataclasses import dataclass, field\n\n' }),
        py('Escreva `validar(df)` que levanta `ValueError` com uma mensagem clara se: faltar alguma das colunas `pedido`, `valor`, `status`; houver valores nulos em `valor`; ou houver `valor` negativo. Se estiver tudo certo, devolva `True`.',
          r`def validar(df):
    faltando = {"pedido", "valor", "status"} - set(df.columns)
    if faltando:
        raise ValueError(f"colunas ausentes: {sorted(faltando)}")
    if df["valor"].isna().any():
        raise ValueError("há valores nulos em 'valor'")
    if (df["valor"] < 0).any():
        raise ValueError("há valores negativos em 'valor'")
    return True`,
          r`import pandas as pd
assert validar(vendas) is True
for ruim in [vendas.drop(columns=["status"]), vendas.assign(valor=[None] + list(vendas.valor[1:])), vendas.assign(valor=-vendas.valor)]:
    try:
        validar(ruim)
        raise AssertionError("deveria ter levantado ValueError")
    except ValueError:
        pass`,
          { setup: PY_VENDAS, packages: PD, starter: 'def validar(df):\n    ' }),
        quiz('Qual prática torna uma função de transformação mais fácil de testar?', ['Ler e escrever arquivos dentro dela', 'Receber os dados por parâmetro e devolver o resultado, sem efeitos colaterais', 'Usar variáveis globais', 'Imprimir o resultado'], 1),
        order('Ordene as etapas de um pipeline de dados confiável:', ['Extrair', 'Validar a entrada', 'Transformar', 'Testar a saída', 'Carregar']),
      ],
    },
  ],
};
