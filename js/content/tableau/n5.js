// Trilha Tableau — Nível 5: Master (arquitetura enterprise, automação, APIs e analytics agêntico)
import { theory, quiz, order, fill, tab, py, exPy } from '../helpers.js';

const r = String.raw;

const L_ARQ = {
  id: 'tb-5-1', title: 'Arquitetura enterprise do Tableau Server',
  steps: [
    theory('Processos e topologias', `
O **Tableau Server** é um conjunto de **processos** (serviços) que podem rodar num só nó ou espalhados em vários:

| processo | função |
|---|---|
| **Gateway** | servidor web de entrada (Apache), roteia as requisições e faz balanceamento interno |
| **Application Server** (VizPortal) | interface web, navegação, permissões, REST API |
| **VizQL Server** | gera as consultas e **renderiza** as visualizações (o motor do Nível 1) |
| **Backgrounder** | tarefas agendadas: atualização de **extrações**, assinaturas, alertas, fluxos do Prep |
| **Data Server** | gerencia as **fontes de dados publicadas** e suas conexões |
| **Data Engine / Hyper** | consultas às extrações |
| **Repository** (PostgreSQL) | metadados: usuários, permissões, conteúdo, histórico de uso (o "banco do servidor") |
| **File Store** | arquivos de extração e pastas de trabalho |
| **Cache Server** | cache de consultas compartilhado |
| **Coordination Service** (ZooKeeper) e **Cluster Controller** | coordenação do cluster e failover |
| **TSM** (Tableau Services Manager) | administração: \`tsm\` na linha de comando e interface web |

**Topologias:**
- **nó único**: tudo numa máquina (testes, uso pequeno)
- **vários nós**: separe **Backgrounders** (carga de extrações) de **VizQL** (carga de usuários) para uma não derrubar a outra
- **Alta disponibilidade (HA)**: pelo menos **3 nós** (quórum do serviço de coordenação), Repository e File Store redundantes com failover automático, **balanceador de carga** externo na frente dos Gateways
- **Disaster Recovery**: \`tsm maintenance backup\` (repositório + file store) agendado e testado com \`restore\` em outro ambiente; RPO/RTO definidos

**Autenticação corporativa:** **SAML** e **OpenID Connect (OIDC)** para SSO com o provedor de identidade (Okta, Entra ID), **Kerberos** (SSO em rede Windows e delegação ao banco), **Active Directory/LDAP** para usuários e grupos, e **SCIM** para provisionar/desprovisionar usuários automaticamente a partir do IdP.

**Tableau Cloud** elimina a gestão de processos (a Salesforce opera), mas mantém as decisões de **sites, autenticação, governança e capacidade**.
`),
    quiz('As atualizações de extrações estão deixando os painéis lentos no horário comercial. Que mudança de topologia ajuda?', ['Isolar Backgrounders em nós dedicados, separados dos nós de VizQL', 'Mais memória no Repository', 'Desligar o Gateway', 'Usar só conexões ao vivo'], 0),
    quiz('Qual é o número mínimo de nós para alta disponibilidade com failover automático?', ['3', '1', '2', '5'], 0),
    quiz('O que o protocolo SCIM resolve?', ['Provisionar e desativar usuários automaticamente a partir do provedor de identidade', 'Criptografar extrações', 'Balancear carga', 'Agendar backups'], 0),
    order('Ordene um plano de recuperação de desastre:', ['agendar tsm maintenance backup', 'copiar o backup para outro local', 'restaurar periodicamente num ambiente de teste', 'medir o tempo de recuperação (RTO)', 'documentar o procedimento']),
  ],
};

const USUARIOS = r`import pandas as pd
hoje = pd.Timestamp("2025-12-31")
usuarios = pd.DataFrame({
    "nome": ["ana.souza", "bruno.lima", "carla.dias", "diego.rocha", "elisa.gomes", "fabio.costa", "gabi.alves", "hugo.reis"],
    "siteRole": ["Creator", "Creator", "Explorer", "Viewer", "Creator", "Explorer", "Viewer", "Creator"],
    "lastLogin": pd.to_datetime(["2025-12-20", "2025-06-02", "2025-11-30", None, "2025-08-15", "2025-12-29", "2025-03-01", None]),
})
CUSTO_ANUAL = {"Creator": 900, "Explorer": 504, "Viewer": 180}
`;

