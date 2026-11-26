// Experimentação — Nível 4: Master (bandits, causal ML, plataforma e cultura em escala)
import { theory, quiz, order, fill, py, exPy } from '../helpers.js';
import { D4, PURO } from './dados.js';

const r = String.raw;

const L_MAB = {
  id: 'ex-4-1', title: 'Multi-Armed Bandits: explorar × aproveitar, regret, ε-greedy, UCB e Thompson',
  steps: [
    theory('Aprender e ganhar ao mesmo tempo', `
No teste A/B clássico, metade do tráfego fica na variante pior até o fim, por desenho: é o **custo do aprendizado**. Um **bandit** (o nome vem das máquinas caça-níqueis, os "bandidos de um braço só") muda a alocação **durante** o teste, mandando mais tráfego para o que está funcionando.

**O dilema exploration × exploitation:**
- **explorar**: testar braços pouco conhecidos (talvez sejam melhores)
- **aproveitar** (*exploit*): usar o braço que parece melhor agora

**Regret (arrependimento):** o quanto se perdeu em relação a ter usado sempre o melhor braço. Depois de T rodadas, **regret = T × μ* − Σ recompensas esperadas obtidas**, com μ* = taxa do melhor braço. Um bom algoritmo tem regret que cresce **devagar** (logaritmicamente em T); um A/B 50/50 de horizonte fixo tem regret que cresce **linearmente** durante o teste.

**Algoritmos clássicos** (braço i com sᵢ sucessos em nᵢ tentativas, taxa estimada p̂ᵢ = sᵢ ÷ nᵢ):
| algoritmo | regra | característica |
|---|---|---|
| **ε-greedy** | com probabilidade ε escolhe um braço aleatório; senão, o de maior p̂ | simples; explora para sempre na mesma taxa (desperdício) |
| **UCB1** (*Upper Confidence Bound*) | escolhe o maior **p̂ᵢ + √(2 ln t ÷ nᵢ)** | "otimismo diante da incerteza": braços pouco testados ganham um bônus; determinístico |
| **Thompson Sampling** | sorteia θᵢ ~ **Beta(1 + sᵢ, 1 + nᵢ − sᵢ)** para cada braço e escolhe o maior θ | bayesiano; aloca tráfego na proporção da **probabilidade de cada braço ser o melhor**; ótimo desempenho prático |

Em código: \`np.argmax(v)\` devolve a posição do maior valor (o braço escolhido).

**Bandit × A/B: quando usar cada um**
| use bandit | use A/B clássico |
|---|---|
| campanhas **curtas** (promoção de 3 dias, manchetes de notícia) | quer **aprender** um efeito causal duradouro e generalizável |
| otimização **contínua** com muitos braços (criativos de anúncio) | várias **guardrails** a monitorar, decisão de produto irreversível |
| o custo de mostrar a pior variante é alto e o "porquê" importa pouco | precisa de **IC e p-valor** confiáveis, análise por segmento, efeitos de longo prazo |

Cuidado: com alocação adaptativa, as médias por braço ficam **enviesadas** e os ICs clássicos não valem. Bandits otimizam recompensa; testes A/B otimizam **conhecimento**.
`),
    exPy('Os três algoritmos numa rodada', `
`, r`rng = np.random.default_rng(0)
sucessos = np.array([12, 30, 5])
tentativas = np.array([300, 500, 60])
p_hat = sucessos / tentativas
t = tentativas.sum()
ucb = p_hat + np.sqrt(2 * np.log(t) / tentativas)
theta = rng.beta(1 + sucessos, 1 + tentativas - sucessos)
print("taxas estimadas:", p_hat.round(4))
print("UCB:", ucb.round(4), "→ braço", np.argmax(ucb))
print("Thompson (um sorteio):", theta.round(4), "→ braço", np.argmax(theta))
amostras = rng.beta(1 + sucessos, 1 + tentativas - sucessos, size=(20000, 3))
print("P(cada braço ser o melhor):", np.bincount(amostras.argmax(axis=1), minlength=3) / 20000)`, `
O braço 2 tem só 60 tentativas: o UCB dá a ele um bônus grande de incerteza. O Thompson reparte o tráfego conforme a probabilidade de cada braço ser o melhor (\`np.bincount\` conta quantas vezes cada braço venceu).
`, PURO),
    quiz('Qual algoritmo aloca tráfego na proporção da probabilidade de cada braço ser o melhor?', ['Thompson Sampling', 'ε-greedy', 'UCB1', 'Teste A/B 50/50'], 0),
    quiz('A empresa quer saber se o novo onboarding melhora a retenção em 90 dias e quer reportar o efeito com IC por segmento. O que usar?', ['Teste A/B clássico', 'Multi-armed bandit', 'ε-greedy com ε = 0', 'Thompson Sampling'], 0),
    py('Escreva `escolha_ucb(sucessos, tentativas)` (UCB1; com t = total de tentativas; braços com 0 tentativas são escolhidos primeiro) e `escolha_thompson(sucessos, tentativas, rng)` (um sorteio Beta(1 + s, 1 + n − s) por braço). Ambas devolvem o índice do braço (`int`).',
      r`def escolha_ucb(sucessos, tentativas):
    s = np.asarray(sucessos, float)
    n = np.asarray(tentativas, float)
    if (n == 0).any():
        return int(np.argmax(n == 0))
    ucb = s / n + np.sqrt(2 * np.log(n.sum()) / n)
    return int(np.argmax(ucb))

def escolha_thompson(sucessos, tentativas, rng):
    s = np.asarray(sucessos, float)
    n = np.asarray(tentativas, float)
    return int(np.argmax(rng.beta(1 + s, 1 + n - s)))`,
      r`assert escolha_ucb([5, 0, 3], [10, 0, 10]) == 1
assert escolha_ucb([50, 40], [1000, 1000]) == 0
assert escolha_ucb([12, 30, 5], [300, 500, 60]) == 2
_rng = np.random.default_rng(1)
_c = [escolha_thompson([100, 10], [1000, 1000], _rng) for _ in range(200)]
assert all(c == 0 for c in _c)
_c = [escolha_thompson([50, 50], [1000, 1000], _rng) for _ in range(400)]
assert 120 < sum(_c) < 280`, PURO),
  ],
};

