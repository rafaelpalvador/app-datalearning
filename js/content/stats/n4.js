// Estatística — Nível 4 (complementos): associação, regressão aplicada, GLMs, seleção de modelos e previsão
import { theory, quiz, order, py, exPy } from '../helpers.js';
import { P, PM } from './dados.js';

const r = String.raw;

export const L_CRAMER = {
  id: 'st-23-1', title: 'Associação entre categorias (V de Cramér) e correlação de postos',
  steps: [
    theory('Medir força, não só significância', `
**1. Problema:** "a origem do lead está associada ao porte da empresa?" O qui-quadrado diz **se** há associação; com amostras grandes, até associações minúsculas dão p < 0,001. Falta medir **o tamanho**.

**V de Cramér** (0 = nenhuma associação, 1 = total), para uma tabela r × c com n observações:
\`V = √( χ² ÷ (n × (min(r, c) − 1)) )\`
Leitura aproximada (com min(r,c) − 1 = 1): 0,1 fraca, 0,3 moderada, 0,5 forte.

**Mapa das medidas de associação:**
| tipos | medida |
|---|---|
| numérica × numérica, relação linear | **Pearson** |
| numérica × numérica, relação monotônica ou com outliers | **Spearman** (Pearson dos postos), **Kendall τ** (pares concordantes − discordantes, melhor com muitos empates e amostras pequenas) |
| categórica × categórica | **V de Cramér** (phi para 2 × 2) |
| categórica × numérica | **η²** (razão de correlação: variância entre grupos ÷ total) |
| binária × numérica | correlação **ponto-bisserial** (= Pearson com 0/1) |

**Correlação não implica causalidade**: confundidores (tamanho da empresa causa mais contatos **e** mais conversão), causalidade reversa, coincidência entre séries com tendência. O Nível 5 trata de como chegar à causa.
`),
    exPy('V de Cramér entre origem e porte', `
`, r`L = leads.assign(porte=pd.cut(leads["funcionarios"], [0, 20, 100, 500, np.inf], labels=["micro", "pequena", "média", "grande"]))
tab = pd.crosstab(L["origem"], L["porte"])
esp = np.outer(tab.sum(axis=1), tab.sum(axis=0)) / tab.to_numpy().sum()
chi2 = ((tab.to_numpy() - esp) ** 2 / esp).sum()
n = tab.to_numpy().sum()
V = np.sqrt(chi2 / (n * (min(tab.shape) - 1)))
print(tab); print(f"\nχ² = {chi2:.1f}  V de Cramér = {V:.3f}")`, `
Nos dados simulados, origem e porte foram sorteados de forma independente: o V fica perto de zero, como deveria.
`, P),
    py('Escreva `cramers_v(x, y)` que recebe duas Series categóricas e devolve o V de Cramér (use `pd.crosstab`, frequências esperadas `linha × coluna ÷ n`). Depois calcule `v_demo` entre `leads.origem` e `leads.converteu`.',
      r`def cramers_v(x, y):
    tab = pd.crosstab(x, y).to_numpy()
    n = tab.sum()
    esp = np.outer(tab.sum(axis=1), tab.sum(axis=0)) / n
    chi2 = ((tab - esp) ** 2 / esp).sum()
    return np.sqrt(chi2 / (n * (min(tab.shape) - 1)))

v_demo = cramers_v(leads["origem"], leads["converteu"])`,
      r`_a = pd.Series(list("aabbccaabbcc") * 10); _b = pd.Series(list("xxyyzzxxyyzz") * 10)
assert abs(cramers_v(_a, _b) - 1) < 1e-9
_t = pd.crosstab(leads.origem, leads.converteu).to_numpy(); _n = _t.sum(); _e = np.outer(_t.sum(1), _t.sum(0)) / _n
assert abs(v_demo - np.sqrt(((_t - _e) ** 2 / _e).sum() / _n)) < 1e-9 and 0 < v_demo < 0.5`, P),
    py('Calcule a correlação de **Spearman** entre `funcionarios` e `valor_contrato` como a correlação de Pearson **dos postos** (`.rank()`). Guarde em `rho` e a de Pearson dos valores brutos em `pearson`.',
      r`rho = np.corrcoef(leads["funcionarios"].rank(), leads["valor_contrato"].rank())[0, 1]
pearson = np.corrcoef(leads["funcionarios"], leads["valor_contrato"])[0, 1]`,
      r`assert abs(rho - leads[["funcionarios", "valor_contrato"]].corr(method="spearman").iloc[0, 1]) < 1e-9
assert abs(pearson - leads.funcionarios.corr(leads.valor_contrato)) < 1e-9`, P),
  ],
};

