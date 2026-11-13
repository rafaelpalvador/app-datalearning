import { COURSES, findLesson, allLessons } from './content/index.js';
import { SCHEMA_DOC } from './content/datasets.js';
import * as store from './state.js';
import { renderMarkdown, inline, esc, highlight } from './markdown.js';
import { freshDb, runQuery, evaluateSql, initSql, createDb } from './engines/sql-engine.js';
import { runPython } from './engines/python-engine.js';

const app = document.getElementById('app');
const EXERCISE_TYPES = new Set(['quiz', 'order', 'fill', 'sql', 'python']);

// ─────────────────────────────────────────── utilidades de DOM
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// replaceChildren que ignora null/false (evita o texto "null" na tela)
const put = (el, ...children) => el.replaceChildren(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function lessonUnlocked(course, lessonId) {
  const s = store.getState();
  const list = allLessons(course);
  const idx = list.findIndex((l) => l.id === lessonId);
  return idx === 0 || !!s.completed[list[idx - 1]?.id] || !!s.completed[lessonId];
}

function courseProgress(course) {
  const s = store.getState();
  const list = allLessons(course);
  const done = list.filter((l) => s.completed[l.id]).length;
  return { done, total: list.length, pct: Math.round((100 * done) / list.length) };
}

// ─────────────────────────────────────────── cabeçalho
function topBar() {
  store.refresh();
  const s = store.getState();
  return h('header', { class: 'topbar' },
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-icon' }, '📊'), 'DataLingo'),
    h('nav', { class: 'stats' },
      h('span', { class: 'stat streak' + (s.lastActiveDay === s.todayDay ? ' on' : ''), title: 'Ofensiva (dias seguidos)' }, '🔥 ', s.streak),
      h('span', { class: 'stat xp', title: 'XP total' }, '⚡ ', s.xp),
      h('span', { class: 'stat hearts', title: s.hearts < store.MAX_HEARTS ? `Próxima vida em ${store.minutesToNextHeart()} min` : 'Vidas cheias' }, '❤️ ', s.hearts),
      h('a', { class: 'stat link', href: '#/perfil', title: 'Perfil' }, '👤'),
    ),
  );
}

function page(...children) {
  app.replaceChildren(topBar(), h('main', { class: 'container' }, ...children));
  window.scrollTo(0, 0);
}

// ─────────────────────────────────────────── HOME
function viewHome() {
  const s = store.getState();
  const goalPct = Math.min(100, Math.round((100 * s.todayXp) / s.dailyGoal));
  const reviewCount = s.mistakes.length;

  page(
    h('section', { class: 'hero' },
      h('div', {},
        h('h1', {}, 'Aprenda dados todos os dias'),
        h('p', { class: 'muted' }, 'Lições curtas de SQL e Python com exercícios que rodam de verdade no seu navegador.'),
      ),
      h('div', { class: 'goal-card' },
        h('div', { class: 'ring', style: `--p:${goalPct}` }, h('span', {}, `${goalPct}%`)),
        h('div', {},
          h('strong', {}, 'Meta diária'),
          h('div', { class: 'muted' }, `${s.todayXp} / ${s.dailyGoal} XP`),
          goalPct >= 100 ? h('div', { class: 'ok-text' }, 'Meta batida! 🎉') : null,
        ),
      ),
    ),
    h('h2', { class: 'section-title' }, 'Trilhas'),
    h('div', { class: 'course-grid' },
      COURSES.map((c) => {
        const p = courseProgress(c);
        return h('a', { class: 'course-card', href: `#/curso/${c.id}`, style: `--accent:${c.color}` },
          h('div', { class: 'course-icon' }, c.icon),
          h('h3', {}, c.title),
          h('p', { class: 'muted' }, c.description),
          h('div', { class: 'progress' }, h('div', { class: 'bar', style: `width:${p.pct}%` })),
          h('div', { class: 'muted small' }, `${p.done} de ${p.total} lições · ${c.units.length} unidades`),
        );
      }),
    ),
    h('h2', { class: 'section-title' }, 'Praticar'),
    h('div', { class: 'practice-grid' },
      h('button', { class: 'practice-card', onclick: () => startPractice('mix') },
        h('span', { class: 'big' }, '🎯'), h('strong', {}, 'Prática rápida'), h('span', { class: 'muted small' }, '8 exercícios das lições que você já fez')),
      h('button', { class: 'practice-card', disabled: reviewCount === 0, onclick: () => startPractice('review') },
        h('span', { class: 'big' }, '🔁'), h('strong', {}, `Revisar erros (${reviewCount})`), h('span', { class: 'muted small' }, 'Refaça o que você errou · recupera vidas')),
      h('a', { class: 'practice-card', href: '#/playground' },
        h('span', { class: 'big' }, '🧪'), h('strong', {}, 'Playground'), h('span', { class: 'muted small' }, 'SQL e Python livres, sem correção')),
    ),
  );
}

// ─────────────────────────────────────────── TRILHA DO CURSO
function viewCourse(courseId) {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return viewHome();
  const s = store.getState();
  const list = allLessons(course);
  const currentId = list.find((l) => !s.completed[l.id])?.id;
  let n = 0;

  page(
    h('a', { class: 'back', href: '#/' }, '← Trilhas'),
    h('h1', {}, course.icon, ' ', course.title),
    h('div', { class: 'path', style: `--accent:${course.color}` },
      course.units.map((unit, ui) => h('section', { class: 'unit' },
        h('div', { class: 'unit-banner' },
          h('div', {}, h('div', { class: 'unit-label' }, `Unidade ${ui + 1}`), h('h2', {}, unit.title), h('p', {}, unit.description)),
        ),
        h('div', { class: 'nodes' },
          unit.lessons.map((lesson) => {
            const done = s.completed[lesson.id];
            const unlocked = lessonUnlocked(course, lesson.id);
            const isCurrent = lesson.id === currentId;
            const offset = Math.round(Math.sin(n++ * 0.9) * 70);
            const exercises = lesson.steps.filter((st) => EXERCISE_TYPES.has(st.type)).length;
            return h('div', { class: 'node-wrap', style: `transform:translateX(${offset}px)` },
              isCurrent ? h('div', { class: 'start-bubble' }, 'COMEÇAR') : null,
              h('button', {
                class: `node ${done ? 'done' : ''} ${isCurrent ? 'current' : ''} ${unlocked ? '' : 'locked'}`,
                disabled: !unlocked,
                title: lesson.title,
                onclick: () => { location.hash = `#/licao/${lesson.id}`; },
              }, done ? '★' : unlocked ? '▶' : '🔒'),
              h('div', { class: 'node-label' }, lesson.title,
                h('span', { class: 'muted small' }, done ? ` · ${'★'.repeat(done.stars)}${'☆'.repeat(3 - done.stars)}` : ` · ${exercises} exercícios`)),
            );
          }),
        ),
      )),
    ),
  );
}

// ─────────────────────────────────────────── EDITOR E TABELAS
function codeEditor(value, lang, onRun) {
  const ta = h('textarea', { class: 'editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': `Editor ${lang}` });
  ta.value = value;
  const resize = () => { ta.style.height = 'auto'; ta.style.height = Math.max(120, ta.scrollHeight + 4) + 'px'; };
  ta.addEventListener('input', resize);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = lang === 'python' ? '    ' : '  ';
      const { selectionStart: a, selectionEnd: b } = ta;
      ta.setRangeText(indent, a, b, 'end');
      resize();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onRun?.();
    }
  });
  requestAnimationFrame(resize);
  return ta;
}

