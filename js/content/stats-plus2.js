// Conteúdo adicional da trilha de Estatística (parte 2: níveis Avançado e Especialista):
// séries temporais, não paramétricos, modelagem preditiva, não supervisionado,
// inferência causal quase-experimental e métricas de produto.
import { theory, quiz, order, sql, py, exPy, exSql } from './helpers.js';
import { PY_STATS, PY_STATS_NOTE } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];
const S = { setup: PY_STATS, setupNote: PY_STATS_NOTE, packages: PD };
const N = { setup: 'import numpy as np', setupNote: '`np` (NumPy) já importado.', packages: ['numpy'] };
const NS = (extra, note) => ({ setup: 'import numpy as np\n' + extra, setupNote: note, packages: ['numpy'] });
const PS = (extra, note) => ({ setup: 'import numpy as np\nimport pandas as pd\n' + extra, setupNote: note, packages: PD });

// Dados sintéticos reprodutíveis usados nas lições novas
const CLASSIF = r`
rng = np.random.default_rng(11)
n = 1000
x1 = rng.normal(0, 1, n)
x2 = rng.normal(0, 1, n)
score = 1 / (1 + np.exp(-(-1.2 + 1.5 * x1 + 0.8 * x2)))
y = (rng.random(n) < score).astype(int)
`;
const CLASSIF_NOTE = '`y` (1.000 rótulos reais 0/1: o cliente cancelou?), `score` (probabilidade prevista pelo modelo), `x1`, `x2` (preditores) e `np` já carregados.';

const CLUST = r`
rng = np.random.default_rng(21)
centros = np.array([[20, 2, 150], [90, 1, 60], [10, 8, 900]], dtype=float)
grupo_real = rng.integers(0, 3, 300)
X = centros[grupo_real] + rng.normal(0, 1, (300, 3)) * np.array([6, 0.7, 60])
clientes = pd.DataFrame(X, columns=["recencia", "frequencia", "valor"]).round(1)
`;
const CLUST_NOTE = '`clientes` (300 clientes com recencia em dias, frequencia de compras/mês e valor gasto) e a matriz `X` com os mesmos dados, além de `np` e `pd`.';

const COORTE = r`
rng = np.random.default_rng(31)
linhas = []
for coorte in range(1, 7):
    n = int(rng.integers(180, 260))
    for u in range(n):
        p_ativo = 0.62
        for mes in range(coorte, 7):
            if mes == coorte or rng.random() < p_ativo:
                linhas.append((f"c{coorte}-{u}", coorte, mes))
                p_ativo = 0.78
            else:
                break
atividade = pd.DataFrame(linhas, columns=["usuario", "coorte", "mes"])
`;
const COORTE_NOTE = '`atividade` (uma linha por usuário e mês ativo: usuario, coorte = mês de entrada 1–6, mes = mês de atividade), `np` e `pd`.';

const RATIO = r`
rng = np.random.default_rng(41)
n = 4000
grupo = np.where(rng.random(n) < 0.5, "A", "B")
sessoes = rng.poisson(5, n) + 1
taxa = np.where(grupo == "B", 0.105, 0.10) * rng.lognormal(0, 0.3, n)
cliques = rng.binomial(sessoes, np.clip(taxa, 0, 1))
usuarios = pd.DataFrame({"grupo": grupo, "sessoes": sessoes, "cliques": cliques})
`;
const RATIO_NOTE = '`usuarios` (4.000 usuários de um teste: grupo, sessoes, cliques), `np` e `pd`. A métrica é o CTR = cliques ÷ sessões.';

// ───────────────────────────────────────────── NÍVEL AVANÇADO

const L_TS2 = {
  id: 'st-6-4', title: 'Estacionariedade, suavização exponencial e ARIMA',
  steps: [
    theory('Estacionariedade e diferenciação', `
Uma série é **estacionária** quando suas propriedades (média, variância, autocorrelação) **não mudam com o tempo**. A maioria dos modelos clássicos (ARIMA) supõe estacionariedade, e séries com tendência ou sazonalidade não são estacionárias.

**Como tornar estacionária:**
- **diferenciação:** trabalhar com a variação \`y(t) − y(t−1)\` remove tendência linear (\`s.diff()\`)
- **diferença sazonal:** \`y(t) − y(t−7)\` em dados diários remove o padrão semanal (\`s.diff(7)\`)
- **log** antes de diferenciar estabiliza variâncias que crescem com o nível; log-diferença ≈ variação percentual

**Testes:** o **ADF** (Dickey-Fuller aumentado, \`statsmodels.tsa.stattools.adfuller\`) tem H₀ = "a série tem raiz unitária (não é estacionária)"; p < 0,05 sugere estacionariedade. O **KPSS** tem a hipótese oposta; usar os dois juntos dá mais segurança.

**Passeio aleatório** (y(t) = y(t−1) + ruído) é o exemplo clássico de série não estacionária: parece ter tendências, mas são só acúmulo de ruído. Correlacionar duas séries assim gera **correlações espúrias**; correlacione as diferenças.
`),
    theory('Suavização exponencial e a família ARIMA', `
**Suavização exponencial simples (SES):** a previsão é uma média ponderada em que o peso dos valores passados cai exponencialmente:

nível(t) = α · y(t) + (1 − α) · nível(t−1), e a previsão para t+1 é o nível(t).

- α perto de 1: reage rápido (quase "amanhã = hoje")
- α perto de 0: muito suave (quase a média histórica)

**Holt** acrescenta a **tendência**; **Holt-Winters** acrescenta a **sazonalidade** (ETS). Em Python: \`statsmodels.tsa.holtwinters.ExponentialSmoothing\`.

**ARIMA(p, d, q):**
- **AR(p):** o valor depende dos p valores anteriores
- **I(d):** a série é diferenciada d vezes para ficar estacionária
- **MA(q):** depende dos q erros anteriores
- **SARIMA** acrescenta termos sazonais; com variáveis externas (feriados, preço), **SARIMAX**

Escolha de p e q: gráficos ACF/PACF ou critério de informação (AIC). Alternativas modernas: Prophet, modelos de gradient boosting com variáveis de calendário.

**Validação de séries temporais:** nunca embaralhe. Treine no passado e teste no futuro (*backtesting* com janela deslizante), e compare sempre com a **baseline ingênua sazonal**.
`),
    exPy('Diferenciação e suavização exponencial na receita total', `
`, r`total = diarias.groupby("data")["receita"].sum()
dif7 = total.diff(7)
meio = len(total) // 2
print(f"média 1º semestre {total[:meio].mean():.0f} × 2º {total[meio:].mean():.0f}  (série original)")
print(f"média 1º semestre {dif7[:meio].mean():.0f} × 2º {dif7[meio:].mean():.0f}  (diferença sazonal)")

def ses(y, alfa):
    nivel = y[0]
    prev = [np.nan]
    for v in y[:-1]:
        nivel = alfa * v + (1 - alfa) * nivel
        prev.append(nivel)
    return np.array(prev)

y = total.to_numpy()
for alfa in [0.1, 0.3, 0.8]:
    p = ses(y, alfa)
    print(f"α={alfa}: MAE {np.nanmean(np.abs(y[1:] - p[1:])):.0f}")
print(f"ingênua sazonal: MAE {np.mean(np.abs(y[7:] - y[:-7])):.0f}")`, `
A diferença sazonal remove boa parte da mudança de nível entre os semestres. A suavização simples ignora o padrão semanal; por isso, nessa série, a ingênua sazonal pode ser difícil de bater.
`, S),
    py('Implemente `ses_previsoes(y, alfa)`: devolve um array do mesmo tamanho de `y` com a previsão um passo à frente da suavização exponencial simples (a primeira posição é `np.nan`; o nível começa em `y[0]` e, a cada passo, nivel = alfa·y[t] + (1 − alfa)·nivel; a previsão de t+1 é o nível depois de ver y[t]).',
      r`def ses_previsoes(y, alfa):
    y = np.asarray(y, dtype=float)
    prev = np.full(len(y), np.nan)
    nivel = y[0]
    for t in range(len(y) - 1):
        nivel = alfa * y[t] + (1 - alfa) * nivel
        prev[t + 1] = nivel
    return prev`,
      r`p = ses_previsoes([10, 12, 11, 15], 0.5)
assert np.isnan(p[0]) and np.allclose(p[1:], [10.0, 11.0, 11.0])
p2 = ses_previsoes([5, 5, 5], 0.3)
assert np.allclose(p2[1:], [5, 5])`, N),
    py('Com a série `total` (receita total por dia), crie `dif` = a primeira diferença (`diff()`), `dif7` = a diferença sazonal de 7 dias e `acf7_dif7` = a autocorrelação de lag 7 de `dif7` sem nulos.',
      r`total = diarias.groupby("data")["receita"].sum()
dif = total.diff()
dif7 = total.diff(7)
acf7_dif7 = dif7.dropna().autocorr(7)`,
      r`t = diarias.groupby("data").receita.sum()
assert dif.isna().sum() == 1 and dif7.isna().sum() == 7
assert abs(acf7_dif7 - t.diff(7).dropna().autocorr(7)) < 1e-12`, S),
    quiz('Uma série cresce 2% ao mês de forma constante. O que a torna estacionária?', ['Diferenciar o log (variação percentual)', 'Ordenar os valores', 'Usar a mediana', 'Remover o primeiro mês'], 0),
    quiz('No ARIMA(1, 1, 1), o "1" do meio significa...', ['A série é diferenciada uma vez', 'Um termo sazonal', 'Uma variável externa', 'Uma previsão'], 0),
    quiz('Por que não usar validação cruzada com embaralhamento em séries temporais?', ['Vaza informação do futuro para o treino', 'É mais lenta', 'Não funciona com datas', 'Reduz o R²'], 0),
  ],
};

