// Aprofundamento teórico da trilha de Estatística: como calcular cada conceito
// em SQL e em Python, antes dos exercícios que pedem essas contas.
import { theory } from './helpers.js';

export const STATS_THEORY = {
  'st-0-1': [
    theory('Como esta trilha funciona', `
Os exercícios usam **SQL** e **Python (pandas e NumPy)**. Se você ainda não fez as trilhas de SQL e Python, faça pelo menos o nível Básico de cada uma antes: aqui elas são ferramentas, e o foco é o raciocínio estatístico.

**Tabelas que você vai usar:**

| tabela / DataFrame | conteúdo |
|---|---|
| \`vendas_diarias\` / \`diarias\` | 366 dias × 3 lojas (Centro, Shopping, Online): visitantes, pedidos, receita |
| \`experimento_ab\` / \`ab\` | 2.000 usuários de um teste A/B: grupo, dispositivo, converteu (0/1), valor_compra |
| \`avaliacoes\` | notas de 1 a 5 dadas a produtos |

**Contar valores distintos** é o primeiro passo para conhecer uma variável categórica: \`COUNT(DISTINCT coluna)\` no SQL, \`s.nunique()\` no pandas. Poucos valores distintos sugerem uma variável categórica; muitos, uma numérica.

**Variáveis 0/1** (como \`converteu\`) são especiais: a **média** delas é a **proporção** de 1. \`AVG(converteu)\` = taxa de conversão.
`),
  ],
  'st-0-2': [
    theory('Tabelas de frequência em SQL e em Python', `
**Em SQL**, conte por valor e divida pelo total geral com uma window function (\`SUM(...) OVER ()\` soma todas as linhas do resultado):

~~~sql
SELECT nota, COUNT(*) AS qtd,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM avaliacoes GROUP BY nota ORDER BY nota;
~~~

A **frequência acumulada** usa a mesma ideia com ORDER BY dentro do OVER, que soma da primeira linha até a atual: \`SUM(COUNT(*)) OVER (ORDER BY nota)\`.

**Em Python:**
- \`np.histogram(valores, bins=10)\` divide o intervalo entre o mínimo e o máximo em 10 faixas de mesma largura e devolve **duas coisas**: as contagens (10 números) e as bordas (11 números, uma a mais que as faixas)
- \`pd.cut(s, bins=[...])\` atribui cada valor a uma faixa definida por você
- \`value_counts(normalize=True)\` devolve **proporções** em vez de contagens
- \`value_counts()\` ordena da faixa mais frequente para a menos; para voltar à **ordem natural das faixas**, use \`.sort_index()\`, que ordena pelo índice (os rótulos das faixas)
`),
  ],
  'st-1-1': [
    theory('Calculando média, mediana e moda', `
| medida | SQL (este app) | pandas |
|---|---|---|
| média | \`AVG(x)\` | \`s.mean()\` |
| mediana | \`median(x)\` | \`s.median()\` |
| moda | \`GROUP BY x ORDER BY COUNT(*) DESC LIMIT 1\` | \`s.mode()[0]\` |

**Por que pegar o primeiro elemento da moda?** Pode haver empate entre valores mais frequentes, então \`mode()\` devolve uma **Series** com todas as modas, em ordem crescente, e \`mode()[0]\` pega a primeira.

**Média por grupo:** \`AVG(receita) ... GROUP BY loja\` no SQL ou \`df.groupby("loja")["receita"].mean()\` no pandas.

**Para variável categórica**, só a moda faz sentido (qual a loja "média"?). Para variável ordinal (notas de 1 a 5), mediana e moda são mais honestas que a média, porque a distância entre "1" e "2" não é necessariamente igual à distância entre "4" e "5".
`),
  ],
  'st-1-2': [
    theory('Coeficiente de variação na prática', `
**Coeficiente de variação (CV) = desvio padrão ÷ média.** Ele mede a dispersão **em relação ao tamanho** dos valores, sem unidade:

| loja | média | desvio | CV |
|---|---|---|---|
| A | R$ 10.000 | R$ 1.000 | 10% |
| B | R$ 2.000 | R$ 600 | **30%** |

O desvio de A é maior em reais, mas B é **mais instável** proporcionalmente. Use o CV para comparar dispersões de grupos com médias muito diferentes ou unidades diferentes. Ele não faz sentido quando a média é próxima de zero ou quando há valores negativos.

**Em SQL**, o desvio vem da identidade E[X²] − E[X]² (card anterior), e o CV é \`100.0 * desvio / AVG(x)\`.

**Em pandas**, por grupo: \`df.groupby("loja")["receita"].std()\` (amostral). Para um grupo só, filtre com \`loc\` e divida \`s.std() / s.mean()\`.

**Por que pandas e NumPy discordam:** o pandas divide por n − 1 (amostral) e o NumPy por n (populacional). Com n grande, a diferença é mínima; com n pequeno, é relevante.
`),
  ],
  'st-1-3': [
    theory('Outliers dentro de cada grupo', `
Um dia de R$ 9.000 pode ser normal no Shopping e extremo no Centro. Por isso, compare cada valor com **o seu próprio grupo**:

~~~python
g = df.groupby("loja")["receita"]
df["z"] = (df["receita"] - g.transform("mean")) / g.transform("std")
~~~

O \`transform\` devolve a média e o desvio **da loja de cada linha**, alinhados com o DataFrame. Depois, \`(df["z"].abs() > 3).sum()\` conta os dias extremos (\`abs()\` pega o valor absoluto, para considerar os dois lados).

**Em SQL**, compare com a média do grupo numa CTE e faça JOIN, ou use uma window function:

~~~sql
SELECT loja, receita, AVG(receita) OVER (PARTITION BY loja) AS media_loja
FROM vendas_diarias;
~~~

**IQR × z-score:** o z-score usa média e desvio, que **são puxados pelos próprios outliers** (um valor muito extremo aumenta o desvio e "se esconde"). Os quartis quase não se movem com extremos, por isso a regra do IQR é mais robusta.
`),
  ],
  'st-2-1': [
    theory('Probabilidades condicionais a partir de uma tabela', `
Com dados, cada probabilidade é uma **contagem dividida por outra**:

- **P(converteu)** = convertidos ÷ total = \`AVG(converteu)\`
- **P(converteu | desktop)** = convertidos no desktop ÷ usuários do desktop. A condição **restringe o denominador**: \`AVG(converteu) ... WHERE dispositivo = 'desktop'\`, ou \`GROUP BY dispositivo\` para todos de uma vez
- **P(B | converteu)** = convertidos do grupo B ÷ **total de convertidos**. Agora a condição é "converteu", então o denominador são os convertidos:

~~~sql
SELECT ROUND(1.0 * SUM(CASE WHEN grupo = 'B' THEN 1 ELSE 0 END) / COUNT(*), 4)
FROM experimento_ab WHERE converteu = 1;
~~~

Repare que P(B | converteu) e P(converteu | B) são **perguntas diferentes**, com denominadores diferentes. Confundi-las é o erro que o Teorema de Bayes corrige.

**Eventos independentes:** a chance de dois eventos independentes acontecerem juntos é o **produto**: 10% × 10% = 1%.
`),
  ],
  'st-2-2': [
    theory('Normal na prática: proporções e a função erf', `
**A função erf** ("função erro") vem no módulo \`math\` do Python e permite calcular a acumulada da normal sem bibliotecas: Φ(z) = 0,5 · (1 + erf(z ÷ √2)).

- **P(Z ≤ z)** = Φ(z)
- **P(Z > z)** = 1 − Φ(z) (a cauda de cima)
- **P(a < Z < b)** = Φ(b) − Φ(a)

Exemplo: P(Z > 1,5) = 1 − Φ(1,5) ≈ 1 − 0,933 = **0,067**.

**Conferindo a regra 68–95–99,7 nos dados:** calcule média e desvio, crie a máscara dos valores dentro da faixa e tire a média dela (True = 1), que é a **proporção**:

~~~python
dentro = (v >= mu - sigma) & (v <= mu + sigma)
dentro.mean()     # perto de 0,68 se a distribuição for aproximadamente normal
~~~

Se a proporção ficar longe de 68%, a distribuição não é normal (assimétrica, com caudas pesadas ou com dois picos).
`),
  ],
  'st-2-3': [
    theory('Binomial: média, desvio e cálculo', `
**comb(n, k)** (de \`math\`) conta de quantas formas é possível escolher k sucessos entre n tentativas: \`comb(5, 2)\` = 10.

**Probabilidade de nenhum sucesso:** P(X = 0) = (1 − p)ⁿ. Com p = 0,1 e n = 20: 0,9²⁰ ≈ **0,12**. Mesmo com 10% de conversão, há 12% de chance de 20 visitantes não comprarem nada.

**Valor esperado e desvio:**
- E[X] = n · p → 500 e-mails × 4% = **20 cliques esperados**
- DP = √(n · p · (1 − p)) → √(500 × 0,04 × 0,96) = √19,2 ≈ **4,4**

Na prática, entre ~11 e ~29 cliques (média ± 2 desvios) é variação normal; menos que isso merece investigação.

**Fluxo para reportar uma taxa:** defina o que conta como sucesso e o denominador → conte sucessos e tentativas → calcule a taxa → calcule o erro padrão e o intervalo → reporte a taxa **com o intervalo**.
`),
  ],
  'st-3-1': [
    theory('Erro padrão e intervalo em código', `
**Desvio padrão × erro padrão:**
- o **desvio** descreve a variação entre **indivíduos** (quanto um ticket difere do outro)
- o **erro padrão** descreve a incerteza sobre a **média** (quanto a média mudaria com outra amostra)

~~~python
v = ab.loc[filtro, "valor_compra"]
media = v.mean()
ep = v.std() / np.sqrt(len(v))
ic95 = (media - 1.96 * ep, media + 1.96 * ep)
~~~

**Em SQL**, use o desvio da identidade E[X²] − E[X]² dividido por \`SQRT(COUNT(*))\`.

**Largura do intervalo:** ela é proporcional a 1 ÷ √n. Para **reduzir pela metade**, é preciso **4 vezes mais dados**; para reduzir a um terço, 9 vezes.

O 1,96 é o valor z que deixa 2,5% em cada cauda da normal. Para 90%, use 1,645; para 99%, 2,576.
`),
  ],
  'st-3-2': [
    theory('Bootstrap passo a passo', `
**Gerador aleatório.** \`rng = np.random.default_rng(42)\` cria um gerador com **semente** 42: os sorteios ficam reproduzíveis (mesma semente, mesmos números).

**Uma reamostra:** \`rng.choice(v, size=len(v), replace=True)\` sorteia **len(v)** valores **com reposição**: alguns aparecem repetidos e outros ficam de fora. Cada reamostra é uma "amostra alternativa" plausível.

**Receita completa:**

~~~python
estatisticas = np.array([
    np.median(rng.choice(v, size=len(v), replace=True))
    for _ in range(1000)
])
ic95 = np.percentile(estatisticas, [2.5, 97.5])
~~~

- \`_\` é o nome convencional para uma variável de laço que não será usada
- \`np.percentile(x, [2.5, 97.5])\` devolve os dois percentis que delimitam os 95% centrais

**Intervalo de proporção:** com variáveis 0/1, a taxa é \`s.mean()\` e o erro padrão é \`np.sqrt(p * (1 - p) / n)\`.
`),
  ],
  'st-4-1': [
    theory('α, decisão e tamanho da amostra', `
**α é escolhido antes do teste** (geralmente 5%): é o risco de falso positivo que você aceita. A regra de decisão é simples:

- **p-valor < α** → rejeita H₀ (o resultado é "estatisticamente significativo")
- **p-valor ≥ α** → não rejeita H₀ (os dados não são fortes o bastante; não é prova de que não há efeito)

**Exemplo:** p = 0,03 significa "se não houvesse diferença nenhuma, veríamos uma diferença tão grande quanto esta em só 3% dos experimentos". É raro sob H₀, então desconfiamos de H₀.

**Amostras gigantes** tornam significativas diferenças minúsculas. Com 10 milhões de usuários, uma melhora de 0,01 ponto percentual pode ter p < 0,001 e ainda assim **não valer o custo** de implementar. Por isso, antes de decidir, pergunte: **o efeito é grande o bastante para importar?**
`),
  ],
  'st-4-2': [
    theory('Resumo, lift e segmentação do teste', `
**Resumo por grupo** em SQL (a média de uma coluna 0/1 é a taxa):

~~~sql
SELECT grupo, COUNT(*) AS usuarios, SUM(converteu) AS conversoes,
       ROUND(AVG(converteu), 4) AS taxa
FROM experimento_ab GROUP BY grupo;
~~~

**Lift relativo** = (taxa_B − taxa_A) ÷ taxa_A × 100. Para calcular numa única consulta, use **agregação condicional** para ter as duas taxas na mesma linha: \`AVG(CASE WHEN grupo = 'B' THEN converteu END)\` (o CASE sem ELSE devolve NULL para o grupo A, e o AVG ignora os NULL).

**Diferença absoluta × relativa:** de 10% para 13% são **3 pontos percentuais** (absoluta) ou **30%** de lift (relativo). Sempre deixe claro qual você está reportando.

**Valor absoluto:** no teste z bicaudal usamos |z| (\`abs(z)\`), porque um desvio grande para cima ou para baixo conta igualmente como evidência contra H₀.

**Segmentar** (por dispositivo, por exemplo) ajuda a entender, mas cada segmento tem menos dados e mais ruído: segmentos são para gerar hipóteses, não para "procurar" um resultado significativo.
`),
  ],
  'st-4-3': [
    theory('Teste t de Welch em código', `
O teste t compara a diferença entre médias com o seu erro padrão:

~~~python
a = dados_a["valor_compra"]
b = dados_b["valor_compra"]
diferenca = b.mean() - a.mean()
ep = np.sqrt(a.var() / len(a) + b.var() / len(b))
t = diferenca / ep
~~~

- \`.var()\` é a variância amostral (o quadrado do desvio)
- cada grupo contribui com **a sua própria** variância ÷ n: é isso que torna o teste "de Welch" (não supõe variâncias iguais)
- |t| > 1,96 indica diferença significativa a 5% com amostras grandes

**Correção de Bonferroni:** com m testes, use α ÷ m em cada um. Para 10 métricas a 5%: **0,005** por métrica.

**Paradoxo de Simpson:** uma tendência que aparece em todos os segmentos pode se **inverter no total** quando os grupos têm composições diferentes (por exemplo, o grupo B ter muito mais usuários de mobile, que convertem menos).
`),
  ],
  'st-5-1': [
    theory('Correlação em pandas e em SQL', `
**Pearson em pandas:** \`s1.corr(s2)\`.

**Spearman sem SciPy:** Spearman é Pearson aplicado aos **postos**. \`s.rank()\` substitui cada valor pela sua posição na ordenação (o menor vira 1; empates recebem a média das posições):

~~~python
r_spearman = s1.rank().corr(s2.rank())
~~~

**Pearson em SQL puro** com a identidade da covariância:

r = (E[XY] − E[X]·E[Y]) ÷ (σx · σy)

onde cada σ vem de \`SQRT(AVG(x * x) - AVG(x) * AVG(x))\`. Tudo com AVG, numa única consulta.

**Leitura do sinal:** r = −0,85 entre preço e quantidade indica relação **negativa forte**: preços maiores andam com quantidades menores.

**Quando preferir Spearman:** relação monotônica mas não linear (cresce cada vez mais devagar), presença de outliers ou variáveis ordinais.
`),
  ],
  'st-5-2': [
    theory('Regressão com NumPy: ajuste, previsão e R²', `
**np.polyfit(x, y, 1)** ajusta um polinômio de grau 1 (uma reta) por mínimos quadrados e devolve os coeficientes **do maior grau para o menor**: primeiro a inclinação b, depois o intercepto a. Por isso: \`b, a = np.polyfit(x, y, 1)\`.

Converta as colunas para arrays de float antes: \`df["x"].to_numpy(dtype=float)\`.

**Prever** é aplicar a reta: \`a + b * 900\` dá a receita esperada para 900 visitantes.

**Interpretando:**
- b = 15 → **cada visitante a mais está associado, em média, a R$ 15 a mais de receita**
- R² = 0,64 → o modelo explica **64% da variação** da receita; os outros 36% vêm de fatores fora do modelo e ruído
- **Associação não é causa:** b mede como as variáveis andam juntas, não o que aconteceria se você aumentasse os visitantes artificialmente

**Cuidado ao extrapolar:** a reta só é confiável dentro da faixa de x observada.
`),
  ],
  'st-7-1': [
    theory('Qui-quadrado em código', `
**Tabela de contingência** em pandas: \`obs = pd.crosstab(ab["dispositivo"], ab["converteu"])\`. Em SQL, use agregação condicional (\`SUM(CASE WHEN converteu = 1 THEN 1 ELSE 0 END)\`) para ter uma coluna por resposta.

**Esperado sob independência:** cada célula é total da linha × total da coluna ÷ total geral. O NumPy faz todas as células de uma vez com o **produto externo** \`np.outer(a, b)\`, que monta a matriz com todos os produtos aᵢ · bⱼ:

~~~python
linhas = obs.sum(axis=1)      # total de cada dispositivo
colunas = obs.sum(axis=0)     # total de cada resposta
esperado = np.outer(linhas, colunas) / obs.to_numpy().sum()
chi2 = ((obs.to_numpy() - esperado) ** 2 / esperado).sum()
~~~

**Decisão:** compare o χ² com o valor crítico dos graus de liberdade. χ² = 7,2 com 2 graus de liberdade (crítico 5,99) → **rejeita a independência**: a conversão depende do dispositivo.
`),
  ],
  'st-7-2': [
    theory('ANOVA em código', `
As somas de quadrados saem de um groupby:

~~~python
media_geral = df["receita"].mean()
g = df.groupby("loja")["receita"]
ss_entre = (g.count() * (g.mean() - media_geral) ** 2).sum()
ss_dentro = ((df["receita"] - g.transform("mean")) ** 2).sum()
k, N = g.ngroups, len(df)
F = (ss_entre / (k - 1)) / (ss_dentro / (N - k))
~~~

- **SQ entre**: para cada loja, n da loja × (média da loja − média geral)²
- **SQ dentro**: cada valor contra a média **da sua loja** (\`transform\`)
- os divisores (k − 1) e (N − k) são os **graus de liberdade**

**Em SQL**, calcule a média geral numa CTE, as médias e contagens por loja em outra, e some \`n * (media_loja - media_geral) * (media_loja - media_geral)\`.

**O que a ANOVA conclui:** que **pelo menos uma** média difere, mas não qual. Para isso, faça um teste post hoc (Tukey). Com dados muito assimétricos, a alternativa não paramétrica é o **Kruskal-Wallis**.
`),
  ],
  'st-6-1': [
    theory('Sazonalidade em SQL e pandas', `
**Dia da semana em SQL:** \`strftime('%w', data)\` devolve 0 (domingo) a 6 (sábado). Agrupe por ele e tire a média.

**Receita mensal com média móvel:** primeiro agregue por mês numa CTE (\`strftime('%Y-%m', data)\`), depois aplique a janela:

~~~sql
AVG(receita) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
~~~

**Em pandas**, some as lojas por data e reamostre:

~~~python
total = diarias.groupby("data")["receita"].sum()   # índice = data
semanal = total.resample("W").sum()
mm4 = semanal.rolling(4).mean()
~~~

\`rolling(4)\` só calcula quando há 4 valores na janela; os 3 primeiros ficam NaN.

**Comparação justa:** um dezembro forte pode ser só sazonalidade. Compare com **dezembro do ano anterior** (YoY), não com novembro.
`),
  ],
  'st-6-2': [
    theory('Janelas móveis sem olhar o futuro', `
Para avaliar se **hoje** é anômalo, a referência precisa ser construída **só com o passado**:

~~~python
media_movel = s.rolling(28).mean().shift(1)
desvio_movel = s.rolling(28).std().shift(1)
z = (s - media_movel) / desvio_movel
~~~

- \`rolling(28).mean()\` na linha de hoje inclui hoje
- \`.shift(1)\` desloca uma posição, então cada dia passa a ser comparado com os **28 dias anteriores**
- sem o shift, um pico de hoje inflaria a própria média e o próprio desvio, **escondendo a anomalia** (vazamento de informação)

Antes de usar janelas, **ordene por data** (\`sort_values("data")\`) e trabalhe com uma loja por vez.

**Comparar com a mediana** em vez da média dá uma referência robusta para "quantas vezes maior que o normal".

**Decomposição STL** separa a série em tendência + sazonalidade + resíduo, e é a técnica indicada para isolar os componentes antes de procurar anomalias no resíduo.
`),
  ],
  'st-6-3': [
    theory('Autocorrelação e erros de previsão em pandas', `
**Autocorrelação:** \`s.autocorr(7)\` é a correlação entre a série e ela mesma 7 períodos atrás. Valores altos no lag 7 em dados diários indicam padrão semanal.

**Previsão ingênua sazonal:** \`prev = s.shift(7)\`. As 7 primeiras posições ficam **NaN**, porque não há semana anterior.

**Avalie só onde há previsão:** \`ok = prev.notna()\` cria uma máscara True onde o valor **não é nulo** (\`notna\` é o oposto de \`isna\`). Depois:

~~~python
erro = (s[ok] - prev[ok]).abs()
mae = erro.mean()
mape = (erro / s[ok].abs()).mean() * 100
~~~

**MAPE e zeros:** dividir pelo valor real explode quando ele é perto de zero (um erro de 5 sobre um real de 0,1 vira 5.000%).

**Regra de ouro:** um modelo só vale a pena se tiver **erro menor que a baseline**. Se o seu modelo perde para "repetir a semana passada", ele está atrapalhando.
`),
  ],
  'st-9-1': [
    theory('Permutação e postos em código', `
**Embaralhar rótulos:** \`rng.permutation(g)\` devolve uma cópia do array com os elementos em **ordem aleatória** (o original não muda). Embaralhando a máscara de grupo, cada valor recebe um rótulo aleatório, mantendo o tamanho dos grupos:

~~~python
obs = x[g].mean() - x[~g].mean()        # g: True para o grupo B
difs = []
for _ in range(2000):
    gp = rng.permutation(g)
    difs.append(x[gp].mean() - x[~gp].mean())
p_valor = (np.abs(difs) >= abs(obs)).mean()
~~~

\`~g\` inverte a máscara (o grupo A). O p-valor bicaudal é a proporção de diferenças embaralhadas tão grandes quanto a observada, em valor absoluto.

**Postos para o Mann-Whitney:** \`dados["valor"].rank()\` dá a posição de cada valor entre **todos** os dados (os dois grupos juntos). Some os postos do grupo A (R₁) e aplique U = R₁ − n₁(n₁ + 1) ÷ 2. Como só a ordem importa, um outlier gigante conta apenas como "o maior posto".
`),
  ],
  'st-9-2': [
    theory('Implementando as correções', `
Os dois métodos começam igual: **ordenar os p-valores** sem perder a posição original. \`sorted(range(m), key=lambda i: pvals[i])\` devolve os **índices** em ordem crescente de p-valor.

**Holm** (passo a passo para baixo):
1. Percorra os p-valores do menor para o maior (passo = 0, 1, 2, ...)
2. Compare com α ÷ (m − passo)
3. Rejeite enquanto passar; **no primeiro que falhar, pare** (todos os seguintes também não são rejeitados)

**Benjamini-Hochberg:**
1. Percorra em ordem (k = 1, 2, ..., m)
2. Guarde o **maior k** em que p₍ₖ₎ ≤ (k ÷ m) · q
3. Rejeite **todas** as hipóteses de posição 1 a k, mesmo que alguma delas, isoladamente, não tenha passado

\`enumerate(ordem, start=1)\` numera a partir de 1, o que facilita escrever k ÷ m. Monte a resposta como uma lista de False do tamanho m e marque True nas posições originais rejeitadas.
`),
  ],
  'st-10-1': [
    theory('Mínimos quadrados com várias colunas', `
**Montando a matriz X:**
1. \`pd.get_dummies(df[["visitantes", "loja"]], drop_first=True, dtype=float)\` mantém visitantes e troca loja por colunas 0/1, descartando a primeira categoria (a **referência**)
2. \`X.insert(0, "const", 1.0)\` adiciona a coluna de 1 do intercepto na posição 0

**Resolvendo:** \`np.linalg.lstsq(X, y, rcond=None)\` encontra os β que minimizam a soma dos erros ao quadrado. Ele devolve 4 coisas; \`beta, *_ = ...\` guarda a primeira e descarta o resto (o \`*_\` junta "todo o resto" numa variável ignorada).

Os coeficientes saem **na ordem das colunas de X**: const, visitantes, loja_Online, loja_Shopping.

**Interpretação de uma dummy:** coeficiente de loja_Online = 1.200 significa que, **com o mesmo número de visitantes**, a loja Online fatura em média R$ 1.200 a mais que a loja de referência (Centro).

**R² ajustado:** com n = 1.098, p = 3 e R² = 0,64, a penalidade é pequena (n é grande). Com poucos dados e muitas variáveis, a diferença entre R² e R² ajustado fica grande.
`),
  ],
  'st-10-2': [
    theory('Montando a matriz e lendo a logística', `
**np.column_stack** junta arrays 1D como **colunas** de uma matriz 2D:

~~~python
X = np.column_stack([
    np.ones(len(ab)),                            # intercepto
    (ab["grupo"] == "B").astype(float),          # 1 se B
    (ab["dispositivo"] == "desktop").astype(float),
])
# shape (2000, 3)
~~~

**Função sigmoide:** \`1 / (1 + np.exp(-z))\` transforma qualquer número em uma probabilidade entre 0 e 1.

**Lendo os coeficientes:**
- **razão de chances** de uma variável = \`np.exp(beta[j])\`. OR = 1,4 → as **chances** (não a probabilidade) ficam 40% maiores
- **probabilidade para um perfil**: some os coeficientes das variáveis ativas e aplique a sigmoide. Grupo B no mobile (desktop = 0): p = sigmoide(β₀ + β₁)

**Por que não regressão linear para 0/1:** ela pode prever valores abaixo de 0 ou acima de 1, supõe efeito constante em toda a escala e tem erros com variância não constante.
`),
  ],
  'st-11-1': [
    theory('MDE e poder em código', `
**Fórmula do MDE** com α = 5% e poder = 80%:

~~~python
from math import sqrt
def mde(p, n):
    return (1.959964 + 0.841621) * sqrt(2 * p * (1 - p) / n)
~~~

1,959964 é o z bicaudal de 5%, e 0,841621 é o z que deixa 80% abaixo. O n é **por grupo**.

**Poder por simulação:** sorteie muitos experimentos em que o efeito existe e conte em quantos o teste detecta:

- \`rng.binomial(n, p, sims)\` sorteia, de uma vez, **sims** contagens de sucessos em n tentativas; dividido por n, vira a taxa observada de cada experimento simulado
- aplique o teste z vetorizado a todos os experimentos
- **poder** = proporção de experimentos com |z| > 1,96

**Efeito realista menor que o MDE:** o teste quase nunca vai detectá-lo. Aumente a amostra (MDE cai com √n), reduza a variância (CUPED) ou teste uma mudança mais ousada.
`),
  ],
  'st-11-2': [
    theory('CUPED em código', `
~~~python
theta = np.cov(exp["pre"], exp["pos"])[0, 1] / np.var(exp["pre"], ddof=1)
y_cuped = exp["pos"] - theta * (exp["pre"] - exp["pre"].mean())
reducao = 1 - y_cuped.var() / exp["pos"].var()
~~~

- \`np.cov(x, y)\` devolve a **matriz** de covariância 2×2: [[var(x), cov], [cov, var(y)]]. O elemento \`[0, 1]\` é a covariância entre x e y
- \`np.var(x, ddof=1)\` é a variância amostral, coerente com a covariância (que também usa n − 1)

**Por que a covariável precisa ser anterior ao experimento:** se fosse medida durante o teste, poderia ser **afetada pelo tratamento**, e subtraí-la removeria parte do próprio efeito que queremos medir.

**Quanto a variância cai:** o fator é 1 − ρ². Com ρ = 0,6, cai 0,36 = **36%**.

**Erro padrão da diferença** entre grupos: \`np.sqrt(var_a / n_a + var_b / n_b)\`. Compare-o com a métrica original e com a CUPED para ver o ganho.
`),
  ],
  'st-12-1': [
    theory('Posteriores Beta em código', `
**Atualização Beta-Binomial:** com prior Beta(a₀, b₀), s sucessos e n tentativas, a posterior é **Beta(a₀ + s, b₀ + n − s)**: os sucessos somam no primeiro parâmetro e os fracassos no segundo.

~~~python
def posterior(conv, a0=1, b0=1):
    s = int(conv.sum())
    n = len(conv)
    return (a0 + s, b0 + n - s)
~~~

Exemplo: prior Beta(2, 18) e 30 conversões em 100 usuários → Beta(2 + 30, 18 + 70) = **Beta(32, 88)**.

**Amostrando:** \`rng.beta(a, b, 100_000)\` sorteia 100 mil valores da distribuição Beta(a, b). O \`_\` em 100_000 é só um separador visual de milhar.

**P(B > A):** compare as amostras posição a posição e tire a média da máscara: \`(amostras_b > amostras_a).mean()\`.

**Intervalo de credibilidade de 95% [0,12; 0,16]:** dado o modelo e o prior, há 95% de probabilidade de a taxa estar entre 12% e 16%.
`),
  ],
  'st-12-2': [
    theory('Perda esperada e média bayesiana em código', `
Com as amostras das posteriores \`a\` e \`b\` (arrays do mesmo tamanho):

~~~python
lift = b / a - 1                              # lift em cada amostra
ic_lift = np.percentile(lift, [2.5, 97.5])
perda_b = np.maximum(a - b, 0).mean()         # quanto se perde, em média, escolhendo B
~~~

**np.maximum(x, 0)** compara **elemento a elemento** e fica com o maior: onde B é melhor (a − b negativo), a perda é 0; onde A é melhor, a perda é a diferença. Não confunda com \`np.max\`, que devolve um único número (o maior do array).

**Média bayesiana das notas por produto:**

~~~python
m = avaliacoes["nota"].mean()          # média global
g = avaliacoes.groupby("produto_id")["nota"]
bayes = (C * m + g.sum()) / (C + g.count())
~~~

Em SQL: calcule \`m\` numa CTE e use \`(20 * m + SUM(nota)) / (20 + COUNT(*))\` agrupando por produto.

**Por que serve para rankear:** um produto com 2 notas 5 é puxado para perto da média global até acumular evidência; com muitas avaliações, a média bayesiana se aproxima da média simples.
`),
  ],
  'st-13-1': [
    theory('Encontrando o máximo da verossimilhança', `
**Busca em grade:** avalie a log-verossimilhança em muitos valores candidatos e fique com o melhor:

~~~python
grade = np.linspace(0.01, 0.99, 981)          # 981 candidatos igualmente espaçados
valores = [loglik(p, y) for p in grade]
p_mle = grade[np.argmax(valores)]
~~~

\`np.argmax(valores)\` devolve a **posição** do maior valor; \`grade[posição]\` traz o p correspondente. (\`np.max\` daria o valor da verossimilhança, não o p.)

A grade começa em 0,01 e termina em 0,99 porque \`np.log(0)\` é −infinito.

**Exponencial:** o MLE tem fórmula fechada, λ̂ = 1 ÷ média, e a log-verossimilhança no máximo é n·ln λ − λ·Σx.

**AIC = 2k − 2·ln L:** com k = 1 parâmetro, AIC = 2 − 2·loglik. Entre modelos, **menor AIC é melhor** (798 < 812).

**MLE da variância normal:** divide por **n** (e não n − 1), por isso é levemente viesado para baixo em amostras pequenas.
`),
  ],
  'st-13-2': [
    theory('Simulando com incerteza em duas camadas', `
Para prever as vendas do próximo mês, há **duas fontes de incerteza**:

1. **Não sabemos a taxa** exata: ela vem de uma posterior, θ ~ Beta(141, 861)
2. **Mesmo com a taxa certa**, o número de vendas varia (binomial)

~~~python
theta = rng.beta(141, 861, 20_000)        # 20 mil taxas plausíveis
vendas = rng.binomial(2000, theta)        # uma venda simulada para cada taxa
prob_meta = (vendas >= 270).mean()
ic90 = np.percentile(vendas, [5, 95])
~~~

\`rng.binomial(2000, theta)\` aceita um **array** de probabilidades e sorteia um resultado para cada uma.

Usar só a taxa média ignora a camada 1 e produz intervalos **estreitos demais**: confiança exagerada.

**Precisão da simulação:** o erro cai com 1 ÷ √N. Para reduzir o erro pela metade, simule **4 vezes** mais cenários (10.000 → 40.000).
`),
  ],
  'st-14-1': [
    theory('Calculando o DiD', `
**Pelas médias dos quatro grupos:**

~~~python
m = painel.groupby(["tratado", "depois"])["receita"].mean()
did = (m[(1, 1)] - m[(1, 0)]) - (m[(0, 1)] - m[(0, 0)])
~~~

Agrupar por duas colunas cria um **índice de dois níveis**; \`m[(1, 0)]\` acessa a média de tratado = 1 e depois = 0.

**Por regressão** com o termo de interação:

~~~python
X = np.column_stack([
    np.ones(len(painel)), painel["tratado"], painel["depois"],
    painel["tratado"] * painel["depois"],
]).astype(float)
beta, *_ = np.linalg.lstsq(X, painel["receita"].to_numpy(dtype=float), rcond=None)
did = beta[3]
~~~

As duas formas dão **o mesmo número**; a regressão permite adicionar controles e calcular erros padrão.

**Viés de colisor:** "foi internado" é causado pelos dois fatores de risco. Analisar só internados (controlar o colisor) cria uma associação falsa entre eles.
`),
  ],
  'st-14-2': [
    theory('Estratificação em código', `
**Efeito ingênuo:** média dos tratados − média dos não tratados. Está contaminado pelo confundidor (idade).

**Estratificação:**
1. Divida em faixas da variável de confusão: \`pd.cut(clientes["idade"], 5)\` cria 5 faixas de mesma largura
2. Em cada faixa, calcule a diferença de médias entre tratados e controles
3. Combine as diferenças numa **média ponderada** pelo número de clientes (ou de tratados) de cada faixa

~~~python
efeito = np.average(efeitos, weights=pesos)
~~~

\`np.average(valores, weights=pesos)\` = Σ(valor × peso) ÷ Σ(peso). Faixas maiores pesam mais. (\`np.mean\` daria o mesmo peso a todas as faixas.)

**Positividade:** se uma faixa só tem tratados, não há com quem comparar: a faixa não pode entrar na estimativa (e isso precisa ser reportado).

**Limite:** o escore de propensão corrige apenas confundidores **observados**; um fator não medido continua enviesando o resultado.
`),
  ],
  'st-15-1': [
    theory('Simulando testes A/A e verificando SRM', `
**Teste A/A** é um teste em que os dois grupos recebem a mesma versão: qualquer "significância" é falso positivo. Simulando muitos testes A/A e espiando em vários momentos, mede-se o quanto espiar infla o erro:

- \`rng.random(2000) < 0.10\` gera 2.000 usuários com 10% de chance de converter (True/False)
- \`range(200, 2001, 200)\` são os momentos das espiadas: 200, 400, ..., 2.000 usuários
- em cada espiada, calcule o teste z com os primeiros n usuários (\`a[:n]\`); se der |z| > 1,96 em **qualquer** espiada, conte um falso positivo e pare (\`break\`)

**SRM em SQL:** o esperado em cada grupo é metade do total. Calcule com agregação condicional:

~~~text
χ² = (nA − N/2)² / (N/2) + (nB − N/2)² / (N/2)
~~~

Com 50.400 × 49.600 (N = 100.000), χ² = 6,4: acima de 3,84, há **desbalanceamento real**. Investigue a atribuição antes de olhar qualquer resultado.
`),
  ],
  'st-15-2': [
    theory('Thompson Sampling em código', `
Cada variante tem uma posterior Beta(sucessos, fracassos), começando em Beta(1, 1):

~~~python
for _ in range(3000):
    amostras = rng.beta(sucessos, fracassos)   # uma taxa sorteada por variante
    i = np.argmax(amostras)                    # escolhe a que sorteou a maior
    converteu = rng.random() < taxas[i]        # mostra a variante i a um usuário
    sucessos[i] += converteu
    fracassos[i] += 1 - converteu
    escolhas[i] += 1
~~~

- \`rng.beta\` com arrays sorteia uma amostra de cada posterior de uma vez
- \`np.argmax\` devolve o **índice** da variante vencedora deste sorteio
- variantes incertas às vezes sorteiam valores altos e são **exploradas**; a melhor vence a maioria dos sorteios e recebe cada vez mais tráfego

**Desvantagem frente ao A/B:** como o tráfego fica desbalanceado, a estimativa do efeito das variantes ruins é imprecisa, e a inferência estatística clássica deixa de valer.
`),
  ],
  'st-15-3': [
    theory('Kaplan-Meier passo a passo', `
Para cada tempo t em que houve cancelamento (em ordem crescente):

1. **Em risco (nᵢ):** clientes com tempo observado **≥ t** (ainda estavam lá no início de t)
2. **Eventos (dᵢ):** clientes com tempo = t **e** que cancelaram
3. Atualize: S = S × (1 − dᵢ ÷ nᵢ)

~~~python
s = 1.0
for t in sorted(df.loc[df["cancelou"] == 1, "meses"].unique()):
    em_risco = (df["meses"] >= t).sum()
    eventos = ((df["meses"] == t) & (df["cancelou"] == 1)).sum()
    s *= 1 - eventos / em_risco
~~~

Os **censurados** (cancelou = 0) nunca contam como evento, mas **contam como em risco** até o seu último tempo observado: é assim que a informação parcial deles é aproveitada.

**Mediana de sobrevivência:** o primeiro tempo em que S(t) ≤ 0,5. Com o resultado num DataFrame: \`km.loc[km["sobrevivencia"] <= 0.5, "tempo"].iloc[0]\`.

**Comparando curvas** de dois grupos: teste **log-rank**.
`),
  ],
};
