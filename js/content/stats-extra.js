// Unidades adicionais da trilha de Estatística (do básico ao especialista).
import { theory, quiz, order, fill, sql, py } from './helpers.js';
import { PY_STATS, PY_STATS_NOTE } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];
const S = { setup: PY_STATS, setupNote: PY_STATS_NOTE, packages: PD };
const NP = { packages: ['numpy'] };

// ════════════════════════════════════════════ NÍVEL 1 · BÁSICO
export const ST_INTRO = {
  id: 'st-u0', title: 'Primeiros conceitos', description: 'População e amostra, tipos de variáveis, frequências e histogramas',
  lessons: [
    {
      id: 'st-0-1', title: 'Dados, variáveis e escalas',
      steps: [
        theory('População, amostra e o que estamos medindo', `
A estatística trabalha com duas ideias centrais:

- **População**: todos os elementos que interessam (todos os clientes, todos os dias do ano)
- **Amostra**: a parte que você observou de fato

Um número calculado na população é um **parâmetro** (ex.: a taxa de conversão verdadeira). Calculado na amostra, é uma **estatística** (a taxa que você mediu), que serve para **estimar** o parâmetro.

Uma amostra só representa bem a população quando é **aleatória**. Pesquisa feita só com quem respondeu um e-mail tem **viés de seleção**: quem responde é diferente de quem ignora.
`),
        theory('Tipos de variáveis', `
| tipo | subtipo | exemplos | resumos adequados |
|---|---|---|---|
| **qualitativa** (categórica) | nominal | loja, dispositivo, grupo A/B | contagem, proporção, moda |
| | ordinal | nota de 1 a 5, nível de escolaridade | mediana, percentis, moda |
| **quantitativa** (numérica) | discreta | número de pedidos, visitantes | média, desvio, soma |
| | contínua | receita, tempo de sessão, peso | média, desvio, percentis |

O tipo decide o gráfico (barras para categorias, histograma para números) e o teste estatístico (qui-quadrado para categorias, t ou ANOVA para médias).

> Codificar categorias com números (1 = mobile, 2 = desktop) não transforma a variável em numérica: a média desses códigos não significa nada.
`),
        quiz('A nota de 1 a 5 de uma avaliação de produto é uma variável...', ['Quantitativa contínua', 'Qualitativa ordinal', 'Qualitativa nominal', 'Quantitativa discreta sem ordem'], 1,
          'Há ordem entre as notas, mas a distância entre 1 e 2 não é necessariamente igual à entre 4 e 5. Por isso a mediana é um resumo mais seguro que a média.'),
        quiz('O número de pedidos de um dia é uma variável...', ['Quantitativa discreta', 'Quantitativa contínua', 'Qualitativa ordinal', 'Qualitativa nominal'], 0),
        quiz('Você mediu a taxa de conversão de 2.000 visitantes para estimar a de todos os visitantes futuros. A taxa medida é...', ['Um parâmetro', 'Uma estatística (estimativa do parâmetro)', 'A população', 'Um viés'], 1),
        sql('Quantos valores **distintos** existem nas colunas grupo e dispositivo da tabela experimento_ab, e quantas linhas ela tem? Colunas: grupos, dispositivos, linhas.',
          'SELECT COUNT(DISTINCT grupo) AS grupos, COUNT(DISTINCT dispositivo) AS dispositivos, COUNT(*) AS linhas FROM experimento_ab;'),
        quiz('Uma pesquisa de satisfação enviada por e-mail teve 8% de respostas, quase todas muito positivas. O principal risco é...', ['Amostra grande demais', 'Viés de seleção: quem responde pode ser diferente de quem não responde', 'Variável ordinal', 'Erro de arredondamento'], 1),
      ],
    },
    {
      id: 'st-0-2', title: 'Tabelas de frequência e histogramas',
      steps: [
        theory('Distribuições de frequência', `
Antes de qualquer média, **olhe a distribuição**:

- **Frequência absoluta**: quantas vezes cada valor (ou faixa) aparece
- **Frequência relativa**: a mesma contagem dividida pelo total (proporção ou %)
- **Frequência acumulada**: soma das frequências até aquele valor

Para variáveis contínuas, agrupe em **faixas (bins)** e desenhe um **histograma**. A forma conta muito:

| forma | o que sugere |
|---|---|
| simétrica, em sino | média ≈ mediana, muitos métodos clássicos funcionam bem |
| assimétrica à direita (cauda longa de valores altos) | receita, renda, tempo: prefira mediana e percentis |
| bimodal (dois picos) | provavelmente dois grupos misturados, separe antes de resumir |
`),
        sql('Monte a tabela de frequência das **notas** em avaliacoes: nota, quantidade e percentual do total (2 casas). Colunas: nota, qtd, pct. Ordene pela nota.',
          'SELECT nota, COUNT(*) AS qtd, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM avaliacoes), 2) AS pct FROM avaliacoes GROUP BY nota ORDER BY nota;',
          { ordered: true }),
        sql('Acrescente a **frequência acumulada** (%) das notas, da nota 1 até a 5, com 2 casas. Colunas: nota, pct_acumulado. Ordene pela nota.',
          'WITH f AS (SELECT nota, COUNT(*) AS qtd FROM avaliacoes GROUP BY nota) SELECT nota, ROUND(100.0 * SUM(qtd) OVER (ORDER BY nota) / SUM(qtd) OVER (), 2) AS pct_acumulado FROM f ORDER BY nota;',
          { ordered: true }),
        py('Com `np.histogram`, divida a **receita da loja Online** em **10 faixas**. Guarde o resultado em `contagens, bordas`.',
          r`v = diarias.loc[diarias["loja"] == "Online", "receita"]
contagens, bordas = np.histogram(v, bins=10)`,
          r`c, b = np.histogram(diarias[diarias.loja == "Online"].receita, bins=10)
assert list(contagens) == list(c) and np.allclose(bordas, b)
assert contagens.sum() == 366`, S),
        py('Crie `dist`: a **proporção** de dias (todas as lojas) em cada faixa de receita, usando `pd.cut` com os limites `[0, 4000, 6000, 8000, 10000, np.inf]`, `value_counts(normalize=True)` e `sort_index()`.',
          r`faixas = pd.cut(diarias["receita"], bins=[0, 4000, 6000, 8000, 10000, np.inf])
dist = faixas.value_counts(normalize=True).sort_index()`,
          r`ref = pd.cut(diarias.receita, bins=[0, 4000, 6000, 8000, 10000, np.inf]).value_counts(normalize=True).sort_index()
assert len(dist) == 5 and abs(dist.sum() - 1) < 1e-9
assert np.allclose(dist.to_numpy(), ref.to_numpy())`, S),
        quiz('Um histograma de tempo de sessão tem um pico perto de 1 minuto e uma cauda longa até 2 horas. A distribuição é...', ['Simétrica', 'Assimétrica à direita', 'Assimétrica à esquerda', 'Uniforme'], 1),
        quiz('O histograma de altura dos clientes mostra dois picos bem separados. O primeiro passo é...', ['Reportar a média', 'Investigar se há dois grupos misturados (ex.: adultos e crianças) e separá-los', 'Remover um dos picos', 'Usar o máximo'], 1),
      ],
    },
  ],
};

