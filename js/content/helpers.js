// Pequenas funções para escrever conteúdo de forma concisa.
// Tipos de passo suportados pelo player de lições:
//   theory  – card de teoria em Markdown
//   quiz    – múltipla escolha
//   order   – montar a resposta com blocos (estilo Duolingo)
//   fill    – completar lacunas (___) em um código
//   sql     – escrever uma query; o resultado é comparado ao da solução
//   python  – escrever código Python; testes (asserts) validam a resposta

export const theory = (title, md) => ({ type: 'theory', title, md });

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
export const sql = (prompt, solution, opts = {}) =>
  ({ type: 'sql', prompt, solution: solution.trim(), starter: opts.starter ?? '', ordered: !!opts.ordered, check: opts.check ?? null, hint: opts.hint ?? '' });

// opts: { starter, setup, tests, packages, hint }
export const py = (prompt, solution, tests, opts = {}) =>
  ({ type: 'python', prompt, solution: solution.trim(), tests: tests.trim(), starter: opts.starter ?? '', setup: opts.setup ?? '', packages: opts.packages ?? [], hint: opts.hint ?? '' });