const L_REST = {
  id: 'tb-5-2', title: 'REST API e Tableau Server Client (TSC)',
  steps: [
    theory('Automação administrativa', `
A **REST API** do Tableau permite fazer por código quase tudo que a interface faz: **entrar** (*sign in* com **Personal Access Token**: nome + segredo, nunca a senha), listar e criar **usuários e grupos**, mudar **permissões**, **publicar** e baixar conteúdo, disparar **atualizações de extração**, gerenciar **agendamentos** e **assinaturas**.

A biblioteca oficial em Python é a **Tableau Server Client** (\`pip install tableauserverclient\`):
~~~python
import tableauserverclient as TSC
auth = TSC.PersonalAccessTokenAuth("automacao", os.environ["TABLEAU_PAT"], site_id="empresa")
server = TSC.Server("https://tableau.empresa.com", use_server_version=True)
with server.auth.sign_in(auth):
    # 1) auditar licenças: usuários e último acesso
    for u in TSC.Pager(server.users):
        print(u.name, u.site_role, u.last_login)
    # 2) atualizar a extração depois que o pipeline (Airflow/dbt) terminar
    ds = server.datasources.get_by_id("...")
    job = server.datasources.refresh(ds)
    server.jobs.wait_for_job(job)
    # 3) migrar uma pasta de trabalho entre ambientes (baixar de Dev, publicar em Prod)
    caminho = server.workbooks.download("id-do-dev")
~~~
- \`TSC.Pager\` percorre as páginas de resultados (a API devolve em lotes)
- o **PAT** fica num cofre/variável de ambiente; expira se não for usado
- **gatilhos orientados a eventos**: no fim de um DAG do Airflow ou de um job do dbt, chame \`refresh\` em vez de agendar a extração "às 6h e torcer"

**Auditoria de licenças** (FinOps): usuários **Creator** sem login há mais de 90 dias são candidatos a rebaixar para Viewer ou remover, liberando custo. Em pandas, quem nunca entrou tem \`lastLogin\` nulo: teste com \`usuarios["lastLogin"].isna()\`; os dias sem login saem de \`(hoje - usuarios["lastLogin"]).dt.days\`.
`),
    exPy('Usuários inativos a partir do retorno da API', `
O DataFrame abaixo imita o que \`server.users\` devolve (nome, papel no site, último login):
`, r`usuarios["dias_sem_login"] = (hoje - usuarios["lastLogin"]).dt.days
usuarios`, `
Usuários que nunca entraram têm \`lastLogin\` nulo (NaT) e precisam de tratamento próprio: provavelmente nem deveriam ter licença.
`, { setup: USUARIOS, setupNote: 'Já carregados: `usuarios` (nome, siteRole, lastLogin), `hoje` (31/12/2025), `CUSTO_ANUAL` (custo por papel) e `pd`.', packages: ['pandas'] }),
    quiz('Como um script deve se autenticar na REST API?', ['Com um Personal Access Token guardado num cofre ou variável de ambiente', 'Com usuário e senha escritos no código', 'Sem autenticação', 'Com o token de outro usuário'], 0),
    quiz('O pipeline do dbt terminou às 5h37. Como garantir que o painel mostre os dados novos logo em seguida?', ['Chamar o refresh da fonte pela REST API/TSC ao fim do pipeline', 'Agendar a extração para as 8h', 'Pedir aos usuários que esperem', 'Trocar para conexão ao vivo sempre'], 0),
    py('Liste em `inativos` (lista de nomes, em ordem alfabética) os usuários **Creator** que **nunca entraram** ou estão **há mais de 90 dias** sem login.',
      r`dias = (hoje - usuarios["lastLogin"]).dt.days
mask = (usuarios["siteRole"] == "Creator") & (usuarios["lastLogin"].isna() | (dias > 90))
inativos = sorted(usuarios.loc[mask, "nome"])`,
      r`assert inativos == ["bruno.lima", "elisa.gomes", "hugo.reis"], inativos`,
      { setup: USUARIOS, setupNote: 'Já carregados: `usuarios` (nome, siteRole, lastLogin), `hoje` e `CUSTO_ANUAL`.', packages: ['pandas'] }),
    py('Calcule a **economia anual** (`economia`) se os Creators inativos (mesma regra) forem rebaixados para **Viewer**: soma de (custo Creator − custo Viewer) para cada um, usando `CUSTO_ANUAL`.',
      r`dias = (hoje - usuarios["lastLogin"]).dt.days
mask = (usuarios["siteRole"] == "Creator") & (usuarios["lastLogin"].isna() | (dias > 90))
economia = int(mask.sum()) * (CUSTO_ANUAL["Creator"] - CUSTO_ANUAL["Viewer"])`,
      r`assert economia == 3 * (900 - 180)`,
      { setup: USUARIOS, setupNote: 'Já carregados: `usuarios`, `hoje` e `CUSTO_ANUAL`.', packages: ['pandas'] }),
  ],
};

const L_HYPER = {
  id: 'tb-5-3', title: 'Hyper API: gerar extrações por código',
  steps: [
    theory('Criando arquivos .hyper fora do Desktop', `
A **Hyper API** (\`pip install tableauhyperapi\`; também em Java, C++ e C#) cria, lê e atualiza arquivos **.hyper** com SQL, sem abrir o Tableau. Uso típico: um job extrai dados de uma API ou do data warehouse, gera o .hyper otimizado e **publica** com a REST API/TSC.

~~~python
from tableauhyperapi import HyperProcess, Telemetry, Connection, CreateMode, \
    TableDefinition, SqlType, TableName, Inserter

pedidos = TableDefinition(TableName("Extract", "pedidos"), [
    TableDefinition.Column("id_pedido", SqlType.text()),
    TableDefinition.Column("data", SqlType.date()),
    TableDefinition.Column("vendas", SqlType.double()),
    TableDefinition.Column("quantidade", SqlType.big_int()),
])
with HyperProcess(Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU) as hyper:
    with Connection(hyper.endpoint, "vendas.hyper", CreateMode.CREATE_AND_REPLACE) as con:
        con.catalog.create_schema("Extract")
        con.catalog.create_table(pedidos)
        with Inserter(con, pedidos) as ins:
            ins.add_rows(linhas)          # ou COPY de um CSV/Parquet, muito mais rápido
            ins.execute()
        con.execute_command("DELETE FROM \\"Extract\\".\\"pedidos\\" WHERE data < '2022-01-01'")
# depois: server.datasources.publish(ds_item, "vendas.hyper", mode=TSC.Server.PublishMode.Overwrite)
~~~
Dicas: use **COPY** (\`COPY tabela FROM 'arquivo.parquet'\`) para cargas grandes; várias tabelas no mesmo .hyper viram um modelo com relacionamentos; tipos corretos (inteiros, datas, booleanos) deixam as extrações menores e mais rápidas; o .hyper aceita SQL (UPDATE/DELETE) para cargas incrementais.

Mapeamento de tipos (pandas → Hyper): texto (\`object\` no pandas 2, \`str\` no pandas 3) → \`SqlType.text()\`, inteiro → \`SqlType.big_int()\`, decimal → \`SqlType.double()\`, booleano → \`SqlType.bool()\`, data/hora → \`SqlType.timestamp()\` (ou \`date()\`).
`),
    quiz('Qual a forma mais rápida de carregar milhões de linhas de um Parquet num .hyper?', ['O comando COPY do Hyper', 'Inserter linha a linha', 'Abrir no Desktop e salvar', 'REST API'], 0),
    quiz('Um job gerou vendas.hyper. Como colocá-lo no Tableau Cloud por código?', ['Publicar com a REST API/TSC (datasources.publish)', 'Hyper API publica sozinha', 'Por e-mail', 'Pelo Tableau Public'], 0),
    py('Escreva `tipo_hyper(dtype)` que recebe o nome do tipo do pandas (texto) e devolve o nome do `SqlType` do Hyper: "object" ou "str" (texto) → "text", "int64" → "big_int", "float64" → "double", "bool" → "bool", e qualquer tipo que comece com "datetime64" → "timestamp". Depois monte `colunas`: lista de tuplas (nome, tipo) para o DataFrame `df`, na ordem das colunas.',
      r`def tipo_hyper(dtype):
    if dtype.startswith("datetime64"):
        return "timestamp"
    return {"object": "text", "str": "text", "int64": "big_int", "float64": "double", "bool": "bool"}[dtype]

colunas = [(c, tipo_hyper(str(t))) for c, t in df.dtypes.items()]`,
      r`assert tipo_hyper("int64") == "big_int" and tipo_hyper("object") == "text" and tipo_hyper("str") == "text" and tipo_hyper("datetime64[us]") == "timestamp"
assert colunas == [("id_pedido", "text"), ("data", "timestamp"), ("vendas", "double"), ("quantidade", "big_int"), ("tem_desconto", "bool")], colunas`,
      { setup: 'import pandas as pd\ndf = pd.DataFrame({"id_pedido": ["BR-1", "BR-2"], "data": pd.to_datetime(["2025-01-02", "2025-01-03"]), "vendas": [10.5, 20.0], "quantidade": [1, 2], "tem_desconto": [True, False]})', setupNote: 'Já carregados: `df` (id_pedido, data, vendas, quantidade, tem_desconto) e `pd`.', packages: ['pandas'] }),
  ],
};

