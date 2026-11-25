// Trilha Tableau — Nível 2: Básico (visualização essencial e exploração)
import { theory, quiz, order, fill, tab, debugTab, exTab } from '../helpers.js';

const ANO = { Ano: 'YEAR([Data do Pedido])' };
const MES = { Mês: 'DATETRUNC("month", [Data do Pedido])' };

const L_PILULAS = {
  id: 'tb-2-1', title: 'Dimensões × medidas e discreto (azul) × contínuo (verde)',
  steps: [
    theory('Dois eixos de classificação diferentes', `
Todo campo tem **duas** classificações independentes, e confundi-las é o erro nº 1 de quem começa:

**Papel: dimensão ou medida**
- **Dimensão**: qualitativa, usada para **dividir** a visualização (Região, Categoria, Data, Cliente). Aparece no topo do Painel de Dados
- **Medida**: quantitativa, é **agregada** (Vendas, Lucro, Quantidade). Aparece embaixo

**Tipo de pílula: discreta (azul) ou contínua (verde)**
- **Discreto (azul)**: valores separados e distintos. Na prateleira, cria **cabeçalhos** (um rótulo por valor). Em Cor, cria uma **paleta categórica**
- **Contínuo (verde)**: uma faixa infinita de valores. Na prateleira, cria um **eixo**. Em Cor, cria um **gradiente**

As combinações mais comuns são dimensão-azul e medida-verde, **mas todas as quatro existem**:
| | discreto (azul) | contínuo (verde) |
|---|---|---|
| **dimensão** | Região, ANO(Data) como "2024, 2025" | MÊS(Data) contínuo: linha do tempo com eixo |
| **medida** | SUM(Vendas) convertida em discreta: vira cabeçalhos com os valores | SUM(Vendas) num eixo |

Por que importa: a cor da pílula decide se o Tableau desenha **cabeçalhos ou eixo**, **paleta ou gradiente**, e como **filtros** funcionam (lista de valores × intervalo).

Clique com o botão direito na pílula para alternar Discreto/Contínuo, ou Dimensão/Medida.
`),
    quiz('Você arrastou ANO(Data do Pedido) e apareceram cabeçalhos "2022 2023 2024 2025". De que cor é a pílula?', ['Azul (discreta)', 'Verde (contínua)', 'Laranja', 'Cinza'], 0),
    quiz('Qual combinação gera um gradiente de cores na visualização?', ['Uma pílula contínua (verde) em Cor', 'Uma pílula discreta (azul) em Cor', 'Uma dimensão em Detalhe', 'Um filtro de contexto'], 0),
    quiz('Uma medida pode ser discreta?', ['Sim: convertida em discreta, cria cabeçalhos com os valores', 'Não, medidas são sempre verdes', 'Só se for texto', 'Só em mapas'], 0),
    order('Ordene do "divide a visualização" ao "é agregado":', ['dimensão discreta (cabeçalhos)', 'dimensão contínua (eixo de datas)', 'medida agregada (eixo de valores)']),
  ],
};

