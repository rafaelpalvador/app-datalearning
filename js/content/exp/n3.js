// Experimentação — Nível 3: Avançado (redução de variância, sequencial, bayesiano e inferência causal)
import { theory, quiz, order, fill, py, exPy } from '../helpers.js';
import { D3, PURO } from './dados.js';

const r = String.raw;

const L_CUPED = {
  id: 'ex-3-1', title: 'Redução de variância: CUPED, CUPAC e estratificação',
  steps: [
    theory('Usar o passado para enxergar melhor o presente', `
Boa parte da variância de uma métrica vem de **diferenças entre usuários que já existiam antes do teste**: quem assistia 300 minutos por mês continua assistindo muito, com ou sem a mudança. Esse ruído não tem nada a ver com o tratamento, mas aumenta o erro padrão.

**CUPED** (*Controlled-experiment Using Pre-Experiment Data*, Deng, Xu, Kohavi e Walker, Microsoft, WSDM 2013) remove esse ruído com uma covariável **X medida antes do experimento** (o ideal, segundo o artigo: **a própria métrica no período anterior**):

- **θ = Cov(Y, X) ÷ Var(X)** (o coeficiente de uma regressão de Y em X, calculado com **todos** os usuários)
- **Y_cuped = Y − θ (X − X̄)**
- compare as médias de Y_cuped entre os grupos com o teste de sempre

Por que funciona:
- como X é **pré-experimento**, o tratamento não pode afetá-lo: em média X̄_A ≈ X̄_B e o ajuste **não cria viés**
- **Var(Y_cuped) = Var(Y) × (1 − ρ²)**, com ρ = correlação entre Y e X. Com ρ = 0,8, a variância cai **64%**, o que equivale a rodar o teste com **2,8× mais usuários** (1 ÷ (1 − ρ²)), ou a terminá-lo em bem menos tempo
- usuários **sem histórico** (novos): use X = 0 e um indicador "sem histórico", ou ajuste só quem tem dados

**Regra de ouro:** a covariável **não pode ser afetada pelo tratamento**. Usar dados de **durante** o teste (ex.: sessões na primeira semana do teste) remove parte do próprio efeito e enviesa o resultado.

**CUPAC** (*Control Using Predictions As Covariates*, DoorDash): em vez de uma covariável, usa a **previsão de um modelo de machine learning** treinado com várias variáveis pré-experimento (histórico, região, dispositivo). Quanto melhor a previsão, maior ρ e maior a redução. A DoorDash relatou testes de *switchback* mais de 25% mais curtos com o mesmo poder.

**Estratificação** é parente do CUPED: divida os usuários em estratos (ex.: pesados, médios, leves pelo uso anterior), estime o efeito em cada estrato e combine com pesos pela proporção de cada estrato. Para uma covariável binária, CUPED e estratificação são equivalentes. A **pós-estratificação** faz isso depois do sorteio; a **pré-estratificação** sorteia dentro de cada estrato.

Em código: \`np.cov(y, x)[0, 1]\` dá a covariância (a matriz 2×2 tem as variâncias na diagonal) e \`np.corrcoef(y, x)[0, 1]\` dá ρ.
`),
    exPy('CUPED no teste do streaming', `
`, r`y, x = ab["minutos"], ab["minutos_pre"]
B = ab["grupo"] == "B"
theta = np.cov(y, x)[0, 1] / x.var()
y_cuped = y - theta * (x - x.mean())
rho = np.corrcoef(y, x)[0, 1]
for nome, v in [("bruto", y), ("CUPED", y_cuped)]:
    dif = v[B].mean() - v[~B].mean()
    ep = sqrt(v[B].var() / B.sum() + v[~B].var() / (~B).sum())
    print(f"{nome:>6}: efeito = {dif:.2f} min, EP = {ep:.3f}, z = {dif / ep:.2f}")
print(f"θ = {theta:.3f}, ρ = {rho:.3f}, redução de variância = {1 - y_cuped.var() / y.var():.1%} (teoria ρ² = {rho ** 2:.1%})")
print(f"equivale a {1 / (1 - rho ** 2):.1f}× mais usuários")`, `
Sem CUPED o teste é **inconclusivo** (z ≈ 1,8); com CUPED, o **mesmo** experimento detecta o efeito com folga (z > 4). A estimativa do efeito muda um pouco, mas continua não enviesada; quem cai muito é o erro padrão.
`, D3),
    quiz('Qual covariável é válida para o CUPED?', ['Minutos assistidos no mês anterior ao início do teste', 'Minutos assistidos na primeira semana do teste', 'Se o usuário clicou na nova funcionalidade', 'A variante do usuário'], 0),
    quiz('A correlação entre a métrica e a covariável pré-teste é 0,7. Qual a redução de variância esperada com CUPED?', ['Cerca de 49%', 'Cerca de 70%', 'Cerca de 30%', 'Nenhuma'], 0),
    fill('Complete o ajuste CUPED:', 'theta = np.cov(y, x)[0, 1] / x.___()\ny_cuped = y - theta * (x - x.___())', [['var'], ['mean']]),
    py('Aplique CUPED a `ab`: calcule `theta`, `y_cuped`, o `z_bruto` e o `z_cuped` (diferença B − A ÷ EP não agrupado de Welch) e `fator_amostra` = Var(Y) ÷ Var(Y_cuped), quantas vezes mais usuários seriam necessários sem CUPED.',
      r`y, x = ab["minutos"], ab["minutos_pre"]
B = ab["grupo"] == "B"
theta = np.cov(y, x)[0, 1] / x.var()
y_cuped = y - theta * (x - x.mean())

def z_welch(v):
    return (v[B].mean() - v[~B].mean()) / sqrt(v[B].var() / B.sum() + v[~B].var() / (~B).sum())

z_bruto = z_welch(y)
z_cuped = z_welch(y_cuped)
fator_amostra = y.var() / y_cuped.var()`,
      r`_y, _x = ab.minutos, ab.minutos_pre; _B = ab.grupo == "B"
_t = np.cov(_y, _x)[0, 1] / _x.var(); _yc = _y - _t * (_x - _x.mean())
assert abs(theta - _t) < 1e-9 and np.allclose(np.asarray(y_cuped), _yc.to_numpy())
assert 1.5 < z_bruto < 2.1 and z_cuped > 4
assert abs(fator_amostra - _y.var() / _yc.var()) < 1e-9 and fator_amostra > 2.5`, D3),
  ],
};