const LINHAGEM = r`resposta = {"data": {"databaseTables": [{"name": "pedidos", "columns": [
    {"name": "vl_venda", "downstreamWorkbooks": [{"name": "Painel Executivo", "projectName": "Vendas"}, {"name": "Comissões", "projectName": "RH"}]},
    {"name": "dt_pedido", "downstreamWorkbooks": [{"name": "Painel Executivo", "projectName": "Vendas"}]},
    {"name": "cd_cliente", "downstreamWorkbooks": []}
]}]}}
`;

const L_META = {
  id: 'tb-5-4', title: 'Metadata API (GraphQL): linhagem e análise de impacto',
  steps: [
    theory('Perguntando a linhagem por código', `
A **Metadata API** expõe o grafo do **Tableau Catalog** em **GraphQL**: bancos, tabelas, colunas, fontes publicadas e incorporadas, campos calculados, pastas de trabalho, planilhas, painéis e **quem depende de quem**. Endpoint: \`/api/metadata/graphql\` (com o token de sessão da REST API); há um explorador interativo (GraphiQL) em \`/metadata/graphiql\`.

GraphQL pede **exatamente os campos** que você quer, numa estrutura aninhada:
~~~graphql
query impacto {
  databaseTables(filter: {name: "pedidos"}) {
    name
    columns {
      name
      downstreamWorkbooks { name projectName }
      downstreamFields { name }
    }
  }
}
~~~
Casos de uso:
- **análise de impacto** antes de renomear/apagar uma coluna no Snowflake/BigQuery/Redshift/Databricks: quais painéis e cálculos quebram?
- **governança automatizada**: listar campos calculados sem descrição, fontes não certificadas usadas em painéis executivos, conteúdo que usa tabelas obsoletas
- **documentação viva**: gerar o dicionário de dados a partir dos metadados

A resposta é JSON (\`{"data": {...}}\`), que você processa em Python.
`),
    quiz('Que linguagem de consulta a Metadata API usa?', ['GraphQL', 'SQL', 'REST com XML', 'DAX'], 0),
    quiz('Antes de remover a coluna "vl_venda" do data warehouse, o que consultar?', ['downstreamWorkbooks/downstreamFields da coluna na Metadata API', 'O Gravador de desempenho', 'O painel Análise', 'O Tableau Public'], 0),
    py('A partir da `resposta` da Metadata API (já carregada), monte o dicionário `impacto` com, para cada coluna da tabela "pedidos", a **lista ordenada** de nomes das pastas de trabalho afetadas.',
      r`impacto = {}
for tabela in resposta["data"]["databaseTables"]:
    for coluna in tabela["columns"]:
        impacto[coluna["name"]] = sorted(w["name"] for w in coluna["downstreamWorkbooks"])`,
      r`assert impacto == {"vl_venda": ["Comissões", "Painel Executivo"], "dt_pedido": ["Painel Executivo"], "cd_cliente": []}`,
      { setup: LINHAGEM, setupNote: 'Já carregado: `resposta`, o JSON devolvido pela Metadata API para a tabela "pedidos".', packages: [] }),
    py('Liste em `seguras` (ordenada) as colunas que podem ser removidas **sem quebrar nenhuma** pasta de trabalho.',
      r`seguras = sorted(c["name"] for t in resposta["data"]["databaseTables"] for c in t["columns"] if not c["downstreamWorkbooks"])`,
      r`assert seguras == ["cd_cliente"]`,
      { setup: LINHAGEM, setupNote: 'Já carregado: `resposta`.', packages: [] }),
  ],
};