const L_NONPAR2 = {
  id: 'st-9-3', title: 'Wilcoxon pareado, Kruskal-Wallis e teste exato de Fisher',
  steps: [
    theory('Alternativas não paramétricas para cada situação', `
| situação | paramétrico | não paramétrico |
|---|---|---|
| 1 amostra ou pares (antes/depois) | t pareado | **Wilcoxon dos postos sinalizados** |
| 2 grupos independentes | t de Welch | **Mann-Whitney** |
| 3+ grupos independentes | ANOVA | **Kruskal-Wallis** |
| tabela 2×2 com contagens pequenas | qui-quadrado | **exato de Fisher** |
| correlação | Pearson | **Spearman**, **Kendall** |

**Wilcoxon pareado:** calcule as diferenças, descarte as zero, ordene os **valores absolutos** e atribua postos; some os postos das diferenças positivas (W⁺). Se não há efeito, W⁺ fica perto de n(n + 1)/4.

**Kruskal-Wallis:** junte todos os grupos, atribua postos, e compare a média dos postos de cada grupo com a média geral:

H = 12 ÷ (N(N + 1)) · Σ nⱼ · (R̄ⱼ − (N + 1)/2)²

Sob H₀, H segue aproximadamente um qui-quadrado com k − 1 graus de liberdade (3 grupos: crítico 5,99 a 5%).

**Kendall (τ):** proporção de pares **concordantes** menos discordantes; mais robusto que Spearman em amostras pequenas e com empates.
`),
    theory('Teste exato de Fisher', `
Com contagens pequenas (esperado < 5 em alguma célula), a aproximação do qui-quadrado falha. O **teste exato de Fisher** calcula a probabilidade exata de cada tabela possível com os mesmos totais de linhas e colunas, usando a **distribuição hipergeométrica**:

P(a) = C(a + b, a) · C(c + d, c) ÷ C(n, a + c)

para a tabela

| | sucesso | fracasso |
|---|---|---|
| grupo 1 | a | b |
| grupo 2 | c | d |

O p-valor soma as probabilidades das tabelas tão ou mais extremas que a observada. Em Python: \`scipy.stats.fisher_exact([[a, b], [c, d]])\`.

Exemplo clássico: num piloto com 10 clientes em cada grupo, 7 converteram no B e 2 no A. O qui-quadrado não é confiável com essas contagens; Fisher é.
`),
    exPy('Kruskal-Wallis e Wilcoxon calculados na mão', `
`, r`d = diarias.copy()
d["posto"] = d["receita"].rank()
N = len(d)
g = d.groupby("loja")["posto"].agg(["count", "mean"])
H = 12 / (N * (N + 1)) * (g["count"] * (g["mean"] - (N + 1) / 2) ** 2).sum()
print(g.round(1))
print(f"H = {H:.1f} (crítico 5,99 para 2 gl)")

antes = np.array([3.1, 4.5, 2.2, 5.8, 3.9, 6.1, 2.7, 4.8])
depois = np.array([2.8, 4.6, 1.9, 5.1, 3.5, 5.6, 2.8, 4.1])
dif = depois - antes
postos = pd.Series(np.abs(dif)).rank().to_numpy()
w_mais = postos[dif > 0].sum()
print(f"W+ = {w_mais} | esperado sob H0: {len(dif) * (len(dif) + 1) / 4}")`, `
O H enorme mostra que as lojas diferem em posição. No Wilcoxon, W⁺ muito abaixo do esperado indica que a maioria das diferenças é negativa (o tempo caiu).
`, S),
    py('Implemente o Kruskal-Wallis para `diarias`, comparando a **receita entre os dias da semana** (`diarias["data"].dt.dayofweek`): crie `H` com a fórmula 12/(N(N+1)) · Σ nⱼ(R̄ⱼ − (N+1)/2)², usando os postos da receita.',
      r`d = diarias.assign(dia=diarias["data"].dt.dayofweek, posto=diarias["receita"].rank())
N = len(d)
g = d.groupby("dia")["posto"].agg(["count", "mean"])
H = 12 / (N * (N + 1)) * (g["count"] * (g["mean"] - (N + 1) / 2) ** 2).sum()`,
      r`rk = diarias.receita.rank(); N = len(diarias)
gg = rk.groupby(diarias.data.dt.dayofweek).agg(["count", "mean"])
ref = 12 / (N * (N + 1)) * (gg["count"] * (gg["mean"] - (N + 1) / 2) ** 2).sum()
assert abs(H - ref) < 1e-9`, S),
    py('Calcule a probabilidade **hipergeométrica** de a tabela 2×2 ter exatamente `a = 7` sucessos no grupo B, com 10 clientes por grupo e 9 sucessos no total: P = C(10, 7)·C(10, 2) ÷ C(20, 9). Guarde em `p_tabela`.',
      r`from math import comb
p_tabela = comb(10, 7) * comb(10, 2) / comb(20, 9)`,
      r`from math import comb
assert abs(p_tabela - 120 * 45 / 167960) < 1e-12`),
    quiz('Para comparar a satisfação (nota de 1 a 5) entre 4 regiões, com distribuição muito assimétrica, use...', ['Kruskal-Wallis', 'ANOVA', 't pareado', 'Fisher'], 0),
    quiz('Numa tabela 2×2 com 3 conversões no total, qual teste usar?', ['Exato de Fisher', 'Qui-quadrado', 't de Welch', 'Regressão linear'], 0),
  ],
};

const L_CV = {
  id: 'st-16-1', title: 'Viés-variância, overfitting e validação cruzada',
  steps: [
    theory('O dilema viés-variância', `
O erro de previsão de um modelo em **dados novos** se decompõe em:

**erro esperado = viés² + variância + ruído irredutível**

- **Viés:** erro por o modelo ser **simples demais** para o padrão real (uma reta para uma curva). Sintoma: erro alto no treino **e** no teste (**underfitting**)
- **Variância:** o modelo muda muito com pequenas mudanças nos dados de treino, porque é **flexível demais** e aprende o ruído. Sintoma: erro baixo no treino e alto no teste (**overfitting**)
- **Ruído:** a parte imprevisível, que nenhum modelo elimina

Aumentar a complexidade (mais variáveis, polinômio de grau maior, árvore mais profunda) reduz o viés e aumenta a variância. O ponto ótimo minimiza o erro **no teste**.

**Como reduzir a variância:** mais dados, menos variáveis, regularização (ridge/lasso), modelos mais simples, combinação de modelos (bagging, florestas).
`),
    theory('Treino, validação, teste e validação cruzada', `
**Nunca avalie um modelo nos dados em que ele foi treinado.** Separe:

| conjunto | uso |
|---|---|
| **treino** | ajustar os parâmetros |
| **validação** | escolher hiperparâmetros (grau, alpha, profundidade) e comparar modelos |
| **teste** | estimativa final, usada **uma vez** no fim |

**Validação cruzada k-fold:** divida os dados em k partes; treine k vezes, cada vez deixando uma parte de fora para avaliar; reporte a média (e o desvio) dos k erros. Usa todos os dados para treino e para avaliação, com estimativa mais estável que uma única divisão. k = 5 ou 10 é o padrão.

Variações: **estratificada** (mantém a proporção das classes), **por grupo** (o mesmo cliente nunca em treino e teste ao mesmo tempo), **temporal** (sempre treinar no passado e testar no futuro).

**Vazamento de dados (data leakage):** qualquer informação do teste que chega ao treino infla o desempenho: padronizar com a média de todos os dados, imputar com estatísticas globais, usar variáveis que só existem depois do evento (ex.: "data de cancelamento" para prever cancelamento).

**Métricas de regressão:** MAE (erro absoluto médio, na unidade), RMSE (pune erros grandes), R² fora da amostra, MAPE (cuidado com valores perto de zero).
`),
    exPy('Overfitting com polinômios', `
Dados de uma curva suave com ruído; ajustamos polinômios de graus crescentes e medimos o erro no treino e no teste.
`, r`rng = np.random.default_rng(0)
x = np.sort(rng.uniform(-3, 3, 60))
y = np.sin(x) + rng.normal(0, 0.3, 60)
idx = rng.permutation(60)
tr, te = idx[:40], idx[40:]
for grau in [1, 3, 5, 9, 15]:
    coef = np.polyfit(x[tr], y[tr], grau)
    rmse = lambda i: np.sqrt(np.mean((y[i] - np.polyval(coef, x[i])) ** 2))
    print(f"grau {grau:>2}: RMSE treino {rmse(tr):.3f} | teste {rmse(te):.3f}")`, `
O erro de treino só cai com o grau; o de teste cai até um ponto e depois sobe: o modelo passou a decorar o ruído (overfitting). O melhor grau é o de menor erro no **teste**.
`, N),
    py('Implemente `kfold_indices(n, k, seed=0)` que embaralha `range(n)` com `np.random.default_rng(seed).permutation(n)` e devolve uma lista de `k` arrays de teste (use `np.array_split`).',
      r`def kfold_indices(n, k, seed=0):
    idx = np.random.default_rng(seed).permutation(n)
    return np.array_split(idx, k)`,
      r`folds = kfold_indices(10, 3)
assert len(folds) == 3 and sorted(np.concatenate(folds)) == list(range(10))
assert [len(f) for f in folds] == [4, 3, 3]`, N),
    py('Faça uma validação cruzada **5-fold** do modelo `receita ~ visitantes` em `diarias`: para cada fold, ajuste `np.polyfit` nos outros 4 e calcule o RMSE no fold. Use `folds = np.array_split(np.random.default_rng(0).permutation(len(diarias)), 5)`. Crie `rmses` (lista com 5 valores) e `rmse_cv` (a média).',
      r`x = diarias["visitantes"].to_numpy(dtype=float)
y = diarias["receita"].to_numpy(dtype=float)
folds = np.array_split(np.random.default_rng(0).permutation(len(diarias)), 5)
rmses = []
for teste in folds:
    treino = np.setdiff1d(np.arange(len(y)), teste)
    b, a = np.polyfit(x[treino], y[treino], 1)
    rmses.append(np.sqrt(np.mean((y[teste] - (a + b * x[teste])) ** 2)))
rmse_cv = np.mean(rmses)`,
      r`x = diarias.visitantes.to_numpy(float); y = diarias.receita.to_numpy(float)
fs = np.array_split(np.random.default_rng(0).permutation(len(y)), 5); ref = []
for te in fs:
    tr = np.setdiff1d(np.arange(len(y)), te); b, a = np.polyfit(x[tr], y[tr], 1)
    ref.append(np.sqrt(np.mean((y[te] - a - b * x[te]) ** 2)))
assert len(rmses) == 5 and np.allclose(rmses, ref) and abs(rmse_cv - np.mean(ref)) < 1e-9`, S),
    quiz('Erro de treino 2%, erro de teste 25%. Diagnóstico:', ['Overfitting (alta variância)', 'Underfitting (alto viés)', 'Modelo ideal', 'Vazamento impossível'], 0),
    quiz('Padronizar todas as variáveis com a média e o desvio do conjunto inteiro antes de separar treino e teste é...', ['Vazamento de dados', 'A prática recomendada', 'Irrelevante', 'Necessário para k-fold'], 0),
    quiz('Para prever vendas do próximo mês, qual validação usar?', ['Temporal: treinar no passado e testar em períodos posteriores', 'k-fold embaralhado', 'Avaliar no próprio treino', 'Leave-one-out aleatório'], 0),
  ],
};