const L_SIM_BANDIT = {
  id: 'ex-4-2', title: 'Simulação: bandit × A/B em cenários estacionários e não estacionários',
  steps: [
    theory('Medindo o regret na prática', `
Para comparar estratégias, simule um ambiente com taxas **conhecidas** (só pela simulação) e meça o **regret acumulado**: em cada rodada t, regret += μ* − μ do braço escolhido.

**Estratégias comparadas:**
1. **A/B de horizonte fixo**: alterna 50/50 por N rodadas; depois usa para sempre o vencedor (*explore-then-commit*)
2. **Thompson Sampling**: decide rodada a rodada
3. **UCB1**

**Cenário estacionário** (as taxas não mudam): Thompson e UCB costumam ter **regret bem menor** que o A/B, porque param de desperdiçar tráfego cedo.

**Cenário não estacionário** (as taxas mudam: o braço que era melhor piora, por fadiga do criativo ou mudança de público): bandits que acumulam todo o histórico ficam **presos** ao braço antigo, porque milhares de sucessos passados pesam mais que os fracassos recentes. Soluções:
- **desconto** (*discounted* Thompson): multiplicar sucessos e tentativas por γ < 1 a cada rodada, esquecendo o passado aos poucos
- **janela deslizante**: usar só as últimas W rodadas
- manter uma **exploração mínima** (nunca menos que x% para cada braço)

Uma comparação justa roda **muitas simulações** (sementes diferentes) e compara o regret **médio**. Em código, \`np.cumsum(regret)\` dá a curva de regret acumulado.
`),
    exPy('Regret acumulado: Thompson × A/B (2 braços, 3.000 rodadas)', `
`, r`def simula(estrategia, taxas, T, rng, n_explora=1000, gama=1.0):
    k = len(taxas(0))
    s, n = np.zeros(k), np.zeros(k)
    regret = 0.0
    for t in range(T):
        mu = taxas(t)
        if estrategia == "ab":
            braco = t % k if t < n_explora else int(np.argmax(s / np.maximum(n, 1)))
        else:
            braco = int(np.argmax(rng.beta(1 + s, 1 + n - s)))
        recompensa = rng.random() < mu[braco]
        s *= gama; n *= gama
        s[braco] += recompensa; n[braco] += 1
        regret += mu.max() - mu[braco]
    return regret

fixo = lambda t: np.array([0.04, 0.08])
muda = lambda t: np.array([0.04, 0.08]) if t < 1500 else np.array([0.08, 0.03])
rng = np.random.default_rng(3)
for nome, taxas in [("estacionário", fixo), ("não estacionário", muda)]:
    ab = np.mean([simula("ab", taxas, 3000, rng) for _ in range(8)])
    ts = np.mean([simula("ts", taxas, 3000, rng) for _ in range(8)])
    tsd = np.mean([simula("ts", taxas, 3000, rng, gama=0.99) for _ in range(8)])
    print(f"{nome:>16}: regret A/B {ab:6.1f} | Thompson {ts:6.1f} | Thompson com desconto {tsd:6.1f}")`, `
No cenário estacionário, o Thompson perde bem menos que o A/B, e o desconto **atrapalha** (ele esquece o que aprendeu e continua explorando). Quando as taxas se invertem na metade, o A/B fica preso ao vencedor antigo, o Thompson comum demora a perceber e o Thompson com desconto (γ = 0,99) se adapta melhor. Não existe algoritmo melhor em tudo: depende de o ambiente mudar ou não.
`, PURO),
    quiz('Por que um Thompson Sampling comum se sai mal quando o melhor braço muda no meio da campanha?', ['O histórico acumulado do braço antigo pesa mais que os fracassos recentes, e ele demora a trocar', 'Porque o Thompson não explora', 'Porque a Beta não aceita mudanças', 'Porque o regret fica negativo'], 0),
    py('Implemente `regret_thompson(taxas, T, seed)`: com `rng = np.random.default_rng(seed)`, rode Thompson Sampling por T rodadas com as `taxas` **fixas** (array) e devolva o **regret acumulado** como array de tamanho T (`np.cumsum` do regret de cada rodada). Guarde `curva = regret_thompson(np.array([0.04, 0.05, 0.08]), 4000, 0)`.',
      r`def regret_thompson(taxas, T, seed):
    rng = np.random.default_rng(seed)
    k = len(taxas)
    s, n = np.zeros(k), np.zeros(k)
    perdas = np.zeros(T)
    for t in range(T):
        braco = int(np.argmax(rng.beta(1 + s, 1 + n - s)))
        s[braco] += rng.random() < taxas[braco]
        n[braco] += 1
        perdas[t] = taxas.max() - taxas[braco]
    return np.cumsum(perdas)

curva = regret_thompson(np.array([0.04, 0.05, 0.08]), 4000, 0)`,
      r`assert len(curva) == 4000 and np.all(np.diff(curva) >= -1e-12)
_ab = 4000 * (0.08 - np.mean([0.04, 0.05, 0.08]))
assert curva[-1] < 0.5 * _ab, (curva[-1], _ab)
assert (curva[-1] - curva[1999]) < (curva[1999] - curva[0])`, PURO),
  ],
};

const L_CONTEXTUAL = {
  id: 'ex-4-3', title: 'Contextual bandits: a melhor ação para cada contexto',
  steps: [
    theory('Personalizar a alocação em tempo real', `
Um bandit comum procura **o** melhor braço para todos. Um **contextual bandit** procura o melhor braço **para cada contexto** x: horário, dispositivo, perfil, histórico. A política é uma função **π(x) → ação**.

Exemplos: qual banner mostrar para cada usuário; qual ordem de categorias na home por horário; qual desconto oferecer a cada cliente.

**Algoritmos:**
- **por contexto discreto**: um bandit independente para cada célula de contexto (manhã/tarde/noite). Simples, mas não compartilha informação entre células e explode com muitas combinações
- **LinUCB**: modelo linear da recompensa para cada ação, E[r | x, a] = xᵀθₐ, com bônus de incerteza do tipo UCB sobre a previsão
- **Thompson linear / com redes neurais**: sorteia parâmetros de uma posterior aproximada
- na prática (Vowpal Wabbit, plataformas de recomendação), modelos de ML estimam a recompensa e uma camada de exploração (ε ou Thompson) garante dados para aprender

**Os logs que a exploração gera são valiosos:** cada linha registra **contexto, ação escolhida, probabilidade com que ela foi escolhida (propensão) e recompensa**. Guardar a **propensão** é o que permite, depois, avaliar **outras** políticas sem colocá-las no ar (*off-policy evaluation*, lição 4-6).

**Método direto** (*direct method*) para montar uma política a partir dos logs: estime a recompensa média de cada (contexto, ação) e escolha, em cada contexto, a ação de maior estimativa. \`idxmax()\` devolve o rótulo do maior valor de uma Series (a ação vencedora). Risco: células com poucos dados viram escolhas ruidosas; e a estimativa herda vieses da política que gerou os logs.
`),
    exPy('Os logs de recomendação por contexto', `
`, r`tab = logs.groupby(["contexto", "acao"])["clicou"].agg(["mean", "size"]).round(4)
print(tab)
print("CTR da política atual:", round(logs.clicou.mean(), 4))
melhor_unica = logs.groupby("acao")["clicou"].mean()
print("melhor ação única para todos:", melhor_unica.idxmax(), round(melhor_unica.max(), 4))`, `
De manhã e à tarde, séries clicam mais; à noite, filmes. Uma única ação para todos deixa dinheiro na mesa: é o caso para personalizar.
`, D4),
    quiz('Que informação dos logs é indispensável para avaliar depois uma política diferente da que gerou os dados?', ['A probabilidade (propensão) com que a ação registrada foi escolhida', 'O nome do usuário', 'Só a recompensa', 'A ordem das linhas'], 0),
    py('Pelo **método direto**, monte a política contextual a partir de `logs`: `ctr` (Series com índice (contexto, acao) e a média de `clicou`), `politica` (dicionário contexto → ação de maior CTR estimado, usando `idxmax` em cada contexto) e `valor_direto`: o CTR esperado da política, ponderando o CTR da ação escolhida pela frequência de cada contexto.',
      r`ctr = logs.groupby(["contexto", "acao"])["clicou"].mean()
politica = {c: ctr.loc[c].idxmax() for c in logs["contexto"].unique()}
freq = logs["contexto"].value_counts(normalize=True)
valor_direto = sum(freq[c] * ctr.loc[(c, a)] for c, a in politica.items())`,
      r`assert politica == {"manha": "series", "tarde": "series", "noite": "filmes"}
_c = logs.groupby(["contexto", "acao"]).clicou.mean(); _f = logs.contexto.value_counts(normalize=True)
assert abs(valor_direto - sum(_f[c] * _c.loc[(c, a)] for c, a in politica.items())) < 1e-12
assert valor_direto > logs.clicou.mean()`, D4),
  ],
};

