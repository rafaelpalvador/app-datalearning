// Conteúdo adicional da trilha de Estatística (parte 1: níveis Básico e Intermediário
// + exemplos resolvidos das lições existentes). A parte 2 está em stats-plus2.js.
import { theory, quiz, order, fill, sql, py, exPy, exSql } from './helpers.js';
import { PY_STATS, PY_STATS_NOTE } from './datasets.js';
import { STATS_PLUS2 } from './stats-plus2.js';

const r = String.raw;
const PD = ['pandas'];
const S = { setup: PY_STATS, setupNote: PY_STATS_NOTE, packages: PD };
const N = { setup: 'import numpy as np', setupNote: '`np` (NumPy) já importado.', packages: ['numpy'] };
const NS = (extra, note) => ({ setup: 'import numpy as np\n' + extra, setupNote: note, packages: ['numpy'] });

// ───────────────────────────────────────────── EXEMPLOS RESOLVIDOS DAS LIÇÕES EXISTENTES
const examples = {
  'st-0-1': [
    exSql('Conhecendo as variáveis do teste A/B', `
Antes de qualquer análise, descubra o **tipo** de cada variável. Contar valores distintos ajuda: poucos valores indicam variável categórica.
`, `SELECT COUNT(DISTINCT grupo)        AS grupos,
       COUNT(DISTINCT dispositivo)  AS dispositivos,
       COUNT(DISTINCT converteu)    AS valores_converteu,
       COUNT(DISTINCT valor_compra) AS valores_compra,
       ROUND(AVG(converteu), 4)     AS taxa_conversao
FROM experimento_ab;`, `
grupo e dispositivo são **categóricas nominais** (poucos valores, sem ordem); converteu é **binária** (0/1), e a média dela é a taxa; valor_compra é **quantitativa contínua** (muitos valores diferentes).
`),
  ],
  'st-0-2': [
    exPy('Tabela de frequência completa em pandas', `
Absoluta, relativa e acumulada para as notas de avaliação:
`, r`freq = avaliacoes["nota"].value_counts().sort_index()
tabela = pd.DataFrame({
    "freq": freq,
    "relativa_%": (freq / freq.sum() * 100).round(1),
    "acumulada_%": (freq.cumsum() / freq.sum() * 100).round(1),
})
print(tabela)
contagens, bordas = np.histogram(diarias["receita"], bins=6)
for c, a, b in zip(contagens, bordas[:-1], bordas[1:]):
    print(f"{a:8.0f} a {b:8.0f}: {'#' * (c // 15)} {c}")`, `
A acumulada mostra, por exemplo, que fração das notas é 3 ou menos. O histograma em texto mostra onde a receita diária se concentra.
`, S),
  ],
  'st-1-1': [
    exPy('Média × mediana com um valor extremo', `
`, r`dias = pd.Series([5000, 5200, 4800, 5100, 4900, 26000])
print("média:", round(dias.mean(), 1), "| mediana:", dias.median(), "| moda das notas:", avaliacoes["nota"].mode()[0])
print("sem o dia extremo → média:", round(dias[dias < 20000].mean(), 1))
print(diarias.groupby("loja")["receita"].agg(["mean", "median"]).round(1))`, `
Um único dia de 26 mil puxou a média para ~8.500, enquanto a mediana ficou em 5.050. Por loja, a média acima da mediana indica cauda à direita.
`, S),
  ],
  'st-1-2': [
    exPy('Duas lojas, mesma média, dispersões diferentes', `
`, r`a = np.array([100, 100, 100, 100, 100])
b = np.array([20, 60, 100, 140, 180])
for nome, x in [("A", a), ("B", b)]:
    print(nome, "média:", x.mean(), "| amplitude:", x.max() - x.min(),
          "| var pop:", x.var(), "| desvio amostral:", round(x.std(ddof=1), 2),
          "| CV:", round(x.std(ddof=1) / x.mean(), 2))
print(diarias.groupby("loja")["receita"].agg(["mean", "std"]).assign(cv=lambda d: d["std"] / d["mean"]).round(3))`, `
As duas têm média 100, mas B varia muito mais. O CV por loja mostra qual é proporcionalmente mais instável.
`, S),
  ],
  'st-1-3': [
    exPy('Quartis, IQR e cercas', `
`, r`v = diarias.loc[diarias["loja"] == "Centro", "receita"]
q1, q2, q3 = v.quantile([0.25, 0.5, 0.75])
iqr = q3 - q1
print(f"Q1={q1:.0f}  mediana={q2:.0f}  Q3={q3:.0f}  IQR={iqr:.0f}")
print(f"cercas: {q1 - 1.5 * iqr:.0f} a {q3 + 1.5 * iqr:.0f}")
fora = v[(v < q1 - 1.5 * iqr) | (v > q3 + 1.5 * iqr)]
print("dias fora das cercas:", len(fora))
print(fora.sort_values(ascending=False).head(3).round(0))`, `
As cercas (Q1 − 1,5·IQR e Q3 + 1,5·IQR) são exatamente os limites dos bigodes do boxplot; os dias fora delas são os pontos isolados.
`, S),
  ],
  'st-2-1': [
    exSql('Tabela de contingência e probabilidades condicionais', `
Contagens de grupo × conversão, de onde saem todas as probabilidades:
`, `SELECT grupo,
       SUM(converteu) AS converteram,
       COUNT(*) - SUM(converteu) AS nao_converteram,
       COUNT(*) AS total,
       ROUND(AVG(converteu), 4) AS p_converter_dado_grupo,
       ROUND(1.0 * SUM(converteu) / (SELECT SUM(converteu) FROM experimento_ab), 4) AS p_grupo_dado_converteu
FROM experimento_ab
GROUP BY grupo;`, `
Na coluna p_converter_dado_grupo o denominador é o total do grupo; em p_grupo_dado_converteu, o total de convertidos. Mesmos números de cima, perguntas diferentes.
`),
  ],
  'st-2-2': [
    exPy('A regra 68–95–99,7 com dados simulados', `
`, r`from math import erf, sqrt
phi = lambda z: 0.5 * (1 + erf(z / sqrt(2)))
x = np.random.default_rng(3).normal(100, 15, 100_000)
for k in [1, 2, 3]:
    dentro = ((x > 100 - k * 15) & (x < 100 + k * 15)).mean()
    print(f"±{k}σ: simulado {dentro:.4f} | teórico {phi(k) - phi(-k):.4f}")
print("P(X > 130) =", round(1 - phi((130 - 100) / 15), 4))`, `
A simulação bate com a teoria. Para P(X > 130): z = (130 − 100) ÷ 15 = 2, e 1 − Φ(2) ≈ 0,0228.
`, N),
  ],
  'st-2-3': [
    exPy('Distribuição binomial completa', `
n = 10 visitantes, p = 0,3 de compra:
`, r`from math import comb
n, p = 10, 0.3
for k in range(n + 1):
    prob = comb(n, k) * p**k * (1 - p)**(n - k)
    print(f"{k:>2} compras: {prob:.4f} {'█' * round(prob * 60)}")
print("média n·p =", n * p, "| desvio =", round((n * p * (1 - p)) ** 0.5, 3))`, `
O pico fica em 3 compras (= n·p). As probabilidades somam 1.
`),
  ],
  'st-3-1': [
    exPy('A média varia de amostra para amostra', `
Sorteamos 2.000 amostras de 50 dias e calculamos a média de cada uma: o desvio dessas médias é o **erro padrão**.
`, r`pop = diarias["receita"].to_numpy()
rng = np.random.default_rng(0)
medias = np.array([rng.choice(pop, 50).mean() for _ in range(2000)])
print("desvio dos dados:", pop.std().round(1))
print("desvio das médias (erro padrão real):", medias.std().round(1))
print("fórmula s/√n:", (pop.std() / np.sqrt(50)).round(1))
a = rng.choice(pop, 50)
ep = a.std(ddof=1) / np.sqrt(50)
print(f"uma amostra: média {a.mean():.0f}, IC95 [{a.mean() - 1.96 * ep:.0f}; {a.mean() + 1.96 * ep:.0f}], média real {pop.mean():.0f}")`, `
O desvio das médias bate com s/√n. O intervalo de uma única amostra costuma conter a média verdadeira, e é isso que "95% de confiança" promete no longo prazo.
`, S),
  ],
  'st-3-2': [
    exPy('Bootstrap da mediana, passo a passo', `
`, r`v = diarias.loc[diarias["loja"] == "Shopping", "receita"].to_numpy()
rng = np.random.default_rng(1)
print("uma reamostra (5 primeiros):", rng.choice(v, size=len(v), replace=True)[:5].round(0))
meds = np.array([np.median(rng.choice(v, size=len(v), replace=True)) for _ in range(2000)])
print("mediana observada:", np.median(v).round(1))
print("IC95 bootstrap:", np.percentile(meds, [2.5, 97.5]).round(1))`, `
Cada reamostra tem o mesmo tamanho dos dados, sorteada com reposição. A variação das 2.000 medianas mede a incerteza da mediana, sem nenhuma fórmula.
`, S),
  ],
  'st-4-1': [
    exPy('Quão raro é o resultado se H₀ for verdadeira?', `
Uma moeda deu 60 caras em 100 lançamentos. Ela é viciada? Sob H₀ (moeda honesta), simulamos 100.000 experimentos e vemos com que frequência sai algo tão extremo.
`, r`rng = np.random.default_rng(0)
caras = rng.binomial(100, 0.5, 100_000)
p_valor = (np.abs(caras - 50) >= 10).mean()
print("p-valor simulado (bicaudal):", round(p_valor, 4))
print("rejeita a 5%?", p_valor < 0.05)`, `
Em cerca de 5,7% dos experimentos com moeda honesta sai um resultado tão extremo. Como 0,057 > 0,05, **não** rejeitamos H₀: 60 em 100 não é evidência forte o bastante.
`, N),
  ],
  'st-4-2': [
    exPy('Teste z de duas proporções, linha a linha', `
`, r`from math import erf, sqrt
a = ab.loc[ab["grupo"] == "A", "converteu"]
b = ab.loc[ab["grupo"] == "B", "converteu"]
pa, pb = a.mean(), b.mean()
pool = (a.sum() + b.sum()) / (len(a) + len(b))
ep = sqrt(pool * (1 - pool) * (1 / len(a) + 1 / len(b)))
z = (pb - pa) / ep
p = 2 * (1 - 0.5 * (1 + erf(abs(z) / sqrt(2))))
print(f"A: {pa:.4f}  B: {pb:.4f}  diferença: {pb - pa:+.4f}  lift: {(pb / pa - 1):.1%}")
print(f"z = {z:.3f}  p-valor = {p:.4f}")`, `
Cada linha corresponde a um passo da teoria: taxas, proporção combinada, erro padrão sob H₀, z e p-valor bicaudal.
`, S),
  ],
  'st-4-3': [
    exPy('Teste t de Welch e o paradoxo de Simpson', `
`, r`ca = ab[(ab.grupo == "A") & (ab.converteu == 1)]["valor_compra"]
cb = ab[(ab.grupo == "B") & (ab.converteu == 1)]["valor_compra"]
t = (cb.mean() - ca.mean()) / np.sqrt(ca.var() / len(ca) + cb.var() / len(cb))
print(f"ticket A {ca.mean():.2f}  B {cb.mean():.2f}  t = {t:.2f}")

simpson = pd.DataFrame({"grupo": ["A"] * 2 + ["B"] * 2, "seg": ["fácil", "difícil"] * 2,
                        "usuarios": [800, 200, 200, 800], "conv": [160, 10, 44, 48]})
simpson["taxa"] = simpson["conv"] / simpson["usuarios"]
print(simpson)
tot = simpson.groupby("grupo")[["conv", "usuarios"]].sum()
print((tot["conv"] / tot["usuarios"]).round(3))`, `
No exemplo inventado, B ganha nos dois segmentos (22% × 20% e 6% × 5%), mas perde no total (9,2% × 17%), porque B recebeu muito mais usuários do segmento difícil.
`, S),
  ],
  'st-5-1': [
    exPy('Pearson × Spearman com um outlier', `
`, r`x = np.arange(1, 11, dtype=float)
y = x * 2.0
y[-1] = 200          # um valor absurdo
s = pd.Series
print("Pearson:", round(s(x).corr(s(y)), 3), "| Spearman:", round(s(x).rank().corr(s(y).rank()), 3))
print("visitantes × receita:", round(diarias["visitantes"].corr(diarias["receita"]), 3))`, `
Um único outlier derrubou o Pearson, mas o Spearman continua 1: a ordem dos valores não mudou.
`, S),
  ],
  'st-5-2': [
    exPy('Reta, previsão e R²', `
`, r`x = diarias["visitantes"].to_numpy(dtype=float)
y = diarias["receita"].to_numpy(dtype=float)
b, a = np.polyfit(x, y, 1)
prev = a + b * x
r2 = 1 - ((y - prev) ** 2).sum() / ((y - y.mean()) ** 2).sum()
print(f"receita ≈ {a:.1f} + {b:.2f} × visitantes")
print(f"R² = {r2:.3f} | r² = {np.corrcoef(x, y)[0, 1] ** 2:.3f}")
print("previsão para 900 visitantes:", round(a + b * 900, 1))`, `
Na regressão simples, R² é igual ao quadrado da correlação. A inclinação é a receita a mais, em média, por visitante.
`, S),
  ],
  'st-7-1': [
    exPy('Observado × esperado', `
`, r`obs = pd.crosstab(ab["dispositivo"], ab["converteu"])
esp = np.outer(obs.sum(axis=1), obs.sum(axis=0)) / obs.to_numpy().sum()
print("observado:\n", obs)
print("esperado sob independência:\n", pd.DataFrame(esp.round(1), index=obs.index, columns=obs.columns))
chi2 = ((obs.to_numpy() - esp) ** 2 / esp).sum()
gl = (obs.shape[0] - 1) * (obs.shape[1] - 1)
print(f"χ² = {chi2:.2f} com {gl} graus de liberdade")`, `
Se a conversão não dependesse do dispositivo, as contagens seriam as da tabela esperada. Quanto mais o observado se afasta delas, maior o χ².
`, S),
  ],
  'st-7-2': [
    exPy('ANOVA: decompondo a variação', `
`, r`g = diarias.groupby("loja")["receita"]
media = diarias["receita"].mean()
sq_total = ((diarias["receita"] - media) ** 2).sum()
sq_entre = (g.count() * (g.mean() - media) ** 2).sum()
sq_dentro = ((diarias["receita"] - g.transform("mean")) ** 2).sum()
k, n = g.ngroups, len(diarias)
F = (sq_entre / (k - 1)) / (sq_dentro / (n - k))
print(f"SQ total {sq_total:.3e} = entre {sq_entre:.3e} + dentro {sq_dentro:.3e}")
print(f"F = {F:.1f} | η² (parte explicada pela loja) = {sq_entre / sq_total:.3f}")`, `
A variação total se divide exatamente em "entre lojas" e "dentro das lojas". O η² mostra quanto da variação a loja explica.
`, S),
  ],
  'st-6-1': [
    exSql('Sazonalidade semanal em SQL', `
`, `SELECT CAST(strftime('%w', data) AS INTEGER) AS dia_semana,
       ROUND(AVG(receita), 0) AS receita_media,
       ROUND(AVG(receita) / (SELECT AVG(receita) FROM vendas_diarias), 3) AS indice_sazonal
FROM vendas_diarias
GROUP BY dia_semana
ORDER BY dia_semana;`, `
O **índice sazonal** compara cada dia da semana com a média geral: acima de 1, o dia vende mais que o normal (0 = domingo).
`),
  ],
  'st-6-2': [
    exPy('Alerta com janela móvel', `
`, r`o = diarias[diarias.loja == "Online"].sort_values("data").set_index("data")["receita"]
ref_media = o.rolling(28).mean().shift(1)
ref_desvio = o.rolling(28).std().shift(1)
z = (o - ref_media) / ref_desvio
print(z.dropna().describe().round(2))
print(z[z.abs() > 3].round(1))`, `
A maioria dos dias tem |z| pequeno; os poucos acima de 3 são os candidatos a investigação.
`, S),
  ],
  'st-6-3': [
    exPy('Autocorrelação por lag', `
`, r`total = diarias.groupby("data")["receita"].sum()
for lag in [1, 2, 3, 7, 14]:
    print(f"lag {lag:>2}: {total.autocorr(lag):.3f}")`, `
Os lags 7 e 14 se destacam: a série "se lembra" da mesma semana anterior, o sinal de sazonalidade semanal.
`, S),
  ],
  'st-9-1': [
    exPy('Distribuição nula por permutação', `
`, r`d = ab[ab.converteu == 1]
x = d["valor_compra"].to_numpy()
g = (d["grupo"] == "B").to_numpy()
obs = x[g].mean() - x[~g].mean()
rng = np.random.default_rng(0)
nula = np.array([(lambda gp: x[gp].mean() - x[~gp].mean())(rng.permutation(g)) for _ in range(3000)])
print(f"diferença observada: {obs:.2f}")
print("percentis da distribuição nula (2.5, 50, 97.5):", np.percentile(nula, [2.5, 50, 97.5]).round(2))
print("p-valor:", (np.abs(nula) >= abs(obs)).mean())`, `
A distribuição nula mostra que diferenças são comuns só pelo acaso. O p-valor é a fração dela tão extrema quanto a observada.
`, S),
  ],
  'st-9-2': [
    exPy('Bonferroni × Holm × BH nos mesmos p-valores', `
`, r`p = np.array([0.001, 0.008, 0.012, 0.03, 0.04, 0.2, 0.5])
m = len(p)
ordem = np.argsort(p)
bonf = p <= 0.05 / m
holm = np.zeros(m, bool)
for passo, i in enumerate(ordem):
    if p[i] <= 0.05 / (m - passo): holm[i] = True
    else: break
k = max([k for k, i in enumerate(ordem, 1) if p[i] <= k / m * 0.05], default=0)
bh = np.zeros(m, bool); bh[ordem[:k]] = True
print("Bonferroni:", bonf.sum(), "| Holm:", holm.sum(), "| BH:", bh.sum(), "descobertas")`, `
Do mais conservador ao mais permissivo: Bonferroni ≤ Holm ≤ BH. Escolha conforme o custo de um falso positivo.
`, N),
  ],
  'st-10-1': [
    exPy('Efeito bruto × efeito controlado', `
`, r`y = diarias["receita"].to_numpy(dtype=float)
x = diarias["visitantes"].to_numpy(dtype=float)
b_simples = np.polyfit(x, y, 1)[0]
X = pd.get_dummies(diarias[["visitantes", "loja"]], drop_first=True, dtype=float)
X.insert(0, "const", 1.0)
beta, *_ = np.linalg.lstsq(X.to_numpy(), y, rcond=None)
print("efeito de 1 visitante (simples):", round(b_simples, 2))
print(pd.Series(beta, index=X.columns).round(2))`, `
O coeficiente de visitantes muda quando a loja entra no modelo: parte do efeito "bruto" era, na verdade, diferença entre lojas.
`, S),
  ],
  'st-10-2': [
    exPy('Da reta à sigmoide', `
`, r`sig = lambda z: 1 / (1 + np.exp(-z))
for z in [-4, -2, 0, 2, 4]:
    p = sig(z)
    print(f"z = {z:+d} → p = {p:.3f} | chances = {p / (1 - p):.3f}")
print("razão de chances de β = 0,34:", round(np.exp(0.34), 3))`, `
A sigmoide transforma qualquer z num valor entre 0 e 1; cada aumento de 1 em z multiplica as chances por e ≈ 2,72. Um β de 0,34 multiplica as chances por 1,4.
`, N),
  ],
  'st-11-1': [
    exPy('Quanto tráfego é preciso?', `
`, r`from math import sqrt, ceil
def n_por_grupo(p, mde_abs, z_a=1.959964, z_b=0.841621):
    return ceil((z_a + z_b) ** 2 * 2 * p * (1 - p) / mde_abs ** 2)
for mde in [0.02, 0.01, 0.005]:
    print(f"base 10%, detectar +{mde * 100:.1f} p.p.: {n_por_grupo(0.10, mde):,} usuários por grupo")`, `
Reduzir o efeito detectável pela metade **quadruplica** a amostra necessária.
`),
  ],
  'st-11-2': [
    exPy('CUPED em dados simulados', `
`, r`rng = np.random.default_rng(5)
pre = rng.gamma(2, 50, 5000)
pos = 0.8 * pre + rng.normal(0, 40, 5000)
theta = np.cov(pre, pos)[0, 1] / np.var(pre, ddof=1)
aj = pos - theta * (pre - pre.mean())
print(f"θ = {theta:.3f} | correlação = {np.corrcoef(pre, pos)[0, 1]:.3f}")
print(f"variância: {pos.var():.0f} → {aj.var():.0f} (queda de {1 - aj.var() / pos.var():.1%})")
print(f"médias iguais? {pos.mean():.2f} e {aj.mean():.2f}")`, `
A média não muda, mas a variância cai aproximadamente ρ² (o quadrado da correlação).
`, N),
  ],
  'st-12-1': [
    exPy('Atualizando a crença com os dados', `
`, r`a0, b0 = 1, 1
for s, n in [(3, 10), (12, 50), (41, 200)]:
    a, b = a0 + s, b0 + n - s
    print(f"após {n:>3} usuários ({s} conversões): Beta({a}, {b}) | média {a / (a + b):.3f}")
amostras = np.random.default_rng(0).beta(42, 160, 100_000)
print("intervalo de credibilidade 95%:", np.percentile(amostras, [2.5, 97.5]).round(3))`, `
Com mais dados, a posterior fica mais concentrada e a influência do prior diminui.
`, N),
  ],
  'st-12-2': [
    exPy('Shrinkage na prática', `
`, r`g = avaliacoes.groupby("produto_id")["nota"].agg(["count", "mean"])
m = avaliacoes["nota"].mean()
g["bayes"] = (20 * m + g["count"] * g["mean"]) / (20 + g["count"])
print(g.sort_values("bayes", ascending=False).round(2).head(6))`, `
Produtos com poucas avaliações ficam mais perto da média global; os com muitas avaliações quase não mudam.
`, S),
  ],
  'st-13-1': [
    exPy('Verossimilhança de uma moeda', `
7 caras em 10 lançamentos: qual p torna esses dados mais prováveis?
`, r`y = np.array([1, 1, 1, 0, 1, 1, 0, 1, 0, 1])
grade = np.linspace(0.05, 0.95, 19)
ll = [np.sum(y * np.log(p) + (1 - y) * np.log(1 - p)) for p in grade]
for p, v in zip(grade, ll):
    print(f"p={p:.2f} {'█' * int(30 + v * 2) if v > -15 else ''} {v:.2f}")
print("MLE:", grade[np.argmax(ll)], "| média dos dados:", y.mean())`, `
A log-verossimilhança é máxima em p = 0,7, exatamente a proporção observada.
`, N),
  ],
  'st-13-2': [
    exPy('π por Monte Carlo', `
Sorteie pontos num quadrado e conte quantos caem dentro do círculo:
`, r`rng = np.random.default_rng(0)
for n in [100, 10_000, 1_000_000]:
    x, y = rng.random(n), rng.random(n)
    est = 4 * ((x ** 2 + y ** 2) <= 1).mean()
    print(f"N = {n:>9,}: π ≈ {est:.4f} (erro {abs(est - np.pi):.4f})")`, `
O erro cai com 1/√N: 100 vezes mais pontos → erro ~10 vezes menor.
`, N),
  ],
  'st-14-1': [
    exPy('Simulando um confundidor', `
Engajamento causa uso de cupom **e** gasto; o cupom em si não tem efeito.
`, r`rng = np.random.default_rng(2)
eng = rng.normal(0, 1, 5000)
cupom = (eng + rng.normal(0, 1, 5000) > 0).astype(int)
gasto = 100 + 30 * eng + rng.normal(0, 10, 5000)
print("diferença ingênua:", round(gasto[cupom == 1].mean() - gasto[cupom == 0].mean(), 1))
X = np.column_stack([np.ones(5000), cupom, eng])
beta, *_ = np.linalg.lstsq(X, gasto, rcond=None)
print("efeito do cupom controlando o engajamento:", round(beta[1], 2))`, `
A comparação ingênua sugere um grande efeito; controlando o confundidor, o efeito vai para perto de zero (o verdadeiro).
`, N),
  ],
  'st-14-2': [
    exPy('Média ponderada por estrato', `
`, r`efeitos = np.array([5.0, 8.0, 12.0])
pesos = np.array([100, 300, 600])
print("média simples:", efeitos.mean(), "| ponderada:", np.average(efeitos, weights=pesos))`, `
A média ponderada dá mais importância às faixas com mais clientes: (5·100 + 8·300 + 12·600) ÷ 1000 = 10,1.
`, N),
  ],
  'st-15-1': [
    exPy('Espiar infla o falso positivo', `
`, r`rng = np.random.default_rng(3)
def teste_aa(espiar):
    a = rng.random(2000) < 0.1; b = rng.random(2000) < 0.1
    pontos = range(200, 2001, 200) if espiar else [2000]
    for n in pontos:
        pa, pb = a[:n].mean(), b[:n].mean(); pool = (pa + pb) / 2
        z = (pb - pa) / np.sqrt(pool * (1 - pool) * 2 / n)
        if abs(z) > 1.96: return True
    return False
for espiar in [False, True]:
    print("espiando" if espiar else "uma olhada só", "→ falsos positivos:", np.mean([teste_aa(espiar) for _ in range(400)]))`, `
Sem espiar, a taxa fica perto de 5%; espiando 10 vezes, ela multiplica.
`, N),
  ],
  'st-15-2': [
    exPy('Thompson Sampling realocando o tráfego', `
`, r`rng = np.random.default_rng(0)
taxas = np.array([0.04, 0.05, 0.08])
s, f = np.ones(3), np.ones(3)
for t in range(1, 3001):
    i = np.argmax(rng.beta(s, f))
    ok = rng.random() < taxas[i]
    s[i] += ok; f[i] += 1 - ok
    if t in (100, 1000, 3000):
        print(f"após {t:>4} usuários, tráfego por variante:", (s + f - 2).astype(int))`, `
No começo o tráfego se espalha (exploração); com o tempo, a melhor variante (8%) recebe quase tudo.
`, N),
  ],
  'st-15-3': [
    exPy('Por que não ignorar os censurados', `
`, r`meses = np.array([2, 3, 3, 5, 8, 8, 10, 12, 12, 12])
cancelou = np.array([1, 1, 0, 1, 1, 0, 1, 0, 0, 0])
print("média só de quem cancelou (errado):", meses[cancelou == 1].mean())
s = 1.0
for t in np.unique(meses[cancelou == 1]):
    risco = (meses >= t).sum(); ev = ((meses == t) & (cancelou == 1)).sum()
    s *= 1 - ev / risco
    print(f"t={t:>2}: em risco {risco}, eventos {ev}, S(t) = {s:.3f}")`, `
Olhar só quem cancelou subestima muito a duração. O Kaplan-Meier usa os ativos (censurados) como "em risco" até onde foram observados.
`, N),
  ],
};

