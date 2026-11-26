// Experimentação — Nível 2: Intermediário (design robusto, vieses e rigor estatístico)
import { theory, quiz, order, fill, py, exPy, sql, exSql, debugSql } from '../helpers.js';
import { D2, PURO } from './dados.js';

const r = String.raw;

const L_UNIDADE = {
  id: 'ex-2-1', title: 'Unidade de randomização × unidade de análise',
  steps: [
    theory('Quem é sorteado e quem é contado', `
**Unidade de randomização:** o que é sorteado para A ou B. As opções mais comuns:
| unidade | vantagem | risco |
|---|---|---|
| **usuário** (login) | experiência consistente; mede efeitos de longo prazo | precisa de login ou identificação estável |
| **conta / empresa** (B2B) | todos da empresa veem o mesmo | poucas unidades: pouca amostra |
| **dispositivo / cookie** | funciona sem login | a mesma pessoa em dois aparelhos pode cair nos dois grupos |
| **sessão / pageview** | muita amostra | o mesmo usuário vê A e B: experiência inconsistente, efeitos contaminados |

**Unidade de análise:** sobre o que a métrica é calculada (por usuário, por sessão, por pedido).

**A regra de ouro:** os testes clássicos supõem observações **independentes e identicamente distribuídas (i.i.d.)**. Se você randomiza por **usuário** mas analisa por **sessão** (ou por pageview, ou por pedido), as várias sessões do mesmo usuário são **correlacionadas**: um usuário muito engajado clica em todas. Tratar 96 mil sessões como 96 mil observações independentes **subestima a variância**, o IC fica estreito demais, e aparecem **falsos positivos em massa**.

Soluções:
1. **analisar na unidade da randomização**: agregue por usuário (\`groupby("usuario")\`) e compare médias por usuário
2. quando a métrica é uma **razão** (cliques ÷ sessões somados no grupo), use o **Delta Method** ou o **bootstrap por usuário** (Nível 3), que respeitam a correlação dentro do usuário
3. erros padrão **robustos a cluster** (*cluster-robust*) em regressão

Um sinal clássico do problema: testes A/A que dão p < 0,05 bem mais que 5% das vezes.
`),
    exPy('Sessões não são independentes', `
Cada usuário de \`sessoes\` tem várias sessões, e a propensão a clicar é do usuário. Compare o erro padrão ingênuo (sessões como i.i.d.) com o erro padrão calculado na unidade certa (média por usuário):
`, r`por_sessao = sessoes.groupby("variante")["clicou"].agg(["mean", "var", "size"])
ep_ing = sqrt((por_sessao["var"] / por_sessao["size"]).sum())
taxa_usuario = sessoes.groupby(["variante", "usuario"])["clicou"].mean()
por_usuario = taxa_usuario.groupby("variante").agg(["mean", "var", "size"])
ep_usu = sqrt((por_usuario["var"] / por_usuario["size"]).sum())
print(por_sessao.round(4)); print(por_usuario.round(4))
print(f"EP ingênuo (sessões): {ep_ing:.5f} | EP por usuário: {ep_usu:.5f} | razão: {ep_usu / ep_ing:.2f}×")`, `
O erro padrão correto é bem maior que o ingênuo: as sessões do mesmo usuário carregam quase a mesma informação. Ignorar isso é como fingir que a amostra é maior do que é.
`, D2),
    quiz('O teste foi randomizado por usuário e a análise tratou cada pageview como independente. Qual a consequência típica?', ['Variância subestimada, IC estreito demais e excesso de falsos positivos', 'Variância superestimada e perda de poder', 'Nenhuma, se a amostra for grande', 'O efeito muda de sinal'], 0),
    quiz('Em um SaaS B2B, uma nova tela de faturamento muda o fluxo da empresa toda. Qual unidade de randomização faz mais sentido?', ['A conta (empresa)', 'A sessão', 'O pageview', 'O clique'], 0),
    py('Calcule a **taxa de clique por usuário** (média de `clicou` por usuário em `sessoes`) e, com ela, `dif` (tratamento − controle das médias por usuário) e `ep` (erro padrão da diferença na unidade usuário). Depois calcule `ep_ingenuo` tratando as sessões como independentes e guarde `subestimacao = ep / ep_ingenuo`.',
      r`tu = sessoes.groupby(["variante", "usuario"])["clicou"].mean()
c, t = tu.loc["controle"], tu.loc["tratamento"]
dif = t.mean() - c.mean()
ep = sqrt(c.var() / len(c) + t.var() / len(t))
sc = sessoes.loc[sessoes["variante"] == "controle", "clicou"]
st = sessoes.loc[sessoes["variante"] == "tratamento", "clicou"]
ep_ingenuo = sqrt(sc.var() / len(sc) + st.var() / len(st))
subestimacao = ep / ep_ingenuo`,
      r`_tu = sessoes.groupby(["variante", "usuario"]).clicou.mean(); _c, _t = _tu.loc["controle"], _tu.loc["tratamento"]
assert abs(dif - (_t.mean() - _c.mean())) < 1e-12
assert abs(ep - sqrt(_c.var() / len(_c) + _t.var() / len(_t))) < 1e-12
assert subestimacao > 1.2, subestimacao`, D2),
  ],
};

