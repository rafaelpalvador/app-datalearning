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
- Prática profissional (v2.1): método das 4 perguntas (problema, premissas, código e validação, tradução para o negócio), média ponderada, média aparada, MAD e z robusto, KDE e regra de Silverman, Freedman-Diaconis, violino, outliers com critério de negócio, MCAR/MAR/MNAR, imputação por grupo com indicador, duplicatas, vazamento de dados, regressão à média, probabilidade total, Bayes sequencial, Log-Normal, Pareto, curva de Lorenz e Gini, simulador de Monte Carlo (Poisson × Binomial × Log-Normal, P10/P50/P90, VaR, CVaR, sensibilidade), Holm, Tukey/Games-Howell/Dunn/Dunnett, qui-quadrado de aderência por simulação, desenho de experimento (métrica principal, guardas, unidade de randomização, novidade e primazia, regra de decisão), V de Cramér, Kendall, η², elasticidade log-log, interações, Breusch-Pagan, erros robustos HC3, distância de Cook, GLMs (Poisson, binomial negativa, Gama, IRLS, superdispersão), AIC/BIC, ElasticNet, ADF, PACF, Holt-Winters, SARIMA/SARIMAX, Prophet, walk-forward, MAE/RMSE/MAPE/sMAPE/MASE, calibração, resultados potenciais (Rubin), ATE/ATT, DAGs (confundidor, mediador, colisor), IPW e balanceamento, modelos hierárquicos e Bayes empírico, MCMC (Metropolis, R̂, ESS), regressão de Cox e riscos proporcionais, análise fatorial, GMM com EM, DiD com erros agrupados e placebo, ROI causal

### Bancos de Dados com PostgreSQL
Referências: documentação oficial do PostgreSQL 18 e notas do 19, *The Data Warehouse Toolkit* (Kimball), *Designing Data-Intensive Applications* (Kleppmann), documentação do PgBouncer, pgvector, Redis, Cassandra e MongoDB.
- Fundamentos e modelagem: banco × SGBD × instância × cluster × esquema, ACID, álgebra relacional (seleção, projeção, junção, união, diferença, divisão), modelagem conceitual/lógica/física, cardinalidades, entidades associativas, chaves naturais × substitutas (SERIAL, IDENTITY, UUIDv4, UUIDv7), tipos físicos (NUMERIC × FLOAT, TIMESTAMPTZ, TEXT × VARCHAR, JSONB, arrays, enums, domínios), normalização 1FN–5FN e BCNF, desnormalização consciente, constraints e políticas referenciais (CASCADE, RESTRICT, SET NULL)
- SQL profissional: DDL/DML/DCL/TCL, RETURNING, UPDATE FROM, DELETE USING, ON CONFLICT, MERGE, ordem lógica de execução, todos os joins, anti-join e semi-join, LATERAL, FILTER, ROLLUP/CUBE/GROUPING SETS, percentis, subconsultas correlacionadas, ANY/ALL, NOT IN com NULL, operadores de conjunto, NULL/COALESCE/NULLIF/CASE, datas e fusos, regex, JSONB e arrays, saneamento de dados sujos (staging, validação de tipos, deduplicação)
- SQL avançado e concorrência: CTEs (materialização), CTEs de modificação, CTEs recursivas (SEARCH, CYCLE), window functions de ranking e navegação, frames ROWS/RANGE/GROUPS, médias móveis, saldos, coortes e retenção, views, materialized views e refresh concorrente, funções (volatilidade), PL/pgSQL, procedures, triggers de auditoria, quando evitar lógica no banco, MVCC (xmin/xmax), níveis de isolamento e anomalias (dirty read, non-repeatable, phantom, lost update, write skew), SSI e retentativas, controle otimista, savepoints, locks de linha e de tabela, NOWAIT, SKIP LOCKED (filas), advisory locks, deadlocks e prevenção, ledger com idempotência
- Internals, performance e operação: páginas de 8 KB, heap, ctid, TOAST, WAL, checkpoints, LSN, I/O assíncrono (PG18), bloat, VACUUM, autovacuum, freeze/wraparound, HOT e fillfactor, B-tree (composto, parcial, expressão, INCLUDE, custo de escrita, índices não usados, FKs sem índice), Hash, GIN (jsonb, pg_trgm), GiST e exclusion constraints, SP-GiST, BRIN e correlação, busca textual, EXPLAIN (ANALYZE, BUFFERS), nós de acesso e de junção, estatísticas e estatísticas estendidas, predicados não-SARGable, conversões implícitas, paginação keyset, N+1, particionamento RANGE/LIST/HASH e pruning, réplicas e sharding (Citus), backup lógico × físico, PITR, RPO/RTO, replicação física e lógica, slots, CDC, Patroni, PgBouncer (modos e limitações), roles, privilégios, SECURITY DEFINER, RLS, TLS, criptografia, auditoria, pg_stat_activity, pg_stat_statements, pg_locks, roteiros de incidente
- Ecossistema moderno: OLTP × OLAP, armazenamento colunar, Kimball (grão, fatos e dimensões, estrela × floco de neve, dimensão de data, métricas aditivas/semiaditivas/não aditivas, dimensões conformadas e degeneradas), fatos transacional, snapshot periódico e acumulado, SCD 0/1/2/3/4/6, BigQuery, Snowflake, Redshift, ClickHouse, DuckDB, lakehouse (Parquet, Delta, Iceberg), ELT com dbt, CAP e PACELC, Redis (cache-aside, TTL, stampede, rate limiting, sorted sets, streams), MongoDB (embutir × referenciar), Cassandra (modelagem por consulta, R + W > N), grafos (Cypher × CTE recursiva), embeddings, distâncias, pgvector (HNSW × IVFFlat), bancos gerenciados (RDS, Aurora, Cloud SQL, AlloyDB, Neon, Supabase), migrations (Flyway, Liquibase, Alembic), expand/contract, operações seguras (CONCURRENTLY, NOT VALID + VALIDATE, lock_timeout), CI/CD de banco (Testcontainers, pgTAP, linters de migração)

