// Trilha Tableau — Nível 1: Leigo (fundamentos e primeiros passos)
import { theory, quiz, order, fill, tab, exTab } from '../helpers.js';

const L_BI = {
  id: 'tb-1-1', title: 'BI, dados orientando decisões e o papel do Tableau',
  steps: [
    theory('Do dado bruto ao insight', `
**Business Intelligence (BI)** é o conjunto de processos e ferramentas que transforma dados da operação em decisões. Uma empresa **orientada a dados** (*data-driven*) decide olhando evidências, não só intuição ou hierarquia.

A cadeia de valor tem três degraus:

| degrau | exemplo | pergunta que responde |
|---|---|---|
| **dado bruto** | \`BR-2025-3412; 2025-03-14; Notebook Pro 14; R$ 6.140,00\` | o que foi registrado? |
| **informação** | "as vendas de Tecnologia em março foram R$ 640 mil, 12% abaixo de fevereiro" | o que aconteceu? |
| **insight** | "a queda veio só do Nordeste, onde o frete subiu; os clientes migraram para o envio padrão e atrasaram compras" | por que aconteceu e o que fazer? |

A **visualização de dados** acelera os dois últimos degraus: o olho humano percebe padrões (tendência, comparação, exceção) numa imagem muito mais rápido do que numa tabela de números. É isso que o Tableau faz bem: deixa o analista **perguntar e responder com gráficos** em segundos.

**Tipos de análise** (do mais simples ao mais valioso):
1. **descritiva**: o que aconteceu? (painéis de vendas)
2. **diagnóstica**: por que aconteceu? (filtros, *drill-down*, comparações)
3. **preditiva**: o que vai acontecer? (tendências, previsão)
4. **prescritiva**: o que devemos fazer? (simulações com parâmetros, recomendações)
`),
    theory('O Tableau no mercado de analytics', `
O **Tableau** (criado em 2003 em Stanford, comprado pela **Salesforce** em 2019) é uma das plataformas de BI mais usadas no mundo, ao lado do **Power BI** (Microsoft), **Looker** (Google), **Qlik** e de ferramentas abertas como **Metabase** e **Superset**.

O que diferencia o Tableau:
- **análise visual por arrastar e soltar**: cada ação gera uma consulta e um gráfico na hora (tecnologia **VizQL**, próxima lição)
- **conexão com quase qualquer fonte**: planilhas, bancos (PostgreSQL, SQL Server, Oracle), data warehouses (Snowflake, BigQuery, Redshift, Databricks), APIs
- **motor Hyper**: extrações colunares muito rápidas
- **comunidade forte**: o **Tableau Public** reúne milhões de visualizações abertas, ótimo para aprender e montar portfólio
- **nova geração com IA**: Tableau Pulse, Tableau Agent e Tableau Next (Nível 5)

**Papéis profissionais** que usam Tableau: analista de dados/BI, analytics engineer, cientista de dados, desenvolvedor de BI, administrador de servidor e arquiteto de analytics. Este curso vai do primeiro gráfico até o nível de arquiteto.

> **Como os exercícios funcionam aqui:** o app não roda o Tableau Desktop, mas tem um **motor que executa a linguagem de cálculos do Tableau** sobre a base *Superstore Brasil* (a versão nacional da famosa base de exemplo do Tableau). Quando você arrasta **Vendas** para a visualização, o Tableau calcula \`SUM([Vendas])\`; aqui você escreve isso e vê a visualização resultante. O que você aprende vale diretamente no Tableau.
`),
    quiz('"As vendas do Sul caíram 8% no trimestre" é um exemplo de...', ['Informação (o que aconteceu)', 'Dado bruto', 'Insight (o porquê e o que fazer)', 'Análise prescritiva'], 0),
    quiz('Qual tipo de análise responde "por que as vendas caíram"?', ['Diagnóstica', 'Descritiva', 'Preditiva', 'Prescritiva'], 0),
    order('Ordene a cadeia de valor dos dados:', ['dado bruto', 'informação', 'insight', 'decisão']),
  ],
};

