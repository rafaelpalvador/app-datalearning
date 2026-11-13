import { COURSES, findLesson, allLessons, TRACK_LEVELS, LEVEL_DESC } from './content/index.js';
import { INTERVIEW, INTERVIEW_SQL, INTERVIEW_PY, LEVELS } from './content/interview.js';
import { SCHEMA_DOC } from './content/datasets.js';
import { withVariant } from './content/helpers.js';
import * as store from './state.js';
import { renderMarkdown, inline, esc, highlight } from './markdown.js';
import { freshDb, runQuery, evaluateSql, initSql, createDb, friendlySqlError } from './engines/sql-engine.js';
import { runPython, friendlyPyError } from './engines/python-engine.js';
import { dailyMissions, settleMissions, checkAchievements, ACHIEVEMENTS, MISSION_REWARD } from './gamification.js';
import { askTutor, tutorMode, contextFromStep, isDemoRuntime } from './tutor.js';
import { icon } from './icons.js';
import * as platform from './platform.js';

export const APP_NAME = 'Datum';
const app = document.getElementById('app');
const EXERCISE_TYPES = new Set(['quiz', 'order', 'fill', 'sql', 'python']);
const CHECKPOINT_PASS = 0.8;
const IS_DEMO = !!window.DATALINGO_DEMO;

// ─────────────────────────────────────────── utilidades de DOM
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const put = (el, ...children) => el.replaceChildren(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
const ic = (name, size = 20, cls = '') => {
  const t = document.createElement('template');
  t.innerHTML = icon(name, size, cls);
  return t.content.firstChild;
};
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
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const trackVar = (courseId) => `var(--c-${courseId})`;
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ─────────────────────────────────────────── tema, feedback, toasts, diálogos
function applyTheme() {
  const t = store.getState().settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else if (!IS_DEMO) delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  platform.styleStatusBar(dark);
}

function feedbackFx(kind) {
  const s = store.getState().settings;
  if (s.haptics) platform.haptic(kind === 'error' ? 'error' : 'success');
  platform.sound(kind, s.sound);
}

const toastBox = h('div', { class: 'toasts', 'aria-live': 'polite' });
document.body.append(toastBox);
function toast(text, kind = '', iconName = 'check') {
  const t = h('div', { class: `toast ${kind}` }, ic(kind === 'bad' ? 'alert' : iconName, 18), h('span', {}, text));
  toastBox.append(t);
  setTimeout(() => t.classList.add('out'), 3600);
  setTimeout(() => t.remove(), 4100);
}

let keyHandler = null;
let overlayClose = null; // fecha o diálogo/gaveta aberto (Esc e botão voltar do Android)

function askConfirm(message, { ok = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    const prevKey = keyHandler;
    const close = (v) => { ov.remove(); keyHandler = prevKey; overlayClose = null; resolve(v); };
    const okBtn = h('button', { class: `btn ${danger ? 'danger-solid' : 'primary'}`, onclick: () => close(true) }, ok);
    const ov = h('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === ov) close(false); } },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': message },
        h('p', {}, message),
        h('div', { class: 'modal-actions' }, h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancelar'), okBtn),
      ));
    keyHandler = (e) => { if (e.key === 'Escape') close(false); if (e.key === 'Enter') { e.preventDefault(); close(true); } };
    overlayClose = () => close(false);
    document.body.append(ov);
    okBtn.focus();
  });
}

function showModal(title, body, actions = []) {
  const prevKey = keyHandler;
  const close = () => { ov.remove(); keyHandler = prevKey; overlayClose = null; };
  const ov = h('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === ov) close(); } },
    h('div', { class: 'modal wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'spread' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': 'Fechar', onclick: close }, ic('x'))),
      body,
      actions.length ? h('div', { class: 'modal-actions' }, actions.map((a) => h('button', { class: `btn ${a.primary ? 'primary' : ''}`, onclick: () => { close(); a.onclick(); } }, a.label))) : null,
    ));
  keyHandler = (e) => { if (e.key === 'Escape') close(); };
  overlayClose = close;
  document.body.append(ov);
  return close;
}

// ─────────────────────────────────────────── progresso e contagens
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
  return { done, total: list.length, pct: pct(done, list.length) };
}

const lessonCounts = (lesson) => ({
  theory: lesson.steps.filter((s) => s.type === 'theory').length,
  practice: lesson.steps.filter((s) => EXERCISE_TYPES.has(s.type)).length,
});

function courseCounts(course) {
  return allLessons(course).reduce((a, l) => {
    const c = lessonCounts(l);
    return { theory: a.theory + c.theory, practice: a.practice + c.practice, lessons: a.lessons + 1 };
  }, { theory: 0, practice: 0, lessons: 0 });
}

function findUnit(unitId) {
  for (const course of COURSES) {
    const unit = course.units.find((u) => u.id === unitId);
    if (unit) return { course, unit };
  }
  return null;
}

function itemFromRef(lessonId, stepIndex) {
  const f = findLesson(lessonId);
  const step = f?.lesson.steps[stepIndex];
  return step ? { step, lessonId, stepIndex, courseId: f.course.id } : null;
}

// Próxima lição: segue a trilha estudada mais recentemente.
function nextLesson() {
  const s = store.getState();
  const recent = Object.entries(s.completed).sort((a, b) => b[1].at - a[1].at)[0];
  const order = recent ? [findLesson(recent[0]).course, ...COURSES] : COURSES;
  for (const course of order) {
    const lesson = allLessons(course).find((l) => !s.completed[l.id]);
    if (lesson) {
      const unit = course.units.find((u) => u.id === lesson.unitId);
      return { course, unit, lesson };
    }
  }
  return null;
}

// ─────────────────────────────────────────── layout
const NAV = [
  { id: 'home', href: '#/', icon: 'home', label: 'Início' },
  { id: 'practice', href: '#/praticar', icon: 'target', label: 'Praticar' },
  { id: 'interview', href: '#/entrevistas', icon: 'briefcase', label: 'Entrevistas' },
  { id: 'doubts', href: '#/duvidas', icon: 'help', label: 'Dúvidas' },
  { id: 'awards', href: '#/conquistas', icon: 'trophy', label: 'Conquistas', desktopOnly: true },
  { id: 'profile', href: '#/perfil', icon: 'user', label: 'Perfil' },
];

function brand() {
  return h('a', { class: 'brand', href: '#/', 'aria-label': `${APP_NAME}, início` },
    h('span', { class: 'brand-mark' }, ic('chart', 18)), h('span', { class: 'brand-name' }, APP_NAME));
}

function levelMini() {
  const s = store.getState();
  const lv = store.levelInfo(s.xp);
  return h('a', { class: 'side-level', href: '#/perfil' },
    h('div', { class: 'spread' }, h('span', { class: 'eyebrow' }, `Nível ${lv.index}`), h('span', { class: 'small num', style: { color: 'var(--xp)' } }, `${s.xp} XP`)),
    h('div', { class: 'lvl-title' }, lv.title),
    h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: `${Math.round(lv.progress * 100)}%`, background: 'var(--xp)' } })),
    h('div', { class: 'tiny faint' }, lv.next ? `${lv.toNext} XP para ${lv.next}` : 'Nível máximo alcançado'),
  );
}

function sidebar(active) {
  const due = store.dueCards().length;
  return h('aside', { class: 'sidebar' },
    brand(),
    h('nav', { class: 'nav', 'aria-label': 'Navegação principal' }, NAV.map((n) => h('a', { href: n.href, class: n.id === active ? 'active' : '' },
      ic(n.icon, 19), n.label, n.id === 'practice' && due ? h('span', { class: 'badge brand' }, due) : null))),
    levelMini(),
  );
}

function topbar() {
  const s = store.getState();
  const lv = store.levelInfo(s.xp);
  return h('header', { class: 'topbar' }, brand(),
    h('a', { class: 'badge', href: '#/perfil', style: { gap: '6px' } }, h('span', { class: 'num' }, `Nv ${lv.index}`), h('span', { style: { color: 'var(--xp)' }, class: 'num' }, `${s.xp} XP`)));
}

function bottomNav(active) {
  return h('nav', { class: 'bottom-nav', 'aria-label': 'Navegação' },
    NAV.filter((n) => !n.desktopOnly).map((n) => h('a', { href: n.href, class: n.id === active ? 'active' : '' }, ic(n.icon, 21), h('span', {}, n.label))));
}

function demoBar() {
  if (!IS_DEMO) return null;
  return h('div', { class: 'demo-bar' },
    h('span', {}, h('strong', {}, 'Demonstração'), ' · o progresso mostrado é de exemplo'),
    h('button', {
      class: 'link-btn',
      onclick: async () => { if (await askConfirm('Começar do zero nesta demonstração?', { ok: 'Começar do zero' })) { store.resetProgress(); location.hash = '#/'; route(); } },
    }, 'Começar do zero'));
}

function page(active, ...children) {
  store.refresh();
  app.replaceChildren(
    h('div', { class: 'shell' },
      sidebar(active),
      h('div', { class: 'main-col' }, demoBar(), topbar(), h('main', { class: 'main' }, h('div', { class: 'container' }, ...children))),
    ),
    bottomNav(active),
  );
  window.scrollTo(0, 0);
}

const pageHead = (eyebrow, title, desc) => h('div', { class: 'page-head' }, eyebrow ? h('span', { class: 'eyebrow' }, eyebrow) : null, h('h1', {}, title), desc ? h('p', { class: 'muted' }, desc) : null);

// ─────────────────────────────────────────── INÍCIO
function missionsCard() {
  return h('section', { class: 'card' },
    h('div', { class: 'card-title' }, h('h3', {}, 'Missões de hoje'), h('span', { class: 'tiny faint' }, `+${MISSION_REWARD} XP cada`)),
    dailyMissions().map((m) => h('div', { class: `mission ${m.done ? 'done' : ''}` },
      h('span', { class: 'm-icon' }, ic(m.done ? 'check' : m.icon, 16)),
      h('div', {}, h('div', { class: 'small', style: { fontWeight: 600 } }, m.text), h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: `${pct(m.value, m.target)}%`, background: m.done ? 'var(--good)' : 'var(--ink)' } }))),
      h('span', { class: 'tiny faint num' }, `${m.value}/${m.target}`),
    )),
  );
}

