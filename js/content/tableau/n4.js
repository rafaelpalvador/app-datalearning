// Trilha Tableau — Nível 4: Avançado (engenharia visual, performance e governança)
import { theory, quiz, order, fill, tab, debugTab, exTab, py, exPy } from '../helpers.js';

const r = String.raw;
const ANO = { Ano: 'YEAR([Data do Pedido])' };
const MES = { Mês: 'DATETRUNC("month", [Data do Pedido])' };

const L_DENS = {
  id: 'tb-4-1', title: 'Densificação de dados e scaffolding',
  steps: [
    theory('Marcas que não existem nos dados', `
**Densificação** (*data densification*) é o Tableau criar marcas **que não existem na fonte**, para completar a visualização:
- **Preenchimento de domínio** (*domain padding*): numa data contínua, criar os meses sem vendas para a linha não "pular" o buraco (ativado por *Mostrar datas ausentes* ou por certos cálculos de tabela)
- **Completamento de domínio** (*domain completion*): numa matriz, criar as combinações que não existem (ex.: produto × mês sem venda), quando há um cálculo de tabela; aparecem como células vazias que podem receber \`ZN\`/\`LOOKUP\`

Ela é útil (curvas contínuas, acumulados que não "somem") e às vezes surpreende (marcas extras). Entender quando acontece é marca de especialista.

**Scaffolding** (andaime): quando os dados não têm as linhas que você precisa, **traga uma tabela auxiliar** com elas e relacione:
- **tabela calendário** (uma linha por dia/mês) para mostrar períodos sem eventos
- **"ativos por período"**: contratos/colaboradores com **data de início e de fim**. Cada contrato está ativo em **vários** meses, mas tem **uma** linha. Solução: relacionar a tabela calendário com os contratos pela condição \`Calendário.Mês >= Início AND Calendário.Mês <= Fim\` (relacionamento ou join por intervalo) e contar contratos por mês do calendário
- **tabelas de modelo** (*model tables*) com pontos 1..N para desenhar curvas (Sankey, arcos)
`),
    exPy('Contratos ativos por mês com uma tabela calendário', `
O mesmo raciocínio do scaffolding no Tableau, feito em pandas para você ver as linhas criadas:
`, r`import pandas as pd
contratos = pd.DataFrame({
    "contrato": ["C1", "C2", "C3", "C4"],
    "inicio": pd.to_datetime(["2025-01-01", "2025-02-01", "2025-02-01", "2025-04-01"]),
    "fim": pd.to_datetime(["2025-03-01", "2025-05-01", "2025-02-01", "2025-06-01"]),
})
calendario = pd.DataFrame({"mes": pd.date_range("2025-01-01", "2025-06-01", freq="MS")})
cruzado = calendario.merge(contratos, how="cross")
ativos = cruzado[(cruzado["mes"] >= cruzado["inicio"]) & (cruzado["mes"] <= cruzado["fim"])]
ativos.groupby("mes")["contrato"].nunique()`, `
O cruzamento (*cross join*) cria uma linha por mês × contrato; o filtro de intervalo deixa só os meses em que o contrato estava ativo. No Tableau, isso é um relacionamento/join por intervalo entre Calendário e Contratos.
`, { packages: ['pandas'] }),
    quiz('Você precisa mostrar quantos colaboradores estavam ativos em cada mês, mas a base tem uma linha por colaborador com data de admissão e de desligamento. Qual técnica?', ['Scaffolding: tabela calendário relacionada por intervalo de datas', 'Filtro de contexto', 'Blending com a mesma tabela', 'Uma hierarquia de datas'], 0),
    quiz('O gráfico de linha mensal "pula" os meses sem vendas. O que ativa a densificação desses meses?', ['Mostrar datas ausentes (preenchimento de domínio) numa data contínua', 'Trocar para barras', 'Filtro de medida', 'Extração incremental'], 0),
    py('Com `calendario` (coluna `mes`) e `contratos` (colunas `contrato`, `inicio`, `fim`) já carregados, calcule a Series `ativos_por_mes` com o número de contratos ativos em cada mês (cross join + filtro de intervalo + nunique).',
      r`cruzado = calendario.merge(contratos, how="cross")
ativos = cruzado[(cruzado["mes"] >= cruzado["inicio"]) & (cruzado["mes"] <= cruzado["fim"])]
ativos_por_mes = ativos.groupby("mes")["contrato"].nunique()`,
      r`assert list(ativos_por_mes.values) == [1, 3, 2, 2, 2, 1], list(ativos_por_mes.values)`,
      { setup: r`import pandas as pd
contratos = pd.DataFrame({"contrato": ["C1", "C2", "C3", "C4"], "inicio": pd.to_datetime(["2025-01-01", "2025-02-01", "2025-02-01", "2025-04-01"]), "fim": pd.to_datetime(["2025-03-01", "2025-05-01", "2025-02-01", "2025-06-01"])})
calendario = pd.DataFrame({"mes": pd.date_range("2025-01-01", "2025-06-01", freq="MS")})`, setupNote: 'Já carregados: `contratos` (contrato, inicio, fim) e `calendario` (mes, de jan a jun de 2025), além de `pd`.', packages: ['pandas'] }),
  ],
};

