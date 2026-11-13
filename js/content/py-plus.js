// Conteúdo adicional da trilha de Python:
//  - examples: exemplos resolvidos (código executável + saída) antes dos exercícios
//  - lessons: lições novas para cobrir o currículo completo
import { theory, quiz, order, fill, py, exPy } from './helpers.js';
import { PY_VENDAS } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];
const NP = ['numpy'];
const IMP = 'import pandas as pd\nimport numpy as np';
const P = { setup: IMP, setupNote: '`pd` (pandas) e `np` (NumPy) já importados.', packages: PD };
const V = { setup: PY_VENDAS, setupNote: 'O DataFrame `vendas` (12 pedidos: pedido, data, cliente, estado, categoria, valor, status) e os módulos `pd` e `np` já estão carregados.', packages: PD };

// ───────────────────────────────────────────── EXEMPLOS RESOLVIDOS DAS LIÇÕES EXISTENTES
const examples = {
  'py-1-1': [
    exPy('Listas na prática: vendas da semana', `
Vamos guardar as vendas de 5 dias numa lista e responder perguntas simples. Cada \`print\` mostra um resultado na saída.
`, r`vendas = [120, 80, 300, 50, 210]

print("Primeiro dia:", vendas[0])
print("Último dia:", vendas[-1])
print("Do 2º ao 4º dia:", vendas[1:4])
print("Total:", sum(vendas))
print("Média:", sum(vendas) / len(vendas))
print("Maior venda:", max(vendas))

vendas.append(180)          # chegou mais um dia
print("Agora são", len(vendas), "dias")
print(f"Média com 2 casas: {sum(vendas) / len(vendas):.2f}")`, `
\`vendas[1:4]\` trouxe as posições 1, 2 e 3 (o fim é exclusivo). Depois do \`append\`, a lista cresceu para 6 itens. Na f-string, \`:.2f\` formatou a média com 2 casas decimais.
`),
    exPy('Tipos e conversões', `
Dados lidos de arquivos chegam como **texto**. Converter para número é o primeiro passo de qualquer conta.
`, r`preco_texto = "19.90"
quantidade_texto = "3"

print(type(preco_texto))              # str: é texto!
preco = float(preco_texto)            # texto → decimal
quantidade = int(quantidade_texto)    # texto → inteiro
total = preco * quantidade
print(type(total), total)
print("7 / 2 =", 7 / 2, "| 7 // 2 =", 7 // 2, "| 7 % 2 =", 7 % 2)
print(round(total, 1), str(quantidade) + " unidades")`, `
Somar \`"19.90" + "3"\` daria o texto "19.903"; depois de converter, a multiplicação funciona. \`/\` sempre dá float, \`//\` descarta a parte decimal e \`%\` é o resto.
`),
  ],
  'py-1-2': [
    exPy('Dicionário como registro e como contador', `
Um dicionário pode representar **um registro** (um cliente) ou **contar** ocorrências por chave.
`, r`cliente = {"nome": "Ana", "estado": "SP", "compras": 3}
print(cliente["nome"], "-", cliente["estado"])
print("email:", cliente.get("email", "não informado"))
cliente["compras"] += 1
print(cliente)

estados = ["SP", "RJ", "SP", "MG", "SP", "RJ"]
contagem = {}
for uf in estados:
    contagem[uf] = contagem.get(uf, 0) + 1
print(contagem)
print("Estados distintos:", set(estados), "→", len(set(estados)))`, `
O padrão \`contagem.get(uf, 0) + 1\` começa do zero na primeira vez que vê cada estado. O set removeu as repetições.
`),
  ],
  'py-1-3': [
    exPy('Função, laço e comprehension juntos', `
Uma função que classifica pedidos, aplicada a uma lista com laço e com comprehension:
`, r`def classificar(valor):
    if valor >= 1000:
        return "alto"
    elif valor >= 300:
        return "médio"
    return "baixo"

pedidos = [150, 1200, 450, 80, 3000]
for v in pedidos:
    print(v, "→", classificar(v))

rotulos = [classificar(v) for v in pedidos]
print(rotulos)
grandes = [v for v in pedidos if v >= 1000]
print("Pedidos grandes:", grandes)`, `
O laço imprime um por vez; a comprehension monta a lista inteira numa linha. Repare que 450 é "médio": a primeira condição (>= 1000) falhou e a segunda (>= 300) passou.
`),
  ],
  'py-2-1': [
    exPy('Lista × array NumPy', `
Com uma lista, multiplicar por 2 **repete** a lista. Com um array, multiplica **cada elemento**.
`, r`import numpy as np

lista = [10, 20, 30]
print("lista * 2 =", lista * 2)

a = np.array(lista)
print("array * 2 =", a * 2)
print("array + 100 =", a + 100)
print("soma:", a.sum(), "| média:", a.mean(), "| desvio:", round(a.std(), 2))

m = np.arange(1, 7).reshape(2, 3)
print(m)
print("shape:", m.shape, "| soma por coluna:", m.sum(axis=0), "| soma por linha:", m.sum(axis=1))`, `
\`reshape(2, 3)\` arrumou os números 1..6 em 2 linhas e 3 colunas. A soma por coluna tem 3 valores; por linha, 2.
`, { packages: NP }),
  ],
  'py-2-2': [
    exPy('Filtrando com máscara', `
A comparação gera um array de True/False (a máscara); usá-la como índice filtra.
`, r`import numpy as np
v = np.array([120, 80, 300, 50, 900, 410])

mascara = v > 100
print(mascara)
print("maiores que 100:", v[mascara])
print("entre 100 e 500:", v[(v >= 100) & (v <= 500)])
print("quantos > 100:", mascara.sum(), "| proporção:", mascara.mean())
print(np.where(v > 300, "alto", "normal"))`, `
\`mascara.sum()\` conta os True (4); \`mascara.mean()\` dá a proporção (4/6).
`, { packages: NP }),
  ],
  'py-3-1': [
    exPy('Primeiro contato com um DataFrame', `
Sempre que receber dados novos, faça estas perguntas: quantas linhas? quais colunas e tipos? como são as primeiras linhas? quais os valores mais comuns?
`, r`print(vendas.shape)
print(vendas.dtypes)
print(vendas.head(3))
print(vendas["estado"].value_counts())
print("estados distintos:", vendas["estado"].nunique())
print("estado mais frequente:", vendas["estado"].value_counts().idxmax())
print(vendas["valor"].describe().round(1))`, `
12 linhas e 7 colunas. \`value_counts\` mostra SP como o estado mais frequente, e \`describe\` resume a coluna valor (contagem, média, desvio, quartis).
`, V),
  ],
  'py-3-2': [
    exPy('Três jeitos de filtrar', `
Os três filtros abaixo pedem a mesma coisa: vendas de SP acima de 1000.
`, r`f1 = vendas[(vendas["estado"] == "SP") & (vendas["valor"] > 1000)]
f2 = vendas.loc[(vendas["estado"] == "SP") & (vendas["valor"] > 1000), ["cliente", "valor"]]
f3 = vendas.query("estado == 'SP' and valor > 1000")
print(f1[["cliente", "valor"]])
print(f2)
print(len(f1) == len(f2) == len(f3))
print(vendas[vendas["estado"].isin(["RJ", "MG"])][["cliente", "estado"]])`, `
\`loc\` permitiu filtrar e escolher colunas de uma vez; \`query\` é a forma mais legível; \`isin\` é o IN do SQL.
`, V),
  ],
  'py-3-3': [
    exPy('Colunas novas, faixas e ordenação', `
`, r`df = vendas.copy()
df["liquido"] = df["valor"] * 0.85
df["faixa"] = pd.cut(df["valor"], bins=[0, 500, 2000, np.inf], labels=["baixo", "médio", "alto"])
df["regiao"] = df["estado"].map({"SP": "Sudeste", "RJ": "Sudeste", "MG": "Sudeste", "PR": "Sul", "RS": "Sul", "PE": "Nordeste"})
print(df.sort_values("valor", ascending=False)[["cliente", "valor", "liquido", "faixa", "regiao"]].head(5))
print(df["faixa"].value_counts())`, `
\`pd.cut\` colocou cada valor numa faixa; \`map\` traduziu estados em regiões. \`copy()\` evita alterar o DataFrame original.
`, V),
  ],
  'py-4-1': [
    exPy('groupby: agg e transform lado a lado', `
\`agg\` resume (uma linha por grupo); \`transform\` devolve um valor por linha original.
`, r`resumo = vendas.groupby("categoria").agg(
    receita=("valor", "sum"),
    pedidos=("pedido", "count"),
    ticket=("valor", "mean"),
).round(1).sort_values("receita", ascending=False)
print(resumo)

df = vendas[["cliente", "categoria", "valor"]].copy()
df["total_categoria"] = df.groupby("categoria")["valor"].transform("sum")
df["pct"] = (df["valor"] / df["total_categoria"] * 100).round(1)
print(df.head(6))`, `
O resumo tem 4 linhas (uma por categoria); o \`df\` continua com 12 linhas, cada uma com o total da sua categoria ao lado.
`, V),
  ],
  'py-4-2': [
    exPy('merge e concat', `
Juntamos uma tabela de metas por estado às vendas e empilhamos dois meses.
`, r`metas = pd.DataFrame({"estado": ["SP", "RJ", "MG"], "meta": [10000, 6000, 2000]})
real = vendas.groupby("estado", as_index=False)["valor"].sum()

inner = real.merge(metas, on="estado", how="inner")
left = real.merge(metas, on="estado", how="left", indicator=True)
print(inner)
print(left)

jan = vendas[vendas["data"].str.startswith("2024-01")]
fev = vendas[vendas["data"].str.startswith("2024-02")]
print(pd.concat([jan, fev], ignore_index=True)[["pedido", "data"]])`, `
No inner, só os 3 estados com meta. No left, todos os estados das vendas; quem não tem meta fica com NaN e \`_merge = left_only\`.
`, V),
  ],
  'py-4-3': [
    exPy('Do longo para o largo e de volta', `
`, r`largo = vendas.pivot_table(index="estado", columns="status", values="valor", aggfunc="sum", fill_value=0)
print(largo)
longo = largo.reset_index().melt(id_vars="estado", var_name="status", value_name="valor")
print(longo.head(6))
print(pd.crosstab(vendas["categoria"], vendas["status"]))`, `
O pivot colocou os status como colunas; o melt desfez isso; o crosstab contou as combinações categoria × status.
`, V),
  ],
  'py-5-1': [
    exPy('Diagnóstico e tratamento de nulos', `
`, r`df = pd.DataFrame({
    "cliente": ["Ana", "Bruno", "Carla", "Bruno", "Diego"],
    "idade": [34, None, 29, None, 81],
    "cidade": ["SP", "RJ", None, "RJ", "BH"],
})
print(df.isna().sum())
print("média:", df["idade"].mean(), "| mediana:", df["idade"].median())
df["idade_faltante"] = df["idade"].isna()
df["idade"] = df["idade"].fillna(df["idade"].median())
df["cidade"] = df["cidade"].fillna("Desconhecida")
print(df)
print("duplicados:", df.duplicated(subset=["cliente"]).sum())
print(df.drop_duplicates(subset=["cliente"]))`, `
A média (48) foi puxada pelo 81; a mediana (34) representa melhor. A coluna \`idade_faltante\` guarda o registro de quem foi imputado.
`, P),
  ],
  'py-5-2': [
    exPy('Limpando textos e números brasileiros', `
`, r`df = pd.DataFrame({
    "nome": ["  ana souza", "BRUNO lima ", "carla DIAS"],
    "preco": ["R$ 1.299,90", "R$ 89,90", "R$ 15.000,00"],
    "email": ["Ana@Mail.com", "bruno@empresa.com.br", "carla@mail.com"],
})
df["nome"] = df["nome"].str.strip().str.title()
df["preco"] = (df["preco"].str.replace("R$", "", regex=False)
                          .str.replace(".", "", regex=False)
                          .str.replace(",", ".", regex=False)
                          .str.strip().astype(float))
df["dominio"] = df["email"].str.lower().str.split("@").str[1]
print(df)
print(df.dtypes)`, `
Os nomes ficaram padronizados, o preço virou float (1299.9, 89.9, 15000.0) e o domínio foi extraído.
`, P),
  ],
  'py-6-1': [
    exPy('Datas: extrair, reamostrar e comparar', `
`, r`df = vendas.copy()
df["data"] = pd.to_datetime(df["data"])
df["mes"] = df["data"].dt.month
df["dia_semana"] = df["data"].dt.day_name()
print(df[["data", "mes", "dia_semana"]].head(3))

mensal = df.set_index("data")["valor"].resample("MS").sum()
print(pd.DataFrame({
    "receita": mensal,
    "anterior": mensal.shift(1),
    "variacao_%": (mensal.pct_change() * 100).round(1),
    "acumulado": mensal.cumsum(),
}))`, `
\`shift(1)\` trouxe o mês anterior para a mesma linha; \`pct_change\` calculou a variação; \`cumsum\` acumulou.
`, V),
  ],
  'py-7-1': [
    exPy('Montando um gráfico passo a passo', `
O gráfico é desenhado em memória; a saída mostra os elementos criados.
`, r`import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

receita = vendas.groupby("categoria")["valor"].sum().sort_values()
fig, ax = plt.subplots(figsize=(6, 3))
ax.barh(receita.index, receita.values, color="#2563eb")
ax.set_title("Eletrônicos concentram a receita")
ax.set_xlabel("Receita (R$)")
for lado in ["top", "right"]:
    ax.spines[lado].set_visible(False)
fig.tight_layout()
print("barras:", len(ax.patches), "| título:", ax.get_title())`, `
Barras horizontais ordenadas facilitam comparar categorias; o título conta a conclusão; as bordas extras foram removidas.
`, { setup: PY_VENDAS, packages: [...PD, 'matplotlib'] }),
  ],
  'py-8-1': [
    exPy('JSON aninhado vira tabela', `
`, r`import json
texto = '[{"id": 1, "cliente": {"nome": "Ana", "uf": "SP"}, "valor": 120.5}, {"id": 2, "cliente": {"nome": "Bruno", "uf": "RJ"}, "valor": 80}]'
dados = json.loads(texto)
print(type(dados), type(dados[0]))
df = pd.json_normalize(dados)
print(df)

import io
csv_br = "produto;valor\nMouse;89,90\nTeclado;349,90"
print(pd.read_csv(io.StringIO(csv_br), sep=";", decimal=","))`, `
\`json_normalize\` achatou \`cliente\` em \`cliente.nome\` e \`cliente.uf\`. O CSV brasileiro precisou de \`sep\` e \`decimal\`.
`, P),
  ],
  'py-8-2': [
    exPy('Paginação com while (API simulada)', `
A função abaixo simula uma API que devolve 2 itens por página.
`, r`BANCO = list(range(1, 8))

def get_page(n):
    inicio = (n - 1) * 2
    itens = BANCO[inicio:inicio + 2]
    proxima = n + 1 if inicio + 2 < len(BANCO) else None
    return {"results": itens, "next": proxima}

todos, pagina = [], 1
while pagina is not None:
    resp = get_page(pagina)
    print("página", pagina, "→", resp)
    todos.extend(resp["results"])
    pagina = resp["next"]
print("total coletado:", todos)`, `
O laço parou quando \`next\` veio \`None\`, depois de 4 páginas.
`),
  ],
  'py-8-3': [
    exPy('Extraindo dados de HTML', `
`, r`from bs4 import BeautifulSoup
html = """
<div class="produto" data-preco="89.9"><span class="nome">Mouse</span></div>
<div class="produto" data-preco="349.9"><span class="nome">Teclado</span></div>
"""
soup = BeautifulSoup(html, "html.parser")
for card in soup.select("div.produto"):
    nome = card.select_one(".nome").get_text(strip=True)
    preco = float(card["data-preco"])
    print(nome, preco)`, `
\`select\` achou os dois cards; \`select_one\` pegou o nome dentro de cada um; o preço veio do atributo e foi convertido para float.
`, { packages: ['beautifulsoup4'] }),
  ],
  'py-8-4': [
    exPy('SQL dentro do Python', `
`, r`import sqlite3
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE pedidos (id INTEGER, uf TEXT, valor REAL)")
con.executemany("INSERT INTO pedidos VALUES (?, ?, ?)", [(1, "SP", 100), (2, "RJ", 50), (3, "SP", 70)])

print(con.execute("SELECT COUNT(*) FROM pedidos").fetchone())
print(con.execute("SELECT uf, SUM(valor) FROM pedidos GROUP BY uf").fetchall())
uf = "SP"
print(pd.read_sql("SELECT * FROM pedidos WHERE uf = ?", con, params=(uf,)))`, `
\`fetchone()\` devolveu a tupla \`(3,)\`; \`fetchall()\`, uma lista de tuplas; \`read_sql\` com parâmetro \`?\` devolveu um DataFrame com segurança contra SQL injection.
`, { ...P, packages: [...PD, 'sqlite3'] }),
  ],
  'py-9-1': [
    exPy('Média, mediana e correlação', `
`, r`salarios = pd.Series([3000, 3200, 3500, 3600, 4000, 25000])
print("média:", round(salarios.mean()), "| mediana:", salarios.median(), "| assimetria:", round(salarios.skew(), 2))

df = pd.DataFrame({"investimento": [1, 2, 3, 4, 5, 6], "vendas": [12, 15, 21, 24, 30, 33]})
print("Pearson:", round(df["investimento"].corr(df["vendas"]), 3))`, `
Um salário de 25.000 puxou a média para ~7.000, enquanto a mediana ficou em 3.550: assimetria positiva. A correlação perto de 1 indica relação linear forte (o que não prova causa).
`, P),
  ],
  'py-10-1': [
    exPy('Laço × vetorização: medindo', `
`, r`import time
n = 200_000
df = pd.DataFrame({"preco": np.random.default_rng(0).uniform(1, 100, n), "qtd": np.random.default_rng(1).integers(1, 5, n)})

t0 = time.perf_counter()
total_laco = [p * q for p, q in zip(df["preco"], df["qtd"])]
t1 = time.perf_counter()
total_vet = df["preco"] * df["qtd"]
t2 = time.perf_counter()
print(f"laço: {t1 - t0:.4f}s | vetorizado: {t2 - t1:.4f}s")
print("mesmo resultado:", np.allclose(total_laco, total_vet))`, `
A versão vetorizada costuma ser dezenas de vezes mais rápida, com o mesmo resultado.
`, P),
  ],
  'py-10-2': [
    exPy('Gerador em ação', `
`, r`def em_lotes(itens, n):
    lote = []
    for item in itens:
        lote.append(item)
        if len(lote) == n:
            yield lote
            lote = []
    if lote:
        yield lote

for lote in em_lotes(range(1, 11), 4):
    print(lote, "soma parcial:", sum(lote))`, `
Três lotes: [1..4], [5..8] e o resto [9, 10]. Só um lote existe na memória por vez.
`),
  ],
  'py-10-3': [
    exPy('Dataclass e validação', `
`, r`from dataclasses import dataclass, field

@dataclass
class Pedido:
    id: int
    itens: list = field(default_factory=list)
    desconto: float = 0.0

    @property
    def total(self):
        return round(sum(p * q for p, q in self.itens) * (1 - self.desconto), 2)

p = Pedido(1, [(10.0, 2), (5.5, 4)], desconto=0.1)
print(p)
print("total:", p.total)

def validar_desconto(d):
    if not 0 <= d < 1:
        raise ValueError(f"desconto inválido: {d}")
    return d

try:
    validar_desconto(1.5)
except ValueError as e:
    print("Erro capturado:", e)`, `
A dataclass gerou o construtor e a representação; \`total\` é calculado na hora. A validação levantou um erro claro, capturado pelo try/except.
`),
  ],
};

