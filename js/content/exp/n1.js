// Experimentação — Nível 1: Básico (fundamentos estatísticos e primeiros testes A/B)
import { theory, quiz, order, fill, py, exPy } from '../helpers.js';
import { D1, PURO } from './dados.js';

const r = String.raw;

const L_CAUSA = {
  id: 'ex-1-1', title: 'Método científico nos negócios: correlação, causa e randomização',
  steps: [
    theory('Por que experimentar', `
Toda empresa de produto vive de decisões do tipo **"se mudarmos X, o resultado Y melhora?"**. Olhar dados históricos responde outra pergunta: **"quem fez X teve Y melhor?"**. A diferença entre as duas é a diferença entre **correlação** e **causalidade**.

**Exemplo clássico:** usuários que usam o filtro de busca compram 3× mais. Isso significa que o filtro *causa* compras? Não necessariamente: quem usa o filtro já é um usuário mais engajado, que compraria mais de qualquer jeito. O engajamento é um **fator de confusão** (*confounder*): influencia ao mesmo tempo quem usa o filtro e quem compra.

\`\`\`
        engajamento
        ↙          ↘
  usa o filtro → compra ?
\`\`\`

**Experimento controlado** (teste A/B, *randomized controlled trial*):
1. sorteie aleatoriamente cada usuário para o **grupo controle** (A, experiência atual) ou **grupo tratamento** (B, a mudança)
2. a única diferença sistemática entre os grupos passa a ser a mudança
3. a diferença no resultado estima o **efeito causal** da mudança

A **randomização** é o que elimina os confounders: como o sorteio não depende de nada sobre o usuário, engajamento, idade, dispositivo e até fatores que você **nem mediu** ficam, em média, equilibrados entre os grupos. Nenhuma análise de dados históricos, por mais sofisticada, garante isso.

Os quatro elementos de um experimento controlado:
| elemento | no teste do botão "Comprar agora" |
|---|---|
| **unidade** | usuário |
| **tratamento** | o novo botão |
| **controle** | o botão atual |
| **resultado** (métrica) | conversão em compra |
`),
    exPy('O confounder em ação', `
Simulação: o engajamento (não observado) aumenta tanto o uso do filtro quanto a compra, e o filtro **não tem efeito nenhum**. Compare a análise observacional com um experimento em que o filtro é sorteado:
`, r`rng = np.random.default_rng(1)
n = 50000
engajado = rng.random(n) < 0.3
# observacional: os engajados usam muito mais o filtro
usa = rng.random(n) < np.where(engajado, 0.7, 0.1)
compra = rng.random(n) < np.where(engajado, 0.20, 0.03)        # o filtro não muda nada
print("observacional: compra com filtro {:.3f} × sem filtro {:.3f}".format(compra[usa].mean(), compra[~usa].mean()))
# experimento: o filtro é sorteado (moeda), independente do engajamento
sorteio = rng.random(n) < 0.5
print("experimento:   compra com filtro {:.3f} × sem filtro {:.3f}".format(compra[sorteio].mean(), compra[~sorteio].mean()))`, `
A análise observacional mostra um "efeito" enorme que **não existe**. No experimento, as taxas ficam praticamente iguais: o sorteio deixou os dois grupos com a mesma proporção de engajados.
`, PURO),
    quiz('Usuários que ativam notificações retêm 40% mais. O que dá para concluir?', ['Que existe associação; para saber se as notificações causam retenção é preciso um experimento (ou um método causal)', 'Que as notificações causam retenção', 'Que as notificações não têm efeito', 'Que a retenção causa notificações'], 0),
    quiz('O que a randomização garante que a análise de dados históricos não garante?', ['Que os grupos fiquem equilibrados em média em todos os fatores, inclusive os não medidos', 'Que o efeito seja positivo', 'Que a amostra seja grande', 'Que os dados não tenham erros'], 0),
    py('Com `rng = np.random.default_rng(3)`, simule 40.000 pessoas: `engajado = rng.random(n) < 0.4`; o uso do recurso é `usa = rng.random(n) < np.where(engajado, 0.8, 0.2)` e a compra é `compra = rng.random(n) < np.where(engajado, 0.15, 0.05)` (sem efeito real do recurso). Calcule `dif_obs`, a diferença de taxa de compra **usa − não usa**. Depois sorteie `sorteio = rng.random(n) < 0.5` e calcule `dif_exp`, a diferença **sorteado − não sorteado**.',
      r`rng = np.random.default_rng(3)
n = 40000
engajado = rng.random(n) < 0.4
usa = rng.random(n) < np.where(engajado, 0.8, 0.2)
compra = rng.random(n) < np.where(engajado, 0.15, 0.05)
dif_obs = compra[usa].mean() - compra[~usa].mean()
sorteio = rng.random(n) < 0.5
dif_exp = compra[sorteio].mean() - compra[~sorteio].mean()`,
      r`assert dif_obs > 0.04, dif_obs
assert abs(dif_exp) < 0.01, dif_exp`, PURO),
  ],
};