const L_DELTA = {
  id: 'ex-3-2', title: 'Métricas de razão e o Delta Method',
  steps: [
    theory('Quando o denominador também é aleatório', `
Muitas métricas importantes são **razões de somas**:
- **CTR** = Σ cliques ÷ Σ páginas vistas
- **receita por pedido** = Σ receita ÷ Σ pedidos
- **tempo por sessão** = Σ minutos ÷ Σ sessões

Se a randomização é por **usuário**, a unidade de análise (página, pedido, sessão) **não é** a unidade de randomização. Tratar cada página como uma Bernoulli independente (EP = √(p(1 − p) ÷ Σ páginas)) **subestima** a variância: as páginas do mesmo usuário são correlacionadas (cada usuário tem a sua propensão a clicar), e usuários pesados pesam muito na soma. Resultado: falsos positivos.

**Delta Method** (Deng, Knoblich e Lu, KDD 2018, implementado no ExP da Microsoft): para cada usuário i, Yᵢ = cliques e Xᵢ = páginas. A métrica do grupo é R = Ȳ ÷ X̄ (razão das médias por usuário = razão das somas). Por uma aproximação de Taylor de primeira ordem:

**Var(R) ≈ (1/n) × [ Var(Y) ÷ μ_X² − 2 μ_Y Cov(Y, X) ÷ μ_X³ + μ_Y² Var(X) ÷ μ_X⁴ ]**

com médias, variâncias e covariância **por usuário** (n = usuários do grupo). Depois: EP da diferença = √(Var(R_A) + Var(R_B)) e z = (R_B − R_A) ÷ EP.

Alternativas equivalentes:
- **linearização**: crie por usuário Lᵢ = (Yᵢ − R Xᵢ) ÷ X̄ e faça um teste t comum sobre Lᵢ (dá o mesmo EP e permite combinar com CUPED)
- **bootstrap por usuário** (reamostra usuários inteiros): mais caro, mesmo resultado
- regressão com erro padrão **robusto a cluster** por usuário

**Atenção à diferença entre métricas:** "média das razões por usuário" (CTR de cada usuário, depois a média) é **outra métrica**: dá o mesmo peso a quem viu 1 página e a quem viu 200. As duas podem ser legítimas, mas precisam ser escolhidas antes.
`),
    exPy('CTR: erro padrão ingênuo × Delta Method', `
`, r`def delta_ratio(y, x):
    y, x = np.asarray(y, float), np.asarray(x, float)
    n, mx, my = len(x), x.mean(), y.mean()
    var = (y.var(ddof=1) / mx ** 2 - 2 * my * np.cov(y, x)[0, 1] / mx ** 3 + my ** 2 * x.var(ddof=1) / mx ** 4) / n
    return my / mx, var

A, B = ab[ab.grupo == "A"], ab[ab.grupo == "B"]
ra, va = delta_ratio(A.cliques, A.paginas)
rb, vb = delta_ratio(B.cliques, B.paginas)
ep_delta = sqrt(va + vb)
ep_ing = sqrt(ra * (1 - ra) / A.paginas.sum() + rb * (1 - rb) / B.paginas.sum())
print(f"CTR A = {ra:.4f}, B = {rb:.4f}, diferença = {rb - ra:.4f}")
print(f"EP ingênuo (páginas i.i.d.) = {ep_ing:.5f} → z = {(rb - ra) / ep_ing:.2f}")
print(f"EP Delta Method             = {ep_delta:.5f} → z = {(rb - ra) / ep_delta:.2f}")`, `
O erro padrão correto é **o dobro** do ingênuo. A análise ingênua diria "z > 4, certeza absoluta"; a correta diz z ≈ 2,1, p ≈ 0,04: um sinal bem mais modesto.
`, D3),
    quiz('A métrica é receita por pedido (Σ receita ÷ Σ pedidos) e o teste foi randomizado por usuário. O que fazer com a variância?', ['Usar o Delta Method (ou bootstrap por usuário), porque os pedidos do mesmo usuário não são independentes', 'Tratar cada pedido como independente', 'Ignorar a variância e olhar só a média', 'Trocar a randomização para pedido'], 0),
    quiz('"Média do CTR de cada usuário" e "Σ cliques ÷ Σ páginas" são...', ['Métricas diferentes: a primeira dá o mesmo peso a cada usuário, a segunda pesa pelas páginas vistas', 'Sempre idênticas', 'A mesma coisa com variâncias diferentes', 'Ambas inválidas'], 0),
    py('Implemente `delta_ratio(y, x)` (devolve `(razao, variancia)` como na teoria) e aplique ao CTR de `ab`: guarde `dif` (B − A), `ep_delta`, `z_delta` e `ep_ingenuo` (páginas como Bernoulli independentes). Guarde também `razao_ep = ep_delta / ep_ingenuo`.',
      r`def delta_ratio(y, x):
    y, x = np.asarray(y, float), np.asarray(x, float)
    n, mx, my = len(x), x.mean(), y.mean()
    var = (y.var(ddof=1) / mx ** 2 - 2 * my * np.cov(y, x)[0, 1] / mx ** 3 + my ** 2 * x.var(ddof=1) / mx ** 4) / n
    return my / mx, var

A = ab[ab["grupo"] == "A"]
B = ab[ab["grupo"] == "B"]
ra, va = delta_ratio(A["cliques"], A["paginas"])
rb, vb = delta_ratio(B["cliques"], B["paginas"])
dif = rb - ra
ep_delta = sqrt(va + vb)
z_delta = dif / ep_delta
ep_ingenuo = sqrt(ra * (1 - ra) / A["paginas"].sum() + rb * (1 - rb) / B["paginas"].sum())
razao_ep = ep_delta / ep_ingenuo`,
      r`_r, _v = delta_ratio([1, 2, 0, 3], [4, 5, 2, 6])
assert abs(_r - 6 / 17) < 1e-12 and _v > 0
_A = ab[ab.grupo == "A"]; _B = ab[ab.grupo == "B"]
assert abs(dif - (_B.cliques.sum() / _B.paginas.sum() - _A.cliques.sum() / _A.paginas.sum())) < 1e-12
assert 1.7 < z_delta < 2.5 and razao_ep > 1.6`, D3),
  ],
};

const L_SEQUENCIAL = {
  id: 'ex-3-3', title: 'Testes sequenciais: Pocock, O\'Brien-Fleming, alpha spending e mSPRT',
  steps: [
    theory('Parar cedo sem trapacear', `
O peeking (Nível 2) infla o falso positivo porque usa o **mesmo** limite (1,96) em cada espiada. Testes sequenciais **planejam** as espiadas e usam limites mais rigorosos, de modo que o erro tipo I **total** continue em α.

**Group Sequential Testing (GST):** K análises intermediárias planejadas (ex.: a 25%, 50%, 75% e 100% da amostra). Em cada uma, compara-se o z acumulado com uma **fronteira**:
| fronteira | forma | com K = 4, α = 5% bilateral | característica |
|---|---|---|---|
| **Pocock** | constante | 2,36 em todas | mais fácil parar cedo; o limite final é bem mais rígido que 1,96 (perde poder no fim) |
| **O'Brien-Fleming (OBF)** | c × √(K ÷ k) | 4,05 · 2,86 · 2,34 · 2,02 | quase impossível parar muito cedo; o limite final fica perto de 1,96 (padrão na indústria e em ensaios clínicos) |

**Função de gasto de alfa** (*alpha spending*, Lan e DeMets): em vez de fixar K, define quanto do α pode ser "gasto" até a fração t ∈ (0, 1] da informação. A versão tipo OBF é:
**α(t) = 2 − 2 Φ(z₁₋α/₂ ÷ √t)**
Com α = 5%: α(0,25) ≈ 0,00009, α(0,5) ≈ 0,0056, α(0,75) ≈ 0,024 e α(1) = 0,05. As análises podem ocorrer em momentos não planejados: em cada uma, o limite é calculado para gastar só o α incremental.

**Parada por futilidade:** fronteiras inferiores para parar quando o efeito **já não tem chance** de atingir o MDE (economiza tráfego de testes perdedores).

**Always-valid p-values (mSPRT,** Johari, Pekelis e Walsh; base estatística da Optimizely desde 2015**):** permitem olhar **a qualquer momento**, quantas vezes quiser. O teste de razão de verossimilhança com mistura compara "efeito zero" com uma **mistura** de efeitos possíveis (prior Normal(0, τ²)). Para uma diferença de médias com variância σ² por par de observações e n pares, com média das diferenças ȳ:
**Λₙ = √(σ² ÷ (σ² + nτ²)) × exp( n² τ² ȳ² ÷ (2σ² (σ² + nτ²)) )**
Rejeita-se H₀ quando **Λₙ ≥ 1/α**; o p-valor sempre válido é **min(1, 1/max Λ até agora)**. O preço é poder menor (ou testes mais longos) que o teste de horizonte fixo quando você só olharia no fim.

**Quando usar:** testes com risco (parar cedo por dano), lançamentos em que cada dia de atraso custa caro, plataformas com painéis em tempo real. Em Python: \`statsmodels\` não traz GST completo; há pacotes como \`spotify-confidence\` e \`expan\`, e as plataformas comerciais (Optimizely, Statsig, Eppo) implementam sequencial nativamente.
`),
    exPy('Gasto de alfa e simulação do OBF', `
`, r`Z = NormalDist()
za = Z.inv_cdf(0.975)
for t in [0.25, 0.5, 0.75, 1.0]:
    print(f"t = {t:.2f}: α gasto acumulado = {2 - 2 * Z.cdf(za / sqrt(t)):.5f}")
# 4 olhadas com fronteiras O'Brien-Fleming (c = 2,024) em 4.000 testes A/A
rng = np.random.default_rng(5)
m, K, por_etapa = 4000, 4, 2000
d = rng.normal(0, 1, size=(m, K, por_etapa)).sum(axis=2)       # soma das diferenças em cada etapa
z = np.cumsum(d, axis=1) / np.sqrt(por_etapa * np.arange(1, K + 1))
fronteira = 2.024 * np.sqrt(K / np.arange(1, K + 1))
print("fronteiras OBF:", fronteira.round(2))
print("falso positivo com OBF:", (np.abs(z) > fronteira).any(axis=1).mean())
print("falso positivo usando 1,96 em todas:", (np.abs(z) > 1.96).any(axis=1).mean())`, `
Com as fronteiras OBF, o falso positivo total fica em ~5% mesmo olhando 4 vezes; com 1,96 em todas as olhadas ele passa de 12%.
`, PURO),
    exPy('mSPRT: olhando a cada 100 pares', `
`, r`def lambda_msprt(soma, n, sigma2=2.0, tau2=0.01):
    ybar = soma / n
    return sqrt(sigma2 / (sigma2 + n * tau2)) * exp(n ** 2 * tau2 * ybar ** 2 / (2 * sigma2 * (sigma2 + n * tau2)))

rng = np.random.default_rng(9)
rejeitou = 0
for _ in range(500):                                  # 500 testes A/A
    dif = rng.normal(0, sqrt(2.0), size=20000)        # diferenças B − A por par de usuários
    somas = np.cumsum(dif)[99::100]
    ns = np.arange(100, 20001, 100)
    if any(lambda_msprt(s, n) >= 1 / 0.05 for s, n in zip(somas, ns)):
        rejeitou += 1
print("falso positivo do mSPRT olhando 200 vezes:", rejeitou / 500)`, `
Mesmo olhando 200 vezes, o falso positivo fica abaixo de 5%: é o que "sempre válido" quer dizer.
`, PURO),
    quiz('Com O\'Brien-Fleming e 4 análises, por que é tão difícil parar na primeira (z > 4,05)?', ['Porque a fronteira gasta quase nada do α no início, guardando-o para o fim, quando há mais informação', 'Porque o teste está errado', 'Porque o primeiro z é sempre pequeno', 'Porque a Pocock é obrigatória no início'], 0),
    quiz('Qual a vantagem do mSPRT (always-valid p-values) sobre o GST?', ['Permite olhar a qualquer momento, sem planejar quantas análises serão feitas', 'Tem mais poder em qualquer situação', 'Dispensa calcular a variância', 'Não precisa de randomização'], 0),
    py('Escreva `alfa_gasto(t, alpha=0.05)` com a função de gasto tipo O\'Brien-Fleming e `alfa_incremental(fracoes, alpha=0.05)` que devolve a lista de α **gasto em cada análise** (diferença entre o acumulado atual e o anterior) para frações como `[0.25, 0.5, 0.75, 1.0]`.',
      r`def alfa_gasto(t, alpha=0.05):
    Z = NormalDist()
    return 2 - 2 * Z.cdf(Z.inv_cdf(1 - alpha / 2) / sqrt(t))

def alfa_incremental(fracoes, alpha=0.05):
    acumulado = [alfa_gasto(t, alpha) for t in fracoes]
    return [a - b for a, b in zip(acumulado, [0.0] + acumulado[:-1])]`,
      r`assert abs(alfa_gasto(1.0) - 0.05) < 1e-9
assert abs(alfa_gasto(0.5) - 0.005575) < 1e-5 and alfa_gasto(0.25) < 0.0002
_inc = alfa_incremental([0.25, 0.5, 0.75, 1.0])
assert len(_inc) == 4 and abs(sum(_inc) - 0.05) < 1e-9 and all(x > 0 for x in _inc)
assert _inc[0] < _inc[1] < _inc[2]`, PURO),
  ],
};