// ───────────────────────────────────────────── LIÇÕES NOVAS

const L_INTRO = {
  id: 'py-0-1', title: 'Como um programa Python funciona',
  steps: [
    theory('O que é programar', `
Um **programa** é uma lista de instruções que o computador executa **em ordem, de cima para baixo**. Python é uma **linguagem interpretada**: o interpretador lê cada linha e executa na hora, sem uma etapa separada de compilação. Por isso é tão usado em análise de dados: você escreve uma linha, vê o resultado e continua.

Onde se escreve Python para dados:

| ambiente | para quê |
|---|---|
| **Jupyter Notebook / JupyterLab** | análise exploratória em células, com tabelas e gráficos entre o código |
| **Google Colab** | Jupyter na nuvem, sem instalar nada |
| **VS Code / PyCharm** | projetos, scripts e pipelines |
| **Terminal** (\`python script.py\`) | rodar scripts agendados |
| **Este app** | exercícios com Python rodando no próprio aparelho |

Em ciência de dados, o Python é a "cola": lê dados (CSV, Excel, bancos, APIs), transforma com **pandas**, calcula com **NumPy**, testa hipóteses com **SciPy/statsmodels**, desenha com **matplotlib/seaborn** e modela com **scikit-learn**.
`),
    theory('print, comentários e variáveis', `
**print** mostra valores na tela:

~~~python
print("Olá, dados!")
print("Total:", 10 + 5)       # vários valores separados por vírgula
~~~

**Comentários** começam com \`#\` e são ignorados pelo Python. Servem para explicar o **porquê** do código.

**Variáveis** são nomes que guardam valores. O sinal \`=\` significa "guarde à direita no nome à esquerda" (não é igualdade matemática):

~~~python
receita = 1500
custo = 900
lucro = receita - custo      # 600
lucro = lucro * 0.9           # agora 540: o nome passa a apontar para o novo valor
~~~

**Regras de nomes:** letras, números e _, sem começar com número, sem espaço nem acento é a convenção. Use **snake_case** e nomes que explicam o conteúdo (\`ticket_medio\`, não \`tm\`). Python diferencia maiúsculas: \`Total\` e \`total\` são variáveis diferentes.
`),
    theory('Tipos básicos', `
Todo valor tem um **tipo**, que define o que dá para fazer com ele:

| tipo | exemplo | uso |
|---|---|---|
| \`int\` | \`42\`, \`-3\` | contagens, ids |
| \`float\` | \`19.9\`, \`0.05\` | valores com casas decimais (o separador é **ponto**) |
| \`str\` | \`"Ana"\`, \`'SP'\` | textos, entre aspas simples ou duplas |
| \`bool\` | \`True\`, \`False\` | resultado de comparações |
| \`NoneType\` | \`None\` | ausência de valor |

\`type(x)\` mostra o tipo. Conversões: \`int("3")\`, \`float("19.9")\`, \`str(42)\`, \`bool(0)\` (False).

**Comparações** devolvem bool: \`==\` (igual), \`!=\` (diferente), \`<\`, \`<=\`, \`>\`, \`>=\`. **Operadores lógicos:** \`and\`, \`or\`, \`not\`.

~~~python
idade = 20
print(idade >= 18 and idade < 65)   # True
~~~
`),
    theory('Erros: como ler e corrigir', `
Errar é normal; o importante é **ler a mensagem**. A última linha diz o tipo e o motivo:

| erro | causa comum | exemplo |
|---|---|---|
| \`SyntaxError\` | escrita inválida: parêntese, aspas ou dois-pontos faltando | \`print("oi"\` |
| \`NameError\` | nome não existe (erro de digitação ou variável não criada) | \`pirnt(1)\` |
| \`TypeError\` | operação com tipos incompatíveis | \`"3" + 2\` |
| \`ValueError\` | tipo certo, valor inválido | \`int("abc")\` |
| \`IndentationError\` | recuo errado | bloco do if sem 4 espaços |
| \`IndexError\` / \`KeyError\` | posição ou chave inexistente | \`[1, 2][5]\` |
| \`ZeroDivisionError\` | divisão por zero | \`1 / 0\` |

**Indentação** (os 4 espaços no começo da linha) não é enfeite em Python: ela define quais linhas pertencem a um bloco (if, for, def). Linhas do mesmo bloco precisam ter o mesmo recuo.
`),
    exPy('Seu primeiro programa', `
Leia o programa de cima para baixo antes de olhar a saída. Depois altere os números e execute de novo.
`, r`# Calcula o lucro e a margem de uma loja
receita = 1500.0
custo = 900.0
lucro = receita - custo
margem = lucro / receita * 100

print("Lucro:", lucro)
print("Margem (%):", margem)
print("Teve lucro?", lucro > 0)
print("Tipo da margem:", type(margem))`, `
O programa executou linha por linha. \`lucro > 0\` virou \`True\` (um bool), e a margem é um \`float\` (40.0).
`),
    py('Crie as variáveis `preco = 25.0` e `quantidade = 4`, e uma variável `total` com o produto dos dois.',
      r`preco = 25.0
quantidade = 4
total = preco * quantidade`,
      r`assert preco == 25.0 and quantidade == 4, "Confira os valores de preco e quantidade"
assert total == 100.0, "total deve ser preco * quantidade"`),
    py('A variável `texto` tem o valor `"42"` (um texto). Crie `numero` com esse valor convertido para **inteiro** e `dobro` com o dobro de `numero`.',
      r`numero = int(texto)
dobro = numero * 2`,
      r`assert numero == 42 and isinstance(numero, int), "numero deve ser o inteiro 42"
assert dobro == 84`,
      { setup: 'texto = "42"', starter: '# texto já existe\n' }),
    quiz('Qual o tipo de `3.0`?', ['float', 'int', 'str', 'bool'], 0, 'Qualquer número com ponto decimal é float.'),
    quiz('O que acontece em `"3" + 2`?', ['TypeError: não dá para somar texto com número', 'Resultado 5', 'Resultado "32"', 'Resultado "5"'], 0),
    quiz('Qual a saída de `print(10 > 3 and 2 > 5)`?', ['False', 'True', '10', 'Erro'], 0, 'A primeira comparação é True, mas a segunda é False; com and, as duas precisam ser True.'),
    fill('Complete para mostrar o total na tela:', '___(total)', [['print']]),
  ],
};