const L_ECOSSISTEMA = {
  id: 'tb-1-2', title: 'Ecossistema Tableau e tipos de arquivo',
  steps: [
    theory('Os produtos da plataforma', `
| produto | para que serve | custo |
|---|---|---|
| **Tableau Desktop** | criar análises e painéis no computador (Windows/macOS); a ferramenta principal do analista | licença Creator |
| **Tableau Public** | versão gratuita: cria e publica **somente** na nuvem pública (todos podem ver); ótimo para portfólio | grátis |
| **Tableau Prep Builder** | preparar e limpar dados com fluxos visuais (ETL *self-service*) | incluso no Creator |
| **Tableau Cloud** | plataforma na nuvem (SaaS, hospedada pela Salesforce) para publicar, compartilhar, agendar atualizações e governar | assinatura |
| **Tableau Server** | o mesmo papel do Cloud, mas instalado na infraestrutura da empresa (*on-premises* ou nuvem própria) | assinatura |
| **Tableau Reader** | leitor gratuito de arquivos empacotados (.twbx) no computador, sem editar (descontinuado em versões recentes; hoje o caminho é o Cloud/Server) | grátis |
| **Tableau Mobile** | app para consumir painéis publicados no celular/tablet | incluso |

**Licenças por papel** (Cloud/Server):
- **Creator**: cria tudo (Desktop + Prep + criação na web)
- **Explorer**: explora e edita painéis existentes na web, a partir de fontes publicadas
- **Viewer**: só visualiza e interage (filtros, ações)
`),
    theory('Arquivos do Tableau', `
| extensão | o que contém | quando usar |
|---|---|---|
| **.twb** | pasta de trabalho (*workbook*): planilhas, painéis e conexões em XML, **sem os dados** | versionar no Git; quando todos têm acesso à fonte |
| **.twbx** | pasta de trabalho **empacotada**: o .twb + extração + arquivos locais (planilhas, imagens) | enviar para alguém, publicar no Tableau Public |
| **.tds** | fonte de dados: conexão, campos calculados, renomeações, formatos (sem dados) | reaproveitar a mesma modelagem em várias pastas de trabalho |
| **.tdsx** | fonte de dados empacotada (.tds + dados/extração) | compartilhar uma fonte pronta |
| **.hyper** | extração no formato do motor Hyper (colunar, compactado) | dados rápidos e offline |
| **.tfl** | fluxo do Tableau Prep (sem dados) | versionar fluxos |
| **.tflx** | fluxo do Prep empacotado (com arquivos locais) | enviar o fluxo com os dados |

Regra prática: **"x" no final = empacotado** (leva os dados junto).
`),
    quiz('Você vai mandar um painel por e-mail para alguém que não tem acesso ao seu banco de dados. Qual formato?', ['.twbx', '.twb', '.tds', '.tfl'], 0),
    quiz('Que licença permite criar pastas de trabalho no Desktop e fluxos no Prep?', ['Creator', 'Explorer', 'Viewer', 'Public'], 0),
    quiz('O que acontece ao salvar no Tableau Public?', ['A visualização fica pública na internet, visível para qualquer pessoa', 'Fica salva só no seu computador', 'Só sua equipe vê', 'Os dados ficam criptografados e privados'], 0),
    fill('Complete: arquivo de extração do motor Hyper.', 'vendas_2025.___', [['hyper']]),
    fill('Complete: fluxo do Tableau Prep empacotado com os dados.', 'limpeza_clientes.___', [['tflx']]),
  ],
};

