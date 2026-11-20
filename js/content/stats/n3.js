// Estatística — Nível 3 (complementos): post hoc, aderência, desenho profissional de A/B e o projeto do checkout
import { theory, quiz, order, py, exPy } from '../helpers.js';
import { P } from './dados.js';

const r = String.raw;

// Experimento do checkout: 2 semanas, grupos A (atual) e B (novo checkout)
const CHECKOUT = r`
_rg = np.random.default_rng(31)
_n = 48000
checkout = pd.DataFrame({
    "usuario": np.arange(1, _n + 1),
    "grupo": np.where(_rg.random(_n) < 0.5, "A", "B"),
    "dia": _rg.integers(1, 15, size=_n),
    "dispositivo": _rg.choice(["mobile", "desktop"], size=_n, p=[0.68, 0.32]),
    "receita_previa": np.round(_rg.gamma(1.2, 60, size=_n), 2),
})
_b = (checkout.grupo == "B").to_numpy()
_novidade = np.where(checkout.dia <= 3, 0.012, 0.0)
_p = 0.031 + 0.012 * (checkout.dispositivo == "desktop") + _b * (0.0045 + _novidade) + 0.00004 * checkout.receita_previa
checkout["converteu"] = (_rg.random(_n) < _p).astype(int)
checkout["receita"] = np.where(checkout.converteu == 1, np.round(_rg.lognormal(5.2, 0.7, size=_n) + 0.3 * checkout.receita_previa, 2), 0.0)
checkout["carregamento_s"] = np.round(_rg.lognormal(np.log(1.9) + 0.04 * _b, 0.35), 2)
checkout = checkout.iloc[_rg.permutation(_n)[: _n - 260]]   # perda de eventos do grupo misturada
`;
const PC = { ...P, setup: P.setup + CHECKOUT, setupNote: 'Já carregados: `checkout` (≈ 48 mil usuários de um teste A/B de 14 dias: usuario, grupo A/B, dia, dispositivo, receita_previa, converteu, receita, carregamento_s), `pd` e `np`.' };