const L_STR = {
  id: 'py-0-2', title: 'Textos (strings) em detalhe',
  steps: [
    theory('Strings são sequências de caracteres', `
Uma string é uma **sequência**: cada caractere tem uma posição, começando em 0, como nas listas.

~~~python
s = "Datum"
s[0]      # 'D'
s[-1]     # 'm'
s[1:4]    # 'atu'
len(s)    # 5
"tu" in s # True
~~~

Strings são **imutáveis**: métodos não alteram a original, devolvem uma nova. Por isso é preciso **reatribuir**: \`nome = nome.strip()\`.

**Métodos mais usados em dados:**

| método | exemplo | resultado |
|---|---|---|
| \`.strip()\` | \`"  Ana ".strip()\` | 'Ana' |
| \`.lower()\` / \`.upper()\` / \`.title()\` | \`"ana SOUZA".title()\` | 'Ana Souza' |
| \`.replace(a, b)\` | \`"1.299,90".replace(".", "")\` | '1299,90' |
| \`.split(sep)\` | \`"a;b;c".split(";")\` | ['a', 'b', 'c'] |
| \`sep.join(lista)\` | \`", ".join(["SP", "RJ"])\` | 'SP, RJ' |
| \`.startswith(x)\` / \`.endswith(x)\` | \`"2024-03".startswith("2024")\` | True |
| \`.find(x)\` | \`"ana@x.com".find("@")\` | 3 (−1 se não achar) |
| \`.count(x)\` | \`"banana".count("a")\` | 3 |
| \`.isdigit()\` | \`"123".isdigit()\` | True |
`),
    theory('f-strings e formatação de números', `
**f-strings** (com \`f\` antes das aspas) inserem valores entre chaves e permitem formatar:

| formato | exemplo | resultado |
|---|---|---|
| \`{x:.2f}\` | \`f"{3.14159:.2f}"\` | '3.14' |
| \`{x:,.2f}\` | \`f"{1234567.8:,.2f}"\` | '1,234,567.80' |
| \`{x:.1%}\` | \`f"{0.256:.1%}"\` | '25.6%' |
| \`{x:>8}\` | alinha à direita em 8 posições | '     Ana' |
| \`{x:05d}\` | completa com zeros | '00042' |

**Formato brasileiro:** o padrão do Python usa vírgula para milhar e ponto para decimal. Para "R$ 1.234,57", troque os separadores:

~~~python
valor = 1234.567
txt = f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
print("R$", txt)   # R$ 1.234,57
~~~

**Caracteres especiais:** \`\\n\` quebra linha, \`\\t\` tabulação. Strings com várias linhas usam três aspas \`"""..."""\`.
`),
    exPy('Limpando e montando textos', `
`, r`bruto = "   ana SOUZA ; ana@Mail.COM ; sp  "
partes = [p.strip() for p in bruto.split(";")]
print(partes)

nome = partes[0].title()
email = partes[1].lower()
uf = partes[2].upper()
usuario = email[:email.find("@")]
print(nome, "|", email, "|", uf, "| usuário:", usuario)

taxa = 0.0734
receita = 1234567.891
print(f"Conversão: {taxa:.1%} | Receita: {receita:,.2f}")
print(f"{nome:<12}|{uf:>4}|")`, `
\`split(";")\` separou os campos e a comprehension limpou os espaços de cada um. \`email[:email.find("@")]\` pegou tudo antes do @.
`),
    py('A variável `bruto` contém `"  Maria DA silva  "`. Crie `nome` com o texto sem espaços nas pontas e em Title Case, e `iniciais` com as **iniciais** de cada palavra em maiúsculas, juntas (ex.: "MDS").',
      r`nome = bruto.strip().title()
iniciais = "".join(p[0].upper() for p in nome.split())`,
      r`assert nome == "Maria Da Silva", f"nome ficou {nome!r}"
assert iniciais == "MDS"`,
      { setup: 'bruto = "  Maria DA silva  "', starter: '# bruto já existe\n' }),
    py('A variável `linha` contém `"2024-03-15;Notebook;5200.00"`. Separe pelo `;` e crie `data`, `produto` e `preco` (este como **float**).',
      r`data, produto, preco = linha.split(";")
preco = float(preco)`,
      r`assert data == "2024-03-15" and produto == "Notebook"
assert preco == 5200.0 and isinstance(preco, float)`,
      { setup: 'linha = "2024-03-15;Notebook;5200.00"', starter: '# linha já existe\n' }),
    py('Crie `texto` com a taxa `taxa` formatada como percentual com **1 casa** (ex.: "7.3%"), usando f-string.',
      r`texto = f"{taxa:.1%}"`,
      r`assert texto == "7.3%", f"texto ficou {texto!r}"`,
      { setup: 'taxa = 0.0734', starter: '# taxa já existe\n' }),
    quiz('Qual o resultado de `"dados".upper()[1:3]`?', ['"AD"', '"DA"', '"ado"', '"ADO"'], 0, 'Primeiro vira "DADOS"; depois as posições 1 e 2: "AD".'),
    quiz('Depois de `s = " oi "; s.strip()`, quanto vale `s`?', ['" oi " (strings são imutáveis; o resultado não foi guardado)', '"oi"', 'None', 'Erro'], 0),
  ],
};