const L_AGG = {
  id: 'tb-2-2', title: 'Agregação e nível de detalhe da visualização',
  steps: [
    theory('Como o Tableau agrega', `
Toda medida na visualização é **agregada** no **nível de detalhe** (VizLOD) formado pelas dimensões presentes (Linhas, Colunas, Cor, Tamanho, Detalhe, Rótulo...).

| agregação | o que calcula | exemplo de uso |
|---|---|---|
| \`SUM\` | soma | vendas totais |
| \`AVG\` | média | venda média por item |
| \`MIN\` / \`MAX\` | menor / maior valor | primeira e última data, maior desconto |
| \`COUNT\` | quantidade de valores **não nulos** (conta linhas) | número de itens |
| \`COUNTD\` | quantidade de valores **distintos** | número de pedidos, de clientes |
| \`MEDIAN\` | mediana | valor típico quando há extremos |
| \`ATTR\` | o valor se for único no grupo, senão \`*\` | mostrar um atributo que deveria ser único |

**Cada dimensão adicionada muda o grão**: com Região na visualização, há 5 marcas; adicionando Categoria, 15; adicionando Cliente, centenas. A mesma expressão \`SUM([Vendas])\` dá valores diferentes em cada caso.

**Cálculos agregados**: você pode combinar agregações numa fórmula, como a **margem**:
~~~
SUM([Lucro]) / SUM([Vendas])
~~~
Isso é diferente de \`AVG([Lucro] / [Vendas])\`, que calcula a margem de **cada linha** e tira a média (dá o mesmo peso a um item de R$ 14 e a um de R$ 9.800). Para razões, quase sempre é **soma ÷ soma**.

**Ticket médio por pedido**: como a base tem uma linha por item, \`AVG([Vendas])\` é a média **por item**. Por pedido:
~~~
SUM([Vendas]) / COUNTD([ID do Pedido])
~~~
`),
    exTab('Margem: soma ÷ soma', `
Margem de lucro por categoria:
`, `SUM([Lucro]) / SUM([Vendas])`, `
Material de Escritório vende pouco mas tem a melhor margem; Móveis tem a pior (descontos altos).
`, { dims: ['Categoria'], nome: 'Margem' }),
    quiz('Por que COUNT([ID do Pedido]) NÃO dá o número de pedidos nesta base?', ['Porque cada pedido ocupa várias linhas (uma por item): COUNT conta linhas; o certo é COUNTD', 'Porque COUNT ignora textos', 'Porque COUNT só funciona com números', 'Dá sim'], 0),
    tab('Por **Região**, conte o **número de pedidos** distintos.', 'COUNTD([ID do Pedido])', { dims: ['Região'], nome: 'Pedidos' }),
    tab('Por **Segmento**, calcule o **ticket médio por pedido** (vendas ÷ pedidos distintos).', 'SUM([Vendas]) / COUNTD([ID do Pedido])', { dims: ['Segmento'], nome: 'Ticket médio' }),
    debugTab('O cálculo abaixo deveria dar a margem por **Região**, mas calcula a média das margens de cada linha. Corrija para soma ÷ soma.', 'AVG([Lucro] / [Vendas])', 'SUM([Lucro]) / SUM([Vendas])', { dims: ['Região'], nome: 'Margem' }),
    tab('Por **Categoria**, mostre o **maior desconto** concedido.', 'MAX([Desconto])', { dims: ['Categoria'], nome: 'Maior desconto' }),
    tab('Por **Subcategoria**, mostre a **mediana** das vendas por item.', 'MEDIAN([Vendas])', { dims: ['Subcategoria'], nome: 'Mediana' }),
  ],
};

