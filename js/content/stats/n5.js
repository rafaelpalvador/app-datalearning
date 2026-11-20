// Estatística — Nível 5 (complementos): causal, bayesiana hierárquica, Cox, multivariada e o capstone
import { theory, quiz, order, py, exPy } from '../helpers.js';
import { P, PM } from './dados.js';

const r = String.raw;

// Dados observacionais de um programa de fidelidade (quem entrou escolheu entrar)
const FIDELIDADE = r`
_rg = np.random.default_rng(77)
_n = 5000
fidelidade = pd.DataFrame({
    "gasto_anterior": np.round(_rg.gamma(2, 150, size=_n), 2),
    "meses_cliente": _rg.integers(1, 60, size=_n),
    "app": (_rg.random(_n) < 0.55).astype(int),
})
_lp = -2.2 + 0.004 * fidelidade.gasto_anterior + 0.02 * fidelidade.meses_cliente + 0.8 * fidelidade.app
fidelidade["aderiu"] = (_rg.random(_n) < 1 / (1 + np.exp(-_lp))).astype(int)
fidelidade["gasto_depois"] = np.round(50 + 0.9 * fidelidade.gasto_anterior + 1.5 * fidelidade.meses_cliente + 40 * fidelidade.app + 30 * fidelidade.aderiu + _rg.normal(0, 40, _n), 2)
`;
const PF = { ...P, setup: P.setup + FIDELIDADE, setupNote: 'Já carregados: `fidelidade` (5 mil clientes: gasto_anterior, meses_cliente, app, aderiu ao programa (0/1), gasto_depois), `pd` e `np`. O efeito verdadeiro do programa, usado para gerar os dados, é +30 no gasto.' };