// ───────────────────────────────────────────── LIÇÕES NOVAS: NÍVEL BÁSICO

const L_AMOSTRAGEM = {
  id: 'st-0-3', title: 'Amostragem e desenho de estudos',
  steps: [
    theory('Por que amostrar e como fazer direito', `
Medir a população inteira costuma ser caro, lento ou impossível. Uma **amostra** bem feita permite tirar conclusões sobre o todo com erro conhecido. "Bem feita" quer dizer **aleatória**: todo elemento tem chance conhecida de ser escolhido.

**Amostragem probabilística:**

| método | como funciona | quando usar |
|---|---|---|
| **aleatória simples** | sorteio puro entre todos | população homogênea, lista completa disponível |
| **estratificada** | divide em grupos (estratos) e sorteia dentro de cada um | garantir representação de grupos (região, plano) e reduzir variância |
| **por conglomerados** | sorteia grupos inteiros (lojas, escolas, cidades) | quando listar indivíduos é caro; aumenta a variância |
| **sistemática** | sorteia o início e pega 1 a cada k | listas ordenadas sem periodicidade |

**Não probabilística** (conveniência, voluntários, bola de neve, cotas): rápida, mas sem garantia de representatividade e sem como calcular o erro.

**Tamanho da amostra:** o erro depende principalmente do **tamanho da amostra**, não do tamanho da população. Uma amostra aleatória de 1.000 pessoas mede uma cidade ou um país com precisão parecida (cerca de ±3 pontos percentuais para uma proporção).
`),
    theory('Vieses que estragam conclusões', `
| viés | o que acontece | exemplo |
|---|---|---|
| **seleção** | a amostra não representa a população | pesquisa só com clientes do app |
| **sobrevivência** | só os "sobreviventes" são observados | estudar só empresas que deram certo |
| **não resposta** | quem responde é diferente de quem não responde | pesquisa de satisfação com 8% de resposta |
| **medição** | o instrumento mede errado | pergunta tendenciosa, sensor descalibrado |
| **voluntário** | quem se oferece é diferente | avaliações online (extremos opinam mais) |
| **confirmação** | o analista procura o que já acredita | olhar só os segmentos que confirmam a hipótese |

**Estudo observacional × experimento:**
- **observacional:** você apenas observa quem fez o quê (quem usou cupom gastou mais). Mostra **associação**; há risco de **confundidores**
- **experimento aleatorizado:** você **sorteia** quem recebe o tratamento (teste A/B). O sorteio equilibra todos os outros fatores, permitindo concluir **causa**

Outros desenhos: **transversal** (um momento), **longitudinal/coorte** (acompanha as mesmas unidades no tempo), **caso-controle** (parte do desfecho e olha o passado).
`),
    exPy('Amostra simples × estratificada', `
A loja Online é 1/3 dos dias. Numa amostra pequena e simples, ela pode ficar sub ou super-representada; na estratificada, cada loja entra na proporção certa.
`, r`simples = diarias.sample(n=30, random_state=4)
estrat = diarias.groupby("loja", group_keys=False).sample(n=10, random_state=4)
print("simples:", simples["loja"].value_counts().to_dict())
print("estratificada:", estrat["loja"].value_counts().to_dict())
print(f"média real {diarias.receita.mean():.0f} | simples {simples.receita.mean():.0f} | estratificada {estrat.receita.mean():.0f}")`, `
\`sample(n, random_state=...)\` sorteia linhas de forma reproduzível; \`groupby(...).sample(n)\` sorteia n dentro de cada grupo.
`, S),
    py('Sorteie `amostra`: **50 usuários** de `ab` com `sample(n=50, random_state=7)` e crie `taxa_amostra` com a taxa de conversão nela.',
      r`amostra = ab.sample(n=50, random_state=7)
taxa_amostra = amostra["converteu"].mean()`,
      r`ref = ab.sample(n=50, random_state=7)
assert len(amostra) == 50 and list(amostra.index) == list(ref.index)
assert abs(taxa_amostra - ref["converteu"].mean()) < 1e-12`, S),
    py('Faça uma amostra **estratificada** de `ab` com **40 usuários de cada dispositivo** (`groupby("dispositivo", group_keys=False).sample(n=40, random_state=1)`) e guarde em `estrat`.',
      r`estrat = ab.groupby("dispositivo", group_keys=False).sample(n=40, random_state=1)`,
      r`assert (estrat["dispositivo"].value_counts() == 40).all()
assert len(estrat) == 40 * ab["dispositivo"].nunique()`, S),
    quiz('Uma empresa quer saber a satisfação de todos os clientes, mas pesquisa só quem ligou para o SAC. Qual o problema?', ['Viés de seleção: quem liga para o SAC tem mais problemas', 'Amostra pequena demais', 'Nenhum', 'Viés de sobrevivência'], 0),
    quiz('Analisar só fundos de investimento que ainda existem superestima o retorno médio. Esse é o viés de...', ['Sobrevivência', 'Não resposta', 'Medição', 'Confirmação'], 0),
    quiz('Por que um teste A/B permite concluir causalidade e um estudo observacional, em geral, não?', ['O sorteio equilibra os outros fatores entre os grupos', 'Porque tem mais dados', 'Porque usa p-valor', 'Porque é mais rápido'], 0),
    quiz('Para garantir que as 5 regiões do país apareçam na amostra em proporção conhecida, use amostragem...', ['Estratificada', 'Por conveniência', 'Por conglomerados', 'Bola de neve'], 0),
  ],
};