const L_DATAS = {
  id: 'tb-2-3', title: 'Datas: partes × valores, funções e ano fiscal',
  steps: [
    theory('Partes de data × valores de data', `
Ao arrastar uma data, o Tableau oferece dois grupos no menu da pílula:

| | **Partes de data** (*date parts*) | **Valores de data** (*date values*, truncados) |
|---|---|---|
| exemplo de "mês" | **Janeiro**: soma todos os janeiros de todos os anos | **Janeiro de 2025**: só aquele mês |
| tipo padrão | discreto (azul) | contínuo (verde) |
| uso | sazonalidade ("em que mês vendemos mais, em qualquer ano?") | linha do tempo, tendência |
| função equivalente | \`MONTH([Data])\`, \`DATEPART('month', [Data])\` | \`DATETRUNC('month', [Data])\` |

**Funções de data:**
| função | resultado | exemplo |
|---|---|---|
| \`YEAR(d)\`, \`QUARTER(d)\`, \`MONTH(d)\`, \`DAY(d)\` | número | \`YEAR([Data do Pedido])\` → 2025 |
| \`DATEPART('parte', d)\` | número da parte ('year', 'quarter', 'month', 'week', 'day', 'weekday') | \`DATEPART('weekday', d)\` → 1 = domingo |
| \`DATENAME('parte', d)\` | texto | \`DATENAME('month', d)\` → "março" |
| \`DATETRUNC('parte', d)\` | data no início do período | \`DATETRUNC('month', #2025-03-14#)\` → 2025-03-01 |
| \`DATEADD('parte', n, d)\` | data somada | \`DATEADD('month', -1, d)\` → um mês antes |
| \`DATEDIFF('parte', inicio, fim)\` | quantidade de limites cruzados | \`DATEDIFF('day', [Data do Pedido], [Data de Envio])\` → dias até enviar |
| \`TODAY()\` | data de hoje | nos exercícios do app, 31/12/2025 (fim da base) |
| \`MAKEDATE(ano, mês, dia)\` | monta uma data | \`MAKEDATE(2025, 1, 1)\` |

Datas literais vão entre **#**: \`#2025-01-31#\`.

**Ano fiscal**: em *Propriedades padrão → Início do ano fiscal*, você define o mês inicial. Em cálculo, um ano fiscal que começa em **julho** e é nomeado pelo ano em que **termina** (FY2025 = jul/2024 a jun/2025):
~~~
YEAR(DATEADD('month', 6, [Data do Pedido]))
~~~
`),
    exTab('Sazonalidade: todos os meses de todos os anos somados', `
Parte de data (discreta) em Linhas: 12 marcas, uma por mês do ano.
`, `SUM([Vendas])`, `
Novembro e dezembro são os picos (Black Friday e Natal). Com o valor de data (DATETRUNC), seriam 48 marcas, uma por mês de cada ano.
`, { dims: ['Mês do ano'], campos: { 'Mês do ano': 'MONTH([Data do Pedido])' }, nome: 'Vendas' }),
    quiz('Para ver a evolução mês a mês desde 2022 numa linha contínua, use...', ['O valor de data: DATETRUNC("month", [Data]) / MÊS(Data) contínuo', 'A parte de data MONTH([Data])', 'DATENAME("month", [Data])', 'YEAR([Data])'], 0),
    tab('Calcule, em cada linha, os **dias entre o pedido e o envio**.', 'DATEDIFF("day", [Data do Pedido], [Data de Envio])', { dims: 'linha', mostrar: ['ID do Pedido', 'Modo de Envio'], nome: 'Dias para enviar' }),
    tab('Por **Modo de Envio**, mostre o **prazo médio** em dias entre pedido e envio.', 'AVG(DATEDIFF("day", [Data do Pedido], [Data de Envio]))', { dims: ['Modo de Envio'], nome: 'Prazo médio' }),
    tab('Crie o campo **Ano fiscal** (começa em julho, nomeado pelo ano em que termina) para cada linha.', 'YEAR(DATEADD("month", 6, [Data do Pedido]))', { dims: 'linha', mostrar: ['Data do Pedido'], nome: 'Ano fiscal' }),
    tab('Com o **ano** (campo Ano = YEAR da data) em Linhas, mostre a **data do último pedido** de cada ano.', 'MAX([Data do Pedido])', { dims: ['Ano'], campos: ANO, nome: 'Último pedido' }),
    tab('Para cada linha, o **nome do dia da semana** do pedido (DATENAME).', 'DATENAME("weekday", [Data do Pedido])', { dims: 'linha', mostrar: ['Data do Pedido'], nome: 'Dia da semana' }),
  ],
};