export const L_CAUSAL_BASE = {
  id: 'st-24-1', title: 'Resultados potenciais, DAGs e ponderação pelo inverso da propensão (IPW)',
  steps: [
    theory('Causalidade como um problema de dados faltantes', `
**Resultados potenciais (Rubin):** cada cliente i tem dois resultados possíveis: Yᵢ(1) se recebe o tratamento (entra no programa de fidelidade) e Yᵢ(0) se não recebe. O **efeito causal individual** é Yᵢ(1) − Yᵢ(0), mas só observamos **um** dos dois: o outro é o *contrafactual*. Causalidade é, no fundo, estimar o que falta.

Estimandos:
- **ATE** (efeito médio do tratamento): E[Y(1) − Y(0)] na população toda
- **ATT** (nos tratados): o efeito em quem de fato recebeu, a pergunta típica de ROI ("quanto a campanha rendeu nos clientes que a receberam?")

A diferença ingênua de médias = ATT + **viés de seleção** (quem aderiu já gastaria mais de qualquer jeito).

**DAGs (Pearl):** um grafo com setas de causa para efeito torna as premissas explícitas:
| estrutura | exemplo | o que fazer |
|---|---|---|
| **confundidor** X → T e X → Y | gasto anterior causa a adesão e o gasto futuro | **controlar** (ajustar, estratificar, ponderar) |
| **mediador** T → M → Y | programa → mais visitas → mais gasto | **não** controlar se você quer o efeito total |
| **colisor** T → C ← Y | adesão e gasto alto causam "ser convidado para o evento VIP" | **nunca** controlar: abre um caminho falso (viés de colisor) |

**Critério da porta dos fundos:** ajuste um conjunto de variáveis que bloqueie todos os caminhos não causais entre T e Y sem incluir mediadores nem colisores. Ferramentas: \`dowhy\` (identificação e testes de refutação), \`econml\` (efeitos heterogêneos).

**Escore de propensão:** e(x) = P(T = 1 | X = x). Se X contém todos os confundidores (**ignorabilidade**) e há **sobreposição** (0 < e(x) < 1: para cada perfil existem tratados e não tratados), comparar unidades com a mesma propensão é como um experimento.

**IPW (inverse probability weighting):** cria uma "pseudopopulação" sem confundimento, pesando cada tratado por 1/e(x) e cada controle por 1/(1 − e(x)):
\`ATE = Σ(T·Y/e) / Σ(T/e) − Σ((1−T)·Y/(1−e)) / Σ((1−T)/(1−e))\` (versão normalizada, mais estável)
Para o **ATT**: tratados com peso 1, controles com peso e/(1 − e).

**Diagnósticos obrigatórios:** distribuição das propensões nos dois grupos (sobreposição), **pesos extremos** (truncar propensões em [0,01; 0,99] ou estabilizar), e **balanceamento** depois da ponderação (diferença padronizada das médias < 0,1 em cada confundidor).
`),
    exPy('Ingênuo × ajustado: o viés de seleção em números', `
`, r`ing = fidelidade.groupby("aderiu")["gasto_depois"].mean()
print(f"diferença ingênua: {ing[1] - ing[0]:.1f}  (efeito verdadeiro: 30)")
print(fidelidade.groupby("aderiu")[["gasto_anterior", "meses_cliente", "app"]].mean().round(2))`, `
Quem aderiu já gastava mais, era cliente há mais tempo e usava mais o app: a diferença ingênua mistura o efeito do programa com essas diferenças. Os confundidores foram medidos; dá para ajustar.
`, PF),
    quiz('No DAG, "programa de fidelidade → número de visitas → gasto". Para medir o efeito TOTAL do programa no gasto, você deve controlar por número de visitas?', ['Não: visitas é mediador; controlar removeria parte do efeito que você quer medir', 'Sim, sempre controle tudo', 'Só se for significativo', 'Sim, é um confundidor'], 0),
    quiz('Você analisa só clientes que foram convidados ao evento VIP, e o convite depende de ter aderido OU de gastar muito. Qual o problema?', ['Viés de colisor: dentro dos convidados, adesão e gasto ficam artificialmente associados', 'Nenhum', 'Confundimento por app', 'Falta de sobreposição'], 0),
    py('Estime a **propensão** de aderir com uma regressão logística por Newton-Raphson (20 iterações, começando em zeros) usando intercepto, `gasto_anterior/100`, `meses_cliente/12` e `app`. Guarde as propensões em `e` (array) e confira a sobreposição guardando `e_min_trat` (menor propensão entre os que aderiram) e `e_max_ctrl` (maior entre os que não aderiram).',
      r`X = np.column_stack([np.ones(len(fidelidade)), fidelidade["gasto_anterior"] / 100, fidelidade["meses_cliente"] / 12, fidelidade["app"]])
t = fidelidade["aderiu"].to_numpy()
b = np.zeros(X.shape[1])
for _ in range(20):
    p = 1 / (1 + np.exp(-X @ b))
    b = b + np.linalg.solve(X.T @ ((p * (1 - p))[:, None] * X), X.T @ (t - p))
e = 1 / (1 + np.exp(-X @ b))
e_min_trat = e[t == 1].min()
e_max_ctrl = e[t == 0].max()`,
      r`_X = np.column_stack([np.ones(len(fidelidade)), fidelidade.gasto_anterior / 100, fidelidade.meses_cliente / 12, fidelidade.app])
assert np.allclose(_X.T @ (fidelidade.aderiu.to_numpy() - e), 0, atol=1e-6)
assert e_min_trat < 0.3 and e_max_ctrl > 0.7`, PF),
    py('Com a propensão `e` (dada) truncada em [0,01; 0,99], calcule o **ATE por IPW normalizado** (`ate_ipw`) e o **ATT** (`att_ipw`: média dos tratados menos a média ponderada dos controles com pesos e/(1 − e)).',
      r`e2 = np.clip(e, 0.01, 0.99)
t = fidelidade["aderiu"].to_numpy(); y = fidelidade["gasto_depois"].to_numpy()
m1 = np.sum(t * y / e2) / np.sum(t / e2)
m0 = np.sum((1 - t) * y / (1 - e2)) / np.sum((1 - t) / (1 - e2))
ate_ipw = m1 - m0
w = e2 / (1 - e2)
att_ipw = y[t == 1].mean() - np.sum(w[t == 0] * y[t == 0]) / np.sum(w[t == 0])`,
      r`_e = np.clip(e, .01, .99); _t = fidelidade.aderiu.to_numpy(); _y = fidelidade.gasto_depois.to_numpy()
_ate = np.sum(_t * _y / _e) / np.sum(_t / _e) - np.sum((1 - _t) * _y / (1 - _e)) / np.sum((1 - _t) / (1 - _e))
assert abs(ate_ipw - _ate) < 1e-9 and 22 < ate_ipw < 38, ate_ipw
_w = _e / (1 - _e); assert abs(att_ipw - (_y[_t == 1].mean() - np.sum(_w[_t == 0] * _y[_t == 0]) / np.sum(_w[_t == 0]))) < 1e-9`,
      { ...PF, setup: PF.setup + r`
_X = np.column_stack([np.ones(len(fidelidade)), fidelidade["gasto_anterior"] / 100, fidelidade["meses_cliente"] / 12, fidelidade["app"]])
_t = fidelidade["aderiu"].to_numpy(); _b = np.zeros(4)
for _ in range(20):
    _p = 1 / (1 + np.exp(-_X @ _b)); _b = _b + np.linalg.solve(_X.T @ ((_p * (1 - _p))[:, None] * _X), _X.T @ (_t - _p))
e = 1 / (1 + np.exp(-_X @ _b))
`, setupNote: PF.setupNote + ' Também já existe `e`, a propensão estimada no exercício anterior.' }),
    py('**Balanceamento:** calcule a diferença padronizada de `gasto_anterior` entre aderentes e não aderentes **antes** (`dp_antes`) e **depois** da ponderação ATE (`dp_depois`), com `(média₁ − média₀) / sqrt((var₁ + var₀) / 2)`, usando médias e variâncias ponderadas por `1/e` (tratados) e `1/(1 − e)` (controles) no "depois". Use `e` truncado em [0,01; 0,99].',
      r`e2 = np.clip(e, 0.01, 0.99)
t = fidelidade["aderiu"].to_numpy(); x = fidelidade["gasto_anterior"].to_numpy()
def dp(x1, x0, w1=None, w0=None):
    m1, m0 = np.average(x1, weights=w1), np.average(x0, weights=w0)
    v1 = np.average((x1 - m1) ** 2, weights=w1); v0 = np.average((x0 - m0) ** 2, weights=w0)
    return (m1 - m0) / np.sqrt((v1 + v0) / 2)
dp_antes = dp(x[t == 1], x[t == 0])
dp_depois = dp(x[t == 1], x[t == 0], 1 / e2[t == 1], 1 / (1 - e2[t == 0]))`,
      r`assert abs(dp_antes) > 0.2 and abs(dp_depois) < 0.1, (dp_antes, dp_depois)`,
      { ...PF, setup: PF.setup + r`
_X = np.column_stack([np.ones(len(fidelidade)), fidelidade["gasto_anterior"] / 100, fidelidade["meses_cliente"] / 12, fidelidade["app"]])
_t = fidelidade["aderiu"].to_numpy(); _b = np.zeros(4)
for _ in range(20):
    _p = 1 / (1 + np.exp(-_X @ _b)); _b = _b + np.linalg.solve(_X.T @ ((_p * (1 - _p))[:, None] * _X), _X.T @ (_t - _p))
e = 1 / (1 + np.exp(-_X @ _b))
`, setupNote: PF.setupNote + ' Também já existe `e`, a propensão estimada.' }),
  ],
};

