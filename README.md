# 📊 DataLingo

App estilo Duolingo para aprender **SQL** e **Python para análise de dados**, com lições curtas, gamificação e exercícios que **rodam de verdade no navegador** — sem instalar nada e sem servidor.

- 🗄️ **SQL do Zero ao Avançado**: 9 unidades, 24 lições (SELECT → window functions, CTE recursiva, índices, coorte, Pareto e funil)
- 🐍 **Python para Análise de Dados**: 9 unidades, 21 lições (Python, NumPy, pandas, limpeza, séries temporais, visualização, APIs, scraping, SQL + Python, estatística)
- **249 passos**: 55 cards de teoria, 59 quizzes, 76 exercícios de SQL, 50 de Python, montar blocos e completar lacunas

## Como funciona

| Recurso | Como |
|---|---|
| SQL de verdade | SQLite compilado para WebAssembly ([sql.js](https://github.com/sql-js/sql.js)), incluído em `vendor/` (funciona offline) |
| Python de verdade | [Pyodide](https://pyodide.org) (CPython em WebAssembly) com pandas, NumPy, matplotlib, BeautifulSoup, sqlite3... carregado do CDN na 1ª execução |
| Correção de SQL | executa a query do aluno e a solução num banco novo e compara os resultados (aceita qualquer query equivalente, ignora nomes de colunas; a ordem só importa quando o enunciado pede) |
| Correção de Python | executa setup + código do aluno + testes (`assert`) |
| Gamificação | XP, ofensiva (dias seguidos), meta diária, 5 vidas (recarregam 1 a cada 30 min), estrelas por lição, revisão de erros que devolve vidas, prática rápida, histórico de atividade |
| Progresso | salvo no `localStorage` do navegador |

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
  app.js                 # rotas, trilha, player de lições, playground, perfil
  state.js               # XP, ofensiva, vidas, progresso (localStorage)
  markdown.js            # renderizador de teoria + realce de sintaxe
  engines/sql-engine.js  # sql.js + comparação de resultados
  engines/python-engine.js  # Pyodide + testes
  content/
    helpers.js           # theory(), quiz(), order(), fill(), sql(), py()
    datasets.js          # banco da loja DataShop + DataFrame de vendas
    sql-course.js
    python-course.js
scripts/                 # validadores de conteúdo
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
    sql('Enunciado', 'SELECT ... ;', { ordered: true }),
    py('Enunciado', 'solucao = 1', 'assert solucao == 1', { setup: '...', packages: ['pandas'] }),
  ],
}
```

Depois rode `npm run validate`.

## Hospedando o Python offline

Por padrão o Pyodide vem do jsDelivr. Para hospedar você mesmo, copie os arquivos do Pyodide para o servidor e defina antes do `app.js`:

```html
<script>window.DATALINGO_PYODIDE_URL = '/pyodide/';</script>
```