const L_SRM = {
  id: 'ex-2-2', title: 'SRM: Sample Ratio Mismatch, o alarme de integridade',
  steps: [
    theory('Quando a divisão de tráfego não bate', `
**SRM** (*Sample Ratio Mismatch*) acontece quando a proporção de usuários observada nos grupos **difere da planejada** (ex.: 50/50) mais do que o acaso explicaria. É a guardrail de confiança mais importante: segundo Fabijan e coautores (KDD 2019, com dados de Microsoft, LinkedIn, Booking.com e outras), cerca de **6 a 10%** dos experimentos dessas empresas apresentavam SRM.

**Causas típicas** (pela etapa em que surgem):
| etapa | exemplos |
|---|---|
| **atribuição** | bug no *bucketing*, IDs de usuário inválidos, efeito residual de um experimento anterior |
| **execução** | **redirecionamento** só na variante (página B carrega mais devagar e usuários desistem antes de serem contados), variante que quebra em um navegador |
| **telemetria** | a variante dispara (ou perde) eventos de log; crash do app antes de enviar o evento |
| **processamento** | filtro de **bots** que remove mais de um grupo; **viés de gatilho** (*triggering*) definido por um evento que o próprio tratamento altera |

**Por que invalidar:** se B perdeu justamente os usuários que desistiriam, os grupos **não são mais comparáveis**; a randomização foi quebrada. O resultado pode parecer um ganho que não existe, ou o contrário. **Não analise as métricas de um teste com SRM**: descubra a causa primeiro.

**Detecção: qui-quadrado de aderência** (*goodness of fit*):
\`χ² = Σ (observado − esperado)² ÷ esperado\`, com k − 1 graus de liberdade (k = nº de grupos).
- para **2 grupos** (1 grau de liberdade): p = \`erfc(sqrt(chi2 / 2))\`
- para **3 grupos** (2 graus de liberdade): p = \`exp(-chi2 / 2)\`
- em geral: \`scipy.stats.chisquare(observados, esperados)\`

**Limite usual: p < 0,001** (ou 0,0005). Ele é rigoroso de propósito: o teste de SRM roda em todo experimento, todo dia, e um alarme falso frequente faria o time ignorar o alerta. Olhe a **razão** sozinha nunca basta: 50,5% × 49,5% é normal com 2 mil usuários e um alarme vermelho com 2 milhões.
`),
    exPy('Auditando a divisão do teste do carrinho', `
`, r`obs = usuarios["variante"].value_counts().sort_index()
esp = np.full(2, obs.sum() / 2)
chi2 = ((obs.to_numpy() - esp) ** 2 / esp).sum()
print(obs.to_dict(), f"razão = {obs['tratamento'] / obs.sum():.4f}")
print(f"χ² = {chi2:.2f}, p = {erfc(sqrt(chi2 / 2)):.4f}")
# o mesmo desvio relativo com 100 vezes mais usuários:
grande = obs.to_numpy() * 100
chi2g = ((grande - grande.sum() / 2) ** 2 / (grande.sum() / 2)).sum()
print(f"com 100× usuários e a mesma razão: χ² = {chi2g:.0f}, p = {erfc(sqrt(chi2g / 2)):.1e}")`, `
Com 24 mil usuários, 49,3% × 50,7% dá p ≈ 0,04: acima do limite de 0,001, **não é SRM**. A mesma razão com 2,4 milhões de usuários seria um SRM gritante.
`, D2),
    quiz('O teste A/B/C foi planejado 1/3 para cada grupo e o qui-quadrado deu p = 0,0002. O que fazer?', ['Pausar a análise e investigar a causa do SRM antes de olhar qualquer métrica de negócio', 'Seguir com a análise, já que o efeito é grande', 'Remover usuários do maior grupo até empatar', 'Aumentar o α para 10%'], 0),
    quiz('A variante B redireciona o usuário para uma nova URL, e a contagem de usuários de B ficou 3% menor. Qual a causa mais provável?', ['Usuários desistem durante o redirecionamento antes de serem registrados (SRM de execução)', 'Acaso puro', 'A variante B é pior', 'O teste é unicaudal'], 0),
    py('Escreva `srm(observados, proporcoes)` que devolve `(chi2, p_valor)` para **2 ou 3 grupos** (1 grau de liberdade: `erfc(sqrt(chi2/2))`; 2 graus: `exp(-chi2/2)`). Aplique a `usuarios` (50/50) e guarde `chi2_srm`, `p_srm` e `alarme` (p < 0,001).',
      r`def srm(observados, proporcoes):
    obs = np.asarray(observados, float)
    esp = obs.sum() * np.asarray(proporcoes, float)
    chi2 = ((obs - esp) ** 2 / esp).sum()
    p = erfc(sqrt(chi2 / 2)) if len(obs) == 2 else exp(-chi2 / 2)
    return chi2, p

cont = usuarios["variante"].value_counts().sort_index()
chi2_srm, p_srm = srm(cont.to_numpy(), [0.5, 0.5])
alarme = p_srm < 0.001`,
      r`_c, _p = srm([5000, 5000], [0.5, 0.5]); assert _c == 0 and abs(_p - 1) < 1e-12
_c, _p = srm([5200, 4800], [0.5, 0.5]); assert abs(_c - 16) < 1e-9 and abs(_p - erfc(sqrt(8))) < 1e-12
_c, _p = srm([1000, 1000, 1150], [1/3, 1/3, 1/3]); assert abs(_p - exp(-_c / 2)) < 1e-12 and _p < 0.01
assert 0.02 < p_srm < 0.06 and alarme == False`, D2),
  ],
};

const L_PEEKING = {
  id: 'ex-2-3', title: 'Peeking: o perigo de espiar e parar cedo',
  steps: [
    theory('Cada espiada é mais uma chance de falso positivo', `
O p-valor de 5% vale para **um único teste no tamanho de amostra planejado**. Se você calcula o p-valor **todo dia** e para o teste no primeiro dia em que p < 0,05, você está fazendo **vários testes** e escolhendo o melhor momento.

O p-valor oscila ao longo do experimento, como um passeio aleatório. Sob H₀ (sem efeito), a chance de ele **cruzar 0,05 em algum momento** é muito maior que 5%:
| nº de espiadas | taxa real de falso positivo (aprox.) |
|---|---|
| 1 (só no fim) | 5% |
| 5 | ~14% |
| 10 | ~19% |
| 20 | ~25% |
| contínuo (a cada usuário) | → 100% com tempo infinito |

**O que fazer:**
1. **fixar o tamanho da amostra (ou a duração) antes** e decidir só no fim. Painéis diários servem para monitorar **bugs e guardrails**, não para decidir
2. se precisar decidir antes, usar métodos feitos para isso: **testes sequenciais** (fronteiras de Pocock ou O'Brien-Fleming, *alpha spending*) ou **p-valores sempre válidos** (mSPRT, usado pela Optimizely). Nível 3
3. parar **cedo por dano** (guardrail muito pior, bug) é legítimo; parar cedo por "já deu significativo" não é

**Simulando o efeito:** acumule as conversões dia a dia com \`np.cumsum(..., axis=1)\` e calcule o z em cada dia; um teste "para" se qualquer dia tiver |z| > 1,96. Para saber se cada linha teve algum dia acima do limite, use \`(abs(z) > 1.96).any(axis=1)\`.
`),
    exPy('Simulando 2.000 testes A/A espiados todo dia', `
`, r`rng = np.random.default_rng(8)
m, dias, por_dia, p0 = 2000, 20, 300, 0.10
xa = np.cumsum(rng.binomial(por_dia, p0, size=(m, dias)), axis=1)
xb = np.cumsum(rng.binomial(por_dia, p0, size=(m, dias)), axis=1)
n = por_dia * np.arange(1, dias + 1)
pp = (xa + xb) / (2 * n)
z = (xb / n - xa / n) / np.sqrt(pp * (1 - pp) * 2 / n)
print("falso positivo olhando só no fim:", (abs(z[:, -1]) > 1.96).mean())
for k in [5, 10, 20]:
    dias_vistos = np.linspace(0, dias - 1, k).astype(int)
    print(f"espiando {k:>2} vezes e parando no 1º p<0,05:", (abs(z[:, dias_vistos]) > 1.96).any(axis=1).mean())`, `
Espiando 20 vezes, cerca de um em cada quatro testes **sem efeito nenhum** seria declarado vencedor.
`, PURO),
    quiz('O PM olha o painel todo dia e quer encerrar o teste no 4º dia porque "já deu p = 0,03". O que responder?', ['Que decidir no primeiro p < 0,05 infla muito o falso positivo; o teste deve ir até o tamanho planejado (ou usar um método sequencial)', 'Que pode encerrar, p < 0,05 é p < 0,05', 'Que basta trocar para α = 1%', 'Que o teste deve ser reiniciado'], 0),
    quiz('Qual motivo é legítimo para parar um teste antes do planejado?', ['A variante está causando erros de pagamento (dano a uma guardrail)', 'O p-valor ficou abaixo de 0,05 no 3º dia', 'O resultado está do jeito que o time esperava', 'O p-valor está alto e o time desanimou'], 0),
    py('Com `rng = np.random.default_rng(12)`, simule `m = 3000` testes A/A de **10 dias** com 500 usuários por grupo por dia e conversão 8% (como no exemplo: `rng.binomial` + `np.cumsum(axis=1)`). Calcule `fp_fim` (fração com |z| > 1,96 **no último dia**) e `fp_espiando` (fração com |z| > 1,96 **em algum dia**).',
      r`rng = np.random.default_rng(12)
m, dias, por_dia, p0 = 3000, 10, 500, 0.08
xa = np.cumsum(rng.binomial(por_dia, p0, size=(m, dias)), axis=1)
xb = np.cumsum(rng.binomial(por_dia, p0, size=(m, dias)), axis=1)
n = por_dia * np.arange(1, dias + 1)
pp = (xa + xb) / (2 * n)
z = (xb / n - xa / n) / np.sqrt(pp * (1 - pp) * 2 / n)
fp_fim = (abs(z[:, -1]) > 1.96).mean()
fp_espiando = (abs(z) > 1.96).any(axis=1).mean()`,
      r`assert 0.035 < fp_fim < 0.065, fp_fim
assert 0.15 < fp_espiando < 0.24, fp_espiando`, PURO),
  ],
};

