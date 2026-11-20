// Estatística — Nível 1 (complementos): método, medidas robustas, visualização, qualidade dos dados e armadilhas
import { theory, quiz, order, py, exPy } from '../helpers.js';
import { P, PM } from './dados.js';

const r = String.raw;

export const L_METODO = {
  id: 'st-20-0', title: 'Como um estatístico de dados pensa',
  steps: [
    theory('O algoritmo antes da fórmula', `
Este curso leva você do zero até o nível de **analista de dados sênior, cientista de dados ou analytics engineer**: alguém que embasa decisões com rigor, desenha experimentos confiáveis e coloca modelos em produção. O foco é **raciocínio e decisão**, não decorar fórmulas.

Todo método novo será estudado respondendo a **4 perguntas, nesta ordem**:

1. **Qual problema de negócio isso resolve?** ("o novo checkout aumentou a conversão?", "quanto vamos faturar no trimestre?")
2. **Quais são as premissas obrigatórias?** (independência, normalidade das médias, variâncias, ausência de vazamento...). Premissa violada = resposta errada com cara de certa
3. **Como rodar e validar no código?** (calcular, conferir pressupostos, checar o resultado por outro caminho: simulação, bootstrap, gráfico)
4. **Como explicar a um diretor que não sabe o que é p-valor?** ("com os dados atuais, o ganho mais provável é de 0,8 ponto, entre 0,3 e 1,3; vale lançar")

**Proibido "apertar botão":** nenhum teste ou modelo roda antes de você **olhar os dados** (distribuição, outliers, faltantes) e **verificar os pressupostos** (variância, resíduos, multicolinearidade). Um p-valor sobre dados sujos é só um número bonito.

**Dados reais são sujos:** valores faltantes (com causas diferentes), duplicatas, erros de digitação, distribuições muito assimétricas e **vazamento de dados** (informação do futuro entrando no modelo). Os exercícios usam bases com esses problemas de propósito.
`),
    theory('O mapa da trilha e as ferramentas', `
| nível | foco | entregável de portfólio |
|---|---|---|
| **1. Descritiva** | entender, limpar e resumir sem distorcer | diagnóstico executivo de uma base de faturamento B2B |
| **2. Probabilidade e distribuições** | quantificar incerteza e risco | simulador de Monte Carlo de receita trimestral |
| **3. Inferência e testes A/B** | separar efeito real de ruído | framework completo de teste A/B (amostra + análise + go/no-go) |
| **4. Modelagem e séries temporais** | explicar causas e prever | drivers de conversão + previsão de receita de 6 meses |
| **5. Sênior: causal, bayesiana, sobrevivência** | causalidade sem experimento, risco e tempo | ROI causal de campanha + curva de churn |

**Ferramentas do mercado:**
- exploração rápida: **SQL** (agregações e percentis no banco) e planilhas (validação e comunicação com o negócio)
- Python: \`pandas\`/\`polars\`, \`numpy\`, \`matplotlib\`, \`seaborn\`, \`plotly\`; testes: \`scipy.stats\`, \`statsmodels\`, \`pingouin\`; séries: \`statsmodels.tsa\`, \`prophet\`, \`sktime\`; sênior: \`pymc\` (bayesiana), \`lifelines\` (sobrevivência), \`dowhy\`/\`econml\` (causal)
- **R** (\`tidyverse\`, \`lme4\`, \`forecast\`, \`survival\`) continua forte em estatística de ponta: vale saber ler

**No app**, o Python roda offline com \`numpy\`, \`pandas\` e \`matplotlib\`. Por isso você vai **implementar** os métodos (teste t, bootstrap, regressão, Kaplan-Meier, Cox, MCMC...) com numpy: é o melhor jeito de entender o que as bibliotecas fazem. Cada lição mostra também o código equivalente com \`scipy\`/\`statsmodels\`, que você usará no trabalho.
`),
    order('Ordene as 4 perguntas que guiam cada método:', ['qual problema de negócio resolve', 'quais premissas são obrigatórias', 'como rodar e validar no código', 'como explicar para quem decide']),
    quiz('Você recebeu uma base e o gestor quer "o p-valor da diferença entre regiões" em 10 minutos. O que fazer primeiro?', ['Olhar distribuição, faltantes, duplicatas e outliers antes de qualquer teste', 'Rodar o teste t imediatamente', 'Remover todos os outliers', 'Usar só a média'], 0),
    quiz('Por que implementar métodos com numpy mesmo existindo bibliotecas prontas?', ['Para entender as premissas e o que cada número significa, e saber quando a biblioteca está sendo mal usada', 'Porque as bibliotecas estão erradas', 'Porque é mais rápido no trabalho', 'Não há motivo'], 0),
  ],
};