const L_FUNC = {
  id: 'py-1-4', title: 'Funções em detalhe e módulos',
  steps: [
    theory('Parâmetros, valores padrão e retorno', `
Uma função **recebe parâmetros**, executa um bloco e **devolve** um resultado com \`return\`. Sem return, ela devolve \`None\`.

~~~python
def aplicar_desconto(preco, taxa=0.1):
    """Devolve o preço com desconto (taxa padrão: 10%)."""
    return round(preco * (1 - taxa), 2)

aplicar_desconto(100)               # 90.0 (usa o padrão)
aplicar_desconto(100, 0.25)         # 75.0 (posicional)
aplicar_desconto(100, taxa=0.25)    # 75.0 (nomeado: mais legível)
~~~

- **Parâmetros com padrão** vêm depois dos obrigatórios
- **Argumentos nomeados** podem vir em qualquer ordem
- A **docstring** (texto entre três aspas logo abaixo do def) documenta a função; \`help(função)\` a mostra

**Devolvendo vários valores:** \`return minimo, maximo\` devolve uma tupla, que pode ser desempacotada: \`lo, hi = faixa(lista)\`.

**Escopo:** variáveis criadas **dentro** da função só existem lá dentro. A função deve receber o que precisa por parâmetro e devolver o resultado, sem depender de variáveis de fora: assim ela é previsível e fácil de testar.
`),
    theory('*args, **kwargs, lambda e funções como valores', `
**\*args** recebe qualquer quantidade de argumentos posicionais numa tupla; **\*\*kwargs**, argumentos nomeados num dicionário:

~~~python
def soma_tudo(*numeros):
    return sum(numeros)
soma_tudo(1, 2, 3)          # 6

def relatorio(titulo, **filtros):
    return f"{titulo}: {filtros}"
relatorio("Vendas", uf="SP", ano=2024)   # "Vendas: {'uf': 'SP', 'ano': 2024}"
~~~

**Funções são valores:** podem ser passadas para outras funções. É assim que \`sorted\`, \`max\`, \`map\` e o \`apply\` do pandas funcionam:

~~~python
clientes = [("Ana", 300), ("Bruno", 1200), ("Carla", 450)]
sorted(clientes, key=lambda c: c[1], reverse=True)   # ordena pelo valor
max(clientes, key=lambda c: c[1])                    # ('Bruno', 1200)
~~~

\`lambda c: c[1]\` é uma função anônima de uma linha: recebe c e devolve c[1].
`),
    theory('Módulos e a biblioteca padrão', `
**Módulos** são arquivos de código reutilizável. \`import\` os carrega:

~~~python
import math                      # importa o módulo inteiro
math.sqrt(16)                    # 4.0
from statistics import median    # importa só uma função
import numpy as np               # com apelido (convenção)
~~~

A **biblioteca padrão** já vem com o Python. As mais úteis em dados:

| módulo | para quê | exemplo |
|---|---|---|
| \`math\` | funções matemáticas | \`math.log\`, \`math.comb\` |
| \`statistics\` | estatística simples | \`statistics.mean\`, \`median\`, \`stdev\` |
| \`collections\` | contadores e estruturas | \`Counter(lista).most_common(3)\` |
| \`datetime\` | datas e horas | \`date(2024, 3, 15)\`, \`timedelta(days=7)\` |
| \`random\` | sorteios | \`random.choice\`, \`random.seed\` |
| \`json\`, \`csv\` | formatos de arquivo | \`json.loads\` |
| \`re\` | expressões regulares | \`re.findall\` |
| \`pathlib\`, \`os\` | arquivos e pastas | \`Path("dados").glob("*.csv")\` |

Pacotes de fora (pandas, numpy) são instalados com \`pip install nome\` (ou \`conda install\`), de preferência num **ambiente virtual** (\`python -m venv .venv\`) por projeto, para isolar as versões.
`),
    exPy('Funções e biblioteca padrão em ação', `
`, r`from collections import Counter
from datetime import date, timedelta
import statistics

def resumo(valores, casas=2):
    """Devolve média, mediana e desvio de uma lista."""
    return (round(statistics.mean(valores), casas),
            statistics.median(valores),
            round(statistics.stdev(valores), casas))

media, mediana, desvio = resumo([120, 80, 300, 50, 210])
print(media, mediana, desvio)

estados = ["SP", "RJ", "SP", "MG", "SP", "RJ"]
print(Counter(estados).most_common(2))

hoje = date(2024, 3, 15)
print("vence em:", hoje + timedelta(days=30), "| dia da semana:", hoje.strftime("%A"))

clientes = [("Ana", 300), ("Bruno", 1200), ("Carla", 450)]
print(sorted(clientes, key=lambda c: c[1], reverse=True))`, `
A função devolveu três valores de uma vez (uma tupla desempacotada). \`Counter\` contou os estados; \`timedelta\` somou 30 dias; o \`key=lambda\` ordenou pelo segundo elemento.
`),
    py('Escreva `variacao_pct(atual, anterior, casas=1)` que devolve a variação percentual `(atual − anterior) / anterior × 100` arredondada para `casas`, e devolve `None` se `anterior` for 0.',
      r`def variacao_pct(atual, anterior, casas=1):
    if anterior == 0:
        return None
    return round((atual - anterior) / anterior * 100, casas)`,
      r`assert variacao_pct(110, 100) == 10.0
assert variacao_pct(90, 120, casas=2) == -25.0
assert variacao_pct(5, 0) is None
assert variacao_pct(1, 3, 3) == -66.667`),
    py('Usando `Counter`, crie `top2` com os **2 produtos mais vendidos** da lista `vendidos` no formato `[(produto, quantidade), ...]`.',
      r`from collections import Counter
top2 = Counter(vendidos).most_common(2)`,
      r`assert top2 == [("mouse", 4), ("teclado", 3)], f"top2 = {top2}"`,
      { setup: 'vendidos = ["mouse", "teclado", "mouse", "monitor", "teclado", "mouse", "teclado", "mouse"]', starter: '# vendidos já existe\n' }),
    py('Ordene a lista de tuplas `clientes` (nome, gasto) do **maior para o menor gasto** e guarde em `ranking` (use `sorted` com `key=lambda`).',
      r`ranking = sorted(clientes, key=lambda c: c[1], reverse=True)`,
      r`assert ranking == [("Bruno", 1200), ("Carla", 450), ("Ana", 300)]`,
      { setup: 'clientes = [("Ana", 300), ("Bruno", 1200), ("Carla", 450)]', starter: '# clientes já existe\n' }),
    quiz('O que uma função sem `return` devolve?', ['None', '0', 'O último valor calculado', 'Erro'], 0),
    quiz('Em `def f(a, b=2, *args, **kwargs)`, o que `kwargs` recebe na chamada `f(1, x=5)`?', ['{"x": 5}', '(5,)', '5', 'Nada'], 0),
  ],
};