// ════════════════════════════════════════════ NÍVEL 2 · INTERMEDIÁRIO
export const ST_CATEG = {
  id: 'st-u7', title: 'Testes para categorias e vários grupos', description: 'Qui-quadrado de independência e ANOVA',
  lessons: [
    {
      id: 'st-7-1', title: 'Qui-quadrado de independência',
      steps: [
        theory('Duas variáveis categóricas estão relacionadas?', `
A pergunta "a conversão depende do dispositivo?" envolve duas variáveis **categóricas**. O teste é o **qui-quadrado de independência**:

1. Monte a **tabela de contingência** com as contagens observadas O
2. Calcule o esperado sob independência: **E = (total da linha × total da coluna) ÷ total geral**
3. **χ² = Σ (O − E)² ÷ E**
4. Graus de liberdade: **(linhas − 1) × (colunas − 1)**
5. Compare com o valor crítico (ou calcule o p-valor)

| graus de liberdade | valor crítico a 5% |
|---|---|
| 1 | 3,84 |
| 2 | 5,99 |
| 3 | 7,81 |
| 4 | 9,49 |

Em Python: \`scipy.stats.chi2_contingency(tabela)\`.
`),
        theory('Cuidados com o qui-quadrado', `
- Use **contagens**, nunca percentuais
- Cada célula esperada deve ter, em geral, **E ≥ 5**; se não, agrupe categorias ou use o teste exato de Fisher
- O teste diz **se** há associação, não **quão forte** ela é. Para a força, use o **V de Cramér**: √(χ² ÷ (n × (min(linhas, colunas) − 1))), de 0 a 1
`),
        sql('Monte a tabela de contingência **dispositivo × conversão**: uma linha por dispositivo com as colunas nao_converteu e converteu (contagens). Ordene por dispositivo.',
          'SELECT dispositivo, SUM(CASE WHEN converteu = 0 THEN 1 ELSE 0 END) AS nao_converteu, SUM(converteu) AS converteu FROM experimento_ab GROUP BY dispositivo ORDER BY dispositivo;',
          { ordered: true }),
        py('Calcule o qui-quadrado de independência entre `dispositivo` e `converteu` em `ab`. Crie `obs` (`pd.crosstab`), `esperado` (DataFrame do mesmo formato), `chi2` e `gl` (graus de liberdade).',
          r`obs = pd.crosstab(ab["dispositivo"], ab["converteu"])
total = obs.to_numpy().sum()
esperado = pd.DataFrame(np.outer(obs.sum(axis=1), obs.sum(axis=0)) / total, index=obs.index, columns=obs.columns)
chi2 = (((obs - esperado) ** 2) / esperado).to_numpy().sum()
gl = (obs.shape[0] - 1) * (obs.shape[1] - 1)`,
          r`o = pd.crosstab(ab.dispositivo, ab.converteu).to_numpy()
e = np.outer(o.sum(1), o.sum(0)) / o.sum()
assert np.allclose(np.asarray(esperado, dtype=float), e)
assert abs(chi2 - ((o - e) ** 2 / e).sum()) < 1e-9
assert gl == 2`, S),
        quiz('O χ² deu 7,2 com 2 graus de liberdade (valor crítico 5,99). Conclusão a 5%?', ['Não há associação', 'Rejeitamos a independência: conversão e dispositivo estão associados', 'O teste é inválido', 'A associação é forte'], 1,
          'Rejeitar a independência diz que existe associação; para medir a força, calcule o V de Cramér.'),
        quiz('Uma célula da tabela tem contagem esperada 2. O que fazer?', ['Ignorar', 'Agrupar categorias ou usar o teste exato de Fisher', 'Multiplicar por 100', 'Usar percentuais'], 1),
      ],
    },
    {
      id: 'st-7-2', title: 'ANOVA: comparando várias médias',
      steps: [
        theory('Por que não fazer vários testes t?', `
Comparar 3 lojas par a par exige 3 testes t; com 5% de erro em cada, a chance de **algum** falso positivo passa de 14%. A **ANOVA de um fator** testa todas as médias de uma vez:

- **H₀**: todas as médias são iguais
- **SQ entre** (variação das médias dos grupos em torno da média geral): Σ nₖ (x̄ₖ − x̄)²
- **SQ dentro** (variação dentro de cada grupo): Σ Σ (x − x̄ₖ)²
- **F = (SQ entre ÷ (k − 1)) ÷ (SQ dentro ÷ (N − k))**

F grande indica que as médias diferem mais do que o ruído explicaria. Se a ANOVA rejeitar H₀, um teste **post hoc** (Tukey HSD) diz **quais** pares diferem.

Pressupostos: independência, variâncias parecidas e resíduos aproximadamente normais (com n grande, a ANOVA é robusta). Sem eles: **Kruskal-Wallis**.
`),
        sql('Calcule a **soma de quadrados entre grupos** (SQ entre) da receita por loja: Σ nₖ·(média da loja − média geral)², com 2 casas. Uma coluna, ss_entre.',
          'WITH g AS (SELECT loja, COUNT(*) AS n, AVG(receita) AS m FROM vendas_diarias GROUP BY loja), t AS (SELECT AVG(receita) AS gm FROM vendas_diarias) SELECT ROUND(SUM(n * (m - gm) * (m - gm)), 2) AS ss_entre FROM g, t;'),
        py('Faça a **ANOVA de um fator** da receita entre as 3 lojas: calcule `ss_entre`, `ss_dentro`, `gl_entre`, `gl_dentro` e a estatística `F`.',
          r`media_geral = diarias["receita"].mean()
g = diarias.groupby("loja")["receita"]
ss_entre = (g.count() * (g.mean() - media_geral) ** 2).sum()
ss_dentro = ((diarias["receita"] - g.transform("mean")) ** 2).sum()
gl_entre = diarias["loja"].nunique() - 1
gl_dentro = len(diarias) - diarias["loja"].nunique()
F = (ss_entre / gl_entre) / (ss_dentro / gl_dentro)`,
          r`x = diarias.receita; gg = diarias.groupby("loja").receita
sse = (gg.count() * (gg.mean() - x.mean()) ** 2).sum()
ssd = ((x - gg.transform("mean")) ** 2).sum()
assert abs(ss_entre - sse) < 1e-3 and abs(ss_dentro - ssd) < 1e-3
assert gl_entre == 2 and gl_dentro == len(diarias) - 3
assert abs(F - (sse / 2) / (ssd / (len(diarias) - 3))) < 1e-9 and F > 10`, S),
        quiz('A ANOVA entre 4 campanhas deu p < 0,001. O que ela permite concluir?', ['Todas as campanhas são diferentes', 'Pelo menos uma média difere; um teste post hoc diz quais', 'A campanha 1 é a melhor', 'As variâncias são iguais'], 1),
        quiz('Os dados são muito assimétricos e com outliers. Qual alternativa não paramétrica à ANOVA?', ['Teste t pareado', 'Kruskal-Wallis', 'Qui-quadrado', 'Regressão logística'], 1),
      ],
    },
  ],
};

// ════════════════════════════════════════════ NÍVEL 3 · AVANÇADO
export const ST_TS_LESSON = {
  id: 'st-6-3', title: 'Autocorrelação e previsão de base',
  steps: [
    theory('Quando o passado prevê o futuro', `
A **autocorrelação** de lag k é a correlação da série com ela mesma deslocada k períodos. Em vendas diárias, um pico no lag 7 revela **sazonalidade semanal**.

Antes de qualquer modelo sofisticado, construa **previsões de base** (baselines):

- **Ingênua**: amanhã = hoje
- **Ingênua sazonal**: hoje = mesmo dia da semana passada
- **Média móvel**: média dos últimos N dias

Métricas de erro:
- **MAE** = média de |real − previsto| (na unidade da série)
- **MAPE** = média de |real − previsto| ÷ |real| (em %; quebra quando há zeros)
- **RMSE** = raiz da média dos erros ao quadrado (pune mais os erros grandes)

Um modelo (ARIMA, ETS, Prophet, gradient boosting) só vale a pena se **bater a baseline**.
`),
    py('Monte a série de **receita total por dia** (soma das lojas, indexada pela data) em `total` e calcule a autocorrelação de lag 1 (`acf1`) e de lag 7 (`acf7`) com `.autocorr()`.',
      r`total = diarias.groupby("data")["receita"].sum()
acf1 = total.autocorr(1)
acf7 = total.autocorr(7)`,
      r`t = diarias.groupby("data").receita.sum()
assert len(total) == 366
assert abs(acf1 - t.autocorr(1)) < 1e-12 and abs(acf7 - t.autocorr(7)) < 1e-12`, S),
    py('Para a loja **Online**, faça a previsão **ingênua sazonal** (valor de 7 dias antes) e calcule `mae` e `mape` (em fração, não %) nos dias que têm previsão.',
      r`o = diarias[diarias["loja"] == "Online"].sort_values("data")["receita"].reset_index(drop=True)
prev = o.shift(7)
ok = prev.notna()
erro = (o[ok] - prev[ok]).abs()
mae = erro.mean()
mape = (erro / o[ok].abs()).mean()`,
      r`o = diarias[diarias.loja == "Online"].sort_values("data").receita.reset_index(drop=True)
p = o.shift(7); m = p.notna()
assert abs(mae - (o[m] - p[m]).abs().mean()) < 1e-6
assert abs(mape - ((o[m] - p[m]).abs() / o[m]).mean()) < 1e-9`, S),
    quiz('Por que o MAPE é perigoso em séries com valores perto de zero?', ['Ele fica negativo', 'Dividir por valores muito pequenos explode o erro percentual', 'Ele ignora outliers', 'Ele exige normalidade'], 1),
    quiz('Seu modelo de previsão tem MAE maior que a previsão ingênua sazonal. O que isso indica?', ['O modelo é ótimo', 'O modelo não agrega valor: a baseline simples é melhor', 'A série não tem sazonalidade', 'O MAE está errado'], 1),
  ],
};