export const L_ROBUSTAS = {
  id: 'st-20-1', title: 'Média ponderada, coeficiente de variação e medidas robustas',
  steps: [
    theory('Quando a média simples não serve', `
**1. Problema:** "qual é o desconto médio que damos?" e "o ticket médio subiu?" parecem perguntas simples, mas a resposta muda conforme **quem pesa quanto**.

**Média ponderada:** \`Σ(peso × valor) ÷ Σ peso\`. Ex.: desconto médio **por real faturado** pondera cada fatura pelo seu valor; desconto médio **por fatura** dá o mesmo peso a uma fatura de R$ 200 e a uma de R$ 200 mil. As duas respostas são corretas para perguntas diferentes.

**Coeficiente de variação (CV)** = desvio-padrão ÷ média. Compara dispersão entre grupos de escalas diferentes: um CV de 0,2 numa carteira de R$ 50 mil é "mais estável" que um CV de 0,9 numa de R$ 2 mil.

**Medidas robustas** (pouco afetadas por extremos):
| medida | como calcula | resiste a |
|---|---|---|
| **mediana** | valor do meio | até 50% de valores extremos |
| **média aparada** (*trimmed*) 10% | descarta 10% de cada ponta e tira a média | poucos extremos |
| **IQR** | Q3 − Q1 | extremos nas pontas |
| **MAD** | mediana de \\|x − mediana\\| | quase tudo; ×1,4826 vira um "desvio-padrão robusto" para dados normais |

**2. Premissas:** média e desvio-padrão supõem que os extremos são legítimos e que a distribuição não é muito assimétrica. Com cauda longa (receita!), reporte também mediana e MAD.

**4. Para o diretor:** "O cliente típico paga R$ 2 mil por fatura (mediana); a média de R$ 6 mil é puxada por poucos clientes Enterprise".
`),
    exPy('Média simples × ponderada, CV e MAD por segmento', `
`, r`ok = faturas.dropna(subset=["valor"])
ok = ok[ok["valor"] > 0]
desc_simples = ok["desconto_pct"].mean()
desc_ponderado = (ok["desconto_pct"] * ok["valor"]).sum() / ok["valor"].sum()
print(f"desconto médio por fatura: {desc_simples:.2f}% | por real faturado: {desc_ponderado:.2f}%")

def mad(x):
    return (x - x.median()).abs().median()

resumo = ok.groupby("segmento")["valor"].agg(["count", "mean", "median", "std", mad])
resumo["cv"] = resumo["std"] / resumo["mean"]
resumo.round(2)`, `
As médias ficam bem acima das medianas e os CVs são altos: cauda longa. O segmento \`pme\` minúsculo aparece separado (problema de qualidade que você vai tratar adiante).
`, P),
    quiz('O desconto médio por fatura é 5,0% e o ponderado pelo valor é 3,2%. O que isso indica?', ['Faturas grandes recebem, em média, descontos menores', 'Há erro de cálculo', 'Faturas grandes têm mais desconto', 'As duas médias deveriam ser iguais'], 0),
    py('Calcule o **desconto médio ponderado pelo valor** das faturas com valor positivo (ignore faltantes) e guarde em `desc_pond`.',
      r`ok = faturas[faturas["valor"] > 0]
desc_pond = (ok["desconto_pct"] * ok["valor"]).sum() / ok["valor"].sum()`,
      r`_o = faturas[faturas.valor > 0]
assert abs(desc_pond - (_o.desconto_pct * _o.valor).sum() / _o.valor.sum()) < 1e-9`, P),
    py('Para as faturas com valor positivo, calcule por `segmento` a **média aparada a 10%** do valor (descarte valores abaixo do percentil 10 e acima do 90 de cada segmento e tire a média). Guarde uma Series `aparada` indexada por segmento.',
      r`def media_aparada(x):
    lo, hi = x.quantile(0.1), x.quantile(0.9)
    return x[(x >= lo) & (x <= hi)].mean()

aparada = faturas[faturas["valor"] > 0].groupby("segmento")["valor"].apply(media_aparada)`,
      r`_o = faturas[faturas.valor > 0]
for s, x in _o.groupby("segmento").valor:
    lo, hi = x.quantile(0.1), x.quantile(0.9)
    assert abs(aparada[s] - x[(x >= lo) & (x <= hi)].mean()) < 1e-6
assert set(aparada.index) == set(_o.segmento.unique())`, P),
    py('Calcule o **desvio-padrão robusto** do valor das faturas positivas: `1.4826 × MAD`. Guarde em `dp_robusto` e o desvio-padrão comum em `dp`.',
      r`v = faturas.loc[faturas["valor"] > 0, "valor"]
dp_robusto = 1.4826 * (v - v.median()).abs().median()
dp = v.std()`,
      r`_v = faturas.valor[faturas.valor > 0]
assert abs(dp_robusto - 1.4826 * (_v - _v.median()).abs().median()) < 1e-6
assert abs(dp - _v.std()) < 1e-6 and dp > dp_robusto`, P),
  ],
};

