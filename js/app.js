import { COURSES, findLesson, allLessons } from './content/index.js';
import { INTERVIEW } from './content/interview.js';
import { SCHEMA_DOC } from './content/datasets.js';
import { withVariant } from './content/helpers.js';
import * as store from './state.js';
import { renderMarkdown, inline, esc, highlight } from './markdown.js';
import { freshDb, runQuery, evaluateSql, initSql, createDb, friendlySqlError } from './engines/sql-engine.js';
import { runPython, friendlyPyError } from './engines/python-engine.js';
import { dailyMissions, settleMissions, checkAchievements, ACHIEVEMENTS, MISSION_REWARD } from './gamification.js';
import * as platform from './platform.js';

const app = document.getElementById('app');
const EXERCISE_TYPES = new Set(['quiz', 'order', 'fill', 'sql', 'python']);
const CHECKPOINT_PASS = 0.8;

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
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

const settings = () => {
  const s = store.getState();
  s.settings ??= { sound: true, haptics: true };
  return s.settings;
};

function feedbackFx(kind) {
  if (settings().haptics) platform.haptic(kind === 'error' ? 'error' : 'success');
  platform.sound(kind, settings().sound);
}

// ─────────────────────────────────────────── toasts
const toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' });
document.body.append(toastBox);
function toast(html, kind = '') {
  const t = h('div', { class: `toast ${kind}`, html });
  toastBox.append(t);
  setTimeout(() => t.classList.add('out'), 3600);
  setTimeout(() => t.remove(), 4100);
}

// ─────────────────────────────────────────── progresso
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

function findUnit(unitId) {
  for (const course of COURSES) {
    const unit = course.units.find((u) => u.id === unitId);
    if (unit) return { course, unit };
  }
  return null;
}

function itemFromRef(lessonId, stepIndex) {
  const step = findLesson(lessonId)?.lesson.steps[stepIndex];
  return step ? { step, lessonId, stepIndex } : null;
}

// ─────────────────────────────────────────── layout
const NAV = [
  { id: 'home', href: '#/', icon: '🏠', label: 'Início' },
  { id: 'practice', href: '#/praticar', icon: '🎯', label: 'Praticar' },
  { id: 'interview', href: '#/entrevista', icon: '💼', label: 'Entrevista' },
  { id: 'awards', href: '#/conquistas', icon: '🏆', label: 'Conquistas' },
  { id: 'profile', href: '#/perfil', icon: '👤', label: 'Perfil' },
];

function topBar(active) {
  store.refresh();
  const s = store.getState();
  return h('header', { class: 'topbar' },
    h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-icon' }, '📊'), h('span', { class: 'brand-name' }, 'DataLingo')),
    h('nav', { class: 'top-nav' }, NAV.map((n) => h('a', { href: n.href, class: n.id === active ? 'active' : '' }, n.label))),
    h('div', { class: 'stats' },
      h('span', { class: 'stat streak' + (s.lastActiveDay === s.daily.day ? ' on' : ''), title: `Ofensiva (dias seguidos)${s.freezes ? ` · ${s.freezes} protetor(es)` : ''}` }, '🔥', s.streak, s.freezes ? h('small', {}, '🧊') : null),
      h('span', { class: 'stat gems', title: 'Gemas' }, '💎', s.gems),
      h('span', { class: 'stat xp', title: 'XP total' }, '⚡', s.xp),
      h('span', { class: 'stat hearts', title: s.hearts < store.MAX_HEARTS ? `Próxima vida em ${store.minutesToNextHeart()} min` : 'Vidas cheias' }, '❤️', s.hearts),
    ),
  );
}

function bottomNav(active) {
  return h('nav', { class: 'bottom-nav' }, NAV.map((n) => h('a', { href: n.href, class: n.id === active ? 'active' : '' }, h('span', { class: 'bn-icon' }, n.icon), h('span', {}, n.label))));
}

function page(active, ...children) {
  app.replaceChildren(topBar(active), h('main', { class: 'container' }, ...children), bottomNav(active));
  window.scrollTo(0, 0);
}

// ─────────────────────────────────────────── HOME
function missionsCard() {
  const ms = dailyMissions();
  return h('section', { class: 'card missions' },
    h('div', { class: 'card-head' }, h('h3', {}, '📋 Missões do dia'), h('span', { class: 'muted small' }, `+${MISSION_REWARD} 💎 cada`)),
    ms.map((m) => h('div', { class: `mission ${m.done ? 'done' : ''}` },
      h('span', { class: 'm-icon' }, m.done ? '✅' : m.icon),
      h('div', { class: 'm-body' },
        h('div', {}, m.text),
        h('div', { class: 'progress thin' }, h('div', { class: 'bar', style: `width:${Math.round((100 * m.value) / m.target)}%` })),
      ),
      h('span', { class: 'muted small' }, `${m.value}/${m.target}`),
    )),
  );
}