const L_BAYES = {
  id: 'ex-3-4', title: 'Experimentação bayesiana: Beta-Binomial, P(B > A) e perda esperada',
  steps: [
    theory('Responder a pergunta que o negócio faz', `
O gestor pergunta: **"qual a probabilidade de B ser melhor que A?"** O p-valor não responde isso. A abordagem **bayesiana** responde, ao custo de declarar uma crença prévia (**prior**).

**Teorema de Bayes:** posterior ∝ verossimilhança × prior. Para taxas de conversão, a combinação **conjugada** é a mais usada:
- prior **Beta(α₀, β₀)** para a taxa p (Beta(1, 1) = uniforme, "não informativo")
- observou **x conversões em n usuários** (Binomial)
- posterior **Beta(α₀ + x, β₀ + n − x)**: basta somar sucessos e fracassos

**Priors:**
| tipo | exemplo | quando |
|---|---|---|
| **não informativo** | Beta(1, 1) | pouco conhecimento; os dados dominam rapidamente |
| **informativo / empírico** | Beta(40, 960): "a conversão costuma ficar em torno de 4%, com força de ~1.000 usuários" | há histórico confiável; **estabiliza** estimativas com pouca amostra e reduz o exagero de efeitos em testes pequenos |

Um prior muito forte e errado atrasa a conclusão; documente o prior **antes** do teste.

**Saídas do teste bayesiano** (por **Monte Carlo**: sorteie muitas amostras das posteriores com \`rng.beta(a, b, size)\`):
- **intervalo de credibilidade** (*credible interval*) de 95%: percentis 2,5 e 97,5 da posterior; aqui, sim, "há 95% de probabilidade de o valor estar no intervalo" (dado o modelo e o prior)
- **P(B > A)** = fração das amostras em que p_B > p_A
- **lift esperado** e a distribuição do lift (p_B − p_A) ÷ p_A
- **perda esperada** (*expected loss*) de escolher B: **E[max(p_A − p_B, 0)]**, o quanto se perde, em média, se B for pior. Simétrico para A

**Regra de parada por perda esperada** (Chris Stucchio, VWO): pare e escolha a variante cuja perda esperada ficou abaixo de um **limiar de indiferença** ε (ex.: 0,02 p.p. de conversão, um valor que o negócio aceita perder). Ela é mais tolerante a parar cedo quando as variantes são praticamente equivalentes, porque escolher qualquer uma custa pouco.

**Cuidado:** "bayesiano" não imuniza contra o peeking. Parar no primeiro momento em que P(B > A) > 95% também infla os erros; a regra de perda esperada controla o **custo** da decisão, não a taxa de falso positivo.
`),
    exPy('Posteriores do teste do streaming', `
Conversão para o plano anual entre os assinantes (simulada a partir dos cliques), com prior Beta(1, 1):
`, r`rng = np.random.default_rng(0)
xa, na = 412, 10000
xb, nb = 468, 10000
pa = rng.beta(1 + xa, 1 + na - xa, size=200000)
pb = rng.beta(1 + xb, 1 + nb - xb, size=200000)
print(f"P(B > A) = {(pb > pa).mean():.3f}")
print("IC de credibilidade 95% do lift:", np.percentile((pb - pa) / pa, [2.5, 97.5]).round(3))
print(f"perda esperada escolhendo B: {np.maximum(pa - pb, 0).mean() * 100:.4f} p.p.")
print(f"perda esperada escolhendo A: {np.maximum(pb - pa, 0).mean() * 100:.4f} p.p.")`, `
Com P(B > A) ≈ 97% e uma perda esperada de escolher B muito menor que a de escolher A, a decisão é B, mesmo antes de qualquer p-valor.
`, PURO),
    quiz('Qual afirmação só é válida na abordagem bayesiana?', ['"Há 97% de probabilidade de B ser melhor que A (dado o modelo e o prior)"', '"Se não houvesse efeito, veríamos isso em 3% das vezes"', '"Rejeitamos H₀ a 5%"', '"O IC de 95% contém o efeito em 95% das repetições"'], 0),
    quiz('O prior Beta(40, 960) para a conversão significa aproximadamente...', ['Uma crença prévia de conversão em torno de 4%, com peso equivalente a ~1.000 usuários', 'Que 40 testes já foram feitos', 'Que a conversão é exatamente 40/960', 'Um prior não informativo'], 0),
    py('Escreva `bayes_ab(xa, na, xb, nb, a0=1, b0=1, sims=100000, seed=0)` que devolve um dicionário com `"p_b_melhor"`, `"perda_b"` e `"perda_a"` (perdas esperadas em fração, não em p.p.), sorteando as posteriores Beta com `rng = np.random.default_rng(seed)` (primeiro A, depois B).',
      r`def bayes_ab(xa, na, xb, nb, a0=1, b0=1, sims=100000, seed=0):
    rng = np.random.default_rng(seed)
    pa = rng.beta(a0 + xa, b0 + na - xa, size=sims)
    pb = rng.beta(a0 + xb, b0 + nb - xb, size=sims)
    return {"p_b_melhor": (pb > pa).mean(),
            "perda_b": np.maximum(pa - pb, 0).mean(),
            "perda_a": np.maximum(pb - pa, 0).mean()}`,
      r`_r = bayes_ab(412, 10000, 468, 10000)
assert 0.95 < _r["p_b_melhor"] < 0.99 and _r["perda_b"] < _r["perda_a"]
_e = bayes_ab(500, 10000, 500, 10000)
assert 0.47 < _e["p_b_melhor"] < 0.53 and abs(_e["perda_a"] - _e["perda_b"]) < 3e-4
_f = bayes_ab(5, 100, 9, 100, a0=40, b0=960)
_g = bayes_ab(5, 100, 9, 100)
assert _f["p_b_melhor"] < _g["p_b_melhor"]`, PURO),
  ],
};