export const L_INTERACAO = {
  id: 'st-23-2', title: 'Interações, transformações log e elasticidade; heterocedasticidade e influência',
  steps: [
    theory('Coeficientes que respondem perguntas de negócio', `
**Interpretação ceteris paribus:** em \`y = β₀ + β₁x₁ + β₂x₂\`, β₁ é a variação de y quando x₁ sobe 1 unidade **mantendo x₂ fixo**. Com preditores correlacionados, "manter fixo" é uma abstração: por isso o VIF importa.

**Transformações e leitura dos coeficientes:**
| modelo | leitura de β |
|---|---|
| \`y ~ x\` | +1 em x → +β em y |
| \`log(y) ~ x\` (log-linear) | +1 em x → y × e^β (≈ +100·β %) |
| \`y ~ log(x)\` | +1% em x → +β/100 em y |
| \`log(y) ~ log(x)\` (**log-log**) | +1% em x → +β % em y: **elasticidade** |

**Elasticidade-preço:** \`log(quantidade) ~ log(preço)\`, β = −1,8 significa que +1% no preço reduz a quantidade em 1,8% (demanda elástica: subir preço reduz a receita).

**Interação:** \`y ~ x₁ + x₂ + x₁·x₂\`: o efeito de x₁ **depende** de x₂. Ex.: o efeito de fazer demo pode ser maior para empresas grandes. Com interação, β₁ sozinho vale só quando x₂ = 0 (centralize x₂ para facilitar).

**Diagnósticos de nível sênior** (além de linearidade e normalidade dos resíduos, vistos antes):
- **Heterocedasticidade** (variância do erro muda com x): erros-padrão errados → p-valores e ICs inválidos. **Teste de Breusch-Pagan**: regrida os resíduos² nos preditores; \`LM = n × R²\` dessa regressão auxiliar segue χ² com k graus de liberdade (k = preditores). Para k = 1, LM > 3,84 → heterocedasticidade a 5%. Remédios: transformar y (log), **erros-padrão robustos** (HC3: \`fit(cov_type="HC3")\` no statsmodels), mínimos quadrados ponderados
- **Influência**: alavancagem (hᵢᵢ, valores extremos de x) × resíduo. **Distância de Cook** > 4/n merece inspeção; refaça o modelo sem o ponto e veja se a conclusão muda
- **Independência**: resíduos de dados no tempo costumam ser autocorrelacionados (Durbin-Watson ≈ 2 é bom)

statsmodels: \`smf.ols("np.log(valor_contrato) ~ np.log(funcionarios) * demo", data=leads).fit(cov_type="HC3")\`, \`statsmodels.stats.diagnostic.het_breuschpagan\`, \`results.get_influence().cooks_distance\`.
`),
    exPy('Elasticidade do contrato ao porte, com e sem log', `
`, r`X = np.column_stack([np.ones(len(leads)), np.log(leads["funcionarios"])])
y = np.log(leads["valor_contrato"])
beta, *_ = np.linalg.lstsq(X, y, rcond=None)
print(f"log-log: +1% de funcionários → {beta[1]:.3f}% no valor do contrato")

# Breusch-Pagan no modelo SEM log (valor em reais contra funcionários)
Xb = np.column_stack([np.ones(len(leads)), leads["funcionarios"]])
yb = leads["valor_contrato"].to_numpy()
res = yb - Xb @ np.linalg.lstsq(Xb, yb, rcond=None)[0]
g, *_ = np.linalg.lstsq(Xb, res**2, rcond=None)
r2 = 1 - ((res**2 - Xb @ g) ** 2).sum() / ((res**2 - (res**2).mean()) ** 2).sum()
print(f"Breusch-Pagan (linear): LM = {len(yb) * r2:.1f} (crítico 3,84)")`, `
O valor do contrato cresce com o porte numa taxa de cerca de 0,35% para cada 1% de funcionários (como foi simulado). No modelo em reais, a variância explode com o porte: Breusch-Pagan acusa heterocedasticidade. O log resolve as duas coisas.
`, P),
    quiz('Num modelo log-log de vendas contra preço, β = −0,4. O que acontece com a receita (preço × quantidade) se o preço subir 10%?', ['Sobe cerca de 6%: a quantidade cai só ~4%', 'Cai 4%', 'Cai 40%', 'Não muda'], 0),
    quiz('O teste de Breusch-Pagan acusou heterocedasticidade. O que fica inválido se nada for feito?', ['Os erros-padrão, p-valores e intervalos dos coeficientes (as estimativas pontuais continuam não viesadas)', 'Os coeficientes ficam viesados', 'O R²', 'Nada'], 0),
    py('Ajuste por mínimos quadrados o modelo `log(valor_contrato) ~ log(funcionarios) + demo + log(funcionarios)·demo` (com intercepto, nessa ordem de colunas). Guarde os coeficientes em `beta` (array de 4) e em `efeito_demo_grande` o efeito de `demo` (em log) para uma empresa com 500 funcionários: `beta[2] + beta[3] * log(500)`.',
      r`lf = np.log(leads["funcionarios"])
X = np.column_stack([np.ones(len(leads)), lf, leads["demo"], lf * leads["demo"]])
y = np.log(leads["valor_contrato"])
beta, *_ = np.linalg.lstsq(X, y, rcond=None)
efeito_demo_grande = beta[2] + beta[3] * np.log(500)`,
      r`_lf = np.log(leads.funcionarios); _X = np.column_stack([np.ones(len(leads)), _lf, leads.demo, _lf * leads.demo])
_b = np.linalg.lstsq(_X, np.log(leads.valor_contrato), rcond=None)[0]
assert np.allclose(beta, _b) and abs(efeito_demo_grande - (_b[2] + _b[3] * np.log(500))) < 1e-9`, P),
    py('Calcule a **distância de Cook** de cada observação no modelo `valor_contrato ~ funcionarios` (com intercepto): alavancagem `h = diag(X (XᵀX)⁻¹ Xᵀ)` (calcule só a diagonal: `h = np.sum(X @ np.linalg.inv(X.T @ X) * X, axis=1)`), resíduos `e`, `s2 = Σe² / (n − p)` e `cook = e² / (p · s2) · h / (1 − h)²`. Guarde `cook` e `n_influentes` (quantos com cook > 4/n).',
      r`X = np.column_stack([np.ones(len(leads)), leads["funcionarios"]])
y = leads["valor_contrato"].to_numpy()
n, p = X.shape
b, *_ = np.linalg.lstsq(X, y, rcond=None)
e = y - X @ b
h = np.sum(X @ np.linalg.inv(X.T @ X) * X, axis=1)
s2 = (e ** 2).sum() / (n - p)
cook = e ** 2 / (p * s2) * h / (1 - h) ** 2
n_influentes = int((cook > 4 / n).sum())`,
      r`_X = np.column_stack([np.ones(len(leads)), leads.funcionarios]); _y = leads.valor_contrato.to_numpy(); _n, _p = _X.shape
_e = _y - _X @ np.linalg.lstsq(_X, _y, rcond=None)[0]; _h = np.sum(_X @ np.linalg.inv(_X.T @ _X) * _X, axis=1)
_c = _e ** 2 / (_p * (_e ** 2).sum() / (_n - _p)) * _h / (1 - _h) ** 2
assert np.allclose(cook, _c) and n_influentes == int((_c > 4 / _n).sum()) and n_influentes > 0`, P),
  ],
};