export const L_HIERARQUICO = {
  id: 'st-24-2', title: 'Modelos hierárquicos e MCMC: aprender com lojas antigas para lojas novas',
  steps: [
    theory('Pooling parcial e amostragem de Monte Carlo via cadeias de Markov', `
**1. Problema:** 30 lojas, algumas com 5.000 visitas e outras recém-abertas com 40. A loja nova teve 6 conversões em 40 (15%): é a melhor da rede ou foi sorte?

Três jeitos de estimar a taxa de cada loja:
| abordagem | estimativa | problema |
|---|---|---|
| **sem pooling** | taxa observada de cada loja | lojas pequenas têm estimativas extremas e instáveis |
| **pooling total** | taxa da rede para todas | ignora diferenças reais entre lojas |
| **pooling parcial (hierárquico)** | cada loja puxada para a média da rede, **mais** quanto menos dados tiver | equilíbrio ótimo ("encolhimento"/*shrinkage*) |

**Modelo hierárquico Beta-Binomial:** conversões da loja j ~ Binomial(nⱼ, θⱼ); θⱼ ~ Beta(a, b) (a distribuição das taxas na rede); a e b têm seus próprios priors (*hiperpriors*) e são aprendidos dos dados de todas as lojas. Com a e b estimados, o posterior de cada loja é **Beta(a + xⱼ, b + nⱼ − xⱼ)**, com média \`(a + xⱼ) ÷ (a + b + nⱼ)\`.

Atalho prático (**Bayes empírico**): estime a e b pelo método dos momentos a partir das taxas das lojas grandes: com média m e variância v das taxas, \`a + b = m(1 − m)/v − 1\`.

**MCMC** (*Markov Chain Monte Carlo*): quando o posterior não tem fórmula, construímos uma cadeia de sorteios que, depois de um aquecimento, se distribui como o posterior. O **Metropolis** mais simples:
1. comece num valor θ
2. proponha θ' = θ + ruído
3. aceite com probabilidade min(1, posterior(θ') ÷ posterior(θ)) (use log para evitar números minúsculos)
4. repita milhares de vezes; descarte o início (*burn-in*)

Diagnósticos: taxa de aceitação (~20–50%), cadeias múltiplas convergindo para o mesmo lugar (**R̂ ≈ 1**), **tamanho amostral efetivo** (ESS). Na prática usa-se **PyMC** (algoritmo NUTS, muito mais eficiente):
~~~python
with pm.Model():
    a = pm.Exponential("a", 0.1); b = pm.Exponential("b", 0.1)
    theta = pm.Beta("theta", a, b, shape=n_lojas)
    pm.Binomial("conv", n=visitas, p=theta, observed=conversoes)
    idata = pm.sample()          # depois: az.summary(idata), az.plot_trace(idata)
~~~
Em R: \`lme4::glmer(cbind(conv, n - conv) ~ 1 + (1 | loja), family = binomial)\` (versão frequentista de efeitos aleatórios).
`),
    exPy('Metropolis para a taxa de uma loja (e conferência com a fórmula)', `
`, r`x, n = 6, 40                      # 6 conversões em 40 visitas
a0, b0 = 3, 97                     # prior: a rede converte ~3%
def log_post(th):
    if not 0 < th < 1: return -np.inf
    return (x + a0 - 1) * np.log(th) + (n - x + b0 - 1) * np.log(1 - th)
rng = np.random.default_rng(3)
th, cadeia, aceitos = 0.05, [], 0
for i in range(20000):
    prop = th + rng.normal(0, 0.02)
    if np.log(rng.random()) < log_post(prop) - log_post(th):
        th, aceitos = prop, aceitos + 1
    cadeia.append(th)
amostras = np.array(cadeia[2000:])
print(f"aceitação {aceitos/20000:.0%} | média MCMC {amostras.mean():.4f} | média exata {(x + a0)/(a0 + b0 + n):.4f}")
print("intervalo de credibilidade 95%:", np.percentile(amostras, [2.5, 97.5]).round(4))`, `
A cadeia reproduz o posterior exato Beta(9, 131): a loja nova provavelmente converte **~6%**, não 15%. O prior da rede "puxou" a estimativa para um valor plausível.
`, P),
    quiz('Uma loja nova com 3 conversões em 10 visitas (30%) numa rede em que as lojas convertem entre 2% e 5%. O modelo hierárquico estima...', ['Algo bem mais perto de 3–5% do que de 30%, com intervalo largo', 'Exatamente 30%', 'A média da rede, ignorando a loja', '0%'], 0),
    quiz('Duas cadeias de MCMC iniciadas em pontos diferentes terminaram em regiões diferentes (R̂ = 1,8). O que fazer?', ['Não confiar no resultado: rodar mais tempo, reparametrizar ou revisar o modelo', 'Usar a média das duas', 'Escolher a cadeia com melhor resultado', 'Nada, R̂ alto é bom'], 0),
    py('**Bayes empírico** para as lojas em `lojas` (colunas `visitas`, `conversoes`): usando as lojas com **pelo menos 1.000 visitas**, calcule a média `m` e a variância `v` das taxas (`ddof=1`), depois `soma = m(1 − m)/v − 1`, `a = m·soma`, `b = (1 − m)·soma`. Crie a coluna `taxa_bruta` e a coluna `taxa_encolhida = (a + conversoes) / (a + b + visitas)` em `lojas`.',
      r`grandes = lojas[lojas["visitas"] >= 1000]
taxas = grandes["conversoes"] / grandes["visitas"]
m, v = taxas.mean(), taxas.var(ddof=1)
soma = m * (1 - m) / v - 1
a, b = m * soma, (1 - m) * soma
lojas["taxa_bruta"] = lojas["conversoes"] / lojas["visitas"]
lojas["taxa_encolhida"] = (a + lojas["conversoes"]) / (a + b + lojas["visitas"])`,
      r`_g = lojas[lojas.visitas >= 1000]; _t = _g.conversoes / _g.visitas; _m, _v = _t.mean(), _t.var(ddof=1); _s = _m * (1 - _m) / _v - 1
assert np.allclose(lojas.taxa_encolhida, (_m * _s + lojas.conversoes) / (_s + lojas.visitas))
_peq = lojas[lojas.visitas < 100]
assert ((_peq.taxa_encolhida - _m).abs() <= (_peq.taxa_bruta - _m).abs() + 1e-12).all()`,
      { setup: r`import numpy as np
import pandas as pd
_rg = np.random.default_rng(12)
_vis = np.concatenate([_rg.integers(1000, 6000, 22), _rg.integers(15, 90, 8)])
_theta = _rg.beta(30, 870, size=30)
lojas = pd.DataFrame({"loja": np.arange(1, 31), "visitas": _vis, "conversoes": _rg.binomial(_vis, _theta)})`,
        setupNote: 'Já carregados: `lojas` (30 lojas: loja, visitas, conversoes; 8 delas são novas, com menos de 100 visitas), `pd` e `np`.', packages: ['pandas'] }),
    py('Implemente o **Metropolis** para o posterior da taxa θ de uma loja com `x = 12` conversões em `n = 200` visitas e prior Beta(2, 60): log-posterior `(x + 1)·ln θ + (n − x + 59)·ln(1 − θ)` (−∞ fora de (0, 1)). Use `rng = np.random.default_rng(9)`, início 0,05, passo normal com desvio 0,01, 30.000 iterações e descarte as 3.000 primeiras. Guarde as amostras em `amostras` e a taxa de aceitação em `taxa_aceite`.',
      r`x, n = 12, 200
def log_post(th):
    if not 0 < th < 1:
        return -np.inf
    return (x + 1) * np.log(th) + (n - x + 59) * np.log(1 - th)
rng = np.random.default_rng(9)
th, cadeia, aceitos = 0.05, [], 0
for _ in range(30000):
    prop = th + rng.normal(0, 0.01)
    if np.log(rng.random()) < log_post(prop) - log_post(th):
        th = prop
        aceitos += 1
    cadeia.append(th)
amostras = np.array(cadeia[3000:])
taxa_aceite = aceitos / 30000`,
      r`assert len(amostras) == 27000
assert abs(amostras.mean() - 14 / 262) < 0.004, amostras.mean()
assert 0.15 < taxa_aceite < 0.9`, { setup: 'import numpy as np', setupNote: 'Já carregado: `np`.' }),
  ],
};