const L_FORMA = {
  id: 'st-1-4', title: 'Forma da distribuição: assimetria, curtose e transformações',
  steps: [
    theory('Assimetria e curtose', `
Média e desvio não dizem tudo: duas distribuições podem ter os mesmos valores deles e formas muito diferentes.

**Assimetria (skewness)** mede para que lado fica a cauda mais longa:
- **≈ 0**: simétrica (média ≈ mediana)
- **> 0**: assimétrica à **direita** (cauda de valores altos; média > mediana). Ex.: renda, preços, tempo de sessão
- **< 0**: assimétrica à **esquerda** (cauda de valores baixos). Ex.: nota de prova fácil, idade de morte

Fórmula (momento padronizado): média de ((x − média) ÷ desvio)³. Regra prática: |skew| < 0,5 quase simétrica; 0,5 a 1 moderada; > 1 forte.

**Curtose** mede o peso das **caudas** (a frequência de valores extremos). A normal tem curtose 3; o pandas mostra o **excesso de curtose** (curtose − 3):
- **> 0** (leptocúrtica): caudas pesadas, mais extremos que a normal (retornos financeiros)
- **< 0** (platicúrtica): caudas leves (uniforme)

Em pandas: \`s.skew()\` e \`s.kurt()\` (já com correção amostral).
`),
    theory('Transformações e o QQ-plot', `
Dados com assimetria forte à direita costumam ficar mais simétricos com uma **transformação logarítmica**: \`np.log(x)\` (só para x > 0) ou \`np.log1p(x)\` = log(1 + x), que aceita zeros.

Por que transformar:
- muitos métodos (média, desvio, regressão linear, testes t) funcionam melhor com distribuições aproximadamente simétricas
- efeitos **multiplicativos** viram **aditivos**: no log, "10% a mais" é uma distância constante
- gráficos com cauda longa ficam legíveis

Outras: raiz quadrada (contagens), Box-Cox (escolhe a melhor potência), padronização z (não muda a forma, só a escala).

**Interpretando médias no log:** a média de log(x), transformada de volta com exp, é a **média geométrica**, que fica perto da mediana em dados log-normais.

**QQ-plot** (gráfico quantil-quantil) compara os quantis dos dados com os de uma normal. Se os pontos ficam sobre a reta, os dados são aproximadamente normais; uma curva em "U" indica assimetria; pontas que fogem da reta indicam caudas pesadas. É a checagem visual de normalidade mais usada.
`),
    exPy('Medindo a forma e o efeito do log', `
`, r`rng = np.random.default_rng(0)
renda = pd.Series(rng.lognormal(mean=8, sigma=0.8, size=5000))
print(f"renda   → skew {renda.skew():.2f} | curtose {renda.kurt():.2f} | média {renda.mean():.0f} | mediana {renda.median():.0f}")
log_renda = np.log(renda)
print(f"log     → skew {log_renda.skew():.2f} | curtose {log_renda.kurt():.2f}")
print(f"média geométrica {np.exp(log_renda.mean()):.0f} (perto da mediana)")
print("receita diária por loja (skew):", diarias.groupby("loja")["receita"].skew().round(2).to_dict())`, `
A renda simulada é fortemente assimétrica (média muito acima da mediana); depois do log, skew e curtose ficam perto de 0, como numa normal.
`, S),
    py('Calcule `assim` (assimetria) e `curt` (excesso de curtose) da coluna `valor_compra` **só de quem converteu** em `ab`, usando os métodos do pandas.',
      r`v = ab.loc[ab["converteu"] == 1, "valor_compra"]
assim = v.skew()
curt = v.kurt()`,
      r`v = ab.loc[ab.converteu == 1, "valor_compra"]
assert abs(assim - v.skew()) < 1e-9 and abs(curt - v.kurt()) < 1e-9`, S),
    py('Implemente a assimetria **populacional** na mão: crie `skew_manual` = média de ((x − média) ÷ desvio_pop)³ para o array `x`.',
      r`z = (x - x.mean()) / x.std()
skew_manual = (z ** 3).mean()`,
      r`ref = (((x - x.mean()) / x.std()) ** 3).mean()
assert abs(skew_manual - ref) < 1e-12 and skew_manual > 1`,
      NS('x = np.array([1, 2, 2, 3, 3, 3, 4, 20], dtype=float)', '`x` = [1, 2, 2, 3, 3, 3, 4, 20] e `np` já carregados.')),
    py('Crie `log_receita` com o **log natural** da receita de `diarias` e `geo` com a **média geométrica** da receita (exp da média do log).',
      r`log_receita = np.log(diarias["receita"])
geo = np.exp(log_receita.mean())`,
      r`assert abs(geo - np.exp(np.log(diarias.receita).mean())) < 1e-6
assert geo < diarias.receita.mean()`, S),
    quiz('Tempo de sessão: média 9 min, mediana 4 min. A assimetria é...', ['Positiva (cauda à direita)', 'Negativa', 'Zero', 'Impossível saber'], 0),
    quiz('Num QQ-plot contra a normal, os pontos formam uma curva que sobe forte no final. Isso sugere...', ['Cauda direita mais pesada que a normal (assimetria positiva)', 'Dados normais', 'Dados uniformes', 'Erro no gráfico'], 0),
    quiz('Por que `np.log1p` em vez de `np.log` para contagens?', ['Porque aceita zeros (log(1 + 0) = 0)', 'Porque é mais rápido', 'Porque dá números maiores', 'Não há diferença'], 0),
  ],
};