function viewHome() {
  const s = store.getState();
  const goalPct = Math.min(100, Math.round((100 * s.daily.xp) / s.dailyGoal));
  const due = store.dueCards().length;
  const froze = store.consumeFrozeNotice();
  if (froze) setTimeout(() => toast(`🧊 Seu protetor salvou a ofensiva de ${s.streak} dias!`), 300);

  page('home',
    h('section', { class: 'hero' },
      h('div', {},
        h('h1', {}, s.xp === 0 ? 'Aprenda dados todos os dias' : `Bora, ${s.streak > 1 ? `${s.streak} dias seguidos! 🔥` : 'vamos praticar!'}`),
        h('p', { class: 'muted' }, 'Lições curtas de SQL e Python com exercícios que rodam de verdade.'),
      ),
      h('div', { class: 'goal-card' },
        h('div', { class: 'ring', style: `--p:${goalPct}` }, h('span', {}, `${goalPct}%`)),
        h('div', {},
          h('strong', {}, 'Meta diária'),
          h('div', { class: 'muted' }, `${s.daily.xp} / ${s.dailyGoal} XP`),
          goalPct >= 100 ? h('div', { class: 'ok-text' }, 'Meta batida! 🎉') : null,
        ),
      ),
    ),
    due ? h('button', { class: 'banner-btn', onclick: () => startPractice('srs') }, h('span', { class: 'big' }, '🧠'),
      h('div', {}, h('strong', {}, `${due} exercício${due > 1 ? 's' : ''} para revisar hoje`), h('div', { class: 'small' }, 'A revisão espaçada traz de volta o que você está prestes a esquecer.')),
      h('span', { class: 'chev' }, '›')) : null,
    h('div', { class: 'home-grid' },
      h('div', {},
        h('h2', { class: 'section-title' }, 'Trilhas'),
        h('div', { class: 'course-grid' },
          COURSES.map((c) => {
            const p = courseProgress(c);
            return h('a', { class: 'course-card', href: `#/curso/${c.id}`, style: `--accent:${c.color}` },
              h('div', { class: 'course-icon' }, c.icon),
              h('h3', {}, c.title),
              h('p', { class: 'muted small' }, c.description),
              h('div', { class: 'progress' }, h('div', { class: 'bar', style: `width:${p.pct}%` })),
              h('div', { class: 'muted small' }, `${p.done} de ${p.total} lições · ${c.units.length} unidades`),
            );
          }),
        ),
      ),
      h('div', {}, h('h2', { class: 'section-title' }, 'Hoje'), missionsCard()),
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

  page('home',
    h('a', { class: 'back', href: '#/' }, '← Trilhas'),
    h('h1', {}, course.icon, ' ', course.title),
    h('div', { class: 'path', style: `--accent:${course.color}` },
      course.units.map((unit, ui) => {
        const unitDone = unit.lessons.every((l) => s.completed[l.id]);
        const unitOpen = lessonUnlocked(course, unit.lessons[0].id);
        const cp = s.checkpoints[unit.id];
        return h('section', { class: 'unit' },
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
              return h('div', { class: 'node-wrap', style: `--x:${offset}px` },
                isCurrent ? h('div', { class: 'start-bubble' }, 'COMEÇAR') : null,
                h('button', {
                  class: `node ${done ? 'done' : ''} ${isCurrent ? 'current' : ''} ${unlocked ? '' : 'locked'}`,
                  disabled: !unlocked,
                  'aria-label': lesson.title,
                  onclick: () => { location.hash = `#/licao/${lesson.id}`; },
                }, done ? '★' : unlocked ? '▶' : '🔒'),
                h('div', { class: 'node-label' }, lesson.title,
                  h('span', { class: 'muted small' }, done ? ` · ${'★'.repeat(done.stars)}${'☆'.repeat(3 - done.stars)}` : ` · ${exercises} exercícios`)),
              );
            }),
            h('div', { class: 'node-wrap' },
              h('button', {
                class: `node checkpoint ${cp ? 'done' : ''} ${unitOpen ? '' : 'locked'}`,
                disabled: !unitOpen,
                'aria-label': 'Checkpoint da unidade',
                onclick: () => startCheckpoint(unit.id),
              }, '🏁'),
              h('div', { class: 'node-label' }, 'Checkpoint',
                h('span', { class: 'muted small' }, cp ? ` · ${Math.round(cp.score * 100)}%` : unitDone ? ' · teste a unidade toda' : ' · acerte 80% e pule a unidade')),
            ),
          ),
        );
      }),
    ),
  );
}

// ─────────────────────────────────────────── EDITOR E TABELAS
function codeEditor(value, lang, onRun) {
  const ta = h('textarea', { class: 'editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-label': `Editor ${lang}` });
  ta.value = value;
  const resize = () => { ta.style.height = 'auto'; ta.style.height = Math.max(120, ta.scrollHeight + 4) + 'px'; };
  ta.addEventListener('input', resize);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = lang === 'python' ? '    ' : '  ';
      ta.setRangeText(indent, ta.selectionStart, ta.selectionEnd, 'end');
      resize();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onRun?.();
    }
  });
  requestAnimationFrame(resize);
  // barra de símbolos para o teclado do celular
  const symbols = lang === 'sql' ? ['*', ',', "'", '(', ')', '=', '<', '>', ';', '%', '_'] : ['(', ')', '[', ']', '"', ':', '=', '.', '_', '{', '}', '#', '    '];
  const kb = h('div', { class: 'symbol-bar' }, symbols.map((sym) => h('button', {
    type: 'button',
    onmousedown: (e) => e.preventDefault(),
    onclick: () => { ta.focus(); ta.setRangeText(sym, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); },
  }, sym === '    ' ? '⇥' : sym)));
  const wrap = h('div', { class: 'editor-wrap' }, ta, kb);
  wrap.textarea = ta;
  return wrap;
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
  put(out);
  if (res.stdout) out.append(h('pre', { class: 'stdout' }, res.stdout));
  if (res.value?.kind === 'html') out.append(h('div', { class: 'table-wrap df', html: res.value.content }));
  if (res.value?.kind === 'text') out.append(h('pre', { class: 'stdout' }, res.value.content));
  for (const f of res.figures || []) out.append(h('img', { class: 'figure', src: `data:image/png;base64,${f}`, alt: 'Gráfico gerado' }));
  if (res.error) {
    out.append(h('pre', { class: 'error' }, res.error));
    const hint = friendlyPyError(res.error);
    if (hint) out.append(h('div', { class: 'hint-box', html: `💡 ${hint}` }));
  }
  if (!out.childNodes.length) out.append(h('div', { class: 'muted small' }, 'Executado sem saída. Use print() ou deixe uma expressão na última linha.'));
}

// ─────────────────────────────────────────── RENDERIZADORES DE PASSO
// Cada um devolve { el, check?: async () => resultado, solution?: () => void }
// resultado: { ok, error?, message?, hint?, explanation? }

let footerReady = () => {};

