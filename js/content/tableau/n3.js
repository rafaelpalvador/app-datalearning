// Trilha Tableau — Nível 3: Intermediário (modelagem, cálculos avançados e interatividade)
import { theory, quiz, order, fill, tab, debugTab, exTab, py, exPy } from '../helpers.js';

const r = String.raw;
const ANO = { Ano: 'YEAR([Data do Pedido])' };
const MES = { Mês: 'DATETRUNC("month", [Data do Pedido])' };

const L_ORDEM = {
  id: 'tb-3-1', title: 'A ordem de operações do Tableau',
  steps: [
    theory('O pipeline de consulta, de cima para baixo', `
O Tableau executa as etapas **sempre nesta ordem**. Quase toda "estranheza" de filtros e cálculos se explica por ela:

1. **Filtros de extração** (definem o que entra no .hyper)
2. **Filtros de fonte de dados** (valem para tudo que usa a fonte)
3. **Filtros de contexto** (filtros de dimensão promovidos: *Adicionar ao contexto*, pílula cinza)
4. **Conjuntos, Top N, filtros condicionais e LOD FIXED**
5. **Filtros de dimensão** (os filtros comuns, pílula azul)
6. **LOD INCLUDE e EXCLUDE**, **mescla de dados** (*blending*)
7. **Filtros de medida** (pílula verde)
8. **Cálculos de tabela** (RUNNING_SUM, LOOKUP, RANK, TOTAL...)
9. **Filtros de cálculo de tabela**
10. **Linhas de tendência e de referência**

Consequências que caem em entrevista e na certificação:
- **FIXED ignora filtros de dimensão** (roda antes). Para um filtro afetar uma FIXED, **adicione-o ao contexto**
- **Top N roda antes dos filtros de dimensão**: "Top 10 clientes" com filtro de Região comum mostra os do Top 10 **nacional** que são daquela região (às vezes 2 ou 3). Com o filtro de Região **no contexto**, mostra o Top 10 **da região**
- **Cálculos de tabela veem só o que sobrou** dos filtros anteriores: filtrar o ano de 2025 faz a variação contra 2024 ficar nula (2024 saiu da visualização). Solução: **filtro de cálculo de tabela** (passo 9), por exemplo \`LOOKUP(ATTR([Ano]), 0) = 2025\`, que só esconde as marcas
- **INCLUDE/EXCLUDE respeitam** os filtros de dimensão
`),
    exTab('FIXED ignora o filtro de dimensão', `
Região = Sul num filtro **de dimensão** comum. A participação usa um total FIXED (sem dimensões = total geral):
`, `SUM([Vendas]) / MIN({FIXED : SUM([Vendas])})`, `
O total FIXED foi calculado **antes** do filtro, com o Brasil inteiro: o Sul representa ~18% das vendas nacionais. Coloque o filtro no contexto e o resultado vira 100%.
`, { dims: ['Região'], filtro: { expr: '[Região] = "Sul"' }, nome: '% do Brasil' }),
    quiz('Um FIXED não está respondendo ao filtro de Categoria do painel. Como resolver?', ['Adicionar o filtro de Categoria ao contexto', 'Trocar FIXED por FIXED [Categoria]', 'Converter o filtro em filtro de medida', 'Não há como'], 0),
    quiz('Qual etapa roda POR ÚLTIMO entre estas?', ['Filtros de cálculo de tabela', 'Filtros de contexto', 'LOD FIXED', 'Filtros de dimensão'], 0),
    order('Ordene estas etapas como o Tableau executa:', ['filtro de contexto', 'LOD FIXED', 'filtro de dimensão', 'filtro de medida', 'cálculo de tabela']),
    tab('Com o filtro **Região = "Sul" em CONTEXTO**, calcule a mesma participação `SUM([Vendas]) / MIN({FIXED : SUM([Vendas])})`. Repare que agora o total FIXED também é filtrado.', 'SUM([Vendas]) / MIN({FIXED : SUM([Vendas])})', { dims: ['Região'], filtro: { expr: '[Região] = "Sul"', contexto: true }, nome: '% do total filtrado' }),
    tab('Com o filtro de dimensão **Categoria = "Móveis"**, mostre por **Subcategoria** a participação de cada uma nas **vendas totais da empresa** (todas as categorias), usando um total FIXED.', 'SUM([Vendas]) / MIN({FIXED : SUM([Vendas])})', { dims: ['Subcategoria'], filtro: { expr: '[Categoria] = "Móveis"' }, nome: '% da empresa' }),
  ],
};