const L_CALC = {
  id: 'tb-2-4', title: 'Campos calculados: lógica, nulos e texto',
  steps: [
    theory('Lógica: IF, IIF, CASE', `
Um **campo calculado** cria um novo campo a partir de outros (*Análise → Criar campo calculado*, ou clique direito no painel). Ele pode ser **de nível de linha** (calculado em cada linha da base) ou **agregado** (calculado sobre o grupo de cada marca).

~~~
// nível de linha: classifica cada item
IF [Lucro] < 0 THEN "Prejuízo"
ELSEIF [Lucro] < 100 THEN "Baixo"
ELSE "Bom"
END

// IIF: um teste só (equivale ao SE do Excel)
IIF([Desconto] > 0, "Com desconto", "Sem desconto")

// CASE: compara um campo com valores fixos (mais rápido e legível que vários IF de igualdade)
CASE [Região]
  WHEN "Sul" THEN "Sul/Sudeste"
  WHEN "Sudeste" THEN "Sul/Sudeste"
  ELSE "Demais"
END

// agregado: classifica cada marca
IF SUM([Lucro]) > 0 THEN "Lucrativo" ELSE "Deficitário" END
~~~
Operadores: \`=\`, \`<>\` (diferente), \`<\`, \`<=\`, \`>\`, \`>=\`, \`AND\`, \`OR\`, \`NOT\`, \`IN\` (\`[Estado] IN ("SP", "RJ")\`). Textos entre aspas.

**Regra de ouro:** não misture, na mesma expressão, um campo **agregado** com um **não agregado**: \`SUM([Vendas]) / [Quantidade]\` dá erro. Ou tudo no nível de linha, ou tudo agregado (use \`SUM([Quantidade])\` ou \`ATTR([Campo])\`).

**Nulos**: \`ISNULL(x)\` testa; \`IFNULL(x, valor)\` troca nulo por um valor; \`ZN(x)\` troca nulo por **zero** (essencial em cálculos de diferença).
`),
    theory('Funções de texto', `
| função | o que faz | exemplo |
|---|---|---|
| \`LEFT(s, n)\`, \`RIGHT(s, n)\` | primeiros/últimos n caracteres | \`LEFT([Estado], 1)\` |
| \`MID(s, início, n)\` | trecho a partir da posição (começa em 1) | \`MID([ID do Pedido], 4, 4)\` → "2025" |
| \`LEN(s)\` | tamanho | |
| \`UPPER\`, \`LOWER\`, \`TRIM\` | maiúsculas, minúsculas, sem espaços nas pontas | |
| \`CONTAINS(s, trecho)\`, \`STARTSWITH\`, \`ENDSWITH\` | verdadeiro/falso | \`CONTAINS([Produto], "Notebook")\` |
| \`FIND(s, trecho)\` | posição do trecho (0 se não achar) | |
| \`REPLACE(s, de, para)\` | troca trechos | |
| \`SPLIT(s, separador, n)\` | n-ésima parte | (lição de fonte de dados) |
| \`STR(x)\`, \`INT(x)\`, \`FLOAT(x)\`, \`DATE(x)\` | conversões | \`"Ano " + STR(YEAR([Data do Pedido]))\` |

Textos se juntam com **+**, mas só texto com texto: \`"Ano " + 2025\` dá erro; use \`STR()\`.
`),
    exTab('Classificando cada item pelo lucro', `
Cálculo de nível de linha (o resultado existe em cada linha):
`, `IF [Lucro] < 0 THEN "Prejuízo"
ELSEIF [Lucro] < 100 THEN "Baixo"
ELSE "Bom"
END`, `
Esse campo pode ir em Cor ou em Linhas como dimensão nova: "quantos itens deram prejuízo por subcategoria?".
`, { dims: 'linha', mostrar: ['Produto', 'Lucro'], nome: 'Faixa de lucro' }),
    quiz('O que retorna ZN(NULL)?', ['0', 'NULL', 'Erro', '"0"'], 0),
    quiz('Por que `SUM([Vendas]) / [Quantidade]` dá erro?', ['Mistura um campo agregado com um não agregado', 'Divisão por zero', 'Quantidade é texto', 'Falta um END'], 0),
    tab('Crie o campo que marca cada item como **"Com desconto"** ou **"Sem desconto"** usando IIF.', 'IIF([Desconto] > 0, "Com desconto", "Sem desconto")', { dims: 'linha', mostrar: ['Desconto'], nome: 'Tem desconto' }),
    tab('Com CASE, agrupe as **regiões**: Sul e Sudeste → "Sul/Sudeste"; Norte e Nordeste → "Norte/Nordeste"; as demais → "Centro-Oeste".', 'CASE [Região] WHEN "Sul" THEN "Sul/Sudeste" WHEN "Sudeste" THEN "Sul/Sudeste" WHEN "Norte" THEN "Norte/Nordeste" WHEN "Nordeste" THEN "Norte/Nordeste" ELSE "Centro-Oeste" END', { dims: 'linha', mostrar: ['Região'], nome: 'Macrorregião' }),
    tab('Por **Subcategoria**, mostre **"Lucrativo"** se o lucro total for positivo e **"Deficitário"** caso contrário (cálculo agregado).', 'IF SUM([Lucro]) > 0 THEN "Lucrativo" ELSE "Deficitário" END', { dims: ['Subcategoria'], nome: 'Situação' }),
    tab('Monte o rótulo **"UF - Cidade"** (ex.: "SP - Campinas") para cada linha.', '[Estado] + " - " + [Cidade]', { dims: 'linha', mostrar: ['Cidade'], nome: 'Rótulo' }),
    tab('Marque com verdadeiro/falso os produtos cujo nome **contém "Notebook"**.', 'CONTAINS([Produto], "Notebook")', { dims: 'linha', mostrar: ['Produto'], nome: 'É notebook' }),
    debugTab('Este rótulo deveria mostrar "Ano 2025" para cada linha, mas dá erro. Corrija.', '"Ano " + YEAR([Data do Pedido])', '"Ano " + STR(YEAR([Data do Pedido]))', { dims: 'linha', mostrar: ['Data do Pedido'], nome: 'Rótulo do ano' }),
  ],
};