const renderers = {
  theory(step) {
    return { el: h('div', { class: 'step theory' }, h('h2', {}, step.title), h('div', { class: 'md', html: renderMarkdown(step.md) })) };
  },

  quiz(step) {
    let selected = null;
    const shuffled = shuffle(step.options.map((o, i) => ({ o, i })));
    const buttons = shuffled.map(({ o, i }, k) => h('button', {
      class: 'option',
      onclick: (e) => {
        selected = i;
        buttons.forEach((b) => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        footerReady(true);
      },
    }, h('span', { class: 'key' }, k + 1), h('span', { html: inline(o) })));
    const lang = /\b(import|def|print|pd\.)\b/.test(step.code) ? 'python' : 'sql';
    return {
      el: h('div', { class: 'step' },
        h('div', { class: 'eyebrow' }, step.code ? '📖 Leia o código' : 'Escolha a resposta correta'),
        h('h2', { html: inline(step.question) }),
        step.code ? h('pre', { class: 'code' }, h('code', { html: highlight(step.code, lang) })) : null,
        h('div', { class: 'options' }, buttons),
      ),
      onKey: (key) => buttons[Number(key) - 1]?.click(),
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
      put(answerEl, answer.map((tok) => h('button', { class: 'chip', onclick: () => { answer.splice(answer.indexOf(tok), 1); draw(); } }, tok.t)));
      put(bankEl, bank.map((tok) => h('button', { class: 'chip', disabled: answer.includes(tok), onclick: () => { answer.push(tok); draw(); } }, tok.t)));
      footerReady(answer.length > 0);
    };
    draw();
    return {
      el: h('div', { class: 'step' }, h('div', { class: 'eyebrow' }, 'Monte a resposta'), h('h2', { html: inline(step.prompt) }), answerEl, bankEl),
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
        const inp = h('input', { class: 'blank', size: Math.max(4, ...step.blanks[i].map((b) => b.length)), autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off', autocorrect: 'off' });
        inp.addEventListener('input', () => footerReady(inputs.every((x) => x.value.trim())));
        inputs.push(inp);
        code.append(inp);
      }
    });
    setTimeout(() => inputs[0]?.focus(), 50);
    return {
      el: h('div', { class: 'step' }, h('div', { class: 'eyebrow' }, 'Complete as lacunas'), h('h2', { html: inline(step.prompt) }), code),
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
      put(out, h('div', { class: 'muted small' }, 'Executando...'));
      const db = await freshDb();
      try {
        put(out, resultTable(runQuery(db, editor.value)));
      } catch (e) {
        const hint = friendlySqlError(e.message);
        put(out, h('pre', { class: 'error' }, `Erro: ${e.message}`), hint ? h('div', { class: 'hint-box', html: `💡 ${hint}` }) : null);
      } finally {
        db.close();
      }
    };
    const wrap = codeEditor(step.starter, 'sql', run);
    const editor = wrap.textarea;
    editor.addEventListener('input', () => footerReady(editor.value.trim().length > 0));
    initSql(); // pré-carrega
    const hint = step.hint ? h('details', { class: 'hint' }, h('summary', {}, '💡 Dica'), h('div', { html: inline(step.hint) })) : null;
    setTimeout(() => footerReady(editor.value.trim().length > 0), 50);
    return {
      el: h('div', { class: 'step code-step' },
        h('div', { class: 'eyebrow' }, step.kind === 'debug' ? '🐞 Encontre e corrija o bug' : '🗄️ Escreva a query', step.ordered ? h('span', { class: 'pill' }, 'a ordem importa') : null),
        h('h2', { html: inline(step.prompt) }),
        schemaPanel(),
        hint,
        wrap,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: run }, '▶ Executar'),
          h('span', { class: 'muted small hide-mobile' }, 'Ctrl+Enter executa'),
        ),
        out,
      ),
      code: true,
      check: async () => {
        const SQL = await initSql();
        const res = evaluateSql(() => createDb(SQL), step, editor.value);
        if (res.error) {
          put(out, h('pre', { class: 'error' }, res.reason), res.hint ? h('div', { class: 'hint-box', html: `💡 ${res.hint}` }) : null);
          return { ok: false, error: true };
        }
        put(out, h('div', { class: 'small strong' }, 'Seu resultado:'), resultTable(res.got));
        if (!res.ok) out.append(h('div', { class: 'small strong' }, 'Resultado esperado:'), resultTable(res.expected));
        return { ok: res.ok, message: res.reason, hint: res.hint };
      },
      solution: () => {
        editor.value = step.solution;
        editor.dispatchEvent(new Event('input'));
      },
    };
  },

  python(step) {
    const out = h('div', { class: 'output' });
    const status = (msg) => put(out, h('div', { class: 'muted small loading' }, msg));
    const run = async () => {
      status('Preparando o Python...');
      try {
        pythonOutput(out, await runPython({ setup: step.setup, code: editor.value, packages: step.packages, onStatus: status }));
      } catch (e) {
        put(out, h('pre', { class: 'error' }, e.message));
      }
    };
    const wrap = codeEditor(step.starter, 'python', run);
    const editor = wrap.textarea;
    editor.addEventListener('input', () => footerReady(editor.value.trim().length > 0));
    const hint = step.hint ? h('details', { class: 'hint' }, h('summary', {}, '💡 Dica'), h('div', { html: inline(step.hint) })) : null;
    const setupView = step.setup ? h('details', { class: 'schema' }, h('summary', {}, '📦 Dados já carregados'), h('pre', { class: 'code' }, h('code', { html: highlight(step.setup.trim(), 'python') }))) : null;
    setTimeout(() => footerReady(editor.value.trim().length > 0), 50);
    return {
      el: h('div', { class: 'step code-step' },
        h('div', { class: 'eyebrow' }, step.prompt.startsWith('🐞') ? '🐞 Encontre e corrija o bug' : '🐍 Escreva o código'),
        h('h2', { html: inline(step.prompt) }),
        setupView,
        hint,
        wrap,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', onclick: run }, '▶ Executar'),
          h('span', { class: 'muted small hide-mobile' }, 'Ctrl+Enter executa'),
        ),
        out,
      ),
      code: true,
      check: async () => {
        status('Verificando...');
        let res;
        try {
          res = await runPython({ setup: step.setup, code: editor.value, tests: step.tests, packages: step.packages, onStatus: status });
        } catch (e) {
          put(out, h('pre', { class: 'error' }, e.message));
          return { ok: false, error: true };
        }
        pythonOutput(out, res);
        if (res.error) return { ok: false, error: true };
        if (res.testError) return { ok: false, message: esc(res.testError), hint: friendlyPyError(res.testError) };
        return { ok: true };
      },
      solution: () => {
        editor.value = step.solution;
        editor.dispatchEvent(new Event('input'));
      },
    };
  },
};