export const ST_NONPARAM = {
  id: 'st-u9', title: 'Não paramétricos e comparações múltiplas', description: 'Permutação, Mann-Whitney, Bonferroni, Holm e FDR',
  lessons: [
    {
      id: 'st-9-1', title: 'Testes de permutação e Mann-Whitney',
      steps: [
        theory('Quando os pressupostos não valem', `
Testes **paramétricos** (t, ANOVA) supõem algo sobre a distribuição. Com dados muito assimétricos, outliers ou amostras pequenas, use testes **não paramétricos**:

**Teste de permutação** (ideia mais geral de todas):
1. Calcule a diferença observada entre os grupos
2. Embaralhe os rótulos dos grupos muitas vezes, recalculando a diferença
3. **p-valor** = proporção de embaralhamentos com diferença tão extrema quanto a observada

Se não há efeito real, os rótulos são intercambiáveis, então a diferença observada deveria parecer "comum" entre as embaralhadas.

**Mann-Whitney U** (ou Wilcoxon rank-sum): compara **postos** em vez de valores. U = R₁ − n₁(n₁ + 1) ÷ 2, onde R₁ é a soma dos postos do grupo 1. Robusto a outliers.
`),
        py('Faça um **teste de permutação** para a diferença de médias do `valor_compra` entre B e A (só quem converteu). Use `rng = np.random.default_rng(0)` e 2.000 embaralhamentos. Guarde a diferença observada em `obs` e o p-valor bicaudal em `p_valor`.',
          r`dados = ab[ab["converteu"] == 1]
x = dados["valor_compra"].to_numpy()
g = (dados["grupo"] == "B").to_numpy()
obs = x[g].mean() - x[~g].mean()
rng = np.random.default_rng(0)
difs = []
for _ in range(2000):
    p = rng.permutation(g)
    difs.append(x[p].mean() - x[~p].mean())
p_valor = np.mean(np.abs(difs) >= abs(obs))`,
          r`d = ab[ab.converteu == 1]; x = d.valor_compra.to_numpy(); g = (d.grupo == "B").to_numpy()
o = x[g].mean() - x[~g].mean()
assert abs(obs - o) < 1e-9
rng = np.random.default_rng(123)
ref = np.mean([abs(x[q].mean() - x[~q].mean()) >= abs(o) for q in (rng.permutation(g) for _ in range(3000))])
assert 0 <= p_valor <= 1 and abs(p_valor - ref) < 0.06`, S),
        py('Calcule a estatística **U de Mann-Whitney** do grupo A para `valor_compra` (só quem converteu): ranqueie todos os valores juntos com `.rank()`, some os postos de A (`r_a`) e faça U = R − n(n + 1)/2. Guarde em `u_a`.',
          r`dados = ab[ab["converteu"] == 1].copy()
dados["posto"] = dados["valor_compra"].rank()
a = dados[dados["grupo"] == "A"]
r_a = a["posto"].sum()
u_a = r_a - len(a) * (len(a) + 1) / 2`,
          r`d = ab[ab.converteu == 1].copy(); d["pp"] = d.valor_compra.rank()
na = (d.grupo == "A").sum(); ra = d.loc[d.grupo == "A", "pp"].sum()
assert abs(u_a - (ra - na * (na + 1) / 2)) < 1e-6
nb = (d.grupo == "B").sum()
assert 0 <= u_a <= na * nb`, S),
        quiz('O teste de permutação embaralha os rótulos dos grupos porque...', ['Isso aumenta a amostra', 'Se não há efeito, os rótulos são intercambiáveis; isso gera a distribuição da diferença sob H₀', 'Remove outliers', 'Torna os dados normais'], 1),
        quiz('Com dados de receita cheios de outliers, qual teste costuma ser mais robusto para comparar dois grupos?', ['Teste t', 'Mann-Whitney (baseado em postos)', 'Qui-quadrado', 'ANOVA'], 1),
      ],
    },
    {
      id: 'st-9-2', title: 'Muitos testes ao mesmo tempo',
      steps: [
        theory('O problema das comparações múltiplas', `
Testando 20 hipóteses verdadeiras a α = 5%, espera-se **1 falso positivo**. Duas formas de controlar:

**FWER** (chance de ao menos um falso positivo):
- **Bonferroni**: use α ÷ m em cada teste. Simples e conservador
- **Holm**: ordene os p-valores; compare o i-ésimo menor com α ÷ (m − i + 1) e pare no primeiro que falhar. Sempre melhor que Bonferroni

**FDR** (proporção esperada de falsos positivos entre as descobertas):
- **Benjamini-Hochberg**: ordene os p-valores p₍₁₎ ≤ … ≤ p₍ₘ₎; encontre o maior k com p₍ₖ₎ ≤ (k ÷ m)·q; rejeite as hipóteses 1…k

Use FWER quando um único falso positivo é caro (decisão crítica); FDR quando você está **triando** muitas hipóteses (segmentos, métricas, genes) e aceita uma fração de falsos alarmes.
`),
        py('Implemente `bh(pvals, q=0.05)` (Benjamini-Hochberg) que devolve uma **lista de booleanos** na ordem original dizendo quais hipóteses são rejeitadas.',
          r`def bh(pvals, q=0.05):
    m = len(pvals)
    ordem = sorted(range(m), key=lambda i: pvals[i])
    k_max = 0
    for k, i in enumerate(ordem, start=1):
        if pvals[i] <= k / m * q:
            k_max = k
    rejeita = [False] * m
    for k, i in enumerate(ordem, start=1):
        if k <= k_max:
            rejeita[i] = True
    return rejeita`,
          r`assert bh([0.01, 0.04, 0.03, 0.005]) == [True, True, True, True]
assert bh([0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205]) == [True, True, False, False, False, False, False, False]
assert bh([0.5, 0.6]) == [False, False]`,
          { starter: 'def bh(pvals, q=0.05):\n    ' }),
        py('Implemente `holm(pvals, alfa=0.05)` (Holm-Bonferroni) devolvendo a lista de rejeições na ordem original.',
          r`def holm(pvals, alfa=0.05):
    m = len(pvals)
    ordem = sorted(range(m), key=lambda i: pvals[i])
    rejeita = [False] * m
    for passo, i in enumerate(ordem):
        if pvals[i] <= alfa / (m - passo):
            rejeita[i] = True
        else:
            break
    return rejeita`,
          r`assert holm([0.01, 0.04, 0.03, 0.005]) == [True, False, False, True]
assert holm([0.001, 0.2]) == [True, False]`,
          { starter: 'def holm(pvals, alfa=0.05):\n    ' }),
        quiz('Você está triando 500 segmentos de clientes em busca de efeitos para investigar depois. Qual controle é mais adequado?', ['Nenhum', 'FDR (Benjamini-Hochberg)', 'Bonferroni com α = 0,05/500', 'Somente o menor p-valor'], 1),
        order('Ordene os passos de Benjamini-Hochberg:', ['Ordenar os p-valores', 'Comparar cada p₍ₖ₎ com (k/m)·q', 'Achar o maior k que passa', 'Rejeitar as hipóteses 1 a k']),
      ],
    },
  ],
};