const L_UPLIFT = {
  id: 'ex-4-4', title: 'Efeitos heterogêneos e uplift: CATE, meta-learners, Causal Forest e DML',
  steps: [
    theory('Para quem o tratamento funciona', `
O teste A/B estima o **ATE** (*Average Treatment Effect*), o efeito **médio**. Mas o cupom pode **funcionar muito** para quem está em dúvida, **não fazer diferença** para quem compraria de qualquer jeito, e até **atrapalhar** para quem se irrita com promoções. O **CATE** (*Conditional Average Treatment Effect*) é o efeito condicionado às características: **τ(x) = E[Y(1) − Y(0) | X = x]**.

**Os quatro tipos de cliente do marketing de uplift:**
| tipo | sem cupom | com cupom | ação |
|---|---|---|---|
| **persuadíveis** | não compra | compra | **trate** (é onde está o uplift) |
| **certos** (*sure things*) | compra | compra | não gaste cupom |
| **perdidos** | não compra | não compra | não gaste cupom |
| **"cães adormecidos"** (*sleeping dogs*) | compra | **não compra** | **não trate**: o contato atrapalha (ex.: lembrar o cliente de cancelar) |

**Meta-learners** (usam qualquer modelo de ML, como gradient boosting, por baixo):
| método | ideia |
|---|---|
| **S-Learner** | um modelo único f(x, t); CATE = f(x, 1) − f(x, 0). Simples; o modelo pode "ignorar" t e encolher o efeito para zero |
| **T-Learner** | dois modelos: μ₁(x) treinado nos tratados e μ₀(x) nos controles; CATE = μ₁(x) − μ₀(x). Bom com muitos dados nos dois grupos |
| **X-Learner** | parte do T-Learner, imputa efeitos individuais (Y − μ₀(x) nos tratados, μ₁(x) − Y nos controles), modela esses efeitos e combina com a propensão. Bom com grupos desbalanceados |
| **R-Learner** | minimiza uma perda baseada nos resíduos de Y e de T (decomposição de Robinson); base do DML |

**Causal Forest** (Wager e Athey): uma floresta aleatória cujas divisões buscam **diferenças de efeito** (não de resultado), com estimativas "honestas" (divide dados para construir e para estimar) e **intervalos de confiança** para o CATE.

**Double Machine Learning (DML)** (Chernozhukov et al.): usa ML para prever Y e T a partir de X, trabalha com os **resíduos** e usa *cross-fitting* para evitar sobreajuste. Dá estimativas com propriedades estatísticas válidas mesmo com modelos flexíveis.

**Bibliotecas:** \`EconML\` (Microsoft: DML, Causal Forest, meta-learners), \`CausalML\` (Uber: meta-learners, uplift trees, curvas de uplift), \`grf\` (R). Os dados ideais vêm de um **experimento randomizado**; com dados observacionais, valem as premissas do Nível 3.

**Avaliar um modelo de uplift** é difícil porque o efeito individual nunca é observado. Usa-se a **curva Qini** (ou curva de uplift): ordene os clientes do maior para o menor CATE previsto e, para cada fração k dos primeiros, calcule o ganho acumulado **Qini(k) = Y_T(k) − Y_C(k) × N_T(k) ÷ N_C(k)** (conversões dos tratados menos as dos controles reescaladas). Um bom modelo sobe rápido no começo; um modelo aleatório segue a diagonal.
`),
    exPy('T-Learner por células e o retrato do uplift', `
Com poucas variáveis discretas, o T-Learner pode ser simplesmente a taxa de compra de tratados e controles **em cada célula**:
`, r`cel = uplift.groupby(["plano", "faixa", "tratamento"])["comprou"].mean().unstack()
cel["cate"] = cel[1] - cel[0]
cel["n"] = uplift.groupby(["plano", "faixa"]).size()
print(cel.round(3).sort_values("cate", ascending=False))
print("ATE (efeito médio):", round(uplift.loc[uplift.tratamento == 1, "comprou"].mean() - uplift.loc[uplift.tratamento == 0, "comprou"].mean(), 4))`, `
O ATE é positivo, mas esconde tudo: clientes **free** com 3 a 9 visitas são persuadíveis (+5 a +8 p.p.); clientes **pro** são "cães adormecidos" (o cupom **reduz** a compra).
`, D4),
    quiz('Um cliente compraria de qualquer jeito, com ou sem cupom. Como ele é chamado no marketing de uplift?', ['Certo (sure thing): dar o cupom só custa margem', 'Persuadível', 'Cão adormecido', 'Perdido'], 0),
    quiz('Qual a diferença entre o T-Learner e o S-Learner?', ['O T-Learner treina um modelo para tratados e outro para controles; o S-Learner usa um único modelo com o tratamento como variável', 'O T-Learner é bayesiano', 'O S-Learner não usa machine learning', 'São idênticos'], 0),
    py('Calcule o **CATE por célula** (`plano`, `faixa`) com o T-Learner por células: `cate` (Series com índice (plano, faixa)). Atribua a cada cliente o seu CATE previsto (`uplift["cate_prev"]`, usando `merge` ou `map` pelas duas colunas) e construa a **curva Qini**: ordene do maior para o menor `cate_prev`, calcule `qini` (array) com Y_T(k) − Y_C(k) × N_T(k) ÷ N_C(k) acumulados (use `np.cumsum`; quando N_C(k) = 0, considere 0).',
      r`t = uplift.groupby(["plano", "faixa", "tratamento"])["comprou"].mean().unstack()
cate = t[1] - t[0]
u = uplift.merge(cate.rename("cate_prev").reset_index(), on=["plano", "faixa"], how="left")
uplift["cate_prev"] = u["cate_prev"].to_numpy()
o = uplift.sort_values("cate_prev", ascending=False)
trat = o["tratamento"].to_numpy()
y = o["comprou"].to_numpy()
yt = np.cumsum(y * trat)
yc = np.cumsum(y * (1 - trat))
nt = np.cumsum(trat)
nc = np.cumsum(1 - trat)
qini = yt - np.where(nc > 0, yc * nt / np.maximum(nc, 1), 0)`,
      r`_t = uplift.groupby(["plano", "faixa", "tratamento"]).comprou.mean().unstack(); _c = _t[1] - _t[0]
assert abs(cate.loc[("free", "3-5")] - _c.loc[("free", "3-5")]) < 1e-12 and cate.loc[("pro", "6-9")] < 0
assert len(qini) == len(uplift)
assert qini.max() > qini[-1] + 100, (qini.max(), qini[-1])
assert np.argmax(qini) < 0.85 * len(qini)`, D4),
  ],
};