const L_HIPOTESE = {
  id: 'ex-1-2', title: 'Hipóteses: H₀, H₁, bicaudal × unicaudal e hipóteses testáveis',
  steps: [
    theory('A lógica do teste de hipótese', `
Um teste de hipótese funciona como um julgamento: o réu (a mudança) é **inocente até prova em contrário**.

- **Hipótese nula (H₀):** a mudança **não tem efeito**. Ex.: conversão de B = conversão de A
- **Hipótese alternativa (H₁):** **existe** efeito. Ex.: conversão de B ≠ conversão de A

Você nunca "prova" H₀; você **rejeita** H₀ (os dados seriam muito improváveis se ela fosse verdade) ou **não rejeita** (os dados são compatíveis com "sem efeito"). "Não rejeitar" **não** é o mesmo que "provar que não há efeito": talvez a amostra só seja pequena demais.

**Bicaudal × unicaudal:**
| tipo | H₁ | quando |
|---|---|---|
| **bicaudal** (*two-tailed*) | B ≠ A | **padrão da indústria**: queremos detectar tanto ganho quanto **perda** (uma mudança pode piorar a métrica) |
| **unicaudal** (*one-tailed*) | B > A | só quando uma piora é impossível ou irrelevante para a decisão, e decidido **antes** de ver os dados |

O unicaudal parece tentador (com o mesmo α, fica mais fácil "dar significativo"), mas escolhê-lo depois de olhar o sinal do efeito é uma forma de trapaça estatística. Na dúvida, bicaudal.

**Hipótese testável** (a de negócio, que vem antes da estatística), no formato completo:
> Alterando **[X]** para **[público]**, esperamos variar **[métrica primária]** em pelo menos **[MDE]**, porque **[racional]**, sem degradar **[guardrail]**.

Exemplo: *"Alterando o texto do botão de 'Adicionar' para 'Comprar agora' para todos os usuários do app, esperamos aumentar a conversão em compra em pelo menos 0,5 ponto percentual, porque o novo texto reduz uma etapa percebida do funil, sem aumentar a taxa de cancelamento de pedidos."*

Uma hipótese vaga ("o novo botão vai melhorar a experiência") não diz o que medir, quanto esperar nem o que não pode piorar. Por isso não pode ser testada.
`),
    quiz('O teste não rejeitou H₀ (p = 0,31). Qual frase está correta?', ['Os dados são compatíveis com nenhum efeito, mas isso não prova que o efeito é zero', 'Ficou provado que a mudança não tem efeito', 'A probabilidade de H₀ ser verdadeira é 31%', 'O efeito é de 31%'], 0),
    quiz('Por que o teste bicaudal é o padrão em testes A/B de produto?', ['Porque uma mudança pode piorar a métrica, e precisamos detectar perdas também', 'Porque dá p-valores menores', 'Porque exige menos amostra', 'Porque o unicaudal não existe em Python'], 0),
    order('Monte a hipótese testável no formato completo:', ['Alterando o frete grátis acima de R$ 99', 'para clientes novos,', 'esperamos aumentar a conversão em pelo menos 0,8 p.p.,', 'porque o custo do frete é o principal motivo de abandono,', 'sem reduzir a margem por pedido em mais de 2%.'], ['e vamos ver o que acontece.']),
    fill('Complete as hipóteses do teste de conversão (p = taxa de conversão):', 'H0: p_B ___ p_A\nH1: p_B ___ p_A   # bicaudal', [['=', '=='], ['≠', '!=', '<>']]),
  ],
};

const L_DISTRIB = {
  id: 'ex-1-3', title: 'Distribuições essenciais: Bernoulli, Binomial, Normal e Poisson',
  steps: [
    theory('Cada métrica tem a sua distribuição', `
Saber **que tipo de variável** é a métrica define o teste certo.

| distribuição | modela | métrica típica | média | variância |
|---|---|---|---|---|
| **Bernoulli(p)** | um único sim/não | converteu? clicou? | p | p(1 − p) |
| **Binomial(n, p)** | nº de sucessos em n tentativas | conversões entre n usuários | np | np(1 − p) |
| **Normal(μ, σ²)** | valores contínuos simétricos; **médias** de amostras grandes | média de receita, tempo médio | μ | σ² |
| **Poisson(λ)** | contagens de eventos num intervalo | pedidos por usuário, chamados por hora | λ | λ |

Pontos que caem em entrevista:
- **taxa de conversão** é a média de variáveis Bernoulli: com p = 4%, o desvio padrão por usuário é √(0,04 × 0,96) ≈ 0,196. A variância é **máxima em p = 50%**
- na **Poisson**, média = variância. Se a variância das contagens for bem maior que a média, há **superdispersão** (alguns usuários fazem muito mais pedidos), e a Poisson subestima a incerteza
- receita por usuário quase nunca é normal: tem muitos zeros e uma **cauda longa** à direita (Nível 2)

No NumPy, com \`rng = np.random.default_rng(semente)\`:
\`rng.binomial(n, p, size)\`, \`rng.normal(media, dp, size)\`, \`rng.poisson(lam, size)\`, \`rng.random(size) < p\` (Bernoulli).
`),
    exPy('As quatro distribuições lado a lado', `
Simulando e conferindo média e variância contra a teoria:
`, r`rng = np.random.default_rng(0)
ber = (rng.random(100000) < 0.04).astype(int)
bino = rng.binomial(1000, 0.04, size=100000)
pois = rng.poisson(2.5, size=100000)
print("Bernoulli  média {:.4f} (teoria 0.04)  var {:.4f} (teoria {:.4f})".format(ber.mean(), ber.var(), 0.04 * 0.96))
print("Binomial   média {:.2f} (teoria 40)    var {:.2f} (teoria 38.4)".format(bino.mean(), bino.var()))
print("Poisson    média {:.3f} (teoria 2.5)   var {:.3f} (teoria 2.5)".format(pois.mean(), pois.var()))
print("conversão do teste real:", teste.converteu.mean().round(4), "| pedidos? use Poisson | receita? cauda longa:")
print(teste.receita[teste.receita > 0].describe().round(1))`, `
A receita de quem comprou tem média bem acima da mediana: cauda longa à direita, típica de valores monetários.
`, D1),
    quiz('O número de pedidos por usuário em uma semana tem média 1,2 e variância 4,8. O que isso indica?', ['Superdispersão: a Poisson simples subestimaria a variabilidade', 'Que os dados seguem exatamente uma Poisson', 'Que a métrica é Bernoulli', 'Que a média está errada'], 0),
    py('Para a métrica `converteu` do grupo **A** do `teste`, calcule `p_a` (a taxa), `var_teorica` = p(1 − p) e `var_amostral` (variância com `ddof=0` da coluna). Elas devem bater.',
      r`a = teste.loc[teste["grupo"] == "A", "converteu"]
p_a = a.mean()
var_teorica = p_a * (1 - p_a)
var_amostral = a.var(ddof=0)`,
      r`_a = teste.converteu[teste.grupo == "A"]
assert abs(p_a - _a.mean()) < 1e-12
assert abs(var_teorica - var_amostral) < 1e-9`, D1),
  ],
};

