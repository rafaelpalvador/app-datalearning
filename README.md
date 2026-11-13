# 📊 DataLingo

App estilo Duolingo para aprender **SQL** e **Python para análise de dados**, com lições curtas, gamificação e exercícios que **rodam de verdade** — SQLite e Python (pandas, NumPy, matplotlib...) embutidos, funcionando **offline**.

| Plataforma | Formato | Instalação |
|---|---|---|
| 📱 Android (testado para Honor 400 Pro / MagicOS 9) | `.apk` | [docs/INSTALACAO.md](docs/INSTALACAO.md#-android--honor-400-pro-magicos-9--android-15) |
| 🪟 Windows 11 | instalador `.exe` + versão portátil | [docs/INSTALACAO.md](docs/INSTALACAO.md#-windows-11) |
| 🐧 Linux | `.AppImage` + `.deb` | [docs/INSTALACAO.md](docs/INSTALACAO.md#-linux) |
| 🌐 Navegador | site estático | `npm start` |

Os apps são compilados automaticamente pelo **GitHub Actions** a cada push (aba *Actions* → *Artifacts*) e publicados em *Releases* quando uma tag `v*` é criada.

## Conteúdo

- 🗄️ **SQL do Zero ao Avançado**: 9 unidades, 24 lições (SELECT → window functions, CTE recursiva, índices, coorte, Pareto e funil)
- 🐍 **Python para Análise de Dados**: 9 unidades, 21 lições (Python, NumPy, pandas, limpeza, séries temporais, visualização, APIs, scraping, SQL + Python, estatística)
- 💼 **Modo entrevista**: 16 problemas clássicos de processos seletivos, cronometrados (fácil/médio/difícil)
- **258 passos + 16 problemas**: teoria, quizzes, leitura de código, montar blocos, completar lacunas, "encontre o bug", 82 exercícios de SQL e 51 de Python — todos validados automaticamente

## Dinâmica de aprendizado

- **Trilha com desbloqueio** e **checkpoint por unidade** (acerte 80% e pule a unidade)
- **Revisão espaçada (SM-2)**: cada exercício vira um card que volta na hora certa de ser relembrado
- **Variações automáticas** de exercícios na prática, para não decorar respostas
- **Explicação do erro**: o corretor compara o resultado e diz *por quê* errou (linhas duplicadas por JOIN, filtro faltando, INNER × LEFT JOIN, NULL, arredondamento, ordem...) e traduz erros do SQLite/Python para português
- **Gamificação**: XP, ofensiva, meta diária, vidas, gemas, **missões diárias**, **20 conquistas**, **protetor de ofensiva**, estrelas por lição, força por unidade
- **No celular**: navegação inferior, barra de símbolos acima do teclado, vibração, sons, **lembrete diário** por notificação e botão voltar do Android
- **Backup/sincronização** entre celular e PC por código de exportação

## Como funciona

| Recurso | Como |
|---|---|
| SQL de verdade | SQLite compilado para WebAssembly ([sql.js](https://github.com/sql-js/sql.js)), incluído em `vendor/` (funciona offline) |
| Python de verdade | [Pyodide](https://pyodide.org) (CPython em WebAssembly) com pandas, NumPy, matplotlib, BeautifulSoup, sqlite3... carregado do CDN na 1ª execução |
| Correção de SQL | executa a query do aluno e a solução num banco novo e compara os resultados (aceita qualquer query equivalente, ignora nomes de colunas; a ordem só importa quando o enunciado pede) |
| Correção de Python | executa setup + código do aluno + testes (`assert`) |
| Gamificação | XP, ofensiva (dias seguidos), meta diária, 5 vidas (recarregam 1 a cada 30 min), estrelas por lição, revisão de erros que devolve vidas, prática rápida, histórico de atividade |
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
  state.js               # XP, ofensiva, vidas, gemas, revisão espaçada, backup
  gamification.js        # missões diárias e conquistas
  platform.js            # Android/desktop: notificações, vibração, voltar, sons
  markdown.js            # renderizador de teoria + realce de sintaxe
  engines/sql-engine.js  # sql.js + comparação de resultados
  engines/python-engine.js  # Pyodide + testes
  content/
    helpers.js           # theory(), quiz(), order(), fill(), sql(), py()
    datasets.js          # banco da loja DataShop + DataFrame de vendas
    sql-course.js
    python-course.js
    interview.js         # modo entrevista
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