const L_POLITICA = {
  id: 'ex-4-5', title: 'Política de segmentação ótima: tratar só onde o CATE paga o custo',
  steps: [
    theory('Do modelo causal à decisão', `
O CATE só vale alguma coisa se virar **decisão**. A **política** π(x) decide quem recebe o tratamento.

**Regra de decisão econômica:** trate o cliente x se o **ganho esperado supera o custo**:
**τ(x) × valor_da_conversão > custo_por_tratado**

Exemplo: o cupom custa R$ 6 por cliente tratado (desconto médio × chance de uso, mais custo de envio) e uma compra gera R$ 90 de margem. Vale tratar se τ(x) > 6 ÷ 90 ≈ **6,7 p.p.**

**Valor de uma política** (por cliente): **Σ sobre as células tratadas de (fração da célula) × (τ × valor − custo)**. Compare com:
- **tratar todos** (a política "padrão" de muitas campanhas)
- **não tratar ninguém** (valor 0)
- **política ótima** com o CATE estimado

**Cuidados de quem já viu isso dar errado:**
- **valide a política em um novo experimento** (ou em dados de teste separados): o CATE estimado nos mesmos dados em que a política foi escolhida é otimista (o *winner's curse* das células)
- células com pouca amostra têm CATE muito ruidoso; use modelos com regularização (Causal Forest) ou um limiar mais conservador
- restrições do mundo real: orçamento máximo de cupons, justiça (não discriminar por atributos sensíveis), consistência da experiência
- políticas aprendidas com **EconML** (\`DRPolicyTree\`) ou árvores de decisão sobre o CATE produzem regras **interpretáveis** ("cupom só para plano free com 3 a 5 visitas")
`),
    exPy('Quanto vale cada política', `
`, r`t = uplift.groupby(["plano", "faixa", "tratamento"])["comprou"].mean().unstack()
cate = t[1] - t[0]
frac = uplift.groupby(["plano", "faixa"]).size() / len(uplift)
valor, custo = 90.0, 6.0
ganho = frac * (cate * valor - custo)
print(pd.DataFrame({"cate": cate.round(3), "fração": frac.round(3), "ganho por cliente": ganho.round(3)}))
print(f"tratar todos: R$ {ganho.sum():.3f} por cliente")
print(f"política ótima (só CATE > {custo / valor:.3f}): R$ {ganho[cate > custo / valor].sum():.3f} por cliente")`, `
Tratar todo mundo **dá prejuízo**: o cupom vai para "certos" e "cães adormecidos". Repare que o free com 6 a 9 visitas tem CATE **positivo** (+5 p.p.), mas abaixo do limiar de 6,7 p.p.: o cupom converte, só que não se paga. A política ótima trata só a célula free 3–5 e transforma a campanha em lucro.
`, D4),
    quiz('O cupom custa R$ 4 por cliente tratado e cada conversão vale R$ 50. A partir de qual CATE vale tratar?', ['8 p.p. (4 ÷ 50)', '4 p.p.', '50 p.p.', 'Qualquer CATE positivo'], 0),
    quiz('Por que validar a política de segmentação em um novo experimento?', ['O CATE estimado nos mesmos dados usados para escolher a política é otimista', 'Porque o primeiro teste tinha SRM', 'Porque a política muda o ATE', 'Não é necessário'], 0),
    py('Com `valor = 90` e `custo = 6`, calcule `valor_todos` (ganho esperado por cliente tratando todos), `celulas_tratar` (lista de tuplas (plano, faixa) com CATE × valor > custo, na ordem do índice) e `valor_politica` (ganho por cliente tratando só essas células). Use CATE e frações por célula como no exemplo.',
      r`valor, custo = 90.0, 6.0
t = uplift.groupby(["plano", "faixa", "tratamento"])["comprou"].mean().unstack()
cate = t[1] - t[0]
frac = uplift.groupby(["plano", "faixa"]).size() / len(uplift)
ganho = frac * (cate * valor - custo)
valor_todos = ganho.sum()
celulas_tratar = [i for i in cate.index if cate[i] * valor > custo]
valor_politica = ganho[cate * valor > custo].sum()`,
      r`assert celulas_tratar == [("free", "3-5")], celulas_tratar
assert valor_todos < 0 < valor_politica`, D4),
  ],
};

const L_INTERLEAVING = {
  id: 'ex-4-6', title: 'Busca e recomendação: interleaving e avaliação off-policy',
  steps: [
    theory('Comparar rankings com muito menos tráfego', `
Para comparar **dois algoritmos de ranqueamento** (busca, recomendação), um teste A/B mostra a lista A para uns e a lista B para outros, e compara métricas agregadas (cliques, conversão). É pouco sensível: a variação **entre usuários** é enorme.

**Interleaving** mostra a **cada usuário uma lista intercalada** com resultados dos dois algoritmos e observa **em qual "time" ele clica**. Cada usuário compara A e B diretamente, o que elimina a variação entre usuários. Netflix e Microsoft relatam sensibilidade da ordem de **10× a 100×** maior que A/B (são necessários muito menos usuários para detectar a mesma preferência).

**Team Draft Interleaving** (Radlinski et al., 2008), como escolher times numa pelada:
1. A e B se alternam escolhendo; quando os dois "times" têm o mesmo tamanho, uma **moeda** decide quem escolhe primeiro
2. na sua vez, cada algoritmo coloca o seu **resultado mais bem ranqueado que ainda não está na lista**, e o item fica marcado com o time
3. ao final, cada clique conta ponto para o time do item clicado; o algoritmo com mais cliques **vence aquela consulta**
4. agregue: proporção de consultas vencidas por A, por B e empates; teste se a preferência difere de 50%

**Probabilistic Interleaving** sorteia itens com probabilidades que decaem com a posição, o que permite reaproveitar os logs para avaliar outros pares de rankers. **Limitações:** mede **preferência relativa**, não o impacto em receita ou retenção; não serve quando a mudança altera a experiência inteira (layout, preço). Fluxo comum: interleaving para **filtrar** muitos candidatos rapidamente, A/B para **confirmar** o vencedor.

**Off-Policy Evaluation (OPE):** estimar o desempenho de uma **nova política** usando **logs** de outra (a de produção), sem colocar a nova no ar.
- **IPS** (*Inverse Propensity Scoring*): **V̂(π) = média de [ 1{π(xᵢ) = aᵢ} ÷ pᵢ × rᵢ ]**: aproveita só as linhas em que a política nova faria a mesma escolha que a registrada, reponderadas pela propensão pᵢ com que a ação foi escolhida
- não enviesado se as propensões estão corretas e toda ação da nova política tem pᵢ > 0 nos logs (**sem exploração, não há OPE**)
- variância alta com propensões pequenas: **SNIPS** (normaliza pela soma dos pesos), **clipping** dos pesos, ou **Doubly Robust** (combina IPS com o método direto)
`),
    exPy('Uma lista intercalada por Team Draft', `
`, r`def team_draft(lista_a, lista_b, rng):
    resultado, times = [], []
    na = nb = 0
    todos = set(lista_a) | set(lista_b)
    while len(resultado) < len(todos):
        vez_a = na < nb or (na == nb and rng.random() < 0.5)
        fonte = lista_a if vez_a else lista_b
        item = next((x for x in fonte if x not in resultado), None)
        if item is None:                       # esse algoritmo já não tem itens novos: passa a vez
            vez_a = not vez_a
            fonte = lista_a if vez_a else lista_b
            item = next(x for x in fonte if x not in resultado)
        resultado.append(item)
        times.append("A" if vez_a else "B")
        na, nb = na + vez_a, nb + (not vez_a)
    return resultado, times

rng = np.random.default_rng(7)
a = ["d1", "d2", "d3", "d4", "d5"]
b = ["d3", "d1", "d6", "d2", "d7"]
lista, times = team_draft(a, b, rng)
print(list(zip(lista, times)))
cliques = {"d3", "d6"}
pontos = {t: sum(1 for x, tt in zip(lista, times) if tt == t and x in cliques) for t in "AB"}
print("cliques por time:", pontos)`, `
Cada posição traz o "dono" do item. Os cliques do usuário viram uma votação direta entre os dois rankers.
`, PURO),
    quiz('Por que o interleaving é muito mais sensível que um A/B para comparar rankings?', ['Cada usuário compara os dois rankers na mesma lista, eliminando a variação entre usuários', 'Porque usa mais usuários', 'Porque ignora os cliques', 'Porque mede receita diretamente'], 0),
    quiz('A política de produção nunca mostrou "séries" à noite (probabilidade 0). O que o IPS consegue dizer sobre uma política nova que mostra séries à noite?', ['Nada confiável para esse contexto: sem exploração não há dados para avaliar essa ação', 'O valor exato', 'Que a política nova é pior', 'Que a política nova é melhor'], 0),
    py('Avalie off-policy, com **IPS**, a política contextual `{"manha": "series", "tarde": "series", "noite": "filmes"}` sobre `logs`: guarde `valor_ips` (média de 1{π(x) = a} ÷ prob × clicou) e `valor_snips` (mesma soma dividida pela soma dos pesos 1{π(x) = a} ÷ prob, em vez de n). Guarde também `valor_atual`, o CTR da política de produção.',
      r`politica = {"manha": "series", "tarde": "series", "noite": "filmes"}
igual = (logs["acao"] == logs["contexto"].map(politica)).astype(float)
peso = igual / logs["prob"]
valor_ips = (peso * logs["clicou"]).mean()
valor_snips = (peso * logs["clicou"]).sum() / peso.sum()
valor_atual = logs["clicou"].mean()`,
      r`_pol = {"manha": "series", "tarde": "series", "noite": "filmes"}
_w = (logs.acao == logs.contexto.map(_pol)) / logs.prob
assert abs(valor_ips - (_w * logs.clicou).mean()) < 1e-12
assert abs(valor_snips - (_w * logs.clicou).sum() / _w.sum()) < 1e-12
assert valor_ips > valor_atual and 0.09 < valor_snips < 0.11`, D4),
  ],
};