const L_ARQ = {
  id: 'py-1-5', title: 'Arquivos, exceções e expressões regulares',
  steps: [
    theory('Lendo e escrevendo arquivos', `
\`open(caminho, modo)\` abre um arquivo. O bloco **with** garante que ele seja **fechado** no fim, mesmo se der erro:

~~~python
with open("relatorio.txt", "w", encoding="utf-8") as f:   # "w" = escrever (sobrescreve)
    f.write("Total: 1500\n")

with open("relatorio.txt", encoding="utf-8") as f:        # padrão "r" = ler
    for linha in f:                                      # linha a linha (pouca memória)
        print(linha.strip())
~~~

| modo | significado |
|---|---|
| \`"r"\` | ler (padrão) |
| \`"w"\` | escrever, apagando o conteúdo anterior |
| \`"a"\` | acrescentar no fim |
| \`"rb"\` / \`"wb"\` | binário (imagens, Parquet) |

Sempre informe \`encoding="utf-8"\` (arquivos antigos do Windows podem precisar de \`"latin-1"\`).

O módulo **csv** lê CSV linha a linha sem pandas: \`csv.DictReader(f)\` devolve cada linha como dicionário. Para análise, \`pd.read_csv\` costuma ser mais prático.

**pathlib** monta caminhos que funcionam em qualquer sistema: \`Path("dados") / "vendas.csv"\`, \`Path("dados").glob("*.csv")\` lista arquivos.
`),
    theory('Exceções em detalhe', `
Em pipelines, um registro ruim não pode derrubar o processo inteiro. **try/except** captura o erro e decide o que fazer:

~~~python
valores = ["10", "abc", "7,5", ""]
ok, ruins = [], []
for v in valores:
    try:
        ok.append(float(v.replace(",", ".")))
    except ValueError:
        ruins.append(v)
# ok = [10.0, 7.5]   ruins = ['abc', '']
~~~

| bloco | quando roda |
|---|---|
| \`try\` | o código que pode falhar |
| \`except TipoDeErro as e\` | se esse erro acontecer (\`e\` tem a mensagem) |
| \`else\` | se **nenhum** erro aconteceu |
| \`finally\` | **sempre** (fechar conexões, registrar fim) |

Boas práticas: capture **erros específicos** (\`ValueError\`, \`KeyError\`), não um \`except:\` genérico que esconde bugs; registre o que foi descartado; use \`raise\` para sinalizar erros nas suas funções.
`),
    theory('Expressões regulares (regex)', `
Regex descreve **padrões de texto**: "um CEP", "um email", "todos os números".

| padrão | casa com |
|---|---|
| \`\\d\` | um dígito; \`\\d+\` um ou mais dígitos |
| \`\\w\` | letra, dígito ou _ |
| \`\\s\` | espaço em branco |
| \`.\` | qualquer caractere |
| \`[A-Z]\` | uma letra maiúscula |
| \`{5}\` | exatamente 5 repetições |
| \`?\`, \`*\`, \`+\` | 0 ou 1, 0 ou mais, 1 ou mais |
| \`( )\` | grupo de captura |
| \`^\`, \`$\` | início e fim do texto |

~~~python
import re
texto = "Pedido 123 de 2024-03-15, CEP 01310-100, total R$ 89,90"
re.findall(r"\\d+", texto)                  # todos os números
re.search(r"\\d{5}-\\d{3}", texto).group()  # '01310-100'
re.sub(r"\\D", "", "123.456.789-00")        # '12345678900' (remove não dígitos)
~~~

Escreva padrões com **r"..."** (string crua), para as barras não serem interpretadas pelo Python. No pandas, os métodos \`.str.contains\`, \`.str.extract\` e \`.str.replace(..., regex=True)\` aceitam regex.
`),
    exPy('Arquivo, exceções e regex juntos', `
`, r`import re
from pathlib import Path

caminho = Path("cadastro.txt")
caminho.write_text("Ana;(11) 98888-1234;01310-100\nBruno;21 3333 4444;20000000\nCarla;sem telefone;30130-010\n", encoding="utf-8")

with open(caminho, encoding="utf-8") as f:
    for linha in f:
        nome, tel, cep = linha.strip().split(";")
        digitos = re.sub(r"\D", "", tel)
        cep_ok = bool(re.fullmatch(r"\d{5}-?\d{3}", cep))
        try:
            ddd = int(digitos[:2])
        except ValueError:
            ddd = None
        print(f"{nome:<6} tel={digitos or '-':<12} ddd={ddd} cep_valido={cep_ok}")`, `
O regex \`\\D\` removeu tudo que não é dígito. Para a Carla não há dígitos, então \`int("")\` gerou ValueError, capturado. \`fullmatch\` exige que o CEP inteiro siga o padrão (com ou sem hífen).
`),
    py('Escreva `para_float(lista)` que converte cada texto da lista em float (aceitando vírgula decimal) e devolve uma tupla `(validos, invalidos)`: a lista de floats e a lista dos textos que não puderam ser convertidos.',
      r`def para_float(lista):
    validos, invalidos = [], []
    for v in lista:
        try:
            validos.append(float(v.replace(",", ".")))
        except ValueError:
            invalidos.append(v)
    return validos, invalidos`,
      r`assert para_float(["10", "abc", "7,5", ""]) == ([10.0, 7.5], ["abc", ""])
assert para_float([]) == ([], [])`),
    py('Use `re.findall` para criar `ceps` com todos os CEPs (formato 00000-000) presentes em `texto`.',
      r`import re
ceps = re.findall(r"\d{5}-\d{3}", texto)`,
      r`assert ceps == ["01310-100", "30130-010"], f"ceps = {ceps}"`,
      { setup: 'texto = "Entregas: Av. Paulista, CEP 01310-100; BH, CEP 30130-010; pedido 12345"', starter: 'import re\n' }),
    py('Crie `apenas_digitos` com o CPF `cpf` sem pontos e hífen (use `re.sub`).',
      r`import re
apenas_digitos = re.sub(r"\D", "", cpf)`,
      r`assert apenas_digitos == "12345678900"`,
      { setup: 'cpf = "123.456.789-00"', starter: 'import re\n' }),
    quiz('Por que usar `with open(...) as f:`?', ['Garante que o arquivo seja fechado, mesmo se ocorrer erro', 'Deixa a leitura mais rápida', 'É obrigatório para ler CSV', 'Converte o texto em DataFrame'], 0),
    quiz('O que `\\d{3}` casa?', ['Exatamente 3 dígitos seguidos', 'O número 3', 'Até 3 letras', 'Qualquer texto com 3 caracteres'], 0),
    quiz('Qual é um problema de usar `except:` sem especificar o erro?', ['Esconde bugs inesperados, inclusive erros de digitação no código', 'Fica mais lento', 'Não captura ValueError', 'Nenhum'], 0),
  ],
};