const L_NORMAL = {
  id: 'ex-3-5', title: 'Bayes Normal-Normal e priors empíricos para métricas contínuas',
  steps: [
    theory('O prior que vem do histórico da empresa', `
Para métricas contínuas (receita, minutos), e para o **efeito** de qualquer teste grande, a aproximação mais prática é o modelo **Normal-Normal**:
- o efeito estimado pelo teste é d̂ com erro padrão ep: d̂ | δ ~ Normal(δ, ep²)
- prior do efeito verdadeiro: δ ~ Normal(μ₀, τ²)
- **posterior:** Normal com
  - **precisão** (1 ÷ variância) = 1/τ² + 1/ep²
  - **média** = (μ₀/τ² + d̂/ep²) ÷ (1/τ² + 1/ep²), uma **média ponderada pelas precisões**

Leitura: quando o teste é muito preciso (ep pequeno), a posterior fica perto de d̂; quando é ruidoso, a posterior **encolhe** (*shrinks*) para μ₀.

**Prior empírico:** μ₀ e τ vêm do **histórico de experimentos** da empresa. Kohavi e coautores relatam que só uma minoria das ideias testadas melhora a métrica principal (a taxa de sucesso costuma ficar entre 10% e 33% conforme a empresa) e que efeitos grandes são raros. Um prior centrado em zero com τ pequeno codifica isso: **"efeitos enormes são improváveis; desconfie"**. É o antídoto bayesiano para a *winner's curse* (Nível 4).

**Probabilidade de efeito positivo:** P(δ > 0) = Φ(média_post ÷ dp_post).

Esse mesmo raciocínio aparece com outros nomes: **ridge** na regressão, **empirical Bayes** na meta-análise e **modelos hierárquicos** (Estatística, Nível 5).
`),
    exPy('O mesmo resultado com priors diferentes', `
`, r`def posterior(d, ep, mu0, tau):
    prec = 1 / tau ** 2 + 1 / ep ** 2
    media = (mu0 / tau ** 2 + d / ep ** 2) / prec
    return media, sqrt(1 / prec)

d, ep = 3.0, 1.2              # efeito estimado de +3% na receita, EP 1,2
for tau in [10.0, 2.0, 1.0, 0.5]:
    m, s = posterior(d, ep, 0.0, tau)
    print(f"prior N(0, {tau}²): posterior {m:.2f} ± {s:.2f} | P(efeito > 0) = {NormalDist().cdf(m / s):.3f}")`, `
Com prior vago (τ = 10) a posterior é quase o próprio teste. Com um prior cético (τ = 0,5), o efeito de +3% encolhe para menos de +0,5%: o histórico diz que +3% seria extraordinário.
`, PURO),
    quiz('Um teste pequeno mostrou +12% de receita (EP 6%). O prior empírico da empresa é N(0, 2²). O que acontece com a posterior?', ['Encolhe bastante em direção a zero, porque o teste é ruidoso e efeitos de 12% são raros no histórico', 'Fica em +12%', 'Fica negativa', 'Não muda nada'], 0),
    py('Escreva `posterior_normal(d, ep, mu0, tau)` que devolve `(media, dp)` da posterior e `prob_positivo(d, ep, mu0, tau)` = P(δ > 0) (use `NormalDist().cdf`).',
      r`def posterior_normal(d, ep, mu0, tau):
    prec = 1 / tau ** 2 + 1 / ep ** 2
    media = (mu0 / tau ** 2 + d / ep ** 2) / prec
    return media, sqrt(1 / prec)

def prob_positivo(d, ep, mu0, tau):
    m, s = posterior_normal(d, ep, mu0, tau)
    return NormalDist().cdf(m / s)`,
      r`_m, _s = posterior_normal(2.0, 1.0, 0.0, 1.0)
assert abs(_m - 1.0) < 1e-12 and abs(_s - sqrt(0.5)) < 1e-12
_m, _s = posterior_normal(12.0, 6.0, 0.0, 2.0)
assert abs(_m - 1.2) < 1e-9
assert abs(prob_positivo(2.0, 1.0, 0.0, 1.0) - NormalDist().cdf(1 / sqrt(0.5))) < 1e-12
assert prob_positivo(3, 1.2, 0, 10) > prob_positivo(3, 1.2, 0, 0.5)`, PURO),
  ],
};

const L_REDE = {
  id: 'ex-3-6', title: 'SUTVA e efeitos de rede: cluster, switchback e randomização bilateral',
  steps: [
    theory('Quando o tratamento de um afeta o outro', `
O teste A/B clássico supõe **SUTVA** (*Stable Unit Treatment Value Assumption*): o resultado de cada unidade depende **só do seu próprio tratamento**, não do tratamento dos outros.

Em **marketplaces** e **redes sociais**, isso quebra:
- **iFood / Uber / DoorDash:** um algoritmo novo de despacho dá prioridade aos pedidos do tratamento. Os entregadores são os **mesmos** para os dois grupos: o tratamento "rouba" entregadores do controle. O controle piora, o tratamento melhora, e a diferença **superestima** o efeito real de lançar para todos (**canibalização**)
- **Airbnb:** um desconto no tratamento ocupa imóveis que o controle também queria reservar
- **redes sociais:** um recurso de compartilhamento no tratamento gera conteúdo que o controle também vê (o controle é "contaminado" e o efeito é **subestimado**)

**Desenhos que reduzem a interferência:**
| desenho | ideia | custo |
|---|---|---|
| **cluster randomization** (geográfica) | sorteia **cidades/regiões** inteiras; a interferência fica dentro do cluster | poucas unidades = pouco poder; regiões diferentes entre si (use CUPED/estratificação) |
| **cluster em grafo** | agrupa usuários conectados (comunidades da rede social) e sorteia os grupos | conexões entre clusters ainda vazam |
| **switchback** (alternância no tempo) | a região inteira alterna entre A e B em **janelas de tempo** (ex.: blocos de 1 a 4 horas) sorteadas | **efeito residual** (*carryover*): o estado do mercado no fim de uma janela contamina o início da próxima |
| **randomização bilateral** | sorteia os dois lados (ex.: compradores **e** vendedores) e compara as combinações | mais complexo de analisar |

**Análise de switchback:**
1. a unidade de análise é a **janela** (não o pedido): agregue por janela e compare as janelas tratadas com as de controle
2. controle a **hora do dia** e o dia da semana (as janelas tratadas podem cair mais no horário de pico por acaso): compare resíduos depois de subtrair a média de cada hora, ou use regressão com efeitos fixos de hora
3. **período de washout** (resfriamento): descarte o início de cada janela, quando o efeito da janela anterior ainda está presente. Janelas mais longas reduzem a fração contaminada, mas reduzem o número de unidades
4. a DoorDash lembra que switchbacks costumam ter **pouco poder** e não medem efeitos de aprendizado de longo prazo dos entregadores
`),
    exPy('Analisando o switchback de preço dinâmico', `
`, r`d = switch.copy()
d["residuo"] = d["entregas"] - d.groupby("hora_do_dia")["entregas"].transform("mean")
tudo = d.groupby("tratamento")["residuo"].mean()
lavado = d[d["hora_na_janela"] > 0].groupby("tratamento")["residuo"].mean()
print(f"efeito usando todas as horas: {tudo[1] - tudo[0]:.2f}")
print(f"efeito com washout (sem a 1ª hora de cada janela): {lavado[1] - lavado[0]:.2f}")
jan = d[d["hora_na_janela"] > 0].groupby("janela").agg(trat=("tratamento", "first"), y=("residuo", "mean"))
a, b = jan.loc[jan.trat == 0, "y"], jan.loc[jan.trat == 1, "y"]
print(f"janelas: {len(a)} controle × {len(b)} tratamento, z por janela = {(b.mean() - a.mean()) / sqrt(a.var() / len(a) + b.var() / len(b)):.1f}")`, `
Incluir a primeira hora de cada janela **dilui** o efeito (metade do efeito da janela anterior ainda está lá). O washout recupera uma estimativa mais próxima do efeito real, e o teste é feito com a **janela** como unidade.
`, D3),
    quiz('Um novo algoritmo de despacho foi testado com usuários randomizados no mesmo mercado e mostrou entregas 15% mais rápidas no tratamento. Por que desconfiar?', ['Tratamento e controle disputam os mesmos entregadores: parte do ganho do tratamento veio de piorar o controle', 'Porque 15% é muito', 'Porque não houve SRM', 'Porque o teste foi bicaudal'], 0),
    quiz('Em um switchback, para que serve o período de washout?', ['Descartar o início de cada janela, ainda contaminado pelo efeito da janela anterior', 'Limpar dados de bots', 'Aumentar o número de janelas', 'Fazer o teste sequencial'], 0),
    py('Analise o `switch` **na unidade janela**: subtraia a média de cada `hora_do_dia` (`residuo`), descarte a primeira hora de cada janela (`hora_na_janela == 0`) e agregue por `janela` (média do resíduo e o tratamento). Guarde `efeito` (tratamento − controle das médias por janela), `ep` (Welch entre janelas) e `n_janelas` (total de janelas usadas).',
      r`d = switch.copy()
d["residuo"] = d["entregas"] - d.groupby("hora_do_dia")["entregas"].transform("mean")
d = d[d["hora_na_janela"] > 0]
jan = d.groupby("janela").agg(trat=("tratamento", "first"), y=("residuo", "mean"))
a = jan.loc[jan["trat"] == 0, "y"]
b = jan.loc[jan["trat"] == 1, "y"]
efeito = b.mean() - a.mean()
ep = sqrt(a.var() / len(a) + b.var() / len(b))
n_janelas = len(jan)`,
      r`assert n_janelas == 126
assert 3.0 < efeito < 4.5, efeito
assert 0 < ep < 0.5`, D3),
  ],
};