const L_META = {
  id: 'ex-4-7', title: 'Meta-análise: winner\'s curse, Empirical Bayes e taxa de acerto',
  steps: [
    theory('Os vencedores sempre parecem melhores do que são', `
**Winner's curse (maldição do vencedor):** entre muitos testes, os que "dão significativo" são, em média, os que tiveram **ruído a favor**. O efeito estimado dos vencedores é **sistematicamente maior** que o efeito real. Quanto menor o poder, maior o exagero (Gelman chama isso de **erro tipo M**, de magnitude). Consequência organizacional: a soma dos ganhos anunciados no ano é muito maior que o crescimento real da métrica.

**Taxa de acerto histórica:** em empresas maduras, a **maioria** das ideias testadas não melhora a OEC (Kohavi relata taxas de sucesso de 10% a 33% em Microsoft, Bing, Booking.com e outras). Isso é informação: um prior realista para "a próxima ideia" é centrado perto de zero.

**Empirical Bayes / Bayesian shrinkage:** use o **conjunto** de experimentos para estimar o prior e encolher cada estimativa:
1. cada experimento i tem estimativa d̂ᵢ e erro padrão epᵢ
2. estime a distribuição dos **efeitos reais**: média μ ≈ média dos d̂ᵢ e variância **τ² ≈ max(0, Var(d̂) − média(epᵢ²))** (a variância observada menos a parte que é só ruído; método dos momentos)
3. posterior de cada efeito (Normal-Normal do Nível 3): **δ̂ᵢ = μ + kᵢ (d̂ᵢ − μ)**, com **kᵢ = τ² ÷ (τ² + epᵢ²)**
   - testes precisos (ep pequeno) encolhem pouco; testes ruidosos encolhem muito
4. some os efeitos **encolhidos** dos lançamentos para estimar o impacto real do portfólio

**Outras práticas de meta-análise:** replicar os vencedores mais importantes; manter um **holdout** global do trimestre; acompanhar a taxa de acerto por time e por tipo de mudança; um repositório de experimentos pesquisável (o "conhecimento institucional").
`),
    exPy('O exagero dos vencedores no histórico', `
Nesta simulação conhecemos o efeito real de cada experimento, o que nunca acontece na prática, mas permite ver o fenômeno:
`, r`h = historico
venc = h["estimativa"] / h["ep"] > 1.96
print(f"{venc.sum()} vencedores de {len(h)}")
print(f"efeito médio estimado dos vencedores: {h.loc[venc, 'estimativa'].mean():.2f}% | real: {h.loc[venc, 'efeito_real'].mean():.2f}%")
mu = h["estimativa"].mean()
tau2 = max(0.0, h["estimativa"].var() - (h["ep"] ** 2).mean())
k = tau2 / (tau2 + h["ep"] ** 2)
enc = mu + k * (h["estimativa"] - mu)
print(f"prior empírico: μ = {mu:.3f}, τ = {sqrt(tau2):.3f}")
print(f"vencedores após encolhimento: {enc[venc].mean():.2f}%")
print(f"erro quadrático médio: bruto {((h.estimativa - h.efeito_real) ** 2).mean():.3f} | encolhido {((enc - h.efeito_real) ** 2).mean():.3f}")`, `
Os vencedores exageram o efeito real. O encolhimento corrige a direção (às vezes até demais) e **reduz o erro médio** das estimativas de todo o portfólio pela metade.
`, D4),
    quiz('O time somou os efeitos estimados dos 12 testes vencedores do ano (+14% de receita), mas a receita real cresceu 4%. Qual a explicação mais provável?', ['Winner\'s curse: os efeitos estimados dos vencedores são inflados pelo ruído (e há novidade e interações)', 'Os testes tinham SRM', 'A receita foi medida errado', 'Os testes eram unicaudais'], 0),
    quiz('No Empirical Bayes, qual experimento tem a estimativa mais encolhida para a média?', ['O de maior erro padrão (mais ruidoso)', 'O de maior estimativa', 'O de menor erro padrão', 'Todos encolhem igual'], 0),
    py('Implemente `empirical_bayes(estimativas, eps)` que devolve `(mu, tau2, encolhidas)` (array) pelo método dos momentos da teoria. Aplique a `historico`: guarde `encolhidas` e `taxa_acerto`, a fração de experimentos com **efeito encolhido** acima de 0,25%.',
      r`def empirical_bayes(estimativas, eps):
    d = np.asarray(estimativas, float)
    e = np.asarray(eps, float)
    mu = d.mean()
    tau2 = max(0.0, d.var(ddof=1) - (e ** 2).mean())
    k = tau2 / (tau2 + e ** 2)
    return mu, tau2, mu + k * (d - mu)

mu, tau2, encolhidas = empirical_bayes(historico["estimativa"], historico["ep"])
taxa_acerto = (encolhidas > 0.25).mean()`,
      r`_m, _t, _e = empirical_bayes([1.0, -1.0, 3.0], [1.0, 1.0, 1.0])
assert abs(_m - 1.0) < 1e-12 and abs(_t - 3.0) < 1e-12 and np.allclose(_e, [1.0, -0.5, 2.5])
_m, _t, _e = empirical_bayes([0.1, -0.1], [2.0, 2.0])
assert _t == 0 and np.allclose(_e, [0.0, 0.0])
assert len(encolhidas) == 80 and 0 < taxa_acerto < 0.6`, D4),
  ],
};