export const L_POSTHOC = {
  id: 'st-22-1', title: 'Depois da ANOVA: post hoc, e o qui-quadrado de aderência',
  steps: [
    theory('A ANOVA disse "há diferença". Entre quem?', `
**1. Problema:** quatro origens de lead têm conversões diferentes? A ANOVA (ou o qui-quadrado de independência, para taxas) responde **se** existe alguma diferença, não **quais pares** diferem.

**Testes post hoc** comparam os pares controlando o erro de fazer várias comparações (com 4 grupos há 6 pares; a 5% cada, a chance de pelo menos um falso positivo passa de 26%):
| método | ideia | quando |
|---|---|---|
| **Tukey HSD** | usa a distribuição da **amplitude studentizada**; controla o erro da família para todos os pares | médias, variâncias parecidas, grupos de tamanho semelhante (\`statsmodels.stats.multicomp.pairwise_tukeyhsd\`, \`pingouin.pairwise_tukey\`) |
| **Games-Howell** | versão para variâncias diferentes | \`pingouin.pairwise_gameshowell\` |
| **Bonferroni / Holm** | testes par a par com α ajustado | qualquer teste (taxas, medianas), simples e conservador |
| **Dunn** | post hoc do Kruskal-Wallis | dados não normais |
| **Dunnett** | cada tratamento só contra o controle | testes A/B/C/D com um controle |

**Holm** (passo a passo): ordene os p-valores do menor ao maior; compare o k-ésimo com α ÷ (m − k + 1); pare no primeiro que não passar. É sempre pelo menos tão poderoso quanto Bonferroni.

**Qui-quadrado de aderência** (*goodness of fit*): os dados seguem uma distribuição **esperada**?
\`χ² = Σ (observado − esperado)² ÷ esperado\`, com (categorias − 1) graus de liberdade (menos os parâmetros estimados).
Usos: a divisão do teste A/B saiu 50/50? (**SRM**, a seguir); os chamados por hora seguem Poisson? os dígitos de notas fiscais seguem a lei de Benford (fraude)?

Sem \`scipy\`, o p-valor pode ser obtido **por simulação**: gere milhares de amostras sob a hipótese esperada (\`rng.multinomial(n, probabilidades, size=20000)\` sorteia de uma vez 20 mil vetores de contagens com n observações distribuídas nas categorias), calcule o χ² de cada uma e veja a fração ≥ ao observado. Com scipy: \`scipy.stats.chisquare(obs, exp)\`.
`),
    exPy('Conversão por origem: qui-quadrado e pares com Holm', `
`, r`from math import erf, sqrt
tab = leads.groupby("origem")["converteu"].agg(["sum", "count"])
tab["taxa"] = tab["sum"] / tab["count"]
print(tab.round(3))

def z_prop(x1, n1, x2, n2):
    p = (x1 + x2) / (n1 + n2)
    z = (x1 / n1 - x2 / n2) / sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    return 2 * (1 - 0.5 * (1 + erf(abs(z) / sqrt(2))))

grupos = list(tab.index)
pares = [(a, b, z_prop(tab.loc[a, "sum"], tab.loc[a, "count"], tab.loc[b, "sum"], tab.loc[b, "count"]))
         for i, a in enumerate(grupos) for b in grupos[i + 1:]]
pares.sort(key=lambda t: t[2])
m = len(pares)
for k, (a, b, p) in enumerate(pares):
    limite = 0.05 / (m - k)
    print(f"{a:>10} × {b:<10} p={p:.4f}  limite Holm={limite:.4f}  {'difere' if p < limite else 'pare aqui'}")`, `
Depois do primeiro par que não passa no limite de Holm, todos os seguintes também são considerados "sem diferença comprovada".
`, P),
    quiz('Com 5 grupos você compara todos os pares a α = 5% sem correção. Qual o problema?', ['São 10 comparações: a chance de algum falso positivo fica perto de 40%', 'Nenhum', 'O teste perde a normalidade', 'A ANOVA deixa de valer'], 0),
    py('Implemente o ajuste de **Holm**: escreva `holm(pvals, alpha=0.05)` que devolve uma lista de booleanos (na **ordem original** dos p-valores) indicando quais hipóteses são rejeitadas.',
      r`def holm(pvals, alpha=0.05):
    m = len(pvals)
    ordem = sorted(range(m), key=lambda i: pvals[i])
    rejeita = [False] * m
    for k, i in enumerate(ordem):
        if pvals[i] < alpha / (m - k):
            rejeita[i] = True
        else:
            break
    return rejeita`,
      r`assert holm([0.01, 0.04, 0.03, 0.005]) == [True, False, False, True]
assert holm([0.001, 0.002, 0.003]) == [True, True, True]
assert holm([0.2, 0.001]) == [False, True]
assert holm([0.04, 0.04]) == [False, False]`),
    py('**Aderência por simulação:** os leads chegam igualmente distribuídos entre os 7 dias da semana? Com os contagens `obs` dadas, calcule o χ² observado (`chi2_obs`) contra o esperado uniforme e o p-valor por simulação (`p_valor`): com `rng = np.random.default_rng(0)`, sorteie 20.000 vetores `rng.multinomial(n, [1/7]*7)`, calcule o χ² de cada um e a fração ≥ `chi2_obs`.',
      r`n = obs.sum()
esp = np.full(7, n / 7)
chi2_obs = ((obs - esp) ** 2 / esp).sum()
rng = np.random.default_rng(0)
sim = rng.multinomial(n, [1 / 7] * 7, size=20000)
chi2_sim = ((sim - esp) ** 2 / esp).sum(axis=1)
p_valor = (chi2_sim >= chi2_obs).mean()`,
      r`_e = obs.sum() / 7
assert abs(chi2_obs - ((obs - _e) ** 2 / _e).sum()) < 1e-9
assert 0 <= p_valor < 0.01, p_valor`,
      { setup: 'import numpy as np\nobs = np.array([640, 655, 610, 598, 702, 420, 375])', setupNote: 'Já carregados: `obs` (leads recebidos de segunda a domingo) e `np`.' }),
  ],
};