const L_DID = {
  id: 'ex-3-7', title: 'Inferência causal: resultados potenciais, DAGs e Difference-in-Differences',
  steps: [
    theory('Medir causa sem poder sortear', `
Nem sempre dá para randomizar: o lançamento foi decidido para uma cidade, a campanha de TV é nacional, a lei mudou para todos. A **inferência causal** organiza o que pode (e o que não pode) ser concluído.

**Modelo de resultados potenciais (Rubin):** cada unidade tem dois resultados possíveis, Y(1) com tratamento e Y(0) sem. O efeito individual é Y(1) − Y(0), mas só observamos **um** deles: o outro é o **contrafactual**. Toda a inferência causal é uma forma de **estimar o contrafactual**. Na randomização, o grupo controle é o contrafactual do tratamento.

**DAGs** (grafos causais acíclicos): setas X → Y dizem "X causa Y". Ajudam a decidir **o que controlar**:
- **confounder** (X ← C → Y): **controle**; senão a associação X–Y é espúria
- **mediador** (X → M → Y): **não controle** se quer o efeito total (você bloquearia o caminho do efeito)
- **collider** (X → K ← Y): **nunca controle** (condicionar abre uma associação falsa; ex.: analisar só clientes que reclamaram)

**Difference-in-Differences (DiD):** compara a **mudança** no grupo tratado com a **mudança** no grupo controle, antes e depois da intervenção:
**DiD = (Ȳ_trat,depois − Ȳ_trat,antes) − (Ȳ_ctrl,depois − Ȳ_ctrl,antes)**
- a primeira diferença remove o que é **fixo** da unidade tratada (Recife sempre vendeu mais)
- a segunda remove o que **mudou para todos** no tempo (sazonalidade, tendência do mercado)
- premissa central: **tendências paralelas**. Sem o tratamento, tratado e controle teriam evoluído **igual**. Verifique no gráfico do **período pré** (as curvas andam juntas?) e com placebos (fingir que o tratamento começou antes)

**Como regressão:** Y = β₀ + β₁·tratado + β₂·depois + **β₃·(tratado × depois)** + ε. O β₃ é o DiD, e a regressão permite adicionar controles e erros padrão robustos por cluster (a unidade). Em Python: \`statsmodels.formula.api.ols("y ~ tratado * depois", data).fit(cov_type="cluster", ...)\`; aqui usamos \`np.linalg.lstsq(X, y, rcond=None)\`, que resolve mínimos quadrados e devolve os coeficientes em \`[0]\`. A matriz X é montada com \`np.column_stack([...])\` (cada array vira uma coluna).

Bibliotecas causais: \`DoWhy\` (modela o DAG e testa a robustez), \`CausalPy\` (DiD, controle sintético e RDD bayesianos), \`linearmodels\` (painéis e IV).
`),
    exPy('O programa de fidelidade de Recife', `
`, r`c = cidades.copy()
c["tratado"] = (c["cidade"] == "Recife").astype(int)
c["depois"] = (c["semana"] >= 45).astype(int)
m = c.groupby(["tratado", "depois"])["pedidos"].mean().unstack()
print(m.round(2))
print(f"diferença simples depois (Recife − outras): {m.loc[1, 1] - m.loc[0, 1]:.2f}")
print(f"antes × depois só em Recife: {m.loc[1, 1] - m.loc[1, 0]:.2f}")
print(f"DiD: {(m.loc[1, 1] - m.loc[1, 0]) - (m.loc[0, 1] - m.loc[0, 0]):.2f}")
pre = c[c.depois == 0].groupby(["semana", "tratado"])["pedidos"].mean().unstack()
print(f"tendências pré (pedidos/semana): Recife {np.polyfit(pre.index, pre[1], 1)[0]:.2f}, outras {np.polyfit(pre.index, pre[0], 1)[0]:.2f}")`, `
"Antes × depois" só em Recife mistura o programa com o crescimento do mercado; a diferença simples mistura com o nível de Recife. O DiD remove os dois. As tendências pré parecidas sustentam a premissa de tendências paralelas.
`, D3),
    quiz('Você quer o efeito total de um curso de vendas sobre a receita. O curso aumenta a confiança, que aumenta a receita. Deve controlar pela confiança?', ['Não: a confiança é mediador, e controlar por ela bloquearia parte do efeito', 'Sim, sempre controle o máximo de variáveis', 'Sim, porque é um confounder', 'Tanto faz'], 0),
    quiz('Qual a premissa central do Difference-in-Differences?', ['Tendências paralelas: sem o tratamento, tratado e controle evoluiriam igual', 'Que os grupos tenham o mesmo nível antes', 'Que o tratamento seja sorteado', 'Que não haja sazonalidade'], 0),
    py('Estime o DiD de Recife **por regressão**: com `c = cidades.copy()`, crie `tratado`, `depois` (semana ≥ 45) e `interacao`, monte `X = np.column_stack([np.ones(len(c)), c.tratado, c.depois, c.interacao])`, resolva com `np.linalg.lstsq(X, c.pedidos, rcond=None)[0]` e guarde os coeficientes em `beta` e o efeito em `did` (o 4º coeficiente).',
      r`c = cidades.copy()
c["tratado"] = (c["cidade"] == "Recife").astype(int)
c["depois"] = (c["semana"] >= 45).astype(int)
c["interacao"] = c["tratado"] * c["depois"]
X = np.column_stack([np.ones(len(c)), c["tratado"], c["depois"], c["interacao"]])
beta = np.linalg.lstsq(X, c["pedidos"], rcond=None)[0]
did = beta[3]`,
      r`_c = cidades.copy(); _t = _c.cidade == "Recife"; _d = _c.semana >= 45
_m = lambda a, b: _c.pedidos[(_t == a) & (_d == b)].mean()
assert abs(did - ((_m(1, 1) - _m(1, 0)) - (_m(0, 1) - _m(0, 0)))) < 1e-6
assert len(beta) == 4 and 6 < did < 11`, D3),
  ],
};