const L_NP3 = {
  id: 'py-2-3', title: 'NumPy: aleatoriedade, estatística e álgebra linear',
  steps: [
    theory('Números aleatórios reproduzíveis', `
Simulações, amostras e bootstrap precisam de sorteios. O jeito moderno é criar um **gerador** com semente:

~~~python
rng = np.random.default_rng(42)     # mesma semente → mesmos sorteios
rng.random(3)                       # 3 uniformes entre 0 e 1
rng.integers(1, 7, size=10)         # 10 dados de 6 faces (o 7 não entra)
rng.normal(loc=100, scale=15, size=1000)   # normal com média 100 e desvio 15
rng.binomial(n=20, p=0.1, size=5)   # nº de sucessos em 20 tentativas
rng.poisson(lam=3, size=5)          # contagens com média 3
rng.choice(["A", "B"], size=10, p=[0.5, 0.5])
rng.permutation(10)                 # 0..9 embaralhados
~~~

A **semente** torna a análise reproduzível: outra pessoa (ou você amanhã) obtém os mesmos números. As funções antigas \`np.random.seed\`/\`np.random.rand\` ainda funcionam, mas o gerador é o recomendado.
`),
    theory('Estatística, ordenação e conjuntos no NumPy', `
| função | o que faz |
|---|---|
| \`np.mean\`, \`np.median\`, \`np.std(x, ddof=1)\`, \`np.var\` | resumo (ddof=1 = amostral) |
| \`np.percentile(x, [25, 50, 75])\` | percentis |
| \`np.cumsum\`, \`np.cumprod\`, \`np.diff\` | acumulados e diferenças |
| \`np.sort(x)\`, \`np.argsort(x)\` | valores ordenados / **índices** que ordenam |
| \`np.argmax\`, \`np.argmin\` | posição do maior / menor |
| \`np.unique(x, return_counts=True)\` | valores distintos e frequências |
| \`np.corrcoef(x, y)\`, \`np.cov(x, y)\` | matrizes de correlação e covariância |
| \`np.isnan\`, \`np.nanmean\` | lidar com NaN |
| \`np.clip(x, 0, 100)\` | limitar a uma faixa |
| \`np.round(x, 2)\` | arredondar |
| \`np.asarray(x, dtype=float)\` | converte listas/Series em array (sem copiar se já for array) |
| \`np.array_split(x, k)\` | divide em k pedaços de tamanhos quase iguais |
| \`np.setdiff1d(a, b)\` | elementos de a que não estão em b |
| \`np.concatenate([a, b])\` | junta arrays |

**Álgebra linear** (base de regressão e PCA):

~~~python
A = np.array([[2, 1], [1, 3]])
b = np.array([5, 10])
A @ b                    # produto matriz × vetor
A.T                      # transposta
np.linalg.inv(A)         # inversa
np.linalg.solve(A, b)    # resolve A·x = b (melhor que usar a inversa)
np.linalg.eig(A)         # autovalores e autovetores
np.linalg.eigh(A)        # idem, para matrizes simétricas (covariância); eigvalsh só os autovalores
~~~
`),
    exPy('Simulação: lançando dados', `
Simulamos 10.000 lançamentos de dois dados e olhamos a distribuição da soma.
`, r`import numpy as np
rng = np.random.default_rng(7)
d1 = rng.integers(1, 7, size=10_000)
d2 = rng.integers(1, 7, size=10_000)
soma = d1 + d2

valores, contagens = np.unique(soma, return_counts=True)
for v, c in zip(valores, contagens):
    print(f"{v:>2} {'#' * (c // 60)} {c / len(soma):.3f}")
print("média:", soma.mean().round(3), "| P(soma = 7):", (soma == 7).mean())`, `
A soma 7 é a mais frequente (≈ 1/6 = 0,167), e a forma é triangular: há mais combinações que somam 7 do que 2 ou 12. Isso é probabilidade estimada por simulação.
`, { packages: NP }),
    exPy('Resolvendo um sistema linear', `
Duas equações: 2x + y = 5 e x + 3y = 10.
`, r`import numpy as np
A = np.array([[2, 1], [1, 3]], dtype=float)
b = np.array([5, 10], dtype=float)
x = np.linalg.solve(A, b)
print("solução:", x)
print("conferindo A @ x:", A @ x)`, `
x = 1 e y = 3. Regressão linear é exatamente isso, em escala maior: resolver um sistema para encontrar os coeficientes.
`, { packages: NP }),
    py('Com `rng = np.random.default_rng(0)`, sorteie `amostra`: 1.000 valores de uma **normal** com média 50 e desvio 10. Crie `media` (média da amostra) e `p90` (percentil 90).',
      r`rng = np.random.default_rng(0)
amostra = rng.normal(50, 10, 1000)
media = amostra.mean()
p90 = np.percentile(amostra, 90)`,
      r`ref = np.random.default_rng(0).normal(50, 10, 1000)
assert amostra.shape == (1000,) and np.allclose(amostra, ref), "Use default_rng(0) e normal(50, 10, 1000)"
assert abs(media - ref.mean()) < 1e-9 and abs(p90 - np.percentile(ref, 90)) < 1e-9`,
      { setup: 'import numpy as np', packages: NP, starter: 'import numpy as np\n' }),
    py('Dado o array `notas`, crie `ordem`: os **índices** que ordenam as notas da maior para a menor (use `argsort`), e `top3`: as 3 maiores notas.',
      r`ordem = np.argsort(notas)[::-1]
top3 = notas[ordem[:3]]`,
      r`assert list(top3) == [9.5, 9.0, 8.0]
assert list(ordem[:3]) == [3, 1, 4]`,
      { setup: 'import numpy as np\nnotas = np.array([7.0, 9.0, 6.5, 9.5, 8.0])', packages: NP, starter: '# notas já existe\n' }),
    py('Resolva o sistema 3x + 2y = 18 e x − y = 1 com `np.linalg.solve` e guarde a solução em `sol` (array [x, y]).',
      r`sol = np.linalg.solve(np.array([[3, 2], [1, -1]], dtype=float), np.array([18, 1], dtype=float))`,
      r`assert np.allclose(sol, [4, 3])`,
      { setup: 'import numpy as np', packages: NP, starter: 'import numpy as np\n' }),
    quiz('Para que serve a semente em `default_rng(42)`?', ['Tornar os sorteios reproduzíveis', 'Gerar números maiores que 42', 'Acelerar o NumPy', 'Limitar a 42 sorteios'], 0),
    quiz('`np.argsort([30, 10, 20])` devolve...', ['[1, 2, 0]', '[10, 20, 30]', '[0, 1, 2]', '[2, 0, 1]'], 0, 'São as posições que ordenam: o menor (10) está na posição 1, depois 20 (posição 2), depois 30 (posição 0).'),
  ],
};

const L_INDEX = {
  id: 'py-3-4', title: 'Índices, MultiIndex e tipos de dados',
  steps: [
    theory('O índice do DataFrame', `
Todo DataFrame e toda Series têm um **índice**: os rótulos das linhas. Por padrão é 0, 1, 2..., mas pode ser qualquer coluna:

~~~python
df = vendas.set_index("pedido")     # a coluna pedido vira o índice
df.loc[3]                           # a linha de rótulo 3
df.reset_index()                    # o índice volta a ser coluna
df.sort_index()                     # ordena pelo índice
~~~

**Por que o índice importa:**
- operações entre Series **alinham pelo índice**, não pela posição: \`s1 + s2\` soma os rótulos iguais (rótulos sem par viram NaN)
- \`groupby\` coloca as chaves no índice do resultado; \`resample\` exige datas no índice
- \`loc\` busca pelo índice

**MultiIndex:** agrupar por duas colunas cria um índice de dois níveis:

~~~python
s = vendas.groupby(["estado", "status"])["valor"].sum()
s.loc[("SP", "entregue")]    # acessa uma combinação
s.unstack()                  # o 2º nível vira colunas (formato largo)
s.reset_index()              # volta a ser tabela comum
~~~
`),
    theory('Tipos de dados (dtypes)', `
| dtype | conteúdo | observação |
|---|---|---|
| \`int64\` | inteiros | não aceita NaN; use \`Int64\` (nullable) se houver ausentes |
| \`float64\` | decimais | NaN é um float |
| \`object\` / \`string\` | textos | \`string\` é o tipo dedicado mais novo |
| \`bool\` / \`boolean\` | verdadeiro/falso | |
| \`datetime64[ns]\` | datas e horas | libera o acessor \`.dt\` |
| \`category\` | poucos valores repetidos | economiza memória, permite ordem |

Conversões: \`astype("Int64")\`, \`astype("category")\`, \`pd.to_numeric\`, \`pd.to_datetime\`.

**Categorias ordenadas** permitem comparar e ordenar na ordem lógica, não alfabética:

~~~python
ordem = pd.CategoricalDtype(["baixo", "médio", "alto"], ordered=True)
df["faixa"] = df["faixa"].astype(ordem)
df.sort_values("faixa")          # baixo, médio, alto
df[df["faixa"] >= "médio"]       # compara pela ordem definida
~~~
`),
    exPy('Índice, alinhamento e MultiIndex', `
`, r`meta = pd.Series({"SP": 10000, "RJ": 6000, "BA": 3000})
real = vendas.groupby("estado")["valor"].sum()
print((real - meta).round(1))      # alinha pelos rótulos

s = vendas.groupby(["estado", "status"])["valor"].sum()
print(s)
print("SP entregue:", s.loc[("SP", "entregue")])
print(s.unstack(fill_value=0))`, `
Na subtração, só SP e RJ existem nos dois lados; os outros estados viram NaN: o pandas alinhou pelos rótulos. \`unstack\` transformou o segundo nível (status) em colunas.
`, V),
    py('Crie `por_cliente`: a soma de `valor` por **cliente**, com o cliente no índice, ordenada pelo **índice** (ordem alfabética). Depois crie `valor_ana` com o total da Ana usando `loc`.',
      r`por_cliente = vendas.groupby("cliente")["valor"].sum().sort_index()
valor_ana = por_cliente.loc["Ana"]`,
      r`assert list(por_cliente.index) == sorted(vendas["cliente"].unique())
assert abs(valor_ana - 5289.9 - 808.9 - 228.0) < 1e-6`, V),
    py('Agrupe `vendas` por `categoria` e `status` somando `valor` e transforme o resultado em formato largo com `unstack`, preenchendo ausentes com 0. Guarde em `tabela`.',
      r`tabela = vendas.groupby(["categoria", "status"])["valor"].sum().unstack(fill_value=0)`,
      r`assert set(tabela.columns) == {"entregue", "cancelado"}
assert tabela.loc["Móveis", "cancelado"] == 1290.0 and tabela.loc["Livros", "cancelado"] == 0`, V),
    py('Converta a coluna `prioridade` de `df` para uma categoria **ordenada** ["baixa", "média", "alta"] e crie `urgentes` com as linhas de prioridade **maior ou igual a "média"**.',
      r`ordem = pd.CategoricalDtype(["baixa", "média", "alta"], ordered=True)
df["prioridade"] = df["prioridade"].astype(ordem)
urgentes = df[df["prioridade"] >= "média"]`,
      r`assert df["prioridade"].cat.ordered
assert list(urgentes["id"]) == [2, 3, 5]`,
      { setup: 'import pandas as pd\ndf = pd.DataFrame({"id": [1, 2, 3, 4, 5], "prioridade": ["baixa", "alta", "média", "baixa", "alta"]})', packages: PD, starter: '# df já existe\n' }),
    quiz('`s1 + s2`, com índices ["a", "b"] e ["b", "c"], resulta em...', ['a: NaN, b: soma, c: NaN', 'Erro', 'Soma posição a posição', 'Só b'], 0),
    quiz('Qual dtype aceita inteiros com valores ausentes?', ['Int64 (com I maiúsculo, nullable)', 'int64', 'object', 'category'], 0),
  ],
};