export const L_VISUAL = {
  id: 'st-20-2', title: 'Visualização estatística: histograma, densidade, boxplot, violino e dispersão',
  steps: [
    theory('Cada gráfico responde uma pergunta', `
| pergunta | gráfico | cuidado |
|---|---|---|
| como os valores se distribuem? | **histograma** | o número de faixas (*bins*) muda a história; com cauda longa, use escala log |
| qual a forma "suave" da distribuição? | **densidade (KDE)** | a largura de banda (*bandwidth*) suaviza demais ou de menos |
| como comparar a distribuição entre grupos? | **boxplot** | esconde distribuições bimodais |
| ...e ver a forma completa por grupo? | **violino** (KDE espelhado + mediana) | precisa de amostra razoável em cada grupo |
| duas variáveis numéricas se relacionam? | **dispersão** (*scatter*) | sobreposição de pontos: use transparência ou amostra |
| proporções entre categorias? | **barras** (ordenadas) | evite pizza com muitas fatias |

**Densidade (KDE)** coloca uma pequena curva normal ("kernel") sobre cada observação e soma tudo:
\`f(x) = (1 / n·h) × Σ φ((x − xᵢ) / h)\`, com φ a densidade normal padrão e h a largura de banda. A **regra de Silverman** sugere \`h = 0,9 × min(desvio, IQR/1,34) × n^(−1/5)\`.

**Regra de Freedman-Diaconis** para o número de faixas do histograma: largura = \`2 × IQR × n^(−1/3)\`; número de faixas = amplitude ÷ largura, arredondado para cima com \`np.ceil\` (e convertido com \`int\`).

Em \`seaborn\`: \`sns.histplot\`, \`sns.kdeplot\`, \`sns.boxplot\`, \`sns.violinplot\`, \`sns.scatterplot\`. No app, você usa \`matplotlib\` (que o seaborn usa por baixo): \`plt.hist\`, \`plt.boxplot\`, \`plt.violinplot\`, \`plt.scatter\`.

**Gráficos que mentem:** eixo y que não começa no zero em barras, eixo duplo com escalas escolhidas a dedo, médias sem dispersão, áreas/3D distorcendo proporções.
`),
    exPy('Quatro olhares sobre o valor das faturas', `
`, r`import matplotlib.pyplot as plt
ok = faturas[faturas["valor"] > 0].copy()
ok["seg"] = ok["segmento"].str.upper().replace({"MID-MARKET": "Mid-Market", "ENTERPRISE": "Enterprise"})
fig, ax = plt.subplots(2, 2, figsize=(10, 7))
ax[0, 0].hist(ok["valor"], bins=60); ax[0, 0].set_title("Histograma (escala linear)")
ax[0, 1].hist(np.log10(ok["valor"]), bins=40); ax[0, 1].set_title("Histograma de log10(valor)")
grupos = [g["valor"].to_numpy() for _, g in ok.groupby("seg")]
ax[1, 0].boxplot(grupos, showfliers=True); ax[1, 0].set_yscale("log"); ax[1, 0].set_xticks([1, 2, 3], sorted(ok["seg"].unique())); ax[1, 0].set_title("Boxplot (log)")
ax[1, 1].violinplot([np.log10(g) for g in grupos], showmedians=True); ax[1, 1].set_xticks([1, 2, 3], sorted(ok["seg"].unique())); ax[1, 1].set_title("Violino de log10(valor)")
plt.tight_layout()`, `
Na escala linear quase tudo se espreme à esquerda; em log, a forma de sino aparece (valores **log-normais**, Nível 2). Os pontos isolados lá no alto do boxplot são os erros de digitação (valor ×100) que você vai caçar na próxima lição.
`, PM),
    quiz('O boxplot de duas campanhas é idêntico, mas o violino mostra que uma delas tem dois "picos". O que o boxplot escondeu?', ['Uma distribuição bimodal (dois grupos de clientes diferentes)', 'Os outliers', 'A média', 'Nada'], 0),
    py('Implemente a **largura de faixa de Freedman-Diaconis** para `log10` do valor das faturas positivas: `2 × IQR × n^(-1/3)`. Guarde em `largura` e o número de faixas resultante (amplitude ÷ largura, arredondado para cima, inteiro) em `n_faixas`.',
      r`x = np.log10(faturas.loc[faturas["valor"] > 0, "valor"])
iqr = x.quantile(0.75) - x.quantile(0.25)
largura = 2 * iqr * len(x) ** (-1 / 3)
n_faixas = int(np.ceil((x.max() - x.min()) / largura))`,
      r`_x = np.log10(faturas.valor[faturas.valor > 0])
_w = 2 * (_x.quantile(.75) - _x.quantile(.25)) * len(_x) ** (-1/3)
assert abs(largura - _w) < 1e-9 and n_faixas == int(np.ceil((_x.max() - _x.min()) / _w))`, P),
    py('Implemente a **densidade KDE** de `x = log10(valor)` (faturas positivas) com kernel normal e banda de Silverman (`h = 0.9 * min(desvio, IQR/1.34) * n**(-1/5)`), avaliada numa grade `grade = np.linspace(x.min(), x.max(), 200)`. Guarde as densidades em `dens` (array de 200 valores).',
      r`x = np.log10(faturas.loc[faturas["valor"] > 0, "valor"]).to_numpy()
n = len(x)
iqr = np.percentile(x, 75) - np.percentile(x, 25)
h = 0.9 * min(x.std(ddof=1), iqr / 1.34) * n ** (-1 / 5)
grade = np.linspace(x.min(), x.max(), 200)
u = (grade[:, None] - x[None, :]) / h
dens = np.exp(-0.5 * u ** 2).sum(axis=1) / (n * h * np.sqrt(2 * np.pi))`,
      r`assert dens.shape == (200,)
_area = np.trapezoid(dens, grade) if hasattr(np, "trapezoid") else np.trapz(dens, grade)
assert 0.97 < _area <= 1.01, _area
assert grade[np.argmax(dens)] > np.log10(1000)`, P),
  ],
};