### Tableau
Referências: ajuda oficial do Tableau (ordem de operações, LOD, cálculos de tabela, relacionamentos multifato, Embedding API v3 e Connected Apps), Tableau Blueprint, notas de versão (2024.2: multifato e Viz Extensions; Pulse; Tableau Agent; Tableau Next sobre Data 360 com Tableau Semantics e habilidades Data Pro, Concierge e Inspector), guias de certificação no Trailhead.
- Fundamentos: BI e data-driven, dado × informação × insight, ecossistema (Desktop, Public, Prep, Cloud, Server, Reader, Mobile), licenças, arquivos (.twb, .twbx, .tds, .tdsx, .hyper, .tfl, .tflx), dados tabulares e granularidade, interface, VizQL, conexões (Excel, CSV, JSON, Sheets), Interpretador de Dados, tipos e funções geográficas, divisão, primeiros gráficos, Cartão de Marcas, Tableau Public
- Básico: dimensões × medidas, discreto × contínuo, agregações (SUM, AVG, MIN, MAX, COUNT, COUNTD, MEDIAN, ATTR), VizLOD, partes × valores de data, funções de data, ano fiscal, IF/IIF/CASE, nulos (ZN, IFNULL), texto, filtros (dimensão, medida, data, Top N), hierarquias, grupos, conjuntos, compartimentos, cálculos rápidos, gráficos de negócio (eixo duplo, bullet, lollipop, treemap, heatmap, mapas), formatação, Viz in Tooltip, painéis, contêineres, histórias
- Intermediário: ordem de operações, filtros de contexto, relacionamentos, multifato, joins, unions com curinga, blending, Live × Extract, LOD FIXED/INCLUDE/EXCLUDE, coortes, recompra, endereçamento × particionamento, WINDOW_*, LOOKUP, RANK, INDEX, SIZE, FIRST, Pareto, bump chart, filtro de cálculo de tabela, parâmetros (dinâmicos), ações (filtro, realce, URL, parâmetro, conjunto), DZV, Tableau Prep, Gestalt, padrões Z/F, layouts por dispositivo, acessibilidade
- Avançado: densificação, scaffolding, geometria (radar, Sankey, pequenos múltiplos, Gantt), Viz Extensions, Map Layers, arquivos e funções espaciais, junção espacial, tendência, R², p-valor, k-means, previsão, z-score, TabPy/Rserve/SCRIPT_*, Hyper e performance, Gravador de Desempenho, sites/projetos/permissões, Catalog e linhagem, RLS (USERNAME, ISMEMBEROF, tabelas de direitos), Bridge, conexões virtuais e políticas de dados, certificações
- Master: processos do Server, HA/DR, SAML/OIDC/Kerberos/SCIM, REST API e TSC, Hyper API, Metadata API (GraphQL), Embedding API v3 e JWT, Extensions API (.trex), webhooks, Document API, CI/CD e Content Migration Tool, repositório PostgreSQL e Admin Insights, Pulse, Tableau Agent, Tableau Next, Data 360, Tableau Semantics, Agentforce, MCP, Tableau Blueprint, CoE, FinOps