export const ST_REGADV = {
  id: 'st-u10', title: 'Regressão avançada', description: 'Regressão múltipla, variáveis dummy e regressão logística',
  lessons: [
    {
      id: 'st-10-1', title: 'Regressão múltipla e dummies',
      steps: [
        theory('Vários preditores ao mesmo tempo', `
y = β₀ + β₁x₁ + β₂x₂ + … + ε

Cada **βⱼ** é o efeito de xⱼ **mantendo os outros fixos** (ceteris paribus). Isso muda a interpretação: o efeito dos visitantes "controlando pela loja" pode ser bem diferente do efeito bruto.

**Variáveis categóricas** entram como **dummies** (0/1). Com k categorias, crie **k − 1** dummies; a que fica de fora é a **referência**, e cada coeficiente é a diferença em relação a ela. Criar k dummies com intercepto causa a **armadilha das dummies** (colinearidade perfeita).

~~~python
X = pd.get_dummies(df[["visitantes", "loja"]], drop_first=True, dtype=float)
X.insert(0, "const", 1.0)
beta, *_ = np.linalg.lstsq(X.to_numpy(), y, rcond=None)
~~~
`),
        theory('R² ajustado e diagnóstico', `
O R² **nunca diminui** ao adicionar variáveis, mesmo inúteis. O **R² ajustado** penaliza a complexidade:

**R²ₐⱼ = 1 − (1 − R²) · (n − 1) ÷ (n − p − 1)**, com p = número de preditores.

Diagnóstico essencial:
- **Resíduos** sem padrão (contra os valores previstos e contra o tempo)
- **Multicolinearidade**: preditores muito correlacionados inflam os erros padrão (VIF > 5–10 é sinal de alerta)
- **Outliers e alavancagem**: pontos que sozinhos movem a reta
`),
        py('Ajuste **receita ~ visitantes + loja** em `diarias` usando dummies (`pd.get_dummies(..., drop_first=True, dtype=float)`) e uma coluna `const`. Guarde a matriz em `X` (DataFrame com colunas const, visitantes, loja_Online, loja_Shopping) e os coeficientes em `beta`.',
          r`X = pd.get_dummies(diarias[["visitantes", "loja"]], drop_first=True, dtype=float)
X.insert(0, "const", 1.0)
y = diarias["receita"].to_numpy(dtype=float)
beta, *_ = np.linalg.lstsq(X.to_numpy(), y, rcond=None)`,
          r`assert list(X.columns) == ["const", "visitantes", "loja_Online", "loja_Shopping"]
b, *_ = np.linalg.lstsq(X.to_numpy(dtype=float), diarias.receita.to_numpy(dtype=float), rcond=None)
assert np.allclose(beta, b)`, S),
        py('Escreva `r2_ajustado(r2, n, p)` e calcule `r2a` para R² = 0,64, n = 1.098 e p = 3.',
          r`def r2_ajustado(r2, n, p):
    return 1 - (1 - r2) * (n - 1) / (n - p - 1)
r2a = r2_ajustado(0.64, 1098, 3)`,
          r`assert abs(r2_ajustado(0.5, 101, 1) - (1 - 0.5 * 100 / 99)) < 1e-12
assert abs(r2a - (1 - 0.36 * 1097 / 1094)) < 1e-12`,
          { starter: 'def r2_ajustado(r2, n, p):\n    ' }),
        quiz('Uma variável "loja" tem 3 categorias e o modelo tem intercepto. Quantas dummies criar?', ['3', '2', '1', '6'], 1, 'k − 1 = 2; a categoria omitida vira a referência.'),
        quiz('No modelo, o coeficiente de loja_Online é 1.200. Como interpretar?', ['A loja Online vende 1.200 por dia', 'Mantendo os visitantes fixos, a Online tem em média 1.200 a mais que a loja de referência (Centro)', 'A Online tem 1.200 visitantes', 'O efeito é de 1.200%'], 1),
      ],
    },
    {
      id: 'st-10-2', title: 'Regressão logística',
      steps: [
        theory('Prevendo probabilidades', `
Quando y é **binário** (converteu ou não, churn ou não), a regressão linear pode prever valores fora de [0, 1]. A **regressão logística** modela o **log das chances**:

log(p ÷ (1 − p)) = β₀ + β₁x₁ + …  ⟺  **p = 1 ÷ (1 + e^−(β₀ + β₁x₁ + …))** (função sigmoide)

- **Chance (odds)** = p ÷ (1 − p). p = 0,2 → odds = 0,25
- **Razão de chances (odds ratio)** = **e^βⱼ**: quanto as chances se multiplicam quando xⱼ aumenta 1 unidade. OR = 1,4 → chances 40% maiores

Os coeficientes saem por **máxima verossimilhança**, com métodos iterativos (Newton-Raphson/IRLS, gradiente). Em produção: \`statsmodels.Logit\` (inferência) ou \`sklearn.linear_model.LogisticRegression\` (previsão).
`),
        theory('Newton-Raphson para a logística', `
Com X (n × k) e y (0/1), a cada iteração:

~~~python
p = 1 / (1 + np.exp(-X @ beta))
gradiente = X.T @ (y - p)
W = p * (1 - p)
hessiana = X.T @ (X * W[:, None])
beta = beta + np.linalg.solve(hessiana, gradiente)
~~~

Convergiu quando o **gradiente é praticamente zero**: é a condição de máximo da verossimilhança.
`),
        py('Ajuste a logística **converteu ~ é_B + é_desktop** em `ab` com **Newton-Raphson** (25 iterações a partir de zeros). Monte `X` (n × 3: 1, é_B, é_desktop, como float) e guarde os coeficientes em `beta`.',
          r`y = ab["converteu"].to_numpy(dtype=float)
X = np.column_stack([np.ones(len(ab)), (ab["grupo"] == "B").astype(float), (ab["dispositivo"] == "desktop").astype(float)])
beta = np.zeros(3)
for _ in range(25):
    p = 1 / (1 + np.exp(-X @ beta))
    grad = X.T @ (y - p)
    H = X.T @ (X * (p * (1 - p))[:, None])
    beta = beta + np.linalg.solve(H, grad)`,
          r`yy = ab.converteu.to_numpy(dtype=float)
XX = np.column_stack([np.ones(len(ab)), (ab.grupo == "B").astype(float), (ab.dispositivo == "desktop").astype(float)])
pp = 1 / (1 + np.exp(-XX @ np.asarray(beta)))
assert np.abs(XX.T @ (yy - pp)).max() < 1e-6, "o gradiente deveria ser ~0 no ótimo"
assert beta[1] > 0`, S),
        py('A partir de `beta`, calcule `or_b`: a **razão de chances** do grupo B, e `p_b_mobile`: a probabilidade prevista de conversão de um usuário B no mobile.',
          r`or_b = np.exp(beta[1])
p_b_mobile = 1 / (1 + np.exp(-(beta[0] + beta[1])))`,
          r`assert abs(or_b - np.exp(beta[1])) < 1e-12 and or_b > 1
assert abs(p_b_mobile - 1 / (1 + np.exp(-(beta[0] + beta[1])))) < 1e-12`,
          { ...S, setup: PY_STATS + r`
y = ab["converteu"].to_numpy(dtype=float)
X = np.column_stack([np.ones(len(ab)), (ab["grupo"] == "B").astype(float), (ab["dispositivo"] == "desktop").astype(float)])
beta = np.zeros(3)
for _ in range(25):
    p = 1 / (1 + np.exp(-X @ beta))
    beta = beta + np.linalg.solve(X.T @ (X * (p * (1 - p))[:, None]), X.T @ (y - p))
`, setupNote: PY_STATS_NOTE + ' Também já existe `beta` com os coeficientes (intercepto, é_B, é_desktop) da logística.' }),
        quiz('Uma razão de chances de 1,4 para o grupo B significa...', ['B converte 40 pontos percentuais a mais', 'As chances de conversão em B são 1,4 vezes as de A, mantendo o resto fixo', 'B tem 40% dos usuários', 'A probabilidade em B é 1,4'], 1),
        quiz('Por que não usar regressão linear para prever churn (0/1)?', ['É mais lenta', 'Pode prever probabilidades fora de [0, 1] e os erros violam os pressupostos', 'Não aceita dummies', 'Não existe'], 1),
      ],
    },
  ],
};

export const ST_POWER = {
  id: 'st-u11', title: 'Poder, tamanho de amostra e CUPED', description: 'Planejamento de experimentos e redução de variância',
  lessons: [
    {
      id: 'st-11-1', title: 'Poder estatístico e MDE',
      steps: [
        theory('Planejando antes de testar', `
Quatro grandezas estão amarradas; fixando três, a quarta fica determinada:

- **α** (erro tipo I, normalmente 5%)
- **Poder** = 1 − β (normalmente 80%)
- **Tamanho do efeito** (a diferença que você quer detectar)
- **n** (tamanho da amostra por grupo)

O **MDE** (efeito mínimo detectável) é o menor efeito que o teste detecta com o poder desejado, dado o n:

**MDE ≈ (z₁₋α/₂ + z_poder) · √(2 · p(1 − p) ÷ n)**

Com α = 5% e poder = 80%: z₁₋α/₂ + z_poder ≈ 1,96 + 0,84 = 2,80.

> Testes sem poder suficiente desperdiçam tráfego e, quando "dão significativo", **superestimam** o efeito (maldição do vencedor).
`),
        py('Escreva `mde(p, n)` com α = 5% e poder = 80% (use 1,959964 e 0,841621) e calcule `mde_2000` para p = 0,10 e n = 1.000 por grupo.',
          r`from math import sqrt
def mde(p, n):
    return (1.959964 + 0.841621) * sqrt(2 * p * (1 - p) / n)
mde_2000 = mde(0.10, 1000)`,
          r`from math import sqrt
assert abs(mde(0.5, 100) - 2.801585 * sqrt(0.005)) < 1e-9
assert abs(mde_2000 - 2.801585 * sqrt(2 * 0.09 / 1000)) < 1e-9`,
          { starter: 'from math import sqrt\n' }),
        py('Estime o **poder por simulação**: escreva `poder_simulado(p1, p2, n, sims=2000, seed=0)` que gera conversões com `rng.binomial(n, p)` para cada grupo, aplica o teste z de duas proporções (|z| > 1,96) e devolve a fração de simulações que rejeitam H₀.',
          r`def poder_simulado(p1, p2, n, sims=2000, seed=0):
    rng = np.random.default_rng(seed)
    a = rng.binomial(n, p1, sims) / n
    b = rng.binomial(n, p2, sims) / n
    pool = (a + b) / 2
    ep = np.sqrt(pool * (1 - pool) * 2 / n)
    z = np.divide(b - a, ep, out=np.zeros(sims), where=ep > 0)
    return float(np.mean(np.abs(z) > 1.96))`,
          r`import numpy as np
a = poder_simulado(0.10, 0.10, 1000)
assert 0.02 < a < 0.09, f"sem efeito, a taxa de rejeição deveria ser ~5% (deu {a})"
b = poder_simulado(0.10, 0.13, 1772)
assert 0.72 < b < 0.88, f"com n = 1772 o poder deveria ser ~80% (deu {b})"`,
          { ...NP, setup: 'import numpy as np', starter: 'def poder_simulado(p1, p2, n, sims=2000, seed=0):\n    ' }),
        quiz('Seu teste pode detectar no mínimo 3 pontos percentuais, mas o efeito realista é de 0,5 ponto. O que fazer?', ['Rodar mesmo assim', 'Aumentar muito a amostra, reduzir variância (ex.: CUPED) ou repensar a métrica', 'Reduzir o α para 1%', 'Parar o teste quando der significativo'], 1),
        quiz('Num teste com pouco poder que "deu significativo", o efeito estimado tende a ser...', ['Subestimado', 'Superestimado (maldição do vencedor)', 'Exato', 'Zero'], 1),
      ],
    },
    {
      id: 'st-11-2', title: 'Redução de variância com CUPED',
      steps: [
        theory('Usando o comportamento anterior', `
A variância da métrica é o inimigo do poder. O **CUPED** (Controlled-experiment Using Pre-Experiment Data) usa uma **covariável pré-experimento** X (ex.: gasto do usuário nas semanas anteriores), que não é afetada pelo tratamento:

- **θ = cov(X, Y) ÷ var(X)**
- **Y_cuped = Y − θ · (X − média de X)**

A média de Y_cuped é a mesma de Y, mas a variância cai pelo fator **(1 − ρ²)**, onde ρ é a correlação entre X e Y. Com ρ = 0,7, a variância cai 49%: é como ter quase **o dobro de usuários**.

É usado em praticamente todas as grandes plataformas de experimentação.
`),
        py('No DataFrame `exp` (colunas `pre`, `pos`, `grupo`), calcule `theta`, a Series `y_cuped` e `reducao` = 1 − var(y_cuped) ÷ var(pos).',
          r`theta = np.cov(exp["pre"], exp["pos"])[0, 1] / np.var(exp["pre"], ddof=1)
y_cuped = exp["pos"] - theta * (exp["pre"] - exp["pre"].mean())
reducao = 1 - y_cuped.var() / exp["pos"].var()`,
          r`t = np.cov(exp.pre, exp.pos)[0, 1] / exp.pre.var()
yc = exp.pos - t * (exp.pre - exp.pre.mean())
assert abs(theta - t) < 1e-9
assert np.allclose(np.asarray(y_cuped), np.asarray(yc))
rho = exp.pre.corr(exp.pos)
assert abs(reducao - rho ** 2) < 0.01 and reducao > 0.3`,
          { packages: PD, setup: r`import numpy as np
import pandas as pd
rng = np.random.default_rng(11)
n = 4000
pre = rng.gamma(2.0, 50.0, n)
grupo = np.where(np.arange(n) % 2 == 0, "A", "B")
pos = 0.8 * pre + rng.normal(0, 45, n) + np.where(grupo == "B", 6.0, 0.0)
exp = pd.DataFrame({"pre": pre, "pos": pos, "grupo": grupo})`, setupNote: 'Já carregado: `exp`, um experimento simulado com 4.000 usuários: `pre` (gasto antes do teste), `pos` (gasto durante o teste) e `grupo` (A/B). Também `np` e `pd`.' }),
        py('Compare o **erro padrão** da diferença de médias (B − A) com a métrica original e com CUPED. Guarde em `ep_orig` e `ep_cuped` (use `var()` amostral de cada grupo ÷ n). A variável `y_cuped` já está calculada.',
          r`def ep(s):
    a = s[exp["grupo"] == "A"]
    b = s[exp["grupo"] == "B"]
    return np.sqrt(a.var() / len(a) + b.var() / len(b))
ep_orig = ep(exp["pos"])
ep_cuped = ep(y_cuped)`,
          r`def _ep(s):
    a = s[exp.grupo == "A"]; b = s[exp.grupo == "B"]
    return np.sqrt(a.var() / len(a) + b.var() / len(b))
assert abs(ep_orig - _ep(exp.pos)) < 1e-9 and abs(ep_cuped - _ep(y_cuped)) < 1e-9
assert ep_cuped < ep_orig * 0.8`,
          { packages: PD, setup: r`import numpy as np
import pandas as pd
rng = np.random.default_rng(11)
n = 4000
pre = rng.gamma(2.0, 50.0, n)
grupo = np.where(np.arange(n) % 2 == 0, "A", "B")
pos = 0.8 * pre + rng.normal(0, 45, n) + np.where(grupo == "B", 6.0, 0.0)
exp = pd.DataFrame({"pre": pre, "pos": pos, "grupo": grupo})
theta = np.cov(exp["pre"], exp["pos"])[0, 1] / exp["pre"].var()
y_cuped = exp["pos"] - theta * (exp["pre"] - exp["pre"].mean())`, setupNote: 'Já carregados: `exp` (pre, pos, grupo), `theta` e `y_cuped`, além de `np` e `pd`.' }),
        quiz('Por que a covariável do CUPED precisa ser medida **antes** do experimento?', ['Por ser mais barata', 'Para não ser afetada pelo tratamento, senão o ajuste distorce o efeito', 'Para ter mais linhas', 'Não precisa'], 1),
        quiz('Se a correlação entre o gasto anterior e o atual é 0,6, a variância cai cerca de...', ['6%', '36%', '60%', '0%'], 1, 'Redução ≈ ρ² = 0,36.'),
      ],
    },
  ],
};