export const L_DESENHO = {
  id: 'st-22-2', title: 'Experimentação profissional: métricas, unidade, novidade e decisões',
  steps: [
    theory('Desenhar antes de rodar', `
Um teste A/B confiável é decidido **antes** de começar. O documento de desenho (*pre-registration*) responde:

1. **Hipótese de negócio**: "o checkout em uma página reduz o abandono e aumenta a conversão"
2. **Métrica principal** (uma só, sensível e ligada ao objetivo): conversão por usuário
3. **Métricas de guarda** (*guardrails*): não podem piorar. Ex.: tempo de carregamento, taxa de erro, cancelamentos, receita por usuário
4. **Métricas secundárias** (explicativas, sem decisão): cliques, etapas do funil
5. **Unidade de randomização**: usuário (não sessão, senão o mesmo usuário vê as duas versões); em marketplaces e redes sociais, cuidado com **interferência** entre unidades (randomize por região ou tempo)
6. **Tamanho da amostra e duração**: pelo MDE e pelo poder (Nível 3); duração em **semanas cheias** (ciclo semanal) e longa o bastante para o **efeito novidade** passar
7. **Regra de decisão** escrita: "lançar se a conversão subir com IC 95% acima de zero e nenhuma guarda piorar mais que 2%"

**Durante o teste:**
- **SRM** (*Sample Ratio Mismatch*): a divisão planejada (50/50) não bateu. Teste com qui-quadrado de aderência; p < 0,001 = algo quebrou (bug de atribuição, bots, eventos perdidos em um grupo). **Não analise um teste com SRM**: os grupos não são mais comparáveis
- **sem espiar** para decidir antes do tempo (ou use testes sequenciais, Nível 3)

**Efeitos que enganam:**
- **novidade**: usuários clicam no que é novo e o efeito some em dias (olhe o efeito **por dia/semana**: se cai, espere estabilizar)
- **primazia** (o contrário): usuários antigos estranham a mudança e o efeito melhora com o tempo
- **sazonalidade/feriados** dentro do período
- **heterogeneidade**: o efeito médio esconde segmentos com efeito oposto (mobile × desktop). Segmente para **entender**, não para "achar" significância (múltiplas comparações)

**Decisão (go/no-go)** em três desfechos honestos: **lançar**, **não lançar**, ou **inconclusivo** (o IC inclui zero e efeitos relevantes: a amostra foi pequena para o MDE desejado).
`),
    exPy('O efeito do novo checkout ao longo dos dias', `
Um bom painel de experimento mostra o efeito **por dia**, para enxergar novidade:
`, r`d = checkout.groupby(["dia", "grupo"])["converteu"].mean().unstack()
d["efeito_pp"] = (d["B"] - d["A"]) * 100
print(d.round(4))
print("efeito médio dias 1–3: {:.2f} p.p. | dias 4–14: {:.2f} p.p.".format(d.loc[1:3, "efeito_pp"].mean(), d.loc[4:, "efeito_pp"].mean()))`, `
Nos primeiros dias o efeito é bem maior e depois se estabiliza num patamar menor: **efeito novidade**. A estimativa honesta para a decisão é a do período estável.
`, PC),
    quiz('O teste foi planejado 50/50 e terminou com 24.300 usuários em A e 23.440 em B (p do qui-quadrado < 0,001). O que fazer?', ['Não confiar no resultado: investigar a causa do SRM (bug de atribuição, perda de eventos) antes de analisar', 'Analisar normalmente', 'Descartar usuários de A até empatar', 'Aumentar o α'], 0),
    quiz('Qual destas é uma boa métrica de guarda para um novo checkout?', ['Tempo de carregamento da página', 'Conversão (a métrica principal)', 'Número de cliques no botão novo', 'Cor do botão'], 0),
    order('Ordene o ciclo de um experimento:', ['escrever hipótese, métricas e regra de decisão', 'calcular amostra e duração', 'rodar sem espiar e monitorar SRM e guardas', 'analisar a métrica principal e as guardas', 'decidir: lançar, não lançar ou inconclusivo']),
    py('Monte `efeito_dia`: uma Series indexada por `dia` com a diferença de conversão **B − A em pontos percentuais**. Depois calcule `efeito_estavel`, a média de `efeito_dia` a partir do **dia 4**.',
      r`taxa = checkout.groupby(["dia", "grupo"])["converteu"].mean().unstack()
efeito_dia = (taxa["B"] - taxa["A"]) * 100
efeito_estavel = efeito_dia.loc[4:].mean()`,
      r`_t = checkout.groupby(["dia", "grupo"]).converteu.mean().unstack(); _e = (_t.B - _t.A) * 100
assert np.allclose(efeito_dia.sort_index().to_numpy(), _e.sort_index().to_numpy())
assert abs(efeito_estavel - _e.loc[4:].mean()) < 1e-9 and efeito_dia.loc[1:3].mean() > efeito_estavel`, PC),
  ],
};