function trackCard(c) {
  const p = courseProgress(c);
  const n = courseCounts(c);
  return h('a', { class: 'card track-card', href: `#/curso/${c.id}`, style: { '--track': trackVar(c.id) } },
    h('div', { class: 'spread' }, h('span', { class: 'track-icon' }, ic(c.icon, 21)), h('span', { class: 'small faint num' }, `${p.pct}%`)),
    h('div', { class: 'stack', style: { gap: '4px' } }, h('h3', {}, c.title), h('p', { class: 'small muted clamp-3' }, c.description)),
    h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: `${p.pct}%` } })),
    h('div', { class: 'track-meta' },
      h('span', {}, ic('layers', 14), '4 níveis'),
      h('span', {}, ic('book', 14), `${n.lessons} lições`),
      h('span', {}, ic('reader', 14), `${n.theory} teoria`),
      h('span', {}, ic('code', 14), `${n.practice} prática`)),
  );
}

function viewHome() {
  const s = store.getState();
  const goalPct = Math.min(100, pct(s.daily.xp, s.dailyGoal));
  const due = store.dueCards().length;
  const next = nextLesson();
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  page('home',
    h('div', { class: 'hello' },
      h('div', { class: 'page-head' }, h('span', { class: 'eyebrow' }, dateStr), h('h1', {}, s.xp === 0 ? 'Bem-vindo ao Datum' : 'Bom te ver de volta'),
        h('p', { class: 'muted' }, 'SQL, Python e estatística para dados: teoria curta, muita prática e correção na hora.')),
      h('div', { class: 'goal card flat', style: { padding: '12px 16px' } },
        h('div', { class: 'ring', style: { '--p': goalPct } }, h('span', {}, `${goalPct}%`)),
        h('div', {}, h('div', { class: 'small', style: { fontWeight: 600 } }, 'Meta do dia'), h('div', { class: 'small muted num' }, `${s.daily.xp} de ${s.dailyGoal} XP`))),
    ),
    h('div', { class: 'home-grid' },
      h('div', { class: 'stack', style: { gap: '20px' } },
        next ? h('section', { class: 'card continue', style: { '--track': trackVar(next.course.id) } },
          h('div', { class: 'stack', style: { gap: '6px' } },
            h('span', { class: 'track-chip' }, h('span', { class: 'dot' }), `${next.course.title} · Nível ${next.unit.level} · ${next.unit.title}`),
            h('h2', {}, next.lesson.title),
            h('span', { class: 'small faint' }, (() => { const c = lessonCounts(next.lesson); return `${c.theory} cards de teoria · ${c.practice} exercícios`; })())),
          h('a', { class: 'btn primary', href: `#/licao/${next.lesson.id}` }, s.xp ? 'Continuar' : 'Começar', ic('chevronRight', 18)))
          : h('section', { class: 'card' }, h('h2', {}, 'Você concluiu todas as trilhas'), h('p', { class: 'muted' }, 'Use a revisão espaçada e as entrevistas para manter tudo afiado.')),
        due ? h('a', { class: 'card review-banner', href: '#/praticar' },
          h('span', { class: 'ri' }, ic('brain', 22)),
          h('div', {}, h('div', { style: { fontWeight: 600 } }, `${due} exercício${due > 1 ? 's' : ''} para revisar hoje`), h('div', { class: 'small muted' }, 'A revisão espaçada traz de volta o que você está prestes a esquecer.')),
          ic('chevronRight', 20)) : null,
        h('div', { class: 'section' },
          h('div', { class: 'section-title' }, h('h2', {}, 'Trilhas')),
          h('div', { class: 'grid-3' }, COURSES.map(trackCard))),
      ),
      h('div', { class: 'stack', style: { gap: '20px' } },
        missionsCard(),
        h('a', { class: 'card review-banner', href: '#/entrevistas' },
          h('span', { class: 'ri', style: { background: 'var(--surface-2)', color: 'var(--ink)' } }, ic('briefcase', 22)),
          h('div', {}, h('div', { style: { fontWeight: 600 } }, 'Treino para entrevistas'), h('div', { class: 'small muted' }, `${INTERVIEW_SQL.length} de SQL e ${INTERVIEW_PY.length} de Python, de Júnior a Especialista.`)),
          ic('chevronRight', 20)),
        h('a', { class: 'card review-banner', href: '#/duvidas' },
          h('span', { class: 'ri', style: { background: 'var(--surface-2)', color: 'var(--ink)' } }, ic('help', 22)),
          h('div', {}, h('div', { style: { fontWeight: 600 } }, 'Tirar dúvidas'), h('div', { class: 'small muted' }, 'Busque em toda a teoria ou pergunte ao tutor.')),
          ic('chevronRight', 20)),
      ),
    ),
  );
}

// ─────────────────────────────────────────── TRILHA (programa)
function viewCourse(courseId) {
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) return viewHome();
  const s = store.getState();
  const list = allLessons(course);
  const currentId = list.find((l) => !s.completed[l.id])?.id;
  const p = courseProgress(course);
  const n = courseCounts(course);
  const unitCard = (unit, ui) => {
      const unitDone = unit.lessons.every((l) => s.completed[l.id]);
      const unitOpen = lessonUnlocked(course, unit.lessons[0].id);
      const cp = s.checkpoints[unit.id];
      const doneCount = unit.lessons.filter((l) => s.completed[l.id]).length;
      return h('section', { class: 'card unit', style: { '--track': trackVar(course.id) } },
        h('div', { class: 'unit-head' },
          h('span', { class: 'unit-num' }, String(ui + 1).padStart(2, '0')),
          h('div', {}, h('h3', {}, unit.title), h('p', { class: 'small muted' }, unit.description)),
          h('span', { class: 'small faint num' }, `${doneCount}/${unit.lessons.length}`)),
        unit.lessons.map((lesson) => {
          const done = s.completed[lesson.id];
          const unlocked = lessonUnlocked(course, lesson.id);
          const isCurrent = lesson.id === currentId;
          const c = lessonCounts(lesson);
          return h('button', {
            class: `lesson-row ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`,
            disabled: !unlocked,
            onclick: () => { location.hash = `#/licao/${lesson.id}`; },
          },
          h('span', { class: 'l-status' }, ic(done ? 'check' : unlocked ? 'play' : 'lock', 14)),
          h('div', {}, h('div', { class: 'l-title' }, lesson.title),
            h('div', { class: 'l-meta' }, h('span', {}, `${c.theory} teoria`), h('span', {}, `${c.practice} prática`), isCurrent ? h('span', { class: 'badge brand' }, 'próxima') : null)),
          done ? h('span', { class: 'stars', 'aria-label': `${done.stars} de 3 estrelas` }, [1, 2, 3].map((i) => h('span', { class: i <= done.stars ? '' : 'off' }, ic('star', 14)))) : h('span', {}),
          h('span', { class: 'chev' }, ic('chevronRight', 18)));
        }),
        h('button', { class: 'lesson-row checkpoint-row', disabled: !unitOpen, onclick: () => startCheckpoint(unit.id) },
          h('span', { class: 'l-status' }, ic(cp ? 'check' : 'flag', 14)),
          h('div', {}, h('div', { class: 'l-title' }, 'Checkpoint da unidade'),
            h('div', { class: 'l-meta' }, h('span', {}, cp ? `aprovado com ${Math.round(cp.score * 100)}%` : unitDone ? 'teste a unidade inteira' : 'acerte 80% e pule a unidade'))),
          h('span', {}), h('span', { class: 'chev' }, ic('chevronRight', 18))),
      );
    };

  page('home',
    h('a', { class: 'btn ghost sm', href: '#/', style: { alignSelf: 'flex-start' } }, ic('arrowLeft', 16), 'Início'),
    h('section', { class: 'course-head', style: { '--track': trackVar(course.id) } },
      h('span', { class: 'track-icon' }, ic(course.icon, 26)),
      h('div', { class: 'stack', style: { gap: '8px' } },
        h('h1', {}, course.title),
        h('p', { class: 'muted' }, course.description),
        h('div', { class: 'stat-row' },
          h('div', {}, h('strong', {}, '4'), h('span', {}, 'níveis')),
          h('div', {}, h('strong', {}, `${p.done}/${p.total}`), h('span', {}, 'lições')),
          h('div', {}, h('strong', {}, n.theory), h('span', {}, 'cards de teoria')),
          h('div', {}, h('strong', {}, n.practice), h('span', {}, 'exercícios práticos')),
          h('div', {}, h('strong', {}, `${p.pct}%`), h('span', {}, 'concluído'))),
        h('div', { class: 'progress lg' }, h('div', { class: 'bar', style: { width: `${p.pct}%` } })),
      ),
    ),
    TRACK_LEVELS.map((lv) => {
      const units = course.units.map((u, ui) => ({ u, ui })).filter(({ u }) => u.level === lv.id);
      if (!units.length) return null;
      const lessons = units.flatMap(({ u }) => u.lessons);
      const done = lessons.filter((l) => s.completed[l.id]).length;
      return h('section', { class: 'level-section', style: { '--track': trackVar(course.id) } },
        h('div', { class: 'level-title' },
          h('span', { class: 'level-badge' }, `Nível ${lv.id}`),
          h('div', { style: { minWidth: '0' } }, h('h2', {}, lv.name), h('p', { class: 'small muted' }, LEVEL_DESC[course.id][lv.id])),
          h('div', { class: 'level-prog' }, h('span', { class: 'small faint num' }, `${done}/${lessons.length}`), h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: `${pct(done, lessons.length)}%` } })))),
        units.map(({ u, ui }) => unitCard(u, ui)));
    }),
  );
}

