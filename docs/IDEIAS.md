# Ideias para aperfeiçoar o Datum

Organizadas por impacto. ⭐ = recomendo priorizar. ✅ = já implementado (v1.1).

## ✅ Implementado na v1.1
- Apps para **Android**, **Windows 11** e **Linux**, 100% offline
- **Revisão espaçada** (SM-2) por exercício + "força por unidade"
- **Variações automáticas** em exercícios de SQL (na prática e em lições já concluídas)
- **Explicação do erro** por heurísticas (duplicação por JOIN, filtro faltando, INNER × LEFT, NULL, arredondamento, ordem, colunas) + erros do SQLite/Python traduzidos
- **Checkpoint por unidade** (80% para pular — funciona também como teste de nivelamento)
- Exercícios **"encontre o bug"** e de **leitura de código**
- **Missões diárias**, **conquistas**, **gemas**, **protetor de ofensiva**, recarga de vidas
- **Modo entrevista** cronometrado (16 problemas)
- **Lembrete diário** (notificação nativa no Android), vibração e sons
- **Backup/sincronização** manual entre aparelhos

## ✅ Implementado na v1.2
- Novo nome (Datum), novo design e ícones; sem ofensivas, vidas ou gemas
- Níveis de carreira por XP; estatísticas do aluno com gráficos
- Trilha de Estatística e dados maiores (teste A/B, vendas diárias, avaliações)
- 68 problemas de entrevista (SQL e Python, 4 níveis) com explicação do conceito
- Central de dúvidas: busca na teoria + tutor de IA dentro dos exercícios

## Próximos passos sugeridos
2. **Contas + backend** (sincronização automática, ligas semanais reais, amigos)
3. **PostgreSQL e DuckDB** no app, além do SQLite
4. **Projetos guiados** (capstones) e mais conteúdo do `CURRICULO.md`
5. **Editor com autocomplete** de tabelas e colunas
6. Publicação na **Google Play / AppGallery** (precisa de chave privada e conta de desenvolvedor)

## 1. Dinâmica de aprendizado

- ⭐ **Repetição espaçada de verdade (SRS)**: cada conceito (ex.: "LEFT JOIN", "groupby") vira um card com intervalo de revisão (algoritmo SM-2 ou FSRS). A "Prática rápida" puxa o que está vencendo. Hoje o app só prioriza lições mais antigas e a lista de erros.
- ⭐ **Variações automáticas de exercícios**: o mesmo exercício com outros números/filtros ("produtos acima de 500" → "acima de 1200"), para o aluno não decorar a resposta. A correção já compara com a solução executada, então gerar variações é barato.
- ⭐ **Explicação do erro, não só "errou"**: comparar o resultado do aluno com o esperado e dizer *por quê* ("você esqueceu de filtrar status = 'entregue'", "sua query duplica linhas por causa do JOIN"). Dá para começar com heurísticas e evoluir para um tutor com IA.
- **Teste de nivelamento**: quem já sabe SQL básico faz uma prova e pula unidades (como o "pular nível" do Duolingo).
- **Checkpoint por unidade**: uma "prova" ao fim de cada unidade, misturando tudo, sem dicas.
- **Exercícios de "encontre o bug"**: mostrar uma query errada e pedir para corrigir — muito próximo do dia a dia.
- **Exercícios de leitura**: "o que esta query retorna?" com a tabela à vista, para treinar raciocínio sem digitar.
- **Parsons problems** para Python (montar o código com blocos de linhas), ótimo para celular.
- **Modo "traduza"**: pergunta de negócio em português → SQL, e SQL → explicação em português.
- **Datasets reais e variados**: além da loja, ter RH, banco, futebol, saúde (DATASUS), eleições (TSE), Spotify, e deixar o aluno escolher o "tema" dos exercícios.

## 2. Gamificação

- ⭐ **Ligas semanais** (Bronze → Diamante) com ranking por XP — o maior motor de retenção do Duolingo.
- **Missões diárias**: "acerte 5 JOINs", "faça 2 lições sem errar", "use uma window function".
- **Conquistas/medalhas**: "Mestre dos JOINs", "Ofensiva de 30 dias", "Zero erros na unidade 6".
- **Proteção de ofensiva** (streak freeze) comprada com gemas ganhas jogando.
- **Desafio semanal / torneio de queries**: mesma pergunta para todos, ranking por acerto + tempo + query mais curta/eficiente.
- **Duelos 1x1** em tempo real: quem resolve primeiro.
- **Níveis de habilidade por tópico** (radar de competências: filtros, agregação, joins, window, pandas, limpeza...).

## 3. Prática realista (o diferencial frente ao Duolingo)

- ⭐ **Projetos guiados** no fim de cada nível, com dados maiores e entrega de um relatório (ver capstones em `CURRICULO.md`).
- ⭐ **Modo entrevista**: problemas cronometrados no estilo LeetCode/StrataScratch, com níveis fácil/médio/difícil e empresas fictícias.
- **Dialetos de SQL**: alternar entre SQLite, PostgreSQL (via PGlite, Postgres em WASM) e DuckDB (DuckDB-WASM) no próprio navegador; lições sobre diferenças entre dialetos.
- **Notebook embutido** (estilo Jupyter) para projetos longos, com células Markdown/SQL/Python.
- **Performance de verdade**: datasets com milhões de linhas em DuckDB-WASM para sentir a diferença de um índice/partição.
- **Integração com o mundo real**: exportar o projeto para o GitHub do aluno, gerar um portfólio público.

## 4. IA como tutor

- ⭐ **Tutor contextual**: botão "não entendi" que explica o erro do aluno usando a query dele, o esquema e o resultado esperado — sem entregar a resposta de cara (dicas progressivas).
- **Geração de exercícios** a partir de qualquer CSV que o aluno subir ("me faça 10 exercícios sobre os meus dados").
- **Revisão de código**: feedback de estilo e eficiência ("esse subquery correlacionada pode virar um JOIN").
- **Correção de questões abertas**: "explique em uma frase o que é uma CTE" avaliado por IA.

## 5. Produto e plataforma

- ⭐ **Backend com contas** (Supabase/Firebase/Postgres): sincronizar progresso entre dispositivos, ligas, amigos.
- **App mobile**: o app já é responsivo; próximos passos são PWA com service worker (offline, instalar na tela inicial, notificações de lembrete) e, depois, Capacitor/React Native.
- **Notificações inteligentes**: lembrete no horário em que o aluno costuma estudar.
- **Painel do professor/empresa**: turmas, trilhas customizadas, relatórios de progresso — modelo B2B (empresas treinando analistas).
- **Editor de conteúdo** para criar lições sem programar (o formato em `js/content/*.js` já é declarativo e validado por `npm run validate`).
- **Editor com autocomplete** (CodeMirror 6 / Monaco) com nomes de tabelas e colunas do esquema.
- **Acessibilidade**: navegação 100% por teclado (já parcialmente), leitores de tela, alto contraste.
- **Internacionalização**: o conteúdo está em pt-BR; estrutura pronta para traduções.
- **Analytics de aprendizado**: medir em quais exercícios as pessoas mais erram e reescrevê-los.

## 6. Monetização (se for virar produto)

- **Freemium**: trilhas básicas grátis; Plus libera vidas ilimitadas, projetos, modo entrevista, tutor com IA e certificados.
- **Certificados** verificáveis por trilha (com prova final supervisionada).
- **B2B**: licenças para empresas e faculdades.