export const L_OUTLIERS = {
  id: 'st-20-3', title: 'Outliers com critério técnico e de negócio',
  steps: [
    theory('Detectar é estatística; decidir é negócio', `
**1. Problema:** um valor extremo pode ser **erro** (vírgula perdida, unidade trocada), **evento diferente** (estorno lançado como fatura) ou **o dado mais importante** (fraude, cliente VIP, pico de demanda). Apagar no automático destrói informação.

**Regras de detecção:**
| regra | limite | quando usar |
|---|---|---|
| **IQR (Tukey)** | abaixo de Q1 − 1,5·IQR ou acima de Q3 + 1,5·IQR (3·IQR = "extremo") | padrão do boxplot, sem supor normalidade |
| **z-score** | \\|x − média\\| ÷ desvio > 3 | dados aproximadamente normais; os próprios outliers inflam a média e o desvio (mascaramento) |
| **z robusto (MAD)** | 0,6745·\\|x − mediana\\| ÷ MAD > 3,5 | o mais confiável para dados sujos |
| em escala log | aplique as regras a log(x) | valores monetários com cauda longa |
| por grupo | calcule os limites **dentro** de cada segmento | R$ 50 mil é normal no Enterprise e absurdo no PME |

**O que fazer com cada caso:**
1. **erro comprovado** → corrigir (se a regra do erro for clara) ou marcar como inválido
2. **outro tipo de evento** (estorno, teste, cancelamento) → separar em outra análise
3. **legítimo e extremo** → manter; reportar com medidas robustas, analisar à parte ("top 10 clientes = 40% da receita") ou limitar o efeito (*winsorizar*) só para modelagem
4. **sempre** documentar a regra e quantas linhas afetou

**4. Para o diretor:** "3 faturas tinham valor 100 vezes maior que o histórico do cliente, compatível com erro de digitação; foram corrigidas. 2 eram estornos e saíram da receita."
`),
    exPy('Três regras, resultados diferentes', `
`, r`v = faturas.loc[faturas["valor"] > 0, "valor"]
lv = np.log10(v)
q1, q3 = lv.quantile([0.25, 0.75]); iqr = q3 - q1
regra_iqr = (lv < q1 - 1.5 * iqr) | (lv > q3 + 1.5 * iqr)
z = (lv - lv.mean()) / lv.std()
mad = (lv - lv.median()).abs().median()
z_rob = 0.6745 * (lv - lv.median()) / mad
print("IQR em log:", regra_iqr.sum(), "| z>3:", (z.abs() > 3).sum(), "| z robusto>3,5:", (z_rob.abs() > 3.5).sum())
faturas.loc[v.index[z_rob.abs() > 3.5], ["fatura_id", "cliente_id", "segmento", "valor"]].sort_values("valor")`, `
As regras concordam nos casos grosseiros e discordam na borda. A decisão final olha **o histórico de cada cliente**: é isso que você faz no exercício.
`, P),
    quiz('Uma fatura de R$ 480 mil num cliente Enterprise cujas faturas costumam ter R$ 30–60 mil, e outra de R$ 480 mil num cliente PME cujas faturas têm R$ 2–5 mil. O que fazer?', ['Investigar as duas pelo histórico de cada cliente; a do PME tem cara de erro, a do Enterprise pode ser um contrato grande', 'Apagar as duas', 'Manter as duas sem olhar', 'Trocar ambas pela média'], 0),
    quiz('Por que o z-score clássico pode NÃO detectar outliers numa amostra pequena com vários extremos?', ['Os próprios extremos inflam a média e o desvio-padrão (mascaramento)', 'Porque z-score só serve para categorias', 'Porque precisa de 1 milhão de linhas', 'Ele sempre detecta'], 0),
    py('Marque como **suspeita de erro de digitação** toda fatura positiva cujo valor seja mais de **20 vezes a mediana das faturas do mesmo cliente**. Guarde os `fatura_id` suspeitos (ordenados, sem repetição) na lista `suspeitas`.',
      r`ok = faturas[faturas["valor"] > 0].copy()
ok["mediana_cliente"] = ok.groupby("cliente_id")["valor"].transform("median")
suspeitas = sorted(ok.loc[ok["valor"] > 20 * ok["mediana_cliente"], "fatura_id"].unique().tolist())`,
      r`_o = faturas[faturas.valor > 0].copy()
_o["m"] = _o.groupby("cliente_id").valor.transform("median")
assert suspeitas == sorted(_o.loc[_o.valor > 20 * _o.m, "fatura_id"].unique().tolist())
assert 1 <= len(suspeitas) <= 10`, P),
    py('Aplique o **z robusto (MAD)** a `log10(valor)` **dentro de cada segmento** (faturas positivas; normalize o segmento com `.str.upper()` antes de agrupar). Crie a coluna booleana `extremo` (|z robusto| > 3,5) num DataFrame `ok` e guarde em `por_segmento` a contagem de extremos por segmento (Series).',
      r`ok = faturas[faturas["valor"] > 0].copy()
ok["seg"] = ok["segmento"].str.upper()
ok["lv"] = np.log10(ok["valor"])
med = ok.groupby("seg")["lv"].transform("median")
mad = (ok["lv"] - med).abs().groupby(ok["seg"]).transform("median")
ok["extremo"] = (0.6745 * (ok["lv"] - med) / mad).abs() > 3.5
por_segmento = ok.groupby("seg")["extremo"].sum()`,
      r`_o = faturas[faturas.valor > 0].copy(); _o["seg"] = _o.segmento.str.upper(); _o["lv"] = np.log10(_o.valor)
_res = {}
for s, g in _o.groupby("seg"):
    m = g.lv.median(); d = (g.lv - m).abs().median()
    _res[s] = int(((0.6745 * (g.lv - m) / d).abs() > 3.5).sum())
assert {k: int(v) for k, v in por_segmento.items()} == _res
assert "extremo" in ok.columns`, P),
  ],
};