export const L_PROJETO3 = {
  id: 'st-22-3', title: 'Projeto: framework completo de teste A/B do checkout',
  steps: [
    theory('O entregável do Nível 3', `
Você vai conduzir a análise completa do teste do **novo checkout** (\`checkout\`), na ordem que um time sênior segue:

1. **Planejamento**: com conversão base de ~3,5% e MDE de 0,5 ponto, qual amostra por grupo (α = 5%, poder 80%)?
2. **Integridade**: SRM (qui-quadrado de aderência contra 50/50)
3. **Métrica principal**: diferença de conversão com **IC 95%** (fórmula) e p-valor (teste z de proporções)
4. **Robustez**: IC por **bootstrap** da receita por usuário (média muito assimétrica: fórmula pouco confiável)
5. **Redução de variância**: **CUPED** com a receita anterior ao teste
6. **Guardas**: tempo de carregamento não pode piorar mais que 5%
7. **Recomendação** go/no-go por escrito

Fórmula de amostra por grupo (duas proporções): \`n = (z_{1−α/2} + z_{1−β})² × [p₁(1−p₁) + p₂(1−p₂)] ÷ (p₂ − p₁)²\`, com z de 1,96 e 0,8416.
`),
    py('**1. Planejamento.** Calcule `n_por_grupo` (inteiro, arredondado para cima) para detectar a mudança de 3,5% para 4,0% com α = 5% bilateral e poder 80% (use 1.959964 e 0.841621).',
      r`import math
p1, p2 = 0.035, 0.040
za, zb = 1.959964, 0.841621
n_por_grupo = math.ceil((za + zb) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p2 - p1) ** 2)`,
      r`import math
assert n_por_grupo == math.ceil((1.959964 + 0.841621) ** 2 * (.035 * .965 + .04 * .96) / .005 ** 2)
assert 20000 < n_por_grupo < 25000`),
    py('**2. SRM.** Conte os usuários por grupo (`n_a`, `n_b`) e calcule o χ² de aderência contra 50/50 (`chi2_srm`, 1 grau de liberdade). Guarde em `srm` o booleano `chi2_srm > 10.83` (equivale a p < 0,001).',
      r`n_a = (checkout["grupo"] == "A").sum()
n_b = (checkout["grupo"] == "B").sum()
esp = (n_a + n_b) / 2
chi2_srm = (n_a - esp) ** 2 / esp + (n_b - esp) ** 2 / esp
srm = chi2_srm > 10.83`,
      r`_a = (checkout.grupo == "A").sum(); _b = (checkout.grupo == "B").sum(); _e = (_a + _b) / 2
assert abs(chi2_srm - ((_a - _e) ** 2 + (_b - _e) ** 2) / _e) < 1e-9 and srm == (chi2_srm > 10.83)`, PC),
    py('**3. Métrica principal** (só dias 4 a 14, período estável). Calcule `dif` (taxa B − taxa A), o IC 95% não agrupado `ic = (dif - 1.96*ep, dif + 1.96*ep)` com `ep = sqrt(pA(1-pA)/nA + pB(1-pB)/nB)`, e o `p_valor` bilateral do teste z de proporções **agrupado** (use `erf`).',
      r`from math import sqrt, erf
d = checkout[checkout["dia"] >= 4]
a = d.loc[d["grupo"] == "A", "converteu"]; b = d.loc[d["grupo"] == "B", "converteu"]
pA, pB, nA, nB = a.mean(), b.mean(), len(a), len(b)
dif = pB - pA
ep = sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB)
ic = (dif - 1.96 * ep, dif + 1.96 * ep)
pp = (a.sum() + b.sum()) / (nA + nB)
z = dif / sqrt(pp * (1 - pp) * (1 / nA + 1 / nB))
p_valor = 2 * (1 - 0.5 * (1 + erf(abs(z) / sqrt(2))))`,
      r`from math import sqrt, erf
_d = checkout[checkout.dia >= 4]; _a = _d.converteu[_d.grupo == "A"]; _b = _d.converteu[_d.grupo == "B"]
_dif = _b.mean() - _a.mean(); _ep = sqrt(_a.mean() * (1 - _a.mean()) / len(_a) + _b.mean() * (1 - _b.mean()) / len(_b))
assert abs(dif - _dif) < 1e-12 and abs(ic[0] - (_dif - 1.96 * _ep)) < 1e-12 and abs(ic[1] - (_dif + 1.96 * _ep)) < 1e-12
_pp = (_a.sum() + _b.sum()) / (len(_a) + len(_b)); _z = _dif / sqrt(_pp * (1 - _pp) * (1 / len(_a) + 1 / len(_b)))
assert abs(p_valor - 2 * (1 - 0.5 * (1 + erf(abs(_z) / sqrt(2))))) < 1e-12`, PC),
    py('**4. Bootstrap** da diferença de **receita por usuário** (B − A, dias 4 a 14): com `rng = np.random.default_rng(5)` e 2.000 reamostragens (com reposição, dentro de cada grupo), guarde as diferenças em `difs` e o IC percentil 95% em `ic_boot` (tupla com os percentis 2,5 e 97,5).',
      r`d = checkout[checkout["dia"] >= 4]
ra = d.loc[d["grupo"] == "A", "receita"].to_numpy()
rb = d.loc[d["grupo"] == "B", "receita"].to_numpy()
rng = np.random.default_rng(5)
difs = np.array([rng.choice(rb, len(rb)).mean() - rng.choice(ra, len(ra)).mean() for _ in range(2000)])
ic_boot = (np.percentile(difs, 2.5), np.percentile(difs, 97.5))`,
      r`assert len(difs) == 2000
_d = checkout[checkout.dia >= 4]; _obs = _d.receita[_d.grupo == "B"].mean() - _d.receita[_d.grupo == "A"].mean()
assert ic_boot[0] < _obs < ic_boot[1]
assert abs(np.mean(difs) - _obs) < 0.2 * abs(ic_boot[1] - ic_boot[0])`, PC),
    py('**5. CUPED.** Com dias 4 a 14, ajuste a receita: `theta = cov(receita, receita_previa) / var(receita_previa)` (usando todos os usuários juntos) e `ajustada = receita - theta * (receita_previa - media_previa)`. Guarde `dif_cuped` (diferença de médias B − A da ajustada) e `reducao`, a redução **relativa** da variância (1 − var(ajustada) / var(receita)).',
      r`d = checkout[checkout["dia"] >= 4].copy()
x, y = d["receita_previa"], d["receita"]
theta = np.cov(y, x)[0, 1] / x.var()
d["ajustada"] = y - theta * (x - x.mean())
dif_cuped = d.loc[d["grupo"] == "B", "ajustada"].mean() - d.loc[d["grupo"] == "A", "ajustada"].mean()
reducao = 1 - d["ajustada"].var() / y.var()`,
      r`_d = checkout[checkout.dia >= 4].copy(); _t = np.cov(_d.receita, _d.receita_previa)[0, 1] / _d.receita_previa.var()
_d["aj"] = _d.receita - _t * (_d.receita_previa - _d.receita_previa.mean())
assert abs(dif_cuped - (_d.aj[_d.grupo == "B"].mean() - _d.aj[_d.grupo == "A"].mean())) < 1e-9
assert abs(reducao - (1 - _d.aj.var() / _d.receita.var())) < 1e-9 and reducao > 0`, PC),
    py('**6. Guarda.** Compare o tempo de carregamento: `piora_pct` = (mediana de B ÷ mediana de A − 1) × 100. Guarde em `guarda_ok` se a piora é menor que 5%.',
      r`med = checkout.groupby("grupo")["carregamento_s"].median()
piora_pct = (med["B"] / med["A"] - 1) * 100
guarda_ok = piora_pct < 5`,
      r`_m = checkout.groupby("grupo").carregamento_s.median()
assert abs(piora_pct - (_m.B / _m.A - 1) * 100) < 1e-9 and guarda_ok == (piora_pct < 5)`, PC),
    theory('A recomendação', `
Estrutura de um parecer de experimento (uma página):

> **Decisão: lançar o novo checkout.**
> - **Integridade:** divisão 50/50 sem desvio (sem SRM).
> - **Resultado:** a conversão subiu de X% para Y% (+Z p.p., IC 95% de A a B p.p.), considerando só o período estável; nos 3 primeiros dias o ganho foi inflado por novidade.
> - **Receita por usuário:** +R$ W (bootstrap, IC 95% de ... a ...); com CUPED a incerteza caiu V%.
> - **Guardas:** carregamento ficou U% mais lento, dentro do limite de 5%. Recomendo otimização antes da expansão para 100%.
> - **Riscos e próximos passos:** acompanhar a conversão por 4 semanas após o lançamento (*holdout* de 5%).

Note o que **não** está ali: listas de p-valores de 20 segmentos, ou "p = 0,03, logo funciona". O diretor precisa de **tamanho do efeito, incerteza e risco**.
`),
    quiz('O IC 95% da diferença de conversão ficou entre −0,1 e +0,9 p.p., e o MDE de interesse era 0,5 p.p. Qual o parecer honesto?', ['Inconclusivo: não dá para afirmar ganho, nem descartar um ganho relevante; seria preciso mais amostra', 'Lançar, porque o efeito estimado é positivo', 'Não lançar, porque não é significativo, então não há efeito', 'O teste falhou'], 0),
  ],
};