### Experimentação e Testes A/B
Referências: *Trustworthy Online Controlled Experiments* (Kohavi, Tang e Xu), CUPED (Deng, Xu, Kohavi e Walker, WSDM 2013), Delta Method em métricas (Deng, Knoblich e Lu, KDD 2018), taxonomia de SRM (Fabijan et al., KDD 2019), Always Valid Inference / mSPRT (Johari, Pekelis e Walsh), Overlapping Experiment Infrastructure (Tang et al., Google, KDD 2010), CUPAC e switchbacks (blog de engenharia da DoorDash), interleaving (Radlinski et al.; Netflix), controle sintético (Abadie), Causal Forests (Wager e Athey), Double ML (Chernozhukov et al.), surrogate index (Athey, Chetty, Imbens e Kang), EconML, CausalML, DoWhy, CausalPy.
- Básico: correlação × causalidade, randomização e confounders, H₀/H₁, bicaudal × unicaudal, hipótese testável, Bernoulli/Binomial/Normal/Poisson, LGN e TLC, erro padrão, p-valor (o que é e o que não é), α, erros tipo I e II, poder, IC, MDE e tamanho de amostra, duração em semanas cheias, OEC, secundárias e guardrails, z de proporções, t de Welch, teste A/A e p-valor uniforme, significância × relevância prática
- Intermediário: unidade de randomização × análise (i.i.d.), SRM (causas e qui-quadrado), peeking, FWER (Bonferroni, Holm) e FDR (Benjamini-Hochberg), caudas longas (winsorization, log, Mann-Whitney, permutação), bootstrap (mediana, p95), segmentos e teste de interação, A/B/n, MVT e fatorial, novidade, primazia, Hawthorne, cross-device, flicker, triggering e vazamento temporal em SQL, Experiment Design Doc, ship/iterate/kill e impacto anualizado
- Avançado: CUPED, CUPAC e estratificação, métricas de razão e Delta Method, Pocock, O'Brien-Fleming, alpha spending, mSPRT, Beta-Binomial, P(B > A), perda esperada, Normal-Normal e priors empíricos, SUTVA, cluster, switchback e washout, randomização bilateral, Rubin e DAGs, DiD e tendências paralelas, controle sintético e placebos, PSM e IPW, RDD, variáveis instrumentais, holdouts e métricas substitutas
- Master: ε-greedy, UCB1, Thompson Sampling, regret, bandits não estacionários, contextual bandits, CATE, S/T/X/R-Learners, Causal Forest, DML, curva Qini, política ótima por custo, Team Draft Interleaving, avaliação off-policy (IPS, SNIPS, Doubly Robust), winner's curse, Empirical Bayes, taxa de acerto, hashing determinístico, camadas ortogonais, feature flags, ramp-up, maturidade Crawl/Walk/Run/Fly, CoE, ética e privacidade, scorecard automatizado, playbook de experimentação

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

Estrutura em 5 níveis (currículo profissional: do zero a analista sênior, cientista de dados ou analytics engineer). Lições marcadas com ★ entraram na versão 2.1.