const L_CLASSIF = {
  id: 'st-16-2', title: 'Métricas de classificação',
  steps: [
    theory('Matriz de confusão e as métricas que saem dela', `
Um classificador transforma uma probabilidade (score) em decisão com um **limiar**: prevê 1 se score ≥ 0,5, por exemplo. Comparando com o real:

| | previsto 1 | previsto 0 |
|---|---|---|
| **real 1** | VP (verdadeiro positivo) | FN (falso negativo) |
| **real 0** | FP (falso positivo) | VN (verdadeiro negativo) |

| métrica | fórmula | pergunta |
|---|---|---|
| **acurácia** | (VP + VN) ÷ total | quantos acertos no geral? |
| **precisão** | VP ÷ (VP + FP) | dos que o modelo apontou, quantos eram de fato? |
| **recall** (sensibilidade) | VP ÷ (VP + FN) | dos casos reais, quantos o modelo pegou? |
| **especificidade** | VN ÷ (VN + FP) | dos negativos reais, quantos ficaram de fora? |
| **F1** | 2 · precisão · recall ÷ (precisão + recall) | equilíbrio entre os dois |

**Classes desbalanceadas:** com 2% de fraude, um modelo que diz sempre "não fraude" tem 98% de acurácia e é inútil. Use precisão, recall, F1, AUC-PR.

**Qual priorizar:** recall quando perder um caso é caro (fraude, doença, churn de cliente valioso); precisão quando agir é caro (bloquear um cartão, ligar para o cliente).
`),
    theory('Limiar, ROC, AUC, log loss e calibração', `
**O limiar é uma decisão de negócio.** Baixá-lo aumenta o recall e reduz a precisão. Escolha pelo **custo**: se um FN custa R$ 500 e um FP custa R$ 20, prefira um limiar baixo.

**Curva ROC:** taxa de verdadeiros positivos (recall) × taxa de falsos positivos (1 − especificidade) para **todos** os limiares. A **AUC** (área sob a curva) vai de 0,5 (sorteio) a 1 (perfeito) e tem uma leitura intuitiva: é a **probabilidade de um positivo sorteado receber score maior que um negativo sorteado**. Não depende do limiar.

**Curva precisão-recall** e **AUC-PR**: mais informativas que a ROC quando os positivos são raros.

**Log loss** (entropia cruzada): −média[y·log(p) + (1 − y)·log(1 − p)]. Pune muito a confiança errada (prever 0,99 para algo que não aconteceu). É a perda que a regressão logística minimiza.

**Calibração:** um modelo calibrado que diz "30%" deve acertar cerca de 30% das vezes. Cheque agrupando os scores em faixas e comparando a média prevista com a taxa real. Calibração importa quando a probabilidade é usada em contas (valor esperado, preço de seguro). **Brier score** = média de (p − y)².
`),
    exPy('Métricas para diferentes limiares', `
`, r`for lim in [0.3, 0.5, 0.7]:
    prev = (score >= lim).astype(int)
    vp = ((prev == 1) & (y == 1)).sum(); fp = ((prev == 1) & (y == 0)).sum()
    fn = ((prev == 0) & (y == 1)).sum(); vn = ((prev == 0) & (y == 0)).sum()
    prec, rec = vp / (vp + fp), vp / (vp + fn)
    print(f"limiar {lim}: VP={vp} FP={fp} FN={fn} VN={vn} | acurácia {(vp + vn) / len(y):.3f} precisão {prec:.3f} recall {rec:.3f} F1 {2 * prec * rec / (prec + rec):.3f}")
pos, neg = score[y == 1], score[y == 0]
auc = (pos[:, None] > neg[None, :]).mean() + 0.5 * (pos[:, None] == neg[None, :]).mean()
print(f"AUC = {auc:.3f} | taxa de positivos = {y.mean():.3f}")`, `
Subir o limiar troca recall por precisão. A AUC foi calculada pela definição: a fração de pares (positivo, negativo) em que o positivo tem score maior.
`, NS(CLASSIF, CLASSIF_NOTE)),
    py('Com o limiar 0,5, crie `vp`, `fp`, `fn`, `vn` (contagens da matriz de confusão), `precisao`, `recall` e `f1`.',
      r`prev = (score >= 0.5).astype(int)
vp = int(((prev == 1) & (y == 1)).sum())
fp = int(((prev == 1) & (y == 0)).sum())
fn = int(((prev == 0) & (y == 1)).sum())
vn = int(((prev == 0) & (y == 0)).sum())
precisao = vp / (vp + fp)
recall = vp / (vp + fn)
f1 = 2 * precisao * recall / (precisao + recall)`,
      r`pr = score >= 0.5
assert vp == (pr & (y == 1)).sum() and fp == (pr & (y == 0)).sum() and fn == (~pr & (y == 1)).sum() and vn == (~pr & (y == 0)).sum()
assert vp + fp + fn + vn == len(y)
assert abs(f1 - 2 * vp / (2 * vp + fp + fn)) < 1e-12`, NS(CLASSIF, CLASSIF_NOTE)),
    py('Calcule a **AUC** pela definição: a proporção de pares (positivo, negativo) em que o score do positivo é maior (empates contam 0,5). Guarde em `auc`. Depois calcule `logloss` = −média(y·log(score) + (1 − y)·log(1 − score)).',
      r`pos, neg = score[y == 1], score[y == 0]
auc = (pos[:, None] > neg[None, :]).mean() + 0.5 * (pos[:, None] == neg[None, :]).mean()
logloss = -np.mean(y * np.log(score) + (1 - y) * np.log(1 - score))`,
      r`order_ = np.argsort(score); rk = np.empty(len(score)); rk[order_] = np.arange(1, len(score) + 1)
n1 = y.sum(); n0 = len(y) - n1
ref = (rk[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)
assert abs(auc - ref) < 1e-9 and 0.5 < auc < 1
assert abs(logloss + np.mean(y * np.log(score) + (1 - y) * np.log(1 - score))) < 1e-12`, NS(CLASSIF, CLASSIF_NOTE)),
    py('Verifique a **calibração**: divida os scores em 5 faixas iguais com `pd.cut(score, bins=[0, 0.2, 0.4, 0.6, 0.8, 1])` e crie `calib`: um DataFrame indexado pela faixa com as colunas `previsto` (média do score) e `real` (média de y).',
      r`import pandas as pd
faixa = pd.cut(score, bins=[0, 0.2, 0.4, 0.6, 0.8, 1])
calib = pd.DataFrame({"score": score, "y": y, "faixa": faixa}).groupby("faixa", observed=True).agg(previsto=("score", "mean"), real=("y", "mean"))`,
      r`assert list(calib.columns) == ["previsto", "real"] and len(calib) >= 4
assert (calib["previsto"].diff().dropna() > 0).all()
assert np.allclose(calib["previsto"], calib["real"], atol=0.12)`, { ...NS(CLASSIF, CLASSIF_NOTE), packages: PD }),
    quiz('Num modelo antifraude com 1% de fraudes, a acurácia é 99%. O que concluir?', ['Nada ainda: um modelo que nunca aponta fraude também teria 99%; veja precisão e recall', 'O modelo é excelente', 'Há overfitting', 'Há vazamento'], 0),
    quiz('Uma AUC de 0,80 significa que...', ['Em 80% dos pares (positivo, negativo), o positivo recebe score maior', 'O modelo acerta 80% das previsões', '80% dos positivos são detectados', 'O limiar ideal é 0,8'], 0),
    quiz('Deixar de detectar um cliente que vai cancelar custa R$ 800; uma ação de retenção custa R$ 30. Como ajustar o limiar?', ['Baixar o limiar para aumentar o recall', 'Subir o limiar para aumentar a precisão', 'Manter 0,5 sempre', 'Usar só a acurácia'], 0),
  ],
};