// ─────────────────────────────────────────── EDITOR E TABELAS
function codeEditor(value, lang, onRun) {
  const ta = h('textarea', { class: 'editor', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-label': `Editor de ${lang === 'sql' ? 'SQL' : 'Python'}` });
  ta.value = value;
  const resize = () => { ta.style.height = 'auto'; ta.style.height = Math.max(130, ta.scrollHeight + 4) + 'px'; };
  ta.addEventListener('input', resize);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      ta.setRangeText(lang === 'python' ? '    ' : '  ', ta.selectionStart, ta.selectionEnd, 'end');
      resize();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onRun?.();
    }
  });
  requestAnimationFrame(resize);
  const symbols = lang === 'sql' ? ['*', ',', "'", '(', ')', '=', '<', '>', ';', '%', '_', '.'] : ['(', ')', '[', ']', '"', ':', '=', '.', '_', '{', '}', '#', '    '];
  const kb = h('div', { class: 'symbol-bar', 'aria-label': 'Símbolos' }, symbols.map((sym) => h('button', {
    type: 'button',
    onmousedown: (e) => e.preventDefault(),
    onclick: () => { ta.focus(); ta.setRangeText(sym, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); },
  }, sym === '    ' ? '⇥' : sym)));
  const wrap = h('div', { class: 'editor-wrap' }, ta, kb);
  wrap.textarea = ta;
  return wrap;
}

function resultTable(res) {
  if (!res.columns.length) return h('div', { class: 'small faint' }, 'Comando executado (sem linhas retornadas).');
  const max = 50;
  return h('div', {},
    h('div', { class: 'table-wrap' }, h('table', { class: 'result' },
      h('thead', {}, h('tr', {}, res.columns.map((c) => h('th', {}, c)))),
      h('tbody', {}, res.values.slice(0, max).map((r) => h('tr', {}, r.map((v) => h('td', { class: v === null ? 'null' : '' }, v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 100) / 100) : String(v)))))),
    )),
    h('div', { class: 'table-foot' }, `${res.values.length} linha(s)${res.values.length > max ? ` · mostrando ${max}` : ''}`),
  );
}

const hintBox = (html) => h('div', { class: 'hint-box' }, ic('lightbulb', 18), h('div', { html }));

function schemaPanel() {
  return h('details', { class: 'panel' },
    h('summary', {}, ic('database', 16), 'Esquema do banco'),
    h('div', { class: 'panel-body' }, h('ul', {}, SCHEMA_DOC.map((t) => h('li', {}, h('code', {}, t.tabela), ' ', t.colunas)))),
  );
}

function pythonOutput(out, res) {
  put(out);
  if (res.stdout) out.append(h('pre', { class: 'stdout' }, res.stdout));
  if (res.value?.kind === 'html') out.append(h('div', { class: 'table-wrap df', html: res.value.content }));
  if (res.value?.kind === 'text') out.append(h('pre', { class: 'stdout' }, res.value.content));
  for (const f of res.figures || []) out.append(h('img', { class: 'figure', src: `data:image/png;base64,${f}`, alt: 'Gráfico gerado pelo seu código' }));
  if (res.error) {
    out.append(h('pre', { class: 'error' }, res.error));
    const hint = friendlyPyError(res.error);
    if (hint) out.append(hintBox(hint));
  }
  if (!out.childNodes.length) out.append(h('div', { class: 'small faint' }, 'Executado sem saída. Use print() ou deixe uma expressão na última linha.'));
}

// ─────────────────────────────────────────── RENDERIZADORES DE PASSO
// Cada um devolve { el, check?, solution?, getCode?, onKey?, code? }
let footerReady = () => {};

const kindLabel = (text, extra = null) => h('div', { class: 'step-kind' }, text, extra);

const renderers = {
  theory(step) {
    return {
      el: h('div', { class: 'step theory' }, kindLabel([ic('reader', 15), 'Teoria']),
        h('div', { class: 'theory-card' }, h('div', { class: 'stack', style: { gap: '14px' } }, h('h2', {}, step.title), h('div', { class: 'md', html: renderMarkdown(step.md) })))),
    };
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
        kindLabel([ic(step.code ? 'eye' : 'list', 15), step.code ? 'Prática · Leitura de código' : 'Prática · Questão']),
        h('h2', { html: inline(step.question) }),
        step.code ? h('pre', { class: 'code' }, h('code', { html: highlight(step.code, lang) })) : null,
        h('div', { class: 'options' }, buttons)),
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
    const answerEl = h('div', { class: 'answer-line', 'aria-label': 'Sua resposta' });
    const bankEl = h('div', { class: 'bank' });
    const draw = () => {
      put(answerEl, answer.map((tok) => h('button', { class: 'chip', onclick: () => { answer.splice(answer.indexOf(tok), 1); draw(); } }, tok.t)));
      put(bankEl, bank.map((tok) => h('button', { class: 'chip', disabled: answer.includes(tok), onclick: () => { answer.push(tok); draw(); } }, tok.t)));
      footerReady(answer.length > 0);
    };
    draw();
    return {
      el: h('div', { class: 'step' }, kindLabel([ic('layers', 15), 'Prática · Montar a resposta']), h('h2', { html: inline(step.prompt) }), answerEl, bankEl),
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
        const inp = h('input', { class: 'blank', size: Math.max(4, ...step.blanks[i].map((b) => b.length)), autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off', autocorrect: 'off', 'aria-label': `Lacuna ${i + 1}` });
        inp.addEventListener('input', () => footerReady(inputs.every((x) => x.value.trim())));
        inputs.push(inp);
        code.append(inp);
      }
    });
    setTimeout(() => inputs[0]?.focus(), 50);
    return {
      el: h('div', { class: 'step' }, kindLabel([ic('code', 15), 'Prática · Completar']), h('h2', { html: inline(step.prompt) }), code),
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
      put(out, h('div', { class: 'small faint loading' }, 'Executando...'));
      const db = await freshDb();
      try {
        put(out, resultTable(runQuery(db, editor.value)));
      } catch (e) {
        const hint = friendlySqlError(e.message);
        put(out, h('pre', { class: 'error' }, `Erro: ${e.message}`), hint ? hintBox(hint) : null);
      } finally {
        db.close();
      }
    };
    const wrap = codeEditor(step.starter, 'sql', run);
    const editor = wrap.textarea;
    editor.addEventListener('input', () => footerReady(editor.value.trim().length > 0));
    initSql();
    setTimeout(() => footerReady(editor.value.trim().length > 0), 50);
    return {
      el: h('div', { class: 'step' },
        kindLabel([ic(step.kind === 'debug' ? 'bug' : 'database', 15), step.kind === 'debug' ? 'Prática · Encontre o bug' : 'Prática · SQL'], step.ordered ? h('span', { class: 'badge warn pill' }, 'a ordem importa') : null),
        h('h2', { html: inline(step.prompt) }),
        schemaPanel(),
        step.hint ? h('details', { class: 'panel' }, h('summary', {}, ic('lightbulb', 16), 'Dica'), h('div', { class: 'panel-body', html: inline(step.hint) })) : null,
        wrap,
        h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: run }, ic('play', 15), 'Executar'), h('span', { class: 'tiny faint hide-touch' }, 'Ctrl+Enter executa')),
        out),
      code: true,
      getCode: () => editor.value,
      check: async () => {
        const SQL = await initSql();
        const res = evaluateSql(() => createDb(SQL), step, editor.value);
        if (res.error) {
          put(out, h('pre', { class: 'error' }, res.reason), res.hint ? hintBox(res.hint) : null);
          return { ok: false, error: true, message: res.reason };
        }
        put(out, h('div', { class: 'small', style: { fontWeight: 600 } }, 'Seu resultado'), resultTable(res.got));
        if (!res.ok) out.append(h('div', { class: 'small', style: { fontWeight: 600 } }, 'Resultado esperado'), resultTable(res.expected));
        return { ok: res.ok, message: res.reason, hint: res.hint };
      },
      solution: () => { editor.value = step.solution; editor.dispatchEvent(new Event('input')); },
    };
  },

  python(step) {
    const out = h('div', { class: 'output' });
    const status = (msg) => put(out, h('div', { class: 'small faint loading' }, msg));
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
    const dataPanel = step.setup ? h('details', { class: 'panel' },
      h('summary', {}, ic('table', 16), 'Dados já carregados'),
      h('div', { class: 'panel-body' }, step.setupNote ? h('p', { html: inline(step.setupNote) }) : h('pre', { class: 'code' }, h('code', { html: highlight(step.setup.trim(), 'python') })))) : null;
    setTimeout(() => footerReady(editor.value.trim().length > 0), 50);
    return {
      el: h('div', { class: 'step' },
        kindLabel([ic(step.prompt.startsWith('🐞') ? 'bug' : 'code', 15), step.prompt.startsWith('🐞') ? 'Prática · Encontre o bug' : 'Prática · Python']),
        h('h2', { html: inline(step.prompt.replace(/^🐞\s*/, '')) }),
        dataPanel,
        step.hint ? h('details', { class: 'panel' }, h('summary', {}, ic('lightbulb', 16), 'Dica'), h('div', { class: 'panel-body', html: inline(step.hint) })) : null,
        wrap,
        h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: run }, ic('play', 15), 'Executar'), h('span', { class: 'tiny faint hide-touch' }, 'Ctrl+Enter executa · a 1ª execução prepara o Python')),
        out),
      code: true,
      getCode: () => editor.value,
      check: async () => {
        status('Verificando...');
        let res;
        try {
          res = await runPython({ setup: step.setup, code: editor.value, tests: step.tests, packages: step.packages, onStatus: status });
        } catch (e) {
          put(out, h('pre', { class: 'error' }, e.message));
          return { ok: false, error: true, message: e.message };
        }
        pythonOutput(out, res);
        if (res.error) return { ok: false, error: true, message: res.error };
        if (res.testError) return { ok: false, message: esc(res.testError), hint: friendlyPyError(res.testError) };
        return { ok: true };
      },
      solution: () => { editor.value = step.solution; editor.dispatchEvent(new Event('input')); },
    };
  },
};