const L_TABULAR = {
  id: 'tb-1-3', title: 'Dados tabulares, granularidade e o primeiro cálculo',
  steps: [
    theory('Linhas, colunas e granularidade', `
O Tableau trabalha melhor com **dados estruturados**: uma tabela em que
- cada **linha** é um **registro** (um evento, uma entidade)
- cada **coluna** é um **campo** (um atributo), com um só tipo de dado
- a primeira linha é o **cabeçalho** (nomes dos campos)

**Granularidade** (ou grão) é **o que uma linha representa**. Na nossa base *Superstore Brasil*, uma linha é **um item de um pedido**: o pedido BR-2025-3412 com 3 produtos ocupa 3 linhas. Saber o grão evita erros clássicos: contar linhas achando que são pedidos, somar um campo que se repete em cada item...

**Relatório formatado não é base de dados.** Planilhas "bonitas" para impressão atrapalham a análise:
| problema | por que atrapalha |
|---|---|
| células mescladas | a categoria aparece só na primeira linha; as outras ficam vazias |
| subtotais e totais no meio das linhas | seriam somados de novo (dupla contagem) |
| títulos e notas acima da tabela | o cabeçalho não fica na primeira linha |
| meses como colunas (Jan, Fev, Mar...) | a data vira vários campos; o certo é uma coluna "Mês" e uma "Valor" (formato longo) |

O **Interpretador de Dados** do Tableau (próximas lições) tenta corrigir planilhas assim; o **Tableau Prep** faz a limpeza completa (Nível 3).
`),
    theory('Arrastar é calcular', `
Quando você arrasta uma **medida** (campo numérico, como Vendas) para a visualização, o Tableau não mostra cada linha: ele **agrega**, por padrão com **soma**. A pílula aparece como **SUM(Vendas)**.

E quando há uma **dimensão** (campo de categoria, como Região) na visualização, a soma é feita **para cada valor** dela: uma marca (barra, ponto) por região.

Na linguagem de cálculos, isso se escreve:
~~~
SUM([Vendas])
~~~
- campos vão entre **colchetes**: \`[Vendas]\`, \`[Data do Pedido]\`
- funções em maiúsculas (o Tableau aceita minúsculas também): \`SUM\`, \`AVG\`, \`COUNT\`

Nos exercícios deste curso, o quadro "Linhas" mostra as dimensões que já estão na visualização; você escreve o cálculo que vai na outra prateleira.
`),
    exTab('Vendas por região', `
Região está em Linhas; o cálculo é o que o Tableau gera ao arrastar Vendas:
`, `SUM([Vendas])`, `
Cinco marcas, uma por região. Cada valor é a soma das vendas de todas as linhas daquela região. Experimente trocar por \`AVG([Vendas])\` (valor médio por item) e executar de novo.
`, { dims: ['Região'], nome: 'Vendas' }),
    quiz('Na Superstore Brasil, o que representa uma linha?', ['Um item de um pedido', 'Um pedido inteiro', 'Um cliente', 'Um dia de vendas'], 0),
    quiz('Uma planilha tem os meses como colunas (Jan, Fev, Mar...). O formato ideal para o Tableau é...', ['Uma coluna de mês e uma coluna de valor (formato longo)', 'Manter assim', 'Mesclar as células', 'Adicionar uma linha de total'], 0),
    tab('Com **Categoria** em Linhas, escreva o cálculo que o Tableau gera ao arrastar **Lucro** para a visualização.', 'SUM([Lucro])', { dims: ['Categoria'], nome: 'Lucro' }),
    tab('Com **Segmento** em Linhas, mostre a **quantidade** total de itens vendidos (soma de [Quantidade]).', 'SUM([Quantidade])', { dims: ['Segmento'], nome: 'Quantidade' }),
  ],
};