const L_PLATAFORMA = {
  id: 'ex-4-8', title: 'Arquitetura de plataforma: hashing, camadas ortogonais, feature flags e ramp-up',
  steps: [
    theory('Rodar centenas de testes ao mesmo tempo sem colisão', `
**Atribuição determinística por hashing:** a variante do usuário **não é sorteada e guardada**: ela é **calculada** a cada requisição, por uma função hash do ID com um *salt* do experimento:
\`bucket = hash(salt + ":" + user_id) mod 10.000\`
- o mesmo usuário sempre cai no mesmo bucket (experiência consistente, sem banco de dados de atribuição na hora da requisição)
- hashes bons (**MurmurHash3** é o padrão: rápido e bem distribuído, pacote \`mmh3\`; MD5 ou SHA-256 do módulo \`hashlib\` também servem) espalham os IDs uniformemente
- trocar o *salt* **reembaralha** os usuários (evita *carryover* de um teste anterior)

Em Python, com a biblioteca padrão: \`int(hashlib.md5(chave.encode()).hexdigest(), 16) % 10000\`: \`encode()\` transforma o texto em bytes, \`hexdigest()\` dá o hash em hexadecimal e \`int(..., 16)\` o converte em número.

**Camadas ortogonais** (*overlapping experiments*, Tang et al., Google, KDD 2010): os parâmetros do sistema são divididos em **camadas** (layer de layout, layer de ranking, layer de preço). Cada camada tem **o seu salt**; dentro de uma camada, os experimentos **dividem** os buckets (não se sobrepõem); entre camadas, as atribuições são **independentes**. Cada usuário participa de **um experimento por camada**, ao mesmo tempo. **Domínios** separam o tráfego que precisa de isolamento total. Microsoft (ExP), Booking.com e Netflix usam variações disso.
- experimentos que mexem **na mesma coisa** ficam na **mesma camada** (exclusão mútua)
- a independência entre camadas faz com que os efeitos das outras camadas se **cancelem em média** (fatorial implícito, Nível 2); monitore interações conhecidas

**Feature flags** (LaunchDarkly, Unleash, Statsig, GrowthBook, Optimizely): o código novo fica atrás de uma chave; a plataforma decide quem a vê. Integrar experimentos às flags permite **ramp-up**, **kill switch** (desligar na hora) e lançamento gradual com o mesmo mecanismo.

**Ramp-up sem reatribuir:** aumente o tráfego de 1% → 10% → 50% **expandindo o intervalo de buckets** do tratamento (bucket < 100, depois < 1.000, depois < 5.000). Quem estava no tratamento continua; só entram usuários novos. **Nunca** recalcule com um novo sorteio (usuários trocariam de grupo). Analise cada fase separadamente ou só a fase estável; tráfego que muda de proporção ao longo do tempo combinado com sazonalidade gera o paradoxo de Simpson.

**Outros requisitos de plataforma:** **baixa latência** (a atribuição roda em cada requisição, às vezes no app, offline); logs de **exposição** no momento certo (para o *triggering*); prevenção de **viés de gatilho**; **SRM automático** em todo teste; detecção de **bots**; auditoria e reprodutibilidade dos cálculos.
`),
    exPy('Buckets, camadas e independência', `
`, r`def bucket(user_id, salt, n=10000):
    chave = f"{salt}:{user_id}"
    return int(hashlib.md5(chave.encode()).hexdigest(), 16) % n

ids = range(1, 50001)
b1 = np.array([bucket(u, "layout-2025") for u in ids])
b2 = np.array([bucket(u, "ranking-2025") for u in ids])
print("mesmo usuário, mesmo bucket:", bucket(42, "layout-2025") == bucket(42, "layout-2025"))
print("uniformidade (contagem por décimo):", np.bincount(b1 // 1000))
trat1, trat2 = b1 < 5000, b2 < 5000
print("P(trat na camada 2 | trat na camada 1) =", round(trat2[trat1].mean(), 4), "| sem condição:", round(trat2.mean(), 4))`, `
Os buckets saem uniformes, e estar no tratamento de uma camada não muda a chance de estar no tratamento da outra: as camadas são ortogonais.
`, D4),
    quiz('Ao subir o tratamento de 10% para 50% do tráfego, qual o jeito certo?', ['Ampliar o intervalo de buckets do tratamento, mantendo quem já estava nele', 'Sortear de novo todos os usuários com 50%', 'Trocar o salt do experimento', 'Criar um experimento novo com outros usuários'], 0),
    quiz('Dois experimentos mudam a cor do mesmo botão. Onde colocá-los?', ['Na mesma camada (exclusão mútua), para nenhum usuário receber os dois', 'Em camadas diferentes', 'Em domínios diferentes, com o mesmo salt', 'Tanto faz'], 0),
    py('Escreva `bucket(user_id, salt, n=10000)` (MD5 de `f"{salt}:{user_id}"` como na teoria) e `variante(user_id, experimento, pct_tratamento)`, que devolve `"tratamento"` se o bucket com salt = nome do experimento for **menor que pct_tratamento × 100** (pct em %, ex.: 10 → buckets 0 a 999) e `"controle"` caso contrário. Guarde em `migrados` quantos dos usuários 1 a 20.000 que estavam no tratamento com 10% **saíram** dele quando o ramp-up foi para 50%.',
      r`def bucket(user_id, salt, n=10000):
    return int(hashlib.md5(f"{salt}:{user_id}".encode()).hexdigest(), 16) % n

def variante(user_id, experimento, pct_tratamento):
    return "tratamento" if bucket(user_id, experimento) < pct_tratamento * 100 else "controle"

antes = {u for u in range(1, 20001) if variante(u, "checkout-v3", 10) == "tratamento"}
depois = {u for u in range(1, 20001) if variante(u, "checkout-v3", 50) == "tratamento"}
migrados = len(antes - depois)`,
      r`assert bucket(7, "x") == int(hashlib.md5(b"x:7").hexdigest(), 16) % 10000
assert variante(7, "x", 100) == "tratamento" and variante(7, "x", 0) == "controle"
_t = sum(variante(u, "teste-z", 30) == "tratamento" for u in range(1, 10001))
assert 2800 < _t < 3200
assert migrados == 0`, D4),
  ],
};