const L_GEOMETRIA = {
  id: 'tb-4-2', title: 'Geometria e gráficos customizados',
  steps: [
    theory('Gráficos que o Tableau não tem "de fábrica"', `
Gráficos avançados são construídos com **cálculos que geram coordenadas X e Y** e marcas de linha/polígono/círculo:

| gráfico | ideia | funções |
|---|---|---|
| **Radar / aranha** | cada eixo é um ângulo; o valor vira o raio: \`X = valor × COS(ângulo)\`, \`Y = valor × SIN(ângulo)\` | \`SIN\`, \`COS\`, \`PI()\`, \`RADIANS\`, \`INDEX\` |
| **Barras radiais / donut** | ângulo proporcional ao valor, desenhado com pontos de um *scaffold* | \`RUNNING_SUM\`, \`SIN\`, \`COS\` |
| **Sankey** | curvas **sigmoides** ligando categorias de origem e destino: \`1 / (1 + EXP(−t))\` em pontos t de −6 a 6 | \`EXP\`, tabela de pontos |
| **Funil curvo**, **arcos**, **chord** | curvas de Bézier e arcos com pontos de controle | trigonometria |
| **Gantt avançado** | marca Gantt com início em Colunas e duração em Tamanho (\`DATEDIFF\`) | datas |
| **Pequenos múltiplos** (*trellis*) | uma grade de mini gráficos: linha e coluna da grade calculadas pelo \`INDEX()\` | \`INDEX\`, \`INT\`, \`%\` |
| **Hex map** | estados como hexágonos de mesmo tamanho em posições fixas (tabela de coordenadas) | marca de forma |

Grade de pequenos múltiplos com 3 colunas:
~~~
// coluna (0, 1, 2) e linha (0, 1, 2...) de cada mini gráfico
(INDEX() - 1) % 3
INT((INDEX() - 1) / 3)
~~~
\`%\` é o resto da divisão; \`INT\` corta as casas decimais. Os dois são cálculos de tabela (dependem de \`INDEX\`), endereçando a dimensão que vira a grade.

Coordenadas de um radar com N eixos (cada marca é um eixo, ângulo começando no topo):
~~~
SUM([Valor]) * COS(2 * PI() * (INDEX() - 1) / SIZE())
~~~
`),
    exTab('Grade de pequenos múltiplos', `
Cada subcategoria recebe uma coluna (0 a 3) numa grade de 4 colunas:
`, `(INDEX() - 1) % 4`, `
Com a linha \`INT((INDEX() - 1) / 4)\` em Linhas e a coluna em Colunas, cada subcategoria vira um mini gráfico na sua célula.
`, { dims: ['Subcategoria'], nome: 'Coluna da grade' }),
    quiz('Num gráfico de radar, a coordenada X de cada ponto é...', ['valor × COS(ângulo)', 'valor × SIN(ângulo)', 'valor + ângulo', 'INDEX()'], 0),
    quiz('Que curva dá a forma das faixas de um Sankey?', ['Sigmoide: 1 / (1 + EXP(−t))', 'Reta', 'Parábola', 'Seno puro'], 0),
    tab('**Pequenos múltiplos**: calcule a **linha da grade** (0, 1, 2...) de cada subcategoria numa grade de 4 colunas.', 'INT((INDEX() - 1) / 4)', { dims: ['Subcategoria'], nome: 'Linha da grade' }),
    tab('**Radar**: as 4 subcategorias de Tecnologia são os eixos. Calcule a coordenada **Y** de cada ponto: vendas × SIN(2·π·(INDEX−1)/SIZE).', 'SUM([Vendas]) * SIN(2 * PI() * (INDEX() - 1) / SIZE())', { dims: ['Subcategoria'], filtro: { expr: '[Categoria] = "Tecnologia"' }, nome: 'Y' }),
    tab('**Gantt**: para cada linha, a **duração do envio** em dias (o que vai em Tamanho numa marca Gantt).', 'DATEDIFF("day", [Data do Pedido], [Data de Envio])', { dims: 'linha', mostrar: ['ID do Pedido'], nome: 'Duração' }),
  ],
};

const L_EXT = {
  id: 'tb-4-3', title: 'Viz Extensions e camadas de mapa',
  steps: [
    theory('Estendendo o Cartão de Marcas', `
**Viz Extensions** (2024.2+): novos **tipos de marca** no Cartão de Marcas, criados com a Extensions API (por Tableau ou parceiros, como Sankey, Radial, *Waffle*, *Gauge*). Você escolhe a extensão no menu de tipos de marca, arrasta os campos para os "encaixes" (*encodings*) que ela define, e ela desenha. Vantagens: gráficos complexos sem scaffolding; desvantagens: dependem da extensão (manutenção, permissões no Cloud/Server, que podem restringir extensões de rede).

**Extensões de painel** (*Dashboard Extensions*): objetos web dentro do painel (*write-back*, exportações, componentes de terceiros), também pela Extensions API. Arquivo de manifesto **.trex** (Nível 5).

**Camadas de mapa** (*Map Layers*, 2020.4+): arraste um campo geográfico para a área "Adicionar uma camada de marcas": cada camada tem **o seu Cartão de Marcas** (tipo, cor, tamanho). Substitui o eixo duplo em mapas e permite **várias** camadas: polígonos de estados + pontos de lojas + linhas de rotas + buffers. Truque avançado: usar camadas em gráficos **não geográficos**, com \`MAKEPOINT\` sobre coordenadas inventadas, para empilhar várias marcas (ex.: rótulos, barras e pontos) sem eixo duplo.
`),
    quiz('Qual a vantagem das Map Layers sobre o eixo duplo em mapas?', ['Várias camadas, cada uma com seu próprio Cartão de Marcas', 'São mais rápidas para calcular LOD', 'Dispensam campos geográficos', 'Funcionam só no Tableau Public'], 0),
    quiz('Uma Viz Extension aparece onde?', ['Como novo tipo de marca no Cartão de Marcas', 'No Painel de Filtros', 'Na página da fonte de dados', 'Como função de cálculo'], 0),
    quiz('Que arquivo descreve uma extensão (de painel ou de visualização)?', ['Manifesto .trex', '.twbx', '.hyper', '.tds'], 0),
  ],
};