const L_REGRAS = {
  id: 'st-2-0', title: 'Regras da probabilidade e contagem',
  steps: [
    theory('Espaço amostral, eventos e axiomas', `
- **Experimento aleatório:** algo cujo resultado não se sabe de antemão (lançar um dado, um usuário visitar o site)
- **Espaço amostral (Ω):** todos os resultados possíveis. Dado: {1, 2, 3, 4, 5, 6}
- **Evento:** um subconjunto de resultados. "Sair par" = {2, 4, 6}

**Probabilidade clássica** (resultados igualmente prováveis): P(A) = casos favoráveis ÷ casos possíveis → P(par) = 3/6 = 0,5. **Frequentista:** a proporção de vezes que A ocorre em muitas repetições (o que fazemos com dados).

**Regras fundamentais:**

| regra | fórmula |
|---|---|
| limites | 0 ≤ P(A) ≤ 1, P(Ω) = 1 |
| complementar | P(não A) = 1 − P(A) |
| adição (geral) | P(A ou B) = P(A) + P(B) − P(A e B) |
| adição (mutuamente exclusivos) | P(A ou B) = P(A) + P(B) |
| multiplicação (geral) | P(A e B) = P(A) · P(B \\| A) |
| multiplicação (independentes) | P(A e B) = P(A) · P(B) |

**Mutuamente exclusivos ≠ independentes.** Exclusivos não podem acontecer juntos (sair 1 e sair 6 no mesmo lançamento); independentes não se influenciam (dois lançamentos diferentes). Dois eventos exclusivos com probabilidade positiva são, na verdade, **dependentes**: se um aconteceu, o outro sabidamente não aconteceu.

**"Pelo menos um"** quase sempre se resolve pelo complementar: P(pelo menos uma compra em 5 visitas, p = 0,1) = 1 − 0,9⁵ ≈ 0,41.
`),
    theory('Contagem: permutações e combinações', `
Para calcular "casos favoráveis ÷ casos possíveis", é preciso **contar**:

| situação | ordem importa? | fórmula | Python |
|---|---|---|---|
| ordenar n itens | sim | n! | \`math.factorial(n)\` |
| escolher k de n, em ordem (pódio) | sim | n! ÷ (n − k)! | \`math.perm(n, k)\` |
| escolher k de n, sem ordem (comissão) | não | n! ÷ (k! · (n − k)!) | \`math.comb(n, k)\` |
| k escolhas com repetição de n opções (senha) | sim | nᵏ | \`n ** k\` |

Exemplos:
- pódio (1º, 2º, 3º) entre 10 corredores: perm(10, 3) = 720
- grupo de 3 pessoas entre 10: comb(10, 3) = 120 (cada grupo aparece 3! = 6 vezes no pódio)
- senha de 4 dígitos: 10⁴ = 10.000

**Princípio multiplicativo:** se uma escolha tem m opções e outra tem n, as duas juntas têm m × n combinações (3 camisas × 4 calças = 12 looks).

**Paradoxo do aniversário:** com 23 pessoas, a chance de duas fazerem aniversário no mesmo dia passa de 50%, porque o número de **pares** cresce rápido: comb(23, 2) = 253 pares.
`),
    exPy('Calculando e conferindo por simulação', `
`, r`from math import comb, perm, prod
print("P(pelo menos 1 compra em 5 visitas, p=0.1):", round(1 - 0.9 ** 5, 4))
print("pódio entre 10:", perm(10, 3), "| comissões de 3 entre 10:", comb(10, 3))
p_dif = prod((365 - i) / 365 for i in range(23))
print("aniversário, 23 pessoas, P(algum par igual):", round(1 - p_dif, 4))

rng = np.random.default_rng(0)
sim = np.mean([len(set(rng.integers(0, 365, 23))) < 23 for _ in range(20_000)])
print("simulação:", round(sim, 4))`, `
A fórmula e a simulação concordam (≈ 0,507). O cálculo usou o complementar: 1 − P(todos diferentes).
`, N),
    py('Uma campanha tem probabilidade 0,08 de conversão por e-mail, independente entre e-mails. Crie `p_nenhuma`: a chance de **nenhuma** conversão em 10 e-mails, e `p_pelo_menos_uma`: a chance de **ao menos uma**.',
      r`p_nenhuma = (1 - 0.08) ** 10
p_pelo_menos_uma = 1 - p_nenhuma`,
      r`assert abs(p_nenhuma - 0.92 ** 10) < 1e-12 and abs(p_pelo_menos_uma - (1 - 0.92 ** 10)) < 1e-12`),
    py('Crie `combos`: de quantas formas é possível escolher **3 produtos de um catálogo de 12** para uma vitrine (sem ordem), e `rankings`: de quantas formas é possível montar um **top 3 ordenado** com esses 12.',
      r`from math import comb, perm
combos = comb(12, 3)
rankings = perm(12, 3)`,
      r`assert combos == 220 and rankings == 1320`),
    py('Em `ab`, calcule `p_mobile_ou_conv`: P(dispositivo = "mobile" OU converteu = 1) pela regra da adição, usando as colunas (P(A) + P(B) − P(A e B)).',
      r`pa = (ab["dispositivo"] == "mobile").mean()
pb = (ab["converteu"] == 1).mean()
pab = ((ab["dispositivo"] == "mobile") & (ab["converteu"] == 1)).mean()
p_mobile_ou_conv = pa + pb - pab`,
      r`ref = ((ab.dispositivo == "mobile") | (ab.converteu == 1)).mean()
assert abs(p_mobile_ou_conv - ref) < 1e-12`, S),
    quiz('Dois eventos mutuamente exclusivos, ambos com probabilidade positiva, são independentes?', ['Não: se um ocorre, o outro com certeza não ocorre', 'Sim, sempre', 'Só se tiverem a mesma probabilidade', 'Depende da amostra'], 0),
    quiz('De quantas formas se escolhem 2 sabores de sorvete entre 5, sem importar a ordem?', ['10', '20', '25', '5'], 0, 'comb(5, 2) = 5 × 4 ÷ 2 = 10.'),
    quiz('P(A) = 0,5, P(B) = 0,4, P(A e B) = 0,2. Quanto é P(A ou B)?', ['0,7', '0,9', '0,2', '0,1'], 0),
  ],
};