export const L_COX = {
  id: 'st-24-3', title: 'Regressão de Cox: o que acelera o churn',
  steps: [
    theory('Riscos proporcionais', `
**1. Problema:** o Kaplan-Meier (Nível 5) mostra a curva de retenção, e o log-rank compara grupos. Mas quais fatores **aceleram** o cancelamento, controlando uns pelos outros? (plano mensal, canal pago, ticket...)

**Função de risco** (*hazard*) h(t): a taxa instantânea de cancelar no tempo t, entre quem ainda está ativo.

**Modelo de Cox:** \`h(t | x) = h₀(t) × exp(β₁x₁ + β₂x₂ + ...)\`
- h₀(t) é o risco base, **não especificado** (o modelo é semiparamétrico: não supõe uma forma para a curva)
- **razão de riscos** (*hazard ratio*) HR = e^β: HR = 2 para "plano mensal" significa que, a qualquer momento, um cliente mensal tem o **dobro do risco** de cancelar que um anual comparável
- HR < 1 protege; HR > 1 acelera

**Como é ajustado** (verossimilhança parcial): em cada tempo de evento, compara quem cancelou com todos os que estavam **em risco** naquele momento:
\`ln L(β) = Σ_eventos [ xᵢβ − ln Σ_{j em risco} e^{xⱼβ} ]\`
O h₀(t) se cancela, e a maximização é feita por Newton-Raphson. Os censurados contribuem para os conjuntos de risco enquanto estão observados.

**2. Premissas:**
- **riscos proporcionais**: o HR é constante no tempo (as curvas de log(−log S(t)) por grupo são paralelas; teste pelos **resíduos de Schoenfeld**). Se não valer (ex.: o efeito do plano anual some depois da renovação), use estratificação ou interação com o tempo
- censura não informativa (quem sai da observação não tem risco diferente)

\`lifelines\`: \`CoxPHFitter().fit(df, duration_col="meses", event_col="cancelou").print_summary()\`; \`check_assumptions()\`. statsmodels: \`PHReg\`. R: \`survival::coxph(Surv(meses, cancelou) ~ plano + canal)\`.

**4. Para o diretor:** "Clientes do plano mensal cancelam, a qualquer momento, com o dobro da velocidade dos anuais com o mesmo perfil. Migrar 10% da base para o anual aumentaria a vida média em X meses."
`),
    exPy('Verossimilhança parcial de Cox com uma covariável', `
`, r`d = clientes.sort_values("meses")
t = d["meses"].to_numpy(); ev = d["cancelou"].to_numpy(); x = (d["plano"] == "mensal").to_numpy().astype(float)
def loglik(beta):
    eta = beta * x
    return sum(eta[i] - np.log(np.exp(eta[t >= t[i]]).sum()) for i in np.where(ev == 1)[0])
for beta in [0.0, 0.3, 0.6, 0.7, 0.8, 1.0]:
    print(f"β = {beta:.1f} → ln L = {loglik(beta):10.2f}")`, `
O máximo fica perto de β = 0,7, o valor usado na simulação: HR = e^0,7 ≈ 2. (Empates são tratados aqui pelo método de Breslow, o mais simples.)
`, P),
    quiz('No modelo de Cox, canal "indicação" tem HR = 0,74. Como comunicar?', ['Clientes vindos de indicação têm, a cada momento, 26% menos risco de cancelar do que os do canal de referência, com o resto igual', 'Cancelam 0,74 mês depois', '74% deles cancelam', 'Ficam 74% mais tempo'], 0),
    quiz('O efeito do plano anual é forte no 1º ano e some depois da renovação. Que premissa do Cox falhou?', ['Riscos proporcionais (HR constante no tempo)', 'Normalidade', 'Homocedasticidade', 'Independência das covariáveis'], 0),
    py('Ajuste o **modelo de Cox** por Newton-Raphson para `clientes` com as covariáveis `mensal` (plano == "mensal"), `pago` (canal == "pago") e `indicacao` (canal == "indicacao"), nessa ordem. Use a matriz `X` e os vetores `t` (meses) e `ev` (cancelou) dados e a função `grad_hess(beta)` dada (devolve gradiente e hessiana da log-verossimilhança parcial). Comece em zeros, 20 iterações: `beta = beta - solve(H, g)`. Guarde `beta` e `hr` (= e^β).',
      r`beta = np.zeros(3)
for _ in range(20):
    g, H = grad_hess(beta)
    beta = beta - np.linalg.solve(H, g)
hr = np.exp(beta)`,
      r`_g, _ = grad_hess(beta)
assert np.allclose(_g, 0, atol=1e-6)
assert 1.6 < hr[0] < 2.6 and 1.2 < hr[1] < 1.8 and hr[2] < 1`,
      { ...P, setup: P.setup + r`
X = np.column_stack([(clientes.plano == "mensal"), (clientes.canal == "pago"), (clientes.canal == "indicacao")]).astype(float)
t = clientes["meses"].to_numpy(); ev = clientes["cancelou"].to_numpy()
def grad_hess(beta):
    r = np.exp(X @ beta)
    g = np.zeros(X.shape[1]); H = np.zeros((X.shape[1], X.shape[1]))
    for i in np.where(ev == 1)[0]:
        m = t >= t[i]
        s0 = r[m].sum(); s1 = (r[m, None] * X[m]).sum(0); s2 = (r[m, None, None] * X[m, :, None] * X[m, None, :]).sum(0)
        g += X[i] - s1 / s0
        H -= s2 / s0 - np.outer(s1, s1) / s0 ** 2
    return g, H
`, setupNote: P.setupNote + ' Também já existem `X`, `t`, `ev` e a função `grad_hess(beta)`.' }),
    py('Verifique a premissa de **riscos proporcionais** para o plano: calcule o Kaplan-Meier separado para `mensal` e `anual` nos tempos `grade = [2, 4, 6, 8, 10]` (sobrevivência no último evento ≤ cada tempo) e guarde em `ll` um DataFrame com colunas `mensal` e `anual` contendo `log(-log(S))`. Guarde em `dif` a Series `ll.mensal - ll.anual` (aproximadamente constante se a premissa vale).',
      r`def km_em(df, tempos):
    s, saida, eventos = 1.0, [], sorted(df.loc[df["cancelou"] == 1, "meses"].unique())
    curva = {}
    for tt in eventos:
        s *= 1 - ((df["meses"] == tt) & (df["cancelou"] == 1)).sum() / (df["meses"] >= tt).sum()
        curva[tt] = s
    for g in tempos:
        prev = [curva[tt] for tt in eventos if tt <= g]
        saida.append(prev[-1] if prev else 1.0)
    return np.array(saida)

grade = [2, 4, 6, 8, 10]
ll = pd.DataFrame({
    "mensal": np.log(-np.log(km_em(clientes[clientes["plano"] == "mensal"], grade))),
    "anual": np.log(-np.log(km_em(clientes[clientes["plano"] == "anual"], grade))),
}, index=grade)
dif = ll["mensal"] - ll["anual"]`,
      r`assert list(ll.columns) == ["mensal", "anual"] and len(dif) == 5
assert dif.std() < 0.25 and 0.3 < dif.mean() < 1.1, dif.to_dict()`, P),
  ],
};

