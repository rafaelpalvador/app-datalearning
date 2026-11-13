# Currículo completo — Datum

Legenda: ✅ implementado no app · 🔜 próximo lote de conteúdo (planejado)

Cada lição segue o mesmo ciclo pedagógico:
**teoria curta (1–2 cards) → reconhecimento (quiz/montar) → prática guiada (completar lacunas) → prática real (escrever SQL/Python) → aplicação (problema de negócio)**.

---

## Trilha 1 — SQL do Zero ao Avançado

### Nível 1 · Fundamentos
| Unidade | Lições | Status |
|---|---|---|
| 1. Primeiros passos | O que é SQL e bancos relacionais · SELECT/FROM/alias · ORDER BY, LIMIT/OFFSET, DISTINCT | ✅ |
| 2. Filtrando dados | WHERE e comparações · AND/OR/NOT/IN/BETWEEN · LIKE e NULL/COALESCE · funções de texto/número e CASE WHEN | ✅ |
| 3. Agregações | COUNT/SUM/AVG/MIN/MAX · GROUP BY · HAVING e ordem lógica de execução | ✅ |

### Nível 2 · Intermediário
| Unidade | Lições | Status |
|---|---|---|
| 4. JOINs | INNER JOIN · LEFT JOIN e anti-join · múltiplos JOINs, self join, UNION/INTERSECT/EXCEPT | ✅ |
| 5. Subconsultas e CTEs | subqueries escalares/IN/FROM · correlacionadas e EXISTS · CTEs (WITH) · CTE recursiva | ✅ |
| 7. Datas, textos e tipos | funções de data (SQLite × PostgreSQL × MySQL) · CAST, divisão inteira, NULLIF, tipos numéricos | ✅ |
| 7b. Textos avançados | REGEXP, SPLIT_PART, STRING_AGG/GROUP_CONCAT, TRIM/LPAD, normalização de acentos | 🔜 |

### Nível 3 · Avançado
| Unidade | Lições | Status |
|---|---|---|
| 6. Window functions | OVER/PARTITION BY · ROW_NUMBER/RANK/DENSE_RANK/NTILE · LAG/LEAD, acumulados e médias móveis (frames) | ✅ |
| 8. Modificando e modelando | INSERT/UPDATE/DELETE, transações e ACID · CREATE TABLE, constraints, normalização (1FN–3FN), views | ✅ |
| 9. Performance e análises | índices e plano de execução · ticket médio, recorrência, coorte, Pareto, funil | ✅ |
| 10. Modelagem dimensional | fatos e dimensões, star/snowflake schema, SCD tipo 1 e 2, granularidade | 🔜 |
| 11. SQL analítico avançado | GROUPING SETS/ROLLUP/CUBE, PIVOT/UNPIVOT, FILTER, QUALIFY, gaps & islands, sessionização, deduplicação | 🔜 |
| 12. JSON e semiestruturados | JSON_EXTRACT, ->>, UNNEST/arrays, STRUCTs no BigQuery | 🔜 |
| 13. Performance profunda | EXPLAIN ANALYZE no Postgres, tipos de índice (B-Tree, Hash, GIN, BRIN), particionamento, materialized views, estatísticas | 🔜 |
| 14. SQL na nuvem e no dia a dia | BigQuery, Snowflake, Redshift, Databricks SQL; custos; dbt (models, tests, refs, incremental) | 🔜 |
| 15. Administração e segurança | usuários e GRANT/REVOKE, roles, row-level security, backups, níveis de isolamento, deadlocks, SQL injection | 🔜 |
| 16. Entrevistas de SQL | 50 problemas clássicos (segundo maior salário, top N por grupo, retenção D1/D7/D30, médias móveis, mediana) | 🔜 |

---

## Trilha 2 — Python para Análise de Dados

### Nível 1 · Fundamentos de Python
| Unidade | Lições | Status |
|---|---|---|
| 1. Python essencial | tipos, f-strings, listas e fatiamento · dicts, tuplas e sets · condições, laços, funções, comprehensions, lambda, try/except | ✅ |
| 1b. Python intermediário | módulos e pacotes, ambientes virtuais (venv/uv/conda), arquivos e `pathlib`, `datetime`, `collections`, `itertools`, type hints, classes e dataclasses, logging | 🔜 |