const L_ESPACIAL = {
  id: 'tb-4-4', title: 'Análise espacial avançada',
  steps: [
    theory('Arquivos e funções espaciais', `
**Arquivos espaciais**: Shapefile (.shp + .shx + .dbf + .prj), **GeoJSON**, **KML**, **TopoJSON**, MapInfo, Esri File Geodatabase. Cada linha traz uma **geometria** (ponto, linha, polígono). O **SRID** identifica o sistema de coordenadas; o Tableau trabalha em **WGS 84 (SRID 4326)**: latitude/longitude em graus.

**Funções espaciais** (em campos calculados):
| função | resultado |
|---|---|
| \`MAKEPOINT(lat, lon)\` | ponto a partir de latitude e longitude |
| \`MAKELINE(ponto1, ponto2)\` | linha entre dois pontos (rotas, voos: origem → destino) |
| \`DISTANCE(p1, p2, 'km')\` | distância geodésica entre pontos ('km', 'mi', 'm') |
| \`BUFFER(ponto, 50, 'km')\` | círculo de raio fixo (área de influência de uma loja) |
| \`INTERSECTS(geo1, geo2)\` | verdadeiro se as geometrias se tocam |
| \`AREA\`, \`OUTLINE\`, \`SHAPETYPE\`, \`VALIDATE\` | medidas e utilidades |

**Junção espacial** (*spatial join*): na fonte de dados, junte uma tabela de **pontos** (clientes) com uma de **polígonos** (bairros) pela condição **Intersecta**: cada cliente ganha o bairro em que está.

**Distância "na mão"** (fórmula de Haversine/cossenos esféricos), útil quando não há funções espaciais na fonte:
~~~
6371 * ACOS(
  SIN(RADIANS([Latitude])) * SIN(RADIANS(-23.55)) +
  COS(RADIANS([Latitude])) * COS(RADIANS(-23.55)) * COS(RADIANS([Longitude] - (-46.63)))
)
~~~
6371 km é o raio da Terra; (−23,55; −46,63) é São Paulo. \`RADIANS\` converte graus em radianos; \`ACOS\` é o arco cosseno.
`),
    quiz('Para desenhar rotas de entrega da fábrica até cada cliente, use...', ['MAKELINE(MAKEPOINT(fábrica), MAKEPOINT(cliente))', 'BUFFER', 'INTERSECTS', 'AREA'], 0),
    quiz('Como descobrir em qual bairro (polígono) cada cliente (ponto) está?', ['Junção espacial com a condição Intersecta', 'Blending pelo nome do bairro', 'Union', 'Filtro de contexto'], 0),
    tab('Calcule, para cada linha, a **distância em km** da cidade do cliente até **São Paulo** (−23,55; −46,63), com a fórmula dos cossenos esféricos.', '6371 * ACOS(SIN(RADIANS([Latitude])) * SIN(RADIANS(-23.55)) + COS(RADIANS([Latitude])) * COS(RADIANS(-23.55)) * COS(RADIANS([Longitude] - (-46.63))))', { dims: 'linha', mostrar: ['Cidade'], nome: 'Distância até SP (km)' }),
    tab('Por **Cidade**, mostre a **distância média** até São Paulo (a mesma fórmula, agregada com AVG), para ordenar as cidades.', 'AVG(6371 * ACOS(SIN(RADIANS([Latitude])) * SIN(RADIANS(-23.55)) + COS(RADIANS([Latitude])) * COS(RADIANS(-23.55)) * COS(RADIANS([Longitude] - (-46.63)))))', { dims: ['Cidade'], nome: 'Distância média' }),
  ],
};