**Nível 1 · Descritiva** — Ler, limpar e resumir dados sem distorções: medidas robustas, gráficos, outliers, faltantes e armadilhas

- **Primeiros conceitos**: ★ Como um estatístico de dados pensa · Dados, variáveis e escalas · Tabelas de frequência e histogramas
- **Estatística descritiva**: Média, mediana e moda · ★ Média ponderada, coeficiente de variação e medidas robustas · Dispersão: variância e desvio padrão · Quartis, boxplot e outliers · Forma da distribuição: assimetria, curtose e transformações
- **Visualização, qualidade dos dados e armadilhas**: ★ Visualização estatística: histograma, densidade, boxplot, violino e dispersão · ★ Outliers com critério técnico e de negócio · ★ Dados faltantes (MCAR, MAR, MNAR), duplicatas e vazamento · ★ Armadilhas analíticas: Simpson, sobrevivência e taxa base · ★ Projeto: diagnóstico executivo de uma base de faturamento B2B

**Nível 2 · Probabilidade** — Probabilidade, Bayes, distribuições (inclusive caudas longas), TLC, amostragem e Monte Carlo

- **Probabilidade e distribuições**: Regras da probabilidade e contagem · Probabilidade na prática · ★ Probabilidade total e Bayes nas decisões de negócio · Variáveis aleatórias, valor esperado e variância · Distribuição normal e z-score · Distribuição binomial · Poisson, geométrica, exponencial e uniforme · ★ Log-Normal, Pareto e a regra 80/20 · Lei dos grandes números e Teorema Central do Limite
- **Amostragem e simulação**: Amostragem e desenho de estudos · Simulação de Monte Carlo · ★ Projeto: simulador de Monte Carlo da receita trimestral

**Nível 3 · Inferência e A/B** — Intervalos, testes de hipótese, não paramétricos, poder, CUPED e testes A/B em produção

- **Amostragem e intervalos de confiança**: Erro padrão e IC da média · IC de proporções e bootstrap · Estimadores e a distribuição t
- **Testes de hipótese e testes A/B**: Hipóteses e p-valor · Teste A/B de conversão · t-test e cuidados com testes · Testes t de uma amostra e pareado, e tamanho de efeito
- **Testes para categorias e vários grupos**: Qui-quadrado de independência · ANOVA: comparando várias médias · ★ Depois da ANOVA: post hoc, e o qui-quadrado de aderência
- **Não paramétricos e comparações múltiplas**: Testes de permutação e Mann-Whitney · Muitos testes ao mesmo tempo · Wilcoxon pareado, Kruskal-Wallis e teste exato de Fisher
- **Poder, tamanho de amostra e CUPED**: Poder estatístico e MDE · Redução de variância com CUPED
- **Experimentação em produção**: Espiar resultados, SRM e testes sequenciais · ★ Experimentação profissional: métricas, unidade, novidade e decisões · ★ Projeto: framework completo de teste A/B do checkout

**Nível 4 · Modelagem** — Correlação, regressão e diagnóstico, logística, GLMs, seleção de modelos e previsão de séries

- **Correlação e regressão**: Correlação · ★ Associação entre categorias (V de Cramér) e correlação de postos · Regressão linear · Diagnóstico da regressão
- **Regressão avançada e GLMs**: Regressão múltipla e dummies · ★ Interações, transformações log e elasticidade; heterocedasticidade e influência · Regressão logística · ★ Modelos lineares generalizados: Poisson, binomial negativa e Gama
- **Modelagem preditiva**: Viés-variância, overfitting e validação cruzada · ★ Seleção de modelos: AIC, BIC e ElasticNet · Métricas de classificação · Regularização: ridge e lasso
- **Séries temporais e previsão**: Sazonalidade e tendência · Detecção de anomalias · Autocorrelação e previsão de base · Estacionariedade, suavização exponencial e ARIMA · ★ Previsão: Holt-Winters, SARIMA/SARIMAX e Prophet · ★ Validação no tempo (walk-forward) e métricas de previsão
- **Projeto de modelagem**: ★ Projeto: drivers de conversão B2B e previsão de receita de 6 meses