// ════════════════════════════════════════════ NÍVEL 4 · ESPECIALISTA
export const ST_BAYES = {
  id: 'st-u12', title: 'Inferência bayesiana', description: 'Priors, posteriors, Beta-Binomial, probabilidade de B ser melhor e shrinkage',
  lessons: [
    {
      id: 'st-12-1', title: 'Raciocínio bayesiano e Beta-Binomial',
      steps: [
        theory('Probabilidade como grau de crença', `
Na estatística **bayesiana**, o parâmetro desconhecido (ex.: a taxa de conversão θ) tem uma **distribuição de probabilidade** que é atualizada com os dados:

**posterior ∝ verossimilhança × prior**

- **Prior**: o que você acredita antes dos dados
- **Verossimilhança**: quão prováveis são os dados para cada valor de θ
- **Posterior**: crença atualizada

Para taxas, o par **Beta-Binomial** é conjugado: com prior **Beta(a, b)** e s sucessos em n tentativas, a posterior é **Beta(a + s, b + n − s)**. A média da posterior é (a + s) ÷ (a + b + n).

Prior Beta(1, 1) = uniforme (não informativo). Um prior Beta(10, 90) equivale a "já vi 100 usuários com 10% de conversão".
`),
        theory('A pergunta que o negócio faz', `
O frequentista responde "se não houvesse diferença, quão surpreendentes seriam esses dados?" (p-valor). O bayesiano responde diretamente **"qual a probabilidade de B ser melhor que A?"**:

~~~python
rng = np.random.default_rng(0)
amostras_a = rng.beta(a_a, b_a, 100_000)
amostras_b = rng.beta(a_b, b_b, 100_000)
prob_b_melhor = (amostras_b > amostras_a).mean()
~~~

O **intervalo de credibilidade** de 95% contém o parâmetro com 95% de probabilidade, **dado o modelo e o prior**: a interpretação intuitiva que muita gente atribui (erroneamente) ao intervalo de confiança.
`),
        py('Com prior Beta(1, 1), calcule as posteriores da conversão de A e de B em `ab`. Guarde os parâmetros em `post_a = (a, b)` e `post_b = (a, b)`, e a média posterior de B em `media_b`.',
          r`def posterior(conv, a0=1, b0=1):
    s = int(conv.sum())
    n = len(conv)
    return (a0 + s, b0 + n - s)
post_a = posterior(ab.loc[ab["grupo"] == "A", "converteu"])
post_b = posterior(ab.loc[ab["grupo"] == "B", "converteu"])
media_b = post_b[0] / (post_b[0] + post_b[1])`,
          r`sa = int(ab[ab.grupo == "A"].converteu.sum()); sb = int(ab[ab.grupo == "B"].converteu.sum())
assert tuple(post_a) == (1 + sa, 1 + 1000 - sa) and tuple(post_b) == (1 + sb, 1 + 1000 - sb)
assert abs(media_b - (1 + sb) / 1002) < 1e-12`, S),
        py('Por **Monte Carlo** (100.000 amostras de cada posterior, `rng = np.random.default_rng(0)`), estime `prob_b_melhor` = P(θ_B > θ_A). As posteriores estão em `post_a` e `post_b`.',
          r`rng = np.random.default_rng(0)
amostras_a = rng.beta(post_a[0], post_a[1], 100_000)
amostras_b = rng.beta(post_b[0], post_b[1], 100_000)
prob_b_melhor = (amostras_b > amostras_a).mean()`,
          r`rng2 = np.random.default_rng(99)
ref = (rng2.beta(*post_b, 200_000) > rng2.beta(*post_a, 200_000)).mean()
assert abs(prob_b_melhor - ref) < 0.01 and prob_b_melhor > 0.95`,
          { ...S, setup: PY_STATS + r`
_s = lambda g: int(ab[ab.grupo == g].converteu.sum())
post_a = (1 + _s("A"), 1 + 1000 - _s("A"))
post_b = (1 + _s("B"), 1 + 1000 - _s("B"))
`, setupNote: PY_STATS_NOTE + ' Também `post_a` e `post_b`, os parâmetros (a, b) das posteriores Beta.' }),
        quiz('Qual afirmação é correta sobre um intervalo de **credibilidade** de 95% [0,12; 0,16]?', ['95% dos usuários convertem nesse intervalo', 'Dado o modelo e o prior, há 95% de probabilidade de a taxa estar entre 0,12 e 0,16', 'Em 95% das repetições o intervalo contém a taxa', 'É o mesmo que o p-valor'], 1),
        quiz('Com prior Beta(2, 18) e 30 conversões em 100 usuários, a posterior é...', ['Beta(30, 70)', 'Beta(32, 88)', 'Beta(2, 18)', 'Beta(32, 70)'], 1, 'Beta(2 + 30, 18 + 70) = Beta(32, 88).'),
      ],
    },
    {
      id: 'st-12-2', title: 'Credibilidade, perda esperada e shrinkage',
      steps: [
        theory('Decidir com a posterior inteira', `
Com amostras da posterior, qualquer pergunta vira uma conta simples:

- **Lift relativo**: θ_B ÷ θ_A − 1, calculado amostra a amostra
- **Intervalo de credibilidade**: percentis 2,5 e 97,5 das amostras
- **Perda esperada** de escolher B: média de max(θ_A − θ_B, 0). Decida quando a perda esperada ficar abaixo de um limiar de tolerância (ex.: 0,1 ponto percentual)

**Shrinkage (encolhimento)**: estimativas com poucos dados são puxadas para a média geral. A **média bayesiana** de notas faz isso:

média_bayes = (C · m + soma das notas) ÷ (C + n)

onde m é a média global e C é o "peso" do prior (quantas avaliações fictícias de valor m). Produto com 3 notas 5 não passa à frente de um com 400 notas e média 4,8.
`),
        py('Com 100.000 amostras de cada posterior (`rng = np.random.default_rng(1)`), calcule as amostras do **lift** relativo de B sobre A (`lift`), o intervalo de credibilidade de 95% em `ic_lift` (array com os percentis 2,5 e 97,5) e a **perda esperada** de escolher B em `perda_b`.',
          r`rng = np.random.default_rng(1)
a = rng.beta(post_a[0], post_a[1], 100_000)
b = rng.beta(post_b[0], post_b[1], 100_000)
lift = b / a - 1
ic_lift = np.percentile(lift, [2.5, 97.5])
perda_b = np.maximum(a - b, 0).mean()`,
          r`assert len(lift) == 100_000
assert np.allclose(ic_lift, np.percentile(lift, [2.5, 97.5]))
assert ic_lift[0] < np.median(lift) < ic_lift[1] and ic_lift[1] > 0
assert 0 <= perda_b < 0.005`,
          { ...S, setup: PY_STATS + r`
_s = lambda g: int(ab[ab.grupo == g].converteu.sum())
post_a = (1 + _s("A"), 1 + 1000 - _s("A"))
post_b = (1 + _s("B"), 1 + 1000 - _s("B"))
`, setupNote: PY_STATS_NOTE + ' Também `post_a` e `post_b`, os parâmetros (a, b) das posteriores Beta.' }),
        py('Calcule a **média bayesiana** das notas por produto com C = 20: crie a Series `bayes` indexada por `produto_id`. Use m = média global das notas.',
          r`C = 20
m = avaliacoes["nota"].mean()
g = avaliacoes.groupby("produto_id")["nota"]
bayes = (C * m + g.sum()) / (C + g.count())`,
          r`m = avaliacoes.nota.mean(); g = avaliacoes.groupby("produto_id").nota
ref = (20 * m + g.sum()) / (20 + g.count())
assert np.allclose(bayes.sort_index().to_numpy(), ref.sort_index().to_numpy())
assert (bayes - m).abs().max() < (g.mean() - m).abs().max()`, S),
        sql('Calcule a média bayesiana das notas por produto em SQL (C = 20, m = média global). Colunas: produto_id, n, media (3 casas), media_bayes (3 casas). Ordene pela média bayesiana, da maior para a menor.',
          'WITH g AS (SELECT AVG(nota) AS m FROM avaliacoes) SELECT produto_id, COUNT(*) AS n, ROUND(AVG(nota), 3) AS media, ROUND((20 * g.m + SUM(nota)) / (20 + COUNT(*)), 3) AS media_bayes FROM avaliacoes, g GROUP BY produto_id ORDER BY media_bayes DESC;',
          { ordered: true }),
        quiz('Por que a média bayesiana é melhor que a média simples para rankear produtos?', ['É mais rápida', 'Puxa para a média geral os produtos com poucas avaliações, evitando que 2 notas 5 vençam 400 notas altas', 'Remove notas baixas', 'Sempre aumenta as notas'], 1),
      ],
    },
  ],
};