// Remove marcas de emoji herdadas dos enunciados (ex.: 🐞) para o visual ficar limpo.
for (const c of COURSES) for (const u of c.units) for (const l of u.lessons) for (const s of l.steps) if (s.prompt) s.prompt = s.prompt.replace(/^🐞\s*/, s.type === 'python' ? '🐞 ' : '');

// ─────────────────────────────────────────── PLAYER DE SESSÃO
// items: [{ step, lessonId, stepIndex, courseId }]
// mode: 'lesson' | 'practice' | 'review' | 'srs' | 'checkpoint' | 'interview'
let activeSession = null;

function startSession({ title, items, mode, lessonId, unitId, interview, backHref }) {
  const queue = [...items];
  const totalExercises = items.filter((it) => EXERCISE_TYPES.has(it.step.type)).length;
  const failedOnce = new Set();
  const theorySeen = new Set();
  let completedCount = 0;
  let mistakes = 0;
  let correctCount = 0;
  const startedAt = Date.now();
  let timerId = null;
  let current = null;

  const progressBar = h('div', { class: 'bar' });
  const meta = h('span', { class: 'session-meta' });
  const body = h('div', { class: 'session-body' });
  const footer = h('footer', { class: 'session-footer' });

  const exit = async () => {
    if (completedCount === 0 || await askConfirm('Sair agora? O progresso desta sessão será perdido.', { ok: 'Sair', danger: true })) {
      clearInterval(timerId);
      activeSession = null;
      location.hash = backHref;
    }
  };
  activeSession = { exit };

  const updateHeader = () => {
    progressBar.style.width = `${pct(completedCount, items.length)}%`;
    meta.textContent = mode === 'interview' ? fmtTime(Math.round((Date.now() - startedAt) / 1000)) : `${Math.min(completedCount + 1, items.length)}/${items.length}`;
  };
  if (mode === 'interview') timerId = setInterval(updateHeader, 1000);

  const modeLabel = { lesson: null, practice: 'Prática', review: 'Revisão de erros', srs: 'Revisão espaçada', checkpoint: 'Checkpoint', interview: 'Entrevista' }[mode];
  app.replaceChildren(h('div', { class: 'session' },
    h('div', { class: 'session-top' },
      h('button', { class: 'icon-btn', 'aria-label': 'Sair', onclick: exit }, ic('x', 20)),
      h('div', { class: 'stack', style: { gap: '6px' } },
        h('div', { class: 'spread' }, h('span', { class: 'small', style: { fontWeight: 600 } }, title), modeLabel ? h('span', { class: 'tiny faint hide-sm' }, modeLabel) : null),
        h('div', { class: 'progress' }, progressBar)),
      meta,
      h('button', { class: 'btn sm', title: 'Tirar dúvida com o tutor', onclick: () => openTutorDrawer(current) }, ic('help', 16), h('span', { class: 'hide-sm' }, 'Dúvida')),
    ),
    body,
    footer,
  ));

  function showStep() {
    updateHeader();
    if (!queue.length) return finish();
    const item = queue[0];
    const r = renderers[item.step.type](item.step);
    current = { step: item.step, renderer: r, feedback: '' };
    let attempts = 0;
    put(body, h('div', { class: 'step-wrap' }, r.el));
    window.scrollTo(0, 0);

    const mainBtn = h('button', { class: 'btn primary' });
    const feedback = h('div', { class: 'feedback' });
    const extra = h('div', { class: 'row' });
    footer.className = 'session-footer';
    put(footer, h('div', { class: 'footer-inner' }, feedback, h('div', { class: 'footer-actions' }, extra, mainBtn)));

    const advance = () => {
      queue.shift();
      completedCount++;
      showStep();
    };

    if (!r.check) {
      mainBtn.append('Continuar', ic('chevronRight', 18));
      footerReady = () => {};
      const go = () => {
        if (!theorySeen.has(item)) { theorySeen.add(item); store.recordTheory(); }
        advance();
      };
      mainBtn.onclick = go;
      keyHandler = (e) => { if (e.key === 'Enter') go(); };
      return;
    }

    const setMain = (label, iconName) => { put(mainBtn, label, iconName ? ic(iconName, 18) : null); };
    setMain('Verificar');
    mainBtn.disabled = true;
    footerReady = (ready) => { if (mainBtn.dataset.state !== 'done') mainBtn.disabled = !ready; };
    keyHandler = (e) => {
      const tag = document.activeElement?.tagName;
      if (r.onKey && /^[1-9]$/.test(e.key) && tag !== 'TEXTAREA' && tag !== 'INPUT') r.onKey(e.key);
      if (e.key === 'Enter' && tag !== 'TEXTAREA' && !mainBtn.disabled) { e.preventDefault(); mainBtn.click(); }
    };

    const showSolutionBtn = () => put(extra, r.solution ? h('button', {
      class: 'btn ghost sm',
      onclick: () => { r.solution(); put(extra); if (!['review', 'interview'].includes(mode) && item.lessonId) store.recordMistake(item.lessonId, item.stepIndex); },
    }, ic('eye', 15), 'Ver solução') : null);
    const askBtn = () => h('button', { class: 'btn ghost sm', onclick: () => openTutorDrawer(current) }, ic('help', 15), 'Perguntar ao tutor');

    const check = async () => {
      mainBtn.disabled = true;
      setMain('Verificando...');
      const res = await r.check();
      attempts++;
      current.feedback = [res.message, res.hint].filter(Boolean).join(' ').replace(/<[^>]+>/g, '');

      if (res.error) {
        setMain('Verificar');
        mainBtn.disabled = false;
        put(feedback, h('div', { class: 'fb-title warn' }, ic('alert', 18), 'O código deu erro. Corrija e verifique de novo.'));
        put(extra, attempts >= 2 && r.solution ? h('button', { class: 'btn ghost sm', onclick: () => { r.solution(); put(extra); } }, ic('eye', 15), 'Ver solução') : null, askBtn());
        return;
      }

      const firstAttempt = !failedOnce.has(item);
      if (res.ok) {
        feedbackFx('success');
        if (firstAttempt) {
          correctCount++;
          store.recordAnswer({ lessonId: item.lessonId, stepIndex: item.stepIndex, type: item.step.type, correct: true, review: ['review', 'srs'].includes(mode), courseId: item.courseId });
        }
        if (mode === 'review') store.clearMistake(item.lessonId, item.stepIndex);
        footer.className = 'session-footer good';
        put(feedback,
          h('div', { class: 'fb-title' }, ic('circleCheck', 20), pick(['Correto', 'Muito bem', 'Exato', 'Perfeito'])),
          res.explanation ? h('div', { class: 'fb-text', html: inline(res.explanation) }) : null);
        put(extra);
        mainBtn.dataset.state = 'done';
        setMain('Continuar', 'chevronRight');
        mainBtn.className = 'btn good-solid';
        mainBtn.disabled = false;
        mainBtn.onclick = advance;
        keyHandler = (e) => { if (e.key === 'Enter' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); advance(); } };
        return;
      }

      feedbackFx('error');
      if (firstAttempt) store.recordAnswer({ lessonId: item.lessonId, stepIndex: item.stepIndex, type: item.step.type, correct: false, courseId: item.courseId });
      failedOnce.add(item);
      mistakes++;
      if (!['review', 'interview'].includes(mode) && item.lessonId) store.recordMistake(item.lessonId, item.stepIndex);
      footer.className = 'session-footer bad';
      put(feedback,
        h('div', { class: 'fb-title' }, ic('alert', 20), 'Ainda não'),
        res.message ? h('div', { class: 'fb-text', html: res.message }) : null,
        res.hint ? h('div', { class: 'fb-text hint-line', html: res.hint }) : null,
        res.explanation ? h('div', { class: 'fb-text', html: inline(res.explanation) }) : null);
      mainBtn.dataset.state = 'done';
      mainBtn.className = 'btn bad-solid';
      mainBtn.disabled = false;

      if (r.code) {
        put(extra, mode !== 'checkpoint' && r.solution ? h('button', {
          class: 'btn ghost sm',
          onclick: () => { r.solution(); put(extra, askBtn()); },
        }, ic('eye', 15), 'Ver solução') : null, askBtn());
        setMain(mode === 'checkpoint' ? 'Continuar' : 'Tentar de novo');
        mainBtn.onclick = mode === 'checkpoint' ? advance : () => {
          footer.className = 'session-footer';
          put(feedback);
          delete mainBtn.dataset.state;
          mainBtn.className = 'btn primary';
          setMain('Verificar');
          mainBtn.onclick = check;
        };
      } else {
        put(extra, askBtn());
        setMain('Continuar', 'chevronRight');
        // o exercício volta para o fim da fila (no checkpoint, segue em frente)
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
    let stars = null;
    let headline = 'Prática concluída';
    let subline = title;
    let passed = null;
    let conceptCard = null;
    let nextAction = null;

    if (mode === 'lesson') {
      xp = 10 + totalExercises * 2 + (mistakes === 0 ? 5 : 0);
      stars = store.completeLesson(lessonId, mistakes);
      headline = 'Lição concluída';
    } else if (mode === 'checkpoint') {
      passed = accuracy >= CHECKPOINT_PASS;
      headline = passed ? 'Checkpoint aprovado' : 'Quase lá';
      subline = passed ? 'A unidade inteira foi marcada como concluída.' : `É preciso acertar ${Math.round(CHECKPOINT_PASS * 100)}%. Revise as lições e tente de novo.`;
      xp = passed ? 30 : 5 + correctCount;
      if (passed) {
        store.passCheckpoint(unitId, accuracy);
        findUnit(unitId).unit.lessons.forEach((l) => store.completeLesson(l.id, 1, { silent: true }));
      }
    } else if (mode === 'interview') {
      const prob = interview;
      const inTime = secs <= prob.minutes * 60;
      const first = store.solveInterview(prob.id, secs);
      xp = first ? [0, 20, 30, 40, 50][prob.level] + (inTime ? 10 : 0) : 5;
      headline = inTime ? 'Resolvido dentro do tempo' : 'Problema resolvido';
      subline = `${prob.title} · tempo-alvo ${prob.minutes} min`;
      conceptCard = h('section', { class: 'card concept stack' },
        h('span', { class: 'eyebrow' }, 'Como pensar neste problema'),
        h('div', { class: 'md', html: renderMarkdown(prob.concept) }),
        h('details', { class: 'panel' }, h('summary', {}, ic('code', 16), 'Uma solução de referência'),
          h('div', { class: 'panel-body' }, h('pre', { class: 'code' }, h('code', { html: highlight(prob.step.solution, prob.step.type === 'sql' ? 'sql' : 'python') })))));
      const list = prob.step.type === 'sql' ? INTERVIEW_SQL : INTERVIEW_PY;
      const nxt = list.find((p) => p.level >= prob.level && p.id !== prob.id && !store.getState().interview[p.id]);
      if (nxt) nextAction = h('button', { class: 'btn', onclick: () => startInterview(nxt) }, 'Próximo problema', ic('chevronRight', 18));
    } else {
      xp = 5 + correctCount * 2;
    }
    const leveledUp = store.addXp(xp);
    feedbackFx('finish');
    const missions = settleMissions();
    const awards = checkAchievements();
    const lv = store.levelInfo(store.getState().xp);

    app.replaceChildren(h('div', { class: 'finish' }, h('div', { class: 'finish-card' },
      h('span', { class: 'eyebrow' }, modeLabel || 'Lição'),
      h('h1', {}, headline),
      h('p', { class: 'muted' }, subline),
      stars ? h('div', { class: 'stars', 'aria-label': `${stars} de 3 estrelas` }, [1, 2, 3].map((i) => h('span', { class: i <= stars ? '' : 'off' }, ic('star', 26)))) : null,
      h('div', { class: 'finish-stats' },
        h('div', { class: 'fstat' }, h('span', {}, 'XP ganho'), h('strong', { style: { color: 'var(--xp)' } }, `+${xp}`)),
        h('div', { class: 'fstat' }, h('span', {}, 'Precisão'), h('strong', {}, `${Math.round(accuracy * 100)}%`)),
        h('div', { class: 'fstat' }, h('span', {}, 'Tempo'), h('strong', {}, fmtTime(secs)))),
      leveledUp ? h('div', { class: 'unlock' }, ic('trend', 20), h('span', {}, 'Você subiu de nível: ', h('strong', {}, lv.title))) : null,
      missions.map((m) => h('div', { class: 'unlock' }, ic('check', 18), `Missão cumprida: ${m.text} (+${MISSION_REWARD} XP)`)),
      awards.map((a) => h('div', { class: 'unlock' }, ic(a.icon, 18), h('span', {}, 'Conquista: ', h('strong', {}, a.title)))),
      conceptCard,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { location.hash = backHref; } }, 'Continuar'), nextAction),
    )));
    window.scrollTo(0, 0);
    keyHandler = (e) => { if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') location.hash = backHref; };
  }

  showStep();
}

