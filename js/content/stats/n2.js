// Estatística — Nível 2 (complementos): Bayes nos negócios, caudas longas e o simulador de Monte Carlo
import { theory, quiz, py, exPy } from '../helpers.js';
import { P, PM } from './dados.js';

const r = String.raw;

export const L_BAYES_NEG = {
  id: 'st-21-1', title: 'Probabilidade total e Bayes nas decisões de negócio',
  steps: [
    theory('Atualizar uma crença com uma evidência nova', `
**1. Problema:** um cliente **atrasou a primeira fatura**. Qual a probabilidade real de ele virar inadimplente (calote)? Bloquear o crédito de todos que atrasam é exagero?

**Lei da probabilidade total:** se os grupos B₁, B₂, ... cobrem todas as possibilidades sem se sobrepor,
\`P(A) = Σ P(A | Bᵢ) × P(Bᵢ)\`
Ex.: P(atraso) = P(atraso | caloteiro) × P(caloteiro) + P(atraso | bom pagador) × P(bom pagador)

**Teorema de Bayes:**
\`P(calote | atraso) = P(atraso | calote) × P(calote) ÷ P(atraso)\`

| termo | nome | no exemplo |
|---|---|---|
| P(calote) | **prior** (taxa base) | 4% dos clientes dão calote |
| P(atraso \\| calote) | **verossimilhança** | 90% dos caloteiros atrasam a 1ª fatura |
| P(atraso \\| bom pagador) | taxa de "falso alarme" | 15% dos bons pagadores também atrasam a 1ª |
| P(calote \\| atraso) | **posterior** | o que queremos |

Conta: P(atraso) = 0,9 × 0,04 + 0,15 × 0,96 = 0,036 + 0,144 = 0,18 → **P(calote | atraso) = 0,036 ÷ 0,18 = 20%**.

**2. Premissas:** as probabilidades condicionais vêm de um histórico comparável (mesmo perfil de cliente, mesma política de cobrança); a taxa base é a do grupo em questão (não a da empresa toda).

**4. Para o diretor:** "De cada 100 clientes que atrasam a primeira fatura, cerca de 20 viram calote e 80 pagam. Bloquear todos prejudica 80 bons clientes; uma régua de cobrança mais firme para esse grupo é mais rentável."

**Atualização sequencial:** o posterior de hoje vira o prior de amanhã. Se o mesmo cliente atrasar a **segunda** fatura também, aplique Bayes de novo, partindo de 20%.
`),
    exPy('Bayes em código, e conferido por simulação', `
`, r`prior, p_atr_cal, p_atr_bom = 0.04, 0.90, 0.15
p_atraso = p_atr_cal * prior + p_atr_bom * (1 - prior)
posterior = p_atr_cal * prior / p_atraso
print(f"P(atraso) = {p_atraso:.3f} | P(calote | atraso) = {posterior:.3f}")

# conferência por simulação: 1 milhão de clientes fictícios
rng = np.random.default_rng(1)
calote = rng.random(1_000_000) < prior
atrasou = np.where(calote, rng.random(1_000_000) < p_atr_cal, rng.random(1_000_000) < p_atr_bom)
print(f"simulação: {calote[atrasou].mean():.3f}")`, `
A simulação confirma a fórmula. Quando estiver em dúvida sobre uma conta de probabilidade, **simule**: é o "teste unitário" do estatístico.
`, P),
    quiz('Na conta acima, por que a probabilidade de calote dado atraso (20%) é tão menor que 90%?', ['Porque bons pagadores são muito mais numerosos (taxa base), e 15% deles também atrasam', 'Porque a conta está errada', 'Porque 90% é a verossimilhança e não importa', 'Porque o prior é alto'], 0),
    py('Escreva a função `posterior(prior, p_e_dado_h, p_e_dado_nao_h)` que devolve P(H | E) por Bayes (com a probabilidade total no denominador). Depois calcule em `p2` a probabilidade de calote de um cliente que atrasou a **primeira e a segunda** fatura, aplicando a função duas vezes (prior 0,04; atraso dado calote 0,90; atraso dado bom pagador 0,15, iguais nas duas faturas).',
      r`def posterior(prior, p_e_dado_h, p_e_dado_nao_h):
    total = p_e_dado_h * prior + p_e_dado_nao_h * (1 - prior)
    return p_e_dado_h * prior / total

p1 = posterior(0.04, 0.90, 0.15)
p2 = posterior(p1, 0.90, 0.15)`,
      r`assert abs(posterior(0.5, 0.8, 0.2) - 0.8) < 1e-12
assert abs(posterior(0.04, 0.9, 0.15) - 0.2) < 1e-12
_p1 = 0.9 * 0.04 / (0.9 * 0.04 + 0.15 * 0.96)
assert abs(p2 - 0.9 * _p1 / (0.9 * _p1 + 0.15 * (1 - _p1))) < 1e-12 and 0.55 < p2 < 0.65`),
    py('Use a base `faturas` (sem duplicatas, valor positivo) para estimar empiricamente por **probabilidade total** a fração de faturas atrasadas: calcule `p_seg` (fração de faturas de cada segmento, com segmento em maiúsculas), `p_atraso_seg` (fração atrasada, `dias_atraso > 0`, em cada segmento) e `p_atraso = Σ p_atraso_seg × p_seg`. Confira que bate com a fração geral.',
      r`f = faturas.drop_duplicates("fatura_id")
f = f[f["valor"] > 0].assign(seg=lambda d: d["segmento"].str.upper())
p_seg = f["seg"].value_counts(normalize=True)
p_atraso_seg = f.groupby("seg")["dias_atraso"].apply(lambda s: (s > 0).mean())
p_atraso = (p_atraso_seg * p_seg).sum()`,
      r`_f = faturas.drop_duplicates("fatura_id"); _f = _f[_f.valor > 0]
assert abs(p_atraso - (_f.dias_atraso > 0).mean()) < 1e-12
assert abs(p_seg.sum() - 1) < 1e-12`, P),
  ],
};