const L_TLC = {
  id: 'ex-1-4', title: 'Lei dos Grandes Números, TLC e erro padrão',
  steps: [
    theory('Por que podemos usar a Normal mesmo com dados não normais', `
**População × amostra:** a população é *todos* os usuários que algum dia verão a mudança; o experimento observa uma **amostra**. Queremos inferir a média da população (μ) a partir da média da amostra (x̄).

**Medidas básicas:** média (soma ÷ n), mediana (valor do meio, robusta a extremos), variância s² = Σ(x − x̄)² ÷ (n − 1) e desvio padrão s = √s² (a dispersão **dos indivíduos**).

**Lei dos Grandes Números (LGN):** à medida que n cresce, a média amostral **converge** para a média da população. É por isso que mais tráfego dá estimativas mais estáveis.

**Teorema do Limite Central (TLC):** a **distribuição das médias amostrais** se aproxima de uma **Normal** quando n é grande, **qualquer que seja** a distribuição dos dados brutos (desde que a variância seja finita). Conversões (0/1), tempos assimétricos, contagens: as médias de amostras grandes são aproximadamente normais. Com caudas muito pesadas (receita com "baleias"), o n necessário pode ser bem maior (Nível 2).

**Erro padrão (EP, *standard error*):** o desvio padrão **da média amostral**, ou seja, o quanto x̄ varia de amostra para amostra:
- média: **EP = s ÷ √n**
- proporção: **EP = √(p(1 − p) ÷ n)**
- diferença de duas médias independentes: **EP = √(EP_A² + EP_B²)**

Não confunda: o **desvio padrão** descreve a dispersão dos usuários; o **erro padrão** descreve a incerteza da **estimativa**. Para reduzir o EP pela metade, é preciso **4×** mais amostra (√n).
`),
    exPy('O TLC com dados muito assimétricos', `
Os minutos de sessão têm cauda à direita. Mesmo assim, as médias de amostras de 400 usuários formam um sino quase simétrico, e o desvio padrão dessas médias bate com s ÷ √n:
`, r`rng = np.random.default_rng(2)
x = teste.minutos.to_numpy()
medias = np.array([rng.choice(x, 400).mean() for _ in range(3000)])
print("assimetria dos dados brutos: média {:.2f} × mediana {:.2f}".format(x.mean(), np.median(x)))
print("médias amostrais: média {:.3f}, dp {:.4f}".format(medias.mean(), medias.std()))
print("erro padrão teórico s/√n: {:.4f}".format(x.std(ddof=1) / sqrt(400)))
print("fração das médias a até ±1,96 EP: {:.3f}".format((abs(medias - x.mean()) < 1.96 * x.std() / 20).mean()))`, `
Cerca de 95% das médias caem a até 1,96 erro padrão da média verdadeira: exatamente o que a Normal prevê. Esse é o alicerce dos intervalos de confiança.
`, D1),
    quiz('O desvio padrão da receita por usuário é R$ 60 e cada grupo tem 3.600 usuários. Qual o erro padrão da média de um grupo?', ['R$ 1', 'R$ 60', 'R$ 0,017', 'R$ 16,67'], 0),
    quiz('Para reduzir o erro padrão da estimativa pela metade, você precisa de...', ['4 vezes mais usuários', '2 vezes mais usuários', 'metade dos usuários', 'um α maior'], 0),
    py('Calcule, para a conversão do `teste`: `ep_a` e `ep_b` (erro padrão da proporção de cada grupo) e `ep_dif`, o erro padrão da diferença B − A.',
      r`a = teste.loc[teste["grupo"] == "A", "converteu"]
b = teste.loc[teste["grupo"] == "B", "converteu"]
ep_a = sqrt(a.mean() * (1 - a.mean()) / len(a))
ep_b = sqrt(b.mean() * (1 - b.mean()) / len(b))
ep_dif = sqrt(ep_a ** 2 + ep_b ** 2)`,
      r`_a = teste.converteu[teste.grupo == "A"]; _b = teste.converteu[teste.grupo == "B"]
_ea = sqrt(_a.mean() * (1 - _a.mean()) / len(_a)); _eb = sqrt(_b.mean() * (1 - _b.mean()) / len(_b))
assert abs(ep_a - _ea) < 1e-12 and abs(ep_b - _eb) < 1e-12
assert abs(ep_dif - sqrt(_ea ** 2 + _eb ** 2)) < 1e-12`, D1),
  ],
};