const L_INTERFACE = {
  id: 'tb-1-4', title: 'Anatomia da interface e o VizQL',
  steps: [
    theory('As áreas da tela', `
**Página da Fonte de Dados** (aba "Fonte de dados", no canto inferior esquerdo): onde você conecta, vê as tabelas, faz relacionamentos e confere os dados.

**Planilha** (*worksheet*), onde se constroem os gráficos:
| área | função |
|---|---|
| **Painel de Dados** (esquerda) | lista os campos: **dimensões** acima, **medidas** abaixo; ícones mostram o tipo (Abc texto, # número, calendário data, globo geográfico) |
| **Prateleiras Colunas e Linhas** (topo) | o que vai no eixo horizontal e vertical; criam cabeçalhos ou eixos |
| **Cartão de Marcas** (*Marks*) | tipo de marca (barra, linha, círculo, área, mapa...) e as propriedades **Cor, Tamanho, Rótulo, Detalhe, Dica de ferramenta** |
| **Painel de Filtros** | o que entra e o que sai da visualização |
| **Painel de Páginas** | anima a visualização passando por um campo (ex.: mês a mês) |
| **Mostre-me** (*Show Me*) | sugere tipos de gráfico para os campos selecionados e mostra o que cada um exige |
| abas inferiores | planilhas, **painéis** (*dashboards*) e **histórias** (*stories*) |
`),
    theory('VizQL: arrastar = consultar + desenhar', `
O coração do Tableau é o **VizQL** (*Visual Query Language*), criado na pesquisa de Stanford que originou a empresa. Cada vez que você arrasta um campo:

1. o Tableau traduz a **especificação visual** (o que está em Colunas, Linhas, Marcas, Filtros) numa **consulta** à fonte (SQL para bancos, consulta ao Hyper para extrações)
2. a fonte devolve os dados **já agregados** no nível das dimensões presentes
3. o VizQL **desenha** as marcas, escolhendo eixos, cores e escalas

Exemplo: **Região** em Linhas + **SUM(Vendas)** em Colunas vira, por baixo dos panos, algo como
~~~sql
SELECT "Região", SUM("Vendas") FROM pedidos GROUP BY "Região"
~~~
Por isso o Tableau é rápido mesmo com milhões de linhas: quem agrega é o banco ou o Hyper, e só as marcas chegam à tela. E por isso entender **o nível de detalhe** (quais dimensões estão na visualização) é a chave de todo o curso.
`),
    quiz('Onde você muda uma visualização de barras para linhas?', ['No Cartão de Marcas (tipo de marca)', 'No Painel de Filtros', 'Na Página da Fonte de Dados', 'No Painel de Páginas'], 0),
    quiz('O que o VizQL faz quando você arrasta um campo?', ['Gera uma consulta agregada à fonte e desenha as marcas com o resultado', 'Copia todos os dados para a tela', 'Cria um arquivo .hyper', 'Publica no Tableau Cloud'], 0),
    order('Ordene o que acontece ao arrastar Vendas para uma visualização com Região:', ['a ação vira uma especificação visual', 'o VizQL gera a consulta agregada', 'a fonte devolve uma linha por região', 'as marcas são desenhadas']),
    tab('A visualização tem **Modo de Envio** em Linhas. Mostre o **valor médio de vendas por item** em cada modo (AVG de Vendas).', 'AVG([Vendas])', { dims: ['Modo de Envio'], nome: 'Venda média por item' }),
  ],
};