const L_ORGANIZAR = {
  id: 'tb-2-5', title: 'Filtros, hierarquias, grupos, conjuntos e compartimentos',
  steps: [
    theory('Tipos de filtro', `
| filtro | como funciona | exemplo |
|---|---|---|
| **de dimensão** | escolhe valores (lista, curinga, condição, Top N) | só Região = Sul |
| **de medida** | intervalo sobre o valor **agregado** no nível da visualização | só subcategorias com SUM(Vendas) > 100 mil |
| **de data** | datas relativas (últimos 3 meses, ano até a data), intervalo, início/fim, ou partes (só 2025) | últimos 12 meses |
| **Top N** | os N primeiros por uma medida (aba "Superior" do filtro de dimensão) | 10 maiores clientes por vendas |

Mostre o filtro para o usuário com **Mostrar filtro** (lista suspensa, botões, controle deslizante) e use **Aplicar a planilhas → Selecionadas/Todas que usam esta fonte** para que um filtro valha em várias planilhas de um painel.

**Filtro "Apenas valores relevantes"** mostra, num filtro, só os valores que existem dado os outros filtros (útil, mas custa consultas extras: Nível 4).
`),
    theory('Organizando campos', `
| recurso | o que é | quando usar |
|---|---|---|
| **Hierarquia** | campos aninhados (Categoria › Subcategoria › Produto) com **+/−** para expandir (*drill-down*) | navegar do geral ao detalhe |
| **Grupo** | junta valores de uma dimensão manualmente (Sul + Sudeste = "Sul/Sudeste"; corrige "S.Paulo" e "São Paulo") | categorias de negócio que não existem na base |
| **Conjunto** (*Set*) | divide os membros em **Dentro** e **Fora**. **Fixo** (você escolhe) ou **dinâmico** (por condição ou Top N, recalculado com os dados) | "Top 10 clientes" × resto; comparar um grupo com o restante |
| **Compartimento** (*Bin*) | transforma uma medida contínua em faixas de tamanho fixo | histograma de vendas por item |

Grupos e compartimentos podem ser escritos como cálculos:
~~~
// grupo
IF [Região] IN ("Sul", "Sudeste") THEN "Sul/Sudeste" ELSE "Demais" END
// compartimento de 1.000 em 1.000 (o Tableau faz isso ao criar um bin de tamanho 1000)
FLOOR([Vendas] / 1000) * 1000
~~~
\`FLOOR\` arredonda para baixo; \`CEILING\` para cima; \`ROUND(x, casas)\` para o mais próximo.

**Histograma** = compartimento em Colunas + \`COUNT\` de linhas (ou \`CNT\`) em Linhas.
`),
    exTab('Histograma de vendas por item', `
O compartimento (faixa de R$ 1.000) é a dimensão; contamos quantos itens caem em cada faixa:
`, `COUNT([ID da Linha])`, `
A grande maioria dos itens vale menos de R$ 1.000; poucos itens de valores altos (copiadoras, notebooks) formam a cauda longa.
`, { dims: ['Faixa de vendas'], campos: { 'Faixa de vendas': 'FLOOR([Vendas] / 1000) * 1000' }, nome: 'Itens' }),
    quiz('Para mostrar só as subcategorias cuja SOMA de vendas passa de R$ 100 mil, use um filtro...', ['De medida (sobre o valor agregado)', 'De dimensão com lista', 'De data relativa', 'De extração'], 0),
    quiz('Você quer comparar os 10 maiores clientes com todos os outros, e que a lista se atualize com os dados. Use...', ['Um conjunto dinâmico Top 10', 'Um grupo manual', 'Um compartimento', 'Uma hierarquia'], 0),
    tab('Crie o **compartimento** de desconto em faixas de 0,1 (FLOOR do desconto ÷ 0,1, vezes 0,1) para cada linha.', 'FLOOR([Desconto] / 0.1) * 0.1', { dims: 'linha', mostrar: ['Desconto'], nome: 'Faixa de desconto' }),
    tab('Com a **faixa de vendas** (compartimento de R$ 1.000, já criado) em Linhas, mostre o **lucro total** de cada faixa.', 'SUM([Lucro])', { dims: ['Faixa de vendas'], campos: { 'Faixa de vendas': 'FLOOR([Vendas] / 1000) * 1000' }, nome: 'Lucro' }),
    tab('Crie o grupo **"Capitais do Sudeste"** para as cidades São Paulo, Rio de Janeiro, Belo Horizonte e Vitória; as demais ficam como **"Outras"**.', 'IF [Cidade] IN ("São Paulo", "Rio de Janeiro", "Belo Horizonte", "Vitória") THEN "Capitais do Sudeste" ELSE "Outras" END', { dims: 'linha', mostrar: ['Cidade'], nome: 'Grupo de cidades' }),
  ],
};