const L_MULTIPLAS = {
  id: 'ex-2-4', title: 'Múltiplas comparações: Bonferroni, Holm e Benjamini-Hochberg',
  steps: [
    theory('Quanto mais você procura, mais "acha"', `
Com α = 5% por teste, a chance de **pelo menos um** falso positivo em m testes independentes sem efeito é **1 − 0,95ᵐ**: 23% com 5 testes, 40% com 10, 64% com 20.

Fontes de multiplicidade num experimento:
- **várias variantes** (A/B/C/D: cada uma contra o controle)
- **várias métricas** (20 métricas no painel: alguma vai "dar significativo")
- **vários segmentos** cortados depois do teste ("funcionou para Android, iniciantes, de São Paulo, às terças...")

**Duas famílias de correção:**
| | controla | métodos | quando |
|---|---|---|---|
| **FWER** (*family-wise error rate*) | a chance de **algum** falso positivo | **Bonferroni**: rejeite se p < α ÷ m. **Holm-Bonferroni**: ordene os p-valores e compare o k-ésimo menor (k = 1, 2, ...) com α ÷ (m − k + 1), parando no primeiro que falhar | poucas comparações em que um único erro é caro (variantes, métrica principal) |
| **FDR** (*false discovery rate*) | a **proporção esperada** de falsos positivos entre as descobertas | **Benjamini-Hochberg (BH)** | muitas métricas ou segmentos exploratórios |

**Benjamini-Hochberg** (nível q, ex.: 10%):
1. ordene os m p-valores: p₍₁₎ ≤ p₍₂₎ ≤ ... ≤ p₍ₘ₎
2. encontre o **maior** k tal que **p₍ₖ₎ ≤ (k ÷ m) × q**
3. rejeite as hipóteses com os k menores p-valores (inclusive as que, sozinhas, ficavam acima da sua linha)

Em Python: \`statsmodels.stats.multitest.multipletests(pvals, alpha, method="bonferroni" | "holm" | "fdr_bh")\`. A implementação manual usa \`np.argsort(p)\` (as posições que ordenam o array) para voltar à ordem original.

**A melhor defesa** é o **pré-registro**: uma única OEC decide; métricas secundárias e segmentos são exploratórios e, se usados para decidir, corrigidos.
`),
    exPy('Três métodos nos mesmos 8 p-valores', `
`, r`p = np.array([0.001, 0.008, 0.012, 0.030, 0.041, 0.20, 0.45, 0.80])
m, alfa = len(p), 0.05
print("sem correção:", (p < alfa).sum(), "descobertas")
print("Bonferroni:  ", (p < alfa / m).sum())
ordem = np.argsort(p)
holm = 0
for k, i in enumerate(ordem):
    if p[i] < alfa / (m - k): holm += 1
    else: break
print("Holm:        ", holm)
limites = np.arange(1, m + 1) / m * alfa
ok = p[ordem] <= limites
k_max = np.nonzero(ok)[0].max() + 1 if ok.any() else 0
print("BH (q=5%):   ", k_max, "| linhas BH:", limites.round(4))`, `
Bonferroni é o mais conservador; o BH aceita mais descobertas porque controla a **proporção** de erros, não a chance de um único erro.
`, PURO),
    quiz('O painel do experimento tem 20 métricas e 1 delas deu p = 0,03. Sem nenhuma outra informação, qual a leitura correta?', ['Com 20 métricas, um p < 0,05 isolado é esperado por acaso; precisa de correção ou de confirmação', 'A variante melhorou aquela métrica com 97% de certeza', 'O teste todo é significativo', 'Basta relatar a métrica significativa'], 0),
    quiz('Para 30 métricas secundárias exploratórias, qual correção costuma ser mais adequada?', ['Benjamini-Hochberg (controle de FDR)', 'Bonferroni com α = 0,05 / 30', 'Nenhuma', 'Aumentar α para 30%'], 0),
    py('Escreva `benjamini_hochberg(pvals, q=0.05)` que devolve um array de booleanos **na ordem original** indicando as hipóteses rejeitadas, e `bonferroni(pvals, alpha=0.05)`.',
      r`def benjamini_hochberg(pvals, q=0.05):
    p = np.asarray(pvals, float)
    m = len(p)
    ordem = np.argsort(p)
    ok = p[ordem] <= np.arange(1, m + 1) / m * q
    rejeita = np.zeros(m, dtype=bool)
    if ok.any():
        k = np.nonzero(ok)[0].max()
        rejeita[ordem[: k + 1]] = True
    return rejeita

def bonferroni(pvals, alpha=0.05):
    p = np.asarray(pvals, float)
    return p < alpha / len(p)`,
      r`_p = [0.001, 0.008, 0.012, 0.030, 0.041, 0.20, 0.45, 0.80]
assert list(benjamini_hochberg(_p)) == [True, True, True, False, False, False, False, False]
assert list(benjamini_hochberg(_p, q=0.10)) == [True, True, True, True, True, False, False, False]
assert list(benjamini_hochberg([0.04, 0.01, 0.03])) == [True, True, True]
assert list(benjamini_hochberg([0.5, 0.6])) == [False, False]
assert list(bonferroni(_p)) == [True, False, False, False, False, False, False, False]`, PURO),
  ],
};