// ─────────────────────────────────────────── PLAYER DE SESSÃO
// items: [{ step, lessonId, stepIndex }]
// mode: 'lesson' (perde vidas) | 'practice' | 'review' | 'srs' | 'checkpoint' | 'interview'
let activeSession = null;
let keyHandler = null;

function startSession({ title, items, mode, lessonId, unitId, interview, backHref }) {
  const s = store.getState();
  if (mode === 'lesson' && s.hearts <= 0) return noHearts(backHref);

  const queue = [...items];
  const totalExercises = items.filter((it) => EXERCISE_TYPES.has(it.step.type)).length;
  const failedOnce = new Set();
  let completedCount = 0;
  let mistakes = 0;
  let correctCount = 0;
  const startedAt = Date.now();
  let timerId = null;

  const progressBar = h('div', { class: 'bar' });
  const sideInfo = h('span', { class: 'hearts-count' });
  const body = h('div', { class: 'session-body' });
  const footer = h('footer', { class: 'session-footer' });

  const exit = () => {
    if (completedCount === 0 || confirm('Sair agora? O progresso desta sessão será perdido.')) {
      clearInterval(timerId);
      activeSession = null;
      location.hash = backHref;
    }
  };
  activeSession = { exit };

  const updateHeader = () => {
    progressBar.style.width = `${Math.round((100 * completedCount) / items.length)}%`;
    if (mode === 'lesson') sideInfo.textContent = `❤️ ${store.getState().hearts}`;
    else if (mode === 'interview') sideInfo.textContent = `⏱ ${fmtTime(Math.round((Date.now() - startedAt) / 1000))}`;
    else sideInfo.textContent = { review: '🔁 revisão', srs: '🧠 revisão', checkpoint: '🏁 checkpoint', practice: '🎯 prática' }[mode];
  };
  if (mode === 'interview') timerId = setInterval(updateHeader, 1000);

  app.replaceChildren(h('div', { class: 'session' },
    h('div', { class: 'session-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Sair', onclick: exit }, '✕'),
      h('div', { class: 'progress big' }, progressBar),
      sideInfo,
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
    put(body, h('div', { class: 'step-wrap' }, r.el));
    body.scrollTop = 0;

    const mainBtn = h('button', { class: 'btn primary' });
    const feedback = h('div', { class: 'feedback' });
    const extra = h('div', { class: 'footer-extra' });
    footer.className = 'session-footer';
    put(footer, h('div', { class: 'footer-inner' }, feedback, h('div', { class: 'footer-actions' }, extra, mainBtn)));

    const advance = () => {
      queue.shift();
      completedCount++;
      showStep();
    };

    if (!r.check) {
      mainBtn.textContent = 'Continuar';
      footerReady = () => {};
      mainBtn.onclick = advance;
      keyHandler = (e) => { if (e.key === 'Enter') advance(); };
      return;
    }

    mainBtn.textContent = 'Verificar';
    mainBtn.disabled = true;
    footerReady = (ready) => { if (mainBtn.textContent === 'Verificar') mainBtn.disabled = !ready; };
    keyHandler = (e) => {
      const tag = document.activeElement?.tagName;
      if (r.onKey && /^[1-9]$/.test(e.key) && tag !== 'TEXTAREA' && tag !== 'INPUT') r.onKey(e.key);
      if (e.key === 'Enter' && tag !== 'TEXTAREA' && !mainBtn.disabled) { e.preventDefault(); mainBtn.click(); }
    };

    const showSolutionBtn = () => put(extra, r.solution ? h('button', {
      class: 'btn ghost', onclick: () => { r.solution(); put(extra); if (!['review', 'interview'].includes(mode) && item.lessonId) store.recordMistake(item.lessonId, item.stepIndex); },
    }, 'Ver solução') : null);

    const check = async () => {
      mainBtn.disabled = true;
      mainBtn.textContent = 'Verificando...';
      const res = await r.check();
      attempts++;

      if (res.error) {
        // erro de sintaxe/execução: não penaliza
        mainBtn.textContent = 'Verificar';
        mainBtn.disabled = false;
        put(feedback, h('div', { class: 'fb-title warn' }, '⚠️ Seu código deu erro — corrija e verifique de novo (sem perder vida).'));
        if (attempts >= 2) showSolutionBtn();
        return;
      }

      const firstAttempt = !failedOnce.has(item);
      if (res.ok) {
        feedbackFx('success');
        if (firstAttempt) correctCount++;
        if (firstAttempt && mode !== 'interview') {
          store.recordAnswer({ lessonId: item.lessonId, stepIndex: item.stepIndex, type: item.step.type, correct: true, review: ['review', 'srs'].includes(mode) });
        }
        if (mode === 'review') { store.clearMistake(item.lessonId, item.stepIndex); store.gainHeart(1); }
        footer.className = 'session-footer good';
        put(feedback,
          h('div', { class: 'fb-title' }, pick(['Excelente!', 'Mandou bem!', 'Correto!', 'Perfeito!', 'Isso aí!'])),
          res.explanation ? h('div', { class: 'fb-text', html: inline(res.explanation) }) : null,
        );
        put(extra);
        mainBtn.textContent = 'Continuar';
        mainBtn.disabled = false;
        mainBtn.onclick = advance;
        keyHandler = (e) => { if (e.key === 'Enter' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); advance(); } };
        return;
      }

      // errou
      feedbackFx('error');
      if (firstAttempt && mode !== 'interview') store.recordAnswer({ lessonId: item.lessonId, stepIndex: item.stepIndex, type: item.step.type, correct: false });
      failedOnce.add(item);
      mistakes++;
      if (!['review', 'interview'].includes(mode) && item.lessonId) store.recordMistake(item.lessonId, item.stepIndex);
      if (mode === 'lesson') store.loseHeart();
      updateHeader();
      footer.className = 'session-footer bad';
      put(feedback,
        h('div', { class: 'fb-title' }, 'Não foi dessa vez'),
        res.message ? h('div', { class: 'fb-text', html: res.message }) : null,
        res.hint ? h('div', { class: 'fb-text hint-line', html: `💡 ${res.hint}` }) : null,
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
        if (mode !== 'checkpoint') showSolutionBtn();
        mainBtn.textContent = mode === 'checkpoint' ? 'Continuar' : 'Tentar de novo';
        mainBtn.disabled = false;
        mainBtn.onclick = mode === 'checkpoint' ? advance : () => {
          footer.className = 'session-footer';
          put(feedback);
          mainBtn.textContent = 'Verificar';
          mainBtn.onclick = check;
          mainBtn.disabled = false;
        };
      } else {
        // demais: o exercício volta para o fim da fila (no checkpoint, segue em frente)
        mainBtn.textContent = 'Continuar';
        mainBtn.disabled = false;
        mainBtn.onclick = mode === 'checkpoint' ? advance : () => { queue.push(queue.shift()); showStep(); };
      }
    };
    mainBtn.onclick = check;
  }

  function finish() {
    clearInterval(timerId);
    activeSession = null;
    footerReady = () => {};
    const secs = Math.round((Date.now() - startedAt) / 1000);
    const accuracy = totalExercises ? correctCount / totalExercises : 1;
    let xp = 0;
    let gems = 0;
    let stars = null;
    let headline = 'Prática concluída!';
    let subline = title;
    let passed = null;

    if (mode === 'lesson') {
      xp = 10 + totalExercises * 2 + (mistakes === 0 ? 5 : 0);
      gems = mistakes === 0 ? 10 : 5;
      stars = store.completeLesson(lessonId, mistakes);
      headline = 'Lição concluída!';
    } else if (mode === 'checkpoint') {
      passed = accuracy >= CHECKPOINT_PASS;
      headline = passed ? 'Checkpoint aprovado!' : 'Quase lá!';
      subline = passed ? 'A unidade inteira foi marcada como concluída.' : `Você precisa de ${Math.round(CHECKPOINT_PASS * 100)}% — tente de novo ou faça as lições.`;
      xp = passed ? 30 : 5 + correctCount;
      gems = passed ? 20 : 0;
      if (passed) {
        store.passCheckpoint(unitId, accuracy);
        findUnit(unitId).unit.lessons.forEach((l) => store.completeLesson(l.id, 1, { silent: true }));
      }
    } else if (mode === 'interview') {
      const prob = interview;
      const bonus = secs <= prob.minutes * 60;
      const first = store.solveInterview(prob.id, secs);
      xp = first ? { fácil: 20, médio: 30, difícil: 40 }[prob.level] + (bonus ? 10 : 0) : 5;
      gems = first ? 5 : 0;
      headline = bonus ? 'Contratado! Dentro do tempo ⏱' : 'Problema resolvido!';
      subline = `${prob.title} · tempo-alvo ${prob.minutes} min`;
    } else {
      xp = 5 + correctCount * 2;
    }
    store.addXp(xp);
    if (gems) store.addGems(gems);
    feedbackFx('finish');
    const missions = settleMissions();
    const awards = checkAchievements();

    app.replaceChildren(h('div', { class: 'finish' },
      h('div', { class: 'finish-emoji' }, passed === false ? '💪' : mistakes === 0 ? '🏆' : '🎉'),
      h('h1', {}, headline),
      h('p', { class: 'muted' }, subline),
      stars ? h('div', { class: 'stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)) : null,
      h('div', { class: 'finish-stats' },
        h('div', { class: 'fstat xp' }, h('span', {}, 'XP'), h('strong', {}, `+${xp}`)),
        h('div', { class: 'fstat acc' }, h('span', {}, 'Precisão'), h('strong', {}, `${Math.round(accuracy * 100)}%`)),
        h('div', { class: 'fstat time' }, h('span', {}, 'Tempo'), h('strong', {}, fmtTime(secs))),
        gems ? h('div', { class: 'fstat gem' }, h('span', {}, 'Gemas'), h('strong', {}, `+${gems}`)) : null,
      ),
      missions.length ? h('div', { class: 'unlocks' }, missions.map((m) => h('div', { class: 'unlock' }, `${m.icon} Missão cumprida: ${m.text} (+${MISSION_REWARD} 💎)`))) : null,
      awards.length ? h('div', { class: 'unlocks' }, awards.map((a) => h('div', { class: 'unlock award' }, `${a.icon} Conquista desbloqueada: `, h('strong', {}, a.title)))) : null,
      h('button', { class: 'btn primary', onclick: () => { location.hash = backHref; } }, 'Continuar'),
    ));
    keyHandler = (e) => { if (e.key === 'Enter') location.hash = backHref; };
  }

  showStep();
}

function noHearts(backHref) {
  footerReady = () => {};
  activeSession = null;
  const s = store.getState();
  app.replaceChildren(h('div', { class: 'finish' },
    h('div', { class: 'finish-emoji' }, '💔'),
    h('h1', {}, 'Suas vidas acabaram'),
    h('p', { class: 'muted' }, `Uma nova vida chega em ${store.minutesToNextHeart()} min. Recupere vidas revisando seus erros (cada acerto devolve 1 vida) ou use 30 gemas.`),
    h('div', { class: 'row center' },
      h('button', { class: 'btn primary', disabled: !s.mistakes.length, onclick: () => startPractice('review') }, '🔁 Revisar erros'),
      h('button', { class: 'btn ghost', disabled: s.gems < 30, onclick: () => { if (store.refillHearts()) { toast('❤️ Vidas recarregadas!'); location.hash = backHref; } } }, `💎 30 · Recarregar (${s.gems})`),
      h('button', { class: 'btn ghost', onclick: () => { location.hash = backHref; } }, 'Voltar'),
    ),
  ));
}

function startLesson(lessonId) {
  const found = findLesson(lessonId);
  if (!found) return viewHome();
  const { course, lesson } = found;
  if (!lessonUnlocked(course, lessonId)) { location.hash = `#/curso/${course.id}`; return; }
  const done = !!store.getState().completed[lessonId];
  const items = lesson.steps.map((step, stepIndex) => ({ step: done ? withVariant(step) : step, lessonId, stepIndex }));
  startSession({ title: lesson.title, items, mode: done ? 'practice' : 'lesson', lessonId, backHref: `#/curso/${course.id}` });
}

function startCheckpoint(unitId) {
  const { course, unit } = findUnit(unitId);
  const pool = unit.lessons.flatMap((l) => l.steps.map((step, stepIndex) => ({ step: withVariant(step), lessonId: l.id, stepIndex })))
    .filter((it) => EXERCISE_TYPES.has(it.step.type));
  // equilibra: no máximo 3 exercícios de código para o checkpoint não ficar longo demais
  const code = shuffle(pool.filter((it) => ['sql', 'python'].includes(it.step.type))).slice(0, 4);
  const rest = shuffle(pool.filter((it) => !['sql', 'python'].includes(it.step.type))).slice(0, 10 - code.length);
  startSession({ title: `Checkpoint: ${unit.title}`, items: shuffle([...code, ...rest]), mode: 'checkpoint', unitId, backHref: `#/curso/${course.id}` });
}

function startPractice(kind) {
  const s = store.getState();
  let items = [];
  if (kind === 'review') {
    items = s.mistakes.map((m) => itemFromRef(m.lessonId, m.stepIndex)).filter(Boolean).slice(-10);
  } else if (kind === 'srs') {
    items = store.dueCards().slice(0, 10).map((c) => itemFromRef(c.lessonId, c.stepIndex)).filter(Boolean);
  } else {
    // mistura: cards vencidos primeiro, depois exercícios das lições concluídas há mais tempo
    const due = store.dueCards().map((c) => itemFromRef(c.lessonId, c.stepIndex)).filter(Boolean);
    const done = Object.entries(s.completed).sort((a, b) => a[1].at - b[1].at).map(([id]) => id);
    const pool = [];
    for (const id of (done.length ? done : [allLessons(COURSES[0])[0].id])) {
      findLesson(id)?.lesson.steps.forEach((step, stepIndex) => { if (EXERCISE_TYPES.has(step.type)) pool.push({ step, lessonId: id, stepIndex }); });
    }
    const seen = new Set(due.map((d) => `${d.lessonId}#${d.stepIndex}`));
    items = [...due.slice(0, 4), ...shuffle(pool.slice(0, 80)).filter((p) => !seen.has(`${p.lessonId}#${p.stepIndex}`))].slice(0, 8);
  }
  if (!items.length) { toast('Nada para revisar agora 🎉'); location.hash = '#/praticar'; return; }
  items = items.map((it) => ({ ...it, step: withVariant(it.step) }));
  startSession({ title: { review: 'Revisão de erros', srs: 'Revisão espaçada' }[kind] || 'Prática rápida', items, mode: kind === 'mix' ? 'practice' : kind, backHref: '#/praticar' });
}

// ─────────────────────────────────────────── PRATICAR
function viewPractice() {
  const s = store.getState();
  const due = store.dueCards().length;
  const units = COURSES.flatMap((c) => c.units.map((u) => ({ c, u, strength: store.srsStrength(u.lessons.map((l) => l.id)), started: u.lessons.some((l) => s.completed[l.id]) })));

  page('practice',
    h('h1', {}, '🎯 Praticar'),
    h('div', { class: 'practice-grid' },
      h('button', { class: 'practice-card', disabled: !due, onclick: () => startPractice('srs') },
        h('span', { class: 'big' }, '🧠'), h('strong', {}, `Revisão espaçada (${due})`), h('span', { class: 'muted small' }, 'O que está na hora de relembrar')),
      h('button', { class: 'practice-card', onclick: () => startPractice('mix') },
        h('span', { class: 'big' }, '⚡'), h('strong', {}, 'Prática rápida'), h('span', { class: 'muted small' }, '8 exercícios variados das suas lições')),
      h('button', { class: 'practice-card', disabled: !s.mistakes.length, onclick: () => startPractice('review') },
        h('span', { class: 'big' }, '🔁'), h('strong', {}, `Revisar erros (${s.mistakes.length})`), h('span', { class: 'muted small' }, 'Cada acerto devolve 1 vida')),
      h('a', { class: 'practice-card', href: '#/playground' },
        h('span', { class: 'big' }, '🧪'), h('strong', {}, 'Playground'), h('span', { class: 'muted small' }, 'SQL e Python livres')),
    ),
    h('h2', { class: 'section-title' }, 'Força por unidade'),
    h('p', { class: 'muted small' }, 'Baseada na revisão espaçada: cai quando os exercícios vencem ou quando você erra.'),
    h('div', { class: 'skills' }, units.filter((x) => x.started).length ? units.filter((x) => x.started).map(({ c, u, strength }) => h('div', { class: 'skill' },
      h('span', { class: 'skill-name' }, `${c.icon} ${u.title}`),
      h('div', { class: 'progress thin' }, h('div', { class: 'bar', style: `width:${Math.round(strength * 100)}%;background:${strength > 0.7 ? 'var(--green)' : strength > 0.4 ? 'var(--orange)' : 'var(--red)'}` })),
    )) : h('p', { class: 'muted' }, 'Faça algumas lições para ver suas habilidades aqui.')),
  );
}

// ─────────────────────────────────────────── ENTREVISTA
function viewInterview() {
  const s = store.getState();
  const solved = INTERVIEW.filter((p) => s.interview[p.id]).length;
  page('interview',
    h('h1', {}, '💼 Modo entrevista'),
    h('p', { class: 'muted' }, `Problemas clássicos de processos seletivos para analista de dados, com cronômetro. Resolva dentro do tempo-alvo para ganhar bônus. ${solved}/${INTERVIEW.length} resolvidos.`),
    ['fácil', 'médio', 'difícil'].map((level) => h('section', {},
      h('h2', { class: 'section-title' }, { fácil: '🟢 Fácil', médio: '🟡 Médio', difícil: '🔴 Difícil' }[level]),
      h('div', { class: 'iv-list' }, INTERVIEW.filter((p) => p.level === level).map((p) => {
        const st = s.interview[p.id];
        return h('button', { class: `iv-item ${st ? 'solved' : ''}`, onclick: () => startSession({ title: p.title, items: [{ step: p.step }], mode: 'interview', interview: p, backHref: '#/entrevista' }) },
          h('span', { class: 'iv-icon' }, st ? '✅' : p.step.type === 'sql' ? '🗄️' : '🐍'),
          h('span', { class: 'iv-title' }, p.title),
          h('span', { class: 'muted small' }, st ? `melhor: ${fmtTime(st.bestSecs)}` : `alvo: ${p.minutes} min`),
        );
      })),
    )),
  );
}

// ─────────────────────────────────────────── CONQUISTAS
function viewAchievements() {
  const s = store.getState();
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  page('awards',
    h('h1', {}, '🏆 Conquistas'),
    h('p', { class: 'muted' }, `${got} de ${ACHIEVEMENTS.length} desbloqueadas`),
    h('div', { class: 'awards' }, ACHIEVEMENTS.map((a) => {
      const at = s.achievements[a.id];
      return h('div', { class: `award-card ${at ? 'got' : ''}` },
        h('div', { class: 'award-icon' }, at ? a.icon : '🔒'),
        h('strong', {}, a.title),
        h('span', { class: 'muted small' }, a.desc),
        at ? h('span', { class: 'small ok-text' }, new Date(at).toLocaleDateString('pt-BR')) : null,
      );
    })),
  );
}

// ─────────────────────────────────────────── PLAYGROUND
function viewPlayground(tab = 'sql') {
  const out = h('div', { class: 'output' });
  let editor;
  const runSql = async () => {
    const db = await freshDb();
    try {
      const results = db.exec(editor.value);
      put(out, results.length ? results.map(resultTable) : h('div', { class: 'muted small' }, 'Comando executado (sem linhas retornadas).'));
    } catch (e) {
      const hint = friendlySqlError(e.message);
      put(out, h('pre', { class: 'error' }, `Erro: ${e.message}`), hint ? h('div', { class: 'hint-box', html: `💡 ${hint}` }) : null);
    } finally {
      db.close();
    }
  };
  const runPy = async () => {
    const status = (m) => put(out, h('div', { class: 'muted small loading' }, m));
    try {
      pythonOutput(out, await runPython({ code: editor.value, onStatus: status }));
    } catch (e) {
      put(out, h('pre', { class: 'error' }, e.message));
    }
  };
  const run = tab === 'sql' ? runSql : runPy;
  const wrap = codeEditor(tab === 'sql'
    ? "-- O banco da DataShop é recriado a cada execução\nSELECT categoria, COUNT(*) AS produtos, ROUND(AVG(preco), 2) AS preco_medio\nFROM produtos\nGROUP BY categoria\nORDER BY preco_medio DESC;"
    : 'import pandas as pd\nimport matplotlib.pyplot as plt\n\ndf = pd.DataFrame({"mes": ["jan", "fev", "mar", "abr"], "receita": [8987, 5747, 8395, 4185]})\ndf.plot(x="mes", y="receita", kind="bar", legend=False, title="Receita mensal")\ndf.describe()',
  tab, () => run());
  editor = wrap.textarea;

  page('practice',
    h('a', { class: 'back', href: '#/praticar' }, '← Praticar'),
    h('h1', {}, '🧪 Playground'),
    h('div', { class: 'tabs' },
      h('a', { class: `tab ${tab === 'sql' ? 'active' : ''}`, href: '#/playground/sql' }, 'SQL'),
      h('a', { class: `tab ${tab === 'python' ? 'active' : ''}`, href: '#/playground/python' }, 'Python'),
    ),
    tab === 'sql' ? schemaPanel() : h('p', { class: 'muted small' }, 'Bibliotecas disponíveis offline: pandas, NumPy, matplotlib, BeautifulSoup, sqlite3. Na versão web, outras (SciPy, scikit-learn...) são baixadas sob demanda.'),
    wrap,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: run }, '▶ Executar'), h('span', { class: 'muted small hide-mobile' }, 'Ctrl+Enter')),
    out,
  );
}

