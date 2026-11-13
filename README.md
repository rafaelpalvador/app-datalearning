# Datum

Aprenda **SQL**, **Python** e **estatística para análise de dados** com teoria curta, muita prática e correção na hora. Gamificado (XP, níveis de carreira, missões e conquistas), com SQLite e Python (pandas, NumPy, matplotlib) embutidos, funcionando **offline**.

| Plataforma | Formato | Instalação |
|---|---|---|
| 📱 Android (testado para Honor 400 Pro / MagicOS 9) | `.apk` | [docs/INSTALACAO.md](docs/INSTALACAO.md#-android--honor-400-pro-magicos-9--android-15) |
| 🪟 Windows 11 | instalador `.exe` + versão portátil | [docs/INSTALACAO.md](docs/INSTALACAO.md#-windows-11) |
| 🐧 Linux | `.AppImage` + `.deb` | [docs/INSTALACAO.md](docs/INSTALACAO.md#-linux) |
| 🌐 Navegador | site estático | `npm start` |

Os apps são compilados automaticamente pelo **GitHub Actions** a cada push (aba *Actions* → *Artifacts*) e publicados em *Releases* (versão do `package.json`), de onde o Obtainium baixa as atualizações.

## Conteúdo

- **SQL do Zero ao Avançado**: 4 níveis, 10 unidades, 26 lições (SELECT → window functions, CTE recursiva, índices, coorte, Pareto, gaps & islands, calendários, JSON e UPSERT)
- **Python para Análise de Dados**: 4 níveis, 10 unidades, 24 lições (Python, NumPy, pandas, limpeza, séries temporais, visualização, APIs, scraping, SQL + Python, desempenho, dados grandes e código de produção)
- **Estatística para Dados**: 4 níveis, 15 unidades, 35 lições, do básico ao especialista: descritiva, probabilidade, intervalos, testes A/B, regressão, qui-quadrado e ANOVA, séries temporais, não paramétricos, comparações múltiplas, regressão logística, poder e CUPED, inferência bayesiana, máxima verossimilhança, Monte Carlo, inferência causal (DiD, escore de propensão), testes sequenciais, bandits e análise de sobrevivência
- **Entrevistas**: 68 problemas cronometrados, separados em **SQL (40)** e **Python (28)** e em 4 níveis (Júnior, Pleno, Sênior, Especialista), cada um com a explicação de como pensar e uma solução de referência
- **Dados para estatística**: além da loja, tabelas grandes geradas de forma determinística: teste A/B com 2.000 usuários, 1.098 dias de vendas em 3 lojas (com sazonalidade e outliers) e 420 avaliações; os mesmos dados ficam disponíveis no SQL e como DataFrames no Python
- **Todas as trilhas em 4 níveis**: Básico, Intermediário, Avançado e Especialista
- **473 passos**: 110 cards de teoria e 363 exercícios de prática (134 questões, 110 de SQL, 106 de Python, montar blocos e completar lacunas), todos validados automaticamente

## Dinâmica

- **Teoria e prática em toda lição**: cada lição mostra quantos cards de teoria e quantos exercícios tem
- **Trilha com desbloqueio** e **checkpoint por unidade** (acerte 80% e pule a unidade)
- **Revisão espaçada (SM-2)** e **domínio por unidade**
- **Explicação do erro**: o corretor diz *por quê* errou (duplicação por JOIN, filtro faltando, INNER × LEFT, NULL, arredondamento, ordem) e traduz erros do SQLite/Python
- **Tirar dúvidas**: busca em toda a teoria e nas explicações das entrevistas, e um **tutor de IA** (Claude) que você chama de dentro de qualquer exercício; ele vê o enunciado e o seu código e dá dicas antes de entregar a resposta
- **Gamificação sem punição**: XP, **níveis de carreira** (Estagiário → Head de Dados), estrelas por lição, missões diárias e 25 conquistas. Sem ofensivas, vidas ou gemas
- **Estatísticas do aluno**: XP por semana, acerto por trilha, atividade, teoria estudada e entrevistas resolvidas
- **No celular**: navegação inferior, barra de símbolos acima do teclado, vibração, lembrete diário e botão voltar do Android
- **Backup/sincronização** entre celular e PC por código de exportação

### Tutor de IA: conecte a sua IA

Em **Perfil → Tutor de IA**, escolha o provedor, cole a sua chave e toque em **Usar esta IA** (o app testa a conexão). O botão **Buscar modelos** lista os modelos disponíveis na sua conta.

| Provedor | Chave | Observação |
|---|---|---|
| **Gemini** (Google) | aistudio.google.com/apikey | tem cota gratuita |
| **ChatGPT** (OpenAI) | platform.openai.com/api-keys | |
| **Claude** (Anthropic) | console.anthropic.com | SDK oficial, Claude Opus 5.5 por padrão, com fallback automático do servidor |
| **OpenRouter** | openrouter.ai/keys | uma chave para centenas de modelos |
| **Groq** | console.groq.com/keys | modelos abertos, muito rápido, tem cota gratuita |
| **Mistral** | console.mistral.ai | |
| **DeepSeek** | platform.deepseek.com | |
| **Ollama** | sem chave | IA local no computador (`OLLAMA_ORIGINS=* ollama serve`) |
| **Outro** | opcional | qualquer API compatível com a OpenAI (LM Studio, vLLM, Together...) |

As chaves ficam salvas só no aparelho, são enviadas apenas ao provedor escolhido e não entram no backup. O resto do app funciona sem IA e sem internet.

## Como funciona

| Recurso | Como |
|---|---|
| SQL de verdade | SQLite compilado para WebAssembly ([sql.js](https://github.com/sql-js/sql.js)), incluído em `vendor/` (funciona offline) |
| Python de verdade | [Pyodide](https://pyodide.org) (CPython em WebAssembly) com pandas, NumPy, matplotlib, BeautifulSoup, sqlite3... carregado do CDN na 1ª execução |
| Correção de SQL | executa a query do aluno e a solução num banco novo e compara os resultados (aceita qualquer query equivalente, ignora nomes de colunas; a ordem só importa quando o enunciado pede) |
| Correção de Python | executa setup + código do aluno + testes (`assert`) |
| Gamificação | XP, níveis de carreira, meta diária, estrelas, missões e conquistas |
| Progresso | salvo no aparelho (`localStorage`); backup por código em Perfil |
| Desktop | Electron com protocolo `app://` (`desktop/`), empacotado com electron-builder |
| Android | Capacitor 7 (`android/`), plugins de notificação, vibração, status bar e botão voltar |

Tipos de exercício: **teoria**, **múltipla escolha**, **montar a resposta com blocos**, **completar lacunas**, **escrever SQL**, **escrever Python**.

## Rodando

Qualquer servidor estático serve (módulos ES não abrem via `file://`):

```bash
python3 -m http.server 8080
# ou: npm start
```

Abra http://localhost:8080.

## Validando o conteúdo

```bash
npm install
pip install pandas numpy matplotlib beautifulsoup4
npm run validate
```

O validador garante que: ids são únicos, respostas de quiz existem, **toda solução SQL/Python passa na própria correção** e o **código inicial não passa sozinho**.

## Estrutura

```
index.html
css/styles.css
js/
  app.js                 # rotas, trilha, player, praticar, entrevista, conquistas, perfil
  state.js               # XP, níveis, revisão espaçada, estatísticas, backup
  gamification.js        # missões diárias e conquistas
  tutor.js               # tutor de IA (SDK da Anthropic / Claude da página na demo)
  icons.js               # ícones Lucide (ISC)
  platform.js            # Android/desktop: notificações, vibração, voltar, sons
  markdown.js            # renderizador de teoria + realce de sintaxe
  engines/sql-engine.js  # sql.js + comparação de resultados
  engines/python-engine.js  # Pyodide + testes
  content/
    helpers.js           # theory(), quiz(), order(), fill(), sql(), py()
    datasets.js          # banco da loja DataShop + DataFrame de vendas
    sql-course.js
    python-course.js
    stats-course.js      # trilha de estatística
    interview.js         # entrevistas SQL e Python por nível
desktop/                 # app de desktop (Electron)
android/                 # app Android (Capacitor)
assets/                  # ícones e splash
scripts/                 # validadores, download do Python offline, build web, ícones
.github/workflows/       # build automático dos apps
docs/INSTALACAO.md       # como instalar em cada plataforma
docs/CURRICULO.md        # currículo completo (implementado + planejado)
docs/IDEIAS.md           # ideias para evoluir o app
```

## Criando uma lição

```js
{
  id: 'sql-3-4', title: 'Minha lição',
  steps: [
    theory('Título', `Markdown com **negrito**, \`código\`, tabelas e blocos ~~~sql`),
    quiz('Pergunta?', ['A', 'B', 'C'], 1, 'Explicação'),
    order('Monte a query:', ['SELECT', '*', 'FROM', 'produtos']),
    fill('Complete:', 'SELECT nome ___ clientes;', [['FROM']]),
    sql('Enunciado', 'SELECT ... ;', { ordered: true, variants: [{ prompt: '...', solution: '...' }] }),
    debugSql('🐞 Corrija:', 'SELECT * FROM pedidos WHERE status = cancelado;', "SELECT * FROM pedidos WHERE status = 'cancelado';"),
    py('Enunciado', 'solucao = 1', 'assert solucao == 1', { setup: '...', packages: ['pandas'] }),
  ],
}
```

Depois rode `npm run validate`.

## Python offline

`npm run fetch:pyodide` baixa o Pyodide e extrai só o necessário (~80 MB) em `vendor/pyodide/`. Se a pasta existir, o app usa ela; senão, usa o CDN do jsDelivr. Para apontar para outro lugar, defina antes do `app.js`:

```html
<script>window.DATALINGO_PYODIDE_URL = '/pyodide/';</script>
```