const L_CAUDAS = {
  id: 'ex-2-5', title: 'Dados assimétricos e outliers: winsorization, log, Mann-Whitney e permutação',
  steps: [
    theory('Quando a média é dominada por poucas "baleias"', `
Receita por usuário em e-commerce, jogos e apps costuma ter **muitos zeros** (quem não comprou) e uma **cauda longa**: poucos usuários ("baleias") gastam 50× a média. Consequências:
- a **variância explode** e o teste t perde poder: um único pedido de R$ 24 mil pode decidir o teste
- o TLC demora a "funcionar": a média amostral fica assimétrica com milhares de usuários

**Ferramentas:**
| técnica | o que faz | cuidado |
|---|---|---|
| **winsorization / capping** | substitui valores acima do percentil 99 (ou 99,9) **pelo próprio percentil**: \`np.clip(x, None, limite)\` | o limite deve ser calculado nos **dois grupos juntos** (ou pré-definido), nunca por grupo; muda levemente a métrica (é "receita com teto") |
| **transformação log** | compara \`np.log1p(x)\` (= log(1 + x), aceita zeros) | testa a média do log, que não é a receita média; difícil de traduzir em R$ |
| **Mann-Whitney U** | teste **não paramétrico** baseado em **postos** (*ranks*): B tende a ter valores maiores que A? | não testa a diferença de médias; muitos empates (zeros) exigem correção. \`scipy.stats.mannwhitneyu\` |
| **bootstrap** | IC reamostrando os próprios dados (próxima lição) | caro computacionalmente; com caudas extremas também sofre |
| **teste de permutação** | embaralha os rótulos A/B muitas vezes para gerar a distribuição da diferença **sob H₀** | exato e sem supor distribuição; custo computacional |

**Mann-Whitney manual:** ordene todos os valores juntos e dê postos (\`pd.Series(x).rank()\`, que usa a média nos empates). Some os postos do grupo B (R_B): **U = R_B − n_B(n_B + 1) ÷ 2**; sob H₀, U tem média n_A n_B ÷ 2 e variância n_A n_B (n_A + n_B + 1) ÷ 12, e o z sai daí.

**Permutação:** com \`rng.permutation(rotulos)\` (embaralha uma cópia do array), recalcule a diferença de médias milhares de vezes (guarde-as num array pré-alocado com \`np.empty(B)\` e preencha posição a posição); o p-valor é a fração de diferenças embaralhadas com |dif| ≥ |dif observada|.
`),
    exPy('A baleia que decide o teste', `
`, r`g = usuarios.groupby("variante")["receita"]
print(g.agg(["mean", "std", "max"]).round(1))
t_bruto = (g.mean()["tratamento"] - g.mean()["controle"]) / sqrt((g.var() / g.size()).sum())
limite = usuarios["receita"].quantile(0.999)
w = usuarios.assign(receita_w=np.clip(usuarios["receita"], None, limite)).groupby("variante")["receita_w"]
t_w = (w.mean()["tratamento"] - w.mean()["controle"]) / sqrt((w.var() / w.size()).sum())
print(f"limite p99,9 = R$ {limite:.0f} | t bruto = {t_bruto:.2f} | t winsorizado = {t_w:.2f}")
lat = usuarios[["variante", "latencia_ms"]].copy()
lat["posto"] = lat["latencia_ms"].rank()
nA, nB = (lat.variante == "controle").sum(), (lat.variante == "tratamento").sum()
U = lat.loc[lat.variante == "tratamento", "posto"].sum() - nB * (nB + 1) / 2
zU = (U - nA * nB / 2) / sqrt(nA * nB * (nA + nB + 1) / 12)
print(f"Mann-Whitney na latência: z = {zU:.2f}")`, `
O desvio padrão do tratamento é mais de 3× o do controle por causa de **uma única compra de R$ 24 mil**. Com o teto no percentil 99,9, a diferença de médias encolhe: boa parte do "ganho" de receita era essa baleia. Nenhuma das duas versões é significativa, mas a winsorizada é a mais honesta. Na latência, o Mann-Whitney detecta que o tratamento ficou mais lento.
`, D2),
    quiz('Por que o limite de winsorization deve ser calculado com os dois grupos juntos (ou definido antes)?', ['Porque limites diferentes por grupo criariam uma diferença artificial entre eles', 'Porque é mais rápido', 'Porque o percentil de um grupo só não existe', 'Não importa como é calculado'], 0),
    quiz('O Mann-Whitney deu significativo e o t de Welch na receita não. O que o Mann-Whitney está dizendo?', ['Que os valores de um grupo tendem a ser maiores (diferença nas distribuições/postos), não necessariamente na média', 'Que a receita média é diferente', 'Que os dados são normais', 'Que houve SRM'], 0),
    py('Faça um **teste de permutação** da diferença de receita média (tratamento − controle) **winsorizada no percentil 99** (limite com todos os usuários). Guarde `dif_obs`, gere 1.000 permutações com `rng = np.random.default_rng(6)` e `rng.permutation(rotulos)` em `difs` (array) e calcule `p_perm` = fração de |difs| ≥ |dif_obs|.',
      r`limite = usuarios["receita"].quantile(0.99)
x = np.clip(usuarios["receita"].to_numpy(), None, limite)
rotulos = (usuarios["variante"] == "tratamento").to_numpy()
dif_obs = x[rotulos].mean() - x[~rotulos].mean()
rng = np.random.default_rng(6)
difs = np.empty(1000)
for i in range(1000):
    perm = rng.permutation(rotulos)
    difs[i] = x[perm].mean() - x[~perm].mean()
p_perm = (np.abs(difs) >= abs(dif_obs)).mean()`,
      r`_l = usuarios.receita.quantile(0.99); _x = np.clip(usuarios.receita.to_numpy(), None, _l); _t = (usuarios.variante == "tratamento").to_numpy()
assert abs(dif_obs - (_x[_t].mean() - _x[~_t].mean())) < 1e-9
assert len(difs) == 1000 and abs(difs.mean()) < 0.3 * abs(dif_obs) + 0.2
assert abs(p_perm - (np.abs(difs) >= abs(dif_obs)).mean()) < 1e-12 and p_perm < 0.2`, D2),
  ],
};

const L_BOOT = {
  id: 'ex-2-6', title: 'Bootstrap: intervalos para mediana, p95 e métricas assimétricas',
  steps: [
    theory('Reamostrar os próprios dados', `
Para a **média**, o IC sai de uma fórmula (± 1,96 × EP). Para a **mediana**, o **percentil 95 de latência** ou métricas muito assimétricas, não há fórmula simples e confiável. O **bootstrap** resolve por simulação:

1. de cada grupo, sorteie **com reposição** uma amostra do **mesmo tamanho** (\`rng.choice(x, len(x))\` ou \`rng.choice(x, size=(B, n))\` para B amostras de uma vez)
2. calcule a estatística (ex.: p95 de B − p95 de A)
3. repita B vezes (1.000 a 10.000)
4. o **IC percentil 95%** são os percentis 2,5 e 97,5 das estatísticas: \`np.percentile(difs, [2.5, 97.5])\`

**Cuidados:**
- reamostre **na unidade de randomização**: se a métrica é por sessão e a randomização por usuário, sorteie **usuários** (com todas as suas sessões), não sessões
- reamostre **dentro de cada grupo** separadamente
- percentis extremos (p99,9) e caudas muito pesadas exigem amostras grandes; o bootstrap não cria informação que os dados não têm
- **latência é guardrail clássica**: a média esconde a cauda; o que o usuário sente é o **p95/p99** (os 5% ou 1% mais lentos)

O bootstrap também serve para a **média** quando a distribuição é estranha, e para conferir o IC da fórmula.
`),
    exPy('IC da diferença de mediana da latência', `
`, r`rng = np.random.default_rng(1)
a = usuarios.loc[usuarios.variante == "controle", "latencia_ms"].to_numpy()
b = usuarios.loc[usuarios.variante == "tratamento", "latencia_ms"].to_numpy()
B = 1000
difs = np.median(rng.choice(b, size=(B, len(b))), axis=1) - np.median(rng.choice(a, size=(B, len(a))), axis=1)
print(f"mediana A {np.median(a):.0f} ms, B {np.median(b):.0f} ms, diferença {np.median(b) - np.median(a):.0f} ms")
print("IC 95% bootstrap:", np.percentile(difs, [2.5, 97.5]).round(1))`, `
O IC não inclui zero: a mediana da latência piorou com o novo carrinho. Se a guardrail tolera até +5% (≈ 20 ms), o limite superior do IC é o número a comparar.
`, D2),
    quiz('A métrica é "cliques por sessão" e o teste foi randomizado por usuário. Como fazer o bootstrap?', ['Sorteando usuários com reposição (levando todas as sessões de cada um)', 'Sorteando sessões com reposição', 'Sorteando cliques', 'Não é possível fazer bootstrap'], 0),
    quiz('Por que monitorar o p95 de latência e não só a média?', ['A média esconde a cauda: os usuários mais prejudicados (os 5% mais lentos) aparecem no p95', 'Porque a média é sempre zero', 'Porque o p95 tem menos variância', 'Porque é o que o bootstrap exige'], 0),
    py('Com `rng = np.random.default_rng(3)` e `B = 800` reamostragens (matriz com `rng.choice(x, size=(B, n))`), calcule o bootstrap da diferença de **p95 de latência** (tratamento − controle, com `np.percentile(..., 95, axis=1)`). Guarde `difs`, o IC em `ic` (`np.percentile(difs, [2.5, 97.5])`) e `guarda_ok`: o limite superior do IC é menor que **5% do p95 do controle**.',
      r`rng = np.random.default_rng(3)
B = 800
a = usuarios.loc[usuarios["variante"] == "controle", "latencia_ms"].to_numpy()
b = usuarios.loc[usuarios["variante"] == "tratamento", "latencia_ms"].to_numpy()
difs = np.percentile(rng.choice(b, size=(B, len(b))), 95, axis=1) - np.percentile(rng.choice(a, size=(B, len(a))), 95, axis=1)
ic = np.percentile(difs, [2.5, 97.5])
guarda_ok = ic[1] < 0.05 * np.percentile(a, 95)`,
      r`_a = usuarios.latencia_ms[usuarios.variante == "controle"].to_numpy(); _b = usuarios.latencia_ms[usuarios.variante == "tratamento"].to_numpy()
_obs = np.percentile(_b, 95) - np.percentile(_a, 95)
assert len(difs) == 800 and ic[0] < _obs < ic[1]
assert guarda_ok == (ic[1] < 0.05 * np.percentile(_a, 95))`, D2),
  ],
};