const L_VA = {
  id: 'st-2-4', title: 'Variáveis aleatórias, valor esperado e variância',
  steps: [
    theory('Variável aleatória e sua distribuição', `
Uma **variável aleatória (VA)** associa um **número** a cada resultado de um experimento: número de compras num dia, valor de um pedido, tempo até o próximo clique.

- **Discreta:** valores contáveis (0, 1, 2...). Descrita pela **função de probabilidade** P(X = x)
- **Contínua:** qualquer valor num intervalo. Descrita pela **densidade** f(x); probabilidades são **áreas** sob a curva, e P(X = um valor exato) = 0

A **função de distribuição acumulada** F(x) = P(X ≤ x) serve para as duas.

Exemplo discreto: número de itens num pedido.

| x (itens) | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| P(X = x) | 0,5 | 0,3 | 0,15 | 0,05 |

As probabilidades somam 1. F(2) = P(X ≤ 2) = 0,8.
`),
    theory('Valor esperado e variância', `
**Valor esperado** E[X] é a média de longo prazo, ponderada pelas probabilidades: **E[X] = Σ x · P(X = x)**.
No exemplo: 1·0,5 + 2·0,3 + 3·0,15 + 4·0,05 = **1,75 itens** por pedido.

**Variância:** Var(X) = E[(X − E[X])²] = **E[X²] − (E[X])²**. Desvio padrão = √Var.

**Propriedades (valem sempre e são muito usadas):**

| propriedade | fórmula |
|---|---|
| constante | E[a·X + b] = a·E[X] + b |
| soma | E[X + Y] = E[X] + E[Y] (mesmo dependentes) |
| escala | Var(a·X + b) = a²·Var(X) (somar constante não muda a dispersão) |
| soma de independentes | Var(X + Y) = Var(X) + Var(Y) |
| soma geral | Var(X + Y) = Var(X) + Var(Y) + 2·Cov(X, Y) |
| média de n independentes | Var(média) = Var(X) ÷ n → desvio = σ ÷ √n |

A última linha é a origem do **erro padrão**.

**Decisões com valor esperado:** uma promoção custa R$ 2 por cliente e aumenta a chance de compra de 10% para 12%, com margem de R$ 80 por compra. Ganho esperado por cliente: 0,02 × 80 − 2 = **−R$ 0,40**: não compensa, apesar do aumento de conversão.
`),
    exPy('Valor esperado: fórmula × simulação', `
`, r`x = np.array([1, 2, 3, 4])
p = np.array([0.5, 0.3, 0.15, 0.05])
e = (x * p).sum()
var = (x ** 2 * p).sum() - e ** 2
print(f"E[X] = {e:.2f} | Var(X) = {var:.4f} | DP = {np.sqrt(var):.4f}")
amostra = np.random.default_rng(0).choice(x, size=100_000, p=p)
print(f"simulado: média {amostra.mean():.3f} | var {amostra.var():.4f}")
print("E[3X + 2] =", 3 * e + 2, "| Var(3X + 2) =", round(9 * var, 4))`, `
A simulação converge para os valores teóricos. Multiplicar por 3 multiplica a variância por 9; somar 2 não muda a variância.
`, N),
    py('Uma VA tem valores `x = [0, 1, 2, 3]` com probabilidades `p = [0.1, 0.4, 0.3, 0.2]`. Crie `esperado` (E[X]) e `variancia` (Var(X) = E[X²] − E[X]²).',
      r`x = np.array([0, 1, 2, 3])
p = np.array([0.1, 0.4, 0.3, 0.2])
esperado = (x * p).sum()
variancia = (x ** 2 * p).sum() - esperado ** 2`,
      r`assert abs(esperado - 1.6) < 1e-12 and abs(variancia - 0.84) < 1e-12`, N),
    py('Uma ação de marketing custa `custo = 3` reais por cliente e aumenta a probabilidade de compra de 0,10 para 0,14; a margem por compra é `margem = 60`. Crie `ganho_esperado`: o ganho esperado por cliente (aumento da probabilidade × margem − custo) e `vale_a_pena` (True se for positivo).',
      r`ganho_esperado = (0.14 - 0.10) * margem - custo
vale_a_pena = ganho_esperado > 0`,
      r`assert abs(ganho_esperado - (-0.6)) < 1e-9
assert not vale_a_pena`,
      { setup: 'custo = 3\nmargem = 60', setupNote: '`custo = 3` e `margem = 60` já definidos.' }),
    quiz('X e Y são independentes com Var(X) = 4 e Var(Y) = 9. Quanto é o desvio padrão de X + Y?', ['√13 ≈ 3,6', '5', '13', '6,5'], 0, 'Var(X + Y) = 4 + 9 = 13; DP = √13. Desvios não se somam, variâncias sim.'),
    quiz('Se a receita diária R tem DP de 1.000, qual o DP de 2·R + 500?', ['2.000', '2.500', '1.000', '4.000'], 0),
    quiz('Para uma VA contínua, quanto vale P(X = 3,0 exatamente)?', ['0', 'f(3)', '1', 'Depende da média'], 0),
  ],
};