function startLesson(lessonId) {
  const found = findLesson(lessonId);
  if (!found) return viewHome();
  const { course, lesson } = found;
  if (!lessonUnlocked(course, lessonId)) { location.hash = `#/curso/${course.id}`; return; }
  const done = !!store.getState().completed[lessonId];
  const items = lesson.steps.map((step, stepIndex) => ({ step: done ? withVariant(step) : step, lessonId, stepIndex, courseId: course.id }));
  startSession({ title: lesson.title, items, mode: done ? 'practice' : 'lesson', lessonId, backHref: `#/curso/${course.id}` });
}

function startCheckpoint(unitId) {
  const { course, unit } = findUnit(unitId);
  const pool = unit.lessons.flatMap((l) => l.steps.map((step, stepIndex) => ({ step: withVariant(step), lessonId: l.id, stepIndex, courseId: course.id })))
    .filter((it) => EXERCISE_TYPES.has(it.step.type));
  const code = shuffle(pool.filter((it) => ['sql', 'python'].includes(it.step.type))).slice(0, 4);
  const rest = shuffle(pool.filter((it) => !['sql', 'python'].includes(it.step.type))).slice(0, 10 - code.length);
  startSession({ title: `Checkpoint · ${unit.title}`, items: shuffle([...code, ...rest]), mode: 'checkpoint', unitId, backHref: `#/curso/${course.id}` });
}

function startInterview(prob) {
  startSession({ title: prob.title, items: [{ step: prob.step, courseId: prob.step.type === 'sql' ? 'sql' : 'python' }], mode: 'interview', interview: prob, backHref: `#/entrevistas/${prob.step.type === 'sql' ? 'sql' : 'python'}` });
}

function startPractice(kind) {
  const s = store.getState();
  let items = [];
  if (kind === 'review') {
    items = s.mistakes.map((m) => itemFromRef(m.lessonId, m.stepIndex)).filter(Boolean).slice(-10);
  } else if (kind === 'srs') {
    items = store.dueCards().slice(0, 10).map((c) => itemFromRef(c.lessonId, c.stepIndex)).filter(Boolean);
  } else {
    const due = store.dueCards().map((c) => itemFromRef(c.lessonId, c.stepIndex)).filter(Boolean);
    const done = Object.entries(s.completed).sort((a, b) => a[1].at - b[1].at).map(([id]) => id);
    const pool = [];
    for (const id of (done.length ? done : [allLessons(COURSES[0])[0].id])) {
      findLesson(id)?.lesson.steps.forEach((step, stepIndex) => { if (EXERCISE_TYPES.has(step.type)) pool.push(itemFromRef(id, stepIndex)); });
    }
    const seen = new Set(due.map((d) => `${d.lessonId}#${d.stepIndex}`));
    items = [...due.slice(0, 4), ...shuffle(pool.slice(0, 80)).filter((p) => !seen.has(`${p.lessonId}#${p.stepIndex}`))].slice(0, 8);
  }
  if (!items.length) { toast('Nada para revisar agora.'); location.hash = '#/praticar'; return; }
  items = items.map((it) => ({ ...it, step: withVariant(it.step) }));
  startSession({ title: { review: 'Revisão de erros', srs: 'Revisão espaçada' }[kind] || 'Prática rápida', items, mode: kind === 'mix' ? 'practice' : kind, backHref: '#/praticar' });
}

// ─────────────────────────────────────────── PRATICAR
function viewPractice() {
  const s = store.getState();
  const due = store.dueCards().length;
  const units = COURSES.flatMap((c) => c.units.map((u) => ({ c, u, strength: store.srsStrength(u.lessons.map((l) => l.id)), started: u.lessons.some((l) => s.completed[l.id]) }))).filter((x) => x.started);
  const card = (iconName, title, desc, onclick, disabled = false, badge = null) => h('button', { class: 'card practice-card', disabled, onclick },
    h('div', { class: 'spread', style: { width: '100%' } }, h('span', { class: 'pi' }, ic(iconName, 20)), badge),
    h('h3', {}, title), h('p', { class: 'small muted' }, desc));

  page('practice',
    pageHead('Praticar', 'Treino livre', 'Mantenha o que você aprendeu fresco. A revisão espaçada decide o que precisa voltar e quando.'),
    h('div', { class: 'practice-grid' },
      card('brain', 'Revisão espaçada', 'Os exercícios que estão na hora de relembrar.', () => startPractice('srs'), !due, due ? h('span', { class: 'badge brand' }, `${due} hoje`) : null),
      card('bolt', 'Prática rápida', '8 exercícios variados das lições que você já fez.', () => startPractice('mix')),
      card('repeat', 'Revisar erros', 'Refaça o que você errou até acertar.', () => startPractice('review'), !s.mistakes.length, s.mistakes.length ? h('span', { class: 'badge' }, s.mistakes.length) : null),
      card('terminal', 'Playground', 'SQL e Python livres, com o banco de dados completo.', () => { location.hash = '#/playground'; }),
    ),
    h('section', { class: 'card' },
      h('div', { class: 'card-title' }, h('h3', {}, 'Domínio por unidade'), h('span', { class: 'tiny faint' }, 'cai quando exercícios vencem ou você erra')),
      units.length ? units.map(({ c, u, strength }) => h('div', { class: 'mastery', style: { '--track': trackVar(c.id) } },
        h('span', { class: 'track-chip', style: { color: 'var(--ink)' } }, h('span', { class: 'dot' }), u.title),
        h('div', { class: 'progress' }, h('div', { class: 'bar', style: { width: `${Math.round(strength * 100)}%` } })),
        h('span', { class: 'small faint num', style: { textAlign: 'right' } }, `${Math.round(strength * 100)}%`)))
        : h('p', { class: 'muted small' }, 'Conclua algumas lições para ver seu domínio aqui.')),
  );
}

// ─────────────────────────────────────────── ENTREVISTAS
function viewInterviews(lang = 'sql') {
  const s = store.getState();
  const list = lang === 'python' ? INTERVIEW_PY : INTERVIEW_SQL;
  const solved = (l) => l.filter((p) => s.interview[p.id]).length;
  page('interview',
    pageHead('Entrevistas', 'Treino para entrevistas técnicas', 'Problemas no estilo dos processos seletivos para analista e cientista de dados, com cronômetro. Depois de resolver, veja como pensar no problema e uma solução de referência.'),
    h('div', { class: 'tabs', role: 'tablist' },
      h('a', { class: `tab ${lang === 'sql' ? 'active' : ''}`, href: '#/entrevistas/sql', role: 'tab' }, ic('database', 16), `SQL · ${solved(INTERVIEW_SQL)}/${INTERVIEW_SQL.length}`),
      h('a', { class: `tab ${lang === 'python' ? 'active' : ''}`, href: '#/entrevistas/python', role: 'tab' }, ic('code', 16), `Python · ${solved(INTERVIEW_PY)}/${INTERVIEW_PY.length}`)),
    LEVELS.map((lv) => {
      const probs = list.filter((p) => p.level === lv.id);
      return h('section', { class: 'card level-block' },
        h('div', { class: 'level-head' },
          h('span', { class: 'level-badge' }, `Nível ${lv.id}`),
          h('div', {}, h('h3', {}, lv.name), h('p', { class: 'small muted' }, lv.desc[lang])),
          h('span', { class: 'small faint num' }, `${solved(probs)}/${probs.length}`)),
        probs.map((p) => {
          const st = s.interview[p.id];
          return h('button', { class: 'iv-row', onclick: () => startInterview(p) },
            h('span', { class: st ? 'ok' : 'todo' }, ic(st ? 'circleCheck' : 'circle', 20)),
            h('div', {}, h('div', { class: 'iv-title' }, p.title), h('div', { class: 'tiny faint' }, st ? `melhor tempo ${fmtTime(st.bestSecs)}` : `tempo-alvo ${p.minutes} min`)),
            h('span', { class: 'chev faint' }, ic('chevronRight', 18)));
        }));
    }),
  );
}