const L_PVALOR = {
  id: 'ex-1-5', title: 'Rigor decisório: p-valor, α, erros tipo I e II, poder e intervalos',
  steps: [
    theory('O que o p-valor é (e o que não é)', `
**p-valor:** a probabilidade de observar uma diferença **tão grande quanto a observada, ou maior**, **supondo que H₀ seja verdadeira** (nenhum efeito real).

O p-valor **não é**:
- ❌ a probabilidade de H₀ ser verdadeira
- ❌ a probabilidade de o resultado ser "sorte"
- ❌ o tamanho ou a importância do efeito (p minúsculo pode vir de um efeito minúsculo com amostra gigante)
- ❌ 1 − p a probabilidade de B ser melhor (isso é pergunta bayesiana, Nível 3)

**Nível de significância (α):** o limite combinado **antes** do teste (padrão 5%). Rejeita-se H₀ se p < α.

| | H₀ verdadeira (sem efeito) | H₀ falsa (há efeito) |
|---|---|---|
| **rejeita H₀** | **Erro tipo I** (falso positivo), probabilidade α | acerto: **poder = 1 − β** |
| **não rejeita** | acerto (1 − α) | **Erro tipo II** (falso negativo), probabilidade β |

- **Erro tipo I:** lançar algo que não funciona (custo: engenharia e manutenção inúteis, às vezes dano)
- **Erro tipo II:** descartar algo que funcionava (custo: oportunidade perdida)
- **Poder estatístico** (padrão 80%): a probabilidade de detectar o efeito **se ele existir com o tamanho planejado**

**Intervalo de confiança (IC) de 95%:** diferença ± 1,96 × EP. Interpretação correta: se repetíssemos o experimento muitas vezes, 95% dos intervalos construídos assim conteriam o efeito verdadeiro. Na prática: é a faixa de efeitos **compatíveis** com os dados. Se o IC de B − A não contém 0, o teste bicaudal a 5% é significativo; o IC também mostra **o tamanho** do efeito, que o p-valor esconde.

**Normal padrão sem scipy:** a função de distribuição acumulada é Φ(z) = ½ (1 + erf(z ÷ √2)), com \`erf\` do módulo \`math\`. O p-valor bilateral é 2 × (1 − Φ(|z|)) = \`erfc(abs(z) / sqrt(2))\`. A biblioteca padrão também tem \`NormalDist()\` (módulo \`statistics\`): \`NormalDist().cdf(z)\` e \`NormalDist().inv_cdf(0.975)\` (= 1,96). Com scipy: \`scipy.stats.norm.cdf\` e \`norm.ppf\`.
`),
    exPy('Do z ao p-valor e ao IC', `
`, r`Z = NormalDist()
print("z crítico bilateral 5%:", round(Z.inv_cdf(0.975), 4), "| z para poder 80%:", round(Z.inv_cdf(0.80), 4))
for z in [1.0, 1.64, 1.96, 2.58, 3.29]:
    print(f"z = {z:4.2f} → p bilateral = {erfc(z / sqrt(2)):.4f}  (pela cdf: {2 * (1 - Z.cdf(z)):.4f})")
dif, ep = 0.0075, 0.0024
print("IC 95%: [{:.4f}, {:.4f}]".format(dif - 1.96 * ep, dif + 1.96 * ep))`, `
z = 1,96 dá p = 0,05; z = 2,58 dá p = 0,01. O IC [0,0028; 0,0122] não contém zero, coerente com p < 5%.
`, PURO),
    quiz('p = 0,02 em um teste A/B. Qual interpretação está correta?', ['Se não houvesse efeito, uma diferença tão grande ou maior apareceria em 2% das vezes', 'Há 2% de chance de H₀ ser verdadeira', 'Há 98% de chance de B ser melhor', 'O efeito é de 2%'], 0),
    quiz('Lançar uma mudança que na verdade não tem efeito nenhum é um...', ['Erro tipo I (falso positivo)', 'Erro tipo II (falso negativo)', 'Problema de poder', 'Acerto'], 0),
    quiz('O que é poder estatístico de 80%?', ['A probabilidade de detectar o efeito, se ele existir com o tamanho planejado', 'A probabilidade de H₁ ser verdadeira', 'A confiança do intervalo', '1 − α'], 0),
    py('Escreva `p_bilateral(z)` que devolve o p-valor bilateral de uma estatística z (use `erfc` ou `NormalDist`) e `ic95(dif, ep)` que devolve a tupla `(inferior, superior)` com 1,96.',
      r`def p_bilateral(z):
    return erfc(abs(z) / sqrt(2))

def ic95(dif, ep):
    return (dif - 1.96 * ep, dif + 1.96 * ep)`,
      r`assert abs(p_bilateral(1.959964) - 0.05) < 1e-6
assert abs(p_bilateral(-2.575829) - 0.01) < 1e-6
assert abs(p_bilateral(0) - 1) < 1e-12
lo, hi = ic95(0.01, 0.002)
assert abs(lo - 0.00608) < 1e-9 and abs(hi - 0.01392) < 1e-9`, PURO),
  ],
};