const L_REG = {
  id: 'st-16-3', title: 'Regularização: ridge e lasso',
  steps: [
    theory('Penalizando coeficientes grandes', `
Com muitas variáveis (ou variáveis correlacionadas), mínimos quadrados produz coeficientes instáveis e com sobreajuste. A **regularização** adiciona à função de erro uma penalidade pelo tamanho dos coeficientes:

| método | minimiza | efeito |
|---|---|---|
| **MQO** | Σ(y − ŷ)² | sem penalidade |
| **Ridge (L2)** | Σ(y − ŷ)² + λ · Σβ² | encolhe todos os coeficientes em direção a zero; lida bem com colinearidade |
| **Lasso (L1)** | Σ(y − ŷ)² + λ · Σ\\|β\\| | zera alguns coeficientes: faz **seleção de variáveis** |
| **Elastic Net** | combinação das duas | seleção e estabilidade |

λ (em scikit-learn, \`alpha\`) controla a força: λ = 0 é o MQO; λ grande encolhe tudo. Escolha λ por **validação cruzada** (\`RidgeCV\`, \`LassoCV\`).

**Padronize as variáveis antes** (média 0, desvio 1): a penalidade depende da escala, e sem padronizar uma variável medida em reais seria penalizada de forma diferente de uma medida em milhares. O **intercepto não é penalizado**.

Ridge tem fórmula fechada: **β = (XᵀX + λI)⁻¹ Xᵀy** (com X padronizado e y centrado). É a troca viés-variância na prática: um pouco de viés por muito menos variância.
`),
    theory('Multicolinearidade e seleção de variáveis', `
**Multicolinearidade:** preditores muito correlacionados entre si (área do imóvel e número de quartos). Os coeficientes ficam instáveis, com erros padrão inflados e às vezes sinais trocados, embora as previsões possam continuar boas.

**VIF** (fator de inflação da variância) de uma variável = 1 ÷ (1 − R²ⱼ), onde R²ⱼ vem da regressão dessa variável contra as outras. VIF > 5–10 é sinal de alerta.

Soluções: remover ou combinar variáveis redundantes, ridge, PCA.

**Seleção de variáveis:** métodos passo a passo (*stepwise*) baseados em p-valor são instáveis e inflam o falso positivo. Prefira conhecimento do problema, lasso com validação cruzada ou critérios como AIC/BIC.

**Inferência × previsão:** se o objetivo é **interpretar** coeficientes (efeito de X em Y), regularização complica a inferência (os coeficientes ficam viesados de propósito). Se o objetivo é **prever** bem, ela costuma ajudar.
`),
    exPy('Ridge estabilizando coeficientes com colinearidade', `
`, r`rng = np.random.default_rng(0)
n = 80
x1 = rng.normal(0, 1, n)
x2 = x1 + rng.normal(0, 0.05, n)        # quase cópia de x1
y = 3 * x1 + rng.normal(0, 1, n)
X = np.column_stack([x1, x2])
X = (X - X.mean(0)) / X.std(0)
yc = y - y.mean()
for lam in [0, 1, 10, 100]:
    beta = np.linalg.solve(X.T @ X + lam * np.eye(2), X.T @ yc)
    print(f"λ={lam:>3}: β = {beta.round(2)}")
r2 = np.corrcoef(x1, x2)[0, 1] ** 2
print(f"VIF = {1 / (1 - r2):.0f}")`, `
Sem penalidade, os coeficientes das duas variáveis quase idênticas ficam instáveis (um grande positivo e outro compensando). Com λ, o efeito se divide de forma estável entre elas. O VIF enorme denuncia a colinearidade.
`, N),
    py('Implemente `ridge(X, y, lam)` que padroniza as colunas de X (média 0, desvio 1), centra y e devolve β = (XᵀX + λI)⁻¹Xᵀy usando `np.linalg.solve`.',
      r`def ridge(X, y, lam):
    X = np.asarray(X, dtype=float)
    Xs = (X - X.mean(axis=0)) / X.std(axis=0)
    yc = np.asarray(y, dtype=float) - np.mean(y)
    return np.linalg.solve(Xs.T @ Xs + lam * np.eye(X.shape[1]), Xs.T @ yc)`,
      r`rng = np.random.default_rng(1); X = rng.normal(size=(50, 3)); y = X @ np.array([1.0, -2.0, 0.5]) + rng.normal(size=50)
Xs = (X - X.mean(0)) / X.std(0); yc = y - y.mean()
b0 = ridge(X, y, 0); b10 = ridge(X, y, 10)
assert np.allclose(b0, np.linalg.lstsq(Xs, yc, rcond=None)[0])
assert np.linalg.norm(b10) < np.linalg.norm(b0)`, N),
    py('Calcule o **VIF** da variável `visitantes` num modelo que também tem `pedidos` como preditor em `diarias`: R² da regressão de visitantes em pedidos (`np.corrcoef(...)[0, 1] ** 2` serve, pois é regressão simples) e VIF = 1/(1 − R²). Guarde em `vif`.',
      r`r2 = np.corrcoef(diarias["visitantes"], diarias["pedidos"])[0, 1] ** 2
vif = 1 / (1 - r2)`,
      r`r2 = np.corrcoef(diarias.visitantes, diarias.pedidos)[0, 1] ** 2
assert abs(vif - 1 / (1 - r2)) < 1e-9 and vif > 1`, S),
    quiz('Qual regularização tende a zerar coeficientes e funciona como seleção de variáveis?', ['Lasso (L1)', 'Ridge (L2)', 'MQO', 'Nenhuma'], 0),
    quiz('Por que padronizar as variáveis antes de aplicar ridge ou lasso?', ['Porque a penalidade depende da escala de cada variável', 'Para acelerar o cálculo', 'Porque é obrigatório no NumPy', 'Para remover outliers'], 0),
    quiz('Como escolher o valor de λ?', ['Por validação cruzada', 'O maior possível', 'Sempre 1', 'Pelo p-valor dos coeficientes'], 0),
  ],
};

