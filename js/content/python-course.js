import { theory, quiz, order, fill, py } from './helpers.js';
import { PY_EXPERT } from './expert-units.js';
import { PY_VENDAS } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];
const NP = ['numpy'];

export const PYTHON_COURSE = {
  id: 'python',
  title: 'Python para Análise de Dados',
  icon: 'code',
  color: '#059669',
  description: 'Python essencial, NumPy, pandas, limpeza, séries temporais, visualização, extração (arquivos, APIs, scraping, SQL) e estatística.',
  units: [
    // ───────────────────────────── UNIDADE 1
    {
      id: 'py-u1', title: 'Python essencial', description: 'Tipos, coleções, controle de fluxo e funções',
      lessons: [
        {
          id: 'py-1-1', title: 'Variáveis, tipos e listas',
          steps: [
            theory('Tipos básicos', `
~~~python
idade = 30              # int
preco = 19.90           # float
nome = "Ana"            # str
ativo = True            # bool
nada = None             # ausência de valor

print(type(preco))      # <class 'float'>
print(f"{nome} tem {idade} anos")   # f-string
~~~

**Listas** guardam sequências ordenadas e mutáveis:

~~~python
vendas = [120, 80, 300]
vendas.append(50)       # adiciona no fim
vendas[0]               # 120 (índice começa em 0)
vendas[-1]              # 50 (último)
vendas[1:3]             # [80, 300] (fatiamento: fim exclusivo)
len(vendas), sum(vendas), max(vendas)
~~~
`),
            py('Crie a lista `vendas = [120, 80, 300, 50]` e uma variável `total` com a soma dela.',
              r`vendas = [120, 80, 300, 50]
total = sum(vendas)`,
              r`assert vendas == [120, 80, 300, 50], "A lista vendas está diferente"
assert total == 550, "total deveria ser 550"`),
            quiz('Qual o resultado de `[10, 20, 30, 40][1:3]`?', ['[10, 20, 30]', '[20, 30]', '[20, 30, 40]', '[10, 20]'], 1, 'O fatiamento inclui o início e exclui o fim.'),
            py('Dada a lista `precos`, crie `ultimo` com o último elemento e `media` com a média (soma / quantidade).',
              r`ultimo = precos[-1]
media = sum(precos) / len(precos)`,
              r`assert ultimo == 40
assert abs(media - 25) < 1e-9`,
              { setup: 'precos = [10, 20, 30, 40]', starter: '# precos já existe\n' }),
            fill('Complete a f-string:', 'nome = "Bia"\nprint(___"Olá, {nome}!")', [['f', 'F']]),
          ],
        },
        {
          id: 'py-1-2', title: 'Dicionários, tuplas e sets',
          steps: [
            theory('Coleções', `
~~~python
cliente = {"nome": "Ana", "estado": "SP", "compras": 3}   # dict: chave → valor
cliente["nome"]            # "Ana"
cliente.get("email", "-")  # valor padrão se a chave não existir
cliente["compras"] += 1
for chave, valor in cliente.items():
    print(chave, valor)

ponto = (10, 20)           # tupla: imutável
x, y = ponto               # desempacotamento

estados = {"SP", "RJ", "SP"}   # set: sem duplicados → {"SP", "RJ"}
"SP" in estados                # True (busca rápida)
~~~

| estrutura | ordenada | mutável | duplicados |
|---|---|---|---|
| list | ✅ | ✅ | ✅ |
| tuple | ✅ | ❌ | ✅ |
| dict | ✅ (inserção) | ✅ | chaves não |
| set | ❌ | ✅ | ❌ |
`),
            py('Crie o dicionário `produto` com as chaves `"nome"` = "Mouse", `"preco"` = 89.9 e `"estoque"` = 150.',
              r`produto = {"nome": "Mouse", "preco": 89.9, "estoque": 150}`,
              r`assert produto == {"nome": "Mouse", "preco": 89.9, "estoque": 150}`),
            py('A lista `estados` tem repetições. Crie `unicos` com a **quantidade** de estados distintos.',
              r`unicos = len(set(estados))`,
              r`assert unicos == 4`,
              { setup: 'estados = ["SP", "RJ", "SP", "MG", "PR", "RJ"]' }),
            quiz('Qual estrutura é ideal para checar rapidamente se um valor já foi visto?', ['list', 'tuple', 'set', 'str'], 2, 'Sets (e chaves de dict) usam hash: a busca é O(1).'),
            py('Use `.get()` para criar `email` com o email do `cliente`, ou `"sem email"` se a chave não existir.',
              r`email = cliente.get("email", "sem email")`,
              r`assert email == "sem email"`,
              { setup: 'cliente = {"nome": "Carla", "estado": "MG"}' }),
          ],
        },
        {
          id: 'py-1-3', title: 'Condições, laços e funções',
          steps: [
            theory('Controle de fluxo e funções', `
~~~python
def classificar(valor):
    """Classifica um pedido pelo valor."""
    if valor >= 1000:
        return "alto"
    elif valor >= 300:
        return "médio"
    else:
        return "baixo"

for v in [50, 400, 2000]:
    print(v, classificar(v))

# list comprehension: cria listas de forma concisa
quadrados = [n ** 2 for n in range(5)]            # [0, 1, 4, 9, 16]
grandes = [v for v in [50, 400, 2000] if v > 100]  # com filtro

# dict comprehension
precos = {"a": 10, "b": 20}
com_desconto = {k: v * 0.9 for k, v in precos.items()}

dobro = lambda x: x * 2    # função anônima
~~~
`),
            py('Escreva a função `classificar(valor)` que retorna `"alto"` se valor ≥ 1000, `"médio"` se ≥ 300 e `"baixo"` caso contrário.',
              r`def classificar(valor):
    if valor >= 1000:
        return "alto"
    elif valor >= 300:
        return "médio"
    return "baixo"`,
              r`assert classificar(1500) == "alto"
assert classificar(1000) == "alto"
assert classificar(300) == "médio"
assert classificar(299.99) == "baixo"`,
              { starter: 'def classificar(valor):\n    ' }),
            py('Com uma list comprehension, crie `acima` com os valores de `pedidos` **maiores que 500**.',
              r`acima = [v for v in pedidos if v > 500]`,
              r`assert acima == [1200, 800, 950]`,
              { setup: 'pedidos = [100, 1200, 300, 800, 50, 950]' }),
            py('Crie `com_imposto`, um dicionário com os mesmos produtos de `precos`, mas com cada preço multiplicado por 1.1 e arredondado com `round(x, 2)`.',
              r`com_imposto = {k: round(v * 1.1, 2) for k, v in precos.items()}`,
              r`assert com_imposto == {"mouse": 98.89, "teclado": 384.89, "monitor": 2088.9}`,
              { setup: 'precos = {"mouse": 89.9, "teclado": 349.9, "monitor": 1899.0}' }),
            quiz('O que `[x * 2 for x in range(3)]` retorna?', ['[2, 4, 6]', '[0, 2, 4]', '[0, 1, 2]', '[1, 2, 3]'], 1),
            theory('Tratamento de erros', `
~~~python
try:
    valor = float("12,5")
except ValueError as e:
    print("Não consegui converter:", e)
    valor = float("12,5".replace(",", "."))
finally:
    print("sempre executa")
~~~

Em pipelines de dados, tratar erros evita que **um registro ruim derrube o processo inteiro**.
`),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 2
    {
      id: 'py-u2', title: 'NumPy', description: 'Arrays, vetorização, indexação booleana e broadcasting',
      lessons: [
        {
          id: 'py-2-1', title: 'Arrays e vetorização',
          steps: [
            theory('Por que NumPy?', `
**NumPy** é a base de todo o ecossistema de dados em Python (pandas, scikit-learn, etc.). Seu objeto principal é o **ndarray**: um array de tipo único, guardado de forma contígua na memória → operações até **100x mais rápidas** que listas.

~~~python
import numpy as np
a = np.array([10, 20, 30, 40])
a * 2            # array([20, 40, 60, 80])  ← vetorização, sem laço!
a.mean(), a.std(), a.sum(), a.max()
a.shape, a.dtype

np.arange(0, 10, 2)      # [0 2 4 6 8]
np.linspace(0, 1, 5)     # 5 pontos igualmente espaçados
np.zeros((2, 3))         # matriz 2x3 de zeros
m = np.array([[1, 2], [3, 4]])
m.T                      # transposta
m @ m                    # multiplicação de matrizes
~~~
`),
            py('Crie o array `precos` a partir da lista `lista` e `com_desconto` aplicando 15% de desconto (sem laços!).',
              r`import numpy as np
precos = np.array(lista)
com_desconto = precos * 0.85`,
              r`import numpy as np
assert isinstance(precos, np.ndarray), "precos deve ser um np.ndarray"
assert np.allclose(com_desconto, [85.0, 170.0, 42.5])`,
              { setup: 'lista = [100, 200, 50]', packages: NP, starter: 'import numpy as np\n' }),
            py('Dado o array `notas`, crie `media` (média) e `desvio` (desvio padrão) usando métodos do NumPy.',
              r`media = notas.mean()
desvio = notas.std()`,
              r`assert abs(media - 7.0) < 1e-9
assert abs(desvio - np.std([5, 6, 7, 8, 9])) < 1e-9`,
              { setup: 'import numpy as np\nnotas = np.array([5, 6, 7, 8, 9])', packages: NP }),
            quiz('Por que operações NumPy são mais rápidas que laços Python?', [
              'Porque usam a GPU sempre',
              'Porque são vetorizadas: executam em C sobre memória contígua de um único tipo',
              'Porque pulam elementos',
              'Não são mais rápidas'], 1),
            py('Crie `m`, uma matriz 3x3 com os números de 1 a 9 (use `np.arange` e `.reshape`), e `diag` com a soma da diagonal principal (`np.trace`).',
              r`m = np.arange(1, 10).reshape(3, 3)
diag = np.trace(m)`,
              r`assert m.shape == (3, 3)
assert m[2, 2] == 9
assert diag == 15`,
              { setup: 'import numpy as np', packages: NP }),
          ],
        },
        {
          id: 'py-2-2', title: 'Máscaras booleanas e broadcasting',
          steps: [
            theory('Filtrando arrays', `
~~~python
v = np.array([120, 80, 300, 50, 900])
mascara = v > 100           # array([ True, False,  True, False,  True])
v[mascara]                  # array([120, 300, 900])
v[(v > 100) & (v < 500)]    # & = E, | = OU, ~ = NÃO (use parênteses!)
np.where(v > 100, "alto", "baixo")   # if/else vetorizado
(v > 100).sum()             # conta os True → 3
~~~

**Broadcasting**: operações entre arrays de formatos compatíveis "esticam" o menor:

~~~python
m = np.array([[1, 2, 3], [4, 5, 6]])   # shape (2, 3)
m - m.mean(axis=0)   # subtrai a média de cada coluna (shape (3,))
~~~

\`axis=0\` → ao longo das linhas (resultado por coluna); \`axis=1\` → por linha.
`),
            py('Crie `grandes` com os valores de `v` entre 100 e 500 (inclusive) e `qtd` com quantos valores são maiores que 100.',
              r`grandes = v[(v >= 100) & (v <= 500)]
qtd = (v > 100).sum()`,
              r`assert list(grandes) == [120, 300, 500]
assert qtd == 4`,
              { setup: 'import numpy as np\nv = np.array([120, 80, 300, 50, 900, 500])', packages: NP }),
            py('Use `np.where` para criar `rotulo`: "alto" quando `v` > 100, senão "baixo".',
              r`rotulo = np.where(v > 100, "alto", "baixo")`,
              r`assert list(rotulo) == ["alto", "baixo", "alto", "baixo"]`,
              { setup: 'import numpy as np\nv = np.array([120, 80, 300, 50])', packages: NP }),
            quiz('Em uma matriz shape (4, 3), `m.sum(axis=0)` tem qual shape?', ['(4,)', '(3,)', '(4, 3)', '()'], 1, 'axis=0 "colapsa" as linhas → um valor por coluna.'),
            py('**Padronize** as colunas da matriz `m` (z-score): subtraia a média de cada coluna e divida pelo desvio padrão de cada coluna. Guarde em `z`.',
              r`z = (m - m.mean(axis=0)) / m.std(axis=0)`,
              r`assert z.shape == m.shape
assert np.allclose(z.mean(axis=0), 0)
assert np.allclose(z.std(axis=0), 1)`,
              { setup: 'import numpy as np\nm = np.array([[1.0, 200.0], [2.0, 400.0], [3.0, 900.0]])', packages: NP }),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 3
    {
      id: 'py-u3', title: 'pandas: fundamentos', description: 'Series, DataFrame, leitura, seleção e filtros',
      lessons: [
        {
          id: 'py-3-1', title: 'Series, DataFrame e leitura',
          steps: [
            theory('O que é o pandas', `
**pandas** é a biblioteca nº 1 para manipular dados tabulares em Python.

- **Series**: uma coluna (array com índice)
- **DataFrame**: uma tabela (várias Series que compartilham o índice)

~~~python
import pandas as pd
df = pd.read_csv("vendas.csv", sep=",", parse_dates=["data"])
# também: read_excel, read_json, read_parquet, read_sql, read_html, read_clipboard

df.head()        # primeiras linhas
df.shape         # (linhas, colunas)
df.info()        # tipos e nulos
df.describe()    # estatísticas das colunas numéricas
df.columns, df.dtypes
df["estado"].value_counts()   # frequência
df["estado"].nunique()        # nº de valores distintos
~~~
`),
            py('Leia o CSV que está na string `csv` com `pd.read_csv(io.StringIO(csv))` e guarde em `df`. Crie `linhas` com o número de linhas.',
              r`import io
import pandas as pd
df = pd.read_csv(io.StringIO(csv))
linhas = df.shape[0]`,
              r`assert list(df.columns) == ["produto", "categoria", "preco"]
assert linhas == 4`,
              { setup: 'csv = "produto,categoria,preco\\nMouse,Acessórios,89.9\\nNotebook,Eletrônicos,5200\\nLivro SQL,Livros,99\\nMonitor,Eletrônicos,1899"', packages: PD, starter: 'import io\nimport pandas as pd\n' }),
            py('Usando o DataFrame `vendas` (já carregado), crie `n_estados` com o número de estados distintos e `top_estado` com o estado que mais aparece.',
              r`n_estados = vendas["estado"].nunique()
top_estado = vendas["estado"].value_counts().idxmax()`,
              r`assert n_estados == 6
assert top_estado == "SP"`,
              { setup: PY_VENDAS, packages: PD, hint: 'value_counts() ordena do mais frequente; idxmax() devolve o rótulo do maior.' }),
            quiz('Qual método mostra tipos das colunas e contagem de não nulos?', ['df.head()', 'df.info()', 'df.describe()', 'df.shape'], 1),
            py('Crie `ticket_medio` com a média da coluna `valor` de `vendas`, arredondada para 2 casas.',
              r`ticket_medio = round(vendas["valor"].mean(), 2)`,
              r`assert ticket_medio == round(vendas["valor"].mean(), 2)
assert abs(ticket_medio - 2520.38) < 0.01`,
              { setup: PY_VENDAS, packages: PD }),
          ],
        },
        {
          id: 'py-3-2', title: 'Selecionando e filtrando',
          steps: [
            theory('Seleção: [], loc e iloc', `
~~~python
df["valor"]                     # uma coluna → Series
df[["cliente", "valor"]]        # várias colunas → DataFrame

df.loc[0, "cliente"]            # por RÓTULO (linha 0, coluna "cliente")
df.loc[df["valor"] > 1000, ["cliente", "valor"]]
df.iloc[0:3, 1:4]               # por POSIÇÃO (fim exclusivo)

# filtros (máscaras booleanas, como no NumPy)
df[df["estado"] == "SP"]
df[(df["estado"] == "SP") & (df["valor"] > 1000)]
df[df["estado"].isin(["SP", "RJ"])]
df[df["cliente"].str.startswith("A")]
df.query("estado == 'SP' and valor > 1000")   # sintaxe alternativa
~~~
`),
            py('Crie `sp` com as vendas do estado **SP** com valor **maior que 1000**.',
              r`sp = vendas[(vendas["estado"] == "SP") & (vendas["valor"] > 1000)]`,
              r`assert list(sp["pedido"]) == [1, 5, 9]`,
              { setup: PY_VENDAS, packages: PD }),
            py('Crie `sudeste` com apenas as colunas `cliente` e `valor` das vendas de **SP, RJ ou MG** (use `isin` e `loc`).',
              r`sudeste = vendas.loc[vendas["estado"].isin(["SP", "RJ", "MG"]), ["cliente", "valor"]]`,
              r`assert list(sudeste.columns) == ["cliente", "valor"]
assert len(sudeste) == 9`,
              { setup: PY_VENDAS, packages: PD }),
            quiz('Qual a diferença entre `loc` e `iloc`?', ['Nenhuma', 'loc usa rótulos; iloc usa posições inteiras', 'iloc é só para colunas', 'loc só funciona com números'], 1),
            fill('Complete o filtro de pedidos entregues com valor acima de 2000:', 'vendas[(vendas["status"] == "entregue") ___ (vendas["valor"] > 2000)]', [['&']],
              'No pandas use & (e), | (ou), ~ (não), sempre com parênteses em cada condição.'),
            py('🐞 Este código deveria criar `caros_sp` com as vendas de SP acima de 3000, mas dá erro. Corrija.',
              r`caros_sp = vendas[(vendas["estado"] == "SP") & (vendas["valor"] > 3000)]`,
              r`assert list(caros_sp["pedido"]) == [1, 5, 9]`,
              { setup: PY_VENDAS, packages: PD, starter: 'caros_sp = vendas[(vendas["estado"] == "SP") and (vendas["valor"] > 3000)]' }),
            py('Usando `query`, crie `grandes_rj` com as vendas do RJ acima de 3000.',
              r`grandes_rj = vendas.query("estado == 'RJ' and valor > 3000")`,
              r`assert list(grandes_rj["pedido"]) == [2]`,
              { setup: PY_VENDAS, packages: PD }),
          ],
        },
        {
          id: 'py-3-3', title: 'Criando colunas e ordenando',
          steps: [
            theory('Transformando colunas', `
~~~python
df["valor_com_imposto"] = df["valor"] * 1.1                  # vetorizado
df["faixa"] = np.where(df["valor"] > 1000, "alto", "baixo")
df["faixa"] = pd.cut(df["valor"], bins=[0, 500, 2000, np.inf],
                     labels=["baixo", "médio", "alto"])   # faixas
df["cliente_upper"] = df["cliente"].str.upper()
df["mes"] = pd.to_datetime(df["data"]).dt.month
df = df.assign(dobro=lambda d: d["valor"] * 2)              # encadeável
df["x"] = df["valor"].apply(minha_funcao)   # ⚠️ mais lento: use só se não houver forma vetorizada
df["uf"] = df["estado"].map({"SP": "São Paulo", "RJ": "Rio"})

df.sort_values("valor", ascending=False)
df.sort_values(["estado", "valor"], ascending=[True, False])
df.nlargest(3, "valor")
df.rename(columns={"valor": "receita"})
df.drop(columns=["x"])
~~~
`),
            py('Adicione em `vendas` a coluna `liquido` = valor × 0.85 e crie `top3` com as **3 maiores vendas** (DataFrame ordenado de forma decrescente pelo valor).',
              r`vendas["liquido"] = vendas["valor"] * 0.85
top3 = vendas.sort_values("valor", ascending=False).head(3)`,
              r`assert "liquido" in vendas.columns
assert abs(vendas["liquido"].iloc[0] - 5289.9 * 0.85) < 1e-6
assert list(top3["pedido"]) == [8, 1, 5]`,
              { setup: PY_VENDAS, packages: PD }),
            py('Crie a coluna `faixa` em `vendas` usando `pd.cut` com bins `[0, 500, 2000, np.inf]` e labels `["baixo", "médio", "alto"]`.',
              r`vendas["faixa"] = pd.cut(vendas["valor"], bins=[0, 500, 2000, np.inf], labels=["baixo", "médio", "alto"])`,
              r`assert list(vendas["faixa"].astype(str)) == ["alto", "alto", "médio", "médio", "alto", "baixo", "alto", "alto", "alto", "baixo", "baixo", "alto"]`,
              { setup: PY_VENDAS, packages: PD }),
            quiz('Por que preferir operações vetorizadas a `.apply` com função Python?', ['apply não existe', 'Vetorização roda em C e é muito mais rápida', 'apply muda a ordem das linhas', 'Não há diferença'], 1),
            py('Crie a coluna `regiao` mapeando os estados com o dicionário `regioes` (use `.map`).',
              r`vendas["regiao"] = vendas["estado"].map(regioes)`,
              r`assert vendas["regiao"].tolist()[:4] == ["Sudeste", "Sudeste", "Sudeste", "Sudeste"]
assert (vendas["regiao"] == "Sul").sum() == 2
assert vendas["regiao"].isna().sum() == 0`,
              { setup: PY_VENDAS + '\nregioes = {"SP": "Sudeste", "RJ": "Sudeste", "MG": "Sudeste", "PR": "Sul", "RS": "Sul", "PE": "Nordeste"}', packages: PD }),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 4
    {
      id: 'py-u4', title: 'pandas: agregar e combinar', description: 'groupby, merge, concat, pivot_table e melt',
      lessons: [
        {
          id: 'py-4-1', title: 'groupby e agg',
          steps: [
            theory('Split → Apply → Combine', `
~~~python
df.groupby("estado")["valor"].sum()
df.groupby("estado")["valor"].agg(["sum", "mean", "count"])

# named aggregation: nomeia as colunas resultantes
df.groupby("estado").agg(
    receita=("valor", "sum"),
    pedidos=("pedido", "count"),
    ticket=("valor", "mean"),
).reset_index()

# várias chaves
df.groupby(["estado", "categoria"], as_index=False)["valor"].sum()

# transform: devolve um valor por LINHA (como window function no SQL!)
df["pct_estado"] = df["valor"] / df.groupby("estado")["valor"].transform("sum")
~~~

> \`groupby\` no pandas = \`GROUP BY\` no SQL. \`transform\` = \`OVER (PARTITION BY ...)\`.
`),
            py('Crie `receita_estado`: uma Series com a **soma de valor por estado**.',
              r`receita_estado = vendas.groupby("estado")["valor"].sum()`,
              r`assert abs(receita_estado["SP"] - (5289.9 + 808.9 + 3977.8 + 3958.0 + 228.0)) < 1e-6
assert len(receita_estado) == 6`,
              { setup: PY_VENDAS, packages: PD }),
            py('Crie `resumo` com uma linha por `categoria` e as colunas `receita` (soma de valor) e `pedidos` (contagem), usando named aggregation e `reset_index()`.',
              r`resumo = vendas.groupby("categoria").agg(receita=("valor", "sum"), pedidos=("pedido", "count")).reset_index()`,
              r`assert set(["categoria", "receita", "pedidos"]) <= set(resumo.columns)
r = resumo.set_index("categoria")
assert r.loc["Eletrônicos", "pedidos"] == 5
assert abs(r.loc["Livros", "receita"] - 714.0) < 1e-6`,
              { setup: PY_VENDAS, packages: PD }),
            py('Crie a coluna `pct_categoria` em `vendas`: o valor de cada venda dividido pela receita total da sua categoria (use `transform`).',
              r`vendas["pct_categoria"] = vendas["valor"] / vendas.groupby("categoria")["valor"].transform("sum")`,
              r`assert abs(vendas.groupby("categoria")["pct_categoria"].sum() - 1).max() < 1e-9
assert abs(vendas.loc[5, "pct_categoria"] - 486 / 714) < 1e-9`,
              { setup: PY_VENDAS, packages: PD }),
            quiz('Qual operação do pandas equivale a uma window function `SUM(...) OVER (PARTITION BY ...)`?', ['groupby().sum()', 'groupby().transform("sum")', 'pivot_table', 'merge'], 1),
          ],
        },
        {
          id: 'py-4-2', title: 'merge e concat',
          steps: [
            theory('Juntando DataFrames', `
~~~python
# merge = JOIN do SQL
pd.merge(pedidos, clientes, left_on="cliente_id", right_on="id", how="left")
pedidos.merge(clientes, on="cliente_id", how="inner")
# how: "inner" | "left" | "right" | "outer" | "cross"
# validate="many_to_one" garante a cardinalidade esperada
# indicator=True cria a coluna _merge (both / left_only / right_only) → ótimo para anti-joins

# concat = UNION ALL (empilhar)
pd.concat([df_jan, df_fev], ignore_index=True)
pd.concat([a, b], axis=1)   # lado a lado
~~~
`),
            py('Faça o merge de `pedidos` com `clientes` pela coluna `cliente_id` (inner) e guarde em `completo`.',
              r`completo = pedidos.merge(clientes, on="cliente_id", how="inner")`,
              r`assert len(completo) == 4
assert "nome" in completo.columns
assert completo.loc[completo["pedido"] == 3, "nome"].iloc[0] == "Ana"`,
              { setup: r`import pandas as pd
clientes = pd.DataFrame({"cliente_id": [1, 2, 3, 4], "nome": ["Ana", "Bruno", "Carla", "João"]})
pedidos = pd.DataFrame({"pedido": [1, 2, 3, 4], "cliente_id": [1, 2, 1, 3], "valor": [100, 250, 80, 40]})`, packages: PD }),
            py('Usando `merge` com `how="left"` e `indicator=True`, crie `sem_pedido` com os **clientes que nunca compraram** (apenas as linhas de clientes).',
              r`m = clientes.merge(pedidos, on="cliente_id", how="left", indicator=True)
sem_pedido = m[m["_merge"] == "left_only"]`,
              r`assert list(sem_pedido["nome"]) == ["João"]`,
              { setup: r`import pandas as pd
clientes = pd.DataFrame({"cliente_id": [1, 2, 3, 4], "nome": ["Ana", "Bruno", "Carla", "João"]})
pedidos = pd.DataFrame({"pedido": [1, 2, 3, 4], "cliente_id": [1, 2, 1, 3], "valor": [100, 250, 80, 40]})`, packages: PD }),
            py('Empilhe `jan` e `fev` em `trimestre` com índice novo (0, 1, 2...).',
              r`trimestre = pd.concat([jan, fev], ignore_index=True)`,
              r`assert len(trimestre) == 5
assert list(trimestre.index) == [0, 1, 2, 3, 4]`,
              { setup: r`import pandas as pd
jan = pd.DataFrame({"dia": [1, 2, 3], "valor": [10, 20, 30]})
fev = pd.DataFrame({"dia": [1, 2], "valor": [40, 50]})`, packages: PD }),
            quiz('`pd.concat([a, b])` é equivalente a qual operação SQL?', ['JOIN', 'UNION ALL', 'GROUP BY', 'INTERSECT'], 1),
          ],
        },
        {
          id: 'py-4-3', title: 'pivot_table, melt e crosstab',
          steps: [
            theory('Mudando o formato da tabela', `
**Formato longo** (uma linha por observação) ↔ **formato largo** (uma coluna por categoria):

~~~python
# longo → largo (tabela dinâmica do Excel)
pd.pivot_table(df, index="estado", columns="categoria",
               values="valor", aggfunc="sum", fill_value=0, margins=True)

# largo → longo
pd.melt(largo, id_vars=["estado"], var_name="categoria", value_name="valor")

# tabela de frequência cruzada
pd.crosstab(df["estado"], df["status"], normalize="index")

df.stack(), df.unstack()   # gira níveis do índice
~~~
`),
            py('Crie `tabela` com `pivot_table`: estados nas linhas, categorias nas colunas, soma de valor, preenchendo ausentes com 0.',
              r`tabela = pd.pivot_table(vendas, index="estado", columns="categoria", values="valor", aggfunc="sum", fill_value=0)`,
              r`assert tabela.shape == (6, 4)
assert abs(tabela.loc["SP", "Eletrônicos"] - (5289.9 + 3977.8 + 3958.0)) < 1e-6
assert tabela.loc["PE", "Livros"] == 0`,
              { setup: PY_VENDAS, packages: PD }),
            py('Transforme `largo` (colunas jan, fev, mar) em formato longo `longo` com colunas `loja`, `mes` e `valor`.',
              r`longo = pd.melt(largo, id_vars=["loja"], var_name="mes", value_name="valor")`,
              r`assert list(longo.columns) == ["loja", "mes", "valor"]
assert len(longo) == 6
assert longo.loc[(longo["loja"] == "B") & (longo["mes"] == "mar"), "valor"].iloc[0] == 60`,
              { setup: r`import pandas as pd
largo = pd.DataFrame({"loja": ["A", "B"], "jan": [10, 40], "fev": [20, 50], "mar": [30, 60]})`, packages: PD }),
            py('Crie `ct` com `pd.crosstab` contando vendas por `estado` (linhas) e `status` (colunas).',
              r`ct = pd.crosstab(vendas["estado"], vendas["status"])`,
              r`assert ct.loc["SP", "entregue"] == 5
assert ct.loc["MG", "cancelado"] == 1`,
              { setup: PY_VENDAS, packages: PD }),
            quiz('Para que serve `melt`?', ['Juntar dois DataFrames', 'Converter do formato largo para o longo', 'Remover nulos', 'Ordenar colunas'], 1,
              'O formato longo ("tidy") é o preferido por bibliotecas como seaborn e plotly.'),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 5
    {
      id: 'py-u5', title: 'Limpeza de dados', description: 'Nulos, duplicados, tipos, textos e outliers',
      lessons: [
        {
          id: 'py-5-1', title: 'Nulos e duplicados',
          steps: [
            theory('Dados faltantes', `
Analistas gastam até **80% do tempo** limpando dados. Os primeiros passos:

~~~python
df.isna().sum()                    # nulos por coluna
df.isna().mean() * 100             # % de nulos
df.dropna(subset=["email"])        # remove linhas com email nulo
df["idade"] = df["idade"].fillna(df["idade"].median())   # imputação
df["cidade"] = df["cidade"].fillna("Desconhecida")
df["valor"] = df["valor"].ffill()   # propaga o último valor válido (séries temporais)

df.duplicated().sum()              # nº de linhas duplicadas
df.drop_duplicates()               # remove duplicadas
df.drop_duplicates(subset=["email"], keep="last")
~~~

> Não existe regra única: **entenda o porquê** do dado faltar antes de remover ou imputar.
`),
            py('Crie `nulos`: uma Series com a **quantidade de nulos por coluna** do DataFrame `df`.',
              r`nulos = df.isna().sum()`,
              r`assert nulos["idade"] == 2
assert nulos["cidade"] == 1
assert nulos["nome"] == 0`,
              { setup: r`import pandas as pd, numpy as np
df = pd.DataFrame({"nome": ["Ana", "Bia", "Caio", "Davi", "Ana"], "idade": [30, np.nan, 25, np.nan, 30], "cidade": ["SP", "RJ", None, "MG", "SP"]})`, packages: PD }),
            py('Em `df`, preencha a `idade` nula com a **mediana** da coluna e a `cidade` nula com "Desconhecida". Depois remova linhas **duplicadas** e guarde o resultado em `limpo`.',
              r`df["idade"] = df["idade"].fillna(df["idade"].median())
df["cidade"] = df["cidade"].fillna("Desconhecida")
limpo = df.drop_duplicates()`,
              r`assert limpo["idade"].isna().sum() == 0
assert (limpo["idade"] == 30).sum() == 3
assert "Desconhecida" in limpo["cidade"].values
assert len(limpo) == 4`,
              { setup: r`import pandas as pd, numpy as np
df = pd.DataFrame({"nome": ["Ana", "Bia", "Caio", "Davi", "Ana"], "idade": [30, np.nan, 25, np.nan, 30], "cidade": ["SP", "RJ", None, "MG", "SP"]})`, packages: PD,
                hint: 'A mediana de [30, 25, 30] é 30.' }),
            quiz('Quando usar a mediana em vez da média para imputar nulos?', ['Nunca', 'Quando há outliers/assimetria — a mediana é robusta', 'Quando a coluna é texto', 'Sempre que houver duplicados'], 1),
          ],
        },
        {
          id: 'py-5-2', title: 'Tipos, textos e outliers',
          steps: [
            theory('Corrigindo tipos e textos', `
~~~python
df["preco"] = (df["preco"].str.replace("R$", "", regex=False)
                           .str.replace(".", "", regex=False)
                           .str.replace(",", ".", regex=False)
                           .astype(float))
pd.to_numeric(df["x"], errors="coerce")     # valores inválidos viram NaN
pd.to_datetime(df["data"], format="%d/%m/%Y", errors="coerce")
df["categoria"] = df["categoria"].astype("category")   # economiza memória

# métodos .str (vetorizados)
df["nome"].str.strip().str.title()
df["email"].str.lower().str.contains("@gmail")
df["cpf"].str.replace(r"\\D", "", regex=True)          # só dígitos
df["dominio"] = df["email"].str.split("@").str[1]
df["cep"].str.extract(r"(\\d{5})")
~~~

**Outliers** pelo método do IQR:

~~~python
q1, q3 = df["valor"].quantile([0.25, 0.75])
iqr = q3 - q1
fora = df[(df["valor"] < q1 - 1.5 * iqr) | (df["valor"] > q3 + 1.5 * iqr)]
~~~
`),
            py('A coluna `preco` está como texto no formato brasileiro (ex.: "R$ 1.299,90"). Converta para float na própria coluna.',
              r`df["preco"] = (df["preco"].str.replace("R$", "", regex=False)
                           .str.replace(".", "", regex=False)
                           .str.replace(",", ".", regex=False)
                           .str.strip()
                           .astype(float))`,
              r`assert df["preco"].tolist() == [1299.9, 89.9, 15000.0]`,
              { setup: r`import pandas as pd
df = pd.DataFrame({"produto": ["Cadeira", "Mouse", "Servidor"], "preco": ["R$ 1.299,90", "R$ 89,90", "R$ 15.000,00"]})`, packages: PD }),
            py('Padronize a coluna `nome` (remova espaços extras nas pontas e use Title Case) e crie a coluna `dominio` com o que vem depois do @ no `email` (em minúsculas).',
              r`df["nome"] = df["nome"].str.strip().str.title()
df["dominio"] = df["email"].str.lower().str.split("@").str[1]`,
              r`assert df["nome"].tolist() == ["Ana Souza", "Bruno Lima"]
assert df["dominio"].tolist() == ["gmail.com", "empresa.com.br"]`,
              { setup: r`import pandas as pd
df = pd.DataFrame({"nome": ["  ana souza", "BRUNO LIMA  "], "email": ["Ana@Gmail.com", "bruno@EMPRESA.com.br"]})`, packages: PD }),
            py('Usando o método do IQR, crie `outliers` com as linhas de `df` cujo `valor` está fora de [Q1 − 1.5·IQR, Q3 + 1.5·IQR].',
              r`q1, q3 = df["valor"].quantile([0.25, 0.75])
iqr = q3 - q1
outliers = df[(df["valor"] < q1 - 1.5 * iqr) | (df["valor"] > q3 + 1.5 * iqr)]`,
              r`assert outliers["valor"].tolist() == [5000]`,
              { setup: r`import pandas as pd
df = pd.DataFrame({"valor": [100, 120, 110, 95, 130, 105, 5000, 115]})`, packages: PD }),
            quiz('O que `pd.to_numeric(s, errors="coerce")` faz com o valor "abc"?', ['Gera erro', 'Converte para NaN', 'Mantém "abc"', 'Converte para 0'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 6
    {
      id: 'py-u6', title: 'Datas e séries temporais', description: 'to_datetime, .dt, resample e rolling',
      lessons: [
        {
          id: 'py-6-1', title: 'Datas no pandas',
          steps: [
            theory('Datetime, resample e rolling', `
~~~python
df["data"] = pd.to_datetime(df["data"])
df["ano"] = df["data"].dt.year
df["mes"] = df["data"].dt.to_period("M")     # 2024-03
df["dia_semana"] = df["data"].dt.day_name()
df["dias_desde"] = (pd.Timestamp("2024-12-31") - df["data"]).dt.days

# séries temporais: data como índice
s = df.set_index("data")["valor"]
s.resample("MS").sum()        # soma por mês (MS = início do mês)
s.resample("W").mean()        # média semanal
s.rolling(3).mean()           # média móvel de 3 períodos
s.pct_change()                # variação percentual
s.shift(1)                    # = LAG do SQL
s.cumsum()                    # acumulado
~~~
`),
            py('Converta `vendas["data"]` para datetime e crie `por_mes`: a soma de `valor` por mês usando `resample("MS")` (com a data como índice).',
              r`vendas["data"] = pd.to_datetime(vendas["data"])
por_mes = vendas.set_index("data")["valor"].resample("MS").sum()`,
              r`assert len(por_mes) == 5
assert abs(por_mes.iloc[0] - (5289.9 + 3697.0)) < 1e-6
assert str(por_mes.index[0].date()) == "2024-01-01"`,
              { setup: PY_VENDAS, packages: PD }),
            py('Crie a coluna `dia_semana` com o nome do dia da semana (em inglês, via `.dt.day_name()`) de cada venda.',
              r`vendas["dia_semana"] = pd.to_datetime(vendas["data"]).dt.day_name()`,
              r`assert vendas["dia_semana"].iloc[0] == "Friday"`,
              { setup: PY_VENDAS, packages: PD }),
            py('A partir de `por_mes` (já pronto), crie `crescimento` com a **variação percentual** mês a mês e `acumulado` com a soma acumulada.',
              r`crescimento = por_mes.pct_change()
acumulado = por_mes.cumsum()`,
              r`assert pd.isna(crescimento.iloc[0])
assert abs(crescimento.iloc[1] - (por_mes.iloc[1] / por_mes.iloc[0] - 1)) < 1e-9
assert abs(acumulado.iloc[-1] - por_mes.sum()) < 1e-6`,
              { setup: PY_VENDAS + '\nvendas["data"] = pd.to_datetime(vendas["data"])\npor_mes = vendas.set_index("data")["valor"].resample("MS").sum()', packages: PD }),
            quiz('Qual método do pandas equivale ao LAG do SQL?', ['rolling', 'shift', 'diff', 'resample'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 7
    {
      id: 'py-u7', title: 'Visualização de dados', description: 'matplotlib, seaborn, plotly e boas práticas',
      lessons: [
        {
          id: 'py-7-1', title: 'matplotlib e pandas.plot',
          steps: [
            theory('O ecossistema de visualização', `
| biblioteca | quando usar |
|---|---|
| **matplotlib** | base de tudo; controle total, gráficos estáticos |
| **pandas .plot()** | exploração rápida direto do DataFrame |
| **seaborn** | gráficos estatísticos bonitos com pouco código |
| **plotly** | gráficos interativos, dashboards (Dash) |
| **altair** | gramática de gráficos declarativa |
| **streamlit** | transformar análises em apps web |

~~~python
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(8, 4))
ax.bar(df["categoria"], df["receita"], color="#1cb0f6")
ax.set_title("Receita por categoria")
ax.set_xlabel("Categoria"); ax.set_ylabel("R$")
plt.tight_layout()
plt.show()

df.groupby("mes")["valor"].sum().plot(kind="line", marker="o")
~~~
`),
            py('Crie um gráfico de **barras** com a receita por categoria de `vendas`. Use `fig, ax = plt.subplots()` e defina o título "Receita por categoria".',
              r`import matplotlib.pyplot as plt
receita = vendas.groupby("categoria")["valor"].sum()
fig, ax = plt.subplots()
ax.bar(receita.index, receita.values)
ax.set_title("Receita por categoria")`,
              r`assert ax.get_title() == "Receita por categoria"
assert len(ax.patches) == 4, "Esperava 4 barras (uma por categoria)"`,
              { setup: PY_VENDAS, packages: [...PD, 'matplotlib'], starter: 'import matplotlib.pyplot as plt\n' }),
            quiz('Qual gráfico é mais adequado para mostrar a evolução da receita ao longo dos meses?', ['Pizza', 'Linha', 'Dispersão', 'Boxplot'], 1),
            quiz('Para comparar a distribuição de valores entre categorias (mediana, quartis, outliers), use...', ['Gráfico de pizza', 'Boxplot', 'Gráfico de área', 'Tabela'], 1),
            quiz('Qual biblioteca você escolheria para um gráfico interativo com zoom e tooltip?', ['matplotlib', 'plotly', 'NumPy', 'BeautifulSoup'], 1),
            theory('Boas práticas de visualização', `
- **Comece pela pergunta**: comparação → barras; tendência → linha; distribuição → histograma/boxplot; relação → dispersão; composição → barras empilhadas (evite pizza com muitas fatias)
- **Eixo Y começando em zero** em gráficos de barras
- **Menos é mais**: remova bordas, grades e cores desnecessárias (*data-ink ratio*)
- **Título que conta a conclusão**: "Eletrônicos geram 65% da receita" > "Receita por categoria"
- **Cores com propósito** e acessíveis (paletas amigáveis a daltônicos)

~~~python
import seaborn as sns
sns.boxplot(data=df, x="categoria", y="valor")
sns.histplot(df["valor"], bins=20, kde=True)
sns.scatterplot(data=df, x="preco", y="quantidade", hue="categoria")
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="RdBu", center=0)

import plotly.express as px
px.line(df_mes, x="mes", y="receita", title="Receita mensal").show()
~~~
`),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 8
    {
      id: 'py-u8', title: 'Extração de dados', description: 'Arquivos, JSON, APIs, web scraping e bancos de dados',
      lessons: [
        {
          id: 'py-8-1', title: 'Arquivos e JSON',
          steps: [
            theory('Lendo e gravando formatos', `
| formato | leitura | escrita | observação |
|---|---|---|---|
| CSV | \`pd.read_csv\` | \`to_csv\` | universal, sem tipos |
| Excel | \`pd.read_excel\` (openpyxl) | \`to_excel\` | \`sheet_name=\` |
| JSON | \`pd.read_json\`, \`json.load\` | \`to_json\` | dados aninhados |
| Parquet | \`pd.read_parquet\` (pyarrow) | \`to_parquet\` | colunar, comprimido, **padrão em data lakes** |
| SQL | \`pd.read_sql\` | \`to_sql\` | via SQLAlchemy |

Parâmetros úteis do \`read_csv\`: \`sep\`, \`encoding="latin-1"\`, \`decimal=","\`, \`usecols\`, \`dtype\`, \`parse_dates\`, \`chunksize\` (arquivos gigantes).

**JSON aninhado** → tabela com \`pd.json_normalize\`:

~~~python
import json
dados = json.loads(texto)
df = pd.json_normalize(dados, record_path="itens", meta=["id", ["cliente", "nome"]])
~~~
`),
            py('A string `texto` contém um JSON com uma lista de pedidos. Use `json.loads` e `pd.json_normalize` para criar `df`; a coluna `cliente.nome` deve existir.',
              r`import json
dados = json.loads(texto)
df = pd.json_normalize(dados)`,
              r`assert len(df) == 2
assert "cliente.nome" in df.columns
assert df["cliente.nome"].tolist() == ["Ana", "Bruno"]`,
              { setup: r`import pandas as pd
texto = '[{"id": 1, "valor": 100, "cliente": {"nome": "Ana", "uf": "SP"}}, {"id": 2, "valor": 250, "cliente": {"nome": "Bruno", "uf": "RJ"}}]'`, packages: PD, starter: 'import json\n' }),
            py('Leia o CSV em `texto` que usa **ponto e vírgula** como separador e **vírgula** como decimal. Guarde em `df` e crie `total` com a soma de `valor`.',
              r`import io
df = pd.read_csv(io.StringIO(texto), sep=";", decimal=",")
total = df["valor"].sum()`,
              r`assert abs(total - 1389.8) < 1e-6`,
              { setup: r`import pandas as pd
texto = "produto;valor\nCadeira;1290,00\nMouse;89,90\nCabo;9,90"`, packages: PD }),
            quiz('Por que o formato Parquet é preferido em data lakes?', ['É legível no bloco de notas', 'É colunar, comprimido, guarda tipos e permite ler só as colunas necessárias', 'É o único que o pandas lê', 'Não suporta nulos'], 1),
          ],
        },
        {
          id: 'py-8-2', title: 'APIs com requests',
          steps: [
            theory('Consumindo APIs REST', `
APIs devolvem dados (geralmente JSON) via HTTP:

~~~python
import requests

resp = requests.get(
    "https://api.exemplo.com/v1/pedidos",
    params={"data_inicio": "2024-01-01", "page": 1},
    headers={"Authorization": f"Bearer {TOKEN}"},   # nunca deixe o token no código!
    timeout=30,
)
resp.raise_for_status()        # erro se status 4xx/5xx
dados = resp.json()
df = pd.json_normalize(dados["results"])
~~~

**Boas práticas:**
- **paginação**: repita enquanto houver \`next\`
- **rate limit**: respeite limites (\`time.sleep\`, status 429) e use *retry com backoff*
- guarde segredos em **variáveis de ambiente** (\`os.environ["TOKEN"]\`)
- **httpx** e **aiohttp** permitem requisições assíncronas
- APIs públicas BR para praticar: IBGE, Banco Central (SGS), Portal da Transparência, BrasilAPI
`),
            py('Simulamos uma API paginada com a função `get_page(n)`, que devolve um dict com `"results"` (lista) e `"next"` (número da próxima página ou None). Colete **todas** as páginas, começando da página 1, em uma lista `todos`.',
              r`todos = []
pagina = 1
while pagina is not None:
    resp = get_page(pagina)
    todos.extend(resp["results"])
    pagina = resp["next"]`,
              r`assert len(todos) == 7, f"esperava 7 registros, veio {len(todos)}"
assert todos[0]["id"] == 1 and todos[-1]["id"] == 7`,
              { setup: r`_paginas = {1: {"results": [{"id": 1}, {"id": 2}, {"id": 3}], "next": 2}, 2: {"results": [{"id": 4}, {"id": 5}, {"id": 6}], "next": 3}, 3: {"results": [{"id": 7}], "next": None}}
def get_page(n):
    return _paginas[n]`, starter: 'todos = []\npagina = 1\n' }),
            quiz('A API respondeu com status **429**. O que isso significa?', ['Sucesso', 'Não encontrado', 'Muitas requisições (rate limit) — espere e tente de novo', 'Erro interno do servidor'], 2),
            quiz('Onde guardar o token de uma API?', ['No código, numa variável', 'Num commit no GitHub', 'Em variáveis de ambiente / cofre de segredos', 'No nome do arquivo'], 2),
            py('Escreva `com_retry(func, tentativas=3)` que chama `func()` e, se ela levantar exceção, tenta de novo até `tentativas` vezes; se todas falharem, relança a última exceção.',
              r`def com_retry(func, tentativas=3):
    ultimo = None
    for _ in range(tentativas):
        try:
            return func()
        except Exception as e:
            ultimo = e
    raise ultimo`,
              r`chamadas = {"n": 0}
def instavel():
    chamadas["n"] += 1
    if chamadas["n"] < 3:
        raise ConnectionError("falhou")
    return "ok"
assert com_retry(instavel) == "ok"
assert chamadas["n"] == 3
def sempre_falha():
    raise ValueError("x")
try:
    com_retry(sempre_falha, 2)
    assert False, "deveria ter relançado a exceção"
except ValueError:
    pass`,
              { starter: 'def com_retry(func, tentativas=3):\n    ' }),
          ],
        },
        {
          id: 'py-8-3', title: 'Web scraping com BeautifulSoup',
          steps: [
            theory('Extraindo dados de páginas HTML', `
~~~python
import requests
from bs4 import BeautifulSoup

html = requests.get(url, headers={"User-Agent": "meu-bot"}, timeout=30).text
soup = BeautifulSoup(html, "html.parser")

soup.find("h1").get_text(strip=True)
for card in soup.select("div.produto"):          # seletores CSS
    nome = card.select_one(".nome").text
    preco = card.select_one(".preco")["data-valor"]   # atributo

pd.read_html(html)   # extrai TODAS as <table> da página para DataFrames
~~~

- Páginas renderizadas com JavaScript exigem **Selenium** ou **Playwright**
- Para crawlers grandes: **Scrapy**
- **Ética e legalidade**: respeite o \`robots.txt\`, os termos de uso, a LGPD e não sobrecarregue o site. Se houver API, prefira a API!
`),
            py('Use BeautifulSoup para extrair do `html` a lista `produtos` de tuplas `(nome, preco_float)` de cada `div.produto` (o preço está no atributo `data-preco`).',
              r`from bs4 import BeautifulSoup
soup = BeautifulSoup(html, "html.parser")
produtos = []
for card in soup.select("div.produto"):
    nome = card.select_one(".nome").get_text(strip=True)
    preco = float(card["data-preco"])
    produtos.append((nome, preco))`,
              r`assert produtos == [("Mouse", 89.9), ("Teclado", 349.9), ("Monitor", 1899.0)]`,
              { setup: r`html = """
<html><body>
  <h1>Ofertas</h1>
  <div class="produto" data-preco="89.90"><span class="nome"> Mouse </span></div>
  <div class="produto" data-preco="349.90"><span class="nome">Teclado</span></div>
  <div class="produto" data-preco="1899.00"><span class="nome">Monitor</span></div>
  <div class="banner">Frete grátis!</div>
</body></html>
"""`, packages: ['beautifulsoup4'], starter: 'from bs4 import BeautifulSoup\n' }),
            quiz('O site carrega os preços via JavaScript depois que a página abre. `requests` + BeautifulSoup não encontram os dados. O que usar?', ['pandas', 'Selenium ou Playwright (navegador real) — ou descobrir a API que o site chama', 'NumPy', 'Trocar o parser'], 1),
            quiz('Antes de fazer scraping de um site, você deve...', ['Ignorar o robots.txt', 'Verificar termos de uso/robots.txt e preferir uma API oficial se existir', 'Fazer o máximo de requisições por segundo', 'Usar o token de outra pessoa'], 1),
          ],
        },
        {
          id: 'py-8-4', title: 'Python + SQL',
          steps: [
            theory('Conectando Python a bancos de dados', `
~~~python
# SQLite (vem com o Python)
import sqlite3
con = sqlite3.connect("loja.db")
df = pd.read_sql("SELECT * FROM pedidos WHERE status = ?", con, params=("entregue",))

# PostgreSQL / MySQL / SQL Server via SQLAlchemy
from sqlalchemy import create_engine, text
engine = create_engine("postgresql+psycopg2://usuario:senha@host:5432/banco")
with engine.connect() as conn:
    df = pd.read_sql(text("SELECT * FROM vendas WHERE data >= :d"), conn, params={"d": "2024-01-01"})
df.to_sql("vendas_tratadas", engine, if_exists="replace", index=False)
~~~

- **Sempre use parâmetros** (\`?\`, \`:nome\`) — nunca concatene strings → evita **SQL injection**
- Drivers: \`psycopg2\`/\`psycopg\` (Postgres), \`pymysql\`, \`pyodbc\` (SQL Server), \`google-cloud-bigquery\`, \`snowflake-connector-python\`
- **DuckDB**: SQL analítico super rápido direto em CSV/Parquet/DataFrames: \`duckdb.sql("SELECT * FROM df").df()\`
`),
            py('Usando `sqlite3` e `pd.read_sql`, consulte o banco em memória `con` e crie `resumo` com o total de `valor` por `status` (colunas `status` e `total`), ordenado por status.',
              r`resumo = pd.read_sql("SELECT status, SUM(valor) AS total FROM pedidos GROUP BY status ORDER BY status", con)`,
              r`assert list(resumo.columns) == ["status", "total"]
assert resumo["status"].tolist() == ["cancelado", "entregue"]
assert abs(resumo["total"].iloc[1] - 430) < 1e-9`,
              { setup: r`import sqlite3
import pandas as pd
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE pedidos (id INTEGER, status TEXT, valor REAL)")
con.executemany("INSERT INTO pedidos VALUES (?, ?, ?)", [(1, "entregue", 100), (2, "cancelado", 50), (3, "entregue", 330)])`, packages: PD }),
            quiz('Qual código está protegido contra SQL injection?', [
              'cur.execute(f"SELECT * FROM users WHERE nome = \'{nome}\'")',
              'cur.execute("SELECT * FROM users WHERE nome = ?", (nome,))',
              'cur.execute("SELECT * FROM users WHERE nome = " + nome)',
              'Todos'], 1),
            py('Grave o DataFrame `df` no banco `con` como a tabela `metas` (sem o índice) usando `to_sql`, e depois crie `n` com o resultado de `SELECT COUNT(*) FROM metas`.',
              r`df.to_sql("metas", con, index=False)
n = con.execute("SELECT COUNT(*) FROM metas").fetchone()[0]`,
              r`assert n == 3
assert [r[1] for r in con.execute("PRAGMA table_info(metas)")] == ["mes", "meta"]`,
              { setup: r`import sqlite3
import pandas as pd
con = sqlite3.connect(":memory:")
df = pd.DataFrame({"mes": ["jan", "fev", "mar"], "meta": [1000, 1200, 1500]})`, packages: PD }),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 9
    {
      id: 'py-u9', title: 'Estatística e próximos passos', description: 'Estatística descritiva, correlação e o ecossistema avançado',
      lessons: [
        {
          id: 'py-9-1', title: 'Estatística descritiva e correlação',
          steps: [
            theory('Resumindo dados com números', `
- **Tendência central**: média (sensível a outliers), mediana, moda
- **Dispersão**: desvio padrão, variância, amplitude, IQR
- **Forma**: assimetria (\`skew\`), curtose
- **Relação**: correlação de Pearson (linear, -1 a 1), Spearman (ranks)

~~~python
df["valor"].describe()
df["valor"].median(), df["valor"].std(), df["valor"].skew()
df[["preco", "vendas"]].corr()                 # Pearson
df[["preco", "vendas"]].corr(method="spearman")

from scipy import stats
stats.ttest_ind(grupo_a, grupo_b)              # teste A/B (t de Student)
stats.chi2_contingency(pd.crosstab(a, b))      # independência
~~~

> ⚠️ **Correlação não implica causalidade!**
`),
            py('Crie `corr` com a correlação de Pearson entre as colunas `investimento` e `vendas` de `df` (um número float).',
              r`corr = df["investimento"].corr(df["vendas"])`,
              r`assert abs(corr - df["investimento"].corr(df["vendas"])) < 1e-12
assert corr > 0.9`,
              { setup: r`import pandas as pd
df = pd.DataFrame({"investimento": [10, 20, 30, 40, 50, 60], "vendas": [110, 190, 320, 390, 520, 580]})`, packages: PD }),
            py('Crie `resumo`, um dicionário com as chaves `"media"`, `"mediana"` e `"desvio"` (desvio padrão amostral do pandas) da coluna `valor` de `vendas`, todos arredondados para 2 casas.',
              r`resumo = {
    "media": round(vendas["valor"].mean(), 2),
    "mediana": round(vendas["valor"].median(), 2),
    "desvio": round(vendas["valor"].std(), 2),
}`,
              r`assert resumo["mediana"] == round(vendas["valor"].median(), 2)
assert resumo["media"] == round(vendas["valor"].mean(), 2)
assert resumo["desvio"] == round(vendas["valor"].std(), 2)`,
              { setup: PY_VENDAS, packages: PD }),
            quiz('A média salarial de uma empresa é muito maior que a mediana. Isso indica...', ['Distribuição simétrica', 'Assimetria à direita (alguns salários muito altos)', 'Erro de cálculo', 'Correlação negativa'], 1),
            quiz('Sorvetes vendidos e afogamentos são correlacionados. Conclusão correta:', ['Sorvete causa afogamento', 'Há provavelmente uma variável de confusão (calor/verão)', 'Afogamento causa vendas de sorvete', 'A correlação é falsa'], 1),
          ],
        },
        {
          id: 'py-9-2', title: 'O ecossistema completo',
          steps: [
            theory('Mapa de bibliotecas de dados', `
| área | bibliotecas |
|---|---|
| Manipulação | **pandas**, **NumPy**, **Polars** (rápido, multi-thread), **DuckDB**, PyArrow |
| Visualização | matplotlib, seaborn, plotly, altair, bokeh |
| Estatística | **SciPy**, **statsmodels**, pingouin |
| Machine Learning | **scikit-learn**, XGBoost, LightGBM, CatBoost |
| Deep Learning | PyTorch, TensorFlow/Keras |
| Extração | requests, httpx, BeautifulSoup, Scrapy, Selenium, Playwright |
| Bancos | sqlite3, SQLAlchemy, psycopg, pyodbc, conectores BigQuery/Snowflake |
| Big Data | PySpark, Dask, Ray |
| Orquestração | Airflow, Prefect, Dagster |
| Transformação | **dbt** (SQL), Great Expectations / Pandera (qualidade) |
| Apps e relatórios | Streamlit, Dash, Jupyter, Quarto |
| Séries temporais | statsmodels, Prophet, sktime |
| Geo | GeoPandas, folium |
| Excel | openpyxl, xlsxwriter |
`),
            quiz('Você precisa processar um CSV de 20 GB num notebook com 16 GB de RAM. Qual opção é mais adequada?', ['pandas.read_csv direto', 'Polars (lazy/streaming) ou DuckDB', 'matplotlib', 'BeautifulSoup'], 1),
            quiz('Qual biblioteca é a escolha padrão para modelos clássicos de machine learning (regressão, árvores, clustering)?', ['scikit-learn', 'requests', 'seaborn', 'openpyxl'], 0),
            quiz('Qual ferramenta transforma dados com SQL versionado, testes e documentação dentro do data warehouse?', ['dbt', 'NumPy', 'Selenium', 'Prophet'], 0),
            quiz('Para orquestrar um pipeline diário (extrair API → tratar → carregar no warehouse), usa-se...', ['Airflow / Prefect / Dagster', 'seaborn', 'BeautifulSoup', 'statsmodels'], 0),
            order('Monte as etapas de um pipeline ETL na ordem certa:', ['Extrair', 'Transformar', 'Carregar'], ['Visualizar', 'Deletar']),
          ],
        },
      ],
    },
  ],
};

// ───────────────────────────── Níveis: 1 Básico · 2 Intermediário · 3 Avançado · 4 Especialista
{
  const LEVEL = {'py-u1': 1, 'py-u2': 1, 'py-u3': 2, 'py-u4': 2, 'py-u5': 2, 'py-u6': 3, 'py-u7': 3, 'py-u8': 3, 'py-u9': 3};
  PYTHON_COURSE.units = [...PYTHON_COURSE.units.map((u) => ({ ...u, level: LEVEL[u.id] })), { ...PY_EXPERT, level: 4 }];
}