const L_MODELO = {
  id: 'tb-3-2', title: 'Modelagem: relacionamentos, joins, unions, blending; Live × Extract',
  steps: [
    theory('Camada lógica e camada física', `
O modelo de dados do Tableau (desde a versão 2020.2) tem **duas camadas**:

**Camada lógica — Relacionamentos** ("*noodles*", as linhas flexíveis entre tabelas):
- as tabelas **ficam separadas**; o Tableau decide o tipo de join **na hora da consulta**, usando só as tabelas que a visualização precisa
- cada tabela mantém o **próprio nível de detalhe**: as medidas de Pedidos e de Metas **não duplicam** uma à outra
- **opções de desempenho**: cardinalidade (*muitos-para-um*, *um-para-um*) e integridade referencial (*todos os registros correspondem*). Declarar corretamente deixa as consultas mais simples e rápidas
- **relacionamentos multifato** (*multi-fact*, 2024.2+): várias tabelas fato (Vendas, Estoque, Marketing) ligadas a **dimensões compartilhadas** (Datas, Produtos): o modelo em **estrela/galáxia** dentro do Tableau, cada fato agregado no seu grão

**Camada física — Joins e Unions** (clique duas vezes numa tabela lógica para abrir):
- **Join** junta colunas: *Inner* (só o que casa), *Left* (tudo da esquerda), *Right*, *Full Outer* (tudo dos dois lados). Vira **uma tabela física única** no grão mais fino: risco de **duplicar medidas**
- **Union** empilha linhas de tabelas com a mesma estrutura (vendas_2024 + vendas_2025). **Union com curinga** (*wildcard*): todas as abas/arquivos que seguem um padrão (\`vendas_*.csv\`), com o campo *Path*/*Sheet* indicando a origem
`),
    theory('Duplicação, blending e quando usar cada um', `
**Armadilha do join (fan trap):** Pedidos (1 linha por item) com join em Metas (1 linha por região e mês): a meta da região se **repete em cada item**, e \`SUM([Meta])\` fica dezenas de vezes maior. Com **relacionamento**, cada tabela agrega no próprio grão e o problema some. Com join, seria preciso \`MIN([Meta])\` ou uma LOD.

**Mescla de dados (*blending*)**: junta duas **fontes diferentes** na visualização (fonte primária, ícone azul; secundária, laranja), pelos **campos de ligação** (ícone de corrente). A secundária é **agregada no nível dos campos de ligação antes** de juntar (como um left join agregado). Limitações: a secundária só traz agregados; não funciona com COUNTD/MEDIAN da secundária em algumas fontes; LOD não atravessa a mescla; desempenho pior. Hoje, **relacionamentos** substituem a maior parte dos usos.

| estratégia | quando usar |
|---|---|
| **relacionamento** | padrão para várias tabelas no mesmo modelo, em grãos diferentes |
| **join** | precisa de uma tabela física única (ex.: filtrar linhas no join), grãos iguais, cálculo linha a linha entre tabelas |
| **union** | mesma estrutura em vários arquivos/períodos |
| **blending** | fontes que não dá para modelar juntas (ex.: duas fontes publicadas diferentes) |

**Live × Extract:**
| | **Conexão ao vivo** | **Extração (Hyper)** |
|---|---|---|
| frescor | dados em tempo real | instantâneo da última atualização |
| desempenho | depende do banco | geralmente muito rápido (colunar, em memória) |
| carga no banco | cada clique consulta o banco | só na atualização |
| quando | banco rápido (Snowflake, BigQuery), necessidade de tempo real, RLS no banco | fonte lenta, arquivos, uso offline, muitos usuários |

Atualização **completa** (reprocessa tudo) × **incremental** (só linhas novas por um campo crescente, como data ou ID). **Filtros de extração** reduzem o volume (ex.: só os últimos 3 anos).
`),
    quiz('Você relacionou Pedidos (grão: item) com Metas (grão: região-mês) por um JOIN e SUM([Meta]) ficou enorme. Por quê?', ['O join repetiu a meta em cada item do pedido (fan trap): use relacionamento', 'A meta está em texto', 'Faltou um filtro de contexto', 'O Hyper não soma metas'], 0),
    quiz('Arquivos vendas_jan.csv, vendas_fev.csv... com a mesma estrutura numa pasta. Como juntar?', ['Union com curinga (wildcard)', 'Join interno', 'Relacionamento', 'Blending'], 0),
    quiz('O banco transacional é lento e o painel é aberto por 500 pessoas. Melhor opção?', ['Extração Hyper com atualização agendada (incremental se possível)', 'Conexão ao vivo', 'Blending', 'Join com o próprio banco'], 0),
    quiz('No relacionamento, declarar "muitos-para-um" e "todos os registros correspondem" serve para...', ['Deixar o Tableau gerar consultas mais simples e rápidas', 'Criar um join físico', 'Duplicar as medidas', 'Ativar o blending'], 0),
    fill('Complete: o tipo de join que mantém todos os pedidos, mesmo sem meta correspondente.', '___ JOIN', [['LEFT', 'left', 'Left']]),
  ],
};