export const L_FALTANTES = {
  id: 'st-20-4', title: 'Dados faltantes (MCAR, MAR, MNAR), duplicatas e vazamento',
  steps: [
    theory('Por que o dado sumiu importa mais do que quanto sumiu', `
**1. Problema:** 2% das faturas estão sem valor. Apagar, preencher com a média ou investigar? Depende do **mecanismo** da ausência (classificação de Rubin):

| mecanismo | significado | exemplo | consequência |
|---|---|---|---|
| **MCAR** (*missing completely at random*) | a falta não depende de nada | falha aleatória de integração | apagar linhas perde amostra, mas não distorce |
| **MAR** (*at random*, condicional) | depende de **outras variáveis observadas** | região Norte usa um sistema que falha mais | apagar distorce; imputar **por grupo** (ou modelar) corrige |
| **MNAR** (*not at random*) | depende **do próprio valor faltante** | clientes inadimplentes não informam renda; contratos muito grandes ficam fora do sistema | nenhuma imputação simples corrige; investigue a origem, faça análise de sensibilidade |

**2. Como diagnosticar:** compare a **taxa de faltantes por grupo** (segmento, região, mês). Taxas parecidas → compatível com MCAR. Taxas muito diferentes → MAR (ou pior). Pergunte ao time de dados **como** a informação é gerada.

**3. Tratamentos:**
- **remover linhas** (*listwise*): só com MCAR e poucas linhas
- **imputação simples** (média/mediana): reduz a variância artificialmente; prefira a **mediana por grupo** e crie uma coluna **indicadora** (\`valor_faltante = 1\`) para o modelo saber
- **imputação múltipla / modelos** (MICE, \`IterativeImputer\`): estado da arte para MAR
- **nunca** imputar a variável-alvo de um modelo

**Duplicatas:** linhas idênticas (reprocessamento de carga) inflam contagens e somas. Remova por chave (\`fatura_id\`) e **registre quantas**.

**Vazamento de dados** (*data leakage*): usar informação que **não existiria no momento da decisão**. Ex.: prever inadimplência usando "dias de atraso" (só se conhece depois); imputar com a média calculada na base inteira (incluindo o futuro/teste); normalizar antes de separar treino e teste. O modelo fica ótimo no notebook e inútil em produção.
`),
    exPy('Taxa de faltantes por grupo', `
`, r`f = faturas.drop_duplicates("fatura_id")
f = f.assign(falta=f["valor"].isna())
print("duplicatas removidas:", len(faturas) - len(f))
print("taxa geral de faltantes: {:.2%}".format(f["falta"].mean()))
print(f.groupby("regiao")["falta"].agg(["mean", "sum"]).round(4))
print(f.groupby("segmento")["falta"].agg(["mean", "sum"]).round(4))`, `
As taxas variam pouco entre regiões e segmentos, dentro do esperado pelo acaso para grupos desse tamanho: o padrão é compatível com **MCAR**. Mesmo assim, a imputação por segmento é mais segura do que a média geral.
`, P),
    quiz('Clientes com renda alta deixam o campo "renda" em branco com muito mais frequência. Que mecanismo é esse?', ['MNAR: a falta depende do próprio valor', 'MCAR', 'MAR', 'Duplicata'], 0),
    quiz('Um modelo de inadimplência usa a variável "número de cobranças enviadas". Qual o risco?', ['Vazamento: cobranças só acontecem depois do atraso, então o modelo "vê o futuro"', 'Nenhum', 'Multicolinearidade', 'Dado faltante'], 0),
    py('Remova as duplicatas por `fatura_id` (mantendo a primeira) e guarde em `f`. Depois guarde em `n_dup` quantas linhas foram removidas.',
      r`f = faturas.drop_duplicates("fatura_id", keep="first")
n_dup = len(faturas) - len(f)`,
      r`assert n_dup == faturas.fatura_id.duplicated().sum() and f.fatura_id.is_unique and len(f) == len(faturas) - n_dup`, P),
    py('A partir das faturas sem duplicatas e com segmento normalizado (`.str.upper()`), crie a coluna `valor_faltante` (1 se o valor é nulo) e a coluna `valor_imp`, que preenche os nulos com a **mediana do segmento** calculada só com valores positivos. Guarde o DataFrame em `f`.',
      r`f = faturas.drop_duplicates("fatura_id").copy()
f["segmento"] = f["segmento"].str.upper()
f["valor_faltante"] = f["valor"].isna().astype(int)
medianas = f[f["valor"] > 0].groupby("segmento")["valor"].median()
f["valor_imp"] = f["valor"].fillna(f["segmento"].map(medianas))`,
      r`_f = faturas.drop_duplicates("fatura_id").copy(); _f["segmento"] = _f.segmento.str.upper()
_m = _f[_f.valor > 0].groupby("segmento").valor.median()
assert f.valor_imp.isna().sum() == 0 and f.valor_faltante.sum() == _f.valor.isna().sum()
_alvo = _f.valor.fillna(_f.segmento.map(_m))
assert np.allclose(f.sort_values("fatura_id").valor_imp.to_numpy(), _alvo.loc[_f.sort_values("fatura_id").index].to_numpy())`, P),
  ],
};