const L_AMOSTRA = {
  id: 'ex-1-6', title: 'Tamanho de amostra, MDE e duração do teste',
  steps: [
    theory('Power analysis: quanto tráfego e por quanto tempo', `
Antes de rodar, responda: **quantos usuários** são necessários para detectar o efeito que importa?

**MDE (Minimum Detectable Effect):** o **menor efeito relevante para o negócio**, aquele que paga o custo de construir e manter a mudança. Não é "o efeito que esperamos": é o limite abaixo do qual não faria diferença lançar.

Quatro ingredientes ligados entre si:
| ingrediente | se aumenta... | amostra necessária |
|---|---|---|
| variância da métrica (σ²) | mais ruído | **sobe** |
| α (rigor contra falso positivo) | α menor | **sobe** |
| poder (1 − β) | mais poder | **sobe** |
| MDE | efeito maior | **cai com o quadrado** |

**Fórmula por grupo** (dois grupos iguais, bicaudal):
\`n = (z₁₋α/₂ + z₁₋β)² × 2σ² ÷ MDE²\`

- para proporções: σ² ≈ p(1 − p) (ou a soma p₁(1 − p₁) + p₂(1 − p₂) no lugar de 2σ²)
- com α = 5% e poder 80%: (1,96 + 0,84)² ≈ **7,85**; regra de bolso **n ≈ 16σ² ÷ MDE²** por grupo (16 ≈ 2 × 7,85)
- MDE relativo × absoluto: subir 4% → 4,4% é MDE **absoluto** de 0,4 p.p. ou **relativo** de 10%. Sempre deixe claro qual

**Duração:** dias = (n por grupo × nº de grupos) ÷ (usuários elegíveis por dia). Depois **arredonde para semanas cheias**: o comportamento muda entre dias úteis e fim de semana, e um teste de 10 dias pesa duas segundas e só um domingo. Mínimo usual: **1 a 2 semanas**, mesmo com muito tráfego.

**Ferramentas:** em Python, \`statsmodels.stats.power.NormalIndPower().solve_power(effect_size=..., alpha=0.05, power=0.8)\` com \`proportion_effectsize(p1, p2)\` para proporções; ou \`TTestIndPower\` para médias. Calculadoras online (Evan Miller) fazem o mesmo. Aqui implementamos a fórmula com \`NormalDist().inv_cdf\` e \`ceil\` (arredondar para cima).
`),
    exPy('Planejando o teste do botão', `
Conversão base de 4%, queremos detectar +0,5 p.p., com 6.000 usuários elegíveis por dia:
`, r`Z = NormalDist()
za, zb = Z.inv_cdf(0.975), Z.inv_cdf(0.80)
p1, p2 = 0.040, 0.045
n = ceil((za + zb) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p2 - p1) ** 2)
dias = 2 * n / 6000
print(f"n por grupo: {n:,}  | total: {2 * n:,}")
print(f"dias: {dias:.1f} → semanas cheias: {ceil(dias / 7)} ({7 * ceil(dias / 7)} dias)")
for mde in [0.0025, 0.005, 0.01]:
    print(f"MDE {mde * 100:.2f} p.p. → n por grupo {ceil((za + zb) ** 2 * (p1 * (1 - p1) + (p1 + mde) * (1 - p1 - mde)) / mde ** 2):,}")`, `
Dobrar o MDE divide a amostra por cerca de 4. Perguntar "qual efeito vale a pena?" é a decisão de negócio mais importante do planejamento.
`, PURO),
    quiz('Você reduz o MDE de 1 p.p. para 0,5 p.p. O que acontece com a amostra necessária?', ['Fica cerca de 4 vezes maior', 'Dobra', 'Cai pela metade', 'Não muda'], 0),
    quiz('O cálculo deu 9 dias de teste. Quanto tempo rodar?', ['14 dias (duas semanas cheias), para cobrir o ciclo semanal', '9 dias exatos', '7 dias, para economizar', 'Até dar significativo'], 0),
    py('Escreva `n_por_grupo(p1, mde, alpha=0.05, poder=0.8)` (MDE absoluto, bicaudal, arredondado para cima com `ceil`) e `dias_teste(n, grupos, trafego_dia)` que devolve a duração em **dias arredondada para semanas cheias** (múltiplo de 7, no mínimo 7).',
      r`def n_por_grupo(p1, mde, alpha=0.05, poder=0.8):
    Z = NormalDist()
    za, zb = Z.inv_cdf(1 - alpha / 2), Z.inv_cdf(poder)
    p2 = p1 + mde
    return ceil((za + zb) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / mde ** 2)

def dias_teste(n, grupos, trafego_dia):
    dias = n * grupos / trafego_dia
    return max(7, 7 * ceil(dias / 7))`,
      r`assert n_por_grupo(0.04, 0.005) == 25549, n_por_grupo(0.04, 0.005)
assert n_por_grupo(0.10, 0.01, poder=0.9) > n_por_grupo(0.10, 0.01)
assert n_por_grupo(0.04, 0.01) < n_por_grupo(0.04, 0.005) / 3.5
assert dias_teste(25549, 2, 6000) == 14
assert dias_teste(1000, 2, 50000) == 7 and dias_teste(30000, 3, 6000) == 21`, PURO),
  ],
};