**Nível 5 · Sênior** — Inferência causal, bayesiana hierárquica, sobrevivência (Cox), multivariada e métricas de negócio

- **Inferência causal**: ★ Resultados potenciais, DAGs e ponderação pelo inverso da propensão (IPW) · Confundimento e diferença em diferenças · Escore de propensão e estratificação · Regressão descontínua, variáveis instrumentais e controle sintético
- **Verossimilhança e inferência bayesiana**: Máxima verossimilhança · Raciocínio bayesiano e Beta-Binomial · Credibilidade, perda esperada e shrinkage · ★ Modelos hierárquicos e MCMC: aprender com lojas antigas para lojas novas
- **Sobrevivência e decisões sequenciais**: Análise de sobrevivência · ★ Regressão de Cox: o que acelera o churn · Bandits e Thompson Sampling
- **Estatística multivariada**: PCA: redução de dimensionalidade · ★ Análise fatorial e misturas gaussianas (GMM) × k-means · Clustering: k-means e segmentação
- **Métricas de produto e negócio**: Métricas de razão e o método delta · Coortes, retenção, churn e LTV · Controle estatístico de processo
- **Capstone sênior**: ★ Capstone sênior: ROI causal de uma campanha e risco de churn

### Bancos de Dados com PostgreSQL

Roda num PostgreSQL 18 real (PGlite, WebAssembly) dentro do app, sobre um ERP com ≈ 480 mil linhas. Projetos e incidentes em escala maior no laboratório Docker (`labs/postgres`).

**Nível 1 · Fundamentos e modelagem** — Fundamentos, arquitetura e modelagem relacional

- Banco, SGBD, instância e ACID · Álgebra relacional: a matemática por trás do SQL · Modelagem conceitual: entidades e relacionamentos · Modelagem lógica: chaves primárias e estrangeiras · Modelagem física: escolhendo os tipos certos · Normalização: 1FN, 2FN, 3FN, BCNF, 4FN e 5FN · Integridade no banco: constraints e políticas referenciais · Projeto: modelagem e DDL de um ERP financeiro

**Nível 2 · SQL profissional** — SQL profissional e lógica de negócio

- DDL, DML, DCL e TCL: o SQL que altera o banco · Ordem lógica de execução · Junções em profundidade, anti-join e LATERAL · Agregações avançadas: FILTER, ROLLUP, CUBE e GROUPING SETS · Subconsultas, ANY/ALL e operadores de conjunto · NULL, CASE, datas e expressões regulares · JSONB e arrays: dados semiestruturados · Projeto: saneamento de dados e relatórios gerenciais

**Nível 3 · SQL avançado e concorrência** — SQL avançado, programação no banco e concorrência

- CTEs: organizar, materializar e modificar · CTEs recursivas: hierarquias e grafos · Window functions: ranking e navegação · Molduras, médias móveis, saldos e análise de coortes · Views, materialized views, funções, procedures e triggers · Transações, MVCC e níveis de isolamento · Locks, SKIP LOCKED e deadlocks · Projeto: ledger financeiro à prova de race conditions

**Nível 4 · Internals, performance e operação** — Internals, performance e operação em produção

- Como o PostgreSQL guarda os dados: páginas, heap, TOAST e WAL · Bloat, VACUUM, autovacuum e HOT · Índices B-tree: compostos, parciais, de expressão e cobertura · GIN, GiST, BRIN, Hash e busca textual · EXPLAIN: lendo planos de execução · Consultas que matam a performance (e como reescrever) · Particionamento e estratégias de escala · Backup, PITR, replicação e alta disponibilidade · Segurança: roles, privilégios, RLS e criptografia · Observabilidade e resposta a incidentes · Projeto: tuning de um sistema lento e plano de recuperação

**Nível 5 · Ecossistema moderno** — Ecossistema moderno: OLAP, NoSQL, vetores, nuvem e migrations