const L_RAPIDOS = {
  id: 'tb-2-6', title: 'Cálculos de tabela rápidos',
  steps: [
    theory('O que é um cálculo de tabela', `
Um **cálculo de tabela** é calculado **depois** das agregações, sobre os **valores das marcas** da visualização (a "tabela virtual" de resultados). Por isso pode olhar para a marca anterior, somar as anteriores, ranquear...

Clique na pílula de medida → **Cálculo rápido de tabela**:
| cálculo rápido | fórmula que o Tableau escreve |
|---|---|
| **Total acumulado** | \`RUNNING_SUM(SUM([Vendas]))\` |
| **Percentual do total** | \`SUM([Vendas]) / TOTAL(SUM([Vendas]))\` |
| **Diferença** | \`ZN(SUM([Vendas])) - LOOKUP(ZN(SUM([Vendas])), -1)\` |
| **Diferença percentual** (YoY, MoM) | \`(ZN(SUM([Vendas])) - LOOKUP(ZN(SUM([Vendas])), -1)) / ABS(LOOKUP(ZN(SUM([Vendas])), -1))\` |
| **Classificação** | \`RANK(SUM([Vendas]))\` |
| **Média móvel** (3 períodos) | \`WINDOW_AVG(SUM([Vendas]), -2, 0)\` |

- \`LOOKUP(expr, -1)\`: valor da marca **anterior** (+1 = seguinte)
- \`TOTAL(expr)\`: a agregação sobre **todas** as marcas da partição
- \`RANK(expr)\`: posição (1 = maior; \`RANK(expr, 'asc')\` para o menor primeiro)
- \`WINDOW_AVG(expr, início, fim)\`: média numa janela relativa à marca atual

**Direção** (*Calcular usando*): por padrão **Tabela (para baixo)**, seguindo a ordem das marcas. A primeira marca não tem anterior: a diferença dela fica **nula**. Na próxima unidade você controla a direção e as partições.
`),
    exTab('Total acumulado por ano', `
Ano em Linhas e o total acumulado:
`, `RUNNING_SUM(SUM([Vendas]))`, `
Cada ano soma o próprio valor com os anteriores; o último é o total geral.
`, { dims: ['Ano'], campos: ANO, nome: 'Acumulado' }),
    quiz('Um cálculo de tabela é calculado...', ['Sobre os valores agregados das marcas, depois da agregação', 'Linha a linha na fonte, antes de tudo', 'No banco de dados, sempre', 'Só em mapas'], 0),
    tab('Por **Categoria**, mostre o **percentual do total** de vendas.', 'SUM([Vendas]) / TOTAL(SUM([Vendas]))', { dims: ['Categoria'], nome: '% do total' }),
    tab('Por **Ano**, calcule o **crescimento percentual** das vendas sobre o ano anterior (fórmula da diferença percentual com ZN e LOOKUP).', '(ZN(SUM([Vendas])) - LOOKUP(ZN(SUM([Vendas])), -1)) / ABS(LOOKUP(ZN(SUM([Vendas])), -1))', { dims: ['Ano'], campos: ANO, nome: 'Crescimento' }),
    tab('Por **Subcategoria**, mostre a **classificação** pelo lucro total (1 = maior).', 'RANK(SUM([Lucro]))', { dims: ['Subcategoria'], nome: 'Posição' }),
    tab('Por **Mês** (valor de data, já criado), a **média móvel de 3 meses** das vendas (o mês atual e os 2 anteriores).', 'WINDOW_AVG(SUM([Vendas]), -2, 0)', { dims: ['Mês'], campos: MES, nome: 'Média móvel 3m' }),
  ],
};