const L_WIN = {
  id: 'py-4-4', title: 'Janelas, rankings e transformações por grupo',
  steps: [
    theory('rolling, expanding e ewm', `
Operações de **janela** calculam algo sobre um conjunto de linhas vizinhas:

| método | janela | uso |
|---|---|---|
| \`s.rolling(7).mean()\` | as últimas 7 linhas | média móvel, suavizar ruído |
| \`s.rolling(7, min_periods=1)\` | aceita janelas menores no começo | evita NaN iniciais |
| \`s.rolling(3, center=True)\` | centrada na linha | suavização para gráficos |
| \`s.expanding().mean()\` | do início até a linha | média acumulada |
| \`s.ewm(span=7).mean()\` | todas, com peso exponencial | dá mais peso ao recente |
| \`s.rolling(28).std()\` | desvio móvel | volatilidade, alertas |

Com datas no índice, a janela pode ser de tempo: \`s.rolling("7D").sum()\`.

**Por grupo:** combine com groupby para que a janela não "vaze" de um grupo para outro:

~~~python
df["mm7"] = df.groupby("loja")["receita"].transform(lambda s: s.rolling(7).mean())
df["anterior"] = df.groupby("loja")["receita"].shift(1)
df["acumulado"] = df.groupby("loja")["receita"].cumsum()
~~~
`),
    theory('rank, qcut e apply', `
**rank** numera os valores: \`s.rank(ascending=False, method="min")\`.

| method | empates | equivale a |
|---|---|---|
| \`"average"\` (padrão) | média das posições | — |
| \`"min"\` | menor posição | RANK do SQL |
| \`"dense"\` | sem pular | DENSE_RANK |
| \`"first"\` | ordem de aparição | ROW_NUMBER |

Por grupo: \`df.groupby("categoria")["valor"].rank(ascending=False)\`.

**qcut** cria faixas com **a mesma quantidade** de linhas (quantis), diferente do \`cut\`, que usa limites fixos: \`pd.qcut(s, 4, labels=["Q1", "Q2", "Q3", "Q4"])\`.

**apply** chama uma função por grupo ou por linha. Por grupo, permite lógicas que não existem prontas:

~~~python
df.groupby("categoria").apply(lambda g: g.nlargest(2, "valor"))  # top 2 por categoria
~~~

**Top N por grupo** sem apply: ordene e use \`groupby(...).head(n)\`:

~~~python
df.sort_values("valor", ascending=False).groupby("categoria").head(2)
~~~
`),
    exPy('Janelas por grupo e rankings', `
`, r`d = pd.DataFrame({
    "loja": ["A"] * 5 + ["B"] * 5,
    "dia": list(range(1, 6)) * 2,
    "receita": [10, 12, 9, 15, 14, 30, 28, 35, 31, 40],
})
g = d.groupby("loja")["receita"]
d["mm3"] = g.transform(lambda s: s.rolling(3).mean()).round(1)
d["anterior"] = g.shift(1)
d["acumulado"] = g.cumsum()
d["rank_na_loja"] = g.rank(ascending=False, method="min").astype(int)
print(d)
print(pd.qcut(d["receita"], 2, labels=["baixa", "alta"]).value_counts())`, `
Cada loja tem suas próprias janelas: a média móvel da loja B não usa dias da loja A. O \`qcut\` dividiu as 10 linhas em duas metades de 5.
`, P),
    py('Em `vendas`, crie a coluna `rank_cat` com a posição de cada venda **dentro da sua categoria** pelo valor (maior = 1, método "min").',
      r`vendas["rank_cat"] = vendas.groupby("categoria")["valor"].rank(ascending=False, method="min")`,
      r`assert vendas.loc[vendas["pedido"] == 8, "rank_cat"].item() == 1
assert vendas.loc[vendas["pedido"] == 2, "rank_cat"].item() == 5`, V),
    py('Crie `top2`: as **2 maiores vendas de cada categoria** (use `sort_values` + `groupby(...).head(2)`).',
      r`top2 = vendas.sort_values("valor", ascending=False).groupby("categoria").head(2)`,
      r`assert len(top2) == 8
assert set(top2.loc[top2["categoria"] == "Eletrônicos", "pedido"]) == {8, 1}`, V),
    py('A Series `s` tem receitas diárias. Crie `mm3` (média móvel de 3 dias), `media_acum` (média acumulada com `expanding`) e `ewm3` (média exponencial com `span=3`).',
      r`mm3 = s.rolling(3).mean()
media_acum = s.expanding().mean()
ewm3 = s.ewm(span=3).mean()`,
      r`assert mm3.isna().sum() == 2 and abs(mm3.iloc[2] - 11) < 1e-9
assert abs(media_acum.iloc[-1] - s.mean()) < 1e-9
assert abs(ewm3.iloc[-1] - s.ewm(span=3).mean().iloc[-1]) < 1e-9`,
      { setup: 'import pandas as pd\ns = pd.Series([10, 12, 11, 15, 14, 18])', packages: PD, starter: '# s já existe\n' }),
    quiz('Qual a diferença entre `pd.cut` e `pd.qcut`?', ['cut usa limites fixos; qcut cria faixas com quantidades iguais de linhas', 'São iguais', 'qcut só funciona com datas', 'cut ordena os dados'], 0),
    quiz('Por que usar `groupby("loja")` antes de `shift(1)`?', ['Para o valor anterior não vir de outra loja', 'Para ficar mais rápido', 'Porque shift exige groupby', 'Para remover NaN'], 0),
  ],
};

const L_PLOTS = {
  id: 'py-7-2', title: 'Gráficos estatísticos e seaborn',
  steps: [
    theory('O gráfico certo para cada pergunta', `
| pergunta | gráfico | matplotlib | seaborn |
|---|---|---|---|
| como os valores se distribuem? | histograma, densidade | \`ax.hist\` | \`histplot\`, \`kdeplot\` |
| comparar distribuições entre grupos | boxplot, violino | \`ax.boxplot\` | \`boxplot\`, \`violinplot\` |
| comparar totais entre categorias | barras | \`ax.bar\` / \`barh\` | \`barplot\`, \`countplot\` |
| evolução no tempo | linha | \`ax.plot\` | \`lineplot\` |
| relação entre duas numéricas | dispersão (+ reta) | \`ax.scatter\` | \`scatterplot\`, \`regplot\` |
| correlação entre muitas variáveis | mapa de calor | \`ax.imshow\` | \`heatmap\` |
| tudo contra tudo | matriz de dispersão | — | \`pairplot\` |
| comparar com a normal | QQ-plot | \`scipy.stats.probplot\` | — |

**Histograma:** o número de faixas (\`bins\`) muda a leitura; teste alguns. **Boxplot:** caixa = Q1 a Q3, linha = mediana, bigodes = 1,5·IQR, pontos = outliers. **Dispersão:** use transparência (\`alpha\`) quando houver muitos pontos sobrepostos.

**seaborn** trabalha direto com DataFrames em formato longo: \`sns.boxplot(data=df, x="loja", y="receita")\`. O parâmetro \`hue\` colore por uma terceira variável.
`),
    theory('Vários gráficos numa figura', `
\`plt.subplots(linhas, colunas)\` cria uma grade de eixos; cada eixo é um gráfico independente:

~~~python
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].hist(df["receita"], bins=30)
axes[0].set_title("Distribuição")
axes[1].scatter(df["visitantes"], df["receita"], alpha=0.3)
axes[1].set_title("Visitantes × receita")
fig.tight_layout()
fig.savefig("graficos.png", dpi=150)   # salva em arquivo
~~~

Use \`sharex=True\`/\`sharey=True\` para os gráficos compartilharem a escala, o que permite comparar de verdade.

**Checklist de um bom gráfico:** título que diz a conclusão; eixos com nome e unidade; escala começando em zero nas barras; cores com significado e acessíveis a daltônicos; sem 3D, sombras e enfeites; fonte do dado no rodapé.
`),
    exPy('Distribuição e relação em uma figura', `
`, r`import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
rng = np.random.default_rng(1)
visitantes = rng.integers(300, 900, 200)
receita = visitantes * 9 + rng.normal(0, 800, 200)

fig, axes = plt.subplots(1, 3, figsize=(12, 3.5))
axes[0].hist(receita, bins=20, color="#2563eb")
axes[0].set_title("Distribuição da receita")
axes[1].boxplot([receita[visitantes < 600], receita[visitantes >= 600]])
axes[1].set_xticks([1, 2], ["< 600 visitas", ">= 600 visitas"])
axes[1].set_title("Receita por faixa de visitas")
axes[2].scatter(visitantes, receita, alpha=0.4, s=12)
axes[2].set_title("Visitantes × receita")
fig.tight_layout()
print("eixos:", len(axes), "| barras do histograma:", len(axes[0].patches))`, `
Três perguntas, três gráficos: a forma da distribuição, a comparação entre grupos e a relação entre variáveis.
`, { setup: 'import numpy as np', setupNote: '`np` (NumPy) já importado.', packages: ['numpy', 'matplotlib'] }),
    py('Crie uma figura com **2 gráficos lado a lado** (`fig, axes = plt.subplots(1, 2)`): à esquerda um **histograma** de `vendas["valor"]` com 5 bins; à direita um **boxplot** de `vendas["valor"]`. Dê os títulos "Histograma" e "Boxplot".',
      r`import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2)
axes[0].hist(vendas["valor"], bins=5)
axes[0].set_title("Histograma")
axes[1].boxplot(vendas["valor"])
axes[1].set_title("Boxplot")`,
      r`assert len(axes) == 2
assert axes[0].get_title() == "Histograma" and axes[1].get_title() == "Boxplot"
assert len(axes[0].patches) == 5, "O histograma deve ter 5 barras"
assert len(axes[1].lines) > 0, "Desenhe o boxplot no segundo eixo"`,
      { setup: PY_VENDAS, packages: [...PD, 'matplotlib'], starter: 'import matplotlib.pyplot as plt\n' }),
    py('Faça um gráfico de **dispersão** com `x` no eixo horizontal e `y` no vertical, com `alpha=0.5`, e dê ao eixo x o rótulo "Preço" e ao y o rótulo "Quantidade".',
      r`import matplotlib.pyplot as plt
fig, ax = plt.subplots()
ax.scatter(x, y, alpha=0.5)
ax.set_xlabel("Preço")
ax.set_ylabel("Quantidade")`,
      r`assert ax.get_xlabel() == "Preço" and ax.get_ylabel() == "Quantidade"
assert len(ax.collections) == 1 and len(ax.collections[0].get_offsets()) == 6`,
      { setup: 'x = [10, 20, 30, 40, 50, 60]\ny = [100, 90, 70, 65, 40, 30]', packages: ['matplotlib'], starter: 'import matplotlib.pyplot as plt\n' }),
    quiz('Para mostrar se a receita tem cauda longa, o melhor gráfico é...', ['Histograma', 'Pizza', 'Linha', 'Mapa de calor'], 0),
    quiz('Muitos pontos se sobrepõem num gráfico de dispersão. O que ajuda?', ['Transparência (alpha) ou um gráfico de densidade/hexbin', 'Usar 3D', 'Pizza', 'Remover os eixos'], 0),
  ],
};