// ─────────────────────────────────────────── PERFIL
function viewProfile() {
  const s = store.getState();
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = store.today(new Date(Date.now() - i * 86400000));
    days.push({ d, xp: s.history[d] || 0 });
  }
  const level = (xp) => (xp === 0 ? 0 : xp < 20 ? 1 : xp < 50 ? 2 : xp < 100 ? 3 : 4);
  const totalLessons = COURSES.reduce((a, c) => a + allLessons(c).length, 0);
  const accuracy = s.totals.answered ? Math.round((100 * s.totals.correct) / s.totals.answered) : 0;
  const set = settings();
  const r = s.reminder;
  const backupBox = h('div', { class: 'backup' });

  const toggle = (label, value, onchange) => h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked: value, onchange: (e) => onchange(e.target.checked) }), h('span', {}, label));

  page('profile',
    h('h1', {}, '👤 Seu progresso'),
    h('div', { class: 'profile-stats' },
      h('div', { class: 'pstat' }, h('strong', {}, `🔥 ${s.streak}`), h('span', {}, `ofensiva · recorde ${s.bestStreak}`)),
      h('div', { class: 'pstat' }, h('strong', {}, `⚡ ${s.xp}`), h('span', {}, 'XP total')),
      h('div', { class: 'pstat' }, h('strong', {}, `📚 ${Object.keys(s.completed).length}/${totalLessons}`), h('span', {}, 'lições')),
      h('div', { class: 'pstat' }, h('strong', {}, `🎯 ${accuracy}%`), h('span', {}, `precisão · ${s.totals.answered} respostas`)),
    ),
    h('h2', { class: 'section-title' }, 'Atividade (últimas 12 semanas)'),
    h('div', { class: 'heatmap' }, days.map((d) => h('div', { class: `cell l${level(d.xp)}`, title: `${d.d}: ${d.xp} XP` }))),

    h('h2', { class: 'section-title' }, '💎 Loja'),
    h('p', { class: 'muted small' }, `Você tem ${s.gems} gemas. Ganhe gemas concluindo lições, missões e checkpoints.`),
    h('div', { class: 'shop' },
      h('div', { class: 'shop-item' },
        h('span', { class: 'big' }, '🧊'),
        h('div', {}, h('strong', {}, 'Protetor de ofensiva'), h('div', { class: 'muted small' }, `Salva sua ofensiva se você ficar um dia sem praticar. Você tem ${s.freezes}/${store.MAX_FREEZES}.`)),
        h('button', { class: 'btn ghost', disabled: s.gems < store.FREEZE_PRICE || s.freezes >= store.MAX_FREEZES, onclick: () => { if (store.buyFreeze()) { toast('🧊 Protetor comprado!'); viewProfile(); } } }, `💎 ${store.FREEZE_PRICE}`),
      ),
      h('div', { class: 'shop-item' },
        h('span', { class: 'big' }, '❤️'),
        h('div', {}, h('strong', {}, 'Recarregar vidas'), h('div', { class: 'muted small' }, `Volta para ${store.MAX_HEARTS} vidas agora.`)),
        h('button', { class: 'btn ghost', disabled: s.gems < 30 || s.hearts >= store.MAX_HEARTS, onclick: () => { if (store.refillHearts()) { toast('❤️ Vidas recarregadas!'); viewProfile(); } } }, '💎 30'),
      ),
    ),

    h('h2', { class: 'section-title' }, 'Meta diária'),
    h('div', { class: 'row' }, [10, 30, 50, 100].map((g) => h('button', {
      class: `btn ${s.dailyGoal === g ? 'primary' : 'ghost'}`,
      onclick: () => { store.setDailyGoal(g); viewProfile(); },
    }, `${g} XP`))),

    h('h2', { class: 'section-title' }, '⚙️ Preferências'),
    h('div', { class: 'settings' },
      toggle('Sons', set.sound, (v) => { set.sound = v; store.save(); }),
      toggle('Vibração', set.haptics, (v) => { set.haptics = v; store.save(); }),
      platform.remindersSupported() ? h('div', { class: 'reminder' },
        toggle('Lembrete diário', r.enabled, async (v) => {
          const ok = await platform.scheduleReminder({ ...r, enabled: v });
          store.setReminder({ enabled: v && ok });
          if (v && !ok) toast('Permita as notificações do DataLingo nas configurações do sistema.', 'bad');
          else if (v) toast(`🔔 Lembrete às ${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`);
          viewProfile();
        }),
        h('input', {
          type: 'time', value: `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`,
          onchange: async (e) => {
            const [hh, mm] = e.target.value.split(':').map(Number);
            store.setReminder({ hour: hh, minute: mm });
            if (store.getState().reminder.enabled) await platform.scheduleReminder(store.getState().reminder);
          },
        }),
        platform.isAndroid() ? null : h('span', { class: 'muted small' }, '(no computador, o aviso aparece com o app aberto)'),
      ) : null,
    ),

    h('h2', { class: 'section-title' }, '🔄 Backup e sincronização'),
    h('p', { class: 'muted small' }, 'Leve seu progresso do celular para o computador (ou vice-versa): exporte o código em um aparelho e importe no outro.'),
    h('div', { class: 'row' },
      h('button', {
        class: 'btn ghost',
        onclick: async () => {
          const code = store.exportCode();
          const ta = h('textarea', { class: 'editor small-editor', readonly: true }, code);
          put(backupBox, ta);
          ta.select();
          try { await platform.copyText(code); toast('📋 Código copiado! Cole no outro aparelho.'); } catch { toast('Selecione e copie o código abaixo.'); }
        },
      }, 'Exportar'),
      h('button', {
        class: 'btn ghost',
        onclick: () => {
          const ta = h('textarea', { class: 'editor small-editor', placeholder: 'Cole aqui o código que começa com DL1:' });
          put(backupBox, ta, h('button', {
            class: 'btn primary',
            onclick: () => {
              try {
                if (!confirm('Substituir o progresso deste aparelho pelo do código?')) return;
                store.importCode(ta.value);
                toast('✅ Progresso importado!');
                viewProfile();
              } catch (e) { toast(esc(e.message), 'bad'); }
            },
          }, 'Importar progresso'));
        },
      }, 'Importar'),
    ),
    backupBox,

    h('div', { class: 'danger-zone' },
      h('button', { class: 'btn ghost danger', onclick: () => { if (confirm('Apagar todo o progresso?')) { store.resetProgress(); viewProfile(); } } }, 'Apagar progresso'),
      h('button', { class: 'btn ghost', onclick: unlockAll }, 'Desbloquear tudo (modo professor)'),
    ),
    h('p', { class: 'muted small center' }, `DataLingo · ${platform.platformName()}`),
  );
}