const L_DISTR = {
  id: 'st-2-5', title: 'Poisson, geométrica, exponencial e uniforme',
  steps: [
    theory('Distribuições discretas do dia a dia', `
| distribuição | modela | parâmetros | média | variância |
|---|---|---|---|---|
| **Bernoulli** | um sucesso/fracasso | p | p | p(1 − p) |
| **Binomial** | nº de sucessos em n tentativas | n, p | np | np(1 − p) |
| **Poisson** | nº de eventos num intervalo (pedidos por hora, chamados por dia) | λ | λ | λ |
| **Geométrica** | nº de tentativas até o 1º sucesso | p | 1/p | (1 − p)/p² |
| **Uniforme discreta** | valores igualmente prováveis (dado) | a, b | (a + b)/2 | — |

**Poisson:** P(X = k) = e^(−λ) · λᵏ ÷ k!. Use quando eventos acontecem de forma independente a uma taxa média constante. Sinal clássico: **média ≈ variância**. Se a variância for bem maior que a média (**superdispersão**), use a binomial negativa.

**Geométrica:** P(X = k) = (1 − p)^(k − 1) · p. Com p = 0,2 de conversão por visita, em média são necessárias 1/0,2 = 5 visitas até a primeira compra.

A binomial com n grande e p pequeno é aproximada pela Poisson com λ = np.
`),
    theory('Distribuições contínuas além da normal', `
| distribuição | modela | média | observação |
|---|---|---|---|
| **Uniforme(a, b)** | qualquer valor do intervalo, com a mesma chance | (a + b)/2 | variância (b − a)²/12 |
| **Exponencial(λ)** | tempo até o próximo evento de um processo de Poisson | 1/λ | **sem memória**: ter esperado 10 min não muda a espera futura |
| **Normal(μ, σ)** | somas de muitos efeitos pequenos | μ | simétrica |
| **Log-normal** | produtos de muitos efeitos (renda, preços, tempos) | e^(μ + σ²/2) | o log é normal; assimétrica à direita |
| **t de Student** | médias com σ estimado em amostras pequenas | 0 | caudas mais pesadas que a normal |
| **Qui-quadrado** | somas de normais ao quadrado | gl | testes de independência e de variância |
| **F** | razão de variâncias | — | ANOVA e regressão |
| **Beta** | proporções e taxas (entre 0 e 1) | a/(a + b) | prior de taxas na estatística bayesiana |
| **Gama** | tempos e valores positivos assimétricos | k·θ | generaliza a exponencial |

**Exponencial:** P(X > t) = e^(−λt). Se chegam 12 pedidos por hora (λ = 12/h = 0,2/min), a chance de passar mais de 10 minutos sem pedido é e^(−2) ≈ 0,135.

**Como escolher:** pense no **processo que gera os dados** (contagem? tempo de espera? proporção?), olhe o histograma e compare média e variância.
`),
    exPy('Poisson e exponencial lado a lado', `
Pedidos chegam a 3 por hora em média.
`, r`from math import exp, factorial
lam = 3
for k in range(7):
    print(f"P({k} pedidos na hora) = {exp(-lam) * lam ** k / factorial(k):.3f}")
rng = np.random.default_rng(0)
cont = rng.poisson(lam, 100_000)
print("simulado → média:", cont.mean().round(3), "| variância:", cont.var().round(3))
esperas = rng.exponential(scale=60 / lam, size=100_000)   # minutos entre pedidos
print("espera média (min):", esperas.mean().round(1), "| P(espera > 30 min):", (esperas > 30).mean().round(3), "| teórico:", round(exp(-lam * 0.5), 3))`, `
Na Poisson, média e variância são ≈ 3. O tempo entre pedidos é exponencial, com média 60/3 = 20 minutos; P(espera > 30 min) = e^(−1,5) ≈ 0,223.
`, N),
    py('Escreva `poisson_pmf(k, lam)` com a fórmula e^(−λ)·λᵏ/k! (use `math.exp` e `math.factorial`) e crie `p_mais_de_2`: P(X > 2) para λ = 1,5 (use o complementar).',
      r`from math import exp, factorial
def poisson_pmf(k, lam):
    return exp(-lam) * lam ** k / factorial(k)
p_mais_de_2 = 1 - sum(poisson_pmf(k, 1.5) for k in range(3))`,
      r`from math import exp
assert abs(poisson_pmf(0, 2) - exp(-2)) < 1e-12
assert abs(p_mais_de_2 - (1 - exp(-1.5) * (1 + 1.5 + 1.125))) < 1e-12`),
    py('A conversão por visita é p = 0,25. Crie `esperado_visitas` (nº médio de visitas até a 1ª compra, distribuição geométrica) e `p_ate_3`: P(comprar em até 3 visitas) = 1 − (1 − p)³.',
      r`esperado_visitas = 1 / 0.25
p_ate_3 = 1 - (1 - 0.25) ** 3`,
      r`assert esperado_visitas == 4 and abs(p_ate_3 - 0.578125) < 1e-12`),
    py('O tempo entre chamados no suporte é exponencial com média de 8 minutos (λ = 1/8 por minuto). Crie `p_mais_15`: P(esperar mais de 15 minutos) = e^(−λ·15).',
      r`from math import exp
p_mais_15 = exp(-15 / 8)`,
      r`from math import exp
assert abs(p_mais_15 - exp(-1.875)) < 1e-12`),
    quiz('Número de chamados que chegam ao suporte por hora: qual distribuição é a candidata natural?', ['Poisson', 'Normal', 'Uniforme', 'Beta'], 0),
    quiz('Uma contagem tem média 4 e variância 20. A Poisson é adequada?', ['Não: há superdispersão (variância ≫ média); considere a binomial negativa', 'Sim, perfeitamente', 'Só se n for grande', 'Sim, se arredondar'], 0),
    quiz('O que significa a propriedade "sem memória" da exponencial?', ['O tempo que já se esperou não altera a distribuição da espera restante', 'Os dados são esquecidos', 'A média é zero', 'A variância é infinita'], 0),
  ],
};

const L_TCL = {
  id: 'st-2-6', title: 'Lei dos grandes números e Teorema Central do Limite',
  steps: [
    theory('Lei dos grandes números (LGN)', `
A **LGN** diz que, conforme o número de observações independentes cresce, a **média amostral se aproxima do valor esperado**. É por isso que:
- a taxa de conversão medida com 100.000 usuários é confiável e com 20 não é
- cassinos e seguradoras lucram de forma previsível: cada jogo é incerto, a média de milhões não é
- simulações de Monte Carlo funcionam

Ela **não** diz que os resultados "se compensam" no curto prazo. Depois de 5 caras seguidas, a chance da próxima continua 50% (a **falácia do jogador**). A média converge porque as primeiras jogadas são **diluídas** por muitas outras, não corrigidas.
`),
    theory('Teorema Central do Limite (TCL)', `
O **TCL** é o resultado mais importante da estatística aplicada:

> A **distribuição da média** de n observações independentes, com média μ e desvio σ, fica aproximadamente **normal**, com média μ e desvio **σ/√n** (o erro padrão), **qualquer que seja a forma** da distribuição original, desde que n seja grande o bastante.

Consequências práticas:
- dá para construir intervalos de confiança e testes para médias e proporções usando a normal, mesmo com dados assimétricos
- o erro padrão cai com √n

**"Grande o bastante"** depende da forma: dados quase simétricos precisam de n pequeno (~30); muito assimétricos (receita com cauda longa) podem precisar de centenas. Para proporções, use a regra n·p ≥ 10 e n·(1 − p) ≥ 10.

**Distribuição amostral:** é a distribuição de uma estatística (média, proporção, diferença) ao longo de todas as amostras possíveis. Ela é diferente da distribuição dos **dados**: os dados podem ser assimétricos e a média deles, normal.

O TCL **não** vale bem para estatísticas como o máximo, nem para distribuições sem variância finita (caudas extremamente pesadas).
`),
    exPy('Vendo o TCL acontecer', `
Partimos de dados exponenciais (muito assimétricos) e olhamos a distribuição das médias para vários tamanhos de amostra.
`, r`rng = np.random.default_rng(0)
dados = rng.exponential(scale=10, size=1_000_000)
print(f"dados: média {dados.mean():.2f}, desvio {dados.std():.2f}, skew {pd.Series(dados[:100000]).skew():.2f}")
for n in [2, 10, 50, 200]:
    medias = rng.exponential(scale=10, size=(20_000, n)).mean(axis=1)
    print(f"n={n:>3}: média das médias {medias.mean():.2f} | desvio {medias.std():.3f} (σ/√n = {10 / np.sqrt(n):.3f}) | skew {pd.Series(medias).skew():.2f}")`, `
A assimetria das médias cai à medida que n cresce (ficando cada vez mais normal), e o desvio das médias segue σ/√n.
`, { setup: 'import numpy as np\nimport pandas as pd', setupNote: '`np` e `pd` já importados.', packages: PD }),
    py('Simule a LGN: com `rng = np.random.default_rng(1)`, sorteie 10.000 lançamentos de um dado (`rng.integers(1, 7, 10_000)`) e crie `media_acum`: a média acumulada a cada lançamento (`np.cumsum(x) / np.arange(1, n + 1)`).',
      r`rng = np.random.default_rng(1)
x = rng.integers(1, 7, 10_000)
media_acum = np.cumsum(x) / np.arange(1, len(x) + 1)`,
      r`ref = np.random.default_rng(1).integers(1, 7, 10_000)
assert len(media_acum) == 10_000 and abs(media_acum[-1] - ref.mean()) < 1e-12
assert abs(media_acum[-1] - 3.5) < 0.1`, N),
    py('Simule a distribuição amostral: com `rng = np.random.default_rng(2)`, gere uma matriz 5.000 × 40 de uniformes entre 0 e 1 (`rng.random((5000, 40))`), calcule `medias` (média de cada linha) e `ep` (desvio padrão dessas médias). Compare mentalmente com σ/√n = √(1/12)/√40.',
      r`rng = np.random.default_rng(2)
medias = rng.random((5000, 40)).mean(axis=1)
ep = medias.std()`,
      r`ref = np.random.default_rng(2).random((5000, 40)).mean(axis=1)
assert medias.shape == (5000,) and abs(ep - ref.std()) < 1e-12
assert abs(ep - (1 / 12) ** 0.5 / 40 ** 0.5) < 0.003`, N),
    quiz('Depois de 6 caras seguidas numa moeda honesta, a chance de cara no próximo lançamento é...', ['50%', 'Menor que 50%', 'Maior que 50%', 'Depende da LGN'], 0),
    quiz('O TCL afirma que, para n grande, é aproximadamente normal...', ['A distribuição da média amostral', 'A distribuição dos dados', 'O maior valor da amostra', 'Qualquer estatística'], 0),
    quiz('Com σ = 20, qual o erro padrão da média para n = 100?', ['2', '20', '0,2', '200'], 0),
  ],
};

// ───────────────────────────────────────────── LIÇÕES NOVAS: NÍVEL INTERMEDIÁRIO