- OLTP × OLAP e modelagem dimensional (Kimball) · Dimensões que mudam com o tempo (SCD) · Data warehouses na nuvem, lakehouse e DuckDB · NoSQL: Redis, MongoDB, Cassandra, grafos e o teorema CAP · Bancos vetoriais e busca semântica (pgvector) · Migrations, mudanças sem parada e CI/CD de banco · Bancos gerenciados na nuvem e arquitetura de referência · Projeto final: da transação ao dashboard

### Tableau do Leigo ao Master

Os campos calculados rodam no próprio app (motor da linguagem de cálculos do Tableau: nível de linha, agregados, LOD FIXED/INCLUDE/EXCLUDE, cálculos de tabela, filtros de contexto e de cálculo de tabela, USERNAME/ISMEMBEROF) sobre a base Superstore Brasil (≈ 4,2 mil itens de pedido, 2022 a 2025). Prep, TabPy e as APIs são praticados com Python.

**Nível 1 · Leigo** — Fundamentos de BI, ecossistema, interface e primeiros gráficos

- BI, dados orientando decisões e o papel do Tableau · Ecossistema Tableau e tipos de arquivo · Dados tabulares, granularidade e o primeiro cálculo · Anatomia da interface e o VizQL · Conectar e preparar a fonte de dados · Primeiros gráficos e o Cartão de Marcas · Projeto: primeiro painel exploratório e publicação

**Nível 2 · Básico** — Pílulas azuis e verdes, agregação, datas, campos calculados, filtros e dashboards

- Dimensões × medidas e discreto (azul) × contínuo (verde) · Agregação e nível de detalhe da visualização · Datas: partes × valores, funções e ano fiscal · Campos calculados: lógica, nulos e texto · Filtros, hierarquias, grupos, conjuntos e compartimentos · Cálculos de tabela rápidos · Gráficos de negócio e boas práticas visuais · Formatação, dicas, painéis e histórias · Projeto: dashboard operacional com KPIs e filtros

**Nível 3 · Intermediário** — Ordem de operações, modelagem, LOD, cálculos de tabela, parâmetros, ações e Prep

- A ordem de operações do Tableau · Modelagem: relacionamentos, joins, unions, blending; Live × Extract · Expressões LOD: FIXED · INCLUDE, EXCLUDE e cenários reais com LOD · Cálculos de tabela avançados: direção, partição e janelas · Parâmetros, ações e visibilidade dinâmica · ETL self-service com o Tableau Prep · UX/UI, storytelling e design responsivo · Projeto: dashboard analítico dinâmico com dados tratados

**Nível 4 · Avançado** — Densificação, gráficos customizados, espacial, estatística, TabPy, performance e governança

- Densificação de dados e scaffolding · Geometria e gráficos customizados · Viz Extensions e camadas de mapa · Análise espacial avançada · Estatística no painel Análise: tendência, clusters e previsão · Extensões analíticas: TabPy, R e modelos externos · Performance: Hyper, consultas e otimização · Governança, permissões e segurança em nível de linha (RLS) · Conectividade híbrida: Bridge, conexões virtuais e políticas de dados · Preparação para as certificações oficiais · Projeto: solução corporativa otimizada, segura e customizada

**Nível 5 · Master** — Arquitetura enterprise, APIs, embedding, CI/CD, CoE e analytics agêntico

- Arquitetura enterprise do Tableau Server · REST API e Tableau Server Client (TSC) · Hyper API: gerar extrações por código · Metadata API (GraphQL): linhagem e análise de impacto · Embedding API v3 e Connected Apps · Extensions API, webhooks e Document API · AnalyticsOps: versionamento, ambientes e testes · Monitoramento do ambiente: repositório e Admin Insights · A nova era: Pulse, Tableau Agent, Tableau Next e camada semântica · Estratégia: Tableau Blueprint, CoE e cultura de dados · Capstone Enterprise: plano de implantação Tableau Blueprint

### Experimentação e Testes A/B