const L_SEGMENTOS = {
  id: 'ex-2-7', title: 'Segmentos com controle de falso positivo e teste de interação',
  steps: [
    theory('"Funcionou no Android": é real?', `
Depois do resultado geral, todo mundo quer **cortar por segmento**: plataforma, novos × recorrentes, região. Dois erros comuns:

1. **Multiplicidade:** com 3 plataformas × 2 tipos de usuário × 5 regiões, são 30 cortes. Alguns vão "dar significativo" por acaso. Corrija com **Benjamini-Hochberg** e trate como **exploratório**, a não ser que o segmento tenha sido pré-registrado
2. **Comparar significâncias** em vez de efeitos: "no Android p = 0,01, na Web p = 0,40, logo o efeito é diferente" é **errado**. A Web pode ter efeito parecido com menos amostra. A pergunta certa é: **a diferença entre os efeitos é significativa?**

**Teste de interação** (diferença de diferenças entre dois segmentos):
- efeito em cada segmento: d₁ = p_T₁ − p_C₁ e d₂ = p_T₂ − p_C₂, com erros padrão ep₁ e ep₂
- **z = (d₁ − d₂) ÷ √(ep₁² + ep₂²)** (os segmentos são grupos de usuários diferentes, logo independentes)
- só um z de interação significativo autoriza dizer que "o efeito depende do segmento"

**Efeito heterogêneo real** (o tratamento funciona melhor para alguns) existe e vale ouro (Nível 4: uplift), mas precisa de confirmação. **Paradoxo de Simpson** também aparece aqui: se a mistura de segmentos difere entre grupos, o efeito total pode ter sinal diferente dos efeitos por segmento. Com randomização correta a mistura é igual nos dois grupos, o que é mais um motivo para checar SRM por segmento.
`),
    exPy('Efeito por plataforma, com BH', `
`, r`linhas = []
for plat, d in usuarios.groupby("plataforma"):
    c = d.loc[d.variante == "controle", "converteu"]; t = d.loc[d.variante == "tratamento", "converteu"]
    dif = t.mean() - c.mean()
    ep = sqrt(c.mean() * (1 - c.mean()) / len(c) + t.mean() * (1 - t.mean()) / len(t))
    linhas.append((plat, dif, ep, erfc(abs(dif / ep) / sqrt(2))))
seg = pd.DataFrame(linhas, columns=["plataforma", "dif", "ep", "p"]).sort_values("p")
seg["limite_bh"] = np.arange(1, len(seg) + 1) / len(seg) * 0.05
print(seg.round(4))`, `
Android tem o maior efeito e o menor p-valor. Mas o efeito do Android é **diferente** do da Web? Isso só o teste de interação responde.
`, D2),
    quiz('No Android o efeito deu p = 0,01 e na Web p = 0,40. O que dá para concluir?', ['Nada sobre diferença entre plataformas ainda: é preciso testar a interação (a diferença entre os efeitos)', 'Que o efeito só existe no Android', 'Que a Web piorou', 'Que o teste geral é inválido'], 0),
    py('Calcule o efeito de conversão (tratamento − controle) e o erro padrão não agrupado para **android** (`d_android`, `ep_android`) e **web** (`d_web`, `ep_web`). Depois o `z_interacao` = (d_android − d_web) ÷ √(ep_android² + ep_web²) e o `p_interacao` bilateral.',
      r`def efeito(d):
    c = d.loc[d["variante"] == "controle", "converteu"]
    t = d.loc[d["variante"] == "tratamento", "converteu"]
    dif = t.mean() - c.mean()
    ep = sqrt(c.mean() * (1 - c.mean()) / len(c) + t.mean() * (1 - t.mean()) / len(t))
    return dif, ep

d_android, ep_android = efeito(usuarios[usuarios["plataforma"] == "android"])
d_web, ep_web = efeito(usuarios[usuarios["plataforma"] == "web"])
z_interacao = (d_android - d_web) / sqrt(ep_android ** 2 + ep_web ** 2)
p_interacao = erfc(abs(z_interacao) / sqrt(2))`,
      r`def _ef(d):
    c = d.converteu[d.variante == "controle"]; t = d.converteu[d.variante == "tratamento"]
    return t.mean() - c.mean(), sqrt(c.mean() * (1 - c.mean()) / len(c) + t.mean() * (1 - t.mean()) / len(t))
_da, _ea = _ef(usuarios[usuarios.plataforma == "android"]); _dw, _ew = _ef(usuarios[usuarios.plataforma == "web"])
assert abs(d_android - _da) < 1e-12 and abs(ep_web - _ew) < 1e-12
assert abs(z_interacao - (_da - _dw) / sqrt(_ea ** 2 + _ew ** 2)) < 1e-9
assert abs(p_interacao - erfc(abs(z_interacao) / sqrt(2))) < 1e-12`, D2),
  ],
};