const L_EMBED = {
  id: 'tb-5-5', title: 'Embedding API v3 e Connected Apps',
  steps: [
    theory('Painéis dentro do seu produto', `
A **Embedding API v3** incorpora visualizações em aplicações web com **web components**:
~~~html
<script type="module" src="https://tableau.empresa.com/javascripts/api/tableau.embedding.3.latest.min.js"></script>

<tableau-viz id="painel"
  src="https://tableau.empresa.com/views/Vendas/Executivo"
  token="eyJhbGciOiJIUzI1NiIs..."
  toolbar="hidden" hide-tabs>
  <viz-filter field="Região" value="Sul"></viz-filter>
</tableau-viz>
~~~
Comunicação **bidirecional** em JavaScript:
~~~js
const viz = document.getElementById("painel");
viz.addEventListener("firstinteractive", async () => {
  const sheet = viz.workbook.activeSheet;
  await sheet.applyFilterAsync("Categoria", ["Tecnologia"], "replace");   // site → painel
});
viz.addEventListener("markselectionchanged", async (e) => {                   // painel → site
  const marcas = await e.detail.getMarksAsync();
  console.log(marcas.data[0].data);
});
~~~
Também há \`<tableau-authoring-viz>\` (edição embutida) e \`<tableau-pulse>\` (métricas do Pulse).

**Connected Apps** (SSO sem tela de login): o seu servidor web gera um **JWT** assinado com o segredo do app conectado (confiança direta) ou via um IdP (OAuth 2.0). Declarações (*claims*) principais:
| claim | valor |
|---|---|
| \`iss\` | o *client ID* do app conectado |
| \`sub\` | o usuário do Tableau que verá o painel |
| \`aud\` | \`"tableau"\` |
| \`exp\` | expiração: **no máximo 10 minutos** à frente |
| \`jti\` | identificador único do token |
| \`scp\` | escopos: \`["tableau:views:embed"]\` para \`<tableau-viz>\`; \`tableau:views:embed_authoring\` para edição; \`tableau:insights:embed\` para Pulse |
| atributos de usuário (opcional) | valores para RLS no painel |

O cabeçalho do JWT leva \`kid\` (ID do segredo) e \`iss\`. Em Python, o \`jti\` costuma ser \`str(uuid.uuid4())\` e a assinatura é feita com a biblioteca PyJWT (\`jwt.encode(claims, segredo, algorithm="HS256", headers={...})\`). Gere **um token por usuário e por acesso**, no servidor (nunca exponha o segredo no navegador).
`),
    quiz('Qual escopo um JWT precisa para incorporar uma visualização com <tableau-viz>?', ['tableau:views:embed', 'tableau:insights:embed', 'tableau:admin', 'views:read'], 0),
    quiz('Onde o JWT do Connected App deve ser gerado?', ['No servidor da sua aplicação, com o segredo guardado lá', 'No navegador do usuário', 'No Tableau Public', 'No .twbx'], 0),
    fill('Complete o evento que avisa que o usuário selecionou marcas no painel embutido.', 'viz.addEventListener("___", handler)', [['markselectionchanged']]),
    py('Monte `claims`, o dicionário de declarações de um JWT de Connected App (confiança direta) para o usuário `usuario`, com `iss` = `CLIENT_ID`, `aud` = "tableau", `jti` = `str(uuid.uuid4())`, `exp` = `agora + 5 * 60` e `scp` = ["tableau:views:embed"]. Depois escreva `valido(c, agora)` que confere aud, escopo de embed e expiração entre 1 segundo e 10 minutos no futuro.',
      r`claims = {
    "iss": CLIENT_ID,
    "sub": usuario,
    "aud": "tableau",
    "exp": agora + 5 * 60,
    "jti": str(uuid.uuid4()),
    "scp": ["tableau:views:embed"],
}

def valido(c, agora):
    return c["aud"] == "tableau" and "tableau:views:embed" in c["scp"] and 0 < c["exp"] - agora <= 600`,
      r`assert claims["sub"] == usuario and claims["iss"] == CLIENT_ID and len(claims["jti"]) == 36
assert valido(claims, agora)
assert not valido({**claims, "exp": agora + 3600}, agora)
assert not valido({**claims, "scp": ["tableau:insights:embed"]}, agora)`,
      { setup: 'import uuid\nCLIENT_ID = "4f1c9e2a-connected-app"\nusuario = "ana.souza@empresa.com"\nagora = 1767225600', setupNote: 'Já carregados: `uuid`, `CLIENT_ID`, `usuario` e `agora` (horário atual em segundos, padrão Unix).', packages: [] }),
  ],
};

const TWB = r`twb = """<?xml version='1.0' encoding='utf-8' ?>
<workbook version='18.1'>
  <datasources>
    <datasource caption='Pedidos' name='federated.1'>
      <column caption='Margem' datatype='real' name='[Calculation_1]' role='measure'>
        <calculation class='tableau' formula='SUM([Lucro]) / SUM([Vendas])' />
      </column>
      <column caption='Ticket médio' datatype='real' name='[Calculation_2]' role='measure'>
        <calculation class='tableau' formula='SUM([Vendas]) / COUNTD([ID do Pedido])' />
      </column>
      <column caption='Faixa de lucro' datatype='string' name='[Calculation_3]' role='dimension'>
        <calculation class='tableau' formula='IF [Lucro] &lt; 0 THEN "Prejuízo" ELSE "Lucro" END' />
      </column>
      <column datatype='real' name='[Vendas]' role='measure' />
    </datasource>
  </datasources>
</workbook>"""
`;

