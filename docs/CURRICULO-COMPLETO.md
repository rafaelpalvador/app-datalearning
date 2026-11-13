# Currículo completo do Datum

Este documento lista **todos os conceitos** que as trilhas cobrem e serve de checklist para manter o conteúdo completo.
Ele foi montado comparando o app com ementas de cursos universitários e livros de referência: ementas de
Estatística para Ciência de Dados (UFMG EST773, Stony Brook CSE 544, UW STAT 391, Rutgers 960:291),
*Practical Statistics for Data Scientists* (Bruce, Bruce & Gedeck), *OpenIntro Statistics*, o *User Guide* do pandas,
cursos de SQL para análise (filtros, JOINs, agregação, janelas, CTEs, desempenho) e guias de entrevistas de dados
(testes A/B, distribuições, viés-variância).

**Regra pedagógica (verificada automaticamente em `npm run validate`):** toda lição começa por teoria e exemplos
resolvidos executáveis; nenhum exercício cobra um comando, função ou conceito que ainda não foi explicado.

## Conceitos por trilha

### SQL
- Bancos relacionais, SGBDs, tabelas, linhas, colunas, tipos, NULL, chaves primária e estrangeira, relacionamentos, esquema, dialetos
- SELECT, FROM, aliases, colunas calculadas, SELECT *, ORDER BY (várias colunas), LIMIT/OFFSET (paginação), DISTINCT, ordem lógica de execução
- WHERE, operadores de comparação, aspas simples × duplas, AND/OR/NOT e precedência, IN, BETWEEN, LIKE, IS NULL, lógica de três valores, COALESCE
- Funções de texto (UPPER, LOWER, LENGTH, TRIM, SUBSTR, REPLACE, INSTR, ||), CASE, ROUND
- Agregações (COUNT/SUM/AVG/MIN/MAX, COUNT DISTINCT), NULL nas agregações, GROUP BY, HAVING, agregação condicional, estatísticas e histogramas em SQL
- INNER, LEFT, RIGHT, FULL OUTER e CROSS JOIN, anti-join, self join, filtros no ON × WHERE, multiplicação de linhas, UNION/UNION ALL, INTERSECT, EXCEPT
- Subqueries (escalar, lista, tabela, correlacionada), EXISTS/NOT EXISTS, armadilha do NOT IN, CTEs, CTE recursiva
- Window functions: OVER, PARTITION BY, frames (ROWS BETWEEN), ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, acumulados, médias móveis, FIRST_VALUE, LAST_VALUE, NTH_VALUE, PERCENT_RANK, CUME_DIST, cláusula WINDOW, top N por grupo
- Datas (strftime, date, julianday), tipos, CAST, divisão inteira, NUMERIC × FLOAT, NULLIF
- DML (INSERT, UPDATE, DELETE), transações e ACID, DDL (CREATE, ALTER, DROP), constraints, views e views materializadas, famílias DQL/DML/DDL/DCL/TCL
- Normalização (3FN), modelagem dimensional (fato, dimensão, grão, métricas aditivas/semiaditivas/não aditivas, SCD tipos 1 e 2)
- Índices, plano de execução, custos em data warehouses (colunar, partição, clustering)
- Análises de negócio: pivot, recorrência, coortes, Pareto, funil; qualidade de dados (completude, unicidade, validade, integridade, consistência, atualidade, deduplicação)
- Gaps & islands, calendários, JSON, UPSERT