const L_FIXED = {
  id: 'tb-3-3', title: 'Expressões LOD: FIXED',
  steps: [
    theory('Calcular num grão diferente do da visualização', `
As **expressões de nível de detalhe** (LOD) calculam uma agregação num nível **diferente** do da visualização. Sintaxe:
~~~
{ FIXED [Dimensão 1], [Dimensão 2] : agregação }
~~~
- **FIXED**: calcula **exatamente** no nível das dimensões listadas, **ignorando** as dimensões da visualização
- \`{FIXED : SUM([Vendas])}\` (sem dimensões, ou só \`{SUM([Vendas])}\`) = o **total geral**
- o resultado de uma LOD volta para **cada linha** da base (é um valor de nível de linha). Por isso, na visualização, ele é **agregado de novo**: \`AVG({FIXED [ID do Cliente] : SUM([Vendas])})\` = gasto médio **por cliente**
- uma FIXED pode virar **dimensão** (ex.: "ano da primeira compra" para coortes)

Exemplos clássicos:
~~~
// total gasto por cliente (vai para cada linha do cliente)
{ FIXED [ID do Cliente] : SUM([Vendas]) }

// data da primeira compra do cliente
{ FIXED [ID do Cliente] : MIN([Data do Pedido]) }

// pedidos por cliente (frequência)
{ FIXED [ID do Cliente] : COUNTD([ID do Pedido]) }
~~~

**Cuidado ao reagregar:** se a LOD está num grão **mais grosso** que a visualização (ex.: total da região numa visualização por região e categoria), cada linha carrega o mesmo valor; somar (\`SUM\`) multiplica pelo número de linhas. Use \`MIN\`, \`MAX\`, \`AVG\` ou \`ATTR\`.
`),
    exTab('Gasto médio por cliente, por segmento', `
Primeiro, a LOD calcula o total de cada cliente; depois a visualização tira a média desses totais em cada segmento:
`, `AVG({FIXED [ID do Cliente] : SUM([Vendas])})`, `
Isso é bem diferente de \`AVG([Vendas])\` (média por item): aqui a pergunta é "quanto um cliente típico gasta no total?".
`, { dims: ['Segmento'], nome: 'Gasto médio por cliente' }),
    exTab('Histograma de frequência de compra', `
A LOD vira dimensão: cada cliente é classificado pelo número de pedidos que fez; depois contamos clientes em cada faixa.
`, `COUNTD([ID do Cliente])`, `
Muitos clientes compram poucas vezes e alguns compram muito: a distribuição típica de recorrência.
`, { dims: ['Pedidos do cliente'], campos: { 'Pedidos do cliente': '{FIXED [ID do Cliente] : COUNTD([ID do Pedido])}' }, nome: 'Clientes' }),
    quiz('O que {FIXED : SUM([Vendas])} retorna?', ['O total geral de vendas, em cada linha', 'As vendas da linha', 'Um erro: falta dimensão', 'A média de vendas'], 0),
    quiz('Numa visualização por Região e Categoria, o total da região vem de {FIXED [Região] : SUM([Vendas])}. Como trazê-lo para a marca?', ['MIN({FIXED [Região] : SUM([Vendas])}) (ou MAX/AVG/ATTR)', 'SUM({FIXED [Região] : SUM([Vendas])})', 'COUNT(...)', 'Não precisa agregar'], 0),
    tab('Para cada linha, traga a **data da primeira compra** do cliente (FIXED por ID do Cliente).', '{FIXED [ID do Cliente] : MIN([Data do Pedido])}', { dims: 'linha', mostrar: ['ID do Cliente', 'Data do Pedido'], nome: 'Primeira compra' }),
    tab('Por **Região**, mostre o **número médio de pedidos por cliente**.', 'AVG({FIXED [ID do Cliente] : COUNTD([ID do Pedido])})', { dims: ['Região'], nome: 'Pedidos por cliente' }),
    tab('Por **Região** e **Categoria**, mostre a participação da categoria nas vendas **da região**, usando o total da região em FIXED (lembre de reagregar com MIN).', 'SUM([Vendas]) / MIN({FIXED [Região] : SUM([Vendas])})', { dims: ['Região', 'Categoria'], nome: '% da região' }),
    debugTab('Este cálculo deveria dar a participação de cada subcategoria no total da sua **Categoria**, mas os valores saem minúsculos. Corrija a reagregação.', 'SUM([Vendas]) / SUM({FIXED [Categoria] : SUM([Vendas])})', 'SUM([Vendas]) / MIN({FIXED [Categoria] : SUM([Vendas])})', { dims: ['Categoria', 'Subcategoria'], nome: '% da categoria' }),
  ],
};

const L_LOD2 = {
  id: 'tb-3-4', title: 'INCLUDE, EXCLUDE e cenários reais com LOD',
  steps: [
    theory('INCLUDE e EXCLUDE', `
Diferente da FIXED, estas **partem das dimensões da visualização**:
- **INCLUDE**: usa as dimensões da visualização **mais** as listadas (grão **mais fino**), e reagrega para a marca
~~~
// ticket médio por PEDIDO, numa visualização por Região
AVG({INCLUDE [ID do Pedido] : SUM([Vendas])})
~~~
- **EXCLUDE**: usa as dimensões da visualização **menos** as listadas (grão **mais grosso**)
~~~
// numa visualização por Região e Categoria: o total da região (sem Categoria)
MIN({EXCLUDE [Categoria] : SUM([Vendas])})
~~~
- ambas são calculadas **depois** dos filtros de dimensão (respeitam os filtros comuns)
- mudam de valor se você mudar a visualização (a FIXED não muda)

**Cenários clássicos:**
| pergunta | cálculo |
|---|---|
| **coorte**: clientes por ano da 1ª compra | dimensão \`YEAR({FIXED [ID do Cliente] : MIN([Data do Pedido])})\` + \`COUNTD([ID do Cliente])\` |
| **venda × média da categoria** (cada produto acima ou abaixo?) | \`SUM([Vendas]) - MIN({FIXED [Categoria] : AVG([Vendas])})\` |
| **taxa de recompra** | \`COUNTD(IIF({FIXED [ID do Cliente] : COUNTD([ID do Pedido])} > 1, [ID do Cliente], NULL)) / COUNTD([ID do Cliente])\` |
| **novos × recorrentes** num ano | comparar \`YEAR([Data do Pedido])\` com o ano da 1ª compra |

Note o padrão da recompra: \`COUNTD(IIF(condição, [ID do Cliente], NULL))\` conta clientes **distintos** que atendem à condição (contar linhas com SUM contaria itens, não clientes).
`),
    exTab('Coorte: novos clientes por ano de entrada', `
A dimensão "Coorte" é o ano da primeira compra (FIXED). Contamos clientes distintos em cada coorte:
`, `COUNTD([ID do Cliente])`, `
A maior coorte é a de 2022 (o início da base); depois entram menos clientes novos por ano.
`, { dims: ['Coorte'], campos: { Coorte: 'YEAR({FIXED [ID do Cliente] : MIN([Data do Pedido])})' }, nome: 'Clientes' }),
    quiz('Numa visualização por Região, AVG({INCLUDE [ID do Pedido] : SUM([Vendas])}) calcula...', ['O valor médio por pedido em cada região', 'A média por item', 'O total da região', 'O total geral'], 0),
    quiz('Qual LOD muda de valor se você tirar uma dimensão da visualização?', ['INCLUDE e EXCLUDE', 'FIXED', 'Nenhuma', 'Só FIXED sem dimensões'], 0),
    tab('Por **Região**, calcule o **ticket médio por pedido** com INCLUDE.', 'AVG({INCLUDE [ID do Pedido] : SUM([Vendas])})', { dims: ['Região'], nome: 'Ticket por pedido' }),
    tab('Numa visualização por **Região** e **Segmento**, mostre o total de vendas **da região** (sem o segmento) usando EXCLUDE.', 'MIN({EXCLUDE [Segmento] : SUM([Vendas])})', { dims: ['Região', 'Segmento'], nome: 'Total da região' }),
    tab('Por **Segmento**, calcule a **taxa de recompra**: clientes com mais de 1 pedido ÷ clientes distintos.', 'COUNTD(IIF({FIXED [ID do Cliente] : COUNTD([ID do Pedido])} > 1, [ID do Cliente], NULL)) / COUNTD([ID do Cliente])', { dims: ['Segmento'], nome: 'Recompra' }),
    tab('Por **Produto**, mostre quanto a **venda média por item** do produto fica acima (ou abaixo) da venda média por item da sua **Categoria** (FIXED na categoria).', 'AVG([Vendas]) - MIN({FIXED [Categoria] : AVG([Vendas])})', { dims: ['Produto'], nome: 'Diferença para a categoria' }),
    tab('Na visualização por **Coorte** (ano da 1ª compra) e **Ano** do pedido, conte os **clientes ativos** (distintos) em cada combinação: a matriz de retenção.', 'COUNTD([ID do Cliente])', { dims: ['Coorte', 'Ano'], campos: { Coorte: 'YEAR({FIXED [ID do Cliente] : MIN([Data do Pedido])})', ...ANO }, nome: 'Clientes ativos' }),
  ],
};