function unlockAll() {
  if (!confirm('Marcar todas as lições como concluídas (sem XP)? Útil para explorar o conteúdo.')) return;
  for (const c of COURSES) for (const l of allLessons(c)) if (!store.getState().completed[l.id]) store.completeLesson(l.id, 3, { silent: true });
  location.hash = '#/';
}

// ─────────────────────────────────────────── ROTEADOR
document.addEventListener('keydown', (e) => keyHandler?.(e));

function route() {
  keyHandler = null;
  footerReady = () => {};
  activeSession = null;
  const [, view, arg] = location.hash.replace(/^#/, '').split('/');
  switch (view) {
    case 'curso': return viewCourse(arg);
    case 'licao': return startLesson(arg);
    case 'praticar': return viewPractice();
    case 'entrevista': return viewInterview();
    case 'conquistas': return viewAchievements();
    case 'playground': return viewPlayground(arg || 'sql');
    case 'perfil': return viewProfile();
    default: return viewHome();
  }
}

// Android: o botão "voltar" sai da lição (com confirmação), volta de tela ou fecha o app na home.
platform.onBackButton(() => {
  if (activeSession) return activeSession.exit();
  if (!location.hash || location.hash === '#/') return platform.exitApp();
  history.back();
});

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
platform.styleStatusBar(darkQuery.matches);
darkQuery.addEventListener?.('change', (e) => platform.styleStatusBar(e.matches));
platform.startInAppReminderLoop(store.getState);
document.documentElement.dataset.platform = platform.platformName();

window.addEventListener('hashchange', route);
route();