### Python para dados
- Como programas executam, ambientes (Jupyter, Colab, VS Code), print, comentários, variáveis, tipos, conversões, operadores, comparações, leitura de erros, indentação
- Strings (índices, métodos, f-strings, formatação brasileira), listas, tuplas, dicionários, sets, condições, laços (for, while), comprehensions
- Funções (parâmetros, padrões, nomeados, *args/**kwargs, escopo, docstring, lambda, funções como valores), módulos, biblioteca padrão (math, statistics, collections, datetime, random, json, csv, re, pathlib), pip e ambientes virtuais
- Arquivos (open/with, modos, encoding, csv, pathlib), exceções (try/except/else/finally, raise), expressões regulares
- NumPy: arrays, shape, vetorização, broadcasting, máscaras, eixos, np.where/np.select, aleatoriedade reprodutível, estatística, ordenação, álgebra linear
- pandas: Series, DataFrame, leitura de formatos, seleção (loc/iloc/query/isin), colunas novas, cut/qcut/map, groupby (agg, transform), merge/concat, pivot/melt/crosstab, índices e MultiIndex, dtypes e categorias ordenadas, janelas (rolling, expanding, ewm), rank, top N por grupo, limpeza (nulos, duplicados, textos, tipos, outliers), datas e resample
- Visualização: matplotlib (figure/axes, subplots), pandas.plot, seaborn, escolha do gráfico, boas práticas
- Extração: JSON, CSV regional, Parquet, APIs (paginação, status HTTP, retry, segredos), web scraping, SQL com Python (DB-API, parâmetros, SQL injection)
- Estatística e modelagem: SciPy (testes), statsmodels (OLS, logit, séries), scikit-learn (treino/teste, pipeline, métricas, validação cruzada)
- Desempenho, memória, dados maiores que a memória (geradores, chunks, Polars, DuckDB), código de produção (dataclasses, validação, testes, logs)

### Estatística para dados
- Fundamentos: população e amostra, parâmetro e estatística, tipos de variáveis e escalas, amostragem (simples, estratificada, conglomerados, sistemática), vieses (seleção, sobrevivência, não resposta, medição), estudos observacionais × experimentos
- Descritiva: distribuições de frequência, histogramas, tendência central, dispersão (variância, desvio, CV, amplitude), quartis, percentis, boxplot, outliers (IQR, z-score), assimetria, curtose, transformações, QQ-plot
- Probabilidade: espaço amostral, regras de adição e multiplicação, complementar, exclusivos × independentes, condicional, Bayes, contagem (permutações, combinações), variáveis aleatórias, valor esperado, variância e suas propriedades
- Distribuições: Bernoulli, binomial, Poisson, geométrica, uniforme, exponencial, normal, log-normal, t, qui-quadrado, F, Beta, Gama; Lei dos Grandes Números; Teorema Central do Limite; distribuições amostrais
- Inferência: estimadores (viés, variância, EQM, consistência), erro padrão, intervalos de confiança (z, t, proporção), bootstrap, testes de hipótese, p-valor, erros tipo I e II, poder, MDE, tamanho de amostra
- Testes: z de proporções, t de uma amostra, pareado e Welch, tamanho de efeito (Cohen), normalidade e homocedasticidade, qui-quadrado, Fisher, ANOVA, permutação, Mann-Whitney, Wilcoxon, Kruskal-Wallis, comparações múltiplas (Bonferroni, Holm, Benjamini-Hochberg)
- Relações e modelos: covariância, Pearson, Spearman, Kendall, regressão simples e múltipla, dummies, interpretação com log, diagnóstico (LINE, resíduos, heterocedasticidade, influência), intervalos de previsão, regressão logística, razão de chances, multicolinearidade e VIF
- Modelagem preditiva: viés-variância, overfitting, treino/validação/teste, validação cruzada, vazamento de dados, métricas de regressão e classificação (matriz de confusão, precisão, recall, F1, ROC/AUC, log loss, calibração), regularização (ridge, lasso)
- Não supervisionado: PCA, k-means, escolha de k, silhueta, segmentação RFM
- Séries temporais: tendência, sazonalidade, médias móveis, anomalias, autocorrelação, baselines, MAE/MAPE/RMSE, estacionariedade, diferenciação, suavização exponencial, ARIMA, backtesting
- Experimentação: testes A/B, Simpson, espiar resultados, testes sequenciais, SRM, CUPED, bandits, métricas de razão e método delta, interferência, guardrails
- Bayesiana e verossimilhança: prior, posterior, Beta-Binomial, intervalos de credibilidade, perda esperada, shrinkage, máxima verossimilhança, AIC, Monte Carlo
- Causalidade: confundidores, DAGs, colisores, diferença em diferenças, escore de propensão, regressão descontínua, variáveis instrumentais, controle sintético
- Negócio: sobrevivência (Kaplan-Meier), coortes, retenção, churn, LTV, CAC, controle estatístico de processo (gráficos p e c, regras de Western Electric)

## Grade atual de lições

### SQL do Zero ao Avançado


**Nível Básico**

- **Primeiros passos**: Dados, tabelas e bancos de dados · O que é SQL? · SELECT e FROM · Ordenando, limitando e DISTINCT
- **Filtrando dados**: WHERE e comparações · AND, OR, IN e BETWEEN · LIKE e valores NULL · Expressões, funções e CASE · Funções de texto
- **Agregações**: Funções de agregação · GROUP BY · HAVING e ordem de execução · Agregação condicional e estatísticas em SQL

**Nível Intermediário**

- **JOINs**: INNER JOIN · LEFT JOIN e anti-join · Múltiplos JOINs, self join e UNION · RIGHT e FULL JOIN, INTERSECT e EXCEPT
- **Subconsultas e CTEs**: Subqueries · CTEs (WITH) e recursão

**Nível Avançado**

- **Window Functions**: OVER e PARTITION BY · Rankings: ROW_NUMBER, RANK, DENSE_RANK · LAG, LEAD e acumulados · Funções de valor e de distribuição
- **Datas, textos e tipos**: Trabalhando com datas · Tipos, CAST e NULLIF
- **Modificando e modelando**: INSERT, UPDATE e DELETE · CREATE TABLE, constraints e views · ALTER, DROP e modelagem para análise

**Nível Especialista**

- **Performance e análises avançadas**: Índices e plano de execução · Análises de negócio com SQL · Qualidade de dados com SQL
- **SQL de especialista**: Gaps & islands e sequências · Calendários, JSON e UPSERT

### Python para Análise de Dados


**Nível Básico**

- **Python essencial**: Como um programa Python funciona · Textos (strings) em detalhe · Variáveis, tipos e listas · Dicionários, tuplas e sets · Condições, laços e funções · Funções em detalhe e módulos · Arquivos, exceções e expressões regulares
- **NumPy**: Arrays e vetorização · Máscaras booleanas e broadcasting · NumPy: aleatoriedade, estatística e álgebra linear

**Nível Intermediário**

- **pandas: fundamentos**: Series, DataFrame e leitura · Selecionando e filtrando · Criando colunas e ordenando · Índices, MultiIndex e tipos de dados
- **pandas: agregar e combinar**: groupby e agg · merge e concat · pivot_table, melt e crosstab · Janelas, rankings e transformações por grupo
- **Limpeza de dados**: Nulos e duplicados · Tipos, textos e outliers

**Nível Avançado**

- **Datas e séries temporais**: Datas no pandas
- **Visualização de dados**: matplotlib e pandas.plot · Gráficos estatísticos e seaborn
- **Extração de dados**: Arquivos e JSON · APIs com requests · Web scraping com BeautifulSoup · Python + SQL
- **Estatística e próximos passos**: Estatística descritiva e correlação · O ecossistema completo · SciPy, statsmodels e scikit-learn

**Nível Especialista**

- **Python de especialista**: Desempenho: vetorização e memória · Dados maiores que a memória · Código de produção: tipos, validação e testes

### Estatística para Dados


**Nível Básico**

- **Primeiros conceitos**: Dados, variáveis e escalas · Tabelas de frequência e histogramas · Amostragem e desenho de estudos
- **Estatística descritiva**: Média, mediana e moda · Dispersão: variância e desvio padrão · Quartis, boxplot e outliers · Forma da distribuição: assimetria, curtose e transformações
- **Probabilidade e distribuições**: Regras da probabilidade e contagem · Probabilidade na prática · Variáveis aleatórias, valor esperado e variância · Distribuição normal e z-score · Distribuição binomial · Poisson, geométrica, exponencial e uniforme · Lei dos grandes números e Teorema Central do Limite

**Nível Intermediário**

- **Amostragem e intervalos de confiança**: Erro padrão e IC da média · IC de proporções e bootstrap · Estimadores e a distribuição t
- **Testes de hipótese e testes A/B**: Hipóteses e p-valor · Teste A/B de conversão · t-test e cuidados com testes · Testes t de uma amostra e pareado, e tamanho de efeito
- **Correlação e regressão**: Correlação · Regressão linear · Diagnóstico da regressão
- **Testes para categorias e vários grupos**: Qui-quadrado de independência · ANOVA: comparando várias médias

**Nível Avançado**

- **Séries temporais e análise aplicada**: Sazonalidade e tendência · Detecção de anomalias · Autocorrelação e previsão de base · Estacionariedade, suavização exponencial e ARIMA
- **Não paramétricos e comparações múltiplas**: Testes de permutação e Mann-Whitney · Muitos testes ao mesmo tempo · Wilcoxon pareado, Kruskal-Wallis e teste exato de Fisher
- **Regressão avançada**: Regressão múltipla e dummies · Regressão logística
- **Poder, tamanho de amostra e CUPED**: Poder estatístico e MDE · Redução de variância com CUPED
- **Modelagem preditiva**: Viés-variância, overfitting e validação cruzada · Métricas de classificação · Regularização: ridge e lasso
- **Aprendizado não supervisionado**: PCA: redução de dimensionalidade · Clustering: k-means e segmentação

**Nível Especialista**

- **Inferência bayesiana**: Raciocínio bayesiano e Beta-Binomial · Credibilidade, perda esperada e shrinkage
- **Verossimilhança e simulação**: Máxima verossimilhança · Simulação de Monte Carlo
- **Inferência causal**: Confundimento e diferença em diferenças · Escore de propensão e estratificação · Regressão descontínua, variáveis instrumentais e controle sintético
- **Experimentação avançada**: Espiar resultados, SRM e testes sequenciais · Bandits e Thompson Sampling · Análise de sobrevivência
- **Métricas de produto e negócio**: Métricas de razão e o método delta · Coortes, retenção, churn e LTV · Controle estatístico de processo