const L_TABELA = {
  id: 'tb-3-5', title: 'Cálculos de tabela avançados: direção, partição e janelas',
  steps: [
    theory('Endereçamento × particionamento', `
Num cálculo de tabela, as dimensões da visualização se dividem em dois papéis (*Editar cálculo de tabela → Dimensões específicas*):
- **Endereçamento** (*addressing*): a **direção** em que o cálculo anda (ex.: ao longo dos meses)
- **Particionamento** (*partitioning*): os **grupos** em que o cálculo **reinicia** (ex.: um acumulado por categoria)

Atalhos de "Calcular usando": **Tabela (para baixo/transversal)**, **Painel**, **Célula**, ou **Dimensões específicas**. Exemplo com Categoria e Mês na visualização:
- \`RUNNING_SUM(SUM([Vendas]))\` endereçando **Mês** e particionando por **Categoria** → um acumulado para cada categoria, reiniciando
- endereçando **Categoria e Mês** → um acumulado único passando por tudo

**Funções de tabela:**
| função | retorna |
|---|---|
| \`INDEX()\` | posição da marca na partição (1, 2, 3...) |
| \`SIZE()\` | número de marcas na partição |
| \`FIRST()\`, \`LAST()\` | distância até a primeira (≤ 0) e a última (≥ 0) marca |
| \`LOOKUP(expr, n)\` | valor n marcas para trás (−) ou para frente (+) |
| \`WINDOW_SUM/AVG/MAX/MIN/COUNT/MEDIAN(expr, início, fim)\` | agregação numa janela; \`WINDOW_MAX(SUM([Vendas]))\` = máximo da partição inteira |
| \`RUNNING_SUM/AVG/MAX/MIN/COUNT(expr)\` | acumulados |
| \`RANK\`, \`RANK_DENSE\`, \`RANK_UNIQUE\`, \`RANK_PERCENTILE\` | classificações |
| \`TOTAL(expr)\` | agregação sobre toda a partição |
| \`PREVIOUS_VALUE(inicial)\` | o resultado do próprio cálculo na marca anterior (acumulados customizados) |
`),
    theory('Pareto, bump chart e o filtro que não quebra cálculos', `
**Pareto (80/20)**: ordene as marcas pela medida (decrescente) e acumule a participação:
~~~
RUNNING_SUM(SUM([Vendas])) / TOTAL(SUM([Vendas]))
~~~
Junto com \`INDEX() / SIZE()\` (percentual de produtos), mostra "x% dos produtos fazem 80% das vendas".

**Bump chart** (evolução do ranking): \`RANK(SUM([Vendas]))\` com Ano em Colunas, Subcategoria em Cor, endereçando Subcategoria e particionando por Ano; eixo invertido (1 no topo).

**Ocultar sem quebrar** (filtro de cálculo de tabela): para mostrar só 2025 numa linha de média móvel ou YoY, **não** use filtro de data comum (os meses anteriores somem e o cálculo de 2025 fica errado). Use um campo de tabela no Filtros:
~~~
LOOKUP(ATTR([Ano]), 0) = 2025
~~~
\`LOOKUP(..., 0)\` transforma o filtro num **cálculo de tabela** (etapa 9 da ordem de operações): as marcas de 2024 continuam alimentando os cálculos, só não aparecem.
`),
    exTab('Ranking que reinicia em cada categoria', `
Categoria e Subcategoria nas linhas; o RANK particionado por Categoria (endereçando Subcategoria):
`, `RANK(SUM([Vendas]))`, `
Cada categoria tem o seu 1º, 2º, 3º... Com "Tabela (para baixo)" sem partição, seria um ranking único de todas as subcategorias.
`, { dims: ['Categoria', 'Subcategoria'], particao: ['Categoria'], nome: 'Posição na categoria' }),
    quiz('No acumulado por mês, você quer que o total reinicie a cada categoria. Categoria deve estar em...', ['Particionamento', 'Endereçamento', 'Filtro de contexto', 'Detalhe apenas'], 0),
    quiz('Por que filtrar o ano 2025 com um filtro comum estraga o YoY de janeiro de 2025?', ['O mês de 2024 de comparação sai da visualização antes do cálculo de tabela', 'O YoY não aceita filtros', 'O filtro roda depois do cálculo', 'Porque 2025 não tem dados'], 0),
    tab('**Pareto**: com as subcategorias ordenadas pelas vendas (decrescente), calcule o **percentual acumulado** das vendas.', 'RUNNING_SUM(SUM([Vendas])) / TOTAL(SUM([Vendas]))', { dims: ['Subcategoria'], ordenar: { expr: 'SUM([Vendas])' }, nome: '% acumulado' }),
    tab('**Bump chart**: com **Ano** e **Subcategoria** nas linhas, o ranking das subcategorias por vendas **dentro de cada ano**.', 'RANK(SUM([Vendas]))', { dims: ['Ano', 'Subcategoria'], particao: ['Ano'], campos: ANO, nome: 'Posição no ano' }),
    tab('**Acumulado por categoria**: com **Categoria** e **Ano** nas linhas, o total acumulado de vendas ano a ano que **reinicia** em cada categoria.', 'RUNNING_SUM(SUM([Vendas]))', { dims: ['Categoria', 'Ano'], particao: ['Categoria'], campos: ANO, nome: 'Acumulado' }),
    tab('Por **Mês**, mostre a **média móvel de 3 meses**, exibindo apenas 2025 por um **filtro de cálculo de tabela** (já configurado), sem perder os meses de 2024 no cálculo.', 'WINDOW_AVG(SUM([Vendas]), -2, 0)', { dims: ['Mês'], campos: MES, filtroTabela: 'YEAR(LOOKUP(ATTR([Mês]), 0)) = 2025', nome: 'Média móvel 3m' }),
    tab('Por **Subcategoria** (ordem alfabética), mostre cada valor de vendas como **percentual do maior valor** da tabela (use WINDOW_MAX).', 'SUM([Vendas]) / WINDOW_MAX(SUM([Vendas]))', { dims: ['Subcategoria'], nome: '% do máximo' }),
  ],
};