const L_MVT = {
  id: 'ex-2-8', title: 'A/B/n, testes multivariados (MVT) e design fatorial',
  steps: [
    theory('Duas mudanças ao mesmo tempo', `
**A/B/n:** um controle e várias variantes **da mesma coisa** (3 textos de botão). Cada variante é comparada ao controle, e a multiplicidade exige correção (Bonferroni/Holm ou Dunnett). Mais variantes = menos tráfego por variante = menos poder.

**Teste multivariado (MVT) / design fatorial:** testa **vários fatores ao mesmo tempo**, cada um com seus níveis. Ex.: fator 1 = título (atual/novo), fator 2 = imagem (atual/nova) → **2 × 2 = 4 células**:
| | imagem atual | imagem nova |
|---|---|---|
| **título atual** | c₀₀ (controle) | c₀₁ |
| **título novo** | c₁₀ | c₁₁ |

- **efeito principal do título**: média das células com título novo − média das com título atual = [(c₁₀ + c₁₁) − (c₀₀ + c₀₁)] ÷ 2
- **efeito principal da imagem**: [(c₀₁ + c₁₁) − (c₀₀ + c₁₀)] ÷ 2
- **interação**: o efeito do título **depende** da imagem? **(c₁₁ − c₀₁) − (c₁₀ − c₀₀)**. Se ≠ 0, os efeitos não se somam (ex.: título novo e imagem nova juntos "brigam" visualmente)

**Fatorial completo** testa todas as combinações (2ᵏ células para k fatores de 2 níveis). **Fracionado** testa só uma fração planejada das células, supondo que interações de ordem alta são desprezíveis: economiza tráfego, mas confunde algumas interações com efeitos principais.

**Na prática de produto:** testes A/B **simultâneos e independentes** (cada um com seu sorteio) já formam um fatorial implícito. As plataformas grandes rodam centenas assim (Nível 4: camadas ortogonais) e **monitoram interações** entre experimentos que mexem na mesma tela. Interações fortes são raras, mas existem.

Erro padrão da interação para proporções: √(Σ pᵢ(1 − pᵢ) ÷ nᵢ) somando as 4 células (cada célula entra com sinal ±1).
`),
    quiz('O título novo sozinho dá +1 p.p., a imagem nova sozinha +1 p.p., e os dois juntos dão +0,5 p.p. sobre o controle. O que isso indica?', ['Interação negativa: os efeitos não se somam', 'Que nenhum fator funciona', 'Que o teste tem SRM', 'Efeitos aditivos'], 0),
    quiz('Qual a desvantagem de um A/B/n com 6 variantes em relação a um A/B?', ['Menos tráfego por variante (menos poder) e mais comparações a corrigir', 'Não há desvantagem', 'Não é possível calcular p-valor', 'Exige randomização por sessão'], 0),
    fill('Complete a fórmula da interação em um fatorial 2 × 2 (c_TI = conversão com título T e imagem I):', 'interacao = (c11 - ___) - (c10 - ___)', [['c01'], ['c00']]),
    py('Em `celulas` (conversões `x` e usuários `n` das 4 células de um fatorial título × imagem), calcule a taxa de cada célula e guarde `ef_titulo`, `ef_imagem` (efeitos principais, como na teoria), `interacao` = (c11 − c01) − (c10 − c00) e `z_inter`, com o erro padrão √Σ p(1 − p) ÷ n das 4 células.',
      r`c = celulas.set_index("celula")
p = c["x"] / c["n"]
ef_titulo = ((p["c10"] + p["c11"]) - (p["c00"] + p["c01"])) / 2
ef_imagem = ((p["c01"] + p["c11"]) - (p["c00"] + p["c10"])) / 2
interacao = (p["c11"] - p["c01"]) - (p["c10"] - p["c00"])
ep = sqrt((p * (1 - p) / c["n"]).sum())
z_inter = interacao / ep`,
      r`_c = celulas.set_index("celula"); _p = _c.x / _c.n
assert abs(ef_titulo - ((_p.c10 + _p.c11) - (_p.c00 + _p.c01)) / 2) < 1e-12
assert abs(ef_imagem - ((_p.c01 + _p.c11) - (_p.c00 + _p.c10)) / 2) < 1e-12
assert abs(interacao - ((_p.c11 - _p.c01) - (_p.c10 - _p.c00))) < 1e-12 and interacao < 0
assert abs(z_inter - interacao / sqrt((_p * (1 - _p) / _c.n).sum())) < 1e-9 and z_inter < -1.96`,
      { ...PURO, setup: PURO.setup + 'celulas = pd.DataFrame({"celula": ["c00", "c01", "c10", "c11"], "x": [1000, 1210, 1205, 1250], "n": [20000, 20000, 20000, 20000]})', setupNote: 'Já carregados: `celulas` (celula c00/c01/c10/c11, x = conversões, n = usuários; o primeiro dígito é o título, o segundo a imagem), `pd`, `np` e funções do math.' }),
  ],
};

const L_VALIDADE = {
  id: 'ex-2-9', title: 'Ameaças à validade: novidade, primazia, Hawthorne, cross-device e flicker',
  steps: [
    theory('O teste mediu o que você acha que mediu?', `
**Validade interna:** o efeito medido é causado pela mudança? **Validade externa:** ele vale fora do teste (para todos os usuários, no longo prazo, depois do lançamento)?

| ameaça | o que acontece | como detectar / mitigar |
|---|---|---|
| **efeito novidade** | usuários clicam no que é novo por curiosidade; o efeito **cai** com o tempo | efeito **por semana de entrada** ou por dias desde a 1ª exposição; rodar mais tempo; usar só o período estável |
| **efeito primazia** (*primacy*) | usuários antigos estranham a mudança (aprenderam o fluxo velho); o efeito **sobe** com o tempo | o mesmo gráfico por tempo; olhar novos × recorrentes (novos não têm hábito) |
| **efeito Hawthorne** | as pessoas mudam o comportamento por **saberem que são observadas** | comum em testes com usuários avisados, pilotos com vendedores, pesquisas; prefira testes cegos |
| **sazonalidade** | o período do teste é atípico (Black Friday, férias) | semanas cheias, evitar datas atípicas ou repetir o teste |
| **cookies apagados / cross-device** | a mesma pessoa vira dois "usuários" e pode ver A e B | randomizar por login; medir a taxa de usuários em ambos os grupos |
| **flicker effect** | a página carrega a versão A e depois "pisca" para B (teste no navegador com JavaScript) | renderizar no servidor; esconder a página até a variante carregar; olhar a latência como guardrail |
| **efeito de carryover** | usuários que estavam em outro teste trazem efeitos residuais | reembaralhar (*re-salt*) os buckets entre testes |

**Diagnóstico prático da novidade:** calcule o efeito separadamente por **semana de entrada** no teste (ou por dias desde a primeira exposição). Se a semana 1 tem efeito muito maior que as seguintes, use as semanas estáveis para estimar o efeito duradouro, ou estenda o teste.
`),
    exPy('O efeito do carrinho por semana de entrada', `
`, r`t = usuarios[usuarios.viu_carrinho == 1].groupby(["semana", "variante"])["converteu"].mean().unstack()
t["efeito_pp"] = (t["tratamento"] - t["controle"]) * 100
print(t.round(4))`, `
Na semana 1 o efeito passa de 4 pontos; nas semanas 3 e 4 fica em torno de 1 a 2 pontos. É o retrato do **efeito novidade**: a estimativa para a decisão deve vir do período estável.
`, D2),
    quiz('O efeito de um redesenho começou negativo e foi ficando positivo ao longo de 4 semanas, principalmente entre usuários antigos. Qual o nome do fenômeno?', ['Efeito primazia (usuários antigos se adaptando ao novo fluxo)', 'Efeito novidade', 'Efeito Hawthorne', 'SRM'], 0),
    quiz('Um teste de layout implementado com JavaScript no navegador mostra rapidamente a página antiga antes da nova. Como se chama esse risco?', ['Flicker effect', 'Primazia', 'Carryover', 'Peeking'], 0),
    py('Entre os usuários que viram o carrinho (`viu_carrinho == 1`), calcule `efeito_semana`: Series indexada por `semana` com o efeito tratamento − controle **em pontos percentuais**. Guarde `novidade` = efeito da semana 1 ÷ média dos efeitos das semanas 3 e 4, e `efeito_estavel` = média das semanas 3 e 4.',
      r`t = usuarios[usuarios["viu_carrinho"] == 1].groupby(["semana", "variante"])["converteu"].mean().unstack()
efeito_semana = (t["tratamento"] - t["controle"]) * 100
efeito_estavel = efeito_semana.loc[[3, 4]].mean()
novidade = efeito_semana.loc[1] / efeito_estavel`,
      r`_t = usuarios[usuarios.viu_carrinho == 1].groupby(["semana", "variante"]).converteu.mean().unstack(); _e = (_t.tratamento - _t.controle) * 100
assert np.allclose(efeito_semana.sort_index().to_numpy(), _e.sort_index().to_numpy())
assert abs(efeito_estavel - _e.loc[[3, 4]].mean()) < 1e-9 and novidade > 2`, D2),
  ],
};