const L_SINTETICO = {
  id: 'ex-3-8', title: 'Controle sintético: um contrafactual feito de outras regiões',
  steps: [
    theory('Quando há uma única unidade tratada', `
O DiD compara Recife com a **média** das outras capitais. Mas por que dar o mesmo peso a Manaus e a Fortaleza, se algumas se parecem muito mais com Recife? O **controle sintético** (Abadie e Gardeazabal; Abadie, Diamond e Hainmueller) constrói um "Recife sintético" como uma **média ponderada** das unidades doadoras (*donor pool*):

**Recife_sintético(t) = Σⱼ wⱼ × Cidadeⱼ(t)**, com **wⱼ ≥ 0** e **Σ wⱼ = 1**

Os pesos são escolhidos para que o sintético **reproduza Recife no período pré**. Depois do lançamento, a diferença Recife − sintético é o efeito estimado, semana a semana.

**Por que os pesos são restritos** (não negativos e somando 1): evitam extrapolação (o sintético é uma interpolação de cidades reais), ficam interpretáveis ("Recife ≈ 24% Fortaleza + 21% Teresina + ...") e reduzem o **sobreajuste** a ruído do período pré. Uma regressão livre (\`np.linalg.lstsq\` sem restrição) pode ajustar o pré quase perfeitamente com pesos negativos e grandes, e errar o contrafactual. Variante comum: **demeaned** (subtrair de cada série a sua média no pré), que libera diferenças de nível e mantém o ajuste da dinâmica.

**Validação:**
- **qualidade do ajuste pré**: RMSE (raiz do erro quadrático médio) de Recife − sintético nas semanas antes do lançamento. Ajuste ruim = contrafactual não confiável
- **testes placebo**: rode o mesmo método fingindo que **cada doadora** foi tratada. Se o "efeito" de Recife não se destaca da distribuição dos placebos, não há evidência
- **placebo no tempo**: finja que o lançamento foi na semana 30

Pacotes: \`CausalPy\`, \`pysyncon\`, \`SparseSC\` (Microsoft). Para otimizar os pesos aqui, usamos um **gradiente projetado**: anda na direção que reduz o erro e projeta os pesos de volta no simplex (não negativos, soma 1). Na projeção aparecem \`np.sort\` (ordena), \`np.nonzero\` (posições verdadeiras) e \`np.maximum\` (máximo elemento a elemento). O \`@\` é o produto de matrizes e \`np.linalg.norm(A, 2)\` a maior escala da matriz, usada como tamanho de passo seguro.
`),
    exPy('Montando o Recife sintético', `
`, r`p = cidades.pivot(index="semana", columns="cidade", values="pedidos")
y = p.pop("Recife")
pre = (y.index < 45)
Xd = (p - p[pre].mean()).to_numpy()
yd = (y - y[pre].mean()).to_numpy()

def projeta_simplex(v):
    u = np.sort(v)[::-1]
    css = np.cumsum(u)
    k = np.nonzero(u * np.arange(1, len(v) + 1) > (css - 1))[0][-1]
    return np.maximum(v - (css[k] - 1) / (k + 1), 0)

A, b = Xd[pre], yd[pre]
passo = 1 / np.linalg.norm(A, 2) ** 2
w = np.full(A.shape[1], 1 / A.shape[1])
for _ in range(3000):
    w = projeta_simplex(w - passo * (A.T @ (A @ w - b)))
sint = Xd @ w
print({c: round(float(v), 3) for c, v in zip(p.columns, w) if v > 0.01})
print(f"RMSE pré: {np.sqrt(np.mean((yd - sint)[pre] ** 2)):.2f} | efeito médio pós: {(yd - sint)[~pre].mean():.2f}")`, `
O Recife sintético combina meia dúzia de capitais, acompanha Recife de perto antes da semana 45 e se descola depois: o efeito médio fica perto de +8 pedidos por semana.
`, D3),
    quiz('O controle sintético ajustou mal o período pré (RMSE alto). O que isso significa?', ['O contrafactual não é confiável; o efeito estimado no pós não deve ser usado', 'Que o efeito é grande', 'Que o tratamento falhou', 'Nada, só o pós importa'], 0),
    quiz('Para que servem os testes placebo no controle sintético?', ['Ver se o efeito da unidade tratada se destaca do "efeito" encontrado em unidades não tratadas', 'Aumentar a amostra', 'Calcular os pesos', 'Corrigir o SRM'], 0),
    py('Com os pesos `w_dados` já fornecidos (dicionário cidade → peso, de um controle sintético demeaned), monte o Recife sintético: `p = cidades.pivot(index="semana", columns="cidade", values="pedidos")`, subtraia de cada série a sua média pré (semanas < 45). Guarde `rmse_pre` e `efeito_pos` (média de Recife − sintético nas semanas ≥ 45) e `efeito_semana` (Series de Recife − sintético por semana).',
      r`p = cidades.pivot(index="semana", columns="cidade", values="pedidos")
pre = p.index < 45
pd_ = p - p[pre].mean()
sintetico = sum(peso * pd_[cidade] for cidade, peso in w_dados.items())
efeito_semana = pd_["Recife"] - sintetico
rmse_pre = np.sqrt((efeito_semana[pre] ** 2).mean())
efeito_pos = efeito_semana[~pre].mean()`,
      r`_p = cidades.pivot(index="semana", columns="cidade", values="pedidos"); _pre = _p.index < 45; _d = _p - _p[_pre].mean()
_s = sum(v * _d[k] for k, v in w_dados.items()); _e = _d.Recife - _s
assert np.allclose(np.asarray(efeito_semana), _e.to_numpy())
assert abs(rmse_pre - np.sqrt((_e[_pre] ** 2).mean())) < 1e-9 and rmse_pre < 4
assert 6 < efeito_pos < 11`,
      { ...D3, setup: D3.setup + '\nw_dados = {"Fortaleza": 0.24, "Teresina": 0.21, "João Pessoa": 0.205, "Belém": 0.11, "São Luís": 0.10, "Goiânia": 0.07, "Manaus": 0.03, "Natal": 0.035}', setupNote: D3.setupNote + ' Também `w_dados` (pesos do controle sintético de Recife).' }),
  ],
};