const L_METRICAS = {
  id: 'ex-1-7', title: 'Taxonomia de métricas: OEC, secundárias e guardrails',
  steps: [
    theory('Escolher o que medir é decidir o que otimizar', `
**Métrica primária / OEC** (*Overall Evaluation Criterion*, termo de Kohavi, Tang e Xu em *Trustworthy Online Controlled Experiments*): a métrica (ou combinação de métricas) que **decide** o teste. Boas OECs são:
- **ligadas ao valor de longo prazo** (receita, retenção), mas **sensíveis** o bastante para mexer em semanas
- **atribuíveis** ao usuário randomizado
- **difíceis de "ganhar" de forma errada** (cliques podem subir com um botão enganoso; receita por usuário com retenção protegida, não)

**Métricas secundárias** (de diagnóstico): explicam o **porquê** do resultado: etapas do funil, cliques, tempo em cada passo. Não decidem o teste.

**Guardrails** (métricas de proteção): **não podem piorar**, mesmo se a OEC subir. Dois tipos:
| tipo | exemplos |
|---|---|
| **organizacionais / de negócio** | latência da página, taxa de erro e de crash, cancelamentos, devoluções, margem, reclamações no SAC, descadastro de e-mails |
| **de confiança** (*trust-related*) | **SRM** (a divisão de tráfego saiu como planejado?), proporção de bots, eventos perdidos (Nível 2) |

Para cada guardrail, defina **antes** o limite tolerado ("latência p95 não pode subir mais de 5%") e qual teste o avalia.

**Hierarquia típica de um e-commerce:**
- OEC: receita por usuário (ou conversão) nos 14 dias
- Secundárias: adição ao carrinho, início do checkout, ticket médio
- Guardrails: latência, erros no pagamento, cancelamento em 7 dias, SRM

**Armadilha da métrica de vaidade:** número de pageviews, cliques ou tempo na página podem subir porque o usuário **se perdeu**. Uma OEC precisa medir valor entregue.
`),
    quiz('Um teste aumentou a conversão, mas a taxa de cancelamento de pedidos subiu 12%. Que papel o cancelamento cumpre aqui?', ['Guardrail: uma piora relevante pode barrar o lançamento', 'OEC', 'Métrica de vaidade', 'Métrica secundária sem importância'], 0),
    quiz('Qual destas é uma guardrail **de confiança** (trust-related)?', ['A divisão de tráfego bateu com os 50/50 planejados (SRM)', 'Receita por usuário', 'Latência da página', 'Cliques no botão'], 0),
    quiz('Por que "cliques no banner" costuma ser uma OEC ruim?', ['Pode subir sem gerar valor (curiosidade, clique por engano) e não garante receita ou retenção', 'Porque é difícil de medir', 'Porque tem variância zero', 'Porque não é uma proporção'], 0),
    order('Classifique em ordem: OEC, secundária e guardrail de um teste de checkout:', ['OEC: conversão em compra', 'secundária: início do checkout', 'guardrail: erros no pagamento'], ['OEC: pageviews']),
  ],
};

const L_TESTES = {
  id: 'ex-1-8', title: 'Testes clássicos: z de proporções e t de Welch',
  steps: [
    theory('O teste certo para cada métrica', `
**Teste z para duas proporções** (conversão, CTR, taxa de churn):
1. taxas p_A = x_A ÷ n_A e p_B = x_B ÷ n_B
2. sob H₀ as taxas são iguais: use a **taxa agrupada** p = (x_A + x_B) ÷ (n_A + n_B)
3. **z = (p_B − p_A) ÷ √(p(1 − p)(1/n_A + 1/n_B))**
4. p-valor bilateral = \`erfc(abs(z) / sqrt(2))\`
5. o IC da diferença usa o EP **não agrupado**: √(p_A(1 − p_A)/n_A + p_B(1 − p_B)/n_B)

Em bibliotecas: \`statsmodels.stats.proportion.proportions_ztest([x_b, x_a], [n_b, n_a])\`.

**Teste t de Welch** (médias contínuas: receita por usuário, tempo de sessão):
- **t = (x̄_B − x̄_A) ÷ √(s_A²/n_A + s_B²/n_B)**
- não supõe variâncias iguais (o t de Student "clássico" supõe; o Welch é o padrão seguro)
- graus de liberdade pela fórmula de Welch-Satterthwaite; com milhares de usuários por grupo, a distribuição t é praticamente a Normal, então o p-valor sai de \`erfc(abs(t) / sqrt(2))\`
- em bibliotecas: \`scipy.stats.ttest_ind(b, a, equal_var=False)\`

**SQL + planilha** também funciona: agregue por grupo (\`COUNT(*)\`, \`SUM(converteu)\`, \`AVG(receita)\`, variância) e aplique as fórmulas acima. O teste precisa só de **n, média e variância por grupo**, não dos dados linha a linha.

**Diferença relativa (lift):** (p_B − p_A) ÷ p_A. É o número que o negócio entende ("+18%"), mas o teste e o IC são calculados na diferença absoluta.
`),
    exPy('O teste do botão, de ponta a ponta', `
`, r`g = teste.groupby("grupo").agg(n=("converteu", "size"), x=("converteu", "sum"),
                               media_min=("minutos", "mean"), var_min=("minutos", "var"))
print(g)
nA, nB, xA, xB = g.loc["A", "n"], g.loc["B", "n"], g.loc["A", "x"], g.loc["B", "x"]
pA, pB = xA / nA, xB / nB
p = (xA + xB) / (nA + nB)
z = (pB - pA) / sqrt(p * (1 - p) * (1 / nA + 1 / nB))
print(f"conversão A {pA:.4f}  B {pB:.4f}  lift {(pB - pA) / pA:+.1%}  z = {z:.2f}  p = {erfc(abs(z) / sqrt(2)):.4f}")
t = (g.loc["B", "media_min"] - g.loc["A", "media_min"]) / sqrt(g.loc["A", "var_min"] / nA + g.loc["B", "var_min"] / nB)
print(f"minutos: t de Welch = {t:.2f}  p = {erfc(abs(t) / sqrt(2)):.2e}")`, `
A conversão subiu cerca de 0,75 ponto (lift ≈ +18%) com p ≈ 0,002, e o tempo de sessão também subiu. Repare que só precisamos dos agregados por grupo.
`, D1),
    quiz('Para comparar a receita média por usuário entre A e B, o teste mais adequado entre estes é...', ['t de Welch', 'z de proporções', 'qui-quadrado de aderência', 'nenhum teste é necessário'], 0),
    quiz('Por que o z de proporções usa a taxa **agrupada** no denominador?', ['Porque o teste é feito supondo H₀ verdadeira, em que as duas taxas são iguais', 'Porque é mais rápido', 'Para o IC ficar menor', 'Porque as amostras têm tamanhos diferentes'], 0),
    py('Escreva `z_proporcoes(x_a, n_a, x_b, n_b)` que devolve a tupla `(z, p_valor)` (bilateral, taxa agrupada) e `welch(a, b)` que recebe dois arrays e devolve `(t, p_valor)` com a aproximação normal. Aplique a `teste`: `z_conv, p_conv` para conversão e `t_rec, p_rec` para receita.',
      r`def z_proporcoes(x_a, n_a, x_b, n_b):
    p = (x_a + x_b) / (n_a + n_b)
    z = (x_b / n_b - x_a / n_a) / sqrt(p * (1 - p) * (1 / n_a + 1 / n_b))
    return z, erfc(abs(z) / sqrt(2))

def welch(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    t = (b.mean() - a.mean()) / sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
    return t, erfc(abs(t) / sqrt(2))

A = teste[teste["grupo"] == "A"]
B = teste[teste["grupo"] == "B"]
z_conv, p_conv = z_proporcoes(A.converteu.sum(), len(A), B.converteu.sum(), len(B))
t_rec, p_rec = welch(A.receita, B.receita)`,
      r`_z, _p = z_proporcoes(40, 1000, 60, 1000)
assert abs(_z - 2.0520) < 1e-3 and abs(_p - 0.0402) < 1e-3
_t, _pt = welch([1, 2, 3, 4], [2, 3, 4, 5, 6])
assert abs(_t - 1.5667) < 1e-3
assert 3.0 < z_conv < 3.3 and p_conv < 0.005
assert abs(t_rec) < 1.5 and p_rec > 0.1`, D1),
  ],
};