const L_GRAFICOS2 = {
  id: 'tb-2-7', title: 'Gráficos de negócio e boas práticas visuais',
  steps: [
    theory('O gráfico certo para cada pergunta', `
| pergunta | gráficos |
|---|---|
| **comparação** entre categorias | barras (horizontais para nomes longos), *lollipop*, *bullet chart* (contra meta) |
| **evolução** no tempo | linha, área, barras por período |
| **parte-todo** | barras empilhadas (100%), *treemap*; pizza só com 2 ou 3 fatias |
| **distribuição** | histograma, boxplot, *dot plot* |
| **correlação** | dispersão (com linha de tendência) |
| **geografia** | mapa preenchido (coroplético, para taxas) ou de símbolos (para volumes) |
| **matriz** | *heatmap*, tabela de destaque (*highlight table*: tabela de texto com cor de fundo) |

**Técnicas de construção:**
- **Barras empilhadas**: dimensão em Cor; **lado a lado**: dimensão também em Colunas
- **Eixo compartilhado** (*shared axis*): duas medidas no mesmo eixo (arraste a 2ª para cima do eixo: aparecem "Nomes de medidas" e "Valores de medidas")
- **Eixo duplo** (*dual axis*): duas medidas em Linhas → clique direito na 2ª → Eixo duplo; **sincronize os eixos** quando a escala for a mesma. Usos: barra + linha (vendas e meta), **lollipop** (barra fina + círculo), **bullet chart** (barra real + linha de referência da meta)
- **Treemap**: dimensão em Detalhe/Rótulo, medida em Tamanho e Cor
- **Heatmap**: duas dimensões + medida em Cor (marca quadrado)

**Cores e tipografia:** use cor **com propósito** (destacar o que importa, cinza para o resto); paleta **divergente** (vermelho↔azul) para valores com ponto neutro (lucro positivo/negativo); **sequencial** para intensidade; no máximo ~7 cores categóricas; evite vermelho/verde como único código (daltonismo); títulos que dizem a conclusão ("Móveis dá prejuízo no Nordeste").
`),
    theory('Formatação e indicadores com setas', `
**Formatos numéricos personalizados** (Formatar → Números → Personalizado) usam o padrão \`positivo;negativo;zero\`:
~~~
▲ 0,0%;▼ 0,0%;0,0%
~~~
mostra "▲ 12,4%" ou "▼ 3,1%" sem cálculo extra. Outra forma é um campo calculado com o símbolo, útil para colorir:
~~~
IIF(SUM([Lucro]) >= 0, "▲", "▼")
~~~
Linhas de grade, bordas e sombreamento ficam em **Formatar**; **menos é mais**: tire grades e bordas que não ajudam a leitura.
`),
    quiz('Para mostrar vendas reais contra a meta de cada região, o gráfico mais adequado é...', ['Bullet chart (barra real + linha de referência da meta)', 'Pizza', 'Treemap', 'Dispersão'], 0),
    quiz('Para mostrar a taxa de inadimplência por estado num mapa, use...', ['Mapa preenchido (coroplético), porque é uma taxa', 'Mapa de símbolos com tamanho', 'Pizza por estado', 'Tabela de texto'], 0),
    quiz('Qual paleta para o lucro, que pode ser positivo ou negativo?', ['Divergente, com o zero no centro', 'Categórica', 'Sequencial de uma cor', 'Arco-íris'], 0),
    tab('Para um indicador, mostre por **Região** a seta **"▲"** se o lucro total for maior ou igual a zero e **"▼"** caso contrário.', 'IIF(SUM([Lucro]) >= 0, "▲", "▼")', { dims: ['Região'], nome: 'Seta' }),
    tab('Para um **heatmap** de Categoria × Região, calcule a **margem** (soma ÷ soma) em cada célula.', 'SUM([Lucro]) / SUM([Vendas])', { dims: ['Categoria', 'Região'], nome: 'Margem' }),
  ],
};