const L_ESTIM = {
  id: 'st-3-3', title: 'Estimadores e a distribuição t',
  steps: [
    theory('O que faz um bom estimador', `
Um **estimador** é uma regra para calcular, a partir da amostra, um valor que estima um parâmetro (a média amostral estima a média da população). Propriedades desejáveis:

| propriedade | significado |
|---|---|
| **não viesado** | em média, acerta o alvo: E[estimador] = parâmetro |
| **eficiente** | entre os não viesados, tem a menor variância |
| **consistente** | converge para o valor verdadeiro quando n cresce |

**Erro quadrático médio (EQM):** EQM = viés² + variância. Às vezes um estimador com um pouco de viés e muito menos variância tem EQM menor (é a ideia da regularização em machine learning).

**Por que n − 1 no desvio amostral:** calcular os desvios em torno da média **da própria amostra** os torna sistematicamente menores do que em torno da média verdadeira. Dividir por n − 1 (correção de Bessel) remove esse viés da variância.

**Estimativa pontual × intervalar:** um número só ("a taxa é 12%") esconde a incerteza; um intervalo ("entre 10% e 14%") a mostra. Sempre reporte o intervalo.
`),
    theory('A distribuição t e o IC para amostras pequenas', `
Quando σ da população é desconhecido (quase sempre) e usamos o s da amostra, a estatística (x̄ − μ) ÷ (s/√n) segue a **distribuição t de Student** com **n − 1 graus de liberdade (gl)**. Ela parece a normal, mas tem **caudas mais pesadas**, refletindo a incerteza extra de estimar σ. Com gl grande, vira a normal.

**IC para a média:** x̄ ± t* · s/√n, onde t* é o valor crítico da t.

| gl | t* (95%) | t* (99%) |
|---|---|---|
| 4 | 2,776 | 4,604 |
| 9 | 2,262 | 3,250 |
| 19 | 2,093 | 2,861 |
| 29 | 2,045 | 2,756 |
| 99 | 1,984 | 2,626 |
| ∞ (normal) | 1,960 | 2,576 |

Com n = 10, usar 1,96 no lugar de 2,262 produziria intervalos estreitos demais (confiança real menor que 95%).

Em Python: \`scipy.stats.t.ppf(0.975, df=9)\` → 2,262; \`scipy.stats.t.interval(0.95, df, loc=x̄, scale=ep)\`.

**Graus de liberdade**, intuitivamente: quantos valores "livres" restam depois de estimar algo dos dados. Com n valores e a média fixada, só n − 1 podem variar livremente.
`),
    exPy('Viés do desvio populacional e IC com t', `
`, r`rng = np.random.default_rng(0)
amostras = rng.normal(0, 10, size=(50_000, 5))      # verdadeiro σ² = 100
print("média de var com n   (ddof=0):", amostras.var(axis=1, ddof=0).mean().round(1))
print("média de var com n-1 (ddof=1):", amostras.var(axis=1, ddof=1).mean().round(1))

x = np.array([12.1, 9.8, 11.4, 10.6, 13.0, 9.9, 11.8, 10.2, 12.5, 11.1])
ep = x.std(ddof=1) / np.sqrt(len(x))
print(f"IC95 com t (2,262): [{x.mean() - 2.262 * ep:.2f}; {x.mean() + 2.262 * ep:.2f}]")
print(f"IC95 com z (1,960): [{x.mean() - 1.96 * ep:.2f}; {x.mean() + 1.96 * ep:.2f}]  ← estreito demais")`, `
Com n = 5, dividir por n dá variância média ≈ 80 (viesada); por n − 1, ≈ 100. O IC com t é mais largo que o com z, como deve ser em amostras pequenas.
`, N),
    py('Para o array `tempos` (n = 10), crie `media`, `ep` (s/√n com ddof=1) e `ic95` = (media − 2,262·ep, media + 2,262·ep), usando o t crítico de 9 graus de liberdade.',
      r`media = tempos.mean()
ep = tempos.std(ddof=1) / np.sqrt(len(tempos))
ic95 = (media - 2.262 * ep, media + 2.262 * ep)`,
      r`m = tempos.mean(); e = tempos.std(ddof=1) / np.sqrt(10)
assert abs(media - m) < 1e-12 and abs(ep - e) < 1e-12
assert abs(ic95[0] - (m - 2.262 * e)) < 1e-9 and abs(ic95[1] - (m + 2.262 * e)) < 1e-9`,
      NS('tempos = np.array([3.2, 4.1, 2.8, 5.0, 3.9, 4.4, 3.1, 4.8, 3.6, 4.0])', '`tempos` (10 tempos de carregamento em segundos) e `np` já carregados.')),
    py('Mostre o viés por simulação: com `rng = np.random.default_rng(3)`, gere 20.000 amostras de tamanho 4 de uma normal com σ = 5 (`rng.normal(0, 5, (20000, 4))`) e crie `media_var_n` (média das variâncias com ddof=0) e `media_var_n1` (com ddof=1).',
      r`rng = np.random.default_rng(3)
a = rng.normal(0, 5, (20000, 4))
media_var_n = a.var(axis=1, ddof=0).mean()
media_var_n1 = a.var(axis=1, ddof=1).mean()`,
      r`a = np.random.default_rng(3).normal(0, 5, (20000, 4))
assert abs(media_var_n - a.var(axis=1).mean()) < 1e-9 and abs(media_var_n1 - a.var(axis=1, ddof=1).mean()) < 1e-9
assert media_var_n < 22 and abs(media_var_n1 - 25) < 1`, N),
    quiz('Por que a distribuição t tem caudas mais pesadas que a normal?', ['Porque incorpora a incerteza de estimar σ com a própria amostra', 'Porque os dados têm outliers', 'Porque n é grande', 'Por convenção'], 0),
    quiz('Com n = 200, o t crítico de 95% é aproximadamente...', ['1,97, quase igual ao z de 1,96', '2,26', '3,0', '1,64'], 0),
    quiz('Um estimador consistente é aquele que...', ['Converge para o valor verdadeiro quando n cresce', 'Nunca erra', 'Tem viés zero em qualquer n', 'Tem a menor variância possível'], 0),
  ],
};

const L_TTESTS = {
  id: 'st-4-4', title: 'Testes t de uma amostra e pareado, e tamanho de efeito',
  steps: [
    theory('Os três testes t', `
| teste | pergunta | estatística | gl |
|---|---|---|---|
| **uma amostra** | a média é diferente de um valor de referência μ₀? | t = (x̄ − μ₀) ÷ (s/√n) | n − 1 |
| **duas amostras independentes** (Welch) | as médias de dois grupos diferentes diferem? | t = (x̄₁ − x̄₂) ÷ √(s₁²/n₁ + s₂²/n₂) | fórmula de Welch |
| **pareado** | a média das **diferenças** dentro de cada par é zero? | t = d̄ ÷ (s_d/√n) | n − 1 |

**Quando usar o pareado:** as mesmas unidades medidas duas vezes (antes/depois do mesmo usuário, a mesma loja em dois meses) ou pares casados. Calcula-se a diferença de cada par, e o teste vira um teste de uma amostra sobre as diferenças.

**Por que importa:** o pareamento remove a variação **entre** unidades (usuários rápidos e lentos), que é ruído para a pergunta. Usar o teste independente em dados pareados joga fora essa vantagem e pode esconder um efeito real.

**Pressupostos:** observações independentes (entre pares, no pareado) e médias aproximadamente normais (pelo TCL, ok com n moderado; com n pequeno e dados muito assimétricos, use Wilcoxon).
`),
    theory('Tamanho de efeito: quanto, e não só se', `
O p-valor diz se há evidência de diferença; o **tamanho de efeito** diz se a diferença **importa**.

**d de Cohen** (diferença em unidades de desvio padrão):
- duas amostras: d = (x̄₁ − x̄₂) ÷ s_combinado, com s_combinado = √(((n₁−1)s₁² + (n₂−1)s₂²) ÷ (n₁ + n₂ − 2))
- pareado: d = d̄ ÷ s_d

Referência de Cohen (use com bom senso, depende da área): 0,2 pequeno, 0,5 médio, 0,8 grande.

Outros tamanhos de efeito: diferença absoluta com IC (o mais útil para o negócio), lift relativo, razão de chances, r de correlação, η² na ANOVA, V de Cramér no qui-quadrado.

**Checagem de pressupostos:**
- **normalidade:** QQ-plot e teste de **Shapiro-Wilk** (\`scipy.stats.shapiro\`). Com n grande, qualquer desvio mínimo dá p pequeno: prefira o gráfico
- **variâncias iguais:** teste de **Levene** (\`scipy.stats.levene\`). O teste de Welch dispensa essa suposição, por isso é o padrão
`),
    exPy('Pareado × independente nos mesmos dados', `
Tempo de carregamento de 12 páginas antes e depois de uma otimização:
`, r`antes = np.array([3.1, 4.5, 2.2, 5.8, 3.9, 6.1, 2.7, 4.8, 3.3, 5.2, 4.0, 2.9])
depois = antes - np.array([0.3, 0.2, 0.4, 0.1, 0.3, 0.2, 0.3, 0.4, 0.1, 0.2, 0.3, 0.2])
d = antes - depois
t_par = d.mean() / (d.std(ddof=1) / np.sqrt(len(d)))
t_ind = (antes.mean() - depois.mean()) / np.sqrt(antes.var(ddof=1) / 12 + depois.var(ddof=1) / 12)
print(f"diferença média: {d.mean():.3f} s")
print(f"t pareado = {t_par:.1f}  |  t independente (errado aqui) = {t_ind:.2f}")
print(f"d de Cohen pareado = {d.mean() / d.std(ddof=1):.2f}")`, `
As páginas variam muito entre si (2 a 6 s), o que é ruído para a pergunta. O pareado elimina essa variação e detecta claramente a melhora; o independente não vê nada.
`, N),
    py('A meta de tempo médio de atendimento é 5 minutos. Para o array `tempos` (n = 15), crie `t` = (média − 5) ÷ (s/√n) e `acima_da_meta` = True se t > 2,145 (t crítico unilateral de 2,5%? use bicaudal 95% com 14 gl: 2,145).',
      r`t = (tempos.mean() - 5) / (tempos.std(ddof=1) / np.sqrt(len(tempos)))
acima_da_meta = t > 2.145`,
      r`ref = (tempos.mean() - 5) / (tempos.std(ddof=1) / np.sqrt(15))
assert abs(t - ref) < 1e-12 and acima_da_meta == (ref > 2.145)`,
      NS('tempos = np.array([5.4, 6.1, 4.9, 5.8, 6.3, 5.2, 5.9, 6.6, 5.1, 5.7, 6.0, 5.5, 4.8, 6.2, 5.6])', '`tempos` (15 atendimentos, em minutos) e `np` já carregados.')),
    py('Os arrays `antes` e `depois` são o gasto mensal dos **mesmos** 10 clientes antes e depois de um programa de fidelidade. Crie `d` (depois − antes), `t_pareado` e `cohen_d` (média de d ÷ desvio amostral de d).',
      r`d = depois - antes
t_pareado = d.mean() / (d.std(ddof=1) / np.sqrt(len(d)))
cohen_d = d.mean() / d.std(ddof=1)`,
      r`dd = depois - antes
assert np.allclose(d, dd)
assert abs(t_pareado - dd.mean() / (dd.std(ddof=1) / np.sqrt(10))) < 1e-12
assert abs(cohen_d - dd.mean() / dd.std(ddof=1)) < 1e-12`,
      NS('antes = np.array([200, 340, 150, 410, 280, 190, 520, 310, 260, 180], dtype=float)\ndepois = np.array([230, 360, 160, 450, 300, 220, 540, 335, 270, 205], dtype=float)', '`antes` e `depois` (gasto de 10 clientes) e `np` já carregados.')),
    py('Calcule o **d de Cohen** para duas amostras independentes `a` e `b`: diferença de médias (b − a) ÷ desvio combinado √(((n₁−1)s₁² + (n₂−1)s₂²)/(n₁+n₂−2)). Guarde em `d`.',
      r`n1, n2 = len(a), len(b)
s_comb = np.sqrt(((n1 - 1) * a.var(ddof=1) + (n2 - 1) * b.var(ddof=1)) / (n1 + n2 - 2))
d = (b.mean() - a.mean()) / s_comb`,
      r`sc = np.sqrt((7 * a.var(ddof=1) + 9 * b.var(ddof=1)) / 16)
assert abs(d - (b.mean() - a.mean()) / sc) < 1e-12`,
      NS('a = np.array([10, 12, 11, 13, 9, 12, 11, 10], dtype=float)\nb = np.array([13, 14, 12, 15, 13, 16, 12, 14, 15, 13], dtype=float)', '`a` (8 valores), `b` (10 valores) e `np` já carregados.')),
    quiz('O mesmo grupo de usuários testou a versão antiga e a nova do app. Qual teste usar?', ['t pareado', 't de duas amostras independentes', 'Qui-quadrado', 'ANOVA'], 0),
    quiz('Um teste com 2 milhões de usuários deu p < 0,0001 e d de Cohen = 0,01. Como interpretar?', ['A diferença é real, mas minúscula; avalie se tem relevância prática', 'Efeito enorme', 'Erro de cálculo', 'Não há diferença'], 0),
    quiz('Por que o teste de Welch é o padrão para duas médias independentes?', ['Não exige variâncias iguais e perde pouco quando elas são iguais', 'É mais simples', 'Funciona sem dados', 'Sempre dá p menor'], 0),
  ],
};

