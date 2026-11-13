// Pequenas funções para escrever conteúdo de forma concisa.
// Tipos de passo suportados pelo player de lições:
//   theory  – card de teoria em Markdown
//   quiz    – múltipla escolha
//   order   – montar a resposta com blocos (estilo Duolingo)
//   fill    – completar lacunas (___) em um código
//   sql     – escrever uma query; o resultado é comparado ao da solução
//   python  – escrever código Python; testes (asserts) validam a resposta
//   example – exemplo resolvido: explicação + código executável + resultado real + comentário

export const theory = (title, md) => ({ type: 'theory', title, md });

// Exemplo resolvido (não vale nota): mostra o código rodando ANTES dos exercícios.
//   lang: 'sql' | 'python'; md: explicação antes do código; after: leitura do resultado
//   opts: { setup, setupNote, packages } (Python)
export const example = (title, md, lang, code, after = '', opts = {}) =>
  ({ type: 'example', title, md, lang, code: code.trim(), after, setup: opts.setup ?? '', setupNote: opts.setupNote ?? '', packages: opts.packages ?? [] });
export const exSql = (title, md, code, after = '') => example(title, md, 'sql', code, after);
export const exPy = (title, md, code, after = '', opts = {}) => example(title, md, 'python', code, after, opts);

export const quiz = (question, options, answer, explanation = '', code = '') =>
  ({ type: 'quiz', question, options, answer, explanation, code });

// tokens: a resposta correta em ordem; extra: blocos "pegadinha"
export const order = (prompt, tokens, extra = [], explanation = '') =>
  ({ type: 'order', prompt, tokens, extra, explanation });

// code contém ___ para cada lacuna; blanks: [[respostas aceitas], ...]
export const fill = (prompt, code, blanks, explanation = '') =>
  ({ type: 'fill', prompt, code, blanks, explanation });

// opts: { starter, ordered, check, hint }
//  - ordered: a ordem das linhas importa (quando há ORDER BY no enunciado)
//  - check: query executada após o código do aluno e da solução (exercícios de INSERT/UPDATE/DDL)
//  - kind: 'debug' → o starter traz uma query com bug para o aluno corrigir
//  - variants: [{ prompt, solution }] → versões alternativas sorteadas na prática,
//    para o aluno não decorar a resposta
export const sql = (prompt, solution, opts = {}) =>
  ({ type: 'sql', prompt, solution: solution.trim(), starter: opts.starter ?? '', ordered: !!opts.ordered, check: opts.check ?? null, hint: opts.hint ?? '', kind: opts.kind ?? null, variants: opts.variants ?? [] });

// Atalho para "encontre o bug": o aluno recebe a query quebrada no editor.
export const debugSql = (prompt, buggy, solution, opts = {}) =>
  sql(prompt, solution, { ...opts, starter: buggy, kind: 'debug' });

// Escolhe uma variação aleatória de um passo (ou o próprio passo).
export function withVariant(step) {
  if (!step.variants?.length) return step;
  const all = [{ prompt: step.prompt, solution: step.solution }, ...step.variants];
  const v = all[Math.floor(Math.random() * all.length)];
  return { ...step, ...v };
}

// opts: { starter, setup, tests, packages, hint }
export const py = (prompt, solution, tests, opts = {}) =>
  ({ type: 'python', prompt, solution: solution.trim(), tests: tests.trim(), starter: opts.starter ?? '', setup: opts.setup ?? '', setupNote: opts.setupNote ?? '', packages: opts.packages ?? [], hint: opts.hint ?? '' });