function resultTable(res) {
  if (!res.columns.length) return h('div', { class: 'muted small' }, 'Comando executado (sem linhas retornadas).');
  const max = 50;
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'result' },
      h('thead', {}, h('tr', {}, res.columns.map((c) => h('th', {}, c)))),
      h('tbody', {}, res.values.slice(0, max).map((r) => h('tr', {}, r.map((v) => h('td', { class: v === null ? 'null' : '' }, v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 100) / 100) : String(v)))))),
    ),
    h('div', { class: 'muted small' }, `${res.values.length} linha(s)${res.values.length > max ? ` — mostrando ${max}` : ''}`),
  );
}

function schemaPanel() {
  return h('details', { class: 'schema' },
    h('summary', {}, '🗂️ Esquema do banco'),
    h('ul', {}, SCHEMA_DOC.map((t) => h('li', {}, h('code', {}, t.tabela), ': ', t.colunas))),
  );
}

function pythonOutput(out, res) {
  out.replaceChildren();
  if (res.stdout) out.append(h('pre', { class: 'stdout' }, res.stdout));
  if (res.value?.kind === 'html') out.append(h('div', { class: 'table-wrap df', html: res.value.content }));
  if (res.value?.kind === 'text') out.append(h('pre', { class: 'stdout' }, res.value.content));
  for (const f of res.figures || []) out.append(h('img', { class: 'figure', src: `data:image/png;base64,${f}`, alt: 'Gráfico gerado' }));
  if (res.error) out.append(h('pre', { class: 'error' }, res.error));
  if (!out.childNodes.length) out.append(h('div', { class: 'muted small' }, 'Executado sem saída. Use print() ou deixe uma expressão na última linha.'));
}