const L_STATS = {
  id: 'tb-4-5', title: 'Estatística no painel Análise: tendência, clusters e previsão',
  steps: [
    theory('O painel Análise', `
O painel **Análise** (ao lado de Dados) arrasta modelos prontos para a visualização:

**Linhas de tendência**: modelos **linear** (y = a + bx), **logarítmico**, **exponencial**, **polinomial** (grau 2 a 8) e **potência**. Em *Descrever a linha de tendência* o Tableau mostra a equação, o **R²** (fração da variação explicada, 0 a 1) e o **p-valor** do modelo (abaixo de 0,05 = a relação provavelmente não é acaso). Cuidado: R² alto não é causalidade; polinômios de grau alto sobreajustam.

**Linhas de referência, faixas e distribuições**: média, mediana, constante (meta), percentis, desvio-padrão, **intervalo de confiança**; **boxplot** (bigodes = 1,5 × IQR).

**Clusters**: **k-means** sobre as medidas da visualização (padroniza as variáveis), escolhendo o número de grupos pelo critério de **Calinski-Harabasz** se você não fixar. Resultado: um grupo (dimensão) por marca, que pode ser salvo como grupo.

**Previsão** (*forecast*): **suavização exponencial** (modelos com tendência e sazonalidade, escolhidos automaticamente), com **intervalo de previsão** (95% por padrão). Exige uma data e pelo menos alguns ciclos de histórico; *Descrever a previsão* mostra qualidade e componentes.

**Estatística em cálculos de tabela**: z-score de cada marca contra as outras (detecção de anomalias):
~~~
(SUM([Vendas]) - WINDOW_AVG(SUM([Vendas]))) / WINDOW_STDEV(SUM([Vendas]))
~~~
|z| > 2 = valor incomum para aquele grupo. \`WINDOW_STDEV\` é o desvio-padrão (amostral) na janela; \`WINDOW_VAR\`, a variância.

**Conferindo fora do Tableau**: a tendência linear é uma regressão de mínimos quadrados. Em Python, \`np.polyfit(x, y, 1)\` devolve \`[inclinação, intercepto]\`, e o **R²** é \`1 − Σ(y − previsto)² ÷ Σ(y − média)²\`. Bater os números do painel com um cálculo independente é um hábito de especialista.
`),
    exTab('Meses incomuns pelo z-score', `
Mês na visualização; o z-score de cada mês contra todos os meses:
`, `(SUM([Vendas]) - WINDOW_AVG(SUM([Vendas]))) / WINDOW_STDEV(SUM([Vendas]))`, `
Os novembros e dezembros mais recentes ficam acima de +2: picos sazonais somados ao crescimento. Para separar os dois efeitos, compare só meses iguais (particione pelo mês do ano).
`, { dims: ['Mês'], campos: MES, nome: 'z-score' }),
    quiz('Uma linha de tendência linear tem R² = 0,92 e p-valor = 0,001. O que se pode afirmar?', ['O modelo explica 92% da variação e a relação provavelmente não é acaso (mas não prova causa)', 'X causa Y', 'O modelo está errado', 'Os dados são normais'], 0),
    quiz('Qual método o Tableau usa nas previsões nativas?', ['Suavização exponencial com tendência e sazonalidade', 'Regressão logística', 'Redes neurais', 'ARIMA obrigatoriamente'], 0),
    tab('Por **Subcategoria**, calcule o **z-score** das vendas em relação a todas as subcategorias.', '(SUM([Vendas]) - WINDOW_AVG(SUM([Vendas]))) / WINDOW_STDEV(SUM([Vendas]))', { dims: ['Subcategoria'], nome: 'z-score' }),
    tab('Por **Mês**, marque com verdadeiro os meses **anômalos**: |z-score| maior que 2.', 'ABS((SUM([Vendas]) - WINDOW_AVG(SUM([Vendas]))) / WINDOW_STDEV(SUM([Vendas]))) > 2', { dims: ['Mês'], campos: MES, nome: 'Anomalia' }),
    py('O Tableau ajustou uma tendência **linear** às vendas anuais. Reproduza com numpy: com `anos` e `vendas` dados, calcule os coeficientes com `np.polyfit(anos, vendas, 1)` (guarde `inclinacao` e `intercepto`) e o **R²** (`r2`).',
      r`inclinacao, intercepto = np.polyfit(anos, vendas, 1)
previsto = intercepto + inclinacao * anos
r2 = 1 - ((vendas - previsto) ** 2).sum() / ((vendas - vendas.mean()) ** 2).sum()`,
      r`b, a = np.polyfit(anos, vendas, 1)
assert abs(inclinacao - b) < 1e-6 and abs(intercepto - a) < 1e-3
assert 0.95 < r2 <= 1`,
      { setup: 'import numpy as np\nanos = np.array([2022, 2023, 2024, 2025], dtype=float)\nvendas = np.array([1.58, 1.95, 2.38, 2.65]) * 1e6', setupNote: 'Já carregados: `anos` e `vendas` (vendas anuais em reais) e `np`.', packages: [] }),
  ],
};