export const ST_MLE = {
  id: 'st-u13', title: 'Verossimilhança e simulação', description: 'Máxima verossimilhança, AIC e Monte Carlo',
  lessons: [
    {
      id: 'st-13-1', title: 'Máxima verossimilhança',
      steps: [
        theory('O princípio da máxima verossimilhança', `
A **verossimilhança** L(θ) mede quão prováveis são os dados observados para cada valor do parâmetro θ. O **estimador de máxima verossimilhança** (MLE) é o θ que maximiza L. Na prática maximizamos o **log** (somas em vez de produtos):

| modelo | log-verossimilhança | MLE |
|---|---|---|
| Bernoulli(p) | Σ [y·ln p + (1 − y)·ln(1 − p)] | p̂ = média de y |
| Normal(μ, σ²) | −n/2·ln(2πσ²) − Σ(x − μ)² ÷ 2σ² | μ̂ = média, σ̂² = Σ(x − x̄)² ÷ **n** |
| Exponencial(λ) | n·ln λ − λ·Σx | λ̂ = 1 ÷ média |
| Poisson(λ) | Σ [x·ln λ − λ − ln x!] | λ̂ = média |

Quando não há fórmula fechada (logística, modelos mistos), usa-se otimização numérica (\`scipy.optimize.minimize\` no **negativo** do log). Para comparar modelos: **AIC = 2k − 2·ln L** (menor é melhor; k = número de parâmetros).
`),
        py('Escreva `loglik(p, y)` (log-verossimilhança Bernoulli) e faça uma **busca em grade** com `np.linspace(0.01, 0.99, 981)` para achar o p que maximiza a verossimilhança de `ab["converteu"]`. Guarde em `p_mle`.',
          r`def loglik(p, y):
    return np.sum(y * np.log(p) + (1 - y) * np.log(1 - p))
y = ab["converteu"].to_numpy()
grade = np.linspace(0.01, 0.99, 981)
valores = [loglik(p, y) for p in grade]
p_mle = grade[int(np.argmax(valores))]`,
          r`yy = ab.converteu.to_numpy()
assert abs(loglik(0.5, np.array([1, 0])) - 2 * np.log(0.5)) < 1e-12
assert abs(p_mle - yy.mean()) <= 0.0006`, S),
        py('Os tempos (em dias) entre compras de um cliente seguem uma exponencial. Calcule o MLE `lam` = 1 ÷ média para o array `tempos`, e o **AIC** do modelo exponencial em `aic` (k = 1; log-verossimilhança = n·ln λ − λ·Σx).',
          r`lam = 1 / tempos.mean()
loglik = len(tempos) * np.log(lam) - lam * tempos.sum()
aic = 2 * 1 - 2 * loglik`,
          r`l = 1 / tempos.mean()
assert abs(lam - l) < 1e-12
assert abs(aic - (2 - 2 * (len(tempos) * np.log(l) - l * tempos.sum()))) < 1e-9`,
          { ...NP, setup: 'import numpy as np\nrng = np.random.default_rng(3)\ntempos = rng.exponential(12.0, 300)', setupNote: 'Já carregado: `tempos`, 300 intervalos entre compras (em dias), e `np`.' }),
        quiz('O MLE da variância de uma normal divide por...', ['n − 1', 'n', 'n + 1', '2n'], 1, 'Por isso ele é levemente viesado; a versão amostral (n − 1) corrige o viés.'),
        quiz('Dois modelos: A com AIC 812 e B com AIC 798. Qual preferir?', ['A', 'B (menor AIC)', 'Tanto faz', 'O que tiver mais parâmetros'], 1),
      ],
    },
    {
      id: 'st-13-2', title: 'Simulação de Monte Carlo',
      steps: [
        theory('Quando a conta é difícil, simule', `
**Monte Carlo** estima quantidades sorteando muitos cenários aleatórios e tirando médias. Pela **lei dos grandes números**, a média das simulações converge para o valor verdadeiro, com erro proporcional a **1 ÷ √N** (para reduzir o erro pela metade, simule 4x mais).

Aplicações em dados:
- Probabilidade de bater uma meta, dado o que se sabe sobre a taxa de conversão
- Poder de um teste com desenho complicado
- Propagação de incerteza (várias métricas incertas combinadas)
- Risco (valor em risco, estoque, filas)

Receita: (1) modele as incertezas como distribuições, (2) sorteie cenários, (3) calcule o resultado de cada um, (4) resuma (média, percentis, probabilidade de um evento).
`),
        py('Simule o próximo mês do checkout novo: a taxa de conversão é incerta, θ ~ Beta(141, 861) (posterior de B), e haverá 2.000 visitantes. Com `rng = np.random.default_rng(42)` e 20.000 cenários, sorteie θ e depois as vendas ~ Binomial(2000, θ). Guarde a probabilidade de vender **pelo menos 270** em `prob_meta` e o intervalo de 90% das vendas em `ic90` (percentis 5 e 95).',
          r`rng = np.random.default_rng(42)
theta = rng.beta(141, 861, 20_000)
vendas = rng.binomial(2000, theta)
prob_meta = (vendas >= 270).mean()
ic90 = np.percentile(vendas, [5, 95])`,
          r`r2 = np.random.default_rng(7)
ref = (r2.binomial(2000, r2.beta(141, 861, 200_000)) >= 270).mean()
assert abs(prob_meta - ref) < 0.02
assert ic90[0] < 281 < ic90[1]`,
          { ...NP, setup: 'import numpy as np' }),
        quiz('Uma simulação com 10.000 cenários tem erro de ±1 ponto. Para chegar a ±0,5 ponto, são necessários cerca de...', ['20.000 cenários', '40.000 cenários', '15.000 cenários', '100.000 cenários'], 1),
        quiz('Por que sortear primeiro θ da posterior e só depois as vendas, em vez de usar a taxa média fixa?', ['É mais rápido', 'Para incluir a incerteza sobre a própria taxa, além da aleatoriedade das vendas', 'Para ter menos variância', 'Não faz diferença'], 1),
      ],
    },
  ],
};