const L_PARAM = {
  id: 'tb-3-6', title: 'Parâmetros, ações e visibilidade dinâmica',
  steps: [
    theory('Parâmetros: variáveis do usuário', `
Um **parâmetro** é um valor global (número, texto, data, booleano) que o usuário escolhe num controle, **independente** da fonte de dados. Sozinho não faz nada: ele precisa ser **usado** num cálculo, filtro, linha de referência ou ação.

Usos clássicos:
~~~
// 1) trocar a medida exibida
CASE [Escolha a medida]
  WHEN "Vendas" THEN SUM([Vendas])
  WHEN "Lucro" THEN SUM([Lucro])
  WHEN "Quantidade" THEN SUM([Quantidade])
END

// 2) Top N controlado pelo usuário (no Filtros, manter Verdadeiro)
RANK(SUM([Vendas])) <= [Top N]

// 3) cenário: e se o desconto fosse X%?
SUM([Vendas]) * (1 - [Desconto simulado])
~~~
**Parâmetros dinâmicos**: a lista de valores ou o valor atual é atualizado **ao abrir a pasta de trabalho** a partir de um campo (ex.: o valor padrão é sempre a data mais recente da base).
`),
    theory('Ações e visibilidade dinâmica de zonas', `
**Ações de painel** (*Painel → Ações*) tornam o painel interativo:
| ação | o que faz |
|---|---|
| **Filtro** | clicar numa marca filtra outras planilhas |
| **Realce** | destaca marcas relacionadas sem filtrar |
| **URL** | abre um link (ex.: o pedido no ERP) com valores da marca |
| **Ir para planilha** | navega para outro painel |
| **Parâmetro** (*Parameter Action*) | clicar numa marca **muda um parâmetro** (ex.: escolher a categoria para um detalhamento) |
| **Conjunto** (*Set Action*) | clicar adiciona/remove membros de um conjunto: base do **drill-down assimétrico** (expandir só a categoria clicada) |

Acionamento: ao passar o mouse, ao selecionar ou pelo menu.

**Drill-down assimétrico com ação de conjunto:**
~~~
IF [Categoria selecionada] THEN [Subcategoria] ELSE [Categoria] END
~~~
onde \`[Categoria selecionada]\` é um conjunto alimentado pela ação: só a categoria clicada mostra as subcategorias.

**Visibilidade dinâmica de zonas (DZV)**: um objeto do painel (gráfico, contêiner) aparece ou some conforme um **campo booleano** ou parâmetro booleano (*Layout → Controlar visibilidade usando valor*). Usos: alternar entre gráfico de barras e tabela, menus de filtros que abrem e fecham (*pop-out*), KPIs que só aparecem quando há alerta.
`),
    exTab('Trocando a medida com um parâmetro', `
O parâmetro [Escolha a medida] está com o valor "Lucro" (o usuário escolheu no controle):
`, `CASE [Escolha a medida]
  WHEN "Vendas" THEN SUM([Vendas])
  WHEN "Lucro" THEN SUM([Lucro])
  WHEN "Quantidade" THEN SUM([Quantidade])
END`, `
Mude o valor do parâmetro no cenário (no Tableau, no controle) e o mesmo gráfico passa a mostrar outra medida.
`, { dims: ['Região'], campos: { 'Escolha a medida': '"Lucro"' }, nome: 'Medida escolhida' }),
    quiz('O usuário clica numa categoria e só ela se abre em subcategorias, as outras continuam fechadas. Que recurso é esse?', ['Ação de conjunto (Set Action) com um cálculo de drill-down', 'Ação de URL', 'Filtro de contexto', 'Parâmetro dinâmico apenas'], 0),
    quiz('Para trocar um gráfico de barras por uma tabela com um botão, sem sobrepor objetos, use...', ['Visibilidade dinâmica de zonas (DZV) controlada por parâmetro booleano', 'Objetos flutuantes empilhados', 'Duas histórias', 'Um filtro de medida'], 0),
    tab('Com o parâmetro **[Top N]** valendo **5**, escreva o cálculo booleano que mantém só as 5 subcategorias de maior venda (ele vai no Filtros).', 'RANK(SUM([Vendas])) <= [Top N]', { dims: ['Subcategoria'], campos: { 'Top N': '5' }, nome: 'No Top N' }),
    tab('O parâmetro **[Escolha a medida]** está em **"Quantidade"**. Escreva o CASE que devolve a soma de Vendas, Lucro ou Quantidade conforme o parâmetro, por **Categoria**.', 'CASE [Escolha a medida] WHEN "Vendas" THEN SUM([Vendas]) WHEN "Lucro" THEN SUM([Lucro]) WHEN "Quantidade" THEN SUM([Quantidade]) END', { dims: ['Categoria'], campos: { 'Escolha a medida': '"Quantidade"' }, nome: 'Medida escolhida' }),
    tab('**Simulação**: com o parâmetro **[Aumento de preço]** = 0.05 (5%), mostre por **Categoria** as vendas simuladas.', 'SUM([Vendas]) * (1 + [Aumento de preço])', { dims: ['Categoria'], campos: { 'Aumento de preço': '0.05' }, nome: 'Vendas simuladas' }),
    tab('**Drill-down assimétrico**: o conjunto **[Categoria selecionada]** é verdadeiro só para "Tecnologia". Crie a dimensão que mostra a **Subcategoria** para a categoria selecionada e a **Categoria** para as outras (nível de linha).', 'IF [Categoria selecionada] THEN [Subcategoria] ELSE [Categoria] END', { dims: 'linha', mostrar: ['Categoria'], campos: { 'Categoria selecionada': '[Categoria] = "Tecnologia"' }, nome: 'Nível do drill' }),
  ],
};