const L_PCA = {
  id: 'st-17-1', title: 'PCA: redução de dimensionalidade',
  steps: [
    theory('A ideia do PCA', `
Com muitas variáveis correlacionadas, boa parte da informação é redundante. A **Análise de Componentes Principais (PCA)** cria novas variáveis, os **componentes principais**, que são combinações lineares das originais:

- o **1º componente** é a direção de **maior variância** dos dados
- o 2º é a direção de maior variância **perpendicular** ao 1º, e assim por diante
- os componentes são **não correlacionados** entre si

**Como se calcula:**
1. **Padronize** as variáveis (média 0, desvio 1); sem isso, a variável de maior escala domina
2. Calcule a **matriz de covariância** (das variáveis padronizadas = matriz de correlação)
3. Encontre os **autovetores** (direções = componentes) e **autovalores** (variância explicada por cada um)
4. Ordene pelos autovalores e projete os dados: escores = X_padronizado @ autovetores

**Variância explicada** de cada componente = autovalor ÷ soma dos autovalores. Mantenha componentes até explicar, por exemplo, 80–90% (ou use o "cotovelo" do gráfico de variância).
`),
    theory('Para que serve e cuidados', `
**Usos:**
- **visualizar** dados de muitas dimensões num gráfico 2D (escores dos 2 primeiros componentes)
- **reduzir** variáveis antes de um modelo, eliminando multicolinearidade
- **comprimir** e remover ruído
- criar **índices** (um índice socioeconômico a partir de renda, escolaridade, acesso a serviços)

**Leitura das cargas (loadings):** os coeficientes do autovetor mostram quanto cada variável original pesa no componente. Um 1º componente com cargas parecidas em todas as variáveis costuma representar o "tamanho geral".

**Cuidados:**
- é um método **linear**; relações curvas pedem t-SNE ou UMAP (só para visualização)
- componentes são difíceis de interpretar para o negócio
- sensível a outliers
- o sinal dos autovetores é arbitrário (multiplicar por −1 dá a mesma solução)

Em Python: \`sklearn.decomposition.PCA(n_components=2).fit_transform(X_padronizado)\`; \`explained_variance_ratio_\` traz as proporções.
`),
    exPy('PCA passo a passo com NumPy', `
`, r`Z = (X - X.mean(axis=0)) / X.std(axis=0)
cov = np.cov(Z, rowvar=False)
autovalores, autovetores = np.linalg.eigh(cov)
ordem = np.argsort(autovalores)[::-1]
autovalores, autovetores = autovalores[ordem], autovetores[:, ordem]
print("variância explicada:", (autovalores / autovalores.sum()).round(3))
print("cargas do 1º componente:", dict(zip(clientes.columns, autovetores[:, 0].round(2))))
escores = Z @ autovetores[:, :2]
print("escores (3 primeiros clientes):\n", escores[:3].round(2))`, `
\`eigh\` é a decomposição para matrizes simétricas (como a de covariância). Os dois primeiros componentes concentram quase toda a variância das 3 variáveis.
`, PS(CLUST, CLUST_NOTE)),
    py('Faça o PCA de `X`: padronize (`Z`), calcule `autovalores` em ordem **decrescente** a partir de `np.linalg.eigh(np.cov(Z, rowvar=False))` e crie `explicada`: a proporção de variância explicada por cada componente.',
      r`Z = (X - X.mean(axis=0)) / X.std(axis=0)
vals, vecs = np.linalg.eigh(np.cov(Z, rowvar=False))
autovalores = np.sort(vals)[::-1]
explicada = autovalores / autovalores.sum()`,
      r`Zr = (X - X.mean(0)) / X.std(0)
ref = np.sort(np.linalg.eigvalsh(np.cov(Zr, rowvar=False)))[::-1]
assert np.allclose(autovalores, ref) and abs(explicada.sum() - 1) < 1e-12 and explicada[0] >= explicada[1] >= explicada[2]`, PS(CLUST, CLUST_NOTE)),
    py('Usando o resultado do PCA, crie `n_comp`: o **menor número de componentes** cuja variância explicada acumulada chega a pelo menos 90% (use `np.cumsum` e `np.argmax`).',
      r`Z = (X - X.mean(axis=0)) / X.std(axis=0)
vals = np.sort(np.linalg.eigvalsh(np.cov(Z, rowvar=False)))[::-1]
acum = np.cumsum(vals / vals.sum())
n_comp = int(np.argmax(acum >= 0.9) + 1)`,
      r`Zr = (X - X.mean(0)) / X.std(0)
v = np.sort(np.linalg.eigvalsh(np.cov(Zr, rowvar=False)))[::-1]
ac = np.cumsum(v / v.sum())
assert n_comp == int(np.argmax(ac >= 0.9) + 1) and 1 <= n_comp <= 3`, PS(CLUST, CLUST_NOTE)),
    quiz('Por que padronizar as variáveis antes do PCA?', ['Para que variáveis de escala maior não dominem os componentes', 'Para remover outliers', 'Porque o PCA só aceita inteiros', 'Para aumentar a variância'], 0),
    quiz('O que o autovalor de um componente representa?', ['A variância dos dados ao longo daquele componente', 'A média do componente', 'O número de variáveis', 'O p-valor'], 0),
  ],
};

const L_KMEANS = {
  id: 'st-17-2', title: 'Clustering: k-means e segmentação',
  steps: [
    theory('Como o k-means funciona', `
**Clustering** agrupa observações parecidas **sem rótulos prévios** (aprendizado não supervisionado). O **k-means** procura k grupos que minimizam a distância de cada ponto ao centro (**centroide**) do seu grupo:

1. Escolha k e sorteie k centroides iniciais
2. **Atribuição:** cada ponto vai para o centroide mais próximo (distância euclidiana)
3. **Atualização:** cada centroide passa a ser a média dos pontos do seu grupo
4. Repita 2 e 3 até as atribuições pararem de mudar

A função minimizada é a **inércia** (soma das distâncias ao quadrado dentro dos grupos). Como o resultado depende do início, rode várias vezes (\`n_init\`) e use a melhor; o k-means++ escolhe inícios espalhados.

**Padronize** as variáveis: em "dias desde a última compra" (0–365) e "valor gasto" (0–10.000), o valor dominaria a distância.
`),
    theory('Escolhendo k e avaliando os grupos', `
- **Cotovelo:** gráfico da inércia × k; escolha o k em que a queda passa a ser pequena
- **Silhueta:** para cada ponto, compara a distância média ao próprio grupo (a) com a distância média ao grupo vizinho mais próximo (b): s = (b − a) ÷ max(a, b), de −1 a 1. Média perto de 1 = grupos bem separados
- **Utilidade para o negócio:** os grupos fazem sentido e levam a ações diferentes?

**Limitações do k-means:** supõe grupos "redondos" e de tamanhos parecidos, é sensível a outliers e exige escolher k. Alternativas: **DBSCAN** (grupos de qualquer forma, detecta ruído), **clustering hierárquico** (dendrograma), **misturas gaussianas** (grupos elípticos, pertencimento probabilístico).

**Segmentação RFM**, clássica em varejo e CRM:
- **R**ecência: dias desde a última compra (menor = melhor)
- **F**requência: número de compras no período
- **M**onetário: valor total gasto

Pode-se pontuar cada dimensão por quintis (1 a 5) e combinar ("555" = campeões), ou aplicar k-means nas três variáveis padronizadas. Depois, descreva cada grupo pelas médias e dê nomes: "campeões", "em risco", "novos", "dormentes".
`),
    exPy('k-means implementado do zero', `
`, r`Z = (X - X.mean(0)) / X.std(0)
rng = np.random.default_rng(0)
centros = Z[rng.choice(len(Z), 3, replace=False)]
for it in range(20):
    dist = ((Z[:, None, :] - centros[None, :, :]) ** 2).sum(axis=2)
    rotulo = dist.argmin(axis=1)
    novos = np.array([Z[rotulo == k].mean(axis=0) for k in range(3)])
    if np.allclose(novos, centros):
        break
    centros = novos
inercia = ((Z - centros[rotulo]) ** 2).sum()
print(f"convergiu em {it} iterações | inércia {inercia:.1f}")
print(clientes.assign(grupo=rotulo).groupby("grupo").agg(["mean"]).round(1))`, `
Os três grupos aparecem nas médias: um de clientes recentes e de valor médio, um de clientes "dormentes" (recência alta), e um de compradores frequentes e de alto valor.
`, PS(CLUST, CLUST_NOTE)),
    py('Implemente `atribuir(Z, centros)` que devolve, para cada linha de `Z`, o índice do centroide mais próximo (distância euclidiana ao quadrado; use broadcasting e `argmin`).',
      r`def atribuir(Z, centros):
    dist = ((Z[:, None, :] - centros[None, :, :]) ** 2).sum(axis=2)
    return dist.argmin(axis=1)`,
      r`Zt = np.array([[0, 0], [10, 10], [0.5, 0.2], [9, 11]], dtype=float)
ct = np.array([[0, 0], [10, 10]], dtype=float)
assert list(atribuir(Zt, ct)) == [0, 1, 0, 1]`, N),
    py('Rode o k-means com k = 3 nos dados padronizados `Z = (X - X.mean(0)) / X.std(0)`: comece com `centros = Z[[0, 1, 2]]` e faça **10 iterações** (atribuir + recalcular médias). Crie `rotulo` (grupo de cada cliente) e `inercia` (soma das distâncias ao quadrado ao próprio centroide).',
      r`Z = (X - X.mean(0)) / X.std(0)
centros = Z[[0, 1, 2]].copy()
for _ in range(10):
    rotulo = ((Z[:, None, :] - centros[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
    centros = np.array([Z[rotulo == k].mean(axis=0) for k in range(3)])
rotulo = ((Z[:, None, :] - centros[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
inercia = ((Z - centros[rotulo]) ** 2).sum()`,
      r`Zr = (X - X.mean(0)) / X.std(0); c = Zr[[0, 1, 2]].copy()
for _ in range(10):
    lb = ((Zr[:, None] - c[None]) ** 2).sum(2).argmin(1); c = np.array([Zr[lb == k].mean(0) for k in range(3)])
lb = ((Zr[:, None] - c[None]) ** 2).sum(2).argmin(1)
assert len(rotulo) == 300 and len(set(rotulo)) == 3
assert abs(inercia - ((Zr - c[lb]) ** 2).sum()) < 1e-6`, PS(CLUST, CLUST_NOTE)),
    py('Crie o **score RFM por quintis** em `clientes`: `R` = quintil da recência **invertido** (`pd.qcut(clientes["recencia"], 5, labels=[5, 4, 3, 2, 1])`), `F` e `M` = quintis da frequência e do valor (labels 1 a 5). Converta para int e crie `rfm` = R + F + M.',
      r`clientes["R"] = pd.qcut(clientes["recencia"], 5, labels=[5, 4, 3, 2, 1]).astype(int)
clientes["F"] = pd.qcut(clientes["frequencia"].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
clientes["M"] = pd.qcut(clientes["valor"], 5, labels=[1, 2, 3, 4, 5]).astype(int)
clientes["rfm"] = clientes["R"] + clientes["F"] + clientes["M"]`,
      r`assert set(clientes["R"]) == {1, 2, 3, 4, 5} and set(clientes["M"]) == {1, 2, 3, 4, 5}
assert clientes.loc[clientes.recencia.idxmin(), "R"] == 5
assert (clientes["rfm"] == clientes.R + clientes.F + clientes.M).all() and clientes.rfm.between(3, 15).all()`,
      { ...PS(CLUST, CLUST_NOTE), hint: 'Se `qcut` reclamar de limites repetidos na frequência, use `.rank(method="first")` antes.' }),
    quiz('Por que padronizar as variáveis antes do k-means?', ['Porque a distância seria dominada pela variável de maior escala', 'Para o algoritmo convergir em 1 passo', 'Para escolher k', 'Não é necessário'], 0),
    quiz('Silhueta média de 0,05 sugere...', ['Grupos pouco separados', 'Grupos muito bem separados', 'k ideal', 'Erro no cálculo'], 0),
    quiz('No RFM, um cliente com R = 1, F = 5, M = 5 provavelmente é...', ['Um cliente valioso que parou de comprar (em risco)', 'Um cliente novo', 'Um campeão ativo', 'Um cliente de baixo valor'], 0),
  ],
};