const L_TABPY = {
  id: 'tb-4-6', title: 'Extensões analíticas: TabPy, R e modelos externos',
  steps: [
    theory('Como o Tableau conversa com Python e R', `
As **extensões analíticas** (*Analytics Extensions*) mandam dados da visualização para um serviço externo e recebem o resultado de volta, dentro de um campo calculado:
- **TabPy**: servidor Python oficial (\`pip install tabpy\` e \`tabpy\`, porta 9004)
- **Rserve**: servidor R
- **Einstein Discovery**, **Amazon SageMaker** e APIs próprias que seguem o protocolo de extensões

Configuração: no Desktop, *Ajuda → Configurações e desempenho → Gerenciar conexão de extensão analítica*; no Cloud/Server, o administrador habilita por site.

**Funções SCRIPT_**: o tipo do retorno define a função (\`SCRIPT_REAL\`, \`SCRIPT_INT\`, \`SCRIPT_STR\`, \`SCRIPT_BOOL\`):
~~~
SCRIPT_REAL("
import numpy as np
x = np.array(_arg1)
return ((x - x.mean()) / x.std()).tolist()
", SUM([Vendas]))
~~~
- os argumentos **precisam ser agregados** e chegam como **listas** \`_arg1\`, \`_arg2\`... (uma posição por marca)
- o script devolve uma lista **do mesmo tamanho**
- é um **cálculo de tabela**: o "Calcular usando" decide quais marcas vão juntas em cada chamada
- o TabPy também pode **publicar funções** (\`client.deploy("sentimento", funcao)\`) chamadas com \`tabpy.query('sentimento', _arg1)['response']\`, mantendo o código fora da pasta de trabalho

Usos: análise de sentimento de comentários, detecção de anomalias, previsões com scikit-learn ou Prophet, clusterização com mais controle, chamadas a modelos de linguagem.

Cuidados: latência (cada interação chama o serviço), segurança (código executado no servidor), dados enviados para fora, e reprodutibilidade (versionar o modelo).
`),
    quiz('Em SCRIPT_REAL("...", SUM([Vendas])), o que é _arg1 dentro do script?', ['Uma lista com SUM(Vendas) de cada marca da partição', 'O valor de uma linha', 'O total geral', 'O nome do campo'], 0),
    quiz('Por que o argumento de um SCRIPT_ precisa ser agregado?', ['Porque é um cálculo de tabela: trabalha sobre os valores das marcas', 'Porque o Python não aceita textos', 'Porque o TabPy só soma', 'Não precisa'], 0),
    fill('Complete a função para um script que devolve textos (ex.: "positivo"/"negativo").', 'SCRIPT____("...", ATTR([Comentário]))', [['STR']]),
    py('Escreva a função `tabpy_zscore(_arg1)` como o TabPy executaria: recebe uma **lista** de vendas por marca e devolve uma **lista** do mesmo tamanho com o z-score de cada valor (média e desvio-padrão populacional, ddof=0, com numpy).',
      r`def tabpy_zscore(_arg1):
    x = np.array(_arg1, dtype=float)
    return ((x - x.mean()) / x.std()).tolist()`,
      r`res = tabpy_zscore([10, 20, 30])
assert isinstance(res, list) and len(res) == 3
assert abs(res[0] + 1.2247448) < 1e-6 and abs(res[1]) < 1e-12`,
      { setup: 'import numpy as np', setupNote: 'Já carregado: `np`.', packages: [] }),
    py('Um **analisador de sentimento** simples para TabPy: escreva `sentimento(_arg1)` que recebe uma lista de comentários e devolve uma lista com "positivo" se o texto (em minúsculas) contém alguma palavra de `POSITIVAS`, "negativo" se contém alguma de `NEGATIVAS` (e nenhuma positiva), senão "neutro".',
      r`def sentimento(_arg1):
    saida = []
    for texto in _arg1:
        t = texto.lower()
        if any(p in t for p in POSITIVAS):
            saida.append("positivo")
        elif any(p in t for p in NEGATIVAS):
            saida.append("negativo")
        else:
            saida.append("neutro")
    return saida`,
      r`assert sentimento(["Entrega rápida, adorei", "Chegou quebrado", "Recebi hoje"]) == ["positivo", "negativo", "neutro"]`,
      { setup: 'POSITIVAS = ["adorei", "ótimo", "excelente", "rápida"]\nNEGATIVAS = ["quebrado", "atraso", "péssimo", "defeito"]', setupNote: 'Já carregadas: as listas `POSITIVAS` e `NEGATIVAS`.', packages: [] }),
  ],
};

const L_PERF = {
  id: 'tb-4-7', title: 'Performance: Hyper, consultas e otimização',
  steps: [
    theory('De onde vem a lentidão', `
**Motor Hyper**: armazenamento **colunar** (lê só as colunas usadas), compactado, consultas compiladas e paralelas, em memória quando cabe. Extrações bem feitas (sem colunas ocultas, com filtros de extração, agregadas quando possível) são a primeira otimização.

**Onde o tempo vai** (Gravador de Desempenho: *Ajuda → Configurações e desempenho → Iniciar gravação de desempenho*, que gera uma pasta de trabalho com a linha do tempo):
| evento | significa |
|---|---|
| **Executing Query** | a consulta ao banco/Hyper: modelo, filtros, LODs, fonte lenta |
| **Computing Layout** | desenho: marcas demais, painel complexo |
| **Computing Table Calculations** | cálculos de tabela pesados sobre muitas marcas |
| **Geocoding** | mapas com muitos locais |
| **Connecting to Data Source** | conexão lenta, autenticação |

O log mostra as **consultas SQL/Hyper** geradas: leia-as para achar subconsultas de LOD, joins desnecessários e filtros que não "descem" para o banco.

**Boas práticas que mais rendem:**
1. **menos marcas**: agregue mais; um painel com 100 mil marcas é lento e ilegível
2. **filtros**: prefira filtros de **contexto** para cortes grandes e frequentes (criam uma tabela temporária menor); evite "**Apenas valores relevantes**" em muitos filtros (cada um dispara consultas); filtros de intervalo/booleanos são mais baratos que listas enormes
3. **cálculos**: inteiros e **booleanos** são mais rápidos que **strings**; \`CASE\` é mais rápido que vários \`IF\` de igualdade; evite \`CONTAINS\`/\`LEFT\` em milhões de linhas; **materialize** cálculos na extração (*Calcular cálculos agora*)
4. **LOD**: evite LODs aninhadas e FIXED em dimensões de altíssima cardinalidade quando uma agregação simples resolve
5. **modelo**: relacionamentos com cardinalidade e integridade corretas; joins só com o necessário; **tabelas agregadas** para painéis executivos
6. **painel**: menos planilhas por painel (cada uma é uma consulta), ocultar planilhas não usadas, tamanho fixo (permite cache)
7. **cache**: consultas repetidas vêm do cache do Server/Cloud; agende atualizações para "aquecer" o cache
`),
    quiz('O Gravador de Desempenho mostra a maior parte do tempo em "Computing Layout". O que atacar primeiro?', ['O número de marcas e a complexidade do desenho', 'O índice do banco', 'A senha da conexão', 'Os filtros de extração'], 0),
    quiz('Qual cálculo tende a ser mais rápido em milhões de linhas?', ['[Lucro] < 0 (booleano)', 'IF [Lucro] < 0 THEN "Sim" ELSE "Não" END', 'CONTAINS(STR([Lucro]), "-")', 'LEFT(STR([Lucro]), 1) = "-"'], 0),
    quiz('Dez filtros com "Apenas valores relevantes" deixam o painel lento porque...', ['Cada filtro dispara consultas extras para recalcular a lista de valores', 'Eles desligam o cache', 'Eles criam extrações', 'Eles viram LODs'], 0),
    debugTab('Este campo marca itens com prejuízo usando texto, o que é lento em bases grandes. Reescreva como **booleano** (verdadeiro/falso) direto.', 'IF [Lucro] < 0 THEN "Sim" ELSE "Não" END', '[Lucro] < 0', { dims: 'linha', mostrar: ['Lucro'], nome: 'Com prejuízo' }),
    debugTab('Este cálculo testa a categoria com vários IF de igualdade. Reescreva com **CASE** (mesmo resultado, mais rápido e legível): Tecnologia → 1, Móveis → 2, Material de Escritório → 3.', 'IF [Categoria] = "Tecnologia" THEN 1 ELSEIF [Categoria] = "Móveis" THEN 2 ELSE 4 END', 'CASE [Categoria] WHEN "Tecnologia" THEN 1 WHEN "Móveis" THEN 2 WHEN "Material de Escritório" THEN 3 END', { dims: 'linha', mostrar: ['Categoria'], nome: 'Código da categoria' }),
  ],
};