export const L_MULTI = {
  id: 'st-24-4', title: 'Análise fatorial e misturas gaussianas (GMM) × k-means',
  steps: [
    theory('Fatores latentes e segmentos probabilísticos', `
**Análise fatorial** (\`sklearn.decomposition.FactorAnalysis\`, \`factor_analyzer\`): supõe que as variáveis observadas são geradas por poucos **fatores latentes** + ruído próprio de cada variável: \`x = Λ·f + ε\`.
- diferença para o **PCA** (Nível 5, revisão): o PCA **resume a variância total** (componentes são combinações das variáveis); a fatorial **explica a covariância comum** (variáveis são combinações dos fatores) e separa a variância única (ε)
- uso típico: questionários (10 perguntas de satisfação medem, no fundo, 3 fatores: "preço", "atendimento", "produto"), construção de índices
- **cargas** (*loadings*): correlação de cada variável com cada fator; **rotação** (varimax) facilita a interpretação
- quantos fatores: autovalores > 1 (Kaiser), *scree plot*, interpretabilidade

**Gaussian Mixture Models (GMM)**: os dados vêm de K grupos, cada um uma **normal** com média, variância (e covariância) próprias, e pesos πₖ.
| | k-means | GMM |
|---|---|---|
| atribuição | dura (cada ponto em 1 grupo) | **probabilística** (P(grupo k \\| ponto)) |
| forma dos grupos | esférica, tamanhos parecidos | elíptica, tamanhos e variâncias diferentes |
| escolha de K | cotovelo, silhueta | **BIC** (é um modelo de verossimilhança) |
| custo | rápido | mais lento, pode convergir para ótimos locais |

Ajuste pelo algoritmo **EM** (*Expectation-Maximization*):
- **E**: com os parâmetros atuais, calcule a "responsabilidade" de cada grupo por cada ponto: \`γᵢₖ = πₖ·N(xᵢ | μₖ, σₖ) ÷ Σⱼ πⱼ·N(xᵢ | μⱼ, σⱼ)\`
- **M**: reestime πₖ = média de γ·ₖ; μₖ = média ponderada por γ; σₖ² = variância ponderada
- repita até a log-verossimilhança parar de subir

\`sklearn.mixture.GaussianMixture(n_components=3, covariance_type="full").fit(X)\`; \`.predict_proba(X)\`; \`.bic(X)\`.

**Para o negócio:** "este cliente é 70% 'comprador de oportunidade' e 30% 'fiel'" é uma informação mais rica que um rótulo único, e permite tratar os casos de fronteira com cuidado.
`),
    exPy('GMM em uma dimensão: o ticket em log tem dois grupos?', `
`, r`x = np.log(faturas.drop_duplicates("fatura_id").query("valor > 0")["valor"].to_numpy())
pi, mu, sd = np.array([0.5, 0.5]), np.array([7.0, 10.0]), np.array([1.0, 1.0])
def normal(x, m, s): return np.exp(-0.5 * ((x - m) / s) ** 2) / (s * np.sqrt(2 * np.pi))
for _ in range(200):
    dens = pi * normal(x[:, None], mu, sd)              # E
    gam = dens / dens.sum(axis=1, keepdims=True)
    nk = gam.sum(axis=0)                                # M
    pi, mu = nk / len(x), (gam * x[:, None]).sum(0) / nk
    sd = np.sqrt((gam * (x[:, None] - mu) ** 2).sum(0) / nk)
print("pesos", pi.round(3), "| médias (em R$)", np.exp(mu).round(0), "| desvios (log)", sd.round(3))`, `
O EM separa sozinho um grupo de faturas pequenas (PME) e outro de faturas grandes (Mid-Market/Enterprise misturados), sem ver a coluna de segmento.
`, P),
    quiz('Para segmentar clientes em grupos de tamanhos e dispersões muito diferentes, com probabilidade de pertencimento, use...', ['GMM', 'k-means', 'PCA', 'Regressão linear'], 0),
    quiz('Qual a diferença central entre PCA e análise fatorial?', ['PCA resume a variância total; a fatorial modela a covariância comum por fatores latentes e separa a variância única', 'São idênticos', 'Fatorial só serve para séries temporais', 'PCA exige normalidade'], 0),
    py('Implemente o **EM de um GMM 1D com 2 componentes** sobre `x` (dado): parta de `pi = [0.5, 0.5]`, `mu = [percentil 25, percentil 75]` de x, `sd = [std(x), std(x)]` e faça 300 iterações. Guarde `pi`, `mu`, `sd` (arrays) e `loglik`, a log-verossimilhança final `Σ ln Σₖ πₖ·N(xᵢ | μₖ, σₖ)`.',
      r`def normal(x, m, s):
    return np.exp(-0.5 * ((x - m) / s) ** 2) / (s * np.sqrt(2 * np.pi))

pi = np.array([0.5, 0.5])
mu = np.percentile(x, [25, 75]).astype(float)
sd = np.array([x.std(), x.std()])
for _ in range(300):
    dens = pi * normal(x[:, None], mu, sd)
    gam = dens / dens.sum(axis=1, keepdims=True)
    nk = gam.sum(axis=0)
    pi = nk / len(x)
    mu = (gam * x[:, None]).sum(axis=0) / nk
    sd = np.sqrt((gam * (x[:, None] - mu) ** 2).sum(axis=0) / nk)
loglik = np.log((pi * normal(x[:, None], mu, sd)).sum(axis=1)).sum()`,
      r`_o = np.argsort(mu)
assert np.allclose(np.sort(mu), [2.0, 6.0], atol=0.15), mu
assert abs(pi[_o][0] - 0.65) < 0.05 and abs(sd[_o][1] - 1.5) < 0.15
_n = lambda v, m, s: np.exp(-0.5 * ((v - m) / s) ** 2) / (s * np.sqrt(2 * np.pi))
assert abs(loglik - np.log((pi * _n(x[:, None], mu, sd)).sum(1)).sum()) < 1e-6`,
      { setup: r`import numpy as np
_rg = np.random.default_rng(4)
x = np.concatenate([_rg.normal(2, 0.7, 1300), _rg.normal(6, 1.5, 700)])`, setupNote: 'Já carregados: `x` (2.000 valores vindos de dois grupos misturados) e `np`.' }),
    py('Compare com o **k-means** (K = 2, 1D): inicie os centros em `[percentil 25, percentil 75]` de `x` e repita 50 vezes: atribua cada ponto ao centro mais próximo e recalcule os centros. Guarde `centros` (ordenados) e `rotulos`. Repare que o k-means divide os grupos pela metade da distância entre os centros, mesmo com variâncias diferentes.',
      r`centros = np.percentile(x, [25, 75]).astype(float)
for _ in range(50):
    rotulos = np.argmin(np.abs(x[:, None] - centros[None, :]), axis=1)
    centros = np.array([x[rotulos == k].mean() for k in range(2)])
ordem = np.argsort(centros)
centros = centros[ordem]
rotulos = np.argsort(ordem)[rotulos]`,
      r`assert np.all(np.diff(centros) > 0) and len(rotulos) == len(x)
assert abs(centros[0] - 2) < 0.5 and abs(centros[1] - 6) < 0.8
assert set(np.unique(rotulos)) == {0, 1}`,
      { setup: r`import numpy as np
_rg = np.random.default_rng(4)
x = np.concatenate([_rg.normal(2, 0.7, 1300), _rg.normal(6, 1.5, 700)])`, setupNote: 'Já carregados: `x` e `np`.' }),
  ],
};