const L_DASH = {
  id: 'tb-2-8', title: 'Formatação, dicas, painéis e histórias',
  steps: [
    theory('Dicas de ferramenta e Viz in Tooltip', `
A **dica de ferramenta** (*tooltip*) aparece ao passar o mouse. Edite-a no Cartão de Marcas para virar uma frase:
> **<Subcategoria>** vendeu **<SUM(Vendas)>** com margem de **<AGG(Margem)>**

**Viz in Tooltip**: em Inserir → Planilha, coloque **outra planilha dentro da dica** (ex.: a evolução mensal da subcategoria sob o mouse). O Tableau filtra a planilha embutida pela marca apontada. É um jeito poderoso de dar detalhe sem poluir o painel.
`),
    theory('Montando painéis (dashboards)', `
Um **painel** combina planilhas, filtros, legendas, textos, imagens e botões numa tela.

- **Lado a lado** (*Tiled*) × **Flutuante** (*Floating*): lado a lado organiza em grade e se adapta; flutuante fica por cima numa posição fixa (bom para legendas e botões, ruim para responsividade)
- **Contêineres** horizontais e verticais: caixas que alinham e distribuem os objetos (*Distribuir uniformemente*). Painéis bem feitos são uma árvore de contêineres
- **Preenchimento** (*padding*): **interno** (espaço dentro do objeto) e **externo** (entre objetos)
- **Tamanho**: fixo (ex.: 1200×800, previsível), automático ou intervalo
- **Filtros para várias planilhas**: na pílula do filtro, *Aplicar a planilhas → Selecionadas* ou *Todas que usam esta fonte de dados*
- **Usar como filtro** (ícone de funil numa planilha): clicar numa marca filtra as outras (vira uma *ação de filtro*, Nível 3)
- **Botões de navegação**: Objeto → Navegação, para ir a outro painel
- **Layout clássico**: título e KPIs no topo, gráficos principais no meio, detalhe embaixo; filtros numa coluna lateral

**Histórias** (*Stories*): sequência de **pontos de história**, cada um com uma planilha ou painel num estado (filtros aplicados) e uma legenda, para apresentar uma narrativa passo a passo (como slides interativos).
`),
    quiz('Você quer que a legenda fique por cima do mapa, num canto. Como inseri-la?', ['Como objeto flutuante', 'Como objeto lado a lado', 'Num contêiner horizontal', 'Numa história'], 0),
    quiz('O que é Viz in Tooltip?', ['Uma planilha exibida dentro da dica de ferramenta, filtrada pela marca apontada', 'Um tipo de mapa', 'Um formato de número', 'Uma extração'], 0),
    order('Ordene a montagem de um painel organizado:', ['definir o tamanho do painel', 'criar a estrutura de contêineres', 'colocar KPIs no topo e gráficos no meio', 'aplicar filtros às planilhas certas', 'ajustar preenchimento e títulos']),
    quiz('Para apresentar uma análise em etapas para a diretoria, com um estado do painel por etapa, use...', ['Uma história (Story) com pontos de história', 'Um painel flutuante', 'Um conjunto', 'Um filtro de contexto'], 0),
  ],
};

const L_PROJETO2 = {
  id: 'tb-2-9', title: 'Projeto: dashboard operacional com KPIs e filtros',
  steps: [
    theory('O entregável do Nível 2', `
Painel **operacional de vendas** para a gerência regional:
- **Linha de KPIs** (topo): Vendas, Lucro, Margem, Ticket médio por pedido, Pedidos, com variação contra o ano anterior (▲/▼)
- **Evolução mensal**: vendas por mês com média móvel de 3 meses (eixo duplo: barras + linha)
- **Ranking de subcategorias**: barras ordenadas, lucro em cor divergente
- **Mapa por estado**: margem em cor
- **Filtros**: Região, Segmento e período, aplicados a todas as planilhas
- **Dicas** em frase e uma Viz in Tooltip com a evolução da subcategoria

Os KPIs abaixo são o coração do painel.
`),
    tab('KPI **Margem** geral (sem dimensões na visualização).', 'SUM([Lucro]) / SUM([Vendas])', { dims: [], nome: 'Margem' }),
    tab('KPI **Ticket médio por pedido**, por **Ano**.', 'SUM([Vendas]) / COUNTD([ID do Pedido])', { dims: ['Ano'], campos: ANO, nome: 'Ticket médio' }),
    tab('KPI **variação do lucro** contra o ano anterior, em percentual, por **Ano**.', '(ZN(SUM([Lucro])) - LOOKUP(ZN(SUM([Lucro])), -1)) / ABS(LOOKUP(ZN(SUM([Lucro])), -1))', { dims: ['Ano'], campos: ANO, nome: 'Variação do lucro' }),
    tab('**Seta do KPI de vendas**: por **Ano**, "▲" se as vendas cresceram contra o ano anterior e "▼" caso contrário (use LOOKUP e IIF).', 'IIF(SUM([Vendas]) >= LOOKUP(SUM([Vendas]), -1), "▲", "▼")', { dims: ['Ano'], campos: ANO, nome: 'Seta' }),
    tab('**Ranking** de subcategorias por vendas (1 = maior), para ordenar as barras.', 'RANK(SUM([Vendas]))', { dims: ['Subcategoria'], nome: 'Ranking' }),
  ],
};

export const TB_N2 = {
  id: 'tb-u2', level: 2, title: 'Visualização essencial e exploração',
  description: 'Pílulas azuis e verdes, agregação, datas, campos calculados, filtros, grupos, conjuntos, cálculos rápidos, gráficos de negócio, painéis e histórias. Entregável: dashboard operacional com KPIs',
  lessons: [L_PILULAS, L_AGG, L_DATAS, L_CALC, L_ORGANIZAR, L_RAPIDOS, L_GRAFICOS2, L_DASH, L_PROJETO2],
};