export const L_ARMADILHAS = {
  id: 'st-20-5', title: 'Armadilhas analíticas: Simpson, sobrevivência e taxa base',
  steps: [
    theory('Três erros que derrubam análises inteiras', `
**Paradoxo de Simpson:** uma tendência que aparece em **cada grupo** se inverte quando os grupos são **somados**, porque os grupos têm tamanhos e taxas de base diferentes.
> O canal A converte mais que o B tanto em leads pequenos quanto em grandes, mas no total o B parece melhor: o B recebe mais leads grandes, que convertem mais em qualquer canal.

Regra: antes de comparar taxas agregadas, **estratifique** pelas variáveis que mudam a composição (segmento, porte, região, dispositivo). Qual resposta vale depende da **pergunta causal**: aqui, "trocar o canal aumenta a conversão de um mesmo lead?" → olhe dentro dos estratos.

**Viés de sobrevivência:** analisar só quem "sobreviveu" ao filtro. Ex.: "os clientes ativos usam muito o recurso X, então X retém clientes", sem olhar quem usou X e cancelou; "startups que deram certo largaram a faculdade". Pergunte sempre: **quem ficou fora da base e por quê?**

**Falácia da taxa base:** ignorar a frequência original do evento. Um detector de fraude com 99% de acerto, numa base com 0,1% de fraudes, gera muito mais alarmes falsos do que fraudes reais (Nível 2, Bayes).

**Outras:** regressão à média (lojas que foram mal num mês tendem a melhorar sozinhas: "o programa de recuperação funcionou?"), correlação espúria (duas séries com tendência), *cherry picking* de períodos, e o **denominador errado** (taxa de cancelamento sobre clientes ativos no fim × no início do mês).
`),
    exPy('Simpson nos leads: canal × porte', `
`, r`L = leads.copy()
L["porte"] = np.where(L["funcionarios"] >= 100, "grande", "pequeno")
dois = L[L["origem"].isin(["inbound", "outbound"])]
print("Conversão total por origem:")
print(dois.groupby("origem")["converteu"].mean().round(3))
print("\nConversão por origem dentro de cada porte:")
print(dois.pivot_table(index="porte", columns="origem", values="converteu", aggfunc="mean").round(3))
print("\nComposição (% de leads grandes):")
print(dois.groupby("origem")["porte"].apply(lambda s: (s == "grande").mean()).round(3))`, `
Compare a diferença total com as diferenças dentro de cada porte. Se a composição de porte for diferente entre as origens, o número agregado mistura "efeito do canal" com "efeito do porte".
`, P),
    py('Construa a tabela `taxa` com a conversão (média de `converteu`) por `origem` (linhas) e `demo` (colunas: 0 e 1) e a Series `pct_demo` com a fração de leads que fizeram demo em cada origem.',
      r`taxa = leads.pivot_table(index="origem", columns="demo", values="converteu", aggfunc="mean")
pct_demo = leads.groupby("origem")["demo"].mean()`,
      r`_t = leads.groupby(["origem", "demo"]).converteu.mean().unstack()
assert np.allclose(taxa.loc[_t.index, [0, 1]].to_numpy(), _t[[0, 1]].to_numpy())
assert np.allclose(pct_demo.sort_index().to_numpy(), leads.groupby("origem").demo.mean().sort_index().to_numpy())`, P),
    quiz('"Os clientes que ainda estão conosco há 5 anos avaliam o suporte com nota 9, então nosso suporte é excelente." Qual é a falha?', ['Viés de sobrevivência: quem avaliou mal provavelmente já cancelou', 'Paradoxo de Simpson', 'Taxa base', 'Nenhuma'], 0),
    quiz('As 10 lojas com pior resultado em março receberam um treinamento e melhoraram em abril. Antes de creditar o treinamento, que efeito descartar?', ['Regressão à média: extremos tendem a voltar para perto da média sozinhos', 'Viés de sobrevivência', 'Efeito novidade', 'Multicolinearidade'], 0),
  ],
};