// ─────────────────────────────────────────── DÚVIDAS (busca na teoria + tutor)
let searchIndex = null;
function buildIndex() {
  if (searchIndex) return searchIndex;
  searchIndex = [];
  for (const c of COURSES) {
    for (const u of c.units) {
      for (const l of u.lessons) {
        l.steps.forEach((s) => {
          if (s.type === 'theory') searchIndex.push({ kind: 'Teoria', title: s.title, md: s.md, courseId: c.id, where: `${c.title} · ${l.title}`, lessonId: l.id, hay: norm(`${s.title} ${s.md}`) });
        });
      }
    }
  }
  for (const p of INTERVIEW) {
    const lang = p.step.type === 'sql' ? 'sql' : 'python';
    searchIndex.push({ kind: 'Entrevista', title: p.title, md: p.concept, courseId: lang, where: `Entrevista ${lang === 'sql' ? 'SQL' : 'Python'} · nível ${p.level}`, problem: p, hay: norm(`${p.title} ${p.concept} ${p.step.prompt}`) });
  }
  return searchIndex;
}

function searchTheory(q) {
  const words = norm(q).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  return buildIndex()
    .map((it) => {
      let score = 0;
      for (const w of words) {
        if (!it.hay.includes(w)) return null;
        score += norm(it.title).includes(w) ? 5 : 1;
        score += Math.min(4, it.hay.split(w).length - 1);
      }
      return { it, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map((x) => x.it);
}

function snippet(md, q) {
  const plain = md.replace(/[`*#|>~]/g, ' ').replace(/\s+/g, ' ').trim();
  const w = norm(q).split(/\s+/).filter((x) => x.length > 1)[0] || '';
  const i = norm(plain).indexOf(w);
  const start = Math.max(0, i - 60);
  let text = (start > 0 ? '…' : '') + plain.slice(start, start + 180) + (plain.length > start + 180 ? '…' : '');
  text = esc(text);
  for (const word of norm(q).split(/\s+/).filter((x) => x.length > 1)) {
    const re = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    text = text.replace(re, (m) => (norm(m) === word ? `<mark>${m}</mark>` : m));
  }
  return text;
}

function openTheory(it) {
  const actions = [];
  if (it.lessonId) actions.push({ label: 'Ir para a lição', onclick: () => { location.hash = `#/curso/${it.courseId}`; } });
  if (it.problem) actions.push({ label: 'Resolver o problema', onclick: () => startInterview(it.problem) });
  actions.push({ label: 'Perguntar ao tutor', primary: true, onclick: () => openTutorDrawer(null, `Me explique melhor: ${it.title}`) });
  showModal(it.title, h('div', { class: 'stack theory-view' }, h('span', { class: 'track-chip', style: { '--track': trackVar(it.courseId) } }, h('span', { class: 'dot' }), it.where), h('div', { class: 'md', html: renderMarkdown(it.md) })), actions);
}

const SUGGESTIONS = ['Qual a diferença entre WHERE e HAVING?', 'Quando usar LEFT JOIN?', 'Como funciona o ROW_NUMBER?', 'O que é p-valor?', 'Diferença entre loc e iloc no pandas', 'Como interpretar um intervalo de confiança?'];

function viewDoubts() {
  const resultsEl = h('div', {});
  const input = h('input', { type: 'search', placeholder: 'Buscar na teoria: JOIN, window function, groupby, p-valor...', 'aria-label': 'Buscar na teoria', autocomplete: 'off' });
  const runSearch = () => {
    const q = input.value.trim();
    if (!q) { put(resultsEl); return; }
    const res = searchTheory(q);
    put(resultsEl, h('section', { class: 'card', style: { padding: '0', overflow: 'hidden' } },
      res.length ? res.map((it) => h('button', { class: 'result', onclick: () => openTheory(it) },
        h('div', { class: 'spread' }, h('strong', {}, it.title), h('span', { class: 'badge' }, it.kind)),
        h('div', { class: 'tiny faint' }, it.where),
        h('div', { class: 'small muted', html: snippet(it.md, q) })))
        : h('div', { class: 'result', style: { cursor: 'default' } }, h('span', { class: 'muted' }, 'Nada encontrado na teoria. Pergunte ao tutor abaixo.'))));
  };
  input.addEventListener('input', runSearch);

  page('doubts',
    pageHead('Dúvidas', 'Tire suas dúvidas', 'Busque em toda a teoria das trilhas e nas explicações das entrevistas, ou converse com o tutor de IA.'),
    h('div', { class: 'search' }, ic('search', 20), input),
    resultsEl,
    h('section', { class: 'card stack' },
      h('div', { class: 'card-title', style: { marginBottom: 0 } }, h('div', { class: 'row' }, ic('chat', 20), h('h3', {}, 'Tutor')), h('span', { class: 'tiny faint' }, 'IA Claude, da Anthropic')),
      chatPanel({ suggestions: SUGGESTIONS }),
    ),
  );
  setTimeout(() => input.focus(), 50);
}

// ─────────────────────────────────────────── CHAT DO TUTOR
let conversation = []; // { role, content, display? }

function chatPanel({ suggestions = [], context = '' } = {}) {
  const wrap = h('div', { class: 'chat' });
  const log = h('div', { class: 'chat-log', 'aria-live': 'polite' });
  const ta = h('textarea', { placeholder: 'Escreva sua dúvida...', rows: 2, 'aria-label': 'Sua dúvida' });
  const send = h('button', { class: 'btn primary', 'aria-label': 'Enviar' }, ic('send', 18));
  let busy = false;
  let controller = null;

  const renderLog = () => {
    put(log, conversation.map((m) => m.role === 'user'
      ? h('div', { class: 'msg user' }, m.display ?? m.content)
      : h('div', { class: 'msg bot' }, h('div', { class: 'md', html: renderMarkdown(m.content || '...') }))));
    log.scrollTop = log.scrollHeight;
  };

  const ask = async (text) => {
    if (!text.trim() || busy) return;
    busy = true;
    send.disabled = true;
    const content = conversation.length === 0 && context ? `${context}\n\nDúvida do aluno: ${text}` : text;
    conversation.push({ role: 'user', content, display: text });
    const reply = { role: 'assistant', content: '' };
    conversation.push(reply);
    renderLog();
    const bubble = log.lastChild;
    let raf = 0;
    controller = new AbortController();
    try {
      await askTutor(conversation.slice(0, -1).map(({ role, content: c }) => ({ role, content: c })), {
        signal: controller.signal,
        onText: (full) => {
          reply.content = full;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => { put(bubble, h('div', { class: 'md', html: renderMarkdown(full) })); log.scrollTop = log.scrollHeight; });
        },
      });
      checkAchievements();
    } catch (e) {
      if (!reply.content) conversation.splice(-2, 2); // descarta a pergunta sem resposta
      renderLog();
      log.append(h('div', { class: 'msg err' }, e.message));
      if (e.code === 'setup') put(wrap, setupCard(() => put(wrap, ...chatChildren())));
    } finally {
      busy = false;
      send.disabled = false;
      renderLog();
    }
  };

  send.onclick = () => { const t = ta.value; ta.value = ''; ask(t); };
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); } });

  const chatChildren = () => [
    conversation.length ? h('div', { class: 'spread' }, h('span', { class: 'tiny faint' }, 'As respostas podem conter erros. Confira no app.'),
      h('button', { class: 'btn ghost sm', onclick: () => { controller?.abort(); conversation = []; renderLog(); put(wrap, ...chatChildren()); } }, ic('reset', 14), 'Nova conversa')) : null,
    log,
    !conversation.length && suggestions.length ? h('div', { class: 'suggestions' }, suggestions.map((sug) => h('button', { onclick: () => ask(sug) }, sug))) : null,
    h('div', { class: 'chat-input' }, ta, send),
  ];

  tutorMode().then((mode) => {
    if (!mode) put(wrap, setupCard(() => put(wrap, ...chatChildren())));
    else { put(wrap, ...chatChildren()); renderLog(); }
  });
  return wrap;
}

function setupCard(onDone) {
  const key = h('input', { type: 'password', placeholder: 'sk-ant-...', 'aria-label': 'Chave de API da Anthropic', autocomplete: 'off', style: { flex: 1, minWidth: '0' } });
  return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'O tutor usa a IA Claude. Para ativá-lo, crie uma chave de API da Anthropic (cobrada por uso, em geral centavos por pergunta) e cole abaixo. A chave fica salva somente neste aparelho e é enviada apenas para a Anthropic.'),
    h('p', { class: 'small faint' }, 'Onde criar: console.anthropic.com → API Keys'),
    h('div', { class: 'row' }, key, h('button', {
      class: 'btn primary',
      onclick: () => {
        if (!/^sk-ant-/.test(key.value.trim())) { toast('A chave deve começar com sk-ant-', 'bad'); return; }
        store.setTutorKey(key.value);
        toast('Tutor ativado');
        onDone();
      },
    }, 'Ativar tutor')),
  );
}