const L_PIPELINE = {
  id: 'ex-2-10', title: 'Pipeline em SQL: atribuição, triggering e sem vazamento temporal',
  steps: [
    theory('Da tabela de logs ao número certo', `
Uma plataforma de experimentos guarda pelo menos três fontes (aqui, no banco do app):
- **\`exp_atribuicoes\`**: em qual variante cada usuário caiu e quando (uma linha por usuário)
- **\`exp_exposicoes\`**: cada vez que o usuário **de fato viu** a parte alterada (abriu o carrinho). Pode ter **várias linhas por usuário**
- **\`exp_pedidos\`**: os eventos de resultado, com data e hora

**Triggering (gatilho):** a mudança está no carrinho, mas só ~40% dos usuários atribuídos abrem o carrinho. Os outros 60% **não poderiam ser afetados**; incluí-los adiciona ruído e **dilui** o efeito (ele fica 2,5× menor e exige ~6× mais amostra). A análise **triggered** considera só quem foi exposto, nos **dois** grupos. Cuidado: o gatilho deve ser um evento que acontece **igual** em A e B (abrir o carrinho, e não "clicar no botão novo", que só existe em B). Senão, você cria viés de gatilho e SRM.

**Vazamento temporal (*leakage*):** um pedido feito **antes** da primeira exposição não pode ser efeito da mudança. A métrica deve contar só eventos **depois** do gatilho: \`p.criado_em >= e.primeira_exposicao\`.

**Padrão da query:**
\`\`\`sql
WITH expostos AS (                       -- 1 linha por usuário: a primeira exposição
  SELECT usuario_id, MIN(exposto_em) AS primeira
  FROM exp_exposicoes
  WHERE experimento = 'carrinho_v2'
  GROUP BY usuario_id
),
resultado AS (                           -- métricas por usuário, só depois do gatilho
  SELECT e.usuario_id, a.variante,
         COUNT(p.pedido_id) AS pedidos,
         COALESCE(SUM(p.valor), 0) AS receita
  FROM expostos e
  JOIN exp_atribuicoes a ON a.usuario_id = e.usuario_id
  LEFT JOIN exp_pedidos p ON p.usuario_id = e.usuario_id AND p.criado_em >= e.primeira
  GROUP BY e.usuario_id, a.variante
)
SELECT variante, COUNT(*) AS usuarios, ...
FROM resultado GROUP BY variante;
\`\`\`
- o filtro de tempo vai no **ON** do LEFT JOIN (no WHERE, ele eliminaria quem não comprou)
- \`MIN(exposto_em)\` deduplica as reexposições
- o resultado agregado (n, soma, soma dos quadrados por variante) alimenta o teste em Python
`),
    exSql('A divisão de tráfego (primeira checagem: SRM)', `
`, r`SELECT variante, COUNT(*) AS usuarios,
       ROUND(1.0 * COUNT(*) / (SELECT COUNT(*) FROM exp_atribuicoes), 4) AS fracao
FROM exp_atribuicoes
WHERE experimento = 'carrinho_v2'
GROUP BY variante
ORDER BY variante;`, `
Esses dois números entram no qui-quadrado de SRM antes de qualquer métrica.
`),
    sql('Conte, por `variante`, quantos usuários **distintos** foram expostos ao carrinho (`expostos`). Ordene por variante.',
      `SELECT a.variante, COUNT(DISTINCT e.usuario_id) AS expostos
FROM exp_exposicoes e
JOIN exp_atribuicoes a ON a.usuario_id = e.usuario_id
WHERE e.experimento = 'carrinho_v2'
GROUP BY a.variante
ORDER BY a.variante;`, { ordered: true }),
    sql('Monte a análise **triggered sem vazamento**: para cada variante, o número de usuários expostos (`usuarios`), quantos fizeram **pelo menos um pedido a partir da primeira exposição** (`convertidos`) e a taxa (`taxa`, arredondada a 4 casas). Ordene por variante.',
      `WITH expostos AS (
  SELECT usuario_id, MIN(exposto_em) AS primeira
  FROM exp_exposicoes
  WHERE experimento = 'carrinho_v2'
  GROUP BY usuario_id
),
resultado AS (
  SELECT e.usuario_id, a.variante, COUNT(p.pedido_id) AS pedidos
  FROM expostos e
  JOIN exp_atribuicoes a ON a.usuario_id = e.usuario_id
  LEFT JOIN exp_pedidos p ON p.usuario_id = e.usuario_id AND p.criado_em >= e.primeira
  GROUP BY e.usuario_id, a.variante
)
SELECT variante, COUNT(*) AS usuarios,
       SUM(CASE WHEN pedidos > 0 THEN 1 ELSE 0 END) AS convertidos,
       ROUND(1.0 * SUM(CASE WHEN pedidos > 0 THEN 1 ELSE 0 END) / COUNT(*), 4) AS taxa
FROM resultado
GROUP BY variante
ORDER BY variante;`, { ordered: true }),
    debugSql('Esta query de **receita por usuário exposto** tem dois bugs: conta pedidos feitos **antes** da exposição e o filtro de data no WHERE elimina quem não comprou. Corrija: `usuarios`, `receita` (soma, 2 casas) e `receita_por_usuario` (2 casas) por variante, ordenado por variante.',
      `WITH expostos AS (
  SELECT usuario_id, MIN(exposto_em) AS primeira
  FROM exp_exposicoes
  GROUP BY usuario_id
)
SELECT a.variante, COUNT(DISTINCT e.usuario_id) AS usuarios,
       ROUND(SUM(p.valor), 2) AS receita,
       ROUND(SUM(p.valor) / COUNT(DISTINCT e.usuario_id), 2) AS receita_por_usuario
FROM expostos e
JOIN exp_atribuicoes a ON a.usuario_id = e.usuario_id
LEFT JOIN exp_pedidos p ON p.usuario_id = e.usuario_id
WHERE p.criado_em <= e.primeira
GROUP BY a.variante
ORDER BY a.variante;`,
      `WITH expostos AS (
  SELECT usuario_id, MIN(exposto_em) AS primeira
  FROM exp_exposicoes
  GROUP BY usuario_id
)
SELECT a.variante, COUNT(DISTINCT e.usuario_id) AS usuarios,
       ROUND(COALESCE(SUM(p.valor), 0), 2) AS receita,
       ROUND(COALESCE(SUM(p.valor), 0) / COUNT(DISTINCT e.usuario_id), 2) AS receita_por_usuario
FROM expostos e
JOIN exp_atribuicoes a ON a.usuario_id = e.usuario_id
LEFT JOIN exp_pedidos p ON p.usuario_id = e.usuario_id AND p.criado_em >= e.primeira
GROUP BY a.variante
ORDER BY a.variante;`, { ordered: true }),
    quiz('A mudança está na página de pagamento, que 15% dos usuários atribuídos visitam. Por que analisar só os expostos (triggered)?', ['Os outros 85% não podem ser afetados; incluí-los dilui o efeito e reduz muito o poder', 'Porque os expostos convertem mais', 'Para esconder o SRM', 'Porque é proibido analisar todos'], 0),
    quiz('Qual destes gatilhos causaria viés de gatilho?', ['"Clicou no botão novo", que só existe na variante B', '"Abriu a página de pagamento", que existe nas duas variantes', '"Fez login no período do teste"', '"Foi atribuído ao experimento"'], 0),
  ],
};