export const L_GLM = {
  id: 'st-23-3', title: 'Modelos lineares generalizados: Poisson, binomial negativa e Gama',
  steps: [
    theory('Quando y não é "normal e contínuo"', `
**1. Problema:** "quantos chamados de suporte um cliente abre por mês?" (contagem: 0, 1, 2...), "qual o custo de um sinistro?" (positivo e muito assimétrico). A regressão linear prevê valores negativos e supõe variância constante: errado para os dois.

Um **GLM** tem três peças:
1. uma **distribuição** para y (da família exponencial)
2. um **preditor linear** \`η = Xβ\`
3. uma **função de ligação** g com \`g(E[y]) = η\`

| y | distribuição | ligação usual | variância | exemplo |
|---|---|---|---|---|
| contínua qualquer | Normal | identidade | constante | OLS |
| 0/1 | Binomial | **logit** | p(1 − p) | conversão (regressão logística) |
| contagem | **Poisson** | **log** | = média | chamados, pedidos, falhas |
| contagem com dispersão extra | **Binomial negativa** | log | média + α·média² | chamados quando há clientes muito "barulhentos" |
| positiva, assimétrica | **Gama** | log | ∝ média² | custo, sinistro, valor de contrato |

**Leitura com ligação log:** \`e^β\` é o fator multiplicativo. β = 0,3 → +1 unidade em x multiplica a média por 1,35 (+35%). Em Poisson, \`e^β\` é a **razão de taxas** (*incidence rate ratio*).

**Superdispersão:** na Poisson, variância = média. Se a variância dos dados (condicional ao modelo) for bem maior, os erros-padrão ficam pequenos demais e tudo parece significativo. Diagnóstico: **dispersão = Σ(resíduos de Pearson²) ÷ (n − p)**; muito acima de 1 → use **binomial negativa** (ou quasi-Poisson).

**Como o GLM é ajustado:** por máxima verossimilhança, com o algoritmo **IRLS** (mínimos quadrados reponderados iterativamente). Para a Poisson com ligação log:
1. comece com β = 0
2. μ = e^(Xβ); variável de trabalho \`z = Xβ + (y − μ) ÷ μ\`; pesos \`W = μ\`
3. resolva os mínimos quadrados ponderados de z em X; repita até convergir

statsmodels: \`smf.glm("chamados_mes ~ np.log(funcionarios)", data=leads, family=sm.families.Poisson()).fit()\`; \`sm.families.NegativeBinomial()\`; \`sm.families.Gamma(link=sm.families.links.Log())\`.
`),
    exPy('IRLS da Poisson em 10 linhas', `
`, r`X = np.column_stack([np.ones(len(leads)), np.log(leads["funcionarios"])])
y = leads["chamados_mes"].to_numpy()
beta = np.zeros(2)
for it in range(25):
    mu = np.exp(X @ beta)
    z = X @ beta + (y - mu) / mu
    W = mu
    novo = np.linalg.solve(X.T @ (W[:, None] * X), X.T @ (W * z))
    if np.max(np.abs(novo - beta)) < 1e-10:
        break
    beta = novo
mu = np.exp(X @ beta)
disp = (((y - mu) ** 2) / mu).sum() / (len(y) - 2)
print(f"β = {beta.round(4)} (iterações: {it}) | razão de taxas por +1 em log(funcionários): {np.exp(beta[1]):.3f} | dispersão: {disp:.2f}")`, `
Os coeficientes recuperam os valores usados para gerar os dados (−0,5 e 0,3), e a dispersão perto de 1 confirma que a Poisson serve. Mesmo resultado de \`statsmodels\`, que usa o mesmo algoritmo.
`, P),
    quiz('Num GLM Poisson, o coeficiente de "plano premium" é 0,4. Como explicar?', ['Clientes premium abrem, em média, cerca de 49% mais chamados (e^0,4 ≈ 1,49), mantendo o resto igual', 'Abrem 0,4 chamado a mais', 'Abrem 40% menos', 'Não dá para interpretar'], 0),
    quiz('A dispersão de Pearson do seu modelo Poisson deu 4,2. O que fazer?', ['Trocar por binomial negativa (ou quasi-Poisson): há superdispersão e os erros-padrão estão subestimados', 'Nada, está ótimo', 'Usar regressão linear', 'Remover os zeros'], 0),
    py('Implemente `glm_poisson(X, y)` por **IRLS** (comece com β = 0, até 50 iterações, pare quando a maior variação for < 1e-10) e ajuste `chamados_mes ~ 1 + log(funcionarios) + demo`. Guarde os coeficientes em `beta` e a razão de taxas da demo em `rr_demo` (= e^β da demo).',
      r`def glm_poisson(X, y):
    beta = np.zeros(X.shape[1])
    for _ in range(50):
        mu = np.exp(X @ beta)
        z = X @ beta + (y - mu) / mu
        novo = np.linalg.solve(X.T @ (mu[:, None] * X), X.T @ (mu * z))
        if np.max(np.abs(novo - beta)) < 1e-10:
            return novo
        beta = novo
    return beta

X = np.column_stack([np.ones(len(leads)), np.log(leads["funcionarios"]), leads["demo"]])
beta = glm_poisson(X, leads["chamados_mes"].to_numpy())
rr_demo = np.exp(beta[2])`,
      r`_X = np.column_stack([np.ones(len(leads)), np.log(leads.funcionarios), leads.demo]); _y = leads.chamados_mes.to_numpy()
_mu = np.exp(_X @ beta)
assert np.allclose(_X.T @ (_y - _mu), 0, atol=1e-6)   # equações de verossimilhança da Poisson
assert abs(rr_demo - np.exp(beta[2])) < 1e-12 and 0.8 < rr_demo < 1.25`, P),
    py('Ajuste um **GLM Gama com ligação log** para `valor_contrato ~ 1 + log(funcionarios)` por IRLS: com ligação log na Gama, os pesos são constantes (W = 1) e a variável de trabalho é `z = Xβ + (y − μ) / μ`. Comece com `beta = [log(média de y), 0]`. Guarde `beta` (o segundo coeficiente é a elasticidade do valor ao porte).',
      r`X = np.column_stack([np.ones(len(leads)), np.log(leads["funcionarios"])])
y = leads["valor_contrato"].to_numpy()
beta = np.array([np.log(y.mean()), 0.0])
for _ in range(100):
    mu = np.exp(X @ beta)
    z = X @ beta + (y - mu) / mu
    novo, *_ = np.linalg.lstsq(X, z, rcond=None)
    if np.max(np.abs(novo - beta)) < 1e-10:
        beta = novo
        break
    beta = novo`,
      r`_X = np.column_stack([np.ones(len(leads)), np.log(leads.funcionarios)]); _y = leads.valor_contrato.to_numpy()
_mu = np.exp(_X @ beta)
assert np.allclose(_X.T @ ((_y - _mu) / _mu), 0, atol=1e-6)   # equações de verossimilhança da Gama (ligação log)
assert 0.25 < beta[1] < 0.45`, P),
  ],
};