export const L_CAPSTONE = {
  id: 'st-24-5', title: 'Capstone sênior: ROI causal de uma campanha e risco de churn',
  steps: [
    theory('O entregável final', `
**Contexto:** uma campanha regional rodou em **15 de 40 lojas** a partir da semana 17. Ninguém sorteou as lojas: o marketing escolheu as maiores. A diretoria pergunta "**quanto a campanha rendeu de verdade?**" e "**os clientes que ela trouxe vão ficar?**".

**Parte 1 — ROI causal com Diferenças em Diferenças (DiD):**
\`efeito = (tratadas depois − tratadas antes) − (controle depois − controle antes)\`
- remove diferenças **fixas** entre os grupos (lojas maiores) e choques **comuns** no tempo (sazonalidade, inflação)
- **premissa de tendências paralelas**: sem campanha, tratadas e controle teriam evoluído igual. Verifique no período **pré**: a diferença entre os grupos deve ser estável (teste de "placebo": finja que a campanha começou antes e veja se aparece efeito)
- em regressão: \`vendas ~ tratada + pos + tratada:pos\` (o coeficiente da interação é o DiD), com **erros-padrão agrupados por loja** (as semanas de uma loja não são independentes); versão com efeitos fixos: \`vendas ~ C(loja) + C(semana) + tratada:pos\`
- **ROI** = (efeito por loja-semana × lojas tratadas × semanas pós × margem) ÷ custo da campanha

**Parte 2 — risco de churn (Cox)** dos clientes adquiridos (\`clientes\`): quais perfis cancelam mais rápido, para direcionar retenção.

**Parte 3 — parecer** de uma página com efeito, incerteza, premissas, riscos e recomendação. Alternativas quando o DiD não serve (tendências não paralelas): **controle sintético** (combinação ponderada de lojas de controle que imita a pré-tendência das tratadas), PSM no nível de loja.
`),
    exPy('As tendências eram paralelas antes da campanha?', `
`, r`import matplotlib.pyplot as plt
m = campanha.groupby(["semana", "tratada"])["vendas"].mean().unstack()
plt.plot(m.index, m[1], label="tratadas"); plt.plot(m.index, m[0], label="controle")
plt.axvline(16.5, color="gray", linestyle="--"); plt.legend(); plt.title("Vendas médias por semana"); plt.xlabel("semana")
dif = (m[1] - m[0])
print("diferença tratadas − controle, semanas 1–16 (média, desvio):", round(dif.loc[:16].mean(), 2), round(dif.loc[:16].std(), 2))
print("depois:", round(dif.loc[17:].mean(), 2))`, `
Antes da campanha, a diferença entre os grupos oscila em torno de um valor fixo (as tratadas são maiores): tendências paralelas plausíveis. Depois, a diferença salta: esse salto é o DiD.
`, PM),
    py('**Parte 1a — DiD 2×2.** Calcule as quatro médias de `vendas` (tratada × pos) e o efeito `did`.',
      r`m = campanha.groupby(["tratada", "pos"])["vendas"].mean()
did = (m.loc[(1, 1)] - m.loc[(1, 0)]) - (m.loc[(0, 1)] - m.loc[(0, 0)])`,
      r`_m = campanha.groupby(["tratada", "pos"]).vendas.mean()
assert abs(did - ((_m[1, 1] - _m[1, 0]) - (_m[0, 1] - _m[0, 0]))) < 1e-9 and 6 < did < 12`, P),
    py('**Parte 1b — regressão com erros agrupados.** Ajuste `vendas = b0 + b1·tratada + b2·pos + b3·tratada·pos` por mínimos quadrados e calcule o **erro-padrão agrupado por loja** de b3: `V = (XᵀX)⁻¹ [Σ_lojas (Xₗᵀeₗ)(Xₗᵀeₗ)ᵀ] (XᵀX)⁻¹`. Guarde `b3`, `ep_cluster` (raiz do elemento [3,3] de V) e o IC 95% `ic = (b3 − 1.96·ep, b3 + 1.96·ep)`.',
      r`X = np.column_stack([np.ones(len(campanha)), campanha["tratada"], campanha["pos"], campanha["tratada"] * campanha["pos"]]).astype(float)
y = campanha["vendas"].to_numpy()
beta, *_ = np.linalg.lstsq(X, y, rcond=None)
e = y - X @ beta
XtX_inv = np.linalg.inv(X.T @ X)
meio = np.zeros((4, 4))
for loja in campanha["loja"].unique():
    idx = (campanha["loja"] == loja).to_numpy()
    s = X[idx].T @ e[idx]
    meio += np.outer(s, s)
V = XtX_inv @ meio @ XtX_inv
b3 = beta[3]
ep_cluster = np.sqrt(V[3, 3])
ic = (b3 - 1.96 * ep_cluster, b3 + 1.96 * ep_cluster)`,
      r`_X = np.column_stack([np.ones(len(campanha)), campanha.tratada, campanha.pos, campanha.tratada * campanha.pos]).astype(float)
_b = np.linalg.lstsq(_X, campanha.vendas.to_numpy(), rcond=None)[0]
assert abs(b3 - _b[3]) < 1e-9 and ic[0] < 9 < ic[1] and ep_cluster > 0`, P),
    py('**Teste placebo:** usando só as semanas **1 a 16** (antes da campanha), finja que ela começou na semana 9 e calcule o DiD falso `did_placebo` (deve ficar perto de zero).',
      r`pre = campanha[campanha["semana"] <= 16].assign(falso_pos=lambda d: (d["semana"] >= 9).astype(int))
m = pre.groupby(["tratada", "falso_pos"])["vendas"].mean()
did_placebo = (m.loc[(1, 1)] - m.loc[(1, 0)]) - (m.loc[(0, 1)] - m.loc[(0, 0)])`,
      r`_p = campanha[campanha.semana <= 16].copy(); _p["fp"] = (_p.semana >= 9).astype(int); _m = _p.groupby(["tratada", "fp"]).vendas.mean()
assert abs(did_placebo - ((_m[1, 1] - _m[1, 0]) - (_m[0, 1] - _m[0, 0]))) < 1e-9 and abs(did_placebo) < 2.5`, P),
    py('**ROI:** com o efeito `did` (dado, em milhares de reais de venda por loja-semana), margem de contribuição de 35%, 15 lojas tratadas, 10 semanas pós e custo de campanha de R$ 300 mil (= 300 em milhares), calcule `lucro_incremental` (em milhares) e `roi` = (lucro incremental − custo) ÷ custo.',
      r`lucro_incremental = did * 15 * 10 * 0.35
roi = (lucro_incremental - 300) / 300`,
      r`assert abs(lucro_incremental - did * 52.5) < 1e-9 and abs(roi - (did * 52.5 - 300) / 300) < 1e-9`,
      { ...P, setup: P.setup + r`
_m = campanha.groupby(["tratada", "pos"])["vendas"].mean()
did = (_m.loc[(1, 1)] - _m.loc[(1, 0)]) - (_m.loc[(0, 1)] - _m.loc[(0, 0)])
`, setupNote: P.setupNote + ' Também já existe `did`, o efeito estimado.' }),
    py('**Parte 2 — Cox nos clientes.** Com `X` (colunas mensal, pago, indicacao), `t`, `ev` e `grad_hess` dados, ajuste o modelo (Newton, 20 iterações) e monte `tabela`, um DataFrame indexado por `["mensal", "pago", "indicacao"]` com a coluna `hr`. Guarde em `maior_risco` o nome do fator com maior HR.',
      r`beta = np.zeros(3)
for _ in range(20):
    g, H = grad_hess(beta)
    beta = beta - np.linalg.solve(H, g)
tabela = pd.DataFrame({"hr": np.exp(beta)}, index=["mensal", "pago", "indicacao"])
maior_risco = tabela["hr"].idxmax()`,
      r`assert list(tabela.index) == ["mensal", "pago", "indicacao"] and maior_risco == "mensal"
assert np.allclose(grad_hess(np.log(tabela.hr.to_numpy()))[0], 0, atol=1e-5)`,
      { ...P, setup: P.setup + r`
X = np.column_stack([(clientes.plano == "mensal"), (clientes.canal == "pago"), (clientes.canal == "indicacao")]).astype(float)
t = clientes["meses"].to_numpy(); ev = clientes["cancelou"].to_numpy()
def grad_hess(beta):
    r = np.exp(X @ beta)
    g = np.zeros(X.shape[1]); H = np.zeros((X.shape[1], X.shape[1]))
    for i in np.where(ev == 1)[0]:
        m = t >= t[i]
        s0 = r[m].sum(); s1 = (r[m, None] * X[m]).sum(0); s2 = (r[m, None, None] * X[m, :, None] * X[m, None, :]).sum(0)
        g += X[i] - s1 / s0
        H -= s2 / s0 - np.outer(s1, s1) / s0 ** 2
    return g, H
`, setupNote: P.setupNote + ' Também já existem `X`, `t`, `ev` e `grad_hess(beta)`.' }),
    theory('O parecer sênior', `
> **A campanha regional gerou R$ X mil de vendas incrementais por loja por semana (IC 95%: A a B), ou R$ Y mil de lucro em 10 semanas, um ROI de Z%.**
> - *Método:* diferenças em diferenças entre as 15 lojas da campanha e 25 lojas de controle, 16 semanas antes e 10 depois, com erros agrupados por loja.
> - *Premissa:* antes da campanha, os dois grupos evoluíam em paralelo (verificado; teste placebo sem efeito).
> - *Limites:* as lojas tratadas foram escolhidas pelo marketing; se elas teriam crescido mais de qualquer jeito **a partir da semana 17**, o efeito está superestimado. Próxima campanha: **sortear** as lojas (ou parte delas) para medir com experimento.
> - *Clientes adquiridos:* os de plano mensal cancelam com o dobro da velocidade dos anuais (Cox, HR ≈ 2), e os de mídia paga ~40% mais rápido. *Recomendação:* oferta de migração para o anual no 2º mês e priorizar indicação no orçamento.

Isso é o nível sênior: **número com incerteza, premissa declarada e testada, limite reconhecido, decisão recomendada**.
`),
    order('Ordene a análise causal sem experimento:', ['desenhar o DAG e listar confundidores', 'escolher o método (DiD, PSM/IPW, RDD, IV, controle sintético)', 'verificar premissas (paralelas, sobreposição, placebo)', 'estimar com incerteza adequada', 'escrever efeito, limites e recomendação']),
  ],
};