const L_EXTDOC = {
  id: 'tb-5-6', title: 'Extensions API, webhooks e Document API',
  steps: [
    theory('Estendendo e manipulando o Tableau', `
**Extensions API** (HTML/CSS/JavaScript):
- **extensões de painel**: uma página web dentro do painel, que lê dados das planilhas, ouve filtros e seleções e pode **escrever** em sistemas externos (*write-back* de comentários, aprovação de metas, exportação formatada para Excel)
- **Viz Extensions**: novos tipos de marca (Nível 4)
- empacotadas num manifesto **.trex** (XML com nome, URL da página, permissões); no Cloud/Server, o administrador controla a **lista de permissões** de extensões e se podem acessar dados completos
~~~js
await tableau.extensions.initializeAsync();
const planilha = tableau.extensions.dashboardContent.dashboard.worksheets[0];
const dados = await planilha.getSummaryDataAsync();
~~~

**Webhooks**: o Cloud/Server envia um **POST HTTP** para uma URL sua quando algo acontece (extração atualizada ou com falha, pasta de trabalho criada/atualizada/excluída, fonte publicada...). Integração orientada a eventos: avisar no Slack quando uma extração falhar, disparar testes quando um painel for publicado.

**Document API** (Python, \`tableaudocumentapi\`): lê e altera o **XML** dos arquivos .twb/.tds **sem abrir o Tableau**: trocar servidor/banco de conexões em massa (migração de Dev para Prod), listar campos e fórmulas. Como o .twb é XML, você também pode analisá-lo direto com \`xml.etree.ElementTree\`:
~~~python
import xml.etree.ElementTree as ET
raiz = ET.fromstring(conteudo_twb)
for col in raiz.iter("column"):
    calc = col.find("calculation")
    if calc is not None:
        print(col.get("caption"), calc.get("formula"))
~~~
\`iter\` percorre todos os elementos com aquela etiqueta; \`find\` pega o primeiro filho; \`get\` lê um atributo.
`),
    quiz('Para mandar um aviso ao Slack sempre que uma atualização de extração falhar, use...', ['Um webhook do Cloud/Server apontando para um serviço seu', 'A Document API', 'Uma Viz Extension', 'Um parâmetro dinâmico'], 0),
    quiz('O que é um arquivo .trex?', ['O manifesto de uma extensão (painel ou visualização)', 'Uma extração', 'Uma pasta de trabalho empacotada', 'Um fluxo do Prep'], 0),
    py('Analise o XML de uma pasta de trabalho (`twb`, já carregado) e monte o dicionário `calculos` com {caption: fórmula} de todos os **campos calculados**.',
      r`import xml.etree.ElementTree as ET
raiz = ET.fromstring(twb)
calculos = {}
for col in raiz.iter("column"):
    calc = col.find("calculation")
    if calc is not None:
        calculos[col.get("caption")] = calc.get("formula")`,
      r`assert calculos == {"Margem": "SUM([Lucro]) / SUM([Vendas])", "Ticket médio": "SUM([Vendas]) / COUNTD([ID do Pedido])", "Faixa de lucro": 'IF [Lucro] < 0 THEN "Prejuízo" ELSE "Lucro" END'}`,
      { setup: TWB, setupNote: 'Já carregado: `twb`, o conteúdo XML de uma pasta de trabalho .twb.', packages: [] }),
    py('**Análise de impacto local**: com `calculos` pronto, liste em `usam_vendas` (ordenada) os campos calculados cuja fórmula usa o campo `[Vendas]`.',
      r`usam_vendas = sorted(nome for nome, formula in calculos.items() if "[Vendas]" in formula)`,
      r`assert usam_vendas == ["Margem", "Ticket médio"]`,
      { setup: TWB + r`
import xml.etree.ElementTree as ET
calculos = {c.get("caption"): c.find("calculation").get("formula") for c in ET.fromstring(twb).iter("column") if c.find("calculation") is not None}
`, setupNote: 'Já carregados: `twb` e `calculos` ({caption: fórmula}).', packages: [] }),
  ],
};

const SNAP = r`import pandas as pd
antes = pd.DataFrame({"regiao": ["Centro-Oeste", "Nordeste", "Norte", "Sudeste", "Sul"], "vendas": [912000.10, 1650000.55, 590000.00, 3720000.40, 1528000.95]})
depois = pd.DataFrame({"regiao": ["Centro-Oeste", "Nordeste", "Norte", "Sudeste", "Sul"], "vendas": [912000.10, 1650000.55, 612400.00, 3720000.40, 1528000.95]})
`;

const L_CICD = {
  id: 'tb-5-7', title: 'AnalyticsOps: versionamento, ambientes e testes',
  steps: [
    theory('Engenharia de software aplicada a BI', `
Painéis são **software**: mudam, quebram e precisam de processo.

**Versionamento**: salve **.twb** e **.tds** (XML, sem dados) no **Git**; .twbx é binário (zip) e não mostra diferenças. No servidor, **Revision History** guarda versões e as **notas de revisão** explicam cada publicação (trilha de auditoria).

**Ambientes Dev → QA → Prod**: projetos ou sites separados (ou servidores), com fontes apontando para bancos de cada ambiente. **Content Migration Tool** (ferramenta oficial) migra conteúdo entre sites/servidores **trocando conexões** e aplicando transformações em lote; alternativa por código: TSC (baixar de Dev, ajustar com a Document API, publicar em Prod).

**Pipeline de CI/CD** típico (GitHub Actions, GitLab CI, Azure DevOps):
1. pull request com o .twb/.tds alterado → revisão por pares (checklist: nomes, formatos, performance, RLS)
2. **testes automáticos**:
   - **de dados**: os números do painel batem com uma consulta de referência ao warehouse (dentro de uma tolerância)?
   - **de regressão**: os KPIs do painel novo comparados com a versão anterior; diferenças só onde se espera
   - **visual**: capturas de tela comparadas (a REST API exporta imagens/PDF de views)
   - **de desempenho**: tempo de carregamento abaixo de um limite
3. publicação automática em QA → aprovação → Prod via TSC

**Camada semântica como código**: fontes publicadas certificadas (e, no Tableau Next, o Tableau Semantics) versionadas e revisadas como qualquer código.
`),
    quiz('Por que versionar .twb em vez de .twbx no Git?', ['O .twb é XML (diferenças legíveis e sem dados); o .twbx é um pacote binário com dados', 'O .twbx é proibido no Git', 'O .twb é mais rápido no Tableau', 'Não há diferença'], 0),
    quiz('Qual ferramenta oficial migra conteúdo entre ambientes trocando as conexões em lote?', ['Content Migration Tool', 'Tableau Bridge', 'TabPy', 'Tableau Reader'], 0),
    py('**Teste de regressão**: compare os KPIs `antes` e `depois` (colunas regiao, vendas) e liste em `divergentes` (ordenada) as regiões cuja diferença **relativa** passa de 0,1%.',
      r`m = antes.merge(depois, on="regiao", suffixes=("_antes", "_depois"))
rel = (m["vendas_depois"] - m["vendas_antes"]).abs() / m["vendas_antes"].abs()
divergentes = sorted(m.loc[rel > 0.001, "regiao"])`,
      r`assert divergentes == ["Norte"], divergentes`,
      { setup: SNAP, setupNote: 'Já carregados: `antes` e `depois` (vendas por região na versão publicada e na nova versão do painel) e `pd`.', packages: ['pandas'] }),
    order('Ordene um pipeline de publicação de painel:', ['abrir pull request com o .twb', 'revisão por pares com checklist', 'testes de dados e de regressão', 'publicar em QA e aprovar', 'publicar em Prod com nota de revisão']),
  ],
};