const RLS_GERENTES = 'CASE [Região] WHEN "Sul" THEN "marcos.lima" WHEN "Sudeste" THEN "ana.souza" WHEN "Nordeste" THEN "joao.costa" WHEN "Norte" THEN "joao.costa" ELSE "paula.dias" END';

const L_GOV = {
  id: 'tb-4-8', title: 'Governança, permissões e segurança em nível de linha (RLS)',
  steps: [
    theory('Organização e permissões no Cloud/Server', `
**Hierarquia de conteúdo**: **Site** (ambiente isolado, com seus usuários) → **Projetos** (e subprojetos, como pastas) → **Pastas de trabalho**, **Fontes de dados publicadas**, **Fluxos**, **Métricas**.

**Papéis de licença** (*site roles*): Creator, Explorer (pode publicar), Explorer, Viewer, mais **Administrador do site** e **Administrador do servidor**. A licença define o **máximo** que alguém pode fazer.

**Permissões**: regras por **grupo** (boa prática; evite por usuário) em cada projeto/conteúdo: Ver, Filtrar, Baixar, Editar, Excluir, Definir permissões... **Permissão efetiva** = o que a licença permite ∩ o que as regras concedem; uma **Negação** explícita vence uma Permissão. Bloqueie as permissões no nível do **projeto** para governar centralmente.

**Fontes publicadas certificadas**: uma fonte oficial por assunto (com cálculos e RLS embutidos), marcada como **Certificada**: todos usam a mesma definição de "Receita".

**Tableau Catalog** (Data Management): inventário de bancos, tabelas, colunas, fontes e painéis com **linhagem** (de onde vem cada campo, quem depende dele: *análise de impacto*), descrições e **avisos de qualidade de dados** (ex.: "Atualização atrasada", "Dados obsoletos", "Em manutenção") que aparecem para quem usa o conteúdo.
`),
    theory('Segurança em nível de linha (RLS)', `
**RLS** faz cada usuário ver **só as linhas** que pode, no mesmo painel. Abordagens:

**1. Filtro de usuário com tabela de direitos** (*entitlement table*, a mais escalável): uma tabela \`direitos(usuario, regiao)\` relacionada aos dados, e um filtro de fonte de dados:
~~~
[Usuário] = USERNAME()
~~~
- \`USERNAME()\`: login de quem está vendo; \`FULLNAME()\`: nome completo
- \`ISMEMBEROF("Diretoria")\`: verdadeiro se o usuário está no **grupo** do Cloud/Server

Combinação comum (gerentes veem a própria região; diretoria vê tudo):
~~~
ISMEMBEROF("Diretoria") OR [Gerente Regional] = USERNAME()
~~~

**2. Filtro de usuário manual** (*Servidor → Criar filtro de usuário*): mapeia usuários a valores à mão; não escala.

**3. RLS no banco** (conexão ao vivo com credenciais do usuário ou \`SET\` de sessão) ou **Políticas de dados** em **Conexões Virtuais** (próxima lição): a regra fica centralizada, fora da pasta de trabalho.

Regras de ouro: aplique como **filtro de fonte de dados** numa fonte **publicada** (o usuário não consegue removê-lo); impeça o download dos dados completos; **teste com "Visualizar como usuário"**; documente a regra.
`),
    quiz('Um gerente tem licença Viewer e a regra do projeto dá "Editar" ao grupo dele. O que ele consegue?', ['Só o que a licença Viewer permite (ver e interagir): a permissão efetiva é a interseção', 'Editar', 'Excluir', 'Publicar'], 0),
    quiz('Qual a forma mais escalável de RLS por região para 300 gerentes?', ['Tabela de direitos (usuário × região) + filtro [Usuário] = USERNAME() na fonte publicada', 'Um filtro de usuário manual com 300 entradas', 'Uma pasta de trabalho por gerente', 'Um parâmetro com a região'], 0),
    quiz('Para onde olhar antes de renomear uma coluna no banco, para saber quais painéis vão quebrar?', ['Linhagem/análise de impacto no Tableau Catalog', 'Gravador de desempenho', 'Painel Análise', 'Histórias'], 0),
    tab('**RLS**: o campo **[Gerente Regional]** (já criado) diz o login do gerente de cada região. Escreva o filtro que deixa o usuário conectado (**ana.souza**) ver só as linhas da região dele.', '[Gerente Regional] = USERNAME()', { dims: 'linha', mostrar: ['Região'], campos: { 'Gerente Regional': RLS_GERENTES }, usuario: { login: 'ana.souza', grupos: ['Gerentes'] }, nome: 'Pode ver' }),
    tab('**RLS com grupo**: amplie o filtro para que membros do grupo **"Diretoria"** vejam tudo. O usuário conectado é **paula.dias**, que está na Diretoria.', 'ISMEMBEROF("Diretoria") OR [Gerente Regional] = USERNAME()', { dims: 'linha', mostrar: ['Região'], campos: { 'Gerente Regional': RLS_GERENTES }, usuario: { login: 'paula.dias', grupos: ['Diretoria'] }, nome: 'Pode ver' }),
    tab('Com o filtro RLS aplicado como **filtro de contexto** (usuário **marcos.lima**, gerente do Sul), mostre as vendas por **Categoria** que ele enxerga.', 'SUM([Vendas])', { dims: ['Categoria'], campos: { 'Gerente Regional': RLS_GERENTES }, filtro: { expr: '[Gerente Regional] = USERNAME()', contexto: true }, usuario: { login: 'marcos.lima', grupos: ['Gerentes'] }, nome: 'Vendas visíveis' }),
  ],
};