const L_AA = {
  id: 'ex-1-9', title: 'Teste A/A: simulando 1.000 experimentos sem efeito',
  steps: [
    theory('Sob H₀, o p-valor é uniforme', `
Um **teste A/A** divide os usuários em dois grupos que recebem **a mesma experiência**. Não há efeito real, então qualquer "diferença significativa" é um **falso positivo**.

Por que rodar (ou simular) testes A/A:
- **validar a plataforma**: se mais de ~5% dos A/A dão p < 0,05, há algo errado (randomização viciada, variância calculada errado, unidade de análise errada)
- **calibrar a intuição**: ver com os próprios olhos que, com α = 5%, **1 em cada 20 testes sem efeito "dá significativo"**
- **estimar a variância real** das métricas para o cálculo de amostra

**Resultado teórico importante:** se H₀ é verdadeira e o teste está correto, o **p-valor segue uma distribuição Uniforme(0, 1)**. Cada faixa de 0,05 recebe 5% dos testes: p < 0,05 em 5%, p entre 0,50 e 0,55 em 5%, e assim por diante. Uma distribuição de p-valores dos A/A **amontoada perto de zero** denuncia que o teste está subestimando a variância.

**Simulação vetorizada com NumPy:** em vez de um laço com 1.000 testes, gere uma matriz \`rng.binomial(n, p, size=1000)\` com as conversões de cada grupo em cada teste e aplique a fórmula do z a todos de uma vez (operações elemento a elemento em arrays). Para conferir a uniformidade, conte p-valores por faixa com \`np.histogram(p, bins=10, range=(0, 1))\`.
`),
    exPy('1.000 testes A/A', `
`, r`rng = np.random.default_rng(10)
n, p0, m = 5000, 0.04, 1000
xa = rng.binomial(n, p0, size=m)
xb = rng.binomial(n, p0, size=m)
pa, pb = xa / n, xb / n
pp = (xa + xb) / (2 * n)
z = (pb - pa) / np.sqrt(pp * (1 - pp) * (2 / n))
pv = np.array([erfc(abs(v) / sqrt(2)) for v in z])
print("falsos positivos (p < 0,05):", (pv < 0.05).mean())
contagem, _ = np.histogram(pv, bins=10, range=(0, 1))
print("p-valores por faixa de 0,1:", contagem)`, `
Cerca de 5% dos testes dão "significativo" sem efeito nenhum, e as dez faixas recebem quantidades parecidas (≈ 100 cada): a uniformidade do p-valor sob H₀.
`, PURO),
    quiz('Sua empresa rodou 200 testes A/A e 31 deram p < 0,05. O que isso sugere?', ['Algo está errado na plataforma ou na análise (esperado ≈ 10 em 200)', 'Que a plataforma está ótima', 'Que os grupos A são melhores', 'Que α deveria ser 15%'], 0),
    quiz('Sob H₀ verdadeira e com o teste correto, qual a distribuição do p-valor?', ['Uniforme entre 0 e 1', 'Normal centrada em 0,05', 'Concentrada perto de 0', 'Concentrada perto de 1'], 0),
    py('Com `rng = np.random.default_rng(4)`, simule `m = 2000` testes A/A de **receita** com 800 usuários por grupo: `a = rng.exponential(50, size=(m, 800))` e `b` igual. Calcule para cada teste o t de Welch (vetorizado: médias e variâncias com `axis=1`, `ddof=1`), os p-valores em `pv` (array) e `taxa_fp`, a fração com p < 0,05.',
      r`rng = np.random.default_rng(4)
m = 2000
a = rng.exponential(50, size=(m, 800))
b = rng.exponential(50, size=(m, 800))
t = (b.mean(axis=1) - a.mean(axis=1)) / np.sqrt(a.var(axis=1, ddof=1) / 800 + b.var(axis=1, ddof=1) / 800)
pv = np.array([erfc(abs(v) / sqrt(2)) for v in t])
taxa_fp = (pv < 0.05).mean()`,
      r`assert len(pv) == 2000 and pv.min() >= 0 and pv.max() <= 1
assert 0.035 < taxa_fp < 0.065, taxa_fp
_c, _ = np.histogram(pv, bins=5, range=(0, 1))
assert _c.min() > 330, _c`, PURO),
  ],
};