const L_ML = {
  id: 'py-9-3', title: 'SciPy, statsmodels e scikit-learn',
  steps: [
    theory('Testes estatísticos com SciPy', `
\`scipy.stats\` tem os testes clássicos prontos. Todos devolvem a **estatística** e o **p-valor**:

~~~python
from scipy import stats
stats.ttest_ind(a, b, equal_var=False)      # t de Welch (duas médias)
stats.ttest_rel(antes, depois)              # t pareado
stats.ttest_1samp(x, popmean=100)           # t de uma amostra
stats.mannwhitneyu(a, b)                    # não paramétrico (2 grupos)
stats.f_oneway(g1, g2, g3)                  # ANOVA
stats.kruskal(g1, g2, g3)                   # Kruskal-Wallis
stats.chi2_contingency(tabela)              # qui-quadrado
stats.pearsonr(x, y), stats.spearmanr(x, y) # correlações com p-valor
stats.shapiro(x)                            # normalidade
stats.norm.cdf(1.96), stats.norm.ppf(0.975) # distribuição normal
stats.t.ppf(0.975, df=20)                   # valor crítico t
~~~

\`cdf\` é a probabilidade acumulada (P(X ≤ x)); \`ppf\` é a inversa (o x que deixa uma probabilidade abaixo). Na trilha de Estatística você implementa esses testes com NumPy para entender o que está por dentro; no trabalho, use a biblioteca.
`),
    theory('Modelos com statsmodels', `
**statsmodels** é a biblioteca para **inferência**: coeficientes com erro padrão, p-valor e intervalo de confiança. A interface de fórmulas é parecida com a do R:

~~~python
import statsmodels.formula.api as smf
modelo = smf.ols("receita ~ visitantes + C(loja)", data=df).fit()
print(modelo.summary())        # tabela completa
modelo.params                  # coeficientes
modelo.pvalues, modelo.conf_int()
modelo.rsquared, modelo.rsquared_adj

logit = smf.logit("converteu ~ C(grupo) + C(dispositivo)", data=ab).fit()
np.exp(logit.params)           # razões de chances
~~~

\`C(loja)\` transforma a coluna em dummies automaticamente; \`a:b\` cria interação e \`a*b\` inclui os efeitos principais mais a interação. Também tem séries temporais (\`ARIMA\`, \`ExponentialSmoothing\`, \`seasonal_decompose\`), modelos de contagem (\`poisson\`) e testes de diagnóstico.
`),
    theory('Machine learning com scikit-learn', `
scikit-learn tem a **mesma interface** para todos os modelos:

~~~python
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score

X_treino, X_teste, y_treino, y_teste = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
modelo = make_pipeline(StandardScaler(), LogisticRegression())
modelo.fit(X_treino, y_treino)                 # aprende só com o treino
prob = modelo.predict_proba(X_teste)[:, 1]     # probabilidades no teste
print(roc_auc_score(y_teste, prob))
print(cross_val_score(modelo, X, y, cv=5, scoring="roc_auc"))
~~~

O fluxo é sempre: **separar treino e teste → pré-processar (ajustando só no treino) → treinar (\`fit\`) → prever (\`predict\`) → avaliar no teste**. O **Pipeline** junta pré-processamento e modelo, evitando *vazamento de dados* (usar informação do teste no treino).

Famílias de modelos: regressão linear e logística, árvores e florestas (\`RandomForest\`), gradient boosting (\`HistGradientBoosting\`, XGBoost, LightGBM), k-vizinhos, SVM, k-means (agrupamento), PCA (redução de dimensão). Os conceitos (overfitting, validação cruzada, métricas) estão na trilha de Estatística.
`),
    exPy('Treino e teste "na mão" com NumPy', `
Para enxergar o que \`train_test_split\` e \`LinearRegression\` fazem por dentro:
`, r`import numpy as np
rng = np.random.default_rng(0)
n = 200
x = rng.uniform(0, 10, n)
y = 3 + 2 * x + rng.normal(0, 2, n)

idx = rng.permutation(n)
treino, teste = idx[:160], idx[160:]          # 80% / 20%
X_tr = np.column_stack([np.ones(160), x[treino]])
beta, *_ = np.linalg.lstsq(X_tr, y[treino], rcond=None)
prev = beta[0] + beta[1] * x[teste]
rmse = np.sqrt(np.mean((y[teste] - prev) ** 2))
print("intercepto e inclinação:", beta.round(2))
print("RMSE no teste:", rmse.round(2))`, `
O modelo recuperou algo perto dos valores verdadeiros (3 e 2), e o erro no teste (≈ 2) é parecido com o ruído que colocamos: sinal de que o modelo generaliza.
`, { packages: NP }),
    py('Separe os índices de 0 a 99 em `treino` (80 primeiros de uma permutação) e `teste` (20 restantes), usando `rng = np.random.default_rng(1)` e `rng.permutation(100)`.',
      r`rng = np.random.default_rng(1)
idx = rng.permutation(100)
treino, teste = idx[:80], idx[80:]`,
      r`ref = np.random.default_rng(1).permutation(100)
assert len(treino) == 80 and len(teste) == 20
assert set(treino) | set(teste) == set(range(100)) and not set(treino) & set(teste)
assert list(treino) == list(ref[:80])`,
      { setup: 'import numpy as np', packages: NP, starter: 'import numpy as np\n' }),
    quiz('Em `stats.norm.ppf(0.975)`, o que é calculado?', ['O valor z que deixa 97,5% abaixo (≈ 1,96)', 'A probabilidade de z ≤ 0,975', 'A média da normal', 'O p-valor'], 0),
    quiz('Qual biblioteca você usaria para ter p-valores e intervalos dos coeficientes de uma regressão?', ['statsmodels', 'scikit-learn', 'matplotlib', 'requests'], 0),
    quiz('Por que ajustar o StandardScaler só nos dados de treino?', ['Para não vazar informação do teste para o modelo', 'Porque é mais rápido', 'Porque o teste não tem números', 'Não importa'], 0),
    order('Ordene o fluxo de um projeto de machine learning:', ['separar treino e teste', 'pré-processar', 'treinar (fit)', 'prever', 'avaliar no teste']),
  ],
};

export const PY_PLUS = {
  examples,
  lessons: [
    { unit: 'py-u1', first: true, lesson: L_STR },
    { unit: 'py-u1', first: true, lesson: L_INTRO },
    { unit: 'py-u1', after: 'py-1-3', lesson: L_FUNC },
    { unit: 'py-u1', after: 'py-1-4', lesson: L_ARQ },
    { unit: 'py-u2', after: 'py-2-2', lesson: L_NP3 },
    { unit: 'py-u3', after: 'py-3-3', lesson: L_INDEX },
    { unit: 'py-u4', after: 'py-4-3', lesson: L_WIN },
    { unit: 'py-u7', after: 'py-7-1', lesson: L_PLOTS },
    { unit: 'py-u9', after: 'py-9-2', lesson: L_ML },
  ],
  units: [],
};