const L_GOVERNANCA = {
  id: 'ex-4-9', title: 'Governança, ética e maturidade da cultura de experimentação',
  steps: [
    theory('Da ferramenta à cultura', `
**Modelo de maturidade** (Fabijan et al., "Crawl, Walk, Run, Fly"):
| fase | características |
|---|---|
| **Crawl** (engatinhar) | poucos testes por ano, feitos à mão por analistas; foco em montar a instrumentação e provar valor |
| **Walk** (andar) | plataforma básica, dezenas de testes; SRM e A/A rotineiros; métricas padronizadas |
| **Run** (correr) | centenas de testes; camadas ortogonais; OEC acordada com a liderança; a maioria das mudanças passa por teste |
| **Fly** (voar) | milhares de testes; **todo** lançamento é experimento; scorecards automáticos; meta-análise; times independentes de cientistas |

**Centro de Excelência (CoE) em Experimentação:** um time central que mantém a plataforma, as métricas oficiais e os métodos; dá **treinamento**; faz **peer review estatístico** de EDDs e análises importantes; mantém o repositório de experimentos. Modelo *hub-and-spoke*: o centro define o padrão, os cientistas embutidos nos times de produto executam.

**Alinhamento com a estratégia:** a OEC deve ser a tradução operacional dos **OKRs** da empresa. Se o OKR é retenção e a OEC dos times é cliques, a empresa otimiza a coisa errada com todo o rigor.

**p-hacking organizacional** (e como mitigar):
- testar até "dar significativo", fatiar segmentos depois, trocar a métrica principal → **pré-registro (EDD)**, OEC única, correção de múltiplas comparações
- metas de "nº de testes vencedores" por time → premie **aprendizado** e qualidade, não vitórias
- HiPPO (*Highest Paid Person's Opinion*) ignorando resultados → regras de decisão escritas antes

**Ética em experimentação com pessoas:**
- o caso do **experimento de contágio emocional do Facebook** (2014, feed manipulado para mais ou menos posts negativos) mostrou o risco de testes que podem causar **dano psicológico** sem consentimento
- princípios do **Relatório Belmont** (respeito às pessoas, beneficência, justiça) adaptados a produto: avalie **dano potencial**, evite testar preços discriminatórios ou manipulação (*dark patterns*), proteja **grupos vulneráveis**
- **privacidade**: LGPD/GDPR, minimização de dados, finalidade declarada; os logs de experimento são dados pessoais
- **transparência**: termos de uso claros; comitês de revisão (como um IRB interno) para testes sensíveis
- regra prática: **"eu me sentiria confortável se este teste saísse no jornal?"**
`),
    quiz('Uma empresa roda ~300 testes por ano, tem plataforma com camadas e uma OEC acordada com a diretoria, mas os relatórios ainda são montados à mão. Em que fase de maturidade ela está, aproximadamente?', ['Run', 'Crawl', 'Walk', 'Fly'], 0),
    quiz('Os times de produto têm como meta "5 testes vencedores por trimestre". Qual o risco?', ['Incentivar p-hacking: fatiar segmentos e espiar até achar vencedores', 'Nenhum, é uma boa meta', 'Rodar poucos testes', 'Ter SRM'], 0),
    quiz('Qual teste deveria passar por revisão ética antes de rodar?', ['Mostrar preços diferentes conforme o bairro do usuário', 'Mudar a cor de um botão', 'Reordenar categorias da home', 'Trocar o texto de um e-mail de boas-vindas'], 0),
    order('Ordene as fases do modelo de maturidade:', ['Crawl: primeiros testes à mão', 'Walk: plataforma básica e métricas padronizadas', 'Run: centenas de testes e OEC acordada', 'Fly: todo lançamento é experimento e scorecards automáticos']),
  ],
};

const L_SCORECARD = {
  id: 'ex-4-10', title: 'Scorecard automatizado: SRM, CUPED, Delta Method, guardrails e BH',
  steps: [
    theory('O relatório que roda sozinho para todo experimento', `
Em escala, ninguém calcula teste por teste à mão. A plataforma gera um **scorecard** padronizado para cada experimento, todo dia, a partir dos logs de exposição e eventos. É o que Microsoft ExP, Netflix XP, Spotify Confidence, Statsig e Eppo fazem.

**Ordem do pipeline** (cada etapa usa o que você aprendeu na trilha):
1. **Integridade primeiro**: SRM (qui-quadrado, p < 0,001). Se falhar, o scorecard mostra **só o alerta**, sem métricas (para ninguém decidir em cima de dados quebrados)
2. **Métricas por usuário** com **CUPED** (covariável pré-período) para as médias
3. **Métricas de razão** (CTR, receita por pedido) com **Delta Method**
4. **Guardrails**: para cada uma, o teste e o limite pré-definido; alerta se o IC indicar piora além do limite
5. **Múltiplas comparações**: **Benjamini-Hochberg** nas métricas secundárias; a OEC é avaliada sozinha
6. **Resumo executivo**: OEC (efeito, IC, p), guardrails (ok/alerta), recomendação sugerida (ship/iterate/kill) pelas regras do EDD

**Boas práticas de engenharia:** funções pequenas e testadas (cada uma das lições virou uma função), o mesmo código para todos os testes (sem análise "especial" para o teste do chefe), resultados reproduzíveis (semente, versão dos dados), e **testes A/A contínuos** para garantir que o pipeline mantém ~5% de falsos positivos.
`),
    exPy('Esqueleto do scorecard', `
`, r`def srm_p(n_c, n_t):
    esp = (n_c + n_t) / 2
    chi2 = ((n_c - esp) ** 2 + (n_t - esp) ** 2) / esp
    return erfc(sqrt(chi2 / 2))

def efeito_cuped(y, x, trat):
    theta = np.cov(y, x)[0, 1] / np.var(x, ddof=1)
    yc = y - theta * (x - x.mean())
    d = yc[trat].mean() - yc[~trat].mean()
    ep = sqrt(yc[trat].var(ddof=1) / trat.sum() + yc[~trat].var(ddof=1) / (~trat).sum())
    return d, ep

print("SRM p:", round(srm_p(50120, 49880), 4))
rng = np.random.default_rng(0)
x = rng.gamma(2, 20, 10000); trat = rng.random(10000) < 0.5
y = 0.8 * x + rng.normal(0, 10, 10000) + 1.0 * trat
d, ep = efeito_cuped(y, x, trat)
print(f"CUPED: {d:.2f} ± {1.96 * ep:.2f}")`, `
Cada bloco do scorecard é uma função pura que recebe arrays e devolve números. O scorecard é só a composição delas.
`, PURO),
    quiz('O scorecard detectou SRM com p = 0,00001. O que ele deve mostrar?', ['Só o alerta de integridade, escondendo as métricas até a causa ser resolvida', 'As métricas normalmente, com uma nota de rodapé', 'As métricas corrigidas pelo peso dos grupos', 'Nada, deve apagar o experimento'], 0),
    py('Escreva `scorecard(df)` para um DataFrame com colunas `trat` (0/1), `receita_pre`, `receita`, `paginas`, `cliques`, `latencia` e `cancelou`. Devolva um dicionário com: `"srm_ok"` (p ≥ 0,001), `"oec"` (efeito CUPED da receita), `"oec_ic"` (tupla ±1,96 EP), `"ctr_z"` (z do CTR com Delta Method), `"latencia_ok"` (aumento da média da latência < 5%) e `"recomendacao"`: `"invalido"` se SRM, `"ship"` se o IC da OEC está acima de 0 e a latência ok, `"iterate"` se o IC está acima de 0 mas a latência não, e `"kill"` caso contrário. Aplique a `dados` e guarde em `sc`.',
      r`def scorecard(df):
    t = df["trat"].to_numpy() == 1
    n_t, n_c = t.sum(), (~t).sum()
    esp = (n_t + n_c) / 2
    chi2 = ((n_t - esp) ** 2 + (n_c - esp) ** 2) / esp
    srm_ok = erfc(sqrt(chi2 / 2)) >= 0.001
    y, x = df["receita"].to_numpy(float), df["receita_pre"].to_numpy(float)
    theta = np.cov(y, x)[0, 1] / np.var(x, ddof=1)
    yc = y - theta * (x - x.mean())
    oec = yc[t].mean() - yc[~t].mean()
    ep = sqrt(yc[t].var(ddof=1) / n_t + yc[~t].var(ddof=1) / n_c)
    oec_ic = (oec - 1.96 * ep, oec + 1.96 * ep)

    def delta(yy, xx):
        n, mx, my = len(xx), xx.mean(), yy.mean()
        v = (yy.var(ddof=1) / mx ** 2 - 2 * my * np.cov(yy, xx)[0, 1] / mx ** 3 + my ** 2 * xx.var(ddof=1) / mx ** 4) / n
        return my / mx, v

    cl, pg = df["cliques"].to_numpy(float), df["paginas"].to_numpy(float)
    r_t, v_t = delta(cl[t], pg[t])
    r_c, v_c = delta(cl[~t], pg[~t])
    ctr_z = (r_t - r_c) / sqrt(v_t + v_c)
    lat = df["latencia"].to_numpy(float)
    latencia_ok = lat[t].mean() / lat[~t].mean() - 1 < 0.05
    if not srm_ok:
        rec = "invalido"
    elif oec_ic[0] > 0:
        rec = "ship" if latencia_ok else "iterate"
    else:
        rec = "kill"
    return {"srm_ok": srm_ok, "oec": oec, "oec_ic": oec_ic, "ctr_z": ctr_z, "latencia_ok": latencia_ok, "recomendacao": rec}

sc = scorecard(dados)`,
      r`assert sc["srm_ok"] and sc["oec_ic"][0] > 0 and sc["latencia_ok"] and sc["recomendacao"] == "ship"
assert sc["oec_ic"][0] < sc["oec"] < sc["oec_ic"][1] and 1.0 < sc["ctr_z"] < 6
_d = dados.copy(); _d["latencia"] = _d["latencia"] * np.where(_d.trat == 1, 1.10, 1.0)
assert scorecard(_d)["recomendacao"] == "iterate"
_d = dados[~((dados.trat == 1) & (dados.index % 10 == 0))]
assert scorecard(_d)["recomendacao"] == "invalido"
_d = dados.copy(); _d["receita"] = _d["receita"] - 3.0 * _d.trat
assert scorecard(_d)["recomendacao"] == "kill"`,
      { ...PURO, setup: PURO.setup + r`
_g = np.random.default_rng(77)
_n = 16000
dados = pd.DataFrame({"trat": (_g.random(_n) < 0.5).astype(int), "receita_pre": np.round(_g.gamma(2, 25, _n), 2)})
dados["receita"] = np.round(np.maximum(0, 0.7 * dados.receita_pre + _g.normal(0, 15, _n) + 1.2 * dados.trat), 2)
_e = _g.lognormal(0, 0.8, _n)
dados["paginas"] = _g.poisson(5 * _e) + 1
dados["cliques"] = _g.binomial(dados.paginas, np.clip(_g.beta(2, 18, _n) + 0.01 * dados.trat, 0, 1))
dados["latencia"] = np.round(_g.lognormal(np.log(380) + 0.01 * dados.trat, 0.3), 0)
dados["cancelou"] = (_g.random(_n) < 0.03).astype(int)`, setupNote: 'Já carregados: `dados` (16 mil usuários de um experimento: trat 0/1, receita_pre, receita, paginas, cliques, latencia, cancelou), `pd`, `np` e funções do math.' }),
  ],
};