const L_PROJETO1 = {
  id: 'ex-1-10', title: 'Projeto: o primeiro teste A/B planejado, calculado e interpretado',
  steps: [
    theory('Significância estatística × relevância prática', `
Dois resultados podem ter o **mesmo p-valor** e decisões opostas:

| teste | efeito | IC 95% | p | leitura |
|---|---|---|---|---|
| novo algoritmo de busca | +0,05 p.p. | [+0,02; +0,08] | 0,001 | **estatisticamente** significativo, mas o ganho mal paga a manutenção do novo sistema |
| novo checkout | +1,2 p.p. | [+0,4; +2,0] | 0,003 | significativo **e** relevante: mesmo o pior caso do IC supera o MDE de 0,3 p.p. |
| frete grátis | +0,9 p.p. | [−0,2; +2,0] | 0,11 | não significativo, mas o IC inclui ganhos grandes: **amostra insuficiente**, não "não funciona" |

**Regra prática** com o IC e o MDE:
- IC inteiro **acima do MDE** → ganho relevante comprovado
- IC acima de zero, mas incluindo valores abaixo do MDE → ganho real, talvez pequeno; pese o custo
- IC cruzando zero e incluindo o MDE → **inconclusivo**
- IC inteiro **abaixo do MDE** (perto de zero) → efeito, se existir, é pequeno demais para importar

**O entregável deste nível**, para o teste do botão "Comprar agora" (\`teste\`):
1. hipótese testável e métricas (OEC: conversão; guardrail: minutos de sessão não podem cair)
2. o planejamento (amostra para MDE de 0,5 p.p. a partir de 4%)
3. o teste z com IC, o lift e o p-valor
4. a decisão em linguagem de negócio
`),
    py('**1–2. Planejamento e checagem.** Calcule `n_necessario` (por grupo, MDE de 0,5 p.p. sobre 4%, α 5%, poder 80%, com `NormalDist` e `ceil`) e `amostra_ok`, se o **menor** grupo do `teste` tem pelo menos 50% de `n_necessario` (o teste rodou com tráfego reduzido; registre a limitação).',
      r`Z = NormalDist()
za, zb = Z.inv_cdf(0.975), Z.inv_cdf(0.80)
n_necessario = ceil((za + zb) ** 2 * (0.04 * 0.96 + 0.045 * 0.955) / 0.005 ** 2)
amostra_ok = teste["grupo"].value_counts().min() >= 0.5 * n_necessario`,
      r`assert n_necessario == 25549
assert amostra_ok == (teste.grupo.value_counts().min() >= 0.5 * 25549)`, D1),
    py('**3. Resultado.** Calcule `dif` (p_B − p_A da conversão), `lift` (dif ÷ p_A), o IC 95% não agrupado em `ic` (tupla), o `p_valor` bilateral do z agrupado e `supera_mde`, se o limite **inferior** do IC é maior que 0,005.',
      r`A = teste.loc[teste["grupo"] == "A", "converteu"]
B = teste.loc[teste["grupo"] == "B", "converteu"]
pA, pB = A.mean(), B.mean()
dif = pB - pA
lift = dif / pA
ep = sqrt(pA * (1 - pA) / len(A) + pB * (1 - pB) / len(B))
ic = (dif - 1.96 * ep, dif + 1.96 * ep)
pp = (A.sum() + B.sum()) / (len(A) + len(B))
z = dif / sqrt(pp * (1 - pp) * (1 / len(A) + 1 / len(B)))
p_valor = erfc(abs(z) / sqrt(2))
supera_mde = ic[0] > 0.005`,
      r`_A = teste.converteu[teste.grupo == "A"]; _B = teste.converteu[teste.grupo == "B"]
_d = _B.mean() - _A.mean(); _e = sqrt(_A.mean() * (1 - _A.mean()) / len(_A) + _B.mean() * (1 - _B.mean()) / len(_B))
assert abs(dif - _d) < 1e-12 and abs(lift - _d / _A.mean()) < 1e-12
assert abs(ic[0] - (_d - 1.96 * _e)) < 1e-12 and abs(ic[1] - (_d + 1.96 * _e)) < 1e-12
assert 0.001 < p_valor < 0.003 and supera_mde == False`, D1),
    quiz('No teste do botão: +0,75 p.p. de conversão, IC 95% ≈ [+0,28; +1,22] p.p., p ≈ 0,002, MDE de 0,5 p.p., e o tempo de sessão subiu. Qual o parecer mais honesto?', ['Lançar: o ganho é real e a estimativa central supera o MDE, embora o pior caso do IC fique abaixo dele; a guardrail não piorou', 'Não lançar: o IC inclui valores abaixo do MDE', 'Inconclusivo: p > 0,001', 'Lançar porque 1 − p = 99,8% de chance de B ser melhor'], 0),
    order('Ordene as etapas do primeiro teste A/B:', ['escrever a hipótese testável com OEC e guardrails', 'definir MDE, α e poder e calcular a amostra', 'rodar por semanas cheias sem mudar o plano', 'calcular efeito, IC e p-valor', 'decidir comparando o IC com o MDE e as guardrails']),
  ],
};

export const EX_N1 = [
  { id: 'ex-u1', level: 1, title: 'Fundamentos: causa, hipóteses e distribuições', description: 'Correlação × causalidade, randomização, H₀ e H₁, distribuições das métricas, TLC e erro padrão', lessons: [L_CAUSA, L_HIPOTESE, L_DISTRIB, L_TLC] },
  { id: 'ex-u2', level: 1, title: 'Primeiros testes A/B', description: 'p-valor, erros e poder, tamanho de amostra, OEC e guardrails, z e Welch, A/A e o primeiro teste completo', lessons: [L_PVALOR, L_AMOSTRA, L_METRICAS, L_TESTES, L_AA, L_PROJETO1] },
];