// ─────────────────────────────────────────── RENDERIZADORES DE PASSO
// Cada um devolve { el, check?: async () => resultado, solution?: () => void }
// resultado: { ok, error?, message?, explanation? }

const renderers = {
  theory(step) {
    return { el: h('div', { class: 'step theory' }, h('h2', {}, step.title), h('div', { class: 'md', html: renderMarkdown(step.md) })) };
  },

  quiz(step) {
    let selected = null;
    const opts = step.options.map((o, i) => ({ o, i }));
    const shuffled = shuffle(opts);
    const buttons = shuffled.map(({ o, i }, k) => h('button', {
      class: 'option',
      onclick: (e) => {
        selected = i;
        buttons.forEach((b) => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        footerReady(true);
      },
    }, h('span', { class: 'key' }, k + 1), h('span', { html: inline(o) })));
    const el = h('div', { class: 'step' },
      h('div', { class: 'eyebrow' }, 'Escolha a resposta correta'),
      h('h2', { html: inline(step.question) }),
      step.code ? h('pre', { class: 'code' }, h('code', { html: highlight(step.code, 'sql') })) : null,
      h('div', { class: 'options' }, buttons),
    );
    el.addEventListener('keypress', () => {});
    return {
      el,
      needsInput: true,
      onKey: (key) => { const k = Number(key) - 1; if (buttons[k]) buttons[k].click(); },
      check: async () => {
        const ok = selected === step.answer;
        buttons.forEach((b, k) => {
          b.disabled = true;
          if (shuffled[k].i === step.answer) b.classList.add('correct');
          else if (shuffled[k].i === selected) b.classList.add('wrong');
        });
        return { ok, explanation: step.explanation, message: ok ? null : `Resposta correta: ${inline(step.options[step.answer])}` };
      },
    };
  },

  order(step) {
    const answer = [];
    const bank = shuffle([...step.tokens, ...step.extra].map((t, id) => ({ t, id })));
    const answerEl = h('div', { class: 'answer-line' });
    const bankEl = h('div', { class: 'bank' });
    const draw = () => {
      answerEl.replaceChildren(...answer.map((tok) => h('button', { class: 'chip', onclick: () => { answer.splice(answer.indexOf(tok), 1); draw(); } }, tok.t)));
      bankEl.replaceChildren(...bank.map((tok) => h('button', {
        class: 'chip', disabled: answer.includes(tok),
        onclick: () => { answer.push(tok); draw(); },
      }, tok.t)));
      footerReady(answer.length > 0);
    };
    draw();
    return {
      el: h('div', { class: 'step' }, h('div', { class: 'eyebrow' }, 'Monte a resposta'), h('h2', { html: inline(step.prompt) }), answerEl, bankEl),
      needsInput: true,
      check: async () => {
        const ok = answer.map((a) => a.t).join(' ') === step.tokens.join(' ');
        return { ok, explanation: step.explanation, message: ok ? null : `Ordem correta: <code>${esc(step.tokens.join(' '))}</code>` };
      },
    };
  },

  fill(step) {
    const parts = step.code.split('___');
    const inputs = [];
    const code = h('pre', { class: 'code fill' });
    parts.forEach((p, i) => {
      code.append(document.createTextNode(p));
      if (i < parts.length - 1) {
        const inp = h('input', { class: 'blank', size: Math.max(4, ...step.blanks[i].map((b) => b.length)), autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off' });
        inp.addEventListener('input', () => footerReady(inputs.every((x) => x.value.trim())));
        inputs.push(inp);
        code.append(inp);
      }
    });
    setTimeout(() => inputs[0]?.focus(), 50);
    return {
      el: h('div', { class: 'step' }, h('div', { class: 'eyebrow' }, 'Complete as lacunas'), h('h2', { html: inline(step.prompt) }), code),
      needsInput: true,
      check: async () => {
        let ok = true;
        inputs.forEach((inp, i) => {
          const good = step.blanks[i].some((b) => b.toLowerCase() === inp.value.trim().toLowerCase());
          inp.classList.add(good ? 'correct' : 'wrong');
          inp.disabled = true;
          ok = ok && good;
        });
        return { ok, explanation: step.explanation, message: ok ? null : `Resposta: ${step.blanks.map((b) => `<code>${esc(b[0])}</code>`).join(', ')}` };
      },
    };
  },

  sql(step) {
    const out = h('div', { class: 'output' });
    const run = async () => {
      out.replaceChildren(h('div', { class: 'muted small' }, 'Executando...'));
      const db = await freshDb();
      try {
        out.replaceChildren(resultTable(runQuery(db, editor.value)));
      } catch (e) {
        out.replaceChildren(h('pre', { class: 'error' }, `Erro: ${e.message}`));
      } finally {
        db.close();
      }
    };
    const editor = codeEditor(step.starter, 'sql', run);
    editor.addEventListener('input', () => footerReady(editor.value.trim().length > 0));
    initSql(); // pré-carrega
    const hint = step.hint ? h('details', { class: 'hint' }, h('summary', {}, '💡 Dica'), h('div', { html: inline(step.hint) })) : null;
    setTimeout(() => { editor.focus(); footerReady(editor.value.trim().length > 0); }, 50);
    return {
      el: h('div', { class: 'step code-step' },
        h('div', { class: 'eyebrow' }, '🗄️ Escreva a query', step.ordered ? h('span', { class: 'pill' }, 'a ordem importa') : null),
        h('h2', { html: inline(step.prompt) }),
        schemaPanel(),
        hint,
        editor,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: run }, '▶ Executar'),
          h('span', { class: 'muted small' }, 'Ctrl+Enter executa · resultado aparece abaixo'),
        ),
        out,
      ),
      needsInput: true,
      code: true,
      check: async () => {
        const SQL = await initSql();
        const res = evaluateSql(() => createDb(SQL), step, editor.value);
        if (res.error) {
          out.replaceChildren(h('pre', { class: 'error' }, res.reason));
          return { ok: false, error: true };
        }
        out.replaceChildren(h('div', { class: 'small strong' }, 'Seu resultado:'), resultTable(res.got));
        if (!res.ok) out.append(h('div', { class: 'small strong' }, 'Resultado esperado:'), resultTable(res.expected));
        return { ok: res.ok, message: res.reason };
      },
      solution: () => {
        editor.value = step.solution;
        editor.dispatchEvent(new Event('input'));
      },
    };
  },

  python(step) {
    const out = h('div', { class: 'output' });
    const status = (msg) => out.replaceChildren(h('div', { class: 'muted small loading' }, msg));
    const run = async () => {
      status('Preparando o Python...');
      try {
        const res = await runPython({ setup: step.setup, code: editor.value, packages: step.packages, onStatus: status });
        pythonOutput(out, res);
      } catch (e) {
        out.replaceChildren(h('pre', { class: 'error' }, e.message));
      }
    };
    const editor = codeEditor(step.starter, 'python', run);
    editor.addEventListener('input', () => footerReady(editor.value.trim().length > 0));
    const hint = step.hint ? h('details', { class: 'hint' }, h('summary', {}, '💡 Dica'), h('div', { html: inline(step.hint) })) : null;
    const setupView = step.setup ? h('details', { class: 'schema' }, h('summary', {}, '📦 Dados já carregados'), h('pre', { class: 'code' }, h('code', { html: highlight(step.setup.trim(), 'python') }))) : null;
    setTimeout(() => { editor.focus(); footerReady(editor.value.trim().length > 0); }, 50);
    return {
      el: h('div', { class: 'step code-step' },
        h('div', { class: 'eyebrow' }, '🐍 Escreva o código'),
        h('h2', { html: inline(step.prompt) }),
        setupView,
        hint,
        editor,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: run }, '▶ Executar'),
          h('span', { class: 'muted small' }, 'Ctrl+Enter executa · a 1ª execução baixa o Python'),
        ),
        out,
      ),
      needsInput: true,
      code: true,
      check: async () => {
        status('Verificando...');
        let res;
        try {
          res = await runPython({ setup: step.setup, code: editor.value, tests: step.tests, packages: step.packages, onStatus: status });
        } catch (e) {
          out.replaceChildren(h('pre', { class: 'error' }, e.message));
          return { ok: false, error: true };
        }
        pythonOutput(out, res);
        if (res.error) return { ok: false, error: true };
        if (res.testError) return { ok: false, message: esc(res.testError) };
        return { ok: true };
      },
      solution: () => {
        editor.value = step.solution;
        editor.dispatchEvent(new Event('input'));
      },
    };
  },
};