export const L_SELECAO = {
  id: 'st-23-4', title: 'Seleção de modelos: AIC, BIC e ElasticNet',
  steps: [
    theory('Mais variáveis nem sempre é melhor', `
**1. Problema:** com 30 variáveis candidatas, qual modelo usar? O R² **sempre** sobe ao adicionar variáveis (até ruído puro). Precisamos de critérios que punam a complexidade.

**Critérios de informação** (menor é melhor; só comparam modelos com o **mesmo y e os mesmos dados**):
- **AIC** = 2k − 2·ln(L̂) → otimiza **previsão**
- **BIC** = k·ln(n) − 2·ln(L̂) → pune mais a complexidade quando n > 7; tende a escolher o modelo "verdadeiro" mais simples
- para OLS com erros normais: \`−2·ln(L̂) = n·ln(SQR/n) + n·(1 + ln 2π)\` (a constante se cancela nas comparações)
- diferença de AIC < 2: modelos equivalentes; > 10: forte evidência a favor do menor

**R² ajustado** = 1 − (1 − R²)(n − 1)/(n − k − 1): também pune variáveis, mas de forma mais branda.

**Validação cruzada** (Nível 4, modelagem preditiva): o critério mais direto para previsão, sem supor distribuição.

**Regularização** (revisão + ElasticNet):
| método | penalidade | efeito |
|---|---|---|
| Ridge (L2) | λ·Σβ² | encolhe todos, nenhum vira zero; bom com multicolinearidade |
| Lasso (L1) | λ·Σ\\|β\\| | zera coeficientes: **seleciona** variáveis; instável com variáveis correlacionadas (escolhe uma ao acaso) |
| **ElasticNet** | λ·[α·Σ\\|β\\| + (1 − α)/2·Σβ²] | seleciona como o Lasso, mas mantém grupos correlacionados juntos como o Ridge |

Sempre **padronize** as variáveis antes de regularizar e escolha λ (e α) por validação cruzada (\`ElasticNetCV\` no scikit-learn).

**Cuidados:** seleção automática (stepwise) seguida de p-valores do modelo final gera **p-valores otimistas** (o mesmo dado escolheu e testou). Para explicar causas, escolha variáveis pela **teoria/DAG** (Nível 5), não pelo AIC.
`),
    exPy('Três modelos para a conversão... em versão linear, comparados por AIC e BIC', `
`, r`y = np.log(leads["valor_contrato"].to_numpy()); n = len(y)
cols = {
    "porte": [np.log(leads["funcionarios"])],
    "porte+demo": [np.log(leads["funcionarios"]), leads["demo"]],
    "porte+demo+ruído": [np.log(leads["funcionarios"]), leads["demo"], np.random.default_rng(0).normal(size=n)],
}
for nome, c in cols.items():
    X = np.column_stack([np.ones(n), *c]); k = X.shape[1] + 1     # +1: variância do erro
    sqr = ((y - X @ np.linalg.lstsq(X, y, rcond=None)[0]) ** 2).sum()
    m2ll = n * np.log(sqr / n) + n * (1 + np.log(2 * np.pi))
    print(f"{nome:>18}: AIC={2*k + m2ll:9.1f}  BIC={k*np.log(n) + m2ll:9.1f}")`, `
\`demo\` não influencia o valor do contrato nos dados simulados, e a coluna de ruído menos ainda: o BIC piora a cada variável inútil; o AIC pune menos.
`, P),
    quiz('O modelo A tem AIC 1520 e o B (com 3 variáveis a mais) tem AIC 1519. Qual escolher?', ['A: diferença menor que 2 é empate, e A é mais simples', 'B, porque o AIC é menor', 'Nenhum', 'Depende do R²'], 0),
    quiz('Duas variáveis muito correlacionadas são ambas úteis. O Lasso zerou uma delas ao acaso. O que usar?', ['ElasticNet, que tende a manter o grupo correlacionado', 'Lasso com λ maior', 'OLS sem regularização', 'Remover as duas'], 0),
    py('Escreva `aic_bic_ols(X, y)` que devolve a tupla `(aic, bic)` de um modelo OLS (X já com intercepto; k = colunas de X + 1; `−2lnL = n·ln(SQR/n) + n·(1 + ln 2π)`). Depois, entre os modelos de `log(valor_contrato)` com **apenas** `log(funcionarios)` ou com `log(funcionarios)` e `tempo_resposta_h`, guarde em `melhor_bic` o nome do vencedor pelo BIC: `"porte"` ou `"porte+tempo"`.',
      r`def aic_bic_ols(X, y):
    n, p = X.shape
    k = p + 1
    sqr = ((y - X @ np.linalg.lstsq(X, y, rcond=None)[0]) ** 2).sum()
    m2ll = n * np.log(sqr / n) + n * (1 + np.log(2 * np.pi))
    return 2 * k + m2ll, k * np.log(n) + m2ll

y = np.log(leads["valor_contrato"].to_numpy())
um = np.ones(len(y))
_, bic1 = aic_bic_ols(np.column_stack([um, np.log(leads["funcionarios"])]), y)
_, bic2 = aic_bic_ols(np.column_stack([um, np.log(leads["funcionarios"]), leads["tempo_resposta_h"]]), y)
melhor_bic = "porte" if bic1 < bic2 else "porte+tempo"`,
      r`_y = np.log(leads.valor_contrato.to_numpy()); _X = np.column_stack([np.ones(len(_y)), np.log(leads.funcionarios)])
_s = ((_y - _X @ np.linalg.lstsq(_X, _y, rcond=None)[0]) ** 2).sum(); _n = len(_y)
_m = _n * np.log(_s / _n) + _n * (1 + np.log(2 * np.pi))
a, b = aic_bic_ols(_X, _y)
assert abs(a - (6 + _m)) < 1e-6 and abs(b - (3 * np.log(_n) + _m)) < 1e-6
assert melhor_bic == "porte"`, P),
  ],
};