export const ST_CAUSAL = {
  id: 'st-u14', title: 'Inferência causal', description: 'Confundimento, DAGs, diferença em diferenças e escore de propensão',
  lessons: [
    {
      id: 'st-14-1', title: 'Confundimento e diferença em diferenças',
      steps: [
        theory('Correlação, causalidade e confundidores', `
Um **confundidor** afeta ao mesmo tempo o "tratamento" e o resultado, criando associação sem causalidade. Exemplo: clientes que usam cupom gastam mais, mas quem recebe cupom já era mais engajado.

Três estruturas básicas de um **DAG** (grafo causal):

| estrutura | forma | o que fazer |
|---|---|---|
| **confundidor** | X ← Z → Y | **controlar** Z |
| **mediador** | X → M → Y | **não** controlar M se quer o efeito total |
| **colisor** | X → C ← Y | **nunca** controlar C (cria associação falsa) |

O **experimento aleatório** quebra todas as setas que chegam ao tratamento, por isso é o padrão-ouro. Sem ele, há métodos **quase-experimentais**: diferença em diferenças, regressão descontínua, variáveis instrumentais, controle sintético, escore de propensão.
`),
        theory('Diferença em diferenças (DiD)', `
Uma mudança aconteceu só em algumas lojas (tratadas). Comparar antes e depois mistura o efeito com a tendência geral; comparar tratadas e controle mistura com diferenças de base. O **DiD** desconta as duas:

**DiD = (depois − antes)_tratadas − (depois − antes)_controle**

Pressuposto central: **tendências paralelas** (sem a intervenção, os dois grupos teriam evoluído igual). Verifique olhando os períodos anteriores.

Em regressão: **y = β₀ + β₁·tratado + β₂·depois + β₃·(tratado × depois)**, e **β₃ é o efeito DiD**.
`),
        py('No painel `painel` (colunas loja, tratado, depois, receita), calcule o efeito **DiD** a partir das 4 médias e guarde em `did`.',
          r`m = painel.groupby(["tratado", "depois"])["receita"].mean()
did = (m[(1, 1)] - m[(1, 0)]) - (m[(0, 1)] - m[(0, 0)])`,
          r`mm = painel.groupby(["tratado", "depois"]).receita.mean()
ref = (mm[(1, 1)] - mm[(1, 0)]) - (mm[(0, 1)] - mm[(0, 0)])
assert abs(did - ref) < 1e-9 and 300 < did < 700`,
          { packages: PD, setup: r`import numpy as np
import pandas as pd
rng = np.random.default_rng(21)
linhas = []
for loja in range(40):
    tratado = int(loja < 20)
    base = 5000 + 800 * tratado + rng.normal(0, 300)
    for semana in range(16):
        depois = int(semana >= 8)
        receita = base + 40 * semana + 500 * tratado * depois + rng.normal(0, 250)
        linhas.append((loja, tratado, depois, semana, receita))
painel = pd.DataFrame(linhas, columns=["loja", "tratado", "depois", "semana", "receita"])`, setupNote: 'Já carregado: `painel`, 40 lojas × 16 semanas. As lojas 0–19 receberam um novo layout a partir da semana 8 (`tratado` = 1, `depois` = 1). Colunas: loja, tratado, depois, semana, receita.' }),
        py('Estime o DiD por **regressão** com interação: monte `X` com as colunas const, tratado, depois e tratado × depois, rode `np.linalg.lstsq` e guarde os coeficientes em `beta`. O efeito DiD é `beta[3]`.',
          r`X = np.column_stack([np.ones(len(painel)), painel["tratado"], painel["depois"], painel["tratado"] * painel["depois"]]).astype(float)
beta, *_ = np.linalg.lstsq(X, painel["receita"].to_numpy(dtype=float), rcond=None)`,
          r`mm = painel.groupby(["tratado", "depois"]).receita.mean()
ref = (mm[(1, 1)] - mm[(1, 0)]) - (mm[(0, 1)] - mm[(0, 0)])
assert abs(beta[3] - ref) < 1e-6`,
          { packages: PD, setup: r`import numpy as np
import pandas as pd
rng = np.random.default_rng(21)
linhas = []
for loja in range(40):
    tratado = int(loja < 20)
    base = 5000 + 800 * tratado + rng.normal(0, 300)
    for semana in range(16):
        depois = int(semana >= 8)
        receita = base + 40 * semana + 500 * tratado * depois + rng.normal(0, 250)
        linhas.append((loja, tratado, depois, semana, receita))
painel = pd.DataFrame(linhas, columns=["loja", "tratado", "depois", "semana", "receita"])`, setupNote: 'Já carregado: `painel` (loja, tratado, depois, semana, receita), `np` e `pd`.' }),
        quiz('Num estudo, você controla a variável "foi internado no hospital" ao analisar dois fatores de risco. Ela é causada pelos dois fatores. Que erro é esse?', ['Nenhum', 'Controlar um colisor, o que cria associação falsa entre os fatores', 'Confundimento', 'Erro tipo II'], 1),
        quiz('Qual o pressuposto central do DiD?', ['Normalidade', 'Tendências paralelas entre tratados e controle na ausência da intervenção', 'Amostras do mesmo tamanho', 'Ausência de outliers'], 1),
      ],
    },
    {
      id: 'st-14-2', title: 'Escore de propensão e estratificação',
      steps: [
        theory('Comparando parecidos com parecidos', `
Sem experimento, quem recebeu o tratamento costuma ser diferente de quem não recebeu. O **escore de propensão** e(x) = P(tratado | x) resume as características observadas x numa única probabilidade. Comparando unidades com propensão parecida, equilibramos x entre os grupos.

Técnicas:
- **Estratificação**: divida em faixas de x (ou da propensão) e faça a média ponderada das diferenças dentro de cada faixa
- **Pareamento (matching)**: para cada tratado, encontre controle(s) com propensão próxima
- **IPW** (ponderação pelo inverso da probabilidade): peso 1/e(x) nos tratados e 1/(1 − e(x)) nos controles

Limites: só corrige confundidores **observados**; exige **sobreposição** (positividade): em toda faixa deve haver tratados e controles.
`),
        py('Em `clientes` (idade, usou_cupom, gasto), o cupom foi oferecido mais a clientes mais velhos, que já gastam mais. Calcule a diferença **ingênua** de gasto (com − sem cupom) em `ingenuo`. Depois **estratifique** a idade em 5 faixas (`pd.cut(..., 5)`), calcule a diferença dentro de cada faixa e a média ponderada pelo número de clientes da faixa em `efeito_estrat`.',
          r`ingenuo = clientes.loc[clientes["usou_cupom"] == 1, "gasto"].mean() - clientes.loc[clientes["usou_cupom"] == 0, "gasto"].mean()
clientes["faixa"] = pd.cut(clientes["idade"], 5)
efeitos = []
pesos = []
for _, g in clientes.groupby("faixa", observed=True):
    com = g.loc[g["usou_cupom"] == 1, "gasto"]
    sem = g.loc[g["usou_cupom"] == 0, "gasto"]
    if len(com) and len(sem):
        efeitos.append(com.mean() - sem.mean())
        pesos.append(len(g))
efeito_estrat = np.average(efeitos, weights=pesos)`,
          r`c = clientes
ing = c[c.usou_cupom == 1].gasto.mean() - c[c.usou_cupom == 0].gasto.mean()
assert abs(ingenuo - ing) < 1e-9
assert abs(efeito_estrat - 20) < abs(ingenuo - 20), "a estratificação deveria chegar mais perto do efeito real (20)"
assert abs(efeito_estrat - 20) < 6`,
          { packages: PD, setup: r`import numpy as np
import pandas as pd
rng = np.random.default_rng(5)
n = 5000
idade = rng.uniform(18, 70, n)
prob = 1 / (1 + np.exp(-(idade - 45) / 6))
usou_cupom = (rng.random(n) < prob).astype(int)
gasto = 50 + 3 * idade + 20 * usou_cupom + rng.normal(0, 15, n)
clientes = pd.DataFrame({"idade": idade, "usou_cupom": usou_cupom, "gasto": gasto})`, setupNote: 'Já carregado: `clientes` (5.000 linhas: idade, usou_cupom, gasto), `np` e `pd`. O efeito real do cupom nos dados simulados é +20.' }),
        quiz('Numa faixa de idade só existem clientes tratados, nenhum controle. Qual pressuposto foi violado?', ['Tendências paralelas', 'Sobreposição (positividade)', 'Normalidade', 'Independência'], 1),
        quiz('O escore de propensão corrige o viés causado por...', ['Qualquer confundidor', 'Somente confundidores observados e incluídos no modelo', 'Erros de medida', 'Amostras pequenas'], 1),
      ],
    },
  ],
};