export const L_PROJETO1 = {
  id: 'st-20-6', title: 'Projeto: diagnóstico executivo de uma base de faturamento B2B',
  steps: [
    theory('O entregável do Nível 1', `
Você recebeu a base \`faturas\` de uma empresa B2B (2023–2024) e precisa entregar à diretoria um **diagnóstico descritivo** confiável. Etapas:

1. **Auditoria de qualidade** (documente cada número): duplicatas, valores faltantes (taxa e mecanismo provável), valores negativos (estornos), erros de digitação (valor ≫ histórico do cliente), categorias inconsistentes
2. **Base limpa**: remove duplicatas e estornos da receita, corrige ou exclui erros (com regra explícita), normaliza o segmento, decide o que fazer com os faltantes
3. **Resumo por segmento e região**: receita total, número de faturas e clientes, ticket mediano e médio, CV
4. **Concentração**: quanto da receita vem dos 20% maiores clientes (curva de Pareto)
5. **Gargalos**: atraso no pagamento por segmento (% de faturas atrasadas, atraso mediano entre as atrasadas)
6. **Texto executivo** com 3 a 5 achados, cada um com número, contexto e recomendação

Os exercícios a seguir constroem as peças principais.
`),
    py('**Etapa 1–2 — base limpa.** Crie `limpa` a partir de `faturas`: remova duplicatas por `fatura_id`; normalize `segmento` com `.str.upper()` e depois troque `"MID-MARKET"` por `"Mid-Market"` e `"ENTERPRISE"` por `"Enterprise"`; remova linhas com valor nulo ou negativo; e **corrija** os erros de digitação (valor > 20 × mediana do cliente) dividindo o valor por 100. Guarde em `corrigidas` quantas faturas foram corrigidas.',
      r`limpa = faturas.drop_duplicates("fatura_id").copy()
limpa["segmento"] = limpa["segmento"].str.upper().replace({"MID-MARKET": "Mid-Market", "ENTERPRISE": "Enterprise"})
limpa = limpa[limpa["valor"] > 0].copy()
med = limpa.groupby("cliente_id")["valor"].transform("median")
erro = limpa["valor"] > 20 * med
corrigidas = int(erro.sum())
limpa.loc[erro, "valor"] = limpa.loc[erro, "valor"] / 100`,
      r`_l = faturas.drop_duplicates("fatura_id").copy()
_l["segmento"] = _l.segmento.str.upper().replace({"MID-MARKET": "Mid-Market", "ENTERPRISE": "Enterprise"})
_l = _l[_l.valor > 0].copy(); _m = _l.groupby("cliente_id").valor.transform("median"); _e = _l.valor > 20 * _m
_l.loc[_e, "valor"] = _l.loc[_e, "valor"] / 100
assert corrigidas == int(_e.sum()) and corrigidas >= 1
assert set(limpa.segmento.unique()) == {"PME", "Mid-Market", "Enterprise"}
assert abs(limpa.valor.sum() - _l.valor.sum()) < 1e-3 and len(limpa) == len(_l)`, P),
    py('**Etapa 3 — resumo.** Com a base limpa (já carregada como `limpa`), monte `resumo` indexado por `segmento` com as colunas `receita` (soma), `faturas` (contagem), `clientes` (clientes distintos), `ticket_mediano` e `cv` (desvio ÷ média do valor). Ordene pela receita, da maior para a menor.',
      r`g = limpa.groupby("segmento")["valor"]
resumo = pd.DataFrame({
    "receita": g.sum(),
    "faturas": g.count(),
    "clientes": limpa.groupby("segmento")["cliente_id"].nunique(),
    "ticket_mediano": g.median(),
    "cv": g.std() / g.mean(),
}).sort_values("receita", ascending=False)`,
      r`assert list(resumo.columns) == ["receita", "faturas", "clientes", "ticket_mediano", "cv"]
assert list(resumo.index) == list(limpa.groupby("segmento").valor.sum().sort_values(ascending=False).index)
for s, g in limpa.groupby("segmento"):
    assert abs(resumo.loc[s, "receita"] - g.valor.sum()) < 1e-6 and resumo.loc[s, "clientes"] == g.cliente_id.nunique()
    assert abs(resumo.loc[s, "cv"] - g.valor.std() / g.valor.mean()) < 1e-9`,
      { ...P, setup: P.setup + r`
limpa = faturas.drop_duplicates("fatura_id").copy()
limpa["segmento"] = limpa["segmento"].str.upper().replace({"MID-MARKET": "Mid-Market", "ENTERPRISE": "Enterprise"})
limpa = limpa[limpa["valor"] > 0].copy()
_md = limpa.groupby("cliente_id")["valor"].transform("median")
limpa.loc[limpa["valor"] > 20 * _md, "valor"] = limpa.loc[limpa["valor"] > 20 * _md, "valor"] / 100
`, setupNote: P.setupNote + ' Também já existe `limpa`, a base tratada no exercício anterior.' }),
    py('**Etapa 4 — concentração.** Na base `limpa`, calcule a receita por cliente, ordene do maior para o menor e guarde em `share_top20` a **fração da receita total** vinda dos **20% maiores clientes** (arredonde o número de clientes para cima).',
      r`por_cliente = limpa.groupby("cliente_id")["valor"].sum().sort_values(ascending=False)
k = int(np.ceil(0.2 * len(por_cliente)))
share_top20 = por_cliente.iloc[:k].sum() / por_cliente.sum()`,
      r`_p = limpa.groupby("cliente_id").valor.sum().sort_values(ascending=False); _k = int(np.ceil(.2 * len(_p)))
assert abs(share_top20 - _p.iloc[:_k].sum() / _p.sum()) < 1e-9 and 0.3 < share_top20 < 0.95`,
      { ...P, setup: P.setup + r`
limpa = faturas.drop_duplicates("fatura_id").copy()
limpa["segmento"] = limpa["segmento"].str.upper().replace({"MID-MARKET": "Mid-Market", "ENTERPRISE": "Enterprise"})
limpa = limpa[limpa["valor"] > 0].copy()
_md = limpa.groupby("cliente_id")["valor"].transform("median")
limpa.loc[limpa["valor"] > 20 * _md, "valor"] = limpa.loc[limpa["valor"] > 20 * _md, "valor"] / 100
`, setupNote: P.setupNote + ' Também já existe `limpa`, a base tratada.' }),
    py('**Etapa 5 — gargalo de recebimento.** Na base `limpa`, monte `atraso` por segmento com `pct_atrasadas` (fração com `dias_atraso > 0`) e `atraso_mediano` (mediana de `dias_atraso` **só entre as atrasadas**).',
      r`atrasadas = limpa[limpa["dias_atraso"] > 0]
atraso = pd.DataFrame({
    "pct_atrasadas": limpa.groupby("segmento")["dias_atraso"].apply(lambda s: (s > 0).mean()),
    "atraso_mediano": atrasadas.groupby("segmento")["dias_atraso"].median(),
})`,
      r`for s, g in limpa.groupby("segmento"):
    assert abs(atraso.loc[s, "pct_atrasadas"] - (g.dias_atraso > 0).mean()) < 1e-9
    assert atraso.loc[s, "atraso_mediano"] == g.dias_atraso[g.dias_atraso > 0].median()`,
      { ...P, setup: P.setup + r`
limpa = faturas.drop_duplicates("fatura_id").copy()
limpa["segmento"] = limpa["segmento"].str.upper().replace({"MID-MARKET": "Mid-Market", "ENTERPRISE": "Enterprise"})
limpa = limpa[limpa["valor"] > 0].copy()
`, setupNote: P.setupNote + ' Também já existe `limpa`, a base tratada.' }),
    theory('Escrevendo o diagnóstico', `
Um bom achado executivo tem **número + contexto + implicação**:

> **1. A receita é concentrada.** Os 20% maiores clientes geram cerca de X% da receita; a perda de um cliente Enterprise equivale a ~N clientes PME. *Recomendação:* plano de retenção dedicado para o topo da carteira.
>
> **2. O ticket "médio" engana.** A média por fatura é R$ A, mas o cliente típico (mediana) paga R$ B. Metas de ticket devem usar a mediana por segmento.
>
> **3. Qualidade de dados.** 5 faturas duplicadas, 2 estornos lançados como receita e 3 valores digitados com erro de 100× inflavam a receita em R$ C (Y%). *Recomendação:* validação na integração do ERP.
>
> **4. Recebimento.** Z% das faturas do segmento S atrasam, com atraso mediano de D dias. *Recomendação:* régua de cobrança antecipada nesse segmento.

Evite jargão ("CV", "IQR") no texto principal: traduza ("a receita do segmento varia muito de um cliente para outro"). Deixe a metodologia num anexo.
`),
    quiz('Na seção principal do relatório para a diretoria, como apresentar a dispersão do ticket do segmento PME?', ['"O valor das faturas PME varia muito: metade fica entre R$ X e R$ Y"', '"CV = 0,87"', '"Desvio-padrão de 1.234,56"', 'Não apresentar'], 0),
  ],
};