const L_CONEXAO = {
  id: 'tb-1-5', title: 'Conectar e preparar a fonte de dados',
  steps: [
    theory('Conectando arquivos e planilhas', `
Na tela inicial, em **Conectar**:
- **Para um arquivo**: Microsoft Excel, Arquivo de texto (CSV, TXT), JSON, PDF, arquivo espacial, estatístico (SAS, SPSS, R)
- **Para um servidor**: bancos e serviços (PostgreSQL, SQL Server, Snowflake, BigQuery, Google Sheets, Salesforce...). O Tableau Public conecta a menos fontes (arquivos, Google Sheets, OData, alguns conectores web)

**Excel com várias abas**: cada aba aparece como uma tabela; arraste para a tela de relacionamentos.
**JSON**: escolha os níveis do esquema que viram linhas (objetos aninhados viram colunas).
**Google Sheets**: autentique com a conta Google e escolha a planilha.

**Interpretador de Dados** (*Data Interpreter*): caixa de seleção na página da fonte, para Excel/CSV/Sheets mal formatados. Ele detecta o cabeçalho real, ignora títulos, notas e totais, e separa várias tabelas na mesma aba. Clique em "Revisar os resultados" para ver o que ele mudou (o Tableau abre uma planilha colorida mostrando o que virou cabeçalho, dado ou foi ignorado).
`),
    theory('Ajustes na fonte: nomes, tipos e divisões', `
Na grade de dados da página da fonte (ou no Painel de Dados):
- **Renomear** campos para nomes de negócio ("vl_venda" → "Vendas")
- **Ocultar** campos irrelevantes (IDs técnicos): somem do painel e deixam as extrações menores
- **Alterar o tipo** clicando no ícone: Texto (Abc), Número inteiro, Número decimal, Data, Data e hora, Booleano (V/F) e **Função geográfica** (País, Estado, Cidade, CEP, Latitude, Longitude), que permite mapas
- **Dividir** (*Split*): separa um texto em várias colunas por um separador detectado automaticamente; **Divisão personalizada** (*Custom Split*) deixa escolher o separador e quais partes manter

A divisão automática gera campos calculados com a função \`SPLIT\`:
~~~
SPLIT([Cliente], " ", 1)     // primeira parte antes do espaço: o primeiro nome
SPLIT([ID do Pedido], "-", 2) // segunda parte: o ano em "BR-2025-3412"
SPLIT([ID do Pedido], "-", -1) // última parte (índice negativo conta do fim)
~~~
Estes são **cálculos de nível de linha**: o resultado existe para **cada linha** da base, sem agregação.
`),
    exTab('Primeiro nome do cliente com SPLIT', `
Cálculo de nível de linha: cada linha da base ganha o valor. O app mostra as primeiras linhas:
`, `SPLIT([Cliente], " ", 1)`, `
O mesmo que a "Divisão personalizada" faria, usando o espaço como separador e mantendo a 1ª coluna.
`, { dims: 'linha', mostrar: ['Cliente'], nome: 'Primeiro nome' }),
    quiz('Uma planilha de Excel tem o título "Relatório de Vendas 2025" nas duas primeiras linhas e uma linha de TOTAL no fim. O que usar ao conectar?', ['O Interpretador de Dados', 'Divisão personalizada', 'Função geográfica', 'Filtro de extração'], 0),
    quiz('Para o Tableau desenhar mapas a partir do campo "UF", o que você faz?', ['Atribui a função geográfica Estado/Província ao campo', 'Muda o tipo para Número', 'Oculta o campo', 'Divide o campo'], 0),
    tab('Extraia o **número sequencial** do pedido, a última parte de "BR-2025-3412" (use SPLIT com índice -1).', 'SPLIT([ID do Pedido], "-", -1)', { dims: 'linha', mostrar: ['ID do Pedido'], nome: 'Número do pedido' }),
    tab('Extraia o **sobrenome final** do cliente (a última palavra do nome).', 'SPLIT([Cliente], " ", -1)', { dims: 'linha', mostrar: ['Cliente'], nome: 'Sobrenome' }),
  ],
};

const L_GRAFICOS = {
  id: 'tb-1-6', title: 'Primeiros gráficos e o Cartão de Marcas',
  steps: [
    theory('Construindo gráficos à mão', `
Faça os gráficos **arrastando os campos**, sem depender só do Mostre-me: assim você entende o que cada prateleira faz.

| gráfico | como montar |
|---|---|
| **barras** | dimensão em Linhas (ex.: Subcategoria) + medida em Colunas (SUM(Vendas)); ordene pelo botão de classificação |
| **linhas** (tendência) | data em Colunas (ex.: MÊS(Data do Pedido) contínuo) + medida em Linhas |
| **dispersão** | uma medida em Colunas (Vendas), outra em Linhas (Lucro), dimensão em Detalhe (Cliente: um ponto por cliente) |
| **tabela de texto** (*crosstab*) | dimensões em Linhas e Colunas + medida em **Texto/Rótulo** |
| **mapa simples** | campo geográfico (Estado) com duplo clique: o Tableau gera Longitude/Latitude; medida em Cor ou Tamanho |

**Cartão de Marcas**: cada propriedade codifica uma informação:
- **Cor**: dimensão (cores categóricas) ou medida (gradiente)
- **Tamanho**: medida (marcas maiores = valores maiores)
- **Rótulo**: escreve o valor na marca
- **Detalhe**: aumenta o nível de detalhe **sem** criar cabeçalho (ex.: um ponto por cliente na dispersão)
- **Dica de ferramenta** (*Tooltip*): texto ao passar o mouse; edite para virar uma frase ("Vendas de <Região>: <SUM(Vendas)>")

**Cuidado com o Detalhe**: tudo que está em Linhas, Colunas e no Cartão de Marcas (exceto filtros) define **o nível de detalhe da visualização**: o grão das marcas.
`),
    exTab('Uma marca por subcategoria', `
Subcategoria em Linhas e a soma de vendas: o gráfico de barras mais clássico.
`, `SUM([Vendas])`, `
Na visualização real, você ordenaria do maior para o menor e colocaria SUM(Lucro) em Cor para revelar subcategorias que vendem muito e lucram pouco (como Mesas, com descontos altos).
`, { dims: ['Subcategoria'], nome: 'Vendas' }),
    quiz('Numa dispersão Vendas × Lucro, como obter um ponto por cliente sem criar cabeçalhos?', ['Colocar Cliente em Detalhe no Cartão de Marcas', 'Colocar Cliente em Linhas', 'Colocar Cliente em Filtros', 'Usar o Painel de Páginas'], 0),
    quiz('Qual propriedade do Cartão de Marcas codifica uma medida pelo tamanho visual das marcas?', ['Tamanho', 'Detalhe', 'Rótulo', 'Dica de ferramenta'], 0),
    tab('Com **Subcategoria** em Linhas, mostre o **lucro total** de cada uma (o campo que você colocaria em Cor).', 'SUM([Lucro])', { dims: ['Subcategoria'], nome: 'Lucro' }),
    tab('Numa tabela de texto com **Região** e **Categoria** em Linhas, mostre a **soma das vendas** em cada célula.', 'SUM([Vendas])', { dims: ['Região', 'Categoria'], nome: 'Vendas' }),
    tab('Num mapa por **Estado**, o tamanho dos círculos será o **número de itens vendidos**. Use a soma de [Quantidade].', 'SUM([Quantidade])', { dims: ['Estado'], nome: 'Itens' }),
  ],
};