// O rodapé do player precisa ser acessível pelos renderizadores
let footerReady = () => {};

// ─────────────────────────────────────────── PLAYER DE SESSÃO
// items: [{ step, lessonId, stepIndex }]
// mode: 'lesson' (perde vidas) | 'practice' | 'review' (não perdem vidas)
function startSession({ title, items, mode, lessonId, backHref }) {
  const s = store.getState();
  if (mode === 'lesson' && s.hearts <= 0) return noHearts(backHref);

  let queue = [...items];
  const totalExercises = items.filter((it) => EXERCISE_TYPES.has(it.step.type)).length;
  const firstTry = new Set();
  let completedCount = 0;
  let mistakes = 0;
  let correctCount = 0;
  const startedAt = Date.now();

  const progressBar = h('div', { class: 'bar' });
  const heartsEl = h('span', { class: 'hearts-count' });
  const body = h('div', { class: 'session-body' });
  const footer = h('footer', { class: 'session-footer' });

  const updateHeader = () => {
    progressBar.style.width = `${Math.round((100 * completedCount) / items.length)}%`;
    heartsEl.textContent = mode === 'lesson' ? `❤️ ${store.getState().hearts}` : mode === 'review' ? '🔁 revisão' : '🎯 prática';
  };

  app.replaceChildren(h('div', { class: 'session' },
    h('div', { class: 'session-top' },
      h('button', { class: 'icon-btn', title: 'Sair', onclick: () => { if (confirm('Sair da lição? O progresso desta lição será perdido.')) location.hash = backHref; } }, '✕'),
      h('div', { class: 'progress big' }, progressBar),
      heartsEl,
    ),
    body,
    footer,
  ));

  function showStep() {
    updateHeader();
    if (!queue.length) return finish();
    const item = queue[0];
    const r = renderers[item.step.type](item.step);
    let attempts = 0;
    body.replaceChildren(h('div', { class: 'step-wrap' }, r.el));
    body.scrollTop = 0;

    const mainBtn = h('button', { class: 'btn primary' });
    const feedback = h('div', { class: 'feedback' });
    const extra = h('div', { class: 'footer-extra' });
    footer.className = 'session-footer';
    footer.replaceChildren(h('div', { class: 'footer-inner' }, feedback, h('div', { class: 'footer-actions' }, extra, mainBtn)));

    const advance = () => {
      queue.shift();
      completedCount++;
      showStep();
    };

    if (!r.check) {
      mainBtn.textContent = 'Continuar';
      mainBtn.disabled = false;
      footerReady = () => {};
      mainBtn.onclick = advance;
      keyHandler = (e) => { if (e.key === 'Enter') advance(); };
      return;
    }

    mainBtn.textContent = 'Verificar';
    mainBtn.disabled = true;
    footerReady = (ready) => { if (mainBtn.textContent === 'Verificar') mainBtn.disabled = !ready; };

    keyHandler = (e) => {
      const inField = ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName);
      if (r.onKey && /^[1-9]$/.test(e.key) && !inField) r.onKey(e.key);
      if (e.key === 'Enter' && !inField && !mainBtn.disabled) mainBtn.click();
      if (e.key === 'Enter' && document.activeElement?.tagName === 'INPUT' && !mainBtn.disabled) mainBtn.click();
    };

    mainBtn.onclick = async () => {
      mainBtn.disabled = true;
      mainBtn.textContent = 'Verificando...';
      const res = await r.check();
      attempts++;

      if (res.error) {
        // erro de sintaxe/execução: não penaliza
        mainBtn.textContent = 'Verificar';
        mainBtn.disabled = false;
        put(feedback, h('div', { class: 'fb-title warn' }, '⚠️ Seu código deu erro — corrija e verifique de novo (sem perder vida).'));
        if (attempts >= 2 && r.solution) {
          put(extra, h('button', { class: 'btn ghost', onclick: () => { r.solution(); put(extra); if (mode !== 'review') store.recordMistake(item.lessonId, item.stepIndex); } }, 'Ver solução'));
        }
        return;
      }

      if (res.ok) {
        if (attempts === 1 && !firstTry.has(item)) correctCount++;
        if (mode === 'review') { store.clearMistake(item.lessonId, item.stepIndex); store.gainHeart(1); }
        footer.className = 'session-footer good';
        put(feedback, 
          h('div', { class: 'fb-title' }, pick(['Excelente!', 'Mandou bem!', 'Correto!', 'Perfeito!', 'Isso aí!'])),
          res.explanation ? h('div', { class: 'fb-text', html: inline(res.explanation) }) : null,
        );
        put(extra, );
        mainBtn.textContent = 'Continuar';
        mainBtn.disabled = false;
        mainBtn.onclick = advance;
        keyHandler = (e) => { if (e.key === 'Enter' && document.activeElement?.tagName !== 'TEXTAREA') advance(); };
        return;
      }

      // errou
      firstTry.add(item);
      mistakes++;
      if (mode !== 'review') store.recordMistake(item.lessonId, item.stepIndex);
      if (mode === 'lesson') store.loseHeart();
      updateHeader();
      footer.className = 'session-footer bad';
      put(feedback, 
        h('div', { class: 'fb-title' }, 'Não foi dessa vez'),
        res.message ? h('div', { class: 'fb-text', html: res.message }) : null,
        res.explanation ? h('div', { class: 'fb-text', html: inline(res.explanation) }) : null,
      );

      if (mode === 'lesson' && store.getState().hearts <= 0) {
        mainBtn.textContent = 'Continuar';
        mainBtn.disabled = false;
        mainBtn.onclick = () => noHearts(backHref);
        return;
      }

      if (r.code) {
        // exercícios de código: tenta de novo no mesmo passo
        put(extra, r.solution ? h('button', {
          class: 'btn ghost', onclick: () => { r.solution(); put(extra, ); },
        }, 'Ver solução') : null);
        mainBtn.textContent = 'Tentar de novo';
        mainBtn.disabled = false;
        mainBtn.onclick = () => {
          footer.className = 'session-footer';
          put(feedback, );
          mainBtn.textContent = 'Verificar';
          mainBtn.onclick = checkAgain;
          mainBtn.disabled = false;
        };
      } else {
        // demais: o exercício volta para o fim da fila (como no Duolingo)
        mainBtn.textContent = 'Continuar';
        mainBtn.disabled = false;
        mainBtn.onclick = () => { queue.push(queue.shift()); showStep(); };
      }
    };
    const checkAgain = mainBtn.onclick;
  }

  function finish() {
    footerReady = () => {};
    keyHandler = null;
    const accuracy = totalExercises ? Math.round((100 * correctCount) / totalExercises) : 100;
    let xp;
    let stars = null;
    if (mode === 'lesson') {
      const already = !!store.getState().completed[lessonId];
      xp = already ? 5 : 10 + totalExercises * 2 + (mistakes === 0 ? 5 : 0);
      stars = store.completeLesson(lessonId, mistakes);
    } else {
      xp = 5 + correctCount * 2;
    }
    store.addXp(xp);
    const secs = Math.round((Date.now() - startedAt) / 1000);
    app.replaceChildren(h('div', { class: 'finish' },
      h('div', { class: 'finish-emoji' }, mistakes === 0 ? '🏆' : '🎉'),
      h('h1', {}, mode === 'lesson' ? 'Lição concluída!' : 'Prática concluída!'),
      h('p', { class: 'muted' }, title),
      stars ? h('div', { class: 'stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)) : null,
      h('div', { class: 'finish-stats' },
        h('div', { class: 'fstat xp' }, h('span', {}, 'XP'), h('strong', {}, `+${xp}`)),
        h('div', { class: 'fstat acc' }, h('span', {}, 'Precisão'), h('strong', {}, `${accuracy}%`)),
        h('div', { class: 'fstat time' }, h('span', {}, 'Tempo'), h('strong', {}, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`)),
      ),
      h('button', { class: 'btn primary', onclick: () => { location.hash = backHref; } }, 'Continuar'),
    ));
    keyHandler = (e) => { if (e.key === 'Enter') location.hash = backHref; };
  }

  showStep();
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function noHearts(backHref) {
  footerReady = () => {};
  keyHandler = null;
  app.replaceChildren(h('div', { class: 'finish' },
    h('div', { class: 'finish-emoji' }, '💔'),
    h('h1', {}, 'Suas vidas acabaram'),
    h('p', { class: 'muted' }, `Uma nova vida chega em ${store.minutesToNextHeart()} min. Ou recupere vidas revisando seus erros — cada acerto na revisão devolve 1 vida.`),
    h('div', { class: 'row center' },
      h('button', { class: 'btn primary', onclick: () => startPractice('review') }, '🔁 Revisar erros'),
      h('button', { class: 'btn ghost', onclick: () => { location.hash = backHref; } }, 'Voltar'),
    ),
  ));
}

function startLesson(lessonId) {
  const found = findLesson(lessonId);
  if (!found) return viewHome();
  const { course, lesson } = found;
  if (!lessonUnlocked(course, lessonId)) { location.hash = `#/curso/${course.id}`; return; }
  const items = lesson.steps.map((step, stepIndex) => ({ step, lessonId, stepIndex }));
  startSession({ title: lesson.title, items, mode: store.getState().completed[lessonId] ? 'practice' : 'lesson', lessonId, backHref: `#/curso/${course.id}` });
}

function startPractice(kind) {
  const s = store.getState();
  let items = [];
  if (kind === 'review') {
    items = s.mistakes.map((m) => {
      const f = findLesson(m.lessonId);
      const step = f?.lesson.steps[m.stepIndex];
      return step ? { step, lessonId: m.lessonId, stepIndex: m.stepIndex } : null;
    }).filter(Boolean).slice(-10);
  } else {
    // revisão espaçada simples: prioriza lições concluídas há mais tempo
    const done = Object.entries(s.completed).sort((a, b) => a[1].at - b[1].at).map(([id]) => id);
    const pool = [];
    for (const id of (done.length ? done : [allLessons(COURSES[0])[0].id])) {
      const f = findLesson(id);
      f?.lesson.steps.forEach((step, stepIndex) => {
        if (['quiz', 'order', 'fill', 'sql'].includes(step.type) || (step.type === 'python' && pool.length < 40)) pool.push({ step, lessonId: id, stepIndex });
      });
    }
    items = shuffle(pool.slice(0, 60)).slice(0, 8);
  }
  if (!items.length) { location.hash = '#/'; return; }
  startSession({ title: kind === 'review' ? 'Revisão de erros' : 'Prática rápida', items, mode: kind === 'review' ? 'review' : 'practice', backHref: '#/' });
}

// ─────────────────────────────────────────── PLAYGROUND
function viewPlayground(tab = 'sql') {
  const out = h('div', { class: 'output' });
  let editor;
  const runSql = async () => {
    const db = await freshDb();
    try {
      const results = db.exec(editor.value);
      out.replaceChildren(...(results.length ? results.map(resultTable) : [h('div', { class: 'muted small' }, 'Comando executado (sem linhas retornadas).')]));
    } catch (e) {
      out.replaceChildren(h('pre', { class: 'error' }, `Erro: ${e.message}`));
    } finally {
      db.close();
    }
  };
  const runPy = async () => {
    const status = (m) => out.replaceChildren(h('div', { class: 'muted small loading' }, m));
    try {
      pythonOutput(out, await runPython({ code: editor.value, onStatus: status }));
    } catch (e) {
      out.replaceChildren(h('pre', { class: 'error' }, e.message));
    }
  };
  const run = tab === 'sql' ? runSql : runPy;
  editor = codeEditor(tab === 'sql'
    ? "-- O banco da DataShop é recriado a cada execução\nSELECT categoria, COUNT(*) AS produtos, ROUND(AVG(preco), 2) AS preco_medio\nFROM produtos\nGROUP BY categoria\nORDER BY preco_medio DESC;"
    : 'import pandas as pd\nimport matplotlib.pyplot as plt\n\ndf = pd.DataFrame({"mes": ["jan", "fev", "mar", "abr"], "receita": [8987, 5747, 8395, 4185]})\ndf.plot(x="mes", y="receita", kind="bar", legend=False, title="Receita mensal")\ndf.describe()',
  tab, run);

  page(
    h('a', { class: 'back', href: '#/' }, '← Início'),
    h('h1', {}, '🧪 Playground'),
    h('div', { class: 'tabs' },
      h('a', { class: `tab ${tab === 'sql' ? 'active' : ''}`, href: '#/playground/sql' }, 'SQL'),
      h('a', { class: `tab ${tab === 'python' ? 'active' : ''}`, href: '#/playground/python' }, 'Python'),
    ),
    tab === 'sql' ? schemaPanel() : h('p', { class: 'muted small' }, 'Bibliotecas disponíveis: pandas, NumPy, matplotlib, SciPy, scikit-learn, BeautifulSoup, sqlite3 e muitas outras (carregadas sob demanda).'),
    editor,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: run }, '▶ Executar'), h('span', { class: 'muted small' }, 'Ctrl+Enter')),
    out,
  );
}

// ─────────────────────────────────────────── PERFIL
function viewProfile() {
  const s = store.getState();
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ d, xp: s.history[d] || 0 });
  }
  const level = (xp) => (xp === 0 ? 0 : xp < 20 ? 1 : xp < 50 ? 2 : xp < 100 ? 3 : 4);
  const totalLessons = COURSES.reduce((a, c) => a + allLessons(c).length, 0);
  const goals = [10, 30, 50, 100];

  page(
    h('a', { class: 'back', href: '#/' }, '← Início'),
    h('h1', {}, '👤 Seu progresso'),
    h('div', { class: 'profile-stats' },
      h('div', { class: 'pstat' }, h('strong', {}, `🔥 ${s.streak}`), h('span', {}, 'ofensiva atual')),
      h('div', { class: 'pstat' }, h('strong', {}, `🏅 ${s.bestStreak}`), h('span', {}, 'melhor ofensiva')),
      h('div', { class: 'pstat' }, h('strong', {}, `⚡ ${s.xp}`), h('span', {}, 'XP total')),
      h('div', { class: 'pstat' }, h('strong', {}, `📚 ${Object.keys(s.completed).length}/${totalLessons}`), h('span', {}, 'lições')),
    ),
    h('h2', { class: 'section-title' }, 'Atividade (últimas 12 semanas)'),
    h('div', { class: 'heatmap' }, days.map((d) => h('div', { class: `cell l${level(d.xp)}`, title: `${d.d}: ${d.xp} XP` }))),
    h('h2', { class: 'section-title' }, 'Meta diária'),
    h('div', { class: 'row' }, goals.map((g) => h('button', {
      class: `btn ${s.dailyGoal === g ? 'primary' : 'ghost'}`,
      onclick: () => { store.setDailyGoal(g); viewProfile(); },
    }, `${g} XP`))),
    h('h2', { class: 'section-title' }, 'Por trilha'),
    COURSES.map((c) => {
      const p = courseProgress(c);
      return h('div', { class: 'course-line' }, h('span', {}, `${c.icon} ${c.title}`), h('div', { class: 'progress' }, h('div', { class: 'bar', style: `width:${p.pct}%;background:${c.color}` })), h('span', { class: 'muted small' }, `${p.pct}%`));
    }),
    h('div', { class: 'danger-zone' },
      h('button', { class: 'btn ghost danger', onclick: () => { if (confirm('Apagar todo o progresso?')) { store.resetProgress(); viewProfile(); } } }, 'Apagar progresso'),
      h('button', { class: 'btn ghost', onclick: unlockAll }, 'Desbloquear tudo (modo professor)'),
    ),
  );
}

function unlockAll() {
  if (!confirm('Marcar todas as lições como concluídas (sem XP)? Útil para explorar o conteúdo.')) return;
  for (const c of COURSES) for (const l of allLessons(c)) if (!store.getState().completed[l.id]) store.completeLesson(l.id, 3);
  location.hash = '#/';
}

// ─────────────────────────────────────────── ROTEADOR
let keyHandler = null;
document.addEventListener('keydown', (e) => keyHandler?.(e));

function route() {
  keyHandler = null;
  footerReady = () => {};
  const [, view, arg] = location.hash.replace(/^#/, '').split('/');
  switch (view) {
    case 'curso': return viewCourse(arg);
    case 'licao': return startLesson(arg);
    case 'playground': return viewPlayground(arg || 'sql');
    case 'perfil': return viewProfile();
    default: return viewHome();
  }
}

window.addEventListener('hashchange', route);
route();