function openTutorDrawer(cur, preset = '') {
  const prevKey = keyHandler;
  const close = () => { ov.remove(); keyHandler = prevKey; overlayClose = null; };
  conversation = [];
  const context = cur ? contextFromStep(cur.step, { code: cur.renderer?.getCode?.(), feedback: cur.feedback }) : '';
  const suggestions = cur
    ? (cur.step.type === 'theory' ? ['Pode explicar com outro exemplo?', 'Onde isso é usado no dia a dia?'] : ['Me dê uma dica sem entregar a resposta', 'Por que minha resposta está errada?', 'Explique o conceito por trás deste exercício'])
    : (preset ? [preset] : SUGGESTIONS.slice(0, 3));
  const ov = h('div', { class: 'drawer', onclick: (e) => { if (e.target === ov || e.target.classList.contains('drawer-spacer')) close(); } },
    h('div', { class: 'drawer-spacer' }),
    h('aside', { class: 'drawer-panel', role: 'dialog', 'aria-label': 'Tutor' },
      h('div', { class: 'spread' }, h('div', { class: 'row' }, ic('chat', 20), h('h3', {}, 'Tutor')), h('button', { class: 'icon-btn', 'aria-label': 'Fechar', onclick: close }, ic('x'))),
      cur ? h('div', { class: 'tiny faint' }, 'O tutor vê o enunciado e o seu código atual. Ele dá dicas antes de entregar a resposta.') : null,
      chatPanel({ suggestions, context }),
    ));
  keyHandler = (e) => { if (e.key === 'Escape') close(); };
  overlayClose = close;
  document.body.append(ov);
}

// ─────────────────────────────────────────── CONQUISTAS
function viewAchievements() {
  const s = store.getState();
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  page('awards',
    pageHead('Conquistas', `${got} de ${ACHIEVEMENTS.length} desbloqueadas`, 'Marcos da sua jornada nas trilhas e nas entrevistas.'),
    h('div', { class: 'awards' }, ACHIEVEMENTS.map((a) => {
      const at = s.achievements[a.id];
      return h('div', { class: `card award ${at ? 'got' : ''}` },
        h('span', { class: 'ai' }, ic(at ? a.icon : 'lock', 20)),
        h('strong', {}, a.title),
        h('span', { class: 'small muted' }, a.desc),
        at ? h('span', { class: 'tiny', style: { color: 'var(--good)' } }, new Date(at).toLocaleDateString('pt-BR')) : null);
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
      put(out, results.length ? results.map(resultTable) : h('div', { class: 'small faint' }, 'Comando executado (sem linhas retornadas).'));
    } catch (e) {
      const hint = friendlySqlError(e.message);
      put(out, h('pre', { class: 'error' }, `Erro: ${e.message}`), hint ? hintBox(hint) : null);
    } finally {
      db.close();
    }
  };
  const runPy = async () => {
    const status = (m) => put(out, h('div', { class: 'small faint loading' }, m));
    try {
      pythonOutput(out, await runPython({ code: editor.value, onStatus: status }));
    } catch (e) {
      put(out, h('pre', { class: 'error' }, e.message));
    }
  };
  const run = tab === 'sql' ? runSql : runPy;
  const wrap = codeEditor(tab === 'sql'
    ? "-- O banco é recriado a cada execução\nSELECT loja, ROUND(AVG(receita), 2) AS receita_media, COUNT(*) AS dias\nFROM vendas_diarias\nGROUP BY loja\nORDER BY receita_media DESC;"
    : 'import numpy as np\n\nvendas = np.array([5106, 6668, 8240])\nprint("média:", vendas.mean())\nvendas / vendas.sum()',
  tab, () => run());
  editor = wrap.textarea;

  page('practice',
    h('a', { class: 'btn ghost sm', href: '#/praticar', style: { alignSelf: 'flex-start' } }, ic('arrowLeft', 16), 'Praticar'),
    pageHead('Playground', 'Experimente à vontade', 'Sem correção e sem XP. O banco tem as tabelas da loja e os dados de estatística.'),
    h('div', { class: 'tabs' },
      h('a', { class: `tab ${tab === 'sql' ? 'active' : ''}`, href: '#/playground/sql' }, ic('database', 16), 'SQL'),
      h('a', { class: `tab ${tab === 'python' ? 'active' : ''}`, href: '#/playground/python' }, ic('code', 16), 'Python')),
    tab === 'sql' ? schemaPanel() : h('p', { class: 'small muted' }, IS_DEMO ? 'Na demonstração: NumPy, BeautifulSoup e sqlite3. No app instalado também pandas e matplotlib, offline.' : 'Disponíveis offline: pandas, NumPy, matplotlib, BeautifulSoup e sqlite3.'),
    wrap,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: run }, ic('play', 16), 'Executar'), h('span', { class: 'tiny faint hide-touch' }, 'Ctrl+Enter')),
    out,
  );
}

// ─────────────────────────────────────────── PERFIL E ESTATÍSTICAS
function weeklyXp(weeks = 10) {
  const s = store.getState();
  const out = [];
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(monday.getTime() - w * 7 * 86400000);
    let xp = 0;
    for (let d = 0; d < 7; d++) xp += s.history[store.today(new Date(start.getTime() + d * 86400000))] || 0;
    out.push({ label: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), xp });
  }
  return out;
}

function barChart(data) {
  const W = 640;
  const H = 210;
  const pad = { l: 40, r: 8, t: 12, b: 28 };
  const max = Math.max(10, ...data.map((d) => d.xp));
  const step = Math.pow(10, Math.floor(Math.log10(max))) / (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 0.5 : 1);
  const top = Math.ceil(max / step) * step;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const bw = (W - pad.l - pad.r) / data.length;
  const ticks = [0, top / 2, top];
  const tip = h('div', { class: 'tooltip', hidden: true });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `XP por semana nas últimas ${data.length} semanas. ${data.map((d) => `${d.label}: ${d.xp} XP`).join('; ')}`);
  const el = (tag, attrs) => { const e = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  for (const t of ticks) {
    svg.append(el('line', { x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t), class: t === 0 ? 'axis' : 'grid' }));
    const lbl = el('text', { x: pad.l - 8, y: y(t) + 4, 'text-anchor': 'end' });
    lbl.textContent = Math.round(t);
    svg.append(lbl);
  }
  data.forEach((d, i) => {
    const x = pad.l + i * bw + bw * 0.22;
    const w = bw * 0.56;
    const yy = y(d.xp);
    const base = y(0);
    const r = Math.min(4, (base - yy) / 2, w / 2);
    if (d.xp > 0) {
      const path = el('path', { class: `bar${i === data.length - 1 ? ' hot' : ''}`, d: `M${x},${base} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + w - r} Q${x + w},${yy} ${x + w},${yy + r} V${base} Z` });
      svg.append(path);
    }
    const hit = el('rect', { x: pad.l + i * bw, y: pad.t, width: bw, height: H - pad.t - pad.b, fill: 'transparent' });
    hit.addEventListener('mouseenter', () => {
      tip.hidden = false;
      tip.textContent = `Semana de ${d.label}: ${d.xp} XP`;
      const rect = svg.getBoundingClientRect();
      tip.style.left = `${((x + w / 2) / W) * rect.width}px`;
      tip.style.top = `${(Math.min(yy, base - 2) / H) * rect.height}px`;
    });
    hit.addEventListener('mouseleave', () => { tip.hidden = true; });
    svg.append(hit);
    if (i % 2 === (data.length - 1) % 2) {
      const lbl = el('text', { x: x + w / 2, y: H - 8, 'text-anchor': 'middle' });
      lbl.textContent = d.label;
      svg.append(lbl);
    }
  });
  return h('div', { class: 'chart' }, svg, tip);
}

function settingRow(title, desc, control) {
  return h('div', { class: 'setting' }, h('div', {}, h('div', { style: { fontWeight: 600 } }, title), desc ? h('div', { class: 'small muted' }, desc) : null), control);
}

function toggle(id, label, value, onchange) {
  return h('label', { class: 'switch', for: id }, h('input', { type: 'checkbox', id, checked: value, 'aria-label': label, onchange: (e) => onchange(e.target.checked) }), h('span', {}));
}

function segmented(options, value, onchange) {
  return h('div', { class: 'tabs' }, options.map(([v, label]) => h('button', { class: `tab ${value === v ? 'active' : ''}`, onclick: () => onchange(v) }, label)));
}