// ───────────────────────────────────────────── NÍVEL ESPECIALISTA

const L_QUASI = {
  id: 'st-14-3', title: 'Regressão descontínua, variáveis instrumentais e controle sintético',
  steps: [
    theory('Regressão descontínua (RDD)', `
Quando um tratamento é dado com base num **corte** de uma variável contínua (nota ≥ 60 ganha bolsa; gasto ≥ R$ 500 vira cliente VIP), quem está **logo acima** e **logo abaixo** do corte é muito parecido. A diferença no resultado exatamente no corte estima o efeito causal **para quem está perto do corte**.

Como estimar:
1. Escolha uma **janela** (banda) em torno do corte
2. Ajuste uma reta de cada lado (resultado × variável de corte)
3. O efeito é o **salto** entre as duas retas no ponto de corte

Cuidados: a variável de corte não pode ser **manipulada** (se as pessoas conseguem ficar "logo acima", a comparação quebra; cheque a densidade de casos dos dois lados, teste de McCrary); teste várias larguras de banda; o efeito vale localmente.

**RDD difusa:** quando o corte só aumenta a **probabilidade** de tratamento, o efeito é o salto no resultado dividido pelo salto na probabilidade de tratamento.
`),
    theory('Variáveis instrumentais e controle sintético', `
**Variável instrumental (VI):** quando há confundidores **não observados**, procure uma variável Z que:
1. **afeta o tratamento** (relevância), e
2. afeta o resultado **só através do tratamento** (exclusão) e não tem relação com os confundidores

Exemplo: o efeito de um app no gasto é confundido pelo engajamento. Se um sorteio enviou convites para instalar o app (Z), o convite muda a instalação, mas não muda o gasto diretamente.

Estimador de Wald: **efeito = (diferença no resultado entre Z = 1 e Z = 0) ÷ (diferença na taxa de tratamento entre Z = 1 e Z = 0)**. Em modelos com controles, usa-se **mínimos quadrados em dois estágios (2SLS)**. Instrumentos fracos (que mudam pouco o tratamento) geram estimativas muito instáveis.

**Controle sintético:** uma única unidade foi tratada (um estado, um país, uma loja). Monte um "clone" como **média ponderada de unidades não tratadas** que reproduza bem a trajetória da tratada **antes** da intervenção. A diferença depois da intervenção estima o efeito. Os pesos são não negativos e somam 1.

| método | quando usar |
|---|---|
| DiD | grupos tratados e controle com tendências paralelas |
| RDD | tratamento definido por um corte |
| VI | confundidores não observados e um instrumento válido |
| controle sintético | poucas unidades tratadas, muitas de controle, série longa antes |
| escore de propensão | confundidores observados |
`),
    exPy('RDD com dados simulados', `
Clientes com pontuação ≥ 50 recebem um gerente de conta; o efeito verdadeiro no gasto é +40.
`, r`rng = np.random.default_rng(0)
pont = rng.uniform(0, 100, 3000)
tratado = pont >= 50
gasto = 200 + 3 * pont + 40 * tratado + rng.normal(0, 30, 3000)
print("diferença ingênua (todos):", round(gasto[tratado].mean() - gasto[~tratado].mean(), 1))
for banda in [20, 10, 5]:
    esq = (pont >= 50 - banda) & (pont < 50)
    dir_ = (pont >= 50) & (pont < 50 + banda)
    be, ae = np.polyfit(pont[esq], gasto[esq], 1)
    bd, ad = np.polyfit(pont[dir_], gasto[dir_], 1)
    print(f"banda ±{banda}: salto no corte = {(ad + bd * 50) - (ae + be * 50):.1f}")`, `
A comparação ingênua mistura o efeito com o fato de quem tem pontuação alta gastar mais. As retas locais recuperam um salto perto de 40; bandas menores têm menos viés e mais ruído.
`, N),
    py('Estime o salto no corte de uma RDD: com os arrays `x` (variável de corte, corte em 0) e `y`, ajuste uma reta com os pontos em −10 ≤ x < 0 e outra com 0 ≤ x < 10 (`np.polyfit`) e crie `efeito` = intercepto da direita − intercepto da esquerda (o valor de cada reta em x = 0).',
      r`esq = (x >= -10) & (x < 0)
dir_ = (x >= 0) & (x < 10)
be, ae = np.polyfit(x[esq], y[esq], 1)
bd, ad = np.polyfit(x[dir_], y[dir_], 1)
efeito = ad - ae`,
      r`e = (x >= -10) & (x < 0); d = (x >= 0) & (x < 10)
ref = np.polyfit(x[d], y[d], 1)[1] - np.polyfit(x[e], y[e], 1)[1]
assert abs(efeito - ref) < 1e-9 and 10 < efeito < 20`,
      NS('rng = np.random.default_rng(5)\nx = rng.uniform(-30, 30, 2000)\ny = 100 + 1.5 * x + 15 * (x >= 0) + rng.normal(0, 8, 2000)', '`x` (2.000 valores da variável de corte, corte em 0), `y` (resultado) e `np` já carregados.')),
    py('Um sorteio enviou convites (`z` = 1) para usar um app. Calcule o estimador de **Wald**: `efeito_vi` = (média de `gasto` com z = 1 − com z = 0) ÷ (média de `usou` com z = 1 − com z = 0).',
      r`efeito_vi = (gasto[z == 1].mean() - gasto[z == 0].mean()) / (usou[z == 1].mean() - usou[z == 0].mean())`,
      r`ref = (gasto[z == 1].mean() - gasto[z == 0].mean()) / (usou[z == 1].mean() - usou[z == 0].mean())
assert abs(efeito_vi - ref) < 1e-9 and 20 < efeito_vi < 40`,
      NS('rng = np.random.default_rng(9)\nn = 20000\nz = rng.integers(0, 2, n)\neng = rng.normal(0, 1, n)\nusou = ((0.8 * z + eng + rng.normal(0, 1, n)) > 0.5).astype(int)\ngasto = 100 + 30 * usou + 25 * eng + rng.normal(0, 10, n)', '`z` (convite sorteado 0/1), `usou` (usou o app 0/1), `gasto` e `np` já carregados. O engajamento, não observado, afeta uso e gasto; o efeito verdadeiro do app é 30.')),
    quiz('Numa RDD, por que comparar só quem está perto do corte?', ['Porque ali os dois lados são parecidos em tudo, exceto no tratamento', 'Para ter mais dados', 'Porque o corte é aleatório em toda a faixa', 'Para aumentar o R²'], 0),
    quiz('Qual condição um instrumento precisa satisfazer além de afetar o tratamento?', ['Afetar o resultado apenas através do tratamento', 'Ser normal', 'Ter correlação alta com o resultado por qualquer via', 'Ser contínuo'], 0),
    quiz('Uma lei mudou só em um estado. Qual método é mais natural?', ['Controle sintético', 'k-means', 'Teste t pareado', 'Bootstrap da mediana'], 0),
  ],
};