const L_OBS = {
  id: 'ex-3-9', title: 'PSM, IPW, Regressão Descontínua e Variáveis Instrumentais',
  steps: [
    theory('Três estratégias para dados observacionais', `
**1. Propensity Score: PSM e IPW.** Quando o tratamento foi **escolhido** (o cliente decidiu usar o cupom), quem se trata é diferente de quem não se trata. O **escore de propensão** e(x) = P(tratado | x) resume os confounders **observados** x.
- **PSM** (*Propensity Score Matching*): para cada tratado, encontre um não tratado com escore parecido e compare os pares. Intuitivo, mas descarta dados e é sensível ao critério de pareamento
- **IPW** (*Inverse Probability Weighting*): pondere cada tratado por **1 ÷ e(x)** e cada controle por **1 ÷ (1 − e(x))**. Isso recria uma "pseudo-população" em que o tratamento é independente de x. Efeito = média ponderada dos tratados − média ponderada dos controles
- e(x) costuma ser estimado com **regressão logística**; com poucas covariáveis discretas, basta a **proporção de tratados em cada célula** (\`groupby(...).transform("mean")\` devolve a média do grupo alinhada a cada linha)
- **premissa forte:** **não há confounders não observados** (*ignorabilidade*). Se o engajamento real não foi medido, nada disso resolve. E é preciso **sobreposição** (*overlap*): escores perto de 0 ou 1 geram pesos enormes e instáveis

**2. Regression Discontinuity Design (RDD).** Quando o tratamento é dado por uma **regra de corte** num escore (crédito liberado a partir de 600 pontos, bolsa para nota ≥ 7), quem está **logo acima** e **logo abaixo** do corte é praticamente igual. O salto no resultado bem no corte é o efeito causal **local** (para quem está perto do corte).
- ajuste uma reta (\`np.polyfit(x, y, 1)\`, que devolve inclinação e intercepto) de cada lado, numa **janela** (*bandwidth*) em torno do corte, com o escore centralizado (score − 600): o efeito é a diferença dos **interceptos**
- janela pequena: menos viés, mais variância. Teste várias
- cheque **manipulação**: se há um amontoado de pessoas logo acima do corte (gente "empurrando" o escore), o RDD quebra (teste de McCrary)

**3. Variáveis Instrumentais (IV).** Um **instrumento** Z afeta o tratamento X, mas só afeta o resultado Y **através de X** (restrição de exclusão), e não compartilha confounders com Y. Exemplo clássico em produto: o **convite aleatório** (encouragement design) para usar um recurso. Nem todos os convidados usam, mas o convite é sorteado.
- **estimador de Wald**: efeito = (efeito de Z em Y) ÷ (efeito de Z em X)
- mede o efeito para os **compliers** (quem usa porque foi convidado): é o **LATE**
- instrumento **fraco** (Z mexe pouco em X) gera estimativas explosivas
`),
    exPy('O cupom que "aumenta" o gasto em R$ 36', `
`, r`o = obs
ingenuo = o.loc[o.cupom == 1, "gasto"].mean() - o.loc[o.cupom == 0, "gasto"].mean()
e = o.groupby(["ativo", "jovem"])["cupom"].transform("mean")
w1, w0 = o.cupom / e, (1 - o.cupom) / (1 - e)
ipw = (w1 * o.gasto).sum() / w1.sum() - (w0 * o.gasto).sum() / w0.sum()
print(f"diferença ingênua: R$ {ingenuo:.2f} | IPW: R$ {ipw:.2f}")
print(o.groupby("ativo")["cupom"].mean().rename("taxa de uso do cupom"))
# Wald: convite sorteado (Z) → uso do recurso (X) → gasto (Y)
rng = np.random.default_rng(2)
z = rng.random(8000) < 0.5
x = rng.random(8000) < np.where(z, 0.6, 0.1)
y = 100 + 25 * x + rng.normal(0, 30, 8000)
print(f"IV (Wald): {(y[z].mean() - y[~z].mean()) / (x[z].mean() - x[~z].mean()):.1f} (efeito real 25)")`, `
Clientes ativos usam muito mais o cupom **e** gastam mais de qualquer jeito: a diferença ingênua mistura os dois. O IPW, ajustando pelos confounders observados, chega perto do efeito real de R$ 8.
`, D3),
    quiz('Clientes com score ≥ 600 recebem limite maior. O que o RDD compara?', ['Clientes logo acima e logo abaixo de 600, que são parecidos exceto pelo limite', 'Todos os clientes acima de 600 contra todos abaixo', 'Clientes de 300 contra clientes de 900', 'Clientes antes e depois de 600 dias'], 0),
    quiz('Qual a premissa crítica do IPW/PSM?', ['Que todos os confounders relevantes foram observados e usados no escore', 'Que o tratamento foi sorteado', 'Que os dados são normais', 'Que existe um corte no escore'], 0),
    py('Estime o efeito do cupom em `obs` por **IPW**, com o escore de propensão dado pela proporção de cupom em cada célula (`ativo`, `jovem`): guarde `e` (Series), `ingenuo` e `efeito_ipw`.',
      r`o = obs
e = o.groupby(["ativo", "jovem"])["cupom"].transform("mean")
ingenuo = o.loc[o["cupom"] == 1, "gasto"].mean() - o.loc[o["cupom"] == 0, "gasto"].mean()
w1 = o["cupom"] / e
w0 = (1 - o["cupom"]) / (1 - e)
efeito_ipw = (w1 * o["gasto"]).sum() / w1.sum() - (w0 * o["gasto"]).sum() / w0.sum()`,
      r`assert len(e) == len(obs) and e.between(0, 1).all()
assert ingenuo > 30 and 6 < efeito_ipw < 10, efeito_ipw`, D3),
    py('Estime o efeito do limite maior em `rdd` com **RDD**: com janela de 100 pontos (scores de 500 a 599 à esquerda e 600 a 699 à direita), ajuste `np.polyfit(score - 600, gasto, 1)` de cada lado e guarde `efeito_rdd` = intercepto direito − intercepto esquerdo. Guarde também `ingenuo_rdd`, a diferença simples de médias entre os dois lados da janela.',
      r`esq = rdd[(rdd["score"] >= 500) & (rdd["score"] < 600)]
dir_ = rdd[(rdd["score"] >= 600) & (rdd["score"] < 700)]
b_esq = np.polyfit(esq["score"] - 600, esq["gasto"], 1)
b_dir = np.polyfit(dir_["score"] - 600, dir_["gasto"], 1)
efeito_rdd = b_dir[1] - b_esq[1]
ingenuo_rdd = dir_["gasto"].mean() - esq["gasto"].mean()`,
      r`assert 55 < efeito_rdd < 90, efeito_rdd
assert ingenuo_rdd > efeito_rdd + 20`, D3),
  ],
};

const L_LONGO = {
  id: 'ex-3-10', title: 'Efeitos de longo prazo: holdouts e métricas substitutas',
  steps: [
    theory('O teste dura 2 semanas; o negócio, anos', `
Muitas decisões dependem de efeitos que só aparecem depois de meses: **retenção em 1 ano**, valor do cliente (LTV), **fadiga** de anúncios, aprendizado do usuário. Um teste de 14 dias não os vê, e efeitos de curto prazo podem até ter **sinal oposto** (mais anúncios = mais receita hoje, menos usuários amanhã).

**Long-term holdout:** depois de lançar, mantenha **um pequeno grupo** (1% a 5%) **sem** a mudança (ou sem um conjunto de mudanças do trimestre) por meses. Mede o efeito acumulado real e detecta efeitos que desaparecem ou se invertem. Custos: o holdout recebe uma experiência pior; engenharia para manter o código antigo; poder baixo com grupo pequeno.

**Métricas substitutas (*surrogates*):** um sinal de curto prazo que **prevê** o resultado de longo prazo. Ex.: "dias ativos nas 2 primeiras semanas" prevê retenção em 1 ano.
- **surrogate index** (Athey, Chetty, Imbens e Kang): com dados **históricos** em que se conhece tanto o curto quanto o longo prazo, treine um modelo **longo ≈ f(sinais curtos)**. No experimento, aplique o modelo aos sinais curtos de cada grupo e compare as **previsões** de longo prazo
- premissa: o tratamento afeta o longo prazo **só através** dos substitutos (*surrogacy*). Uma mudança que mexe na retenção por outro caminho quebra a premissa
- valide: em testes antigos com resultado de longo prazo conhecido, o índice previa o efeito real?

**Outros cuidados:** o efeito novidade (Nível 2) é o caso mais simples de "o curto prazo engana". E a **OEC** (Nível 1) deve ser escolhida justamente por prever o valor de longo prazo.
`),
    exPy('Um índice substituto para a retenção em 12 meses', `
`, r`rng = np.random.default_rng(4)
# histórico: dias ativos nas 2 primeiras semanas → retenção em 12 meses
dias = rng.integers(0, 15, 20000)
ret12 = (rng.random(20000) < 0.10 + 0.04 * dias).astype(int)
coef = np.polyfit(dias, ret12, 1)
print(f"modelo histórico: ret12 ≈ {coef[1]:.3f} + {coef[0]:.3f} × dias_ativos")
# experimento novo: só conhecemos os dias ativos
dias_a = rng.integers(0, 15, 6000)
dias_b = np.minimum(14, rng.integers(0, 15, 6000) + (rng.random(6000) < 0.15))
prev_a, prev_b = np.polyval(coef, dias_a).mean(), np.polyval(coef, dias_b).mean()
print(f"retenção 12m prevista: A {prev_a:.4f}, B {prev_b:.4f}, efeito previsto {prev_b - prev_a:+.4f}")`, `
\`np.polyval(coef, x)\` aplica o polinômio ajustado aos novos dados. O índice transforma um efeito em "dias ativos" numa estimativa de efeito na retenção anual, em semanas em vez de um ano.
`, PURO),
    quiz('Um teste de mais anúncios por página subiu a receita em 4% em 2 semanas. Qual o risco principal?', ['Efeito de longo prazo oposto: fadiga e perda de usuários, que só um holdout longo mostraria', 'SRM', 'Efeito Hawthorne', 'Peeking'], 0),
    quiz('Quando um surrogate index falha?', ['Quando o tratamento afeta o resultado de longo prazo por um caminho que não passa pelos substitutos', 'Quando o histórico é grande', 'Quando o teste é randomizado', 'Quando o efeito é positivo'], 0),
    py('Use o **histórico** dado (`hist` com `sessoes_14d` e `assinou_90d`) para ajustar `coef = np.polyfit(hist.sessoes_14d, hist.assinou_90d, 1)`. Aplique com `np.polyval` às sessões de cada grupo de `exp` (colunas `grupo` e `sessoes_14d`) e guarde `prev` (Series grupo → assinatura prevista média) e `efeito_previsto` (B − A).',
      r`coef = np.polyfit(hist["sessoes_14d"], hist["assinou_90d"], 1)
prev = exp.assign(p=np.polyval(coef, exp["sessoes_14d"])).groupby("grupo")["p"].mean()
efeito_previsto = prev["B"] - prev["A"]`,
      r`_c = np.polyfit(hist.sessoes_14d, hist.assinou_90d, 1)
_p = exp.assign(p=np.polyval(_c, exp.sessoes_14d)).groupby("grupo").p.mean()
assert abs(efeito_previsto - (_p.B - _p.A)) < 1e-12 and efeito_previsto > 0`,
      { ...PURO, setup: PURO.setup + r`
_g = np.random.default_rng(14)
_s = _g.poisson(5, 15000)
hist = pd.DataFrame({"sessoes_14d": _s, "assinou_90d": (_g.random(15000) < 0.05 + 0.015 * _s).astype(int)})
exp = pd.DataFrame({"grupo": np.repeat(["A", "B"], 5000), "sessoes_14d": np.r_[_g.poisson(5, 5000), _g.poisson(5.6, 5000)]})`, setupNote: 'Já carregados: `hist` (15 mil usuários antigos: sessoes_14d, assinou_90d), `exp` (10 mil usuários do teste novo: grupo A/B, sessoes_14d), `pd`, `np` e funções do math.' }),
  ],
};