const L_HIBRIDO = {
  id: 'tb-4-9', title: 'Conectividade híbrida: Bridge, conexões virtuais e políticas de dados',
  steps: [
    theory('Dados on-premises no Tableau Cloud', `
**Tableau Bridge**: um cliente instalado **dentro da rede da empresa** que conecta o **Tableau Cloud** a dados que a nuvem não alcança (banco no datacenter, arquivos na rede). Ele abre conexões **de saída** (não precisa abrir portas de entrada no firewall) e:
- atualiza **extrações** agendadas de fontes privadas
- mantém **conexões ao vivo** para fontes privadas suportadas
- roda em **pools** de vários clientes Bridge para alta disponibilidade

**Conexões virtuais** (*Virtual Connections*, Data Management): um recurso publicado que guarda **a conexão e as credenciais** em um lugar só, com as tabelas escolhidas. Os criadores usam a conexão virtual sem ver senhas; a equipe de dados troca o banco ou a credencial **uma vez** para todos.

**Políticas de dados** (*Data Policies*) nas conexões virtuais: regras de **RLS centralizadas** aplicadas às tabelas, com condições usando \`USERNAME()\`, \`ISMEMBEROF()\` e tabelas de direitos. Todo conteúdo que usa a conexão virtual herda a política, e ela não pode ser removida pelo autor do painel. É o jeito mais governado de fazer RLS em escala.
`),
    quiz('O banco de dados fica no datacenter da empresa e o painel está no Tableau Cloud. O que permite atualizar a extração sem abrir portas de entrada no firewall?', ['Tableau Bridge', 'Tableau Reader', 'Blending', 'TabPy'], 0),
    quiz('Qual a vantagem de RLS por Política de Dados numa Conexão Virtual?', ['A regra fica centralizada e é herdada por todo conteúdo que usa a conexão, sem o autor poder removê-la', 'É mais rápida que extrações', 'Dispensa licenças', 'Funciona no Tableau Public'], 0),
    quiz('A senha do banco mudou e 80 pastas de trabalho usam esse banco. Com conexões virtuais, o que fazer?', ['Atualizar a credencial uma vez na conexão virtual', 'Editar as 80 pastas', 'Republicar tudo', 'Criar 80 extrações'], 0),
  ],
};