const PREP_SETUP = r`import pandas as pd
import numpy as np
loja_a = pd.DataFrame({
    "cidade": ["São Paulo", "sao paulo", "Campinas", "Curitiba", "Curitba", "Recife", None],
    "produto": ["Mouse sem fio", "Teclado mecânico", "Mouse sem fio", "Headset USB", "Headset USB", "Mouse sem fio", "Teclado mecânico"],
    "jan": [120, 80, 45, 60, 15, 30, 10],
    "fev": [130, 85, 50, 58, 12, 33, None],
    "mar": [125, 90, 48, 61, 14, 35, 12],
})
loja_b = pd.DataFrame({
    "cidade": ["Salvador", "Salvador", "Recife"],
    "produto": ["Mouse sem fio", "Mouse sem fio", "Headset USB"],
    "jan": [40, 40, 22], "fev": [42, 42, 25], "mar": [41, 41, 24],
})
`;
const PS = { setup: PREP_SETUP, setupNote: 'Já carregados: `loja_a` e `loja_b` (vendas em unidades por cidade e produto, com os meses como colunas: jan, fev, mar; nomes de cidade com erros de digitação, um valor nulo, uma cidade nula e uma linha duplicada em `loja_b`), além de `pd` e `np`.', packages: ['pandas'] };