const L_DIAG = {
  id: 'st-5-3', title: 'Diagnóstico da regressão',
  steps: [
    theory('Pressupostos da regressão linear (LINE)', `
Os coeficientes de mínimos quadrados sempre podem ser calculados; para que **erros padrão, p-valores e intervalos** sejam confiáveis, valem os pressupostos (mnemônico **LINE**):

| pressuposto | significado | como checar | se violado |
|---|---|---|---|
| **L**inearidade | a relação média é uma reta (nas variáveis usadas) | resíduos × previstos sem curva | transformar (log, polinômio) |
| **I**ndependência | erros não se relacionam entre si | resíduos × tempo, autocorrelação | modelos de séries temporais, erros agrupados |
| **N**ormalidade dos erros | resíduos ~ normais | histograma, QQ-plot | com n grande, pouco importa; senão, bootstrap |
| **E**qual variância (homocedasticidade) | a dispersão dos resíduos é constante | resíduos × previstos em "funil" = heterocedasticidade | log de y, erros padrão robustos (HC3) |

**Resíduo** = valor real − valor previsto. O gráfico de **resíduos × valores previstos** é o diagnóstico mais importante: ele deve parecer uma nuvem sem padrão em torno de zero.
`),
    theory('Pontos influentes, interpretação e intervalos', `
**Outlier** (resíduo grande) × **alavancagem** (x muito distante dos demais) × **influência** (o ponto, sozinho, muda a reta). Um ponto com alta alavancagem e resíduo grande é influente; a **distância de Cook** mede isso (valores > 4/n merecem olhar). Ajuste o modelo com e sem o ponto e compare.

**Interpretando com logs:**

| modelo | interpretação de b |
|---|---|
| y ~ x | +1 em x → +b em y |
| log(y) ~ x | +1 em x → y multiplicado por e^b (≈ +100·b %) |
| y ~ log(x) | x 1% maior → y aumenta b/100 |
| log(y) ~ log(x) | x 1% maior → y b% maior (**elasticidade**) |

**Intervalo de confiança × intervalo de previsão:**
- o IC da **média** de y para um dado x é estreito (incerteza só da reta)
- o **intervalo de previsão** para **um novo caso** é bem mais largo: soma a incerteza da reta e a variação individual (aproximadamente ŷ ± 2 · desvio dos resíduos)

**Extrapolar** fora da faixa de x observada é arriscado: a relação pode mudar.
`),
    exPy('Resíduos de dois modelos', `
`, r`rng = np.random.default_rng(0)
x = rng.uniform(1, 10, 300)
y = 50 * np.exp(0.3 * x) * rng.lognormal(0, 0.2, 300)      # relação exponencial com ruído multiplicativo

b, a = np.polyfit(x, y, 1)
res = y - (a + b * x)
b2, a2 = np.polyfit(x, np.log(y), 1)
res_log = np.log(y) - (a2 + b2 * x)
for nome, rr, xx in [("y ~ x", res, x), ("log(y) ~ x", res_log, x)]:
    baixo, alto = rr[xx < 4].std(), rr[xx > 7].std()
    print(f"{nome:<11} desvio dos resíduos: x<4 → {baixo:.2f} | x>7 → {alto:.2f}")
print(f"no log: cada +1 em x multiplica y por {np.exp(b2):.3f} (+{(np.exp(b2) - 1) * 100:.1f}%)")`, `
No modelo linear, a dispersão dos resíduos cresce muito com x (funil: heterocedasticidade) e há curvatura. No log, a dispersão fica estável e o coeficiente vira uma taxa de crescimento.
`, N),
    py('Ajuste `receita ~ visitantes` em `diarias` com `np.polyfit`, crie o array `residuos` (real − previsto) e `desvio_res` (desvio padrão amostral dos resíduos). Depois crie `ip_900`: a tupla (previsão − 2·desvio_res, previsão + 2·desvio_res) para 900 visitantes (intervalo de previsão aproximado).',
      r`x = diarias["visitantes"].to_numpy(dtype=float)
y = diarias["receita"].to_numpy(dtype=float)
b, a = np.polyfit(x, y, 1)
residuos = y - (a + b * x)
desvio_res = residuos.std(ddof=1)
prev = a + b * 900
ip_900 = (prev - 2 * desvio_res, prev + 2 * desvio_res)`,
      r`x = diarias.visitantes.to_numpy(float); y = diarias.receita.to_numpy(float)
b, a = np.polyfit(x, y, 1); rr = y - (a + b * x)
assert abs(residuos.mean()) < 1e-6 and abs(desvio_res - rr.std(ddof=1)) < 1e-6
assert abs((ip_900[0] + ip_900[1]) / 2 - (a + b * 900)) < 1e-6`, S),
    py('Ajuste `log(receita) ~ visitantes` (use `np.log` em y) e crie `efeito_pct`: o efeito percentual de **+100 visitantes** na receita, (e^(100·b) − 1) × 100.',
      r`x = diarias["visitantes"].to_numpy(dtype=float)
b, a = np.polyfit(x, np.log(diarias["receita"].to_numpy(dtype=float)), 1)
efeito_pct = (np.exp(100 * b) - 1) * 100`,
      r`b = np.polyfit(diarias.visitantes.to_numpy(float), np.log(diarias.receita.to_numpy(float)), 1)[0]
assert abs(efeito_pct - (np.exp(100 * b) - 1) * 100) < 1e-6 and efeito_pct > 0`, S),
    quiz('O gráfico de resíduos × previstos tem forma de funil (dispersão cresce). Isso indica...', ['Heterocedasticidade', 'Multicolinearidade', 'Autocorrelação', 'Ajuste perfeito'], 0),
    quiz('No modelo log(vendas) ~ log(preço), o coeficiente é −1,8. Interpretação:', ['Preço 1% maior → vendas cerca de 1,8% menores (elasticidade)', 'Preço +1 real → vendas −1,8', 'Vendas caem 180%', 'Não dá para interpretar'], 0),
    quiz('Qual intervalo é mais largo para x = 900?', ['O intervalo de previsão de um novo dia', 'O IC da média de y', 'São iguais', 'Depende do p-valor'], 0),
  ],
};

export const STATS_PLUS = {
  examples: { ...examples, ...STATS_PLUS2.examples },
  lessons: [
    { unit: 'st-u0', after: 'st-0-2', lesson: L_AMOSTRAGEM },
    { unit: 'st-u1', after: 'st-1-3', lesson: L_FORMA },
    { unit: 'st-u2', first: true, lesson: L_REGRAS },
    { unit: 'st-u2', after: 'st-2-1', lesson: L_VA },
    { unit: 'st-u2', after: 'st-2-3', lesson: L_DISTR },
    { unit: 'st-u2', after: 'st-2-5', lesson: L_TCL },
    { unit: 'st-u3', after: 'st-3-2', lesson: L_ESTIM },
    { unit: 'st-u4', after: 'st-4-3', lesson: L_TTESTS },
    { unit: 'st-u5', after: 'st-5-2', lesson: L_DIAG },
    ...STATS_PLUS2.lessons,
  ],
  units: STATS_PLUS2.units,
};