const TELEMETRIA = r`import pandas as pd
acessos = pd.DataFrame({
    "view": ["Executivo", "Executivo", "Executivo", "Vendas Diárias", "Vendas Diárias", "Estoque", "Estoque", "Estoque", "Estoque"],
    "usuario": ["ana", "bruno", "ana", "carla", "ana", "bruno", "bruno", "carla", "diego"],
    "segundos": [3.2, 4.1, 2.9, 12.5, 14.1, 1.8, 2.2, 2.0, 1.9],
})
extracoes = pd.DataFrame({
    "fonte": ["Pedidos", "Pedidos", "Pedidos", "Estoque", "Estoque", "Metas"],
    "status": ["sucesso", "falha", "sucesso", "sucesso", "sucesso", "falha"],
})
conteudo = pd.DataFrame({"workbook": ["Executivo", "Vendas Diárias", "Estoque", "Piloto 2023", "Teste Ana"], "ultimo_acesso_dias": [1, 2, 0, 410, 220]})
`;

const L_MONITOR = {
  id: 'tb-5-8', title: 'Monitoramento do ambiente: repositório e Admin Insights',
  steps: [
    theory('Telemetria do Tableau', `
**Tableau Server**: o **repositório PostgreSQL** guarda o histórico de uso. Habilite o usuário de leitura (\`tsm data-access repository-access enable --repository-username readonly\`) e conecte o próprio Tableau (porta 8060, banco \`workgroup\`). Tabelas e views úteis:
| tabela/view | o que tem |
|---|---|
| \`http_requests\` | cada requisição: ação, usuário, início/fim (tempo de carregamento das views) |
| \`views_stats\`, \`historical_events\` | acessos por view, eventos (publicações, logins) |
| \`background_jobs\` | tarefas do Backgrounder: tipo, status (sucesso/falha), duração |
| \`_users\`, \`_workbooks\`, \`_views\`, \`_datasources\` | views "limpas" com o inventário |

Também há as **pastas de trabalho de administração** prontas (*Status do servidor*, *Visualizações de administração*) e a ferramenta **Resource Monitoring Tool** (Advanced Management).

**Tableau Cloud**: o projeto **Admin Insights** traz fontes publicadas (TS Events, TS Users, Job Performance, Viz Load Times) e um painel inicial; e o **Activity Log** (Advanced Management) envia eventos detalhados.

**Painel executivo de telemetria** (o que um arquiteto acompanha):
- tempo médio e p90 de carregamento por view (alvo < 5 s)
- taxa de falha das atualizações de extração por fonte
- usuários ativos (diários/mensais) e adoção por área
- **conteúdo órfão**: pastas de trabalho sem acesso há meses (arquivar)
- licenças ociosas (Nível 5, REST)

Em pandas, uma coluna booleana criada na hora com \`df.assign(falhou=df["status"] == "falha")\` e agregada com \`groupby(...).mean()\` dá a **taxa** de falhas (a média de verdadeiro/falso é a fração de verdadeiros).
`),
    quiz('No Tableau Server, onde estão os tempos de carregamento das views?', ['No repositório PostgreSQL (ex.: tabela http_requests)', 'No .twbx', 'No Hyper de cada extração', 'No Tableau Public'], 0),
    quiz('No Tableau Cloud, qual é a fonte oficial de telemetria?', ['O projeto Admin Insights (e o Activity Log)', 'O repositório PostgreSQL acessado direto', 'O TabPy', 'O Bridge'], 0),
    py('Com `acessos` (view, usuario, segundos), monte `tempo_medio`: a Series do tempo médio de carregamento por view, e `lentas` (lista ordenada) com as views cuja média passa de 5 segundos.',
      r`tempo_medio = acessos.groupby("view")["segundos"].mean()
lentas = sorted(tempo_medio[tempo_medio > 5].index)`,
      r`assert lentas == ["Vendas Diárias"] and abs(tempo_medio["Executivo"] - 10.2 / 3) < 1e-9`,
      { setup: TELEMETRIA, setupNote: 'Já carregados: `acessos` (view, usuario, segundos), `extracoes` (fonte, status), `conteudo` (workbook, ultimo_acesso_dias) e `pd`.', packages: ['pandas'] }),
    py('Calcule `taxa_falha`: a Series com a fração de atualizações com status "falha" por **fonte**, e `orfaos` (lista ordenada) com as pastas de trabalho sem acesso há **mais de 180 dias**.',
      r`taxa_falha = extracoes.assign(falhou=extracoes["status"] == "falha").groupby("fonte")["falhou"].mean()
orfaos = sorted(conteudo.loc[conteudo["ultimo_acesso_dias"] > 180, "workbook"])`,
      r`assert abs(taxa_falha["Pedidos"] - 1 / 3) < 1e-9 and taxa_falha["Metas"] == 1 and taxa_falha["Estoque"] == 0
assert orfaos == ["Piloto 2023", "Teste Ana"]`,
      { setup: TELEMETRIA, setupNote: 'Já carregados: `acessos`, `extracoes` (fonte, status), `conteudo` (workbook, ultimo_acesso_dias) e `pd`.', packages: ['pandas'] }),
  ],
};