const L_CAPSTONE = {
  id: 'ex-4-11', title: 'Capstone: o playbook de experimentação de uma empresa',
  steps: [
    theory('O entregável Staff/Principal', `
O projeto final é um **playbook de experimentação** para uma empresa (exemplo: um **marketplace de delivery** com app para clientes, restaurantes e entregadores). Ele responde às perguntas que um líder de experimentação precisa responder:

**1. Hierarquia de métricas**
- **OEC**: pedidos concluídos por cliente ativo em 28 dias (ligado ao OKR de crescimento com retenção)
- **guardrails de negócio**: tempo de entrega, cancelamentos, margem por pedido, avaliações dos restaurantes
- **guardrails de confiança**: SRM, taxa de bots, perda de eventos
- **métricas de diagnóstico** por área (busca, checkout, logística)

**2. Escolha do método** (a árvore de decisão):
| situação | método |
|---|---|
| mudança no app do cliente, sem interferência | **A/B** por usuário com CUPED, duração em semanas cheias |
| mudança de despacho, preço dinâmico, oferta de entregadores (interferência) | **switchback** por região e janela, ou **cluster** por cidade |
| ranking de busca e recomendação | **interleaving** para filtrar candidatos, **A/B** para confirmar |
| campanha curta, muitos criativos | **bandit** (Thompson) |
| decisão já tomada para uma região, sem randomizar | **controle sintético** ou **DiD** com placebos |
| personalizar quem recebe cupom | experimento randomizado + **uplift** (CATE) + validação da política |

**3. Fluxo de aprovação**: EDD → revisão de pares (CoE para testes de alto risco ou com preço) → revisão ética quando aplicável → ramp-up 1% → 10% → 50% com checagem de SRM e guardrails em cada fase → análise pelo scorecard → decisão documentada no repositório

**4. Regras de decisão** padronizadas (ship / iterate / kill) e política para **peeking** (só testes sequenciais podem parar cedo por sucesso)

**5. Roteiro de evolução da plataforma**: hoje (Walk) → camadas ortogonais, SRM e CUPED automáticos (Run) → scorecards completos, meta-análise com Empirical Bayes, holdouts trimestrais e bandits na infraestrutura (Fly)

**6. Cultura**: treinamento, revisão de pares, incentivos ao aprendizado (não a "vitórias"), ética e privacidade.
`),
    quiz('No marketplace, o time de logística quer testar um novo algoritmo de despacho de entregadores. Qual desenho o playbook recomenda?', ['Switchback por região e janela de tempo (ou cluster por cidade), por causa da interferência', 'A/B por cliente', 'Interleaving', 'Bandit por pedido'], 0),
    quiz('O time de busca tem 12 variações de ranking candidatas. Qual o fluxo mais eficiente?', ['Interleaving para filtrar os melhores candidatos e A/B para confirmar o vencedor', 'Um A/B/n com 13 grupos', 'Lançar o que o time preferir', 'Um bandit com 12 braços sem análise'], 0),
    quiz('A diretoria decidiu lançar o programa de fidelidade só em Porto Alegre neste trimestre. Como medir o efeito?', ['Controle sintético (ou DiD) com outras capitais como doadoras, mais testes placebo', 'A/B por usuário em Porto Alegre', 'Comparar Porto Alegre antes e depois', 'Não é possível medir'], 0),
    order('Ordene o fluxo de aprovação de um experimento de alto risco:', ['escrever o EDD', 'revisão de pares e ética', 'ramp-up a 1% com SRM e guardrails', 'expandir para 50% e rodar o tempo planejado', 'scorecard e decisão documentada']),
    order('Ordene o roteiro de evolução da plataforma:', ['SRM e A/A rotineiros com métricas padronizadas', 'camadas ortogonais e CUPED automático', 'scorecards completos com Delta Method e BH', 'meta-análise, holdouts e bandits na infraestrutura']),
  ],
};

export const EX_N4 = [
  { id: 'ex-u9', level: 4, title: 'Experimentação adaptativa', description: 'Bandits: ε-greedy, UCB, Thompson, simulação de regret e contextual bandits', lessons: [L_MAB, L_SIM_BANDIT, L_CONTEXTUAL] },
  { id: 'ex-u10', level: 4, title: 'Causal ML e personalização', description: 'CATE, meta-learners, Causal Forest, DML, curva Qini e política de segmentação ótima', lessons: [L_UPLIFT, L_POLITICA] },
  { id: 'ex-u11', level: 4, title: 'Rankings, logs e portfólio', description: 'Interleaving, avaliação off-policy, winner\'s curse e Empirical Bayes', lessons: [L_INTERLEAVING, L_META] },
  { id: 'ex-u12', level: 4, title: 'Plataforma e cultura em escala', description: 'Hashing e camadas ortogonais, governança e ética, scorecard automatizado e o playbook capstone', lessons: [L_PLATAFORMA, L_GOVERNANCA, L_SCORECARD, L_CAPSTONE] },
];
