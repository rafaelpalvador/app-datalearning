import { theory, quiz, order, fill, sql, py } from './helpers.js';
import { PY_STATS, PY_STATS_NOTE } from './datasets.js';

const r = String.raw;
const PD = ['pandas'];
const S = { setup: PY_STATS, setupNote: PY_STATS_NOTE, packages: PD };

export const STATS_COURSE = {
  id: 'stats',
  title: 'Estatística para Dados',
  icon: 'sigma',
  color: '#c2410c',
  description: 'Estatística descritiva, distribuições, intervalos de confiança, testes A/B, correlação e regressão, com SQL e Python sobre dados reais de vendas e experimentos.',
  units: [
    // ───────────────────────────── UNIDADE 1
    {
      id: 'st-u1', title: 'Estatística descritiva', description: 'Tendência central, dispersão, quartis e outliers',
      lessons: [
        {
          id: 'st-1-1', title: 'Média, mediana e moda',
          steps: [
            theory('Para que serve a estatística descritiva', `
A estatística descritiva **resume** muitos números em poucos indicadores, para responder perguntas como "quanto vendemos num dia típico?".

As três medidas de **tendência central**:

| medida | definição | ponto forte | ponto fraco |
|---|---|---|---|
| **média** | soma ÷ quantidade | usa todos os valores | puxada por outliers |
| **mediana** | valor do meio (50% abaixo, 50% acima) | robusta a outliers | ignora a magnitude dos extremos |
| **moda** | valor mais frequente | serve para categorias | pode não existir ou haver várias |

> Neste curso você trabalha com a tabela \`vendas_diarias\`: 366 dias de 2024 × 3 lojas (Centro, Shopping, Online), com visitantes, pedidos e receita.
`),
            theory('Quando a média engana', `
Uma loja vende R$ 5.000 por dia, mas num único dia de Black Friday vende R$ 26.000. A média sobe; a mediana quase não muda.

- **Distribuição simétrica**: média ≈ mediana
- **Assimetria à direita** (cauda longa de valores altos, comum em receita, salário, tempo de sessão): média **>** mediana
- **Assimetria à esquerda**: média **<** mediana

Regra prática: em dados monetários, **reporte as duas**. Se forem muito diferentes, investigue os extremos.

~~~sql
SELECT AVG(receita) AS media, median(receita) AS mediana   -- median() existe neste SQLite
FROM vendas_diarias;
-- PostgreSQL: PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY receita)
~~~
`),
            sql('Calcule a **receita média diária** de cada loja, arredondada para 2 casas. Colunas: loja, media. Ordene pela média, da maior para a menor.',
              'SELECT loja, ROUND(AVG(receita), 2) AS media FROM vendas_diarias GROUP BY loja ORDER BY media DESC;', { ordered: true }),
            sql('Compare **média** e **mediana** da receita de todas as linhas (2 casas cada). Colunas: media, mediana.',
              'SELECT ROUND(AVG(receita), 2) AS media, ROUND(median(receita), 2) AS mediana FROM vendas_diarias;',
              { hint: 'Este SQLite tem a função median().' }),
            quiz('A média da receita ficou acima da mediana. O que isso indica?', ['A distribuição é simétrica', 'Há assimetria à direita: alguns dias com receita muito alta', 'Há erro nos dados', 'A mediana está errada'], 1),
            py('Usando o DataFrame `diarias`, crie `moda_nota` com a **nota mais frequente** em `avaliacoes` e `mediana_receita` com a mediana da receita da loja **Online**.',
              r`moda_nota = avaliacoes["nota"].mode()[0]
mediana_receita = diarias.loc[diarias["loja"] == "Online", "receita"].median()`,
              r`assert moda_nota == avaliacoes["nota"].value_counts().idxmax()
assert abs(mediana_receita - diarias[diarias.loja == "Online"].receita.median()) < 1e-9`, S),
            quiz('Para resumir o **salário típico** de uma empresa com alguns diretores muito bem pagos, a melhor medida é...', ['Média', 'Mediana', 'Máximo', 'Soma'], 1),
          ],
        },
        {
          id: 'st-1-2', title: 'Dispersão: variância e desvio padrão',
          steps: [
            theory('Medindo a variabilidade', `
Duas lojas podem ter a mesma média e comportamentos muito diferentes. A **dispersão** mede o quanto os valores se espalham.

- **Amplitude**: máximo − mínimo (sensível a extremos)
- **Variância**: média dos desvios ao quadrado em relação à média
- **Desvio padrão (σ ou s)**: raiz da variância, **na mesma unidade dos dados**
- **Coeficiente de variação (CV)**: desvio ÷ média, permite comparar escalas diferentes

**Populacional × amostral:** na amostra dividimos por **n − 1** (correção de Bessel), porque estimamos a média a partir dos próprios dados.

| ferramenta | padrão |
|---|---|
| \`pandas .std()\` | amostral (ddof=1) |
| \`numpy np.std()\` | populacional (ddof=0) |
| PostgreSQL | \`STDDEV_SAMP\` / \`STDDEV_POP\` |
`),
            theory('Desvio padrão em SQL puro', `
Nem todo banco tem função de desvio padrão. A identidade **Var(X) = E[X²] − (E[X])²** resolve com AVG:

~~~sql
SELECT loja,
       SQRT(AVG(receita * receita) - AVG(receita) * AVG(receita)) AS desvio_pop
FROM vendas_diarias
GROUP BY loja;
~~~

Para o desvio **amostral**, multiplique a variância por n / (n − 1).
`),
            sql('Calcule, por loja, o **desvio padrão populacional** da receita usando a identidade E[X²] − E[X]² (2 casas). Colunas: loja, desvio.',
              'SELECT loja, ROUND(SQRT(AVG(receita * receita) - AVG(receita) * AVG(receita)), 2) AS desvio FROM vendas_diarias GROUP BY loja;'),
            sql('Calcule o **coeficiente de variação** (%) da receita por loja: desvio populacional ÷ média × 100, com 1 casa. Colunas: loja, cv. Ordene do mais estável (menor CV) para o menos estável.',
              'SELECT loja, ROUND(100 * SQRT(AVG(receita * receita) - AVG(receita) * AVG(receita)) / AVG(receita), 1) AS cv FROM vendas_diarias GROUP BY loja ORDER BY cv;',
              { ordered: true }),
            quiz('O pandas e o NumPy dão desvios padrão ligeiramente diferentes para os mesmos dados. Por quê?', ['Bug do NumPy', 'pandas usa n−1 (amostral) e NumPy usa n (populacional) por padrão', 'pandas arredonda', 'NumPy ignora nulos'], 1),
            py('Crie `desvios`: uma Series com o **desvio padrão amostral** da receita por loja (use `groupby` e `.std()`), e `cv_online` com o coeficiente de variação da loja Online (desvio ÷ média, sem multiplicar por 100).',
              r`desvios = diarias.groupby("loja")["receita"].std()
online = diarias.loc[diarias["loja"] == "Online", "receita"]
cv_online = online.std() / online.mean()`,
              r`assert abs(desvios["Centro"] - diarias[diarias.loja == "Centro"].receita.std()) < 1e-6
o = diarias[diarias.loja == "Online"].receita
assert abs(cv_online - o.std() / o.mean()) < 1e-9`, S),
          ],
        },
        {
          id: 'st-1-3', title: 'Quartis, boxplot e outliers',
          steps: [
            theory('Quartis e percentis', `
Os **quartis** dividem os dados ordenados em quatro partes iguais:

- **Q1** (percentil 25), **Q2** = mediana (p50), **Q3** (p75)
- **IQR** (intervalo interquartil) = Q3 − Q1: onde estão os 50% centrais
- **Percentis** generalizam: p90 = valor abaixo do qual estão 90% dos dados (muito usado em tempo de resposta e SLA)

O **boxplot** desenha exatamente isso: a caixa vai de Q1 a Q3, a linha interna é a mediana, os "bigodes" vão até 1,5·IQR, e os pontos além deles são **outliers**.
`),
            theory('Detectando outliers', `
Dois métodos clássicos:

**1. Regra do IQR (Tukey)**: é outlier quem está abaixo de Q1 − 1,5·IQR ou acima de Q3 + 1,5·IQR. Robusta, não supõe normalidade.

**2. Z-score**: z = (x − média) ÷ desvio. Valores com |z| > 3 são suspeitos. Supõe distribuição aproximadamente normal e é afetado pelos próprios outliers.

~~~python
q1, q3 = s.quantile([0.25, 0.75])
iqr = q3 - q1
outliers = s[(s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)]

z = (s - s.mean()) / s.std()
suspeitos = s[z.abs() > 3]
~~~

> Outlier não é sinônimo de erro. Na \`vendas_diarias\` há alguns dias atípicos de verdade (promoções). Antes de remover, **entenda a causa**.
`),
            py('Para a loja **Centro**, calcule `q1`, `q3` e `iqr` da receita e crie `outliers_centro` com as linhas (DataFrame) que estão fora de [Q1 − 1,5·IQR, Q3 + 1,5·IQR].',
              r`centro = diarias[diarias["loja"] == "Centro"]
q1, q3 = centro["receita"].quantile([0.25, 0.75])
iqr = q3 - q1
outliers_centro = centro[(centro["receita"] < q1 - 1.5 * iqr) | (centro["receita"] > q3 + 1.5 * iqr)]`,
              r`c = diarias[diarias.loja == "Centro"].receita
a, b = c.quantile([0.25, 0.75])
assert abs(iqr - (b - a)) < 1e-9
esperado = c[(c < a - 1.5 * (b - a)) | (c > b + 1.5 * (b - a))]
assert len(outliers_centro) == len(esperado) and len(esperado) > 0`, S),
            py('Calcule o **z-score** da receita de cada linha **dentro da sua loja** (use `groupby(...).transform`) numa coluna `z` de `diarias`, e crie `n_extremos` com quantos dias têm |z| > 3.',
              r`g = diarias.groupby("loja")["receita"]
diarias["z"] = (diarias["receita"] - g.transform("mean")) / g.transform("std")
n_extremos = int((diarias["z"].abs() > 3).sum())`,
              r`g = diarias.groupby("loja")["receita"]
zz = (diarias["receita"] - g.transform("mean")) / g.transform("std")
assert "z" in diarias.columns
assert n_extremos == int((zz.abs() > 3).sum()) and n_extremos > 0`, S),
            sql('Quantos dias de cada loja tiveram receita **acima de 2 vezes a média da própria loja**? Colunas: loja, dias_atipicos.',
              'WITH m AS (SELECT loja, AVG(receita) AS media FROM vendas_diarias GROUP BY loja) SELECT v.loja, COUNT(*) AS dias_atipicos FROM vendas_diarias v JOIN m ON m.loja = v.loja WHERE v.receita > 2 * m.media GROUP BY v.loja;'),
            quiz('Num boxplot, a linha dentro da caixa representa...', ['A média', 'A mediana', 'A moda', 'O desvio padrão'], 1),
            quiz('Por que a regra do IQR costuma ser preferida ao z-score para achar outliers?', ['É mais rápida', 'Não supõe normalidade e não é distorcida pelos próprios outliers', 'Encontra sempre mais outliers', 'Funciona só com inteiros'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 2
    {
      id: 'st-u2', title: 'Probabilidade e distribuições', description: 'Probabilidade, normal, z-score e binomial',
      lessons: [
        {
          id: 'st-2-1', title: 'Probabilidade na prática',
          steps: [
            theory('Conceitos essenciais', `
- **Probabilidade** P(A): proporção de vezes que A acontece no longo prazo (0 a 1)
- **Complementar**: P(não A) = 1 − P(A)
- **Eventos independentes**: P(A e B) = P(A) · P(B)
- **Probabilidade condicional**: P(A | B) = P(A e B) ÷ P(B), "a chance de A **sabendo** que B ocorreu"

Em dados, probabilidade quase sempre é **frequência relativa**: a taxa de conversão de um grupo é a probabilidade estimada de um usuário comprar.

~~~sql
-- P(converter | dispositivo = 'desktop')
SELECT AVG(converteu) FROM experimento_ab WHERE dispositivo = 'desktop';
~~~
`),
            theory('Teorema de Bayes (intuição)', `
P(A | B) = P(B | A) · P(A) ÷ P(B)

Exemplo clássico: um alerta de fraude acerta 99% das fraudes, mas só 0,1% das transações são fraude. Se o alerta disparar, a chance de ser fraude é **bem menor que 99%**, porque a doença (fraude) é rara. Ignorar a taxa base é um dos erros mais comuns em análise de dados.
`),
            sql('Calcule a **taxa de conversão** (P(converter)) por dispositivo, com 4 casas. Colunas: dispositivo, taxa.',
              'SELECT dispositivo, ROUND(AVG(converteu), 4) AS taxa FROM experimento_ab GROUP BY dispositivo;'),
            sql('Qual a probabilidade de um usuário ser do **grupo B dado que converteu**, P(B | converteu)? Uma coluna, 4 casas.',
              "SELECT ROUND(AVG(CASE WHEN grupo = 'B' THEN 1.0 ELSE 0 END), 4) FROM experimento_ab WHERE converteu = 1;",
              { hint: 'Filtre quem converteu e calcule a proporção do grupo B entre eles.' }),
            quiz('Dois usuários independentes, cada um com 10% de chance de comprar. Qual a chance de **os dois** comprarem?', ['20%', '10%', '1%', '0,1%'], 2),
            quiz('Um teste de doença tem 99% de acerto, mas a doença atinge 1 em 10.000 pessoas. Um resultado positivo significa...', ['99% de chance de estar doente', 'Uma chance bem menor, porque a taxa base é muito baixa', '1% de chance', '50%'], 1),
          ],
        },
        {
          id: 'st-2-2', title: 'Distribuição normal e z-score',
          steps: [
            theory('A curva normal', `
A **distribuição normal** (gaussiana) é simétrica em torno da média μ, com dispersão σ. Ela aparece quando um valor é soma de muitos efeitos pequenos e independentes.

**Regra 68–95–99,7**:
- ~68% dos valores ficam entre μ ± 1σ
- ~95% entre μ ± 2σ (mais precisamente ±1,96σ)
- ~99,7% entre μ ± 3σ

O **z-score** padroniza: z = (x − μ) ÷ σ. Assim comparamos valores de escalas diferentes, e a tabela da normal padrão (μ=0, σ=1) dá probabilidades.
`),
            theory('Calculando probabilidades da normal', `
A função de distribuição acumulada Φ(z) dá P(Z ≤ z). Em Python puro:

~~~python
from math import erf, sqrt
def phi(z):
    return 0.5 * (1 + erf(z / sqrt(2)))

phi(1.96)      # 0.975 → 2,5% acima de 1,96
1 - phi(2)     # ≈ 0.0228
# com SciPy: from scipy.stats import norm; norm.cdf(1.96)
~~~

**Teorema Central do Limite (TCL)**: a **média de amostras** tende à normal mesmo quando os dados originais não são normais (com n grande o bastante). É por isso que intervalos de confiança e testes funcionam para médias e proporções.
`),
            py('Escreva a função `phi(z)` (CDF da normal padrão, usando `math.erf`) e crie `p_acima` com a probabilidade de um valor normal ficar **acima** de 1,5 desvios da média.',
              r`from math import erf, sqrt
def phi(z):
    return 0.5 * (1 + erf(z / sqrt(2)))
p_acima = 1 - phi(1.5)`,
              r`assert abs(phi(0) - 0.5) < 1e-12
assert abs(phi(1.96) - 0.9750021) < 1e-6
assert abs(p_acima - 0.0668072) < 1e-6`,
              { starter: 'from math import erf, sqrt\n' }),
            quiz('Numa normal, qual a proporção aproximada de valores entre μ − 2σ e μ + 2σ?', ['68%', '95%', '99,7%', '50%'], 1),
            py('Para a loja **Shopping**, calcule a média `mu` e o desvio amostral `sigma` dos **visitantes**, e `prop_1sigma` com a proporção real de dias dentro de μ ± 1σ (compare com os 68% teóricos).',
              r`v = diarias.loc[diarias["loja"] == "Shopping", "visitantes"]
mu, sigma = v.mean(), v.std()
prop_1sigma = ((v >= mu - sigma) & (v <= mu + sigma)).mean()`,
              r`v = diarias[diarias.loja == "Shopping"].visitantes
assert abs(mu - v.mean()) < 1e-9 and abs(sigma - v.std()) < 1e-9
assert abs(prop_1sigma - ((v >= v.mean() - v.std()) & (v <= v.mean() + v.std())).mean()) < 1e-12
assert 0.5 < prop_1sigma < 0.9`, S),
            quiz('O Teorema Central do Limite garante que...', ['Todos os dados são normais', 'A distribuição da média amostral se aproxima da normal com n grande', 'A mediana é igual à média', 'Outliers desaparecem'], 1),
          ],
        },
        {
          id: 'st-2-3', title: 'Distribuição binomial',
          steps: [
            theory('Contando sucessos', `
A **binomial** modela o número de sucessos em **n tentativas independentes**, cada uma com probabilidade **p**: conversões entre visitantes, cliques entre impressões, defeitos num lote.

- P(X = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ
- **Média** = n·p, **variância** = n·p·(1 − p)
- Para n grande, a binomial ≈ normal com essa média e variância (base do teste de proporções)

~~~python
from math import comb
def binom_pmf(k, n, p):
    return comb(n, k) * p**k * (1 - p)**(n - k)
~~~
`),
            py('Escreva `binom_pmf(k, n, p)` e calcule `p_zero`: a chance de **nenhuma** conversão em 20 visitas com p = 0,1; e `esperado`: o número médio de conversões em 1.000 visitas com p = 0,1.',
              r`from math import comb
def binom_pmf(k, n, p):
    return comb(n, k) * p**k * (1 - p)**(n - k)
p_zero = binom_pmf(0, 20, 0.1)
esperado = 1000 * 0.1`,
              r`assert abs(binom_pmf(2, 5, 0.5) - 0.3125) < 1e-12
assert abs(p_zero - 0.9**20) < 1e-12
assert abs(esperado - 100) < 1e-9`,
              { starter: 'from math import comb\n' }),
            quiz('Numa campanha, 500 pessoas recebem um e-mail e cada uma clica com p = 0,04. Qual o número esperado de cliques?', ['4', '20', '40', '200'], 1),
            quiz('O desvio padrão do número de cliques no exemplo anterior é aproximadamente...', ['4,4', '20', '0,04', '19,2'], 0, 'σ = √(n·p·(1−p)) = √(500·0,04·0,96) = √19,2 ≈ 4,4'),
            order('Ordene os passos para estimar e reportar uma taxa de conversão:', ['Contar conversões', 'Dividir pelo total de usuários', 'Calcular o erro padrão', 'Montar o intervalo de confiança']),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 3
    {
      id: 'st-u3', title: 'Amostragem e intervalos de confiança', description: 'Erro padrão, IC para média e proporção, bootstrap',
      lessons: [
        {
          id: 'st-3-1', title: 'Erro padrão e IC da média',
          steps: [
            theory('Da amostra para a população', `
Quase sempre analisamos uma **amostra** e queremos falar da **população**. A média da amostra varia de amostra para amostra; essa variação é medida pelo **erro padrão**:

**EP = s ÷ √n**

O **intervalo de confiança de 95%** para a média:

**x̄ ± 1,96 · EP**

Interpretação correta: se repetíssemos o processo muitas vezes, **95% dos intervalos** construídos assim conteriam a média verdadeira. Não é "95% de chance de a média estar aqui".

> Quadruplicar o tamanho da amostra só **reduz o erro pela metade** (√4 = 2).
`),
            py('Para o **ticket** (valor_compra) dos usuários do grupo **B que converteram**, calcule `media`, `ep` (erro padrão com desvio amostral) e a tupla `ic95` = (limite inferior, limite superior).',
              r`v = ab.loc[(ab["grupo"] == "B") & (ab["converteu"] == 1), "valor_compra"]
media = v.mean()
ep = v.std() / np.sqrt(len(v))
ic95 = (media - 1.96 * ep, media + 1.96 * ep)`,
              r`v = ab[(ab.grupo == "B") & (ab.converteu == 1)].valor_compra
assert abs(media - v.mean()) < 1e-9
assert abs(ep - v.std() / len(v) ** 0.5) < 1e-9
assert abs(ic95[0] - (v.mean() - 1.96 * ep)) < 1e-9 and ic95[0] < media < ic95[1]`, S),
            quiz('Para reduzir pela metade a largura de um intervalo de confiança, preciso...', ['Dobrar a amostra', 'Quadruplicar a amostra', 'Usar 90% de confiança', 'Remover outliers'], 1),
            sql('Calcule, por grupo, o **erro padrão** do valor da compra entre quem converteu: desvio populacional ÷ raiz de n (2 casas). Colunas: grupo, n, media, ep.',
              'SELECT grupo, COUNT(*) AS n, ROUND(AVG(valor_compra), 2) AS media, ROUND(SQRT(AVG(valor_compra * valor_compra) - AVG(valor_compra) * AVG(valor_compra)) / SQRT(COUNT(*)), 2) AS ep FROM experimento_ab WHERE converteu = 1 GROUP BY grupo;'),
            quiz('Qual a interpretação correta de um IC de 95% de [170, 200] para a média?', ['A média está entre 170 e 200 com 95% de certeza', '95% dos valores estão entre 170 e 200', 'O método gera intervalos que contêm a média verdadeira em 95% das repetições', '5% dos dados são outliers'], 2),
          ],
        },
        {
          id: 'st-3-2', title: 'IC de proporções e bootstrap',
          steps: [
            theory('Intervalo para uma proporção', `
Para uma taxa (conversão, churn, cliques):

- p̂ = sucessos ÷ n
- **EP = √(p̂ · (1 − p̂) ÷ n)**
- IC 95% = p̂ ± 1,96 · EP

Vale bem quando n·p̂ e n·(1−p̂) são maiores que ~10.
`),
            theory('Bootstrap: IC sem fórmula', `
O **bootstrap** reamostra os próprios dados **com reposição** milhares de vezes e calcula a estatística em cada reamostra. Os percentis 2,5 e 97,5 dessas estatísticas formam o IC 95%.

~~~python
rng = np.random.default_rng(0)
medias = [rng.choice(v, size=len(v), replace=True).mean() for _ in range(2000)]
ic = np.percentile(medias, [2.5, 97.5])
~~~

Funciona para **qualquer** estatística (mediana, p90, razão entre médias) e não exige normalidade.
`),
            py('Calcule a taxa de conversão `p_a` do grupo A, seu erro padrão `ep_a` e o intervalo `ic_a` (tupla) de 95%.',
              r`a = ab.loc[ab["grupo"] == "A", "converteu"]
p_a = a.mean()
ep_a = np.sqrt(p_a * (1 - p_a) / len(a))
ic_a = (p_a - 1.96 * ep_a, p_a + 1.96 * ep_a)`,
              r`a = ab[ab.grupo == "A"].converteu
p = a.mean()
assert abs(p_a - p) < 1e-12
assert abs(ep_a - (p * (1 - p) / len(a)) ** 0.5) < 1e-12
assert abs(ic_a[1] - (p + 1.96 * ep_a)) < 1e-12`, S),
            py('Faça um **bootstrap** da **mediana** da receita da loja Online: 1.000 reamostras com `rng = np.random.default_rng(42)` e `rng.choice(..., replace=True)`. Guarde as medianas em `medianas` (array) e o IC 95% em `ic` (array com os percentis 2,5 e 97,5).',
              r`v = diarias.loc[diarias["loja"] == "Online", "receita"].to_numpy()
rng = np.random.default_rng(42)
medianas = np.array([np.median(rng.choice(v, size=len(v), replace=True)) for _ in range(1000)])
ic = np.percentile(medianas, [2.5, 97.5])`,
              r`v = diarias[diarias.loja == "Online"].receita.to_numpy()
assert len(medianas) == 1000
assert ic[0] < np.median(v) < ic[1]
assert ic[1] - ic[0] < np.median(v) * 0.2`, S),
            quiz('Qual a principal vantagem do bootstrap?', ['É exato', 'Dá intervalos para qualquer estatística sem depender de fórmula ou normalidade', 'Não usa computador', 'Dispensa amostras'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 4
    {
      id: 'st-u4', title: 'Testes de hipótese e testes A/B', description: 'Hipóteses, p-valor, teste de proporções, t-test e poder',
      lessons: [
        {
          id: 'st-4-1', title: 'Hipóteses e p-valor',
          steps: [
            theory('A lógica do teste', `
1. **H₀ (hipótese nula)**: não há efeito (ex.: o checkout novo converte igual ao atual)
2. **H₁ (alternativa)**: há efeito
3. Calcule uma **estatística de teste** (ex.: z) a partir dos dados
4. **p-valor**: a probabilidade de observar um resultado **tão extremo quanto este, supondo H₀ verdadeira**
5. Se p-valor < **α** (nível de significância, geralmente 0,05), rejeite H₀

| decisão \\ verdade | H₀ verdadeira | H₀ falsa |
|---|---|---|
| rejeita H₀ | **erro tipo I** (falso positivo, α) | acerto (**poder** = 1 − β) |
| não rejeita | acerto | **erro tipo II** (falso negativo, β) |
`),
            theory('O que o p-valor NÃO é', `
- **Não** é a probabilidade de H₀ ser verdadeira
- **Não** mede o tamanho do efeito: com n gigante, efeitos minúsculos ficam "significativos"
- "Não significativo" **não** prova que não há efeito: pode faltar amostra

Sempre reporte **o efeito com intervalo de confiança** junto do p-valor. Significância estatística ≠ relevância de negócio.
`),
            quiz('O p-valor de 0,03 significa...', ['3% de chance de H₀ ser verdadeira', 'Se H₀ fosse verdadeira, um resultado tão extremo apareceria em ~3% das vezes', 'O efeito é de 3%', '97% de chance de H₁ ser verdadeira'], 1),
            quiz('Rejeitar H₀ quando ela é verdadeira é o...', ['Erro tipo I', 'Erro tipo II', 'Poder do teste', 'Intervalo de confiança'], 0),
            fill('Complete: rejeitamos H₀ quando o p-valor é ___ que α.', 'p_valor ___ alfa', [['<', 'menor']]),
            quiz('Um teste com 10 milhões de usuários deu p < 0,001 para uma melhora de 0,01 ponto percentual na conversão. Conclusão?', ['Lançar imediatamente: é significativo', 'É estatisticamente significativo, mas o efeito pode ser irrelevante para o negócio', 'O teste está errado', 'Precisa de mais usuários'], 1),
          ],
        },
        {
          id: 'st-4-2', title: 'Teste A/B de conversão',
          steps: [
            theory('Teste z para duas proporções', `
Comparando a conversão do grupo A (p̂ₐ, nₐ) com a do B (p̂ᵦ, nᵦ):

1. **Proporção combinada**: p = (conversõesₐ + conversõesᵦ) ÷ (nₐ + nᵦ)
2. **Erro padrão sob H₀**: EP = √(p · (1 − p) · (1/nₐ + 1/nᵦ))
3. **z** = (p̂ᵦ − p̂ₐ) ÷ EP
4. **p-valor bicaudal** = 2 · (1 − Φ(|z|))

Também reporte o **lift**: (p̂ᵦ − p̂ₐ) ÷ p̂ₐ, a melhora relativa.

> A tabela \`experimento_ab\` tem 2.000 usuários do teste do checkout novo (grupo B) contra o atual (A).
`),
            sql('Monte o resumo do teste: por grupo, número de usuários, conversões e taxa (4 casas). Colunas: grupo, usuarios, conversoes, taxa.',
              'SELECT grupo, COUNT(*) AS usuarios, SUM(converteu) AS conversoes, ROUND(AVG(converteu), 4) AS taxa FROM experimento_ab GROUP BY grupo;'),
            sql('Calcule o **lift** relativo (%) do grupo B sobre o A, com 2 casas. Uma coluna chamada lift.',
              "SELECT ROUND(100.0 * (AVG(CASE WHEN grupo = 'B' THEN converteu END) - AVG(CASE WHEN grupo = 'A' THEN converteu END)) / AVG(CASE WHEN grupo = 'A' THEN converteu END), 2) AS lift FROM experimento_ab;"),
            py('Faça o **teste z de duas proporções** entre A e B. Crie `z` e `p_valor` (bicaudal, use `erf`). Por fim, `significativo` = True se p_valor < 0,05.',
              r`from math import erf, sqrt
a = ab[ab["grupo"] == "A"]["converteu"]
b = ab[ab["grupo"] == "B"]["converteu"]
p_pool = (a.sum() + b.sum()) / (len(a) + len(b))
ep = sqrt(p_pool * (1 - p_pool) * (1 / len(a) + 1 / len(b)))
z = (b.mean() - a.mean()) / ep
p_valor = 2 * (1 - 0.5 * (1 + erf(abs(z) / sqrt(2))))
significativo = p_valor < 0.05`,
              r`from math import erf, sqrt
A = ab[ab.grupo == "A"].converteu; B = ab[ab.grupo == "B"].converteu
pp = (A.sum() + B.sum()) / (len(A) + len(B))
zz = (B.mean() - A.mean()) / sqrt(pp * (1 - pp) * (1 / len(A) + 1 / len(B)))
assert abs(z - zz) < 1e-9
assert abs(p_valor - 2 * (1 - 0.5 * (1 + erf(abs(zz) / sqrt(2))))) < 1e-9
assert significativo == (p_valor < 0.05)`,
              { ...S, starter: 'from math import erf, sqrt\n' }),
            quiz('O resultado do teste A/B deu p-valor ≈ 0,02 e lift de ~33%. O que reportar ao time?', ['Só "deu significativo"', 'O lift com intervalo de confiança, o p-valor, o tamanho da amostra e eventuais diferenças por segmento', 'Só o p-valor', 'Que o teste precisa durar mais'], 1),
            sql('Segmente o teste: taxa de conversão por **dispositivo e grupo** (4 casas). Colunas: dispositivo, grupo, taxa. Ordene por dispositivo e grupo.',
              'SELECT dispositivo, grupo, ROUND(AVG(converteu), 4) AS taxa FROM experimento_ab GROUP BY dispositivo, grupo ORDER BY dispositivo, grupo;', { ordered: true }),
          ],
        },
        {
          id: 'st-4-3', title: 't-test e cuidados com testes',
          steps: [
            theory('Comparando médias: teste t de Welch', `
Para comparar **médias** de duas amostras (ex.: ticket de A × ticket de B) sem supor variâncias iguais:

t = (x̄ᵦ − x̄ₐ) ÷ √(sₐ²/nₐ + sᵦ²/nᵦ)

Com amostras grandes (n > 30 em cada grupo), |t| > 1,96 indica diferença significativa a 5%. Para n pequeno, use a distribuição t (\`scipy.stats.ttest_ind(a, b, equal_var=False)\`).
`),
            theory('Armadilhas clássicas de testes A/B', `
- **Espiar o resultado** todo dia e parar quando "deu significativo" infla o erro tipo I
- **Testes múltiplos**: testar 20 métricas a 5% gera ~1 falso positivo esperado (use correção de Bonferroni: α ÷ número de testes)
- **Poder baixo**: amostra pequena não detecta efeitos reais. Calcule o tamanho da amostra **antes** do teste
- **Paradoxo de Simpson**: o efeito pode se inverter quando você segmenta (ex.: por dispositivo)
- **Efeito novidade**: usuários reagem ao novo só por ser novo; rode o teste por ciclos completos (semanas)
`),
            py('Calcule a **estatística t de Welch** comparando o `valor_compra` de quem converteu no grupo B contra o grupo A. Guarde em `t`, e em `diferenca` a diferença das médias (B − A).',
              r`a = ab[(ab["grupo"] == "A") & (ab["converteu"] == 1)]["valor_compra"]
b = ab[(ab["grupo"] == "B") & (ab["converteu"] == 1)]["valor_compra"]
diferenca = b.mean() - a.mean()
t = diferenca / np.sqrt(a.var() / len(a) + b.var() / len(b))`,
              r`A = ab[(ab.grupo == "A") & (ab.converteu == 1)].valor_compra
B = ab[(ab.grupo == "B") & (ab.converteu == 1)].valor_compra
assert abs(diferenca - (B.mean() - A.mean())) < 1e-9
assert abs(t - (B.mean() - A.mean()) / (A.var() / len(A) + B.var() / len(B)) ** 0.5) < 1e-9`, S),
            quiz('Você testou 10 métricas a α = 0,05. Pela correção de Bonferroni, qual α usar em cada uma?', ['0,05', '0,5', '0,005', '0,01'], 2),
            quiz('Olhar o teste todo dia e parar assim que p < 0,05 aparece...', ['É a prática recomendada', 'Aumenta a chance de falso positivo', 'Reduz o erro tipo II sem custo', 'Não muda nada'], 1),
            quiz('A conversão do B é maior em todos os dispositivos, mas menor no total. Esse fenômeno se chama...', ['Regressão à média', 'Paradoxo de Simpson', 'Efeito novidade', 'Viés de sobrevivência'], 1),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 5
    {
      id: 'st-u5', title: 'Correlação e regressão', description: 'Pearson, Spearman, regressão linear e R²',
      lessons: [
        {
          id: 'st-5-1', title: 'Correlação',
          steps: [
            theory('Medindo relação entre variáveis', `
- **Covariância**: indica se duas variáveis variam juntas (o sinal importa, a escala dificulta a leitura)
- **Correlação de Pearson (r)**: covariância padronizada, de −1 a 1, mede relação **linear**
- **Spearman**: Pearson aplicado aos **postos (ranks)**, capta relações monotônicas e é robusta a outliers

| |r| | leitura usual |
|---|---|
| < 0,3 | fraca |
| 0,3 – 0,7 | moderada |
| > 0,7 | forte |

> Correlação **não implica causalidade**: pode haver uma terceira variável (confusão), causalidade reversa ou pura coincidência.
`),
            py('Na tabela `diarias`, calcule a correlação de Pearson entre **visitantes** e **receita** (`r_pearson`) e a de Spearman (`r_spearman`), aplicando Pearson aos postos: `.rank()` em cada coluna.',
              r`r_pearson = diarias["visitantes"].corr(diarias["receita"])
r_spearman = diarias["visitantes"].rank().corr(diarias["receita"].rank())`,
              r`assert abs(r_pearson - diarias.visitantes.corr(diarias.receita)) < 1e-12
assert abs(r_spearman - diarias.visitantes.rank().corr(diarias.receita.rank())) < 1e-12
assert r_pearson > 0.5`,
              { ...S, hint: 'Spearman = Pearson calculado sobre os postos. (O atalho method="spearman" do pandas precisa do SciPy.)' }),
            sql('Calcule a **correlação de Pearson** entre visitantes e receita em SQL puro: (E[XY] − E[X]E[Y]) ÷ (σx · σy), com 4 casas. Uma coluna chamada r.',
              'SELECT ROUND((AVG(visitantes * receita) - AVG(visitantes) * AVG(receita)) / (SQRT(AVG(visitantes * visitantes) - AVG(visitantes) * AVG(visitantes)) * SQRT(AVG(receita * receita) - AVG(receita) * AVG(receita))), 4) AS r FROM vendas_diarias;'),
            quiz('Uma correlação de −0,85 entre preço e quantidade vendida indica...', ['Relação fraca', 'Relação forte e inversa: preço sobe, quantidade cai', 'Que preço causa a queda', 'Erro nos dados'], 1),
            quiz('Quando preferir Spearman a Pearson?', ['Sempre', 'Com outliers ou relação monotônica não linear', 'Só com dados categóricos', 'Nunca'], 1),
          ],
        },
        {
          id: 'st-5-2', title: 'Regressão linear',
          steps: [
            theory('Ajustando uma reta', `
A **regressão linear simples** encontra a reta y = a + b·x que minimiza a soma dos erros ao quadrado (**mínimos quadrados**):

- **b (inclinação)** = cov(x, y) ÷ var(x): quanto y muda, em média, quando x aumenta 1 unidade
- **a (intercepto)** = ȳ − b·x̄
- **R²**: proporção da variação de y explicada pelo modelo (0 a 1). Na regressão simples, R² = r²

~~~python
b, a = np.polyfit(x, y, 1)      # grau 1 → reta
previsto = a + b * x
r2 = 1 - ((y - previsto) ** 2).sum() / ((y - y.mean()) ** 2).sum()
~~~

Para regressão múltipla e diagnóstico (p-valores dos coeficientes, resíduos): \`statsmodels\` ou \`scikit-learn\`.
`),
            py('Ajuste uma regressão de **receita em função de visitantes** com `np.polyfit`. Guarde a inclinação em `b`, o intercepto em `a` e o **R²** em `r2`.',
              r`x = diarias["visitantes"].to_numpy(dtype=float)
y = diarias["receita"].to_numpy(dtype=float)
b, a = np.polyfit(x, y, 1)
previsto = a + b * x
r2 = 1 - ((y - previsto) ** 2).sum() / ((y - y.mean()) ** 2).sum()`,
              r`x = diarias.visitantes.to_numpy(dtype=float); y = diarias.receita.to_numpy(dtype=float)
bb, aa = np.polyfit(x, y, 1)
assert abs(b - bb) < 1e-6 and abs(a - aa) < 1e-3
assert abs(r2 - np.corrcoef(x, y)[0, 1] ** 2) < 1e-9`, S),
            quiz('A regressão deu b = 15. Como interpretar?', ['Cada visitante a mais está associado a ~R$ 15 a mais de receita, em média', 'A receita mínima é 15', '15% da receita é explicada', 'Cada real gera 15 visitantes'], 0),
            quiz('Um R² de 0,64 significa...', ['64% dos pontos estão na reta', 'O modelo explica 64% da variação da receita', 'A correlação é 0,64', 'Erro de 64%'], 1),
            py('Use a regressão do exercício anterior para **prever** a receita de um dia com 900 visitantes. Guarde em `previsao_900`.',
              r`x = diarias["visitantes"].to_numpy(dtype=float)
y = diarias["receita"].to_numpy(dtype=float)
b, a = np.polyfit(x, y, 1)
previsao_900 = a + b * 900`,
              r`bb, aa = np.polyfit(diarias.visitantes.to_numpy(dtype=float), diarias.receita.to_numpy(dtype=float), 1)
assert abs(previsao_900 - (aa + bb * 900)) < 1e-6`, S),
          ],
        },
      ],
    },
    // ───────────────────────────── UNIDADE 6
    {
      id: 'st-u6', title: 'Séries temporais e análise aplicada', description: 'Tendência, sazonalidade, médias móveis e anomalias',
      lessons: [
        {
          id: 'st-6-1', title: 'Sazonalidade e tendência',
          steps: [
            theory('Componentes de uma série', `
Uma série temporal costuma combinar:

- **Tendência**: direção de longo prazo
- **Sazonalidade**: padrão que se repete (dia da semana, mês, fim de ano)
- **Ruído**: variação aleatória

Ferramentas:
- **Agregar** por período para enxergar a sazonalidade (média por dia da semana)
- **Média móvel** para suavizar o ruído e revelar a tendência
- **Comparar com o mesmo período anterior** (YoY, semana contra semana) para descontar a sazonalidade

> Em \`vendas_diarias\`, sexta e sábado vendem mais, domingo menos, e novembro/dezembro têm alta forte.
`),
            sql("Calcule a **receita média por dia da semana** (todas as lojas juntas), com `strftime('%w', data)` (0 = domingo), 2 casas. Colunas: dia_semana, media. Ordene pelo dia.",
              "SELECT strftime('%w', data) AS dia_semana, ROUND(AVG(receita), 2) AS media FROM vendas_diarias GROUP BY dia_semana ORDER BY dia_semana;",
              { ordered: true }),
            sql('Calcule a receita **mensal** (AAAA-MM) somando todas as lojas e a **média móvel de 3 meses** (2 casas). Colunas: mes, receita, media_movel. Ordene por mês.',
              'WITH m AS (SELECT SUBSTR(data, 1, 7) AS mes, SUM(receita) AS receita FROM vendas_diarias GROUP BY mes) SELECT mes, ROUND(receita, 2) AS receita, ROUND(AVG(receita) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS media_movel FROM m ORDER BY mes;',
              { ordered: true }),
            py('Com pandas, crie `semanal`: a receita **total por semana** (todas as lojas) usando `resample("W")` com a data como índice, e `mm4`: a média móvel de 4 semanas dessa série.',
              r`total = diarias.groupby("data")["receita"].sum()
semanal = total.resample("W").sum()
mm4 = semanal.rolling(4).mean()`,
              r`t = diarias.groupby("data").receita.sum().resample("W").sum()
assert len(semanal) == len(t) and abs(semanal.sum() - t.sum()) < 1e-6
assert mm4.isna().sum() == 3`, S),
            quiz('Para saber se dezembro foi bom, a comparação mais justa é com...', ['Novembro', 'Dezembro do ano anterior (YoY)', 'A média do ano', 'Janeiro'], 1),
          ],
        },
        {
          id: 'st-6-2', title: 'Detecção de anomalias',
          steps: [
            theory('Alertas que não enlouquecem o time', `
Uma abordagem simples e eficaz para monitorar métricas diárias:

1. Calcule a **média móvel** e o **desvio móvel** dos últimos N dias (ex.: 28), **sem incluir o dia atual**
2. Calcule o **z-score do dia** contra essa janela
3. Dispare alerta se |z| > 3 (ou outro limiar calibrado)

Comparar com o **mesmo dia da semana** reduz falsos alertas por sazonalidade. Para algo mais sofisticado: decomposição STL, Prophet ou modelos ARIMA.
`),
            py('Para a loja **Online**, calcule a média e o desvio móveis de 28 dias **deslocados 1 dia** (`.shift(1)`) e o z-score de cada dia na coluna `z` do DataFrame `online`. Crie `alertas` com os dias em que |z| > 3.',
              r`online = diarias[diarias["loja"] == "Online"].sort_values("data").copy()
media_movel = online["receita"].rolling(28).mean().shift(1)
desvio_movel = online["receita"].rolling(28).std().shift(1)
online["z"] = (online["receita"] - media_movel) / desvio_movel
alertas = online[online["z"].abs() > 3]`,
              r`o = diarias[diarias.loja == "Online"].sort_values("data")
mm = o.receita.rolling(28).mean().shift(1); sd = o.receita.rolling(28).std().shift(1)
zz = (o.receita - mm) / sd
assert len(alertas) == int((zz.abs() > 3).sum()) and len(alertas) >= 1
assert abs(online["z"].dropna().iloc[0] - zz.dropna().iloc[0]) < 1e-9`, S),
            quiz('Por que deslocar a janela móvel com `.shift(1)`?', ['Para o dia atual não influenciar a própria referência', 'Para ficar mais rápido', 'Para remover nulos', 'Não faz diferença'], 0),
            sql('Quais as **3 maiores receitas diárias** da loja Online e quantas vezes cada uma é maior que a mediana da loja? Colunas: data, receita, vezes_mediana (1 casa). Ordene da maior receita.',
              "SELECT data, receita, ROUND(receita / (SELECT median(receita) FROM vendas_diarias WHERE loja = 'Online'), 1) AS vezes_mediana FROM vendas_diarias WHERE loja = 'Online' ORDER BY receita DESC LIMIT 3;",
              { ordered: true }),
            quiz('Qual técnica é mais adequada para separar tendência e sazonalidade de uma série?', ['Decomposição (ex.: STL)', 'Remover os fins de semana', 'Usar só a mediana', 'Ordenar os valores'], 0),
          ],
        },
      ],
    },
  ],
};