const L_IA = {
  id: 'tb-5-9', title: 'A nova era: Pulse, Tableau Agent, Tableau Next e camada semântica',
  steps: [
    theory('Métricas governadas e insights no fluxo de trabalho', `
**Tableau Pulse** (Tableau Cloud): em vez de abrir painéis, o usuário **segue métricas** e recebe **insights** no fluxo de trabalho (Slack, Teams, e-mail, app móvel).
- a **definição de métrica** é governada e reutilizável: medida (ex.: \`SUM([Vendas])\`), **dimensão de tempo**, filtros, dimensões para análise (Região, Categoria), **favorabilidade** (subir é bom ou ruim?), metas
- a partir da definição, cada pessoa cria **métricas** com os próprios filtros (vendas do Sul, vendas de Tecnologia)
- o motor de insights detecta automaticamente: **mudança no período** (vs. período anterior/ano anterior), **variação incomum** (fora do esperado), **contribuidores** (quais regiões explicam a variação), **correlações** entre métricas, **tendências** e metas em risco
- textos em linguagem natural gerados por IA, com os números verificáveis
- incorporável (\`<tableau-pulse>\`) e com linhagem no Catalog

**Tableau Agent** (antes "Einstein Copilot for Tableau"): assistente de IA generativa (com a *Einstein Trust Layer*: dados não usados para treinar o modelo, mascaramento, auditoria):
- **na criação web**: "mostre as vendas por mês e região" gera a visualização; explica e cria campos calculados
- **no Prep**: escreve cálculos de limpeza a partir de descrições
- **no Catalog**: gera descrições de fontes, pastas de trabalho e tabelas
- **no Pulse**: perguntas e respostas sobre métricas (com **calibração de Q&A**: exemplos de perguntas e respostas verificadas para melhorar a precisão)
- regra de ouro: **valide** o que a IA gera (o cálculo faz o que você pediu? os números batem?)
`),
    theory('Tableau Next, Data 360 e analytics agêntico', `
**Tableau Next** é a plataforma **API-first** e **agêntica** construída sobre o **Data 360** (antigo *Salesforce Data Cloud*) e integrada ao **Agentforce**:
- **camada de dados** do Data 360: objetos **DLO** (*Data Lake Objects*: dados ingeridos), **DMO** (*Data Model Objects*: o modelo harmonizado) e **CIO** (*Calculated Insight Objects*: métricas calculadas), com conectores, ingestão em lote e streaming, **zero copy** e "traga o seu próprio lakehouse"
- **Tableau Semantics**: camada semântica governada sobre o Data 360, onde se definem **métricas, dimensões, relacionamentos e cálculos** com significado de negócio, reutilizáveis por painéis, métricas e **agentes**; versionável como código (fluxos de desenvolvedor, extensão DX)
- **habilidades de analytics do Agentforce**: agentes prontos como **Data Pro** (prepara dados e modela semântica), **Concierge** (responde perguntas de negócio em linguagem natural com base na camada semântica) e **Inspector** (monitora métricas e alerta sobre mudanças)
- **fluxos agênticos** e **MCP** (*Model Context Protocol*): expor dados e métricas governados a agentes de IA (inclusive externos) e criar conteúdo por agentes, com a segurança e a semântica do Tableau

Por que a **camada semântica** é central: um agente só responde certo se "receita", "cliente ativo" e "churn" tiverem **uma definição única e auditável**. As **perguntas verificadas** (*verified questions*) calibram o agente com exemplos de pergunta → consulta → resposta corretos.

Como os produtos e nomes mudam rápido (Einstein Copilot virou Tableau Agent; Data Cloud virou Data 360), acompanhe as notas de versão oficiais e o Trailhead.
`),
    quiz('No Tableau Pulse, o que é definido uma vez e reaproveitado com filtros diferentes por cada pessoa?', ['A definição de métrica (medida, tempo, dimensões, favorabilidade)', 'O painel', 'A extração', 'O conjunto'], 0),
    quiz('Qual agente do Agentforce para analytics monitora métricas e avisa sobre mudanças?', ['Inspector', 'Data Pro', 'Concierge', 'Bridge'], 0),
    quiz('Por que a camada semântica é essencial para agentes de IA responderem com precisão?', ['Garante uma definição única e auditável de cada métrica e dimensão que o agente usa', 'Deixa o modelo mais rápido', 'Substitui a necessidade de dados', 'Evita licenças'], 0),
    quiz('O que são as "verified questions"?', ['Exemplos de pergunta e resposta verificados que calibram o agente conversacional', 'Questões da certificação', 'Filtros de RLS', 'Testes de regressão visual'], 0),
    tab('Defina, como campo calculado, a **medida da métrica governada** "Margem" que o Pulse vai acompanhar por **Ano** (a mesma fórmula para todos).', 'SUM([Lucro]) / SUM([Vendas])', { dims: ['Ano'], campos: { Ano: 'YEAR([Data do Pedido])' }, nome: 'Margem' }),
    py('Simule o **insight de variação do período** do Pulse: com `atual` e `anterior` (valores da métrica), calcule `variacao` (fração) e escreva a frase `texto` no formato "Vendas subiram 12,5% vs. o período anterior" (ou "caíram"), com uma casa decimal e vírgula como separador decimal.',
      r`variacao = (atual - anterior) / abs(anterior)
verbo = "subiram" if variacao >= 0 else "caíram"
pct = f"{abs(variacao) * 100:.1f}".replace(".", ",")
texto = f"Vendas {verbo} {pct}% vs. o período anterior"`,
      r`assert abs(variacao - 0.125) < 1e-12
assert texto == "Vendas subiram 12,5% vs. o período anterior", texto`,
      { setup: 'atual = 2_250_000\nanterior = 2_000_000', setupNote: 'Já carregados: `atual` e `anterior` (valor da métrica de vendas no período atual e no anterior).', packages: [] }),
  ],
};

const L_COE = {
  id: 'tb-5-10', title: 'Estratégia: Tableau Blueprint, CoE e cultura de dados',
  steps: [
    theory('Tableau Blueprint', `
O **Tableau Blueprint** é a metodologia oficial para adotar analytics em escala. Fundamentos: **patrocínio executivo**, **visão de dados**, **equipe do projeto**. Três capacidades:

| capacidade | o que inclui |
|---|---|
| **Agilidade** | implantação e operação do ambiente: arquitetura, monitoramento, manutenção, capacidade, segurança, atualizações |
| **Proficiência** | capacitação: trilhas por papel (Creator, Explorer, Viewer), padrões visuais, **boas práticas**, revisão de conteúdo, medição do uso |
| **Comunidade** | engajamento: comunidade interna (fórum, campeões, *user groups*), eventos (*Viz Games*, *Data Days*), comunicação de casos de sucesso |

E a **governança** em três frentes: **dados** (fontes certificadas, qualidade, segurança, metadados), **conteúdo** (projetos, validação, promoção Dev→Prod, certificação, arquivamento de órfãos) e **ambiente**.

**Modelos de governança:**
- **centralizado**: um time de BI cria tudo (consistente, mas vira gargalo)
- **delegado**: áreas criam sobre fontes certificadas pelo time central
- **autogovernado/federado**: áreas maduras governam seu conteúdo com padrões comuns
A maioria das empresas evolui do centralizado para o federado conforme a maturidade.

**Centro de Excelência (CoE)**: equipe que define padrões, certifica fontes, apoia e capacita as áreas, mede adoção e conduz a comunidade. Papéis: líder do CoE, arquiteto/admin, engenheiros de dados, especialistas de visualização, *champions* nas áreas.

**FinOps**: gestão de licenças (ociosidade, papéis certos), capacidade do Cloud (créditos/uso de recursos), custos de extrações e de consultas no warehouse.

**Métricas de adoção**: usuários ativos/licenciados, views por usuário, conteúdo certificado em uso, tempo até o primeiro painel, satisfação. Fonte: repositório/Admin Insights.
`),
    quiz('Quais são as três capacidades do Tableau Blueprint?', ['Agilidade, Proficiência e Comunidade', 'Dados, Conteúdo e Ambiente', 'Creator, Explorer e Viewer', 'Leigo, Básico e Master'], 0),
    quiz('No modelo "delegado", quem cria os painéis?', ['As áreas de negócio, sobre fontes certificadas pelo time central', 'Só o time central', 'Ninguém, só agentes de IA', 'Fornecedores externos'], 0),
    quiz('Qual indicador mostra melhor se o investimento em licenças está sendo aproveitado?', ['Usuários ativos ÷ usuários licenciados', 'Número de extrações', 'Tamanho dos arquivos .hyper', 'Número de projetos'], 0),
    order('Ordene a implantação de um CoE:', ['garantir patrocínio executivo e visão de dados', 'definir padrões e governança de dados e conteúdo', 'certificar as primeiras fontes de dados', 'capacitar campeões nas áreas', 'medir adoção e evoluir o modelo']),
  ],
};