export const L_CAUDAS = {
  id: 'st-21-2', title: 'Log-Normal, Pareto e a regra 80/20',
  steps: [
    theory('Distribuições do dinheiro e do tempo', `
**1. Problema:** receita por cliente, valor de pedido, duração de sessão e tamanho de empresa **não** são normais: são positivos, com muitos valores pequenos e alguns enormes. Usar a normal subestima o risco dos extremos.

**Log-Normal:** X é log-normal se **log(X) é normal**. Surge quando um valor é o **produto** de muitos fatores (preço × quantidade × frequência...).
- parâmetros: μ e σ **do log**
- mediana = \`e^μ\`; média = \`e^(μ + σ²/2)\` (sempre maior que a mediana)
- ajuste: tire o log dos dados e calcule média e desvio
- \`np.random.default_rng().lognormal(mu, sigma)\`; \`scipy.stats.lognorm(s=sigma, scale=np.exp(mu))\`

**Pareto (lei de potência):** \`P(X > x) = (xₘ / x)^α\` para x ≥ xₘ.
- caudas **muito** mais pesadas que a log-normal: com α ≤ 2 a variância é infinita; com α ≤ 1, nem a média existe
- **regra 80/20**: com α ≈ 1,16, os 20% maiores concentram 80% do total
- ajuste de α por máxima verossimilhança: \`α = n ÷ Σ ln(xᵢ / xₘ)\`
- diagnóstico: no gráfico log-log de P(X > x) contra x, a Pareto vira uma **reta** de inclinação −α

**Curva de concentração (Lorenz) e índice de Gini:** ordene os clientes do menor ao maior, acumule a fração de clientes (eixo x) e de receita (eixo y). Quanto mais a curva se afasta da diagonal, mais concentrado. Gini = 1 − 2 × área sob a curva (0 = todos iguais; 1 = um cliente tem tudo).

**4. Para o diretor:** "Nossa receita segue uma cauda longa: 20% dos clientes geram 70%. Perder 5 clientes grandes dói mais do que perder 200 pequenos, e a média esconde isso."
`),
    exPy('A receita das faturas é log-normal?', `
`, r`import matplotlib.pyplot as plt
v = faturas.drop_duplicates("fatura_id")
v = v.loc[(v["valor"] > 0) & (v["segmento"] == "PME"), "valor"]
lv = np.log(v)
mu, sigma = lv.mean(), lv.std()
print(f"mu={mu:.2f} sigma={sigma:.2f} | mediana teórica={np.exp(mu):,.0f} real={v.median():,.0f} | média teórica={np.exp(mu + sigma**2/2):,.0f} real={v.mean():,.0f}")
# QQ-plot do log contra a normal
z = np.sort((lv - mu) / sigma)
n = len(z)
teor = np.sort(np.random.default_rng(0).standard_normal(200_000))[((np.arange(1, n + 1) - 0.5) / n * 200_000).astype(int)]
plt.scatter(teor, z, s=4); plt.plot([-4, 4], [-4, 4], color="gray"); plt.title("QQ-plot de log(valor) — PME"); plt.xlabel("normal teórica"); plt.ylabel("dados")`, `
Os pontos seguem a diagonal (exceto os poucos erros de digitação no alto): o log é aproximadamente normal, então o valor é **log-normal**. Mediana e média teóricas batem com as reais.
`, PM),
    quiz('Numa log-normal com μ = 8 e σ = 1, qual relação vale?', ['média = e^8,5 > mediana = e^8', 'média = mediana', 'média < mediana', 'mediana = e^8,5'], 0),
    quiz('No gráfico log-log de P(X > x), os dados formam uma reta com inclinação −1,1. O que isso sugere?', ['Cauda de Pareto com α ≈ 1,1: concentração extrema, a média amostral é instável', 'Distribuição normal', 'Distribuição uniforme', 'Dados sem outliers'], 0),
    py('Ajuste uma **log-normal** ao valor das faturas Enterprise (sem duplicatas, valor positivo): `mu` e `sigma` do log natural (desvio amostral). Depois calcule `p_acima_100k`, a probabilidade **pelo modelo** de uma fatura passar de R$ 100 mil, usando `from math import erf, sqrt` e a CDF normal `0.5 * (1 + erf(z / sqrt(2)))`.',
      r`from math import erf, sqrt, log
v = faturas.drop_duplicates("fatura_id")
v = v.loc[(v["valor"] > 0) & (v["segmento"] == "Enterprise"), "valor"]
mu, sigma = np.log(v).mean(), np.log(v).std()
z = (log(100_000) - mu) / sigma
p_acima_100k = 1 - 0.5 * (1 + erf(z / sqrt(2)))`,
      r`from math import erf, sqrt, log
_v = faturas.drop_duplicates("fatura_id"); _v = _v.valor[(_v.valor > 0) & (_v.segmento == "Enterprise")]
_m, _s = np.log(_v).mean(), np.log(_v).std()
assert abs(mu - _m) < 1e-9 and abs(sigma - _s) < 1e-9
assert abs(p_acima_100k - (1 - 0.5 * (1 + erf((log(1e5) - _m) / _s / sqrt(2))))) < 1e-9`, P),
    py('Calcule o **índice de Gini** da receita por cliente (faturas sem duplicatas e com valor positivo). Ordene a receita por cliente do menor para o maior, monte `x` = fração acumulada de clientes (começando em 0) e `y` = fração acumulada da receita (começando em 0), calcule a área sob a curva pela regra do trapézio e guarde `gini = 1 - 2 * area`.',
      r`f = faturas.drop_duplicates("fatura_id")
rc = np.sort(f[f["valor"] > 0].groupby("cliente_id")["valor"].sum().to_numpy())
x = np.concatenate([[0], np.arange(1, len(rc) + 1) / len(rc)])
y = np.concatenate([[0], np.cumsum(rc) / rc.sum()])
area = np.sum((x[1:] - x[:-1]) * (y[1:] + y[:-1]) / 2)
gini = 1 - 2 * area`,
      r`_f = faturas.drop_duplicates("fatura_id")
_r = np.sort(_f[_f.valor > 0].groupby("cliente_id").valor.sum().to_numpy()); _n = len(_r)
_g = (2 * np.sum(np.arange(1, _n + 1) * _r) / (_n * _r.sum())) - (_n + 1) / _n
assert abs(gini - _g) < 1e-9 and 0.3 < gini < 0.95`, P),
    py('Estime o **α de Pareto** da receita por cliente, usando só a cauda: clientes com receita acima do **percentil 80** (`xm` = esse percentil). Use o estimador de máxima verossimilhança `alpha = n / Σ ln(x / xm)` sobre os clientes da cauda.',
      r`f = faturas.drop_duplicates("fatura_id")
rc = f[f["valor"] > 0].groupby("cliente_id")["valor"].sum()
xm = rc.quantile(0.8)
cauda = rc[rc > xm]
alpha = len(cauda) / np.log(cauda / xm).sum()`,
      r`_f = faturas.drop_duplicates("fatura_id"); _r = _f[_f.valor > 0].groupby("cliente_id").valor.sum()
_xm = _r.quantile(.8); _c = _r[_r > _xm]
assert abs(alpha - len(_c) / np.log(_c / _xm).sum()) < 1e-9 and alpha > 0`, P),
  ],
};