function viewProfile() {
  const s = store.getState();
  const lv = store.levelInfo(s.xp);
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = store.today(new Date(Date.now() - i * 86400000));
    days.push({ d, xp: s.history[d] || 0 });
  }
  const level = (xp) => (xp === 0 ? 0 : xp < 20 ? 1 : xp < 50 ? 2 : xp < 100 ? 3 : 4);
  const totalLessons = COURSES.reduce((a, c) => a + allLessons(c).length, 0);
  const accuracy = pct(s.totals.correct, s.totals.answered);
  const r = s.reminder;
  const backupBox = h('div', { class: 'stack' });
  const weeks = weeklyXp(10);
  const ivSolved = Object.keys(s.interview).length;

  page('profile',
    pageHead('Perfil', 'Seu progresso', null),
    h('section', { class: 'card level-card' },
      h('span', { class: 'level-num' }, lv.index),
      h('div', { class: 'stack', style: { gap: '8px' } },
        h('div', { class: 'spread' }, h('h2', {}, lv.title), h('span', { class: 'num', style: { color: 'var(--xp)', fontWeight: 600 } }, `${s.xp} XP`)),
        h('div', { class: 'progress lg' }, h('div', { class: 'bar', style: { width: `${Math.round(lv.progress * 100)}%`, background: 'var(--xp)' } })),
        h('span', { class: 'small muted' }, lv.next ? `Faltam ${lv.toNext} XP para ${lv.next}` : 'Você alcançou o nível máximo.'))),
    h('div', { class: 'tiles' },
      h('div', { class: 'card tile' }, h('strong', {}, `${Object.keys(s.completed).length}/${totalLessons}`), h('span', {}, 'lições concluídas')),
      h('div', { class: 'card tile' }, h('strong', {}, `${accuracy}%`), h('span', {}, `de acerto em ${s.totals.answered} respostas`)),
      h('div', { class: 'card tile' }, h('strong', {}, s.totals.theoryRead), h('span', {}, 'cards de teoria estudados')),
      h('div', { class: 'card tile' }, h('strong', {}, `${ivSolved}/${INTERVIEW.length}`), h('span', {}, 'problemas de entrevista'))),
    h('div', { class: 'grid-2' },
      h('section', { class: 'card' },
        h('div', { class: 'card-title' }, h('h3', {}, 'XP por semana'), h('span', { class: 'tiny faint' }, 'últimas 10 semanas')),
        barChart(weeks),
        h('details', { class: 'panel', style: { marginTop: '10px' } }, h('summary', {}, ic('table', 15), 'Ver como tabela'),
          h('div', { class: 'panel-body' }, h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Semana de'), h('th', {}, 'XP'))), h('tbody', {}, weeks.map((w) => h('tr', {}, h('td', {}, w.label), h('td', {}, w.xp))))))))),
      h('section', { class: 'card' },
        h('div', { class: 'card-title' }, h('h3', {}, 'Acerto por trilha'), h('span', { class: 'tiny faint' }, '1ª tentativa')),
        COURSES.map((c) => {
          const t = s.topics[c.id] || { correct: 0, answered: 0 };
          const p = pct(t.correct, t.answered);
          return h('div', { class: 'hbar', style: { '--track': trackVar(c.id) } },
            h('span', { class: 'track-chip', style: { color: 'var(--ink)' } }, h('span', { class: 'dot' }), c.id === 'sql' ? 'SQL' : c.id === 'python' ? 'Python' : 'Estatística'),
            h('div', { class: 'track' }, h('div', { class: 'fillbar', style: { width: `${p}%` } })),
            h('span', { class: 'small num', style: { textAlign: 'right' } }, t.answered ? `${p}%` : '—'));
        }),
        h('div', { class: 'card-title', style: { marginTop: '18px' } }, h('h3', {}, 'Atividade'), h('span', { class: 'tiny faint' }, `${store.daysStudied()} dias estudados`)),
        h('div', { class: 'heatmap', role: 'img', 'aria-label': 'Atividade diária nas últimas 12 semanas' }, days.map((d) => h('div', { class: `cell l${level(d.xp)}`, title: `${d.d}: ${d.xp} XP` }))))),
    h('a', { class: 'card review-banner', href: '#/conquistas' },
      h('span', { class: 'ri', style: { background: 'color-mix(in srgb, var(--xp) 16%, transparent)', color: 'var(--xp)' } }, ic('trophy', 22)),
      h('div', {}, h('div', { style: { fontWeight: 600 } }, 'Conquistas'), h('div', { class: 'small muted' }, `${Object.keys(s.achievements).length} de ${ACHIEVEMENTS.length} desbloqueadas`)),
      ic('chevronRight', 20)),

    h('section', { class: 'card' },
      h('div', { class: 'card-title' }, h('h3', {}, 'Preferências')),
      h('div', { class: 'settings' },
        settingRow('Tema', null, segmented([['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Escuro']], s.settings.theme, (v) => { store.setSetting('theme', v); applyTheme(); viewProfile(); })),
        settingRow('Meta diária', 'XP por dia', segmented([[10, '10'], [30, '30'], [50, '50'], [100, '100']], s.dailyGoal, (v) => { store.setDailyGoal(v); viewProfile(); })),
        settingRow('Sons', 'Toque curto ao acertar e errar', toggle('set-sound', 'Sons', s.settings.sound, (v) => store.setSetting('sound', v))),
        settingRow('Vibração', 'No celular', toggle('set-haptics', 'Vibração', s.settings.haptics, (v) => store.setSetting('haptics', v))),
        platform.remindersSupported() ? settingRow('Lembrete diário', platform.isAndroid() ? 'Notificação no horário escolhido' : 'Aparece com o app aberto', h('div', { class: 'row' },
          h('input', {
            type: 'time', 'aria-label': 'Horário do lembrete', value: `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`,
            onchange: async (e) => {
              const [hh, mm] = e.target.value.split(':').map(Number);
              store.setReminder({ hour: hh, minute: mm });
              if (store.getState().reminder.enabled) await platform.scheduleReminder(store.getState().reminder);
            },
          }),
          toggle('set-reminder', 'Lembrete diário', r.enabled, async (v) => {
            const ok = await platform.scheduleReminder({ ...r, enabled: v });
            store.setReminder({ enabled: v && ok });
            if (v && !ok) toast('Permita as notificações do Datum nas configurações do sistema.', 'bad');
            else if (v) toast(`Lembrete às ${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`, '', 'bell');
          }))) : null,
      )),

    h('section', { class: 'card' },
      h('div', { class: 'card-title' }, h('h3', {}, 'Tutor de IA'), s.tutor.apiKey ? h('span', { class: 'badge good' }, 'ativo') : isDemoRuntime() ? h('span', { class: 'badge brand' }, 'via Claude') : h('span', { class: 'badge' }, 'inativo')),
      s.tutor.apiKey
        ? h('div', { class: 'spread' }, h('span', { class: 'small muted' }, `Chave salva neste aparelho (termina em …${s.tutor.apiKey.slice(-4)}).`),
          h('button', { class: 'btn sm danger', onclick: () => { store.setTutorKey(''); toast('Chave removida'); viewProfile(); } }, 'Remover chave'))
        : isDemoRuntime() ? h('p', { class: 'small muted' }, 'Nesta demonstração o tutor usa o Claude da sua conta, sem chave.')
          : setupCard(() => viewProfile())),

    h('section', { class: 'card stack' },
      h('div', { class: 'card-title', style: { marginBottom: 0 } }, h('h3', {}, 'Backup e sincronização')),
      h('p', { class: 'small muted' }, 'Leve seu progresso do celular para o computador (ou o contrário): exporte o código num aparelho e importe no outro. A chave do tutor não é incluída.'),
      h('div', { class: 'row' },
        h('button', {
          class: 'btn sm',
          onclick: async () => {
            const code = store.exportCode();
            const ta = h('textarea', { class: 'small-editor', readonly: true, 'aria-label': 'Código de backup' }, code);
            put(backupBox, ta);
            ta.select();
            try { await platform.copyText(code); toast('Código copiado. Cole no outro aparelho.', '', 'copy'); } catch { toast('Selecione e copie o código abaixo.'); }
          },
        }, ic('upload', 15), 'Exportar'),
        h('button', {
          class: 'btn sm',
          onclick: () => {
            const ta = h('textarea', { class: 'small-editor', placeholder: 'Cole aqui o código que começa com DL1:', 'aria-label': 'Código para importar' });
            put(backupBox, ta, h('button', {
              class: 'btn primary sm', style: { alignSelf: 'flex-start' },
              onclick: async () => {
                try {
                  if (!await askConfirm('Substituir o progresso deste aparelho pelo do código?', { ok: 'Substituir', danger: true })) return;
                  store.importCode(ta.value);
                  toast('Progresso importado');
                  viewProfile();
                } catch (e) { toast(e.message, 'bad'); }
              },
            }, 'Importar progresso'));
          },
        }, ic('download', 15), 'Importar')),
      backupBox),

    h('div', { class: 'row' },
      h('button', { class: 'btn sm danger', onclick: async () => { if (await askConfirm('Apagar todo o progresso? Isso não pode ser desfeito.', { ok: 'Apagar', danger: true })) { store.resetProgress(); viewProfile(); } } }, ic('trash', 15), 'Apagar progresso'),
      h('button', { class: 'btn sm ghost', onclick: unlockAll }, 'Desbloquear tudo (modo professor)')),
    h('p', { class: 'tiny faint' }, `${APP_NAME} · ${platform.platformName()}`),
  );
}

async function unlockAll() {
  if (!await askConfirm('Marcar todas as lições como concluídas (sem XP)? Útil para explorar o conteúdo.', { ok: 'Desbloquear' })) return;
  for (const c of COURSES) for (const l of allLessons(c)) if (!store.getState().completed[l.id]) store.completeLesson(l.id, 3, { silent: true });
  location.hash = '#/';
}

// ─────────────────────────────────────────── ROTEADOR
document.addEventListener('keydown', (e) => keyHandler?.(e));

function route() {
  keyHandler = null;
  footerReady = () => {};
  activeSession = null;
  overlayClose?.();
  document.querySelectorAll('.drawer, .modal-backdrop').forEach((n) => n.remove());
  const [, view, arg] = location.hash.replace(/^#/, '').split('/');
  switch (view) {
    case 'curso': return viewCourse(arg);
    case 'licao': return startLesson(arg);
    case 'praticar': return viewPractice();
    case 'entrevistas': case 'entrevista': return viewInterviews(arg === 'python' ? 'python' : 'sql');
    case 'duvidas': return viewDoubts();
    case 'conquistas': return viewAchievements();
    case 'playground': return viewPlayground(arg || 'sql');
    case 'perfil': return viewProfile();
    default: return viewHome();
  }
}

// Android: "voltar" fecha diálogos, sai da lição (com confirmação), volta de tela ou fecha o app na home.
platform.onBackButton(() => {
  if (overlayClose) return overlayClose();
  if (activeSession) return activeSession.exit();
  if (!location.hash || location.hash === '#/') return platform.exitApp();
  history.back();
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
document.documentElement.dataset.platform = platform.platformName();
applyTheme();
platform.startInAppReminderLoop(store.getState);

if (IS_DEMO && !store.getState().demoSeeded) {
  store.seedDemo(COURSES.map((c) => allLessons(c).map((l) => l.id)), INTERVIEW.map((p) => p.id));
  checkAchievements();
}

window.addEventListener('hashchange', route);
route();