const L_CAPSTONE = {
  id: 'tb-5-11', title: 'Capstone Enterprise: plano de implantação Tableau Blueprint',
  steps: [
    theory('O entregável final', `
Documento e protótipo de **arquitetura e implantação** para uma empresa de varejo com 2.000 usuários:

1. **Arquitetura**: Cloud ou Server (justificar), topologia, HA/DR, autenticação (SAML/OIDC + SCIM), Bridge para fontes on-premises
2. **Modelo de dados**: fontes publicadas certificadas, conexões virtuais com políticas de dados, camada semântica (Pulse/Tableau Semantics)
3. **Matriz de governança**: quem certifica, quem publica onde, ciclo de vida do conteúdo (Dev → QA → Prod → arquivamento)
4. **Estratégia de RLS**: tabela de direitos, \`USERNAME()\`/\`ISMEMBEROF()\`, testes "visualizar como"
5. **Pipeline CI/CD**: Git com .twb/.tds, testes de dados e regressão, publicação via TSC/Content Migration Tool, notas de revisão
6. **Automação**: refresh disparado pelo orquestrador, auditoria mensal de licenças, alertas de falha via webhooks
7. **Monitoramento**: painel de telemetria (tempo de carga, falhas, adoção, órfãos)
8. **Checklist de revisão de painel**: desempenho (marcas, filtros, cálculos), acessibilidade, consistência visual, RLS, documentação
9. **Plano de capacitação**: trilhas por papel, campeões, comunidade (Blueprint)
10. **IA**: métricas no Pulse, perguntas verificadas, política de uso do Tableau Agent

Os exercícios fecham peças do plano.
`),
    py('Crie a função `revisar(painel)` do **checklist automático**: recebe um dicionário com `marcas`, `filtros_relevantes`, `tem_rls`, `fonte_certificada` e `segundos_carga` e devolve a **lista de problemas** (textos, na ordem): "muitas marcas" (> 10000), "filtros relevantes demais" (> 3), "sem RLS", "fonte não certificada", "lento" (> 5 s).',
      r`def revisar(painel):
    problemas = []
    if painel["marcas"] > 10000:
        problemas.append("muitas marcas")
    if painel["filtros_relevantes"] > 3:
        problemas.append("filtros relevantes demais")
    if not painel["tem_rls"]:
        problemas.append("sem RLS")
    if not painel["fonte_certificada"]:
        problemas.append("fonte não certificada")
    if painel["segundos_carga"] > 5:
        problemas.append("lento")
    return problemas`,
      r`assert revisar({"marcas": 500, "filtros_relevantes": 1, "tem_rls": True, "fonte_certificada": True, "segundos_carga": 2}) == []
assert revisar({"marcas": 50000, "filtros_relevantes": 6, "tem_rls": False, "fonte_certificada": False, "segundos_carga": 9}) == ["muitas marcas", "filtros relevantes demais", "sem RLS", "fonte não certificada", "lento"]`),
    tab('**RLS do capstone**: com o campo **[Gerente Regional]** e o usuário **ana.souza** (grupo "Gerentes"), escreva o filtro que libera tudo para o grupo **"Diretoria"** e só a própria região para os demais.', 'ISMEMBEROF("Diretoria") OR [Gerente Regional] = USERNAME()', { dims: 'linha', mostrar: ['Região'], campos: { 'Gerente Regional': 'CASE [Região] WHEN "Sul" THEN "marcos.lima" WHEN "Sudeste" THEN "ana.souza" WHEN "Nordeste" THEN "joao.costa" WHEN "Norte" THEN "joao.costa" ELSE "paula.dias" END' }, usuario: { login: 'ana.souza', grupos: ['Gerentes'] }, nome: 'Pode ver' }),
    quiz('Na matriz de governança, quem deve certificar a fonte publicada "Receita"?', ['O dono do dado (time de dados/CoE), após validação contra o sistema de origem', 'Qualquer Creator', 'O agente de IA', 'O usuário Viewer'], 0),
    order('Ordene as fases de implantação do capstone:', ['arquitetura, segurança e autenticação', 'modelo de dados certificado e camada semântica', 'governança, RLS e CI/CD', 'capacitação e comunidade', 'monitoramento e melhoria contínua']),
  ],
};

export const TB_N5 = {
  id: 'tb-u5', level: 5, title: 'Arquitetura enterprise, automação, APIs e analytics agêntico',
  description: 'Server enterprise, REST/TSC, Hyper, Metadata (GraphQL), Embedding v3 com Connected Apps, extensões, CI/CD, telemetria, Pulse, Agent, Tableau Next e Blueprint. Entregável: plano de implantação enterprise',
  lessons: [L_ARQ, L_REST, L_HYPER, L_META, L_EMBED, L_EXTDOC, L_CICD, L_MONITOR, L_IA, L_COE, L_CAPSTONE],
};