const L_RATIO = {
  id: 'st-18-1', title: 'Métricas de razão e o método delta',
  steps: [
    theory('Unidade de aleatorização × unidade de análise', `
Num teste A/B, a **unidade de aleatorização** é quem é sorteado (o usuário). Mas muitas métricas são **razões** cuja unidade é outra:

- **CTR** = cliques ÷ sessões (sessões, não usuários)
- **ticket médio** = receita ÷ pedidos
- **receita por visita**, **tempo médio por página**

O erro comum é tratar cada sessão como independente e usar a fórmula de proporção com n = número de sessões. Mas as sessões do **mesmo usuário** são correlacionadas (usuários que clicam muito o fazem em todas as sessões). Resultado: erro padrão **subestimado**, p-valores pequenos demais e falsos positivos.

Duas soluções corretas:
1. **Método delta:** fórmula para a variância de uma razão de médias calculadas por usuário
2. **Bootstrap por usuário:** reamostre usuários (não sessões) e recalcule a razão

Outra opção é mudar a métrica para uma média **por usuário** (CTR de cada usuário, depois a média), que tem outra interpretação: dá o mesmo peso a quem tem 1 sessão e a quem tem 100.
`),
    theory('A fórmula do método delta', `
A métrica é R = Ȳ ÷ X̄ (por exemplo, Y = cliques do usuário, X = sessões do usuário, médias sobre os n usuários do grupo). Pelo método delta:

**Var(R) ≈ (1 ÷ n) · [ Var(Y)/X̄² − 2·Ȳ·Cov(X, Y)/X̄³ + Ȳ²·Var(X)/X̄⁴ ]**

e o erro padrão é a raiz disso. Para comparar dois grupos independentes: EP da diferença = √(Var(R_A) + Var(R_B)), e z = (R_B − R_A) ÷ EP.

**De onde vem:** é uma aproximação de Taylor de primeira ordem da função f(ȳ, x̄) = ȳ/x̄ em torno das médias; funciona bem com amostras grandes.

**Outros usos do método delta:** variância do **lift relativo** (R_B/R_A − 1), de transformações (log de uma média) e de qualquer função suave de médias.

**Outros cuidados de métricas de produto:**
- **efeito de rede / interferência:** em marketplaces e redes sociais, o tratamento de um usuário afeta outros; aleatorize por cluster (cidade, grupo de amigos) ou faça testes *switchback* (alternando no tempo)
- **métricas de guarda (guardrails):** latência, erros, cancelamentos, que não podem piorar
- **métrica norte (north star)** × métricas de diagnóstico: decida antes qual métrica decide o teste
`),
    exPy('O erro padrão ingênuo é pequeno demais', `
`, r`res = {}
for g, d in usuarios.groupby("grupo"):
    y, x = d["cliques"].to_numpy(float), d["sessoes"].to_numpy(float)
    n = len(d)
    R = y.mean() / x.mean()
    var_delta = (y.var(ddof=1) / x.mean() ** 2 - 2 * y.mean() * np.cov(x, y)[0, 1] / x.mean() ** 3 + y.mean() ** 2 * x.var(ddof=1) / x.mean() ** 4) / n
    var_ingenua = R * (1 - R) / x.sum()          # trata cada sessão como independente
    res[g] = (R, var_delta, var_ingenua)
    print(f"{g}: CTR {R:.4f} | EP delta {np.sqrt(var_delta):.5f} | EP ingênuo {np.sqrt(var_ingenua):.5f}")
z_delta = (res["B"][0] - res["A"][0]) / np.sqrt(res["A"][1] + res["B"][1])
z_ing = (res["B"][0] - res["A"][0]) / np.sqrt(res["A"][2] + res["B"][2])
print(f"z delta {z_delta:.2f} | z ingênuo {z_ing:.2f}")`, `
O erro padrão ingênuo (sessões independentes) é menor que o do método delta, o que infla o z. Com dados reais, onde a correlação dentro do usuário é forte, a diferença pode ser grande.
`, PS(RATIO, RATIO_NOTE)),
    py('Implemente `var_razao(y, x)` com a fórmula do método delta (use `np.var(..., ddof=1)` e `np.cov(x, y)[0, 1]`) e calcule `ep_a`: o erro padrão do CTR do grupo A de `usuarios`.',
      r`def var_razao(y, x):
    y = np.asarray(y, dtype=float); x = np.asarray(x, dtype=float)
    my, mx = y.mean(), x.mean()
    return (np.var(y, ddof=1) / mx ** 2 - 2 * my * np.cov(x, y)[0, 1] / mx ** 3 + my ** 2 * np.var(x, ddof=1) / mx ** 4) / len(y)
a = usuarios[usuarios["grupo"] == "A"]
ep_a = np.sqrt(var_razao(a["cliques"], a["sessoes"]))`,
      r`a = usuarios[usuarios.grupo == "A"]; yy = a.cliques.to_numpy(float); xx = a.sessoes.to_numpy(float)
ref = (yy.var(ddof=1) / xx.mean() ** 2 - 2 * yy.mean() * np.cov(xx, yy)[0, 1] / xx.mean() ** 3 + yy.mean() ** 2 * xx.var(ddof=1) / xx.mean() ** 4) / len(yy)
assert abs(var_razao(yy, xx) - ref) < 1e-15 and abs(ep_a - np.sqrt(ref)) < 1e-12`, PS(RATIO, RATIO_NOTE)),
    py('Faça um **bootstrap por usuário** do CTR do grupo B: 500 reamostras de usuários com `rng = np.random.default_rng(0)` e `rng.integers(0, n, n)` como índices; em cada uma, CTR = soma dos cliques ÷ soma das sessões. Crie `ep_boot` (desvio padrão dos 500 CTRs).',
      r`b = usuarios[usuarios["grupo"] == "B"]
y, x = b["cliques"].to_numpy(), b["sessoes"].to_numpy()
n = len(b)
rng = np.random.default_rng(0)
ctrs = []
for _ in range(500):
    i = rng.integers(0, n, n)
    ctrs.append(y[i].sum() / x[i].sum())
ep_boot = np.std(ctrs)`,
      r`b = usuarios[usuarios.grupo == "B"]; yy = b.cliques.to_numpy(); xx = b.sessoes.to_numpy(); n = len(b)
rg = np.random.default_rng(0); cs = []
for _ in range(500):
    i = rg.integers(0, n, n); cs.append(yy[i].sum() / xx[i].sum())
assert abs(ep_boot - np.std(cs)) < 1e-12`, PS(RATIO, RATIO_NOTE)),
    quiz('Por que tratar cada sessão como independente no cálculo do erro padrão do CTR é um erro?', ['Sessões do mesmo usuário são correlacionadas, então o erro padrão fica subestimado', 'Porque sessões são poucas', 'Porque CTR não é uma proporção', 'Não é um erro'], 0),
    quiz('Num marketplace, dar desconto a compradores do grupo B esgota o estoque que o grupo A veria. Isso é...', ['Interferência / efeito de rede entre grupos', 'SRM', 'Efeito novidade', 'Viés de sobrevivência'], 0),
  ],
};

const L_COORTE = {
  id: 'st-18-2', title: 'Coortes, retenção, churn e LTV',
  steps: [
    theory('Análise de coortes', `
Uma **coorte** é um grupo de clientes que **começou no mesmo período** (mês de cadastro, mês da primeira compra). Acompanhar cada coorte ao longo do tempo separa dois efeitos que a média geral mistura:
- **efeito idade:** quanto tempo o cliente tem de casa (mês 1, mês 2...)
- **efeito calendário/coorte:** em que época ele entrou (coortes de Black Friday costumam reter menos)

A **tabela de coortes** tem uma linha por coorte e uma coluna por "idade" (meses desde a entrada); cada célula é a **retenção**: % da coorte ainda ativa naquela idade.

| coorte | mês 0 | mês 1 | mês 2 |
|---|---|---|---|
| jan | 100% | 61% | 48% |
| fev | 100% | 64% | 51% |

Ler na **horizontal** mostra a curva de retenção de uma coorte; na **vertical**, se coortes novas retêm melhor (o produto está melhorando?).

Em pandas: calcule a idade (mês da atividade − mês da coorte), conte usuários únicos por (coorte, idade) com \`pivot_table\` e divida pela coluna da idade 0.
`),
    theory('Churn, retenção e valor do cliente (LTV)', `
- **Taxa de churn mensal** = clientes que saíram no mês ÷ clientes no início do mês
- **Retenção** = 1 − churn
- Com churn constante c, a **vida média** do cliente é 1/c meses (geométrica): churn de 5% ao mês → 20 meses

**LTV (lifetime value)**, valor do cliente ao longo da vida:
- versão simples: **LTV = margem mensal por cliente ÷ churn mensal**
- com desconto financeiro d ao mês e churn constante c: **LTV = margem · (1 + d) ÷ (d + c)**; no caso geral, some as margens esperadas mês a mês trazidas a valor presente: Σ margem · retenção(t) ÷ (1 + d)ᵗ
- a partir da curva de coortes: some as margens esperadas usando a retenção observada em cada idade

**LTV ÷ CAC** (custo de aquisição de cliente): acima de ~3 é considerado saudável em muitos negócios; o **payback** é quantos meses de margem pagam o CAC.

**Cuidados:** a curva de retenção costuma **achatar** (os que ficam são mais fiéis), então churn constante subestima o LTV dos clientes que sobrevivem; coortes recentes têm poucos meses observados (censura à direita, como na análise de sobrevivência).
`),
    exPy('Tabela de coortes', `
`, r`atividade["idade"] = atividade["mes"] - atividade["coorte"]
tab = atividade.pivot_table(index="coorte", columns="idade", values="usuario", aggfunc="nunique")
retencao = tab.div(tab[0], axis=0).round(3)
print(retencao)
print("retenção média por idade:", retencao.mean().round(3).to_dict())`, `
Cada linha é uma coorte; a diagonal vazia à direita é a censura (coortes recentes ainda não chegaram às idades maiores). A queda é maior do mês 0 para o 1 e depois fica mais suave.
`, PS(COORTE, COORTE_NOTE)),
    py('Monte a tabela de retenção: crie a coluna `idade` = mes − coorte em `atividade`, depois `tab` (usuários únicos por coorte × idade, com `pivot_table(..., aggfunc="nunique")`) e `retencao` = `tab` dividida pela coluna de idade 0 de cada linha.',
      r`atividade["idade"] = atividade["mes"] - atividade["coorte"]
tab = atividade.pivot_table(index="coorte", columns="idade", values="usuario", aggfunc="nunique")
retencao = tab.div(tab[0], axis=0)`,
      r`assert (retencao[0] == 1).all() and retencao.shape == (6, 6)
c1 = atividade[atividade.coorte == 1]
assert abs(retencao.loc[1, 1] - c1[c1.mes == 2].usuario.nunique() / c1[c1.mes == 1].usuario.nunique()) < 1e-12
assert retencao.loc[6, 1:].isna().all()`, PS(COORTE, COORTE_NOTE)),
    py('Uma assinatura tem margem mensal de `margem = 40` reais, churn mensal de `churn = 0.05` e CAC de `cac = 300`. Crie `vida_media` (1/churn), `ltv` (margem ÷ churn), `ltv_cac` (ltv ÷ cac) e `payback` (meses de margem para pagar o CAC).',
      r`vida_media = 1 / churn
ltv = margem / churn
ltv_cac = ltv / cac
payback = cac / margem`,
      r`assert abs(vida_media - 20) < 1e-9 and abs(ltv - 800) < 1e-9 and abs(ltv_cac - 800 / 300) < 1e-9 and abs(payback - 7.5) < 1e-9`,
      { setup: 'margem = 40\nchurn = 0.05\ncac = 300', setupNote: '`margem = 40`, `churn = 0.05` e `cac = 300` já definidos.' }),
    quiz('A retenção no mês 1 caiu de 64% para 55% nas coortes mais recentes. O que investigar?', ['O que mudou na aquisição ou no produto para os clientes novos (canal, campanha, onboarding)', 'Nada: é ruído sempre', 'O cálculo do mês 0', 'A coorte mais antiga'], 0),
    quiz('Com churn mensal constante de 10%, qual a vida média do cliente?', ['10 meses', '90 meses', '1 mês', '100 meses'], 0),
  ],
};