export const L_PREVISAO = {
  id: 'st-23-5', title: 'Previsão: Holt-Winters, SARIMA/SARIMAX e Prophet',
  steps: [
    theory('Da decomposição aos modelos de previsão', `
**Decomposição:** série = **tendência** + **sazonalidade** (padrão de período fixo: semana, ano) + **ciclo** (oscilações sem período fixo, como ciclos econômicos) + **ruído**. Aditiva quando a sazonalidade tem amplitude constante; **multiplicativa** quando cresce com o nível (comum em vendas: dezembro é "30% acima", não "R$ 10 mil acima").

**Estacionariedade e diagnóstico** (revisão):
- **teste ADF** (Dickey-Fuller aumentado): H₀ = a série tem raiz unitária (não estacionária). Regride Δyₜ em yₜ₋₁ (+ defasagens de Δy); a estatística t do coeficiente de yₜ₋₁ é comparada com valores críticos **próprios** (≈ −2,86 a 5% com constante), não com a t de Student
- **ACF** (autocorrelação em cada defasagem) e **PACF** (autocorrelação parcial: o efeito da defasagem k descontadas as intermediárias; calcula-se regredindo yₜ em yₜ₋₁...yₜ₋ₖ e pegando o último coeficiente). PACF que corta após p → AR(p); ACF que corta após q → MA(q)

**Holt-Winters** (suavização exponencial tripla): três equações atualizadas a cada período, para nível ℓ, tendência b e sazonalidade s (período m), aditivo:
- \`ℓₜ = α(yₜ − sₜ₋ₘ) + (1 − α)(ℓₜ₋₁ + bₜ₋₁)\`
- \`bₜ = β(ℓₜ − ℓₜ₋₁) + (1 − β)bₜ₋₁\`
- \`sₜ = γ(yₜ − ℓₜ) + (1 − γ)sₜ₋ₘ\`
- previsão h passos à frente: \`ŷ = ℓₜ + h·bₜ + sₜ₋ₘ₊ₕ\`
statsmodels: \`ExponentialSmoothing(y, trend="add", seasonal="mul", seasonal_periods=12).fit()\`

**SARIMA(p,d,q)(P,D,Q)ₘ**: ARIMA com parte sazonal (diferença sazonal yₜ − yₜ₋₁₂, termos AR/MA nas defasagens 12, 24...). **SARIMAX** acrescenta variáveis **exógenas** (preço, investimento em mídia, feriados), que precisam ser conhecidas (ou previstas) no futuro. \`statsmodels.tsa.statespace.SARIMAX(y, order=(1,1,1), seasonal_order=(0,1,1,12), exog=X)\`; \`pmdarima.auto_arima\` escolhe as ordens por AIC.

**Prophet** (Meta): modelo aditivo \`y = tendência (por partes, com pontos de mudança) + sazonalidades de Fourier (anual, semanal, diária) + feriados + regressores\`. Fácil de usar, lida com dados faltantes e **múltiplas sazonalidades**; nem sempre vence um ETS/SARIMA bem ajustado. \`Prophet(yearly_seasonality=True).add_country_holidays("BR").fit(df[["ds","y"]])\`.

**Escolha prática:** sempre compare com um **baseline** (ingênuo sazonal: "igual ao mesmo mês do ano passado"). Um modelo sofisticado que não vence o baseline numa validação temporal não vai para produção.
`),
    exPy('Holt-Winters aditivo, escrito à mão', `
`, r`y = mensal["receita"].to_numpy(); m = 12
alpha, beta, gamma = 0.3, 0.05, 0.3
nivel = y[:m].mean(); tend = (y[m:2*m].mean() - y[:m].mean()) / m
saz = list(y[:m] - nivel)
ajuste = []
for t in range(m, len(y)):
    s_ant = saz[t - m]
    ajuste.append(nivel + tend + s_ant)                         # previsão 1 passo à frente
    novo_nivel = alpha * (y[t] - s_ant) + (1 - alpha) * (nivel + tend)
    tend = beta * (novo_nivel - nivel) + (1 - beta) * tend
    saz.append(gamma * (y[t] - novo_nivel) + (1 - gamma) * s_ant)
    nivel = novo_nivel
prev = [nivel + h * tend + saz[len(y) - m + (h - 1) % m] for h in range(1, 7)]
print("erro médio absoluto 1 passo:", np.mean(np.abs(np.array(ajuste) - y[m:])).round(2))
print("próximos 6 meses:", np.round(prev, 1))`, `
Cada mês novo atualiza nível, tendência e o fator sazonal do mesmo mês. Os parâmetros α, β, γ aqui foram escolhidos à mão; as bibliotecas os otimizam minimizando o erro.
`, P),
    quiz('As vendas de dezembro são sempre ~30% acima da média do ano, e a empresa dobrou de tamanho em 5 anos. Que sazonalidade usar?', ['Multiplicativa', 'Aditiva', 'Nenhuma', 'Semanal'], 0),
    quiz('Você quer prever vendas usando o investimento em mídia planejado para os próximos meses. Qual modelo incorpora isso diretamente?', ['SARIMAX (ou Prophet com regressor)', 'Holt-Winters', 'Ingênuo sazonal', 'ACF'], 0),
    py('Calcule a **PACF** da série diferenciada `d = mensal.receita.diff().dropna()` nas defasagens 1 a 13: para cada k, regrida `dₜ` em `dₜ₋₁ ... dₜ₋ₖ` (com intercepto) por mínimos quadrados e pegue o coeficiente da defasagem k. Guarde num array `pacf` (13 valores, posição 0 = defasagem 1).',
      r`d = mensal["receita"].diff().dropna().to_numpy()
pacf = []
for k in range(1, 14):
    Y = d[k:]
    X = np.column_stack([np.ones(len(Y))] + [d[k - j: len(d) - j] for j in range(1, k + 1)])
    coef, *_ = np.linalg.lstsq(X, Y, rcond=None)
    pacf.append(coef[-1])
pacf = np.array(pacf)`,
      r`_d = mensal.receita.diff().dropna().to_numpy()
assert pacf.shape == (13,)
_Y = _d[1:]; _X = np.column_stack([np.ones(len(_Y)), _d[:-1]])
assert abs(pacf[0] - np.linalg.lstsq(_X, _Y, rcond=None)[0][1]) < 1e-9
assert abs(pacf[0]) > 0.3 and np.all(np.abs(pacf) < 1.5)`, P),
    py('Faça o **teste de Dickey-Fuller** simples (com constante) na série `mensal.receita`: regrida `Δyₜ = a + c·yₜ₋₁` e calcule a estatística t de c (`c / ep(c)`, com `ep = sqrt(s² · [(XᵀX)⁻¹]₁₁)` e `s² = SQR / (n − 2)`). Guarde em `t_df` e em `estacionaria` o booleano `t_df < -2.86`.',
      r`y = mensal["receita"].to_numpy()
dy = np.diff(y)
X = np.column_stack([np.ones(len(dy)), y[:-1]])
coef, *_ = np.linalg.lstsq(X, dy, rcond=None)
res = dy - X @ coef
s2 = (res ** 2).sum() / (len(dy) - 2)
ep = np.sqrt(s2 * np.linalg.inv(X.T @ X)[1, 1])
t_df = coef[1] / ep
estacionaria = t_df < -2.86`,
      r`_y = mensal.receita.to_numpy(); _dy = np.diff(_y); _X = np.column_stack([np.ones(len(_dy)), _y[:-1]])
_c = np.linalg.lstsq(_X, _dy, rcond=None)[0]; _r = _dy - _X @ _c
_t = _c[1] / np.sqrt((_r ** 2).sum() / (len(_dy) - 2) * np.linalg.inv(_X.T @ _X)[1, 1])
assert abs(t_df - _t) < 1e-9 and estacionaria == (_t < -2.86)`, P),
  ],
};