### Nível 2 · Manipulação de dados
| Unidade | Lições | Status |
|---|---|---|
| 2. NumPy | arrays e vetorização · máscaras booleanas, `np.where`, eixos e broadcasting | ✅ |
| 3. pandas: fundamentos | Series/DataFrame e leitura · `loc`/`iloc`, filtros, `query` · novas colunas, `pd.cut`, `map`, ordenação | ✅ |
| 4. pandas: agregar e combinar | `groupby`/`agg`/`transform` · `merge` (incl. anti-join com `indicator`) e `concat` · `pivot_table`, `melt`, `crosstab` | ✅ |
| 5. Limpeza de dados | nulos (imputação) e duplicados · tipos, textos (`.str`), formato brasileiro, outliers (IQR) | ✅ |
| 6. Datas e séries temporais | `to_datetime`, `.dt`, `resample`, `pct_change`, `cumsum`, `shift`, `rolling` | ✅ |
| 6b. pandas avançado | MultiIndex, `pipe` e method chaining, categorias e otimização de memória, `window` customizado, `explode` | 🔜 |
| 6c. Polars e DuckDB | API lazy, expressões, comparação com pandas, SQL sobre Parquet/DataFrames | 🔜 |

### Nível 3 · Visualização, extração e estatística
| Unidade | Lições | Status |
|---|---|---|
| 7. Visualização | matplotlib/pandas.plot, escolha do gráfico, boas práticas; seaborn e plotly (teoria) | ✅ |
| 7b. Visualização na prática | seaborn (distribuições, relações, facetas), plotly express, storytelling, dashboards em Streamlit | 🔜 |
| 8. Extração de dados | arquivos (CSV, Excel, JSON, Parquet) e `json_normalize` · APIs com `requests` (paginação, retry, rate limit) · scraping com BeautifulSoup (ética) · Python + SQL (`sqlite3`, `read_sql`, `to_sql`, SQLAlchemy) | ✅ |
| 8b. Extração avançada | OAuth, `httpx`/async, Selenium/Playwright, Scrapy, Google Sheets API, APIs públicas BR (IBGE, BCB-SGS, Portal da Transparência) | 🔜 |
| 9. Estatística e próximos passos | estatística descritiva, correlação vs causalidade · mapa do ecossistema (scikit-learn, dbt, Airflow, Spark...) | ✅ |
| 10. Estatística inferencial | distribuições, amostragem, intervalos de confiança, testes de hipótese, testes A/B com SciPy/statsmodels | 🔜 |
| 11. Machine Learning aplicado | regressão, classificação, validação cruzada, métricas, pipelines do scikit-learn, feature engineering | 🔜 |
| 12. Engenharia de dados para analistas | pipelines ETL/ELT, Airflow/Prefect, qualidade de dados (Pandera/Great Expectations), testes com pytest, Git | 🔜 |

---

## Trilha 3 — Estatística para Dados ✅

| Unidade | Lições |
|---|---|
| 1. Estatística descritiva | média, mediana e moda · variância, desvio e CV · quartis, boxplot e outliers (IQR e z-score) |
| 2. Probabilidade e distribuições | probabilidade e Bayes · normal, z-score e TCL · binomial |
| 3. Amostragem e intervalos | erro padrão e IC da média · IC de proporções e bootstrap |
| 4. Testes de hipótese e A/B | hipóteses e p-valor · teste z de duas proporções · t de Welch e armadilhas (espiar, testes múltiplos, Simpson) |
| 5. Correlação e regressão | Pearson e Spearman · regressão linear e R² |
| 6. Séries temporais aplicadas | sazonalidade, tendência e médias móveis · detecção de anomalias |

## Entrevistas ✅

68 problemas em 4 níveis, separados por linguagem:

| Nível | SQL | Python |
|---|---|---|
| Júnior | 10 | 7 |
| Pleno | 10 | 7 |
| Sênior | 10 | 7 |
| Especialista | 10 | 7 |

## Projetos práticos (capstones) 🔜

1. **E-commerce**: do banco bruto ao dashboard — SQL de coorte + pandas + Streamlit
2. **Dados públicos do Brasil**: coletar a API do Banco Central (Selic/IPCA), tratar e visualizar
3. **Web scraping de preços**: coletar, limpar e monitorar variações
4. **Teste A/B**: analisar um experimento e escrever a recomendação
5. **Pipeline diário**: extrair API → Parquet → DuckDB → relatório automático

Cada projeto termina com um **relatório no portfólio** do aluno (ver `docs/IDEIAS.md`).

## Biblioteca de referência por categoria

| Categoria | Bibliotecas cobertas/planejadas |
|---|---|
| Manipulação | pandas, NumPy, Polars, DuckDB, PyArrow |
| Visualização | matplotlib, seaborn, plotly, altair, Streamlit, Dash |
| Estatística | SciPy, statsmodels, pingouin |
| Machine Learning | scikit-learn, XGBoost, LightGBM |
| Extração | requests, httpx, BeautifulSoup, lxml, Scrapy, Selenium, Playwright |
| Bancos de dados | sqlite3, SQLAlchemy, psycopg, pyodbc, google-cloud-bigquery, snowflake-connector |
| Arquivos | openpyxl, xlsxwriter, pyarrow (Parquet), json, csv |
| Qualidade e testes | Pandera, Great Expectations, pytest |
| Orquestração | Airflow, Prefect, Dagster |
| Big Data | PySpark, Dask |