export const ST_EXPADV = {
  id: 'st-u15', title: 'Experimentação avançada', description: 'Testes sequenciais, SRM, bandits e análise de sobrevivência',
  lessons: [
    {
      id: 'st-15-1', title: 'Espiar resultados, SRM e testes sequenciais',
      steps: [
        theory('O custo de espiar', `
Olhar o p-valor todo dia e parar no primeiro "significativo" transforma um erro de 5% em 20–30%: em cada espiada há uma nova chance de falso positivo.

Soluções:
- **Horizonte fixo**: defina n antes e só decida no fim
- **Testes sequenciais**: limites mais rígidos nas espiadas iniciais (O'Brien-Fleming, *alpha spending*) ou p-valores "sempre válidos" (mSPRT)
- **Métricas de guarda (guardrails)**: latência, erros e cancelamentos monitorados para parar cedo só por **dano**

**SRM (Sample Ratio Mismatch)**: se o desenho era 50/50 e você observa 52/48 com muitos usuários, algo quebrou (bug de atribuição, filtro, bot). Teste com qui-quadrado: χ² = Σ (observado − esperado)² ÷ esperado, 1 grau de liberdade; acima de 3,84 (ou p < 0,001, usual em SRM), **não confie no teste**.
`),
        py('Simule **500 testes A/A** (sem efeito, taxa 10%) com 2.000 usuários por grupo, espiando o teste z em **10 momentos** (a cada 200 usuários por grupo). Use `rng = np.random.default_rng(1)`. Guarde em `taxa_falso_positivo` a fração de testes que deram |z| > 1,96 em **alguma** espiada.',
          r`rng = np.random.default_rng(1)
falsos = 0
for _ in range(500):
    a = rng.random(2000) < 0.10
    b = rng.random(2000) < 0.10
    for n in range(200, 2001, 200):
        pa, pb = a[:n].mean(), b[:n].mean()
        p = (pa + pb) / 2
        ep = np.sqrt(p * (1 - p) * 2 / n)
        if ep > 0 and abs(pb - pa) / ep > 1.96:
            falsos += 1
            break
taxa_falso_positivo = falsos / 500`,
          r`assert 0.10 < taxa_falso_positivo < 0.40, f"esperado bem acima de 5% (deu {taxa_falso_positivo})"`,
          { ...NP, setup: 'import numpy as np' }),
        sql('Verifique **SRM** no experimento: calcule o qui-quadrado da divisão entre os grupos contra o esperado 50/50 (4 casas). Uma coluna, chi2.',
          'WITH g AS (SELECT grupo, COUNT(*) AS n FROM experimento_ab GROUP BY grupo), t AS (SELECT SUM(n) / 2.0 AS esperado FROM g) SELECT ROUND(SUM((n - esperado) * (n - esperado) / esperado), 4) AS chi2 FROM g, t;'),
        quiz('O teste foi desenhado 50/50, mas os grupos têm 50.400 e 49.600 usuários. O que fazer?', ['Ignorar, a diferença é pequena', 'Calcular o SRM: com esse volume, o χ² é ~6,4 e indica problema de atribuição; investigar antes de confiar no resultado', 'Descartar o grupo maior', 'Repetir com 10% do tráfego'], 1),
        quiz('Para poder parar um teste antes do planejado sem inflar o erro, use...', ['O p-valor comum toda manhã', 'Um desenho sequencial (alpha spending ou mSPRT)', 'Um α maior', 'Menos usuários'], 1),
      ],
    },
    {
      id: 'st-15-2', title: 'Bandits e Thompson Sampling',
      steps: [
        theory('Explorar ou explorar o que já funciona', `
No teste A/B clássico, metade do tráfego fica na pior variante até o fim. O **multi-armed bandit** realoca o tráfego **durante** o teste, equilibrando:

- **Exploração**: testar opções para aprender
- **Aproveitamento (exploitation)**: usar a melhor opção conhecida

Estratégias:
- **ε-greedy**: escolhe a melhor na maior parte das vezes e uma aleatória com probabilidade ε
- **UCB**: escolhe a opção com maior limite superior de confiança (otimismo diante da incerteza)
- **Thompson Sampling**: para cada opção, sorteia uma taxa da posterior Beta e escolhe a maior. Simples, bayesiano e muito eficiente

Use bandits quando o objetivo é **ganhar durante o teste** (manchetes, ofertas efêmeras). Use A/B quando o objetivo é **aprender o efeito com precisão** (decisões de produto duradouras).
`),
        py('Simule **Thompson Sampling** com 3 variantes de taxas reais `[0.05, 0.07, 0.10]` por 3.000 rodadas (`rng = np.random.default_rng(7)`), começando com Beta(1, 1). Em cada rodada: sorteie uma taxa de cada posterior, escolha a maior, observe a conversão (`rng.random() < taxa_real`) e atualize. Guarde em `escolhas` (array com quantas vezes cada variante foi escolhida).',
          r`taxas = [0.05, 0.07, 0.10]
rng = np.random.default_rng(7)
sucessos = np.ones(3)
fracassos = np.ones(3)
escolhas = np.zeros(3, dtype=int)
for _ in range(3000):
    amostras = rng.beta(sucessos, fracassos)
    k = int(np.argmax(amostras))
    escolhas[k] += 1
    if rng.random() < taxas[k]:
        sucessos[k] += 1
    else:
        fracassos[k] += 1`,
          r`assert int(np.sum(escolhas)) == 3000
assert int(np.argmax(escolhas)) == 2, "a melhor variante (10%) deveria receber mais tráfego"
assert escolhas[2] > 1500`,
          { ...NP, setup: 'import numpy as np' }),
        quiz('Qual a principal desvantagem de um bandit em relação a um teste A/B?', ['Perde mais conversões', 'A estimativa do efeito das variantes ruins fica imprecisa (recebem pouco tráfego) e a análise é mais complexa', 'Não funciona com 3 variantes', 'Exige mais tráfego para ganhar'], 1),
        quiz('Para escolher a manchete de uma notícia que vale por 6 horas, o mais adequado é...', ['Teste A/B de 2 semanas', 'Bandit (ex.: Thompson Sampling)', 'Pesquisa de opinião', 'Regressão logística'], 1),
      ],
    },
    {
      id: 'st-15-3', title: 'Análise de sobrevivência',
      steps: [
        theory('Tempo até um evento, com dados censurados', `
Quanto tempo um cliente fica assinando? Muitos ainda **não cancelaram** quando os dados foram extraídos: seus tempos são **censurados** (sabemos só que duram *pelo menos* tanto). Descartá-los ou tratá-los como cancelamentos distorce tudo.

O estimador de **Kaplan-Meier** lida com isso:

**S(t) = Π (1 − dᵢ ÷ nᵢ)** sobre os tempos de evento tᵢ ≤ t

- dᵢ = eventos (cancelamentos) no tempo tᵢ
- nᵢ = em risco em tᵢ (ainda ativos e observados até tᵢ)

S(t) é a proporção que "sobrevive" além de t. Daí saem a **mediana de sobrevivência**, curvas por plano ou canal (compare com o teste **log-rank**) e, com covariáveis, o **modelo de Cox** (*hazard ratios*). Biblioteca em Python: \`lifelines\`.
`),
        py('Em `assinaturas` (colunas `meses`, `cancelou`), implemente o **Kaplan-Meier**: para cada tempo com cancelamentos, calcule em risco, eventos e a sobrevivência acumulada. Guarde um DataFrame `km` com as colunas `tempo` e `sobrevivencia`, ordenado por tempo.',
          r`linhas = []
s = 1.0
for t in sorted(assinaturas.loc[assinaturas["cancelou"] == 1, "meses"].unique()):
    em_risco = (assinaturas["meses"] >= t).sum()
    eventos = ((assinaturas["meses"] == t) & (assinaturas["cancelou"] == 1)).sum()
    s *= 1 - eventos / em_risco
    linhas.append((t, s))
km = pd.DataFrame(linhas, columns=["tempo", "sobrevivencia"])`,
          r`a = assinaturas; s = 1.0; ref = []
for t in sorted(a[a.cancelou == 1].meses.unique()):
    s *= 1 - ((a.meses == t) & (a.cancelou == 1)).sum() / (a.meses >= t).sum()
    ref.append(s)
assert list(km.columns) == ["tempo", "sobrevivencia"]
assert np.allclose(km["sobrevivencia"].to_numpy(), ref)
assert (np.diff(km["sobrevivencia"].to_numpy()) <= 1e-12).all() and 0 < km["sobrevivencia"].iloc[-1] < 1`,
          { packages: PD, setup: r`import numpy as np
import pandas as pd
rng = np.random.default_rng(8)
n = 600
tempo_real = np.ceil(rng.exponential(14, n)).astype(int)
observado_ate = rng.integers(1, 25, n)
meses = np.minimum(tempo_real, observado_ate)
cancelou = (tempo_real <= observado_ate).astype(int)
assinaturas = pd.DataFrame({"meses": meses, "cancelou": cancelou})`, setupNote: 'Já carregado: `assinaturas` (600 clientes: `meses` de assinatura observados e `cancelou` = 1 se cancelou, 0 se ainda estava ativo, ou seja, censurado), `np` e `pd`.' }),
        py('A partir de `km`, encontre a **mediana de sobrevivência**: o primeiro tempo em que a sobrevivência fica **≤ 0,5**. Guarde em `mediana`.',
          r`mediana = km.loc[km["sobrevivencia"] <= 0.5, "tempo"].iloc[0]`,
          r`assert mediana == km[km.sobrevivencia <= 0.5].tempo.iloc[0]`,
          { packages: PD, setup: r`import numpy as np
import pandas as pd
rng = np.random.default_rng(8)
n = 600
tempo_real = np.ceil(rng.exponential(14, n)).astype(int)
observado_ate = rng.integers(1, 25, n)
meses = np.minimum(tempo_real, observado_ate)
cancelou = (tempo_real <= observado_ate).astype(int)
assinaturas = pd.DataFrame({"meses": meses, "cancelou": cancelou})
_l = []; _s = 1.0
for t in sorted(assinaturas.loc[assinaturas.cancelou == 1, "meses"].unique()):
    _s *= 1 - ((assinaturas.meses == t) & (assinaturas.cancelou == 1)).sum() / (assinaturas.meses >= t).sum()
    _l.append((t, _s))
km = pd.DataFrame(_l, columns=["tempo", "sobrevivencia"])`, setupNote: 'Já carregados: `assinaturas` e a tabela `km` (tempo, sobrevivencia) do exercício anterior.' }),
        quiz('Um cliente está ativo há 8 meses quando os dados são extraídos. Na análise de sobrevivência ele é...', ['Descartado', 'Uma observação censurada: sabemos que durou pelo menos 8 meses', 'Um cancelamento no mês 8', 'Um outlier'], 1),
        quiz('Para comparar estatisticamente as curvas de sobrevivência de dois planos, usa-se...', ['Teste t', 'Teste log-rank', 'Qui-quadrado de aderência', 'ANOVA'], 1),
      ],
    },
  ],
};