export const L_PROJETO2 = {
  id: 'st-21-3', title: 'Projeto: simulador de Monte Carlo da receita trimestral',
  steps: [
    theory('Simular em vez de adivinhar', `
**1. Problema:** a diretoria quer saber "qual a chance de batermos a meta de R$ 9 milhões no próximo trimestre?". Uma conta única ("tráfego médio × conversão média × ticket médio") dá **um número**, mas nenhuma ideia de **risco**.

**Monte Carlo:** escrever o processo de geração da receita com distribuições para cada fonte de incerteza, sortear milhares de cenários e olhar a **distribuição** do resultado:

| componente | distribuição | por quê |
|---|---|---|
| visitas por dia | **Poisson**(λ), com λ incerto (ex.: normal em torno do histórico) | contagem de eventos independentes num intervalo |
| pedidos | **Binomial**(visitas, p), com p incerto (ex.: Beta) | cada visita converte ou não |
| valor de cada pedido | **Log-Normal**(μ, σ) | valor monetário positivo, cauda longa |

Receita do trimestre = soma, nos 90 dias, de (soma dos valores dos pedidos do dia).

**Truque de eficiência:** a soma de k valores log-normais não tem fórmula simples, mas com k grande o TLC ajuda: soma ≈ normal com média k·m e variância k·v (m e v da log-normal). Para k pequeno, sorteie cada pedido.

**2. Premissas:** dias independentes (sem campanhas que mudem tudo ao mesmo tempo), parâmetros estáveis no trimestre. Para relaxar: incluir sazonalidade semanal, um "choque" comum a todos os dias (incerteza de λ e p sorteada **uma vez por cenário**) e eventos raros.

**3. Saídas:** percentis P10, P50, P90 (cenário pessimista, central e otimista), **probabilidade de bater a meta**, e o **valor em risco** (quanto se perde no pior 5%).

**4. Para o diretor:** "No cenário central faturamos R$ 8,7 mi. Há 35% de chance de bater a meta de R$ 9 mi e 10% de chance de ficar abaixo de R$ 8,1 mi."
`),
    exPy('Um cenário, depois dez mil', `
`, r`rng = np.random.default_rng(42)
DIAS, N = 90, 10_000
lam = rng.normal(5000, 400, N)                      # tráfego médio diário incerto (1 sorteio por cenário)
p = rng.beta(300, 9700, N)                          # conversão incerta, em torno de 3%
mu, sigma = 5.6, 0.6                                # ticket log-normal (mediana ≈ R$ 270)
m = np.exp(mu + sigma**2 / 2); v = (np.exp(sigma**2) - 1) * np.exp(2 * mu + sigma**2)
visitas = rng.poisson(lam[:, None], size=(N, DIAS))
pedidos = rng.binomial(visitas, p[:, None])
receita_dia = rng.normal(pedidos * m, np.sqrt(pedidos * v))   # soma de log-normais ≈ normal (TLC)
receita = receita_dia.sum(axis=1)
p10, p50, p90 = np.percentile(receita, [10, 50, 90])
print(f"P10 R$ {p10/1e6:.2f} mi | P50 R$ {p50/1e6:.2f} mi | P90 R$ {p90/1e6:.2f} mi")
print(f"chance de bater R$ 3,7 mi: {(receita >= 3.7e6).mean():.1%}")`, `
A incerteza que mais pesa é a dos **parâmetros** (λ e p sorteados uma vez por cenário), não a variação dia a dia: a soma de 90 dias independentes se estabiliza muito.
`, P),
    py('Monte o simulador: com `rng = np.random.default_rng(7)`, `N = 5000` cenários e 90 dias, sorteie por cenário `lam ~ Normal(5000, 400)` e `p ~ Beta(300, 9700)`; por cenário e dia, `visitas ~ Poisson(lam)` e `pedidos ~ Binomial(visitas, p)`; com ticket log-normal (`mu = 5.6`, `sigma = 0.6`), aproxime a receita diária por `Normal(pedidos·m, √(pedidos·v))`. Guarde o vetor `receita` (N valores, receita do trimestre) e `prob_meta`, a probabilidade de passar de R$ 3,7 milhões.',
      r`rng = np.random.default_rng(7)
N, DIAS = 5000, 90
lam = rng.normal(5000, 400, N)
p = rng.beta(300, 9700, N)
mu, sigma = 5.6, 0.6
m = np.exp(mu + sigma**2 / 2)
v = (np.exp(sigma**2) - 1) * np.exp(2 * mu + sigma**2)
visitas = rng.poisson(lam[:, None], size=(N, DIAS))
pedidos = rng.binomial(visitas, p[:, None])
receita = rng.normal(pedidos * m, np.sqrt(pedidos * v)).sum(axis=1)
prob_meta = (receita > 3.7e6).mean()`,
      r`assert receita.shape == (5000,)
_m = np.exp(5.6 + .18); _esperado = 90 * 5000 * 0.03 * _m
assert abs(np.median(receita) / _esperado - 1) < 0.05, (np.median(receita), _esperado)
assert abs(prob_meta - (receita > 3.7e6).mean()) < 1e-12 and 0 < prob_meta < 1
assert 0.03 < np.std(receita) / np.mean(receita) < 0.2`, P),
    py('Com o vetor `receita` já simulado, calcule `p10`, `p50`, `p90` (percentis) e o **valor em risco a 5%** em relação à mediana: `var5 = p50 - percentil 5`. Calcule também a **perda esperada no pior 5%** (`cvar5`): mediana menos a média das receitas abaixo do percentil 5.',
      r`p10, p50, p90 = np.percentile(receita, [10, 50, 90])
q5 = np.percentile(receita, 5)
var5 = p50 - q5
cvar5 = p50 - receita[receita <= q5].mean()`,
      r`_q = np.percentile(receita, [5, 10, 50, 90])
assert np.allclose([p10, p50, p90], _q[1:]) and abs(var5 - (_q[2] - _q[0])) < 1e-6
assert cvar5 >= var5 > 0`,
      { ...P, setup: P.setup + r`
_rg = np.random.default_rng(7)
_lam = _rg.normal(5000, 400, 5000); _p = _rg.beta(300, 9700, 5000)
_m = np.exp(5.6 + 0.18); _v = (np.exp(0.36) - 1) * np.exp(11.2 + 0.36)
_vis = _rg.poisson(_lam[:, None], size=(5000, 90)); _ped = _rg.binomial(_vis, _p[:, None])
receita = _rg.normal(_ped * _m, np.sqrt(_ped * _v)).sum(axis=1)
`, setupNote: P.setupNote + ' Também já existe `receita`: 5.000 cenários simulados do trimestre.' }),
    py('**Análise de sensibilidade:** qual alavanca muda mais a receita mediana? Usando a função dada `simular(lam_medio, p_medio)` (devolve a mediana da receita), calcule em `ganho_trafego` o aumento da mediana com **+10% de tráfego** (lam_medio 5500) e em `ganho_conversao` o aumento com **+10% de conversão** (p_medio 0,033), ambos em relação ao cenário base (5000; 0,03).',
      r`base = simular(5000, 0.03)
ganho_trafego = simular(5500, 0.03) - base
ganho_conversao = simular(5000, 0.033) - base`,
      r`_b = simular(5000, 0.03)
assert abs(ganho_trafego - (simular(5500, 0.03) - _b)) < 1e-6 and abs(ganho_conversao - (simular(5000, 0.033) - _b)) < 1e-6
assert ganho_trafego > 0 and ganho_conversao > 0`,
      { ...P, setup: P.setup + r`
def simular(lam_medio, p_medio, N=4000, DIAS=90):
    rg = np.random.default_rng(11)
    lam = rg.normal(lam_medio, lam_medio * 0.08, N)
    k = 10000
    p = rg.beta(p_medio * k, (1 - p_medio) * k, N)
    m = np.exp(5.6 + 0.18); v = (np.exp(0.36) - 1) * np.exp(11.2 + 0.36)
    ped = rg.binomial(rg.poisson(lam[:, None], size=(N, DIAS)), p[:, None])
    return float(np.median(rg.normal(ped * m, np.sqrt(ped * v)).sum(axis=1)))
`, setupNote: P.setupNote + ' Também já existe a função `simular(lam_medio, p_medio)`, que devolve a receita mediana do trimestre.' }),
    quiz('Por que sortear λ e p **uma vez por cenário** (e não por dia)?', ['Porque representam incerteza sobre o patamar do trimestre todo; sortear por dia faria os erros se cancelarem e subestimaria o risco', 'Para o código ficar mais rápido', 'Porque Poisson exige', 'Não faz diferença'], 0),
  ],
};