const L_PREP = {
  id: 'tb-3-7', title: 'ETL self-service com o Tableau Prep',
  steps: [
    theory('Fluxos do Prep Builder', `
O **Tableau Prep Builder** prepara dados com um **fluxo visual** (da esquerda para a direita), mostrando o perfil de cada campo (distribuição, nulos, valores) a cada passo.

| etapa do fluxo | o que faz |
|---|---|
| **Entrada** | conecta arquivos/bancos; **união de entrada** com curinga |
| **Limpar** (*Clean*) | renomear, mudar tipo, filtrar, remover nulos, dividir, campos calculados, **agrupar valores** (manual, **por pronúncia**, **ortografia comum** ou caracteres) para unificar "São Paulo"/"sao paulo"/"S. Paulo" |
| **Agregar** | muda o grão (ex.: de item para pedido) |
| **Pivot** | **colunas para linhas** (meses como colunas → "Mês" e "Valor") ou **linhas para colunas** |
| **Join** / **Union** | combina tabelas |
| **Novas linhas** | preenche datas ausentes (densificação no Prep) |
| **Script** | executa Python (TabPy) ou R no meio do fluxo |
| **Saída** | grava .hyper, CSV, publica como fonte no Cloud/Server ou escreve num banco |

Boas práticas: um passo de limpeza por assunto (com nome descritivo), **remover duplicatas** cedo, documentar decisões, salvar o fluxo (.tfl) no Git, **agendar** o fluxo no Cloud/Server (*Tableau Prep Conductor*, parte do Data Management).

No app, você pratica as mesmas operações com **pandas** (o que o Prep faz por baixo é equivalente):
| no Prep | no pandas |
|---|---|
| Pivot colunas para linhas | \`df.melt(id_vars=[...], var_name="mes", value_name="unidades")\` |
| Union | \`pd.concat([a, b], ignore_index=True)\` |
| remover duplicatas | \`df.drop_duplicates()\` |
| filtrar nulos | \`df.dropna(subset=["cidade"])\` |
| trocar nulo por zero | \`df["unidades"].fillna(0)\` |
| agrupar por ortografia | normalizar o texto: tirar acentos com \`unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()\`, \`strip()\`, \`lower()\` e um dicionário de correções aplicado com \`.map(funcao)\` |
| Agregar | \`df.groupby("cidade")["unidades"].sum()\` |
`),
    exPy('Colunas para linhas (pivot) com pandas', `
Os meses estão como colunas; o Tableau quer uma coluna "mes" e uma "unidades":
`, r`longo = loja_a.melt(id_vars=["cidade", "produto"], var_name="mes", value_name="unidades")
longo.head(8)`, `
O mesmo que o passo **Pivot → Colunas para linhas** do Prep. Agora "mes" é uma dimensão e "unidades" uma medida.
`, PS),
    quiz('No Prep, qual passo transforma colunas "jan", "fev", "mar" em uma coluna "Mês"?', ['Pivot (colunas para linhas)', 'Agregar', 'Join', 'Union'], 0),
    quiz('"Curitiba" e "Curitba" devem virar a mesma cidade. Qual recurso do Prep usar?', ['Agrupar valores por ortografia comum/pronúncia', 'Pivot', 'Filtro de extração', 'Union com curinga'], 0),
    py('**Union + remover duplicatas**: empilhe `loja_a` e `loja_b` (nessa ordem, índice reiniciado) e remova as linhas duplicadas. Guarde em `todas`.',
      r`todas = pd.concat([loja_a, loja_b], ignore_index=True).drop_duplicates().reset_index(drop=True)`,
      r`assert len(todas) == len(loja_a) + len(loja_b) - 1
assert not todas.duplicated().any()`, PS),
    py('**Limpeza**: a partir de `loja_a`, remova as linhas sem cidade e **padronize** os nomes: tire acentos e espaços extras, deixe em minúsculas e corrija "curitba" para "curitiba". Guarde em `limpa` (coluna `cidade` padronizada, ex.: "sao paulo").',
      r`import unicodedata
def padroniza(txt):
    t = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode().strip().lower()
    return {"curitba": "curitiba"}.get(t, t)

limpa = loja_a.dropna(subset=["cidade"]).copy()
limpa["cidade"] = limpa["cidade"].map(padroniza)`,
      r`assert limpa["cidade"].isna().sum() == 0 and len(limpa) == 6
assert set(limpa["cidade"]) == {"sao paulo", "campinas", "curitiba", "recife"}`, PS),
    py('**Fluxo completo**: com `limpa` já pronta (cidades padronizadas), faça o pivot para o formato longo (`mes`, `unidades`), troque nulos de unidades por 0 e **agregue** o total de unidades por `cidade`. Guarde a Series em `total_cidade`.',
      r`longo = limpa.melt(id_vars=["cidade", "produto"], var_name="mes", value_name="unidades")
longo["unidades"] = longo["unidades"].fillna(0)
total_cidade = longo.groupby("cidade")["unidades"].sum()`,
      r`assert total_cidade["sao paulo"] == 120 + 130 + 125 + 80 + 85 + 90
assert total_cidade["curitiba"] == 60 + 58 + 61 + 15 + 12 + 14
assert len(total_cidade) == 4`,
      { ...PS, setup: PS.setup + r`
import unicodedata
def _p(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().strip().lower()
    return {"curitba": "curitiba"}.get(t, t)
limpa = loja_a.dropna(subset=["cidade"]).copy()
limpa["cidade"] = limpa["cidade"].map(_p)
`, setupNote: PS.setupNote + ' Também já existe `limpa` (loja_a sem cidade nula e com nomes padronizados).' }),
  ],
};