export const L_WALK = {
  id: 'st-23-6', title: 'Validação no tempo (walk-forward) e métricas de previsão',
  steps: [
    theory('Nunca embaralhe datas', `
**1. Problema:** validação cruzada comum sorteia linhas para treino e teste. Numa série temporal isso é **vazamento**: o modelo treina com dezembro de 2024 para "prever" março de 2024.

**Walk-forward** (origem móvel / *time series split*):
1. treine com os dados até o mês T
2. preveja os próximos h meses (o horizonte que o negócio usa)
3. guarde o erro, avance T em um passo e repita
4. a média dos erros estima o desempenho real

Variantes: janela **expansiva** (todo o histórico) ou **deslizante** (só os últimos N meses: melhor quando o comportamento muda). \`sklearn.model_selection.TimeSeriesSplit\`, \`sktime\`, \`statsforecast\` automatizam.

**Métricas:**
| métrica | fórmula | cuidado |
|---|---|---|
| **MAE** | média \\|y − ŷ\\| | na unidade do dado, fácil de explicar |
| **RMSE** | √média (y − ŷ)² | pune erros grandes |
| **MAPE** | média \\|y − ŷ\\| ÷ \\|y\\| | explode com y perto de zero; pune mais a superestimação |
| **sMAPE** | média 2\\|y − ŷ\\| ÷ (\\|y\\| + \\|ŷ\\|) | simétrico, limitado a 200% |
| **MASE** | MAE ÷ MAE do ingênuo sazonal | < 1 = melhor que o baseline |

**Intervalos de previsão:** além do ponto, entregue uma faixa (ex.: 80%). Verifique a **cobertura** no walk-forward: um intervalo de 80% deve conter cerca de 80% dos valores reais.
`),
    py('Escreva `metricas(y, yhat)` que devolve um dicionário com `"mae"`, `"rmse"`, `"mape"` e `"smape"` (as duas últimas em fração, não em %).',
      r`def metricas(y, yhat):
    y, yhat = np.asarray(y, float), np.asarray(yhat, float)
    e = y - yhat
    return {
        "mae": np.mean(np.abs(e)),
        "rmse": np.sqrt(np.mean(e ** 2)),
        "mape": np.mean(np.abs(e) / np.abs(y)),
        "smape": np.mean(2 * np.abs(e) / (np.abs(y) + np.abs(yhat))),
    }`,
      r`m = metricas([100, 200], [110, 180])
assert abs(m["mae"] - 15) < 1e-12 and abs(m["rmse"] - np.sqrt(250)) < 1e-12
assert abs(m["mape"] - 0.1) < 1e-12 and abs(m["smape"] - np.mean([20 / 210, 40 / 380])) < 1e-12`,
      { setup: 'import numpy as np', setupNote: 'Já carregado: `np`.' }),
    py('**Walk-forward do ingênuo sazonal** em `mensal.receita`: para cada origem T de 84 a 101 (índices), preveja os 6 meses seguintes (T+1 ... T+6) como "o mesmo mês do ano anterior" (`y[t-12]`) e acumule os erros absolutos. Guarde em `mae_ingenuo` a média de todos os erros absolutos.',
      r`y = mensal["receita"].to_numpy()
erros = []
for T in range(84, 102):
    for h in range(1, 7):
        t = T + h
        erros.append(abs(y[t] - y[t - 12]))
mae_ingenuo = np.mean(erros)`,
      r`_y = mensal.receita.to_numpy()
assert abs(mae_ingenuo - np.mean([abs(_y[T + h] - _y[T + h - 12]) for T in range(84, 102) for h in range(1, 7)])) < 1e-9`, P),
    quiz('O modelo novo teve MASE = 1,15 no walk-forward. O que isso significa?', ['Ele erra 15% a mais que o ingênuo sazonal: não deve substituir o baseline', 'Erra 15% em média', 'É 15% melhor que o baseline', 'Tem 1,15 de R²'], 0),
    quiz('Por que a validação cruzada com embaralhamento é errada em séries temporais?', ['Mistura futuro e passado: o modelo aprende com dados posteriores ao período que "prevê" (vazamento)', 'Porque é lenta', 'Porque séries não têm média', 'Não é errada'], 0),
  ],
};