Exercícios em Python (NumPy e pandas, sem scipy: a Normal vem de `erf`/`NormalDist`) e em SQL sobre as tabelas `exp_atribuicoes`, `exp_exposicoes` e `exp_pedidos` do banco do app. Bases geradas com semente fixa: um e-commerce (teste do botão), um app de delivery (carrinho, sessões e segmentos), um streaming (CUPED e CTR), 12 capitais (DiD e controle sintético), dados observacionais (IPW), score de crédito (RDD), um switchback de preço dinâmico, um teste de cupom (uplift), 80 experimentos passados (meta-análise) e logs de recomendação (avaliação off-policy).

**Nível 1 · Básico** — Causa e randomização, hipóteses, distribuições, p-valor, poder, tamanho de amostra, OEC e guardrails, z e Welch, A/A

- Método científico nos negócios: correlação, causa e randomização · Hipóteses: H₀, H₁, bicaudal × unicaudal e hipóteses testáveis · Distribuições essenciais: Bernoulli, Binomial, Normal e Poisson · Lei dos Grandes Números, TLC e erro padrão · Rigor decisório: p-valor, α, erros tipo I e II, poder e intervalos · Tamanho de amostra, MDE e duração do teste · Taxonomia de métricas: OEC, secundárias e guardrails · Testes clássicos: z de proporções e t de Welch · Teste A/A: simulando 1.000 experimentos sem efeito · Projeto: o primeiro teste A/B planejado, calculado e interpretado

**Nível 2 · Intermediário** — Unidade de randomização, SRM, peeking, múltiplas comparações, caudas longas, bootstrap, segmentos, MVT, ameaças à validade, pipeline SQL e EDD

- Unidade de randomização × unidade de análise · SRM: Sample Ratio Mismatch, o alarme de integridade · Peeking: o perigo de espiar e parar cedo · A/B/n, testes multivariados (MVT) e design fatorial · Ameaças à validade: novidade, primazia, Hawthorne, cross-device e flicker · Múltiplas comparações: Bonferroni, Holm e Benjamini-Hochberg · Dados assimétricos e outliers: winsorization, log, Mann-Whitney e permutação · Bootstrap: intervalos para mediana, p95 e métricas assimétricas · Segmentos com controle de falso positivo e teste de interação · Pipeline em SQL: atribuição, triggering e sem vazamento temporal · Projeto: Experiment Design Doc e comunicação executiva

**Nível 3 · Avançado** — CUPED, Delta Method, testes sequenciais, bayesiano, efeitos de rede e switchback, DiD, controle sintético, IPW, RDD, IV e longo prazo

- Redução de variância: CUPED, CUPAC e estratificação · Métricas de razão e o Delta Method · Testes sequenciais: Pocock, O'Brien-Fleming, alpha spending e mSPRT · Experimentação bayesiana: Beta-Binomial, P(B > A) e perda esperada · Bayes Normal-Normal e priors empíricos para métricas contínuas · SUTVA e efeitos de rede: cluster, switchback e randomização bilateral · Inferência causal: resultados potenciais, DAGs e Difference-in-Differences · Controle sintético: um contrafactual feito de outras regiões · PSM, IPW, Regressão Descontínua e Variáveis Instrumentais · Efeitos de longo prazo: holdouts e métricas substitutas · Projeto: análise avançada com ganho de sensibilidade e quase-experimento

**Nível 4 · Master** — Bandits, uplift e CATE, interleaving, avaliação off-policy, meta-análise, arquitetura de plataforma, governança e scorecards

- Multi-Armed Bandits: explorar × aproveitar, regret, ε-greedy, UCB e Thompson · Simulação: bandit × A/B em cenários estacionários e não estacionários · Contextual bandits: a melhor ação para cada contexto · Efeitos heterogêneos e uplift: CATE, meta-learners, Causal Forest e DML · Política de segmentação ótima: tratar só onde o CATE paga o custo · Busca e recomendação: interleaving e avaliação off-policy · Meta-análise: winner's curse, Empirical Bayes e taxa de acerto · Arquitetura de plataforma: hashing, camadas ortogonais, feature flags e ramp-up · Governança, ética e maturidade da cultura de experimentação · Scorecard automatizado: SRM, CUPED, Delta Method, guardrails e BH · Capstone: o playbook de experimentação de uma empresa