const L_UX = {
  id: 'tb-3-8', title: 'UX/UI, storytelling e design responsivo',
  steps: [
    theory('Princípios de design que reduzem a carga cognitiva', `
**Gestalt** (como o olho agrupa):
- **proximidade**: itens próximos parecem relacionados (agrupe KPIs de um tema)
- **similaridade**: mesma cor/forma = mesma coisa (a cor de "Tecnologia" deve ser igual em todos os gráficos)
- **fechamento e continuidade**: contêineres e alinhamentos guiam a leitura
- **figura e fundo**: destaque o que importa, mande o resto para o cinza

**Hierarquia visual e padrões de leitura**: no Ocidente, lemos em **Z** (painéis com poucos elementos: topo esquerdo → topo direito → diagonal → base) e em **F** (telas densas: linhas horizontais no topo e varredura vertical à esquerda). Coloque o KPI mais importante no **canto superior esquerdo**.

**Carga cognitiva**: cada elemento compete pela atenção. Corte bordas, grades, rótulos repetidos e cores sem significado; prefira poucos gráficos que respondem perguntas claras; títulos que **dizem a conclusão**; anotações nos pontos que importam.

**Storytelling com dados**: contexto (para quem, que decisão) → conflito (o que mudou/está errado) → resolução (o que fazer). Use **Histórias** ou um painel guiado com anotações.

**Design responsivo**: em *Painel → Visualização do dispositivo*, crie layouts para **Desktop, Tablet e Telefone**. O layout de telefone é **vertical**, com os gráficos empilhados e filtros escondidos (DZV). Use **contêineres aninhados padronizados** para que o Tableau redistribua os objetos.

**Acessibilidade**: paletas seguras para **daltonismo** (a "Color Blind" do Tableau, azul-laranja), não usar só cor para codificar (adicione rótulos/ícones), contraste suficiente, texto alternativo (descrições) e navegação por teclado nos painéis publicados.
`),
    quiz('Onde colocar o KPI mais importante de um painel com poucos elementos?', ['No canto superior esquerdo (início do padrão em Z)', 'No centro inferior', 'No canto inferior direito', 'Em qualquer lugar'], 0),
    quiz('"Tecnologia" aparece azul num gráfico e laranja em outro do mesmo painel. Qual princípio foi quebrado?', ['Similaridade (consistência de cores)', 'Proximidade', 'Fechamento', 'Nenhum'], 0),
    quiz('Para a versão de celular de um painel, o recomendado é...', ['Criar um layout de dispositivo "Telefone", vertical, com gráficos empilhados', 'Usar o mesmo layout de desktop', 'Remover todos os gráficos', 'Usar só objetos flutuantes'], 0),
    quiz('Para um público com daltonismo vermelho-verde, qual codificação é mais segura?', ['Paleta azul-laranja e rótulos/ícones além da cor', 'Vermelho e verde mais fortes', 'Só a cor', 'Arco-íris'], 0),
    order('Ordene a estrutura de uma história com dados:', ['contexto: para quem e que decisão', 'conflito: o que mudou ou está errado', 'evidência: os gráficos que mostram', 'resolução: o que fazer']),
  ],
};

const L_PROJETO3 = {
  id: 'tb-3-9', title: 'Projeto: dashboard analítico dinâmico com dados tratados',
  steps: [
    theory('O entregável do Nível 3', `
Um **painel analítico de clientes** sobre dados tratados no Prep:
1. **Fluxo no Prep**: união das fontes, limpeza de cidades, pivot, agregação, saída em .hyper
2. **Modelo** com relacionamentos (Pedidos ↔ Metas por região e mês) sem duplicação
3. **Coortes**: matriz de retenção (ano de entrada × ano de compra) e taxa de recompra por segmento
4. **Pareto** de produtos com a linha dos 80%
5. **Bump chart** do ranking das subcategorias
6. **Parâmetros**: troca de medida e Top N; **ação de conjunto** para drill-down; **DZV** alternando gráfico/tabela
7. **Layouts** para desktop e celular

Os cálculos-chave abaixo fecham o projeto.
`),
    tab('**Taxa de recompra geral** (sem dimensões): clientes com mais de 1 pedido ÷ clientes distintos.', 'COUNTD(IIF({FIXED [ID do Cliente] : COUNTD([ID do Pedido])} > 1, [ID do Cliente], NULL)) / COUNTD([ID do Cliente])', { dims: [], nome: 'Recompra' }),
    tab('**Retenção relativa**: na matriz **Coorte × Ano**, divida os clientes ativos de cada ano pelos clientes do **primeiro ano** da coorte (use LOOKUP com FIRST(), particionando por Coorte).', 'COUNTD([ID do Cliente]) / LOOKUP(COUNTD([ID do Cliente]), FIRST())', { dims: ['Coorte', 'Ano'], particao: ['Coorte'], campos: { Coorte: 'YEAR({FIXED [ID do Cliente] : MIN([Data do Pedido])})', ...ANO }, nome: 'Retenção' }),
    tab('**Pareto de produtos**: com os produtos ordenados por vendas (decrescente), o **percentual de produtos** acumulado (INDEX ÷ SIZE), para o eixo horizontal do gráfico.', 'INDEX() / SIZE()', { dims: ['Produto'], ordenar: { expr: 'SUM([Vendas])' }, nome: '% de produtos' }),
    tab('**KPI dinâmico**: com o parâmetro **[Escolha a medida]** = "Vendas", mostre por **Ano** o crescimento percentual da medida escolhida contra o ano anterior.', '(CASE [Escolha a medida] WHEN "Vendas" THEN SUM([Vendas]) WHEN "Lucro" THEN SUM([Lucro]) END - LOOKUP(CASE [Escolha a medida] WHEN "Vendas" THEN SUM([Vendas]) WHEN "Lucro" THEN SUM([Lucro]) END, -1)) / ABS(LOOKUP(CASE [Escolha a medida] WHEN "Vendas" THEN SUM([Vendas]) WHEN "Lucro" THEN SUM([Lucro]) END, -1))', { dims: ['Ano'], campos: { 'Escolha a medida': '"Vendas"', ...ANO }, nome: 'Crescimento' }),
  ],
};

export const TB_N3 = {
  id: 'tb-u3', level: 3, title: 'Modelagem, cálculos avançados e interatividade',
  description: 'Ordem de operações, relacionamentos e joins, LOD, cálculos de tabela, parâmetros, ações, DZV, Tableau Prep e UX. Entregável: dashboard analítico dinâmico com fluxo de dados tratado',
  lessons: [L_ORDEM, L_MODELO, L_FIXED, L_LOD2, L_TABELA, L_PARAM, L_PREP, L_UX, L_PROJETO3],
};