export const L_PROJETO4 = {
  id: 'st-23-7', title: 'Projeto: drivers de conversão B2B e previsão de receita de 6 meses',
  steps: [
    theory('O entregável do Nível 4', `
**Parte 1 — o que move a conversão de leads B2B?** Regressão logística de \`converteu\` em origem (dummies, base = outbound), log(funcionários), tempo de resposta e demo. Entregue:
- coeficientes e **razões de chances** (e^β), com interpretação
- diagnóstico: multicolinearidade (VIF), linearidade do logit em variáveis contínuas (taxa observada por faixa), calibração (probabilidade prevista × taxa observada por decil)
- avaliação **fora da amostra** (treino/teste): AUC
- tradução: "responder um lead em 1 hora em vez de 24 aumenta a chance de conversão em X%"

**Parte 2 — receita dos próximos 6 meses:** compare **ingênuo sazonal**, **Holt-Winters** e (no seu ambiente) **SARIMA** e **Prophet** com walk-forward de horizonte 6, e entregue a previsão do vencedor com intervalo.

A regressão logística é ajustada por **Newton-Raphson** (mesma ideia do IRLS): gradiente \`Xᵀ(y − p)\`, matriz de informação \`Xᵀ W X\` com \`W = p(1 − p)\`, atualização \`β ← β + (XᵀWX)⁻¹ Xᵀ(y − p)\`.
`),
    py('**Parte 1a — logística.** Monte `X` com as colunas: intercepto, dummies `inbound`, `indicacao`, `evento` (base outbound), `log(funcionarios)`, `tempo_resposta_h`, `demo` (nessa ordem). Ajuste por Newton-Raphson (comece em zeros, 25 iterações) e guarde `beta` e `odds` (= e^β).',
      r`o = leads["origem"]
X = np.column_stack([np.ones(len(leads)), (o == "inbound"), (o == "indicacao"), (o == "evento"),
                     np.log(leads["funcionarios"]), leads["tempo_resposta_h"], leads["demo"]]).astype(float)
y = leads["converteu"].to_numpy()
beta = np.zeros(X.shape[1])
for _ in range(25):
    p = 1 / (1 + np.exp(-X @ beta))
    W = p * (1 - p)
    beta = beta + np.linalg.solve(X.T @ (W[:, None] * X), X.T @ (y - p))
odds = np.exp(beta)`,
      r`_o = leads.origem
_X = np.column_stack([np.ones(len(leads)), _o == "inbound", _o == "indicacao", _o == "evento", np.log(leads.funcionarios), leads.tempo_resposta_h, leads.demo]).astype(float)
_p = 1 / (1 + np.exp(-_X @ beta))
assert np.allclose(_X.T @ (leads.converteu.to_numpy() - _p), 0, atol=1e-6)
assert odds[6] > 2 and odds[5] < 1 and odds[2] > odds[1]`, P),
    py('**Parte 1b — avaliação fora da amostra.** Use as 3.000 primeiras linhas como treino e as demais como teste (os leads já estão em ordem aleatória). Ajuste a logística no treino (mesmo `X` do exercício anterior, dado como `X` e `y`), preveja `p_teste` no teste e calcule a **AUC** como a probabilidade de um convertido aleatório ter score maior que um não convertido (empates contam 0,5), usando postos: `auc = (soma dos postos dos positivos − n₁(n₁+1)/2) / (n₁·n₀)`.',
      r`Xtr, ytr, Xte, yte = X[:3000], y[:3000], X[3000:], y[3000:]
b = np.zeros(X.shape[1])
for _ in range(25):
    p = 1 / (1 + np.exp(-Xtr @ b))
    b = b + np.linalg.solve(Xtr.T @ ((p * (1 - p))[:, None] * Xtr), Xtr.T @ (ytr - p))
p_teste = 1 / (1 + np.exp(-Xte @ b))
postos = pd.Series(p_teste).rank().to_numpy()
n1, n0 = yte.sum(), len(yte) - yte.sum()
auc = (postos[yte == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)`,
      r`assert p_teste.shape == (1000,)
_pos = p_teste[y[3000:] == 1]; _neg = p_teste[y[3000:] == 0]
_auc = ((_pos[:, None] > _neg[None, :]).sum() + 0.5 * (_pos[:, None] == _neg[None, :]).sum()) / (len(_pos) * len(_neg))
assert abs(auc - _auc) < 1e-9 and 0.6 < auc < 0.9`,
      { ...P, setup: P.setup + r`
_o = leads["origem"]
X = np.column_stack([np.ones(len(leads)), (_o == "inbound"), (_o == "indicacao"), (_o == "evento"), np.log(leads["funcionarios"]), leads["tempo_resposta_h"], leads["demo"]]).astype(float)
y = leads["converteu"].to_numpy()
`, setupNote: P.setupNote + ' Também já existem `X` (matriz do modelo) e `y` (converteu).' }),
    py('**Parte 1c — calibração.** Com `p_teste` e `y_teste` dados, divida em 10 grupos pelos decis de `p_teste` (`pd.qcut(p_teste, 10, labels=False)`) e monte `calib`, um DataFrame com `prevista` (média de p_teste) e `observada` (taxa real) por decil. Guarde também `erro_calib`, a média do |prevista − observada|.',
      r`df = pd.DataFrame({"p": p_teste, "y": y_teste, "decil": pd.qcut(p_teste, 10, labels=False)})
calib = df.groupby("decil").agg(prevista=("p", "mean"), observada=("y", "mean"))
erro_calib = (calib["prevista"] - calib["observada"]).abs().mean()`,
      r`_d = pd.DataFrame({"p": p_teste, "y": y_teste, "g": pd.qcut(p_teste, 10, labels=False)}).groupby("g")
assert np.allclose(calib.prevista.to_numpy(), _d.p.mean().to_numpy()) and np.allclose(calib.observada.to_numpy(), _d.y.mean().to_numpy())
assert erro_calib < 0.1`,
      { ...P, setup: P.setup + r`
_o = leads["origem"]
_X = np.column_stack([np.ones(len(leads)), (_o == "inbound"), (_o == "indicacao"), (_o == "evento"), np.log(leads["funcionarios"]), leads["tempo_resposta_h"], leads["demo"]]).astype(float)
_y = leads["converteu"].to_numpy(); _b = np.zeros(7)
for _ in range(25):
    _pp = 1 / (1 + np.exp(-_X[:3000] @ _b)); _b = _b + np.linalg.solve(_X[:3000].T @ ((_pp * (1 - _pp))[:, None] * _X[:3000]), _X[:3000].T @ (_y[:3000] - _pp))
p_teste = 1 / (1 + np.exp(-_X[3000:] @ _b)); y_teste = _y[3000:]
`, setupNote: P.setupNote + ' Também já existem `p_teste` (probabilidades previstas no teste) e `y_teste`.' }),
    py('**Parte 2 — walk-forward comparativo.** Use a função dada `holt_winters(y, h, alpha, beta, gamma)` (devolve as h próximas previsões). Para T de 84 a 101, preveja 6 meses com o **ingênuo sazonal** e com **Holt-Winters** (α=0,3, β=0,05, γ=0,3), treinando só com `y[:T+1]`. Guarde `mae_ingenuo`, `mae_hw` e `vencedor` (`"hw"` ou `"ingenuo"`).',
      r`y = mensal["receita"].to_numpy()
e_ing, e_hw = [], []
for T in range(84, 102):
    treino = y[: T + 1]
    prev_hw = holt_winters(treino, 6, 0.3, 0.05, 0.3)
    for h in range(1, 7):
        e_ing.append(abs(y[T + h] - y[T + h - 12]))
        e_hw.append(abs(y[T + h] - prev_hw[h - 1]))
mae_ingenuo, mae_hw = np.mean(e_ing), np.mean(e_hw)
vencedor = "hw" if mae_hw < mae_ingenuo else "ingenuo"`,
      r`_y = mensal.receita.to_numpy()
_ei = [abs(_y[T + h] - _y[T + h - 12]) for T in range(84, 102) for h in range(1, 7)]
_eh = [abs(_y[T + h] - holt_winters(_y[:T + 1], 6, .3, .05, .3)[h - 1]) for T in range(84, 102) for h in range(1, 7)]
assert abs(mae_ingenuo - np.mean(_ei)) < 1e-9 and abs(mae_hw - np.mean(_eh)) < 1e-9
assert vencedor == ("hw" if np.mean(_eh) < np.mean(_ei) else "ingenuo")`,
      { ...P, setup: P.setup + r`
def holt_winters(y, h, alpha, beta, gamma, m=12):
    y = np.asarray(y, float)
    nivel = y[:m].mean(); tend = (y[m:2*m].mean() - y[:m].mean()) / m; saz = list(y[:m] - nivel)
    for t in range(m, len(y)):
        s_ant = saz[t - m]
        novo = alpha * (y[t] - s_ant) + (1 - alpha) * (nivel + tend)
        tend = beta * (novo - nivel) + (1 - beta) * tend
        saz.append(gamma * (y[t] - novo) + (1 - gamma) * s_ant)
        nivel = novo
    return np.array([nivel + k * tend + saz[len(y) - m + (k - 1) % m] for k in range(1, h + 1)])
`, setupNote: P.setupNote + ' Também já existe a função `holt_winters(y, h, alpha, beta, gamma)`.' }),
    order('Ordene a entrega da previsão para a diretoria:', ['definir horizonte e métrica com o negócio', 'comparar modelos contra o baseline em walk-forward', 'reajustar o vencedor com todo o histórico', 'entregar previsão com intervalo e premissas', 'monitorar o erro mês a mês']),
  ],
};