const L_PROJETO3 = {
  id: 'ex-3-11', title: 'Projeto: análise avançada com ganho de sensibilidade e quase-experimento',
  steps: [
    theory('O entregável do Nível 3', `
Um relatório de cientista de dados sênior sobre o **streaming** e o **programa de fidelidade**, em três partes:

1. **Teste A/B de minutos assistidos (\`ab\`)**: o resultado bruto foi inconclusivo. Aplique **CUPED** e reporte o efeito com IC, a redução de variância e quanto tempo de teste o CUPED "economizou"
2. **CTR (\`ab\`)**: métrica de razão. Reporte com **Delta Method** e mostre o tamanho do erro que a análise ingênua cometeria
3. **Fidelidade em Recife (\`cidades\`)**: sem randomização. Estime por **DiD** e faça um **teste placebo no tempo**: finja que o programa começou na semana 30, usando só as semanas < 45. Um "efeito" placebo perto de zero reforça a premissa de tendências paralelas

E a conclusão para a diretoria, com faixas e limitações (premissas de cada método).
`),
    py('**1. CUPED com IC.** Calcule `efeito_cuped` (B − A dos minutos ajustados), o `ic_cuped` (tupla, ± 1,96 EP de Welch) e `reducao_tempo` = 1 − Var(Y_cuped) ÷ Var(Y), a fração do tamanho de amostra (e do tempo) economizada para o mesmo poder.',
      r`y, x = ab["minutos"], ab["minutos_pre"]
B = ab["grupo"] == "B"
theta = np.cov(y, x)[0, 1] / x.var()
yc = y - theta * (x - x.mean())
efeito_cuped = yc[B].mean() - yc[~B].mean()
ep = sqrt(yc[B].var() / B.sum() + yc[~B].var() / (~B).sum())
ic_cuped = (efeito_cuped - 1.96 * ep, efeito_cuped + 1.96 * ep)
reducao_tempo = 1 - yc.var() / y.var()`,
      r`assert ic_cuped[0] > 0 and ic_cuped[0] < efeito_cuped < ic_cuped[1]
assert 0.6 < reducao_tempo < 0.75`, D3),
    py('**2. Delta Method.** Guarde `z_correto` (CTR B − A com Delta Method) e `z_ingenuo` (páginas como Bernoulli). Guarde `ingenuo_exagera = z_ingenuo / z_correto`.',
      r`def delta_ratio(y, x):
    y, x = np.asarray(y, float), np.asarray(x, float)
    n, mx, my = len(x), x.mean(), y.mean()
    var = (y.var(ddof=1) / mx ** 2 - 2 * my * np.cov(y, x)[0, 1] / mx ** 3 + my ** 2 * x.var(ddof=1) / mx ** 4) / n
    return my / mx, var

A, Bg = ab[ab["grupo"] == "A"], ab[ab["grupo"] == "B"]
ra, va = delta_ratio(A["cliques"], A["paginas"])
rb, vb = delta_ratio(Bg["cliques"], Bg["paginas"])
z_correto = (rb - ra) / sqrt(va + vb)
z_ingenuo = (rb - ra) / sqrt(ra * (1 - ra) / A["paginas"].sum() + rb * (1 - rb) / Bg["paginas"].sum())
ingenuo_exagera = z_ingenuo / z_correto`,
      r`assert 1.7 < z_correto < 2.5 and ingenuo_exagera > 1.6`, D3),
    py('**3. DiD e placebo.** Calcule `did` (semana ≥ 45 como "depois") e `did_placebo`: usando **só** semanas < 45 e fingindo que o "depois" começa na semana 30.',
      r`def calc_did(dados, inicio):
    t = dados["cidade"] == "Recife"
    d = dados["semana"] >= inicio
    m = lambda a, b: dados.loc[(t == a) & (d == b), "pedidos"].mean()
    return (m(True, True) - m(True, False)) - (m(False, True) - m(False, False))

did = calc_did(cidades, 45)
did_placebo = calc_did(cidades[cidades["semana"] < 45], 30)`,
      r`assert 6 < did < 11 and abs(did_placebo) < 3, (did, did_placebo)`, D3),
    quiz('Para a diretoria: CUPED tornou o efeito de minutos claro, o CTR subiu com z ≈ 2 pelo Delta Method, e o DiD de Recife deu ≈ +8 pedidos/semana com placebo ≈ 0. Qual limitação precisa constar no relatório?', ['O DiD depende de tendências paralelas e de não haver outro evento só em Recife na semana 45; o placebo reforça, mas não prova', 'Nenhuma: os três resultados são definitivos', 'Que o CUPED inventou o efeito', 'Que o Delta Method só vale para proporções'], 0),
    order('Ordene a escolha do método conforme a situação:', ['dá para randomizar usuários: A/B com CUPED', 'há interferência no mercado: switchback ou cluster', 'uma região tratada e histórico longo: controle sintético ou DiD', 'tratamento por regra de corte: RDD']),
  ],
};

export const EX_N3 = [
  { id: 'ex-u6', level: 3, title: 'Sensibilidade: CUPED e métricas de razão', description: 'CUPED, CUPAC e estratificação; Delta Method para razões', lessons: [L_CUPED, L_DELTA] },
  { id: 'ex-u7', level: 3, title: 'Monitorar e decidir: sequencial e bayesiano', description: 'Pocock, O\'Brien-Fleming, alpha spending, mSPRT, Beta-Binomial, perda esperada e priors empíricos', lessons: [L_SEQUENCIAL, L_BAYES, L_NORMAL] },
  { id: 'ex-u8', level: 3, title: 'Interferência e inferência causal', description: 'SUTVA, switchback, DiD, controle sintético, IPW, RDD, IV e efeitos de longo prazo', lessons: [L_REDE, L_DID, L_SINTETICO, L_OBS, L_LONGO, L_PROJETO3] },
];