const L_PROJETO1 = {
  id: 'tb-1-7', title: 'Projeto: primeiro painel exploratório e publicação',
  steps: [
    theory('O entregável do Nível 1', `
Monte, no Tableau Public, um **painel exploratório** da Superstore Brasil (ou de uma planilha sua):
1. **Barras**: vendas por subcategoria, ordenadas, lucro em cor
2. **Linha**: vendas por mês ao longo do tempo
3. **Mapa**: vendas por estado
4. **Tabela de texto**: vendas por região e categoria

**Publicação:**
- crie seu perfil em **public.tableau.com** (é o seu portfólio: recrutadores olham)
- no Desktop/Public: **Arquivo → Salvar no Tableau Public**; no Desktop pago, você também pode **Salvar como .twbx** para mandar o arquivo empacotado
- dê título claro, descrição e tags; deixe a pasta de trabalho baixável se quiser que outros aprendam com ela
- lembre: **tudo no Public é público**. Nunca publique dados sigilosos da empresa

Os exercícios abaixo produzem os números de cada peça do painel.
`),
    tab('Peça 1 — barras: com **Subcategoria** em Linhas, as vendas totais.', 'SUM([Vendas])', { dims: ['Subcategoria'], nome: 'Vendas' }),
    tab('Peça 3 — mapa: com **Estado** em Detalhe, o **lucro total** (que vai em Cor).', 'SUM([Lucro])', { dims: ['Estado'], nome: 'Lucro' }),
    tab('Peça 4 — tabela de texto: com **Região** e **Segmento** em Linhas, a **venda média por item**.', 'AVG([Vendas])', { dims: ['Região', 'Segmento'], nome: 'Venda média' }),
    quiz('Seu painel usa dados de clientes reais da empresa. Onde publicá-lo?', ['No Tableau Cloud/Server da empresa, com permissões; nunca no Tableau Public', 'No Tableau Public, que é privado', 'No Tableau Public com nome falso', 'Por e-mail em .twbx para todos'], 0),
    order('Ordene a publicação no Tableau Public:', ['criar o perfil em public.tableau.com', 'montar as planilhas e o painel', 'Arquivo → Salvar no Tableau Public', 'revisar título, descrição e tags']),
  ],
};

export const TB_N1 = {
  id: 'tb-u1', level: 1, title: 'Fundamentos e primeiros passos',
  description: 'BI e visualização, ecossistema e arquivos do Tableau, dados tabulares, interface, VizQL, conexões e primeiros gráficos. Entregável: primeiro painel no Tableau Public',
  lessons: [L_BI, L_ECOSSISTEMA, L_TABULAR, L_INTERFACE, L_CONEXAO, L_GRAFICOS, L_PROJETO1],
};