const L_CEP = {
  id: 'st-18-3', title: 'Controle estatístico de processo',
  steps: [
    theory('Gráficos de controle', `
O **controle estatístico de processo (CEP)**, criado por Shewhart na indústria, separa dois tipos de variação:
- **causas comuns:** a variação natural e constante do processo (ruído)
- **causas especiais:** algo mudou (falha de sistema, campanha, mudança de fornecedor)

Um **gráfico de controle** desenha a métrica ao longo do tempo com:
- **linha central (LC):** a média do processo em um período estável de referência
- **limites de controle:** LC ± 3 desvios (cerca de 99,7% dos pontos de um processo estável caem dentro)

| gráfico | métrica | limites |
|---|---|---|
| **X̄ / individuais** | média ou valor de uma medida contínua (tempo de resposta) | x̄ ± 3·σ |
| **p** | proporção de defeitos (taxa de erro diária) | p̄ ± 3·√(p̄(1 − p̄)/nₜ), varia com o tamanho nₜ do dia |
| **c** | contagem de defeitos por unidade | c̄ ± 3·√c̄ |

Limites de controle vêm **dos dados do processo**; limites de **especificação** vêm do cliente ou do contrato. São coisas diferentes.
`),
    theory('Regras de Western Electric e uso em dados', `
Além de um ponto fora dos limites de 3σ, padrões **dentro** dos limites também indicam causa especial (regras de Western Electric/Nelson):
1. um ponto fora de ±3σ
2. 2 de 3 pontos consecutivos além de ±2σ do mesmo lado
3. 4 de 5 pontos consecutivos além de ±1σ do mesmo lado
4. **8 pontos seguidos do mesmo lado** da linha central (deslocamento de nível)
5. 6 pontos seguidos subindo ou descendo (tendência)

Mais regras detectam mais mudanças, mas aumentam os alarmes falsos.

**Em times de dados:** monitorar taxa de erro de pipelines, latência de APIs, volume de linhas carregadas por dia, taxa de pedidos cancelados. O gráfico p é o natural para taxas diárias com volumes diferentes: dias com poucos pedidos têm limites mais largos, evitando alarmes por ruído.

Para detectar **pequenos desvios persistentes**, os gráficos **CUSUM** (soma acumulada dos desvios) e **EWMA** (média móvel exponencial) são mais sensíveis que o de Shewhart.
`),
    exPy('Gráfico p da taxa de cancelamento diária', `
`, r`rng = np.random.default_rng(4)
pedidos = rng.integers(80, 400, 60)
p_real = np.where(np.arange(60) >= 45, 0.09, 0.05)       # algo mudou no dia 45
cancel = rng.binomial(pedidos, p_real)
taxa = cancel / pedidos
p_bar = cancel[:30].sum() / pedidos[:30].sum()             # referência: 30 dias estáveis
lsc = p_bar + 3 * np.sqrt(p_bar * (1 - p_bar) / pedidos)
lic = np.clip(p_bar - 3 * np.sqrt(p_bar * (1 - p_bar) / pedidos), 0, None)
fora = np.where((taxa > lsc) | (taxa < lic))[0]
print(f"p̄ = {p_bar:.4f} | dias fora de controle: {fora.tolist()}")
lado = np.sign(taxa - p_bar)
seq = max(len(s) for s in "".join("+" if v > 0 else "-" for v in lado).replace("-", " ").split()) if (lado > 0).any() else 0
print("maior sequência acima da linha central:", seq)`, `
Depois do dia 45 surgem dias acima do limite superior e uma sequência longa de pontos acima da linha central (bem mais que os 8 da regra): sinal de causa especial. Repare que só olhar os limites de 3σ detectaria a mudança tarde; a regra das sequências a pega antes.
`, N),
    py('Para as contagens diárias de erros `erros` (gráfico c), use os **20 primeiros dias** como referência: crie `c_bar` (média), `lsc` = c_bar + 3√c_bar e `dias_fora`: lista dos índices (0 a 39) em que `erros` passou do lsc.',
      r`c_bar = erros[:20].mean()
lsc = c_bar + 3 * np.sqrt(c_bar)
dias_fora = [int(i) for i in np.where(erros > lsc)[0]]`,
      r`cb = erros[:20].mean(); l = cb + 3 * np.sqrt(cb)
assert abs(c_bar - cb) < 1e-12 and abs(lsc - l) < 1e-12
assert dias_fora == [int(i) for i in np.where(erros > l)[0]] and len(dias_fora) >= 1 and min(dias_fora) >= 30`,
      NS('rng = np.random.default_rng(8)\nerros = np.concatenate([rng.poisson(6, 30), rng.poisson(16, 10)])', '`erros` (contagem diária de falhas de um pipeline em 40 dias) e `np` já carregados.')),
    py('Implemente `regra_8(valores, centro)`: devolve True se existirem **8 ou mais pontos seguidos** do mesmo lado da linha central (todos acima ou todos abaixo; pontos iguais ao centro interrompem a sequência).',
      r`def regra_8(valores, centro):
    seq, lado_ant = 0, 0
    for v in valores:
        lado = 1 if v > centro else (-1 if v < centro else 0)
        if lado != 0 and lado == lado_ant:
            seq += 1
        else:
            seq = 1 if lado != 0 else 0
        lado_ant = lado
        if seq >= 8:
            return True
    return False`,
      r`assert regra_8([1, 2, 1, 2, 1, 2, 1, 2, 1], 0) is True
assert regra_8([1, -1] * 10, 0) is False
assert regra_8([1] * 7 + [0] + [1] * 7, 0) is False
assert regra_8([-1] * 8, 0) is True`),
    quiz('Qual a diferença entre limites de controle e limites de especificação?', ['Controle vem da variação do próprio processo; especificação vem do requisito do cliente', 'São sinônimos', 'Especificação é sempre ±3σ', 'Controle é definido em contrato'], 0),
    quiz('No gráfico p, por que os limites variam de um dia para outro?', ['Porque dependem do tamanho da amostra do dia (nₜ)', 'Por erro de cálculo', 'Porque a média muda', 'Porque são aleatórios'], 0),
  ],
};

export const STATS_PLUS2 = {
  examples: {},
  lessons: [
    { unit: 'st-u6', after: 'st-6-3', lesson: L_TS2 },
    { unit: 'st-u9', after: 'st-9-2', lesson: L_NONPAR2 },
    { unit: 'st-u14', after: 'st-14-2', lesson: L_QUASI },
  ],
  units: [
    { after: 'st-u11', unit: { id: 'st-u16', level: 3, title: 'Modelagem preditiva', description: 'Viés-variância, validação cruzada, métricas de classificação e regularização', lessons: [L_CV, L_CLASSIF, L_REG] } },
    { after: 'st-u16', unit: { id: 'st-u17', level: 3, title: 'Aprendizado não supervisionado', description: 'PCA, k-means e segmentação RFM', lessons: [L_PCA, L_KMEANS] } },
    { after: 'st-u15', unit: { id: 'st-u18', level: 4, title: 'Métricas de produto e negócio', description: 'Métricas de razão e método delta, coortes e LTV, controle estatístico de processo', lessons: [L_RATIO, L_COORTE, L_CEP] } },
  ],
};