const L_EDD = {
  id: 'ex-2-11', title: 'Projeto: Experiment Design Doc e comunicação executiva',
  steps: [
    theory('O Experiment Design Doc (pré-registro)', `
O **EDD** é escrito e revisado **antes** de o teste começar. Ele protege contra p-hacking, alinha o time e vira o histórico da empresa.

**Modelo de EDD:**
1. **Contexto e problema**: o que sabemos (dados, pesquisa, testes anteriores)
2. **Hipótese testável** (formato do Nível 1)
3. **Desenho**: variantes, **unidade de randomização**, população elegível, **gatilho** (*triggering*), proporção de tráfego, plano de *ramp-up* (1% → 50%)
4. **Métricas**: OEC (uma), secundárias, **guardrails com limites** (ex.: latência p95 ≤ +5%, cancelamento ≤ +2%)
5. **Estatística**: α, poder, **MDE** e justificativa de negócio, tamanho de amostra, **duração em semanas cheias**, teste usado (z, Welch, bootstrap), tratamento de outliers (winsorization a p99,9), correção de múltiplas comparações
6. **Plano de segmentação** pré-registrado (ex.: plataforma, novos × recorrentes) e o que é exploratório
7. **Critérios de decisão**:
   - **Ship** (lançar): OEC com IC acima de zero e guardrails dentro dos limites
   - **Iterate** (iterar): sinal promissor, efeito ambíguo, ou ganho com guardrail ferida (resolver a latência e testar de novo)
   - **Kill** (descartar): IC exclui efeitos relevantes, ou dano claro
8. **Riscos**: novidade, sazonalidade, interação com outros testes, SRM

**Comunicação executiva:** o executivo precisa de **decisão, tamanho do efeito em dinheiro e risco**, nessa ordem:
> **Recomendação: lançar o novo carrinho no Android e no iOS; iterar na Web.**
> Ganho estimado de **+R$ 2,1 milhões/ano** (faixa de 95%: R$ 0,9 a 3,3 milhões), considerando só o efeito estável após a novidade. Latência +2,6% (limite 5%). Sem SRM.

**Impacto anualizado:** efeito por usuário exposto × usuários expostos por ano × valor de uma conversão. Aplique o mesmo cálculo aos **limites do IC** para dar a faixa: um número único sem faixa passa uma falsa precisão. E desconfie de efeitos de 2 semanas projetados para 1 ano (novidade, *winner's curse*: Nível 4).
`),
    order('Ordene as seções de um Experiment Design Doc:', ['contexto e hipótese', 'desenho: unidade, gatilho e tráfego', 'métricas: OEC, secundárias e guardrails', 'estatística: MDE, amostra e duração', 'critérios de decisão: ship, iterate ou kill']),
    quiz('A OEC subiu com IC acima de zero, mas a latência p95 piorou 9% (limite: 5%). Qual decisão o EDD indica?', ['Iterate: resolver a latência e testar de novo antes de lançar', 'Ship: a OEC subiu', 'Kill: o teste falhou', 'Ignorar a guardrail'], 0),
    py('Calcule o **impacto anualizado** do carrinho. Use só usuários com `viu_carrinho == 1` das **semanas 3 e 4** (período estável): `dif` (tratamento − controle da conversão) e `ep` (não agrupado). Com 2,4 milhões de usuários expostos por ano e R$ 62 de margem por conversão, guarde `impacto` = dif × 2,4 mi × 62 e a faixa `faixa = (impacto_inferior, impacto_superior)` usando dif ± 1,96 × ep.',
      r`d = usuarios[(usuarios["viu_carrinho"] == 1) & (usuarios["semana"] >= 3)]
c = d.loc[d["variante"] == "controle", "converteu"]
t = d.loc[d["variante"] == "tratamento", "converteu"]
dif = t.mean() - c.mean()
ep = sqrt(c.mean() * (1 - c.mean()) / len(c) + t.mean() * (1 - t.mean()) / len(t))
fator = 2_400_000 * 62
impacto = dif * fator
faixa = ((dif - 1.96 * ep) * fator, (dif + 1.96 * ep) * fator)`,
      r`_d = usuarios[(usuarios.viu_carrinho == 1) & (usuarios.semana >= 3)]
_c = _d.converteu[_d.variante == "controle"]; _t = _d.converteu[_d.variante == "tratamento"]
_dif = _t.mean() - _c.mean(); _ep = sqrt(_c.mean() * (1 - _c.mean()) / len(_c) + _t.mean() * (1 - _t.mean()) / len(_t))
assert abs(impacto - _dif * 2.4e6 * 62) < 1e-3
assert abs(faixa[0] - (_dif - 1.96 * _ep) * 2.4e6 * 62) < 1e-3 and abs(faixa[1] - (_dif + 1.96 * _ep) * 2.4e6 * 62) < 1e-3`, D2),
    quiz('Qual frase é a melhor abertura de um resumo para a diretoria?', ['"Recomendo lançar: +R$ 2,1 mi/ano (faixa de R$ 0,9 a 3,3 mi), guardrails dentro dos limites."', '"O p-valor foi 0,003 no teste z agrupado."', '"Rodamos 4 semanas com 24 mil usuários e 14 métricas."', '"A variante B ganhou."'], 0),
  ],
};

export const EX_N2 = [
  { id: 'ex-u3', level: 2, title: 'Design robusto e integridade', description: 'Unidade de randomização, SRM, peeking, MVT e ameaças à validade', lessons: [L_UNIDADE, L_SRM, L_PEEKING, L_MVT, L_VALIDADE] },
  { id: 'ex-u4', level: 2, title: 'Rigor estatístico com dados reais', description: 'Múltiplas comparações, caudas longas e outliers, bootstrap e segmentos com interação', lessons: [L_MULTIPLAS, L_CAUDAS, L_BOOT, L_SEGMENTOS] },
  { id: 'ex-u5', level: 2, title: 'Pipeline e decisão', description: 'Exposição e triggering em SQL, Experiment Design Doc e comunicação executiva (ship, iterate ou kill)', lessons: [L_PIPELINE, L_EDD] },
];