const L_CERT = {
  id: 'tb-4-10', title: 'Preparação para as certificações oficiais',
  steps: [
    theory('Desktop Foundations e Data Analyst', `
**Salesforce Certified Tableau Desktop Foundations** (antigo *Desktop Specialist*): fundamentos do Desktop. Domínios: **conectar e preparar dados** (tipos, relacionamentos, joins, unions, extrações), **explorar e analisar** (filtros, ordenações, grupos, conjuntos, hierarquias, cálculos básicos e rápidos, mapas), **compartilhar** (painéis, histórias, exportação, publicação). Cobre os Níveis 1 e 2 deste curso.

**Salesforce Certified Tableau Data Analyst**: análise completa, com tarefas práticas. Quatro domínios: **conectar e transformar dados** (inclui Prep), **explorar e analisar** (LOD, cálculos de tabela, parâmetros, estatística do painel Análise), **criar conteúdo** (painéis, ações, DZV, formatação) e **publicar e gerenciar** no Cloud/Server (permissões, agendamentos, alertas, assinaturas). Cobre os Níveis 1 a 4.

Os formatos, a validade e os pesos mudam: **confira o guia oficial do exame no Trailhead** antes de agendar.

**Estratégia de estudo:**
1. refaça os projetos dos níveis 1 a 3 no Tableau Desktop/Public, cronometrando
2. domine as perguntas "pegadinha": ordem de operações, FIXED × filtros, COUNT × COUNTD, partes × valores de data, contínuo × discreto, relacionamento × join × blending, Live × Extract
3. use os exemplos e simulados do Trailhead (módulos de preparação gratuitos)
4. treine leitura rápida de enunciados: muitas questões são "qual o resultado deste cálculo nesta visualização"
`),
    quiz('Revisão: com Região num filtro comum, um FIXED [Categoria] calcula...', ['Sobre todas as regiões (ignora o filtro de dimensão)', 'Só a região filtrada', 'Erro', 'Depende do Top N'], 0),
    quiz('Revisão: MÊS(Data) azul com 12 cabeçalhos é...', ['Parte de data, discreta (soma todos os anos em cada mês)', 'Valor de data contínuo', 'Uma medida', 'Um conjunto'], 0),
    quiz('Revisão: qual é calculado depois dos filtros de medida?', ['Cálculos de tabela', 'LOD FIXED', 'Filtros de contexto', 'Filtros de extração'], 0),
    quiz('Revisão: duas tabelas em grãos diferentes (itens e metas mensais), no mesmo banco. Melhor modelagem?', ['Relacionamento', 'Join interno', 'Union', 'Blending'], 0),
    tab('Revisão: por **Região**, o número de **clientes distintos** (não de linhas).', 'COUNTD([ID do Cliente])', { dims: ['Região'], nome: 'Clientes' }),
    tab('Revisão: por **Categoria**, o **percentual do total** de lucro.', 'SUM([Lucro]) / TOTAL(SUM([Lucro]))', { dims: ['Categoria'], nome: '% do lucro' }),
  ],
};

const L_PROJETO4 = {
  id: 'tb-4-11', title: 'Projeto: solução corporativa otimizada, segura e customizada',
  steps: [
    theory('O entregável do Nível 4', `
Uma **solução corporativa de vendas** publicada no Cloud/Server:
1. **Fonte publicada certificada** (extração otimizada: colunas ocultas, filtros de extração, cálculos materializados)
2. **RLS**: tabela de direitos + \`ISMEMBEROF("Diretoria") OR [Usuário] = USERNAME()\`, testada com "Visualizar como"
3. **Painel executivo** com: Pareto, z-score de anomalias mensais, mapa com distância até o CD e um gráfico customizado (radar ou Sankey) ou Viz Extension
4. **Contratos/clientes ativos por mês** via scaffolding
5. **Relatório de performance**: gravação antes/depois, com as otimizações feitas
6. Linhagem documentada no Catalog e aviso de qualidade configurado

Cálculos finais abaixo.
`),
    tab('**Alerta de anomalia** para o painel: por **Mês**, devolva "Alerta" quando o z-score das vendas passar de 2 em módulo, senão "Normal".', 'IIF(ABS((SUM([Vendas]) - WINDOW_AVG(SUM([Vendas]))) / WINDOW_STDEV(SUM([Vendas]))) > 2, "Alerta", "Normal")', { dims: ['Mês'], campos: MES, nome: 'Status' }),
    tab('**Visão do gerente** (usuário **joao.costa**, que cuida de Norte e Nordeste) com RLS em contexto: margem por **Região** que ele enxerga.', 'SUM([Lucro]) / SUM([Vendas])', { dims: ['Região'], campos: { 'Gerente Regional': RLS_GERENTES }, filtro: { expr: 'ISMEMBEROF("Diretoria") OR [Gerente Regional] = USERNAME()', contexto: true }, usuario: { login: 'joao.costa', grupos: ['Gerentes'] }, nome: 'Margem' }),
    tab('**Participação no total da empresa sob RLS**: para o mesmo gerente (joao.costa, RLS em contexto), mostre por **Região** a participação nas vendas **que ele pode ver** (TOTAL).', 'SUM([Vendas]) / TOTAL(SUM([Vendas]))', { dims: ['Região'], campos: { 'Gerente Regional': RLS_GERENTES }, filtro: { expr: '[Gerente Regional] = USERNAME()', contexto: true }, usuario: { login: 'joao.costa', grupos: ['Gerentes'] }, nome: '% visível' }),
    order('Ordene a otimização de um painel lento:', ['gravar o desempenho e achar o gargalo', 'ler as consultas geradas', 'reduzir marcas, filtros e cálculos caros', 'materializar na extração', 'gravar de novo e comparar']),
  ],
};

export const TB_N4 = {
  id: 'tb-u4', level: 4, title: 'Engenharia visual, performance e governança',
  description: 'Densificação, scaffolding, gráficos customizados, Viz Extensions, espacial, estatística, TabPy, performance, RLS, Catalog, Bridge e certificações. Entregável: solução corporativa otimizada e segura',
  lessons: [L_DENS, L_GEOMETRIA, L_EXT, L_ESPACIAL, L_STATS, L_TABPY, L_PERF, L_GOV, L_HIBRIDO, L_CERT, L_PROJETO4],
};
