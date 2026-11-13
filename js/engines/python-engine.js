// Motor Python: Pyodide (CPython compilado para WebAssembly) com pandas, NumPy,
// matplotlib, BeautifulSoup, sqlite3... tudo rodando no navegador do aluno.

const PYODIDE_VERSION = '0.27.2';
const CDN_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const LOCAL_URL = new URL('../../vendor/pyodide/', import.meta.url).href;

// Ordem de preferência:
//  1. window.DATALINGO_PYODIDE_URL (hospedagem própria)
//  2. vendor/pyodide/ (incluído nos apps de desktop e Android → funciona offline)
//  3. CDN do jsDelivr (versão web)
async function resolvePyodideUrl() {
  if (window.DATALINGO_PYODIDE_URL) return window.DATALINGO_PYODIDE_URL;
  try {
    const r = await fetch(`${LOCAL_URL}pyodide.js`, { method: 'HEAD' });
    if (r.ok) return LOCAL_URL;
  } catch { /* sem cópia local */ }
  return CDN_URL;
}

let pyodidePromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Não foi possível carregar o Python (verifique sua conexão).'));
    document.head.appendChild(s);
  });
}

const HELPERS = String.raw`
import os, sys
os.environ["MPLBACKEND"] = "AGG"

def _datalingo_fmt(obj):
    try:
        import pandas as pd
        if isinstance(obj, pd.DataFrame):
            return ("html", obj.to_html(max_rows=30, max_cols=20, border=0))
        if isinstance(obj, pd.Series):
            return ("html", obj.to_frame().to_html(max_rows=30, border=0))
    except ImportError:
        pass
    return ("text", repr(obj))

def _datalingo_figs():
    figs = []
    if "matplotlib.pyplot" in sys.modules:
        import io, base64
        import matplotlib.pyplot as plt
        for n in plt.get_fignums():
            buf = io.BytesIO()
            plt.figure(n).savefig(buf, format="png", bbox_inches="tight", dpi=90)
            figs.append(base64.b64encode(buf.getvalue()).decode())
        plt.close("all")
    return figs
`;

export function isPythonLoaded() {
  return pyodidePromise !== null;
}

export function initPython(onStatus = () => {}) {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const base = await resolvePyodideUrl();
      onStatus(base === CDN_URL ? 'Baixando o Python (só na primeira vez, ~10 MB)...' : 'Iniciando o Python...');
      await loadScript(`${base}pyodide.js`);
      const pyodide = await window.loadPyodide({ indexURL: base });
      await pyodide.runPythonAsync(HELPERS);
      return pyodide;
    })().catch((e) => {
      pyodidePromise = null;
      throw e;
    });
  }
  return pyodidePromise;
}

function cleanError(e) {
  const msg = String(e.message || e);
  // Mostra só o final do traceback (a parte útil para o aluno)
  const lines = msg.trim().split('\n');
  const idx = lines.findIndex((l) => l.includes('File "<exec>"'));
  return (idx >= 0 ? lines.slice(idx) : lines.slice(-4)).join('\n');
}

// Traduz erros comuns do Python em dicas para iniciantes.
export function friendlyPyError(msg) {
  const m = String(msg || '');
  let x;
  if ((x = m.match(/NameError: name '([^']+)' is not defined/))) return `<code>${x[1]}</code> não foi definido. Confira se o nome está igual ao do enunciado e se você importou a biblioteca (ex.: <code>import pandas as pd</code>).`;
  if ((x = m.match(/KeyError: '?([^'\n]+)'?/))) return `A chave/coluna <code>${x[1]}</code> não existe. Confira maiúsculas, acentos e o nome exato da coluna.`;
  if (/IndentationError|unexpected indent|expected an indented block/.test(m)) return 'Problema de <b>indentação</b>: o Python usa espaços para definir blocos (4 espaços dentro de def/if/for).';
  if (/SyntaxError/.test(m)) return 'Erro de sintaxe: confira parênteses, aspas, vírgulas e os dois-pontos depois de def/if/for.';
  if (/The truth value of a Series is ambiguous/.test(m)) return 'No pandas, combine condições com <code>&</code> (e) e <code>|</code> (ou), com parênteses em cada uma — <code>and</code>/<code>or</code> não funcionam com Series.';
  if (/AttributeError: '(\w+)' object has no attribute '(\w+)'/.test(m)) { x = m.match(/'(\w+)' object has no attribute '(\w+)'/); return `Objetos <code>${x[1]}</code> não têm <code>.${x[2]}</code>. Confira o tipo da variável e o nome do método.`; }
  if (/TypeError: unsupported operand/.test(m)) return 'Operação entre tipos incompatíveis (ex.: texto + número). Converta com <code>int()</code>, <code>float()</code> ou <code>.astype()</code>.';
  if (/ZeroDivisionError/.test(m)) return 'Divisão por zero.';
  if (/ModuleNotFoundError/.test(m)) {
    return window.DATALINGO_DEMO
      ? 'Na demonstração online só NumPy, BeautifulSoup e sqlite3 estão disponíveis. pandas e matplotlib funcionam offline no app instalado.'
      : 'Essa biblioteca não está disponível aqui.';
  }
  return '';
}

/**
 * Executa código Python.
 * Por padrão roda num Web Worker (a interface não trava e um laço infinito pode ser
 * interrompido). Se o Worker não estiver disponível, roda na linha principal.
 * @param {object} opts { setup, code, tests, packages, onStatus }
 * @returns {Promise<{ok, stdout, error, value, figures, testError}>}
 */
export async function runPython(opts) {
  if (!workerBroken && typeof Worker !== 'undefined' && !window.DATALINGO_DEMO) {
    try {
      return await enqueue(() => runInWorker(opts));
    } catch (e) {
      if (!(e instanceof WorkerUnavailable)) throw e;
      workerBroken = true;   // ex.: protocolo que não permite Workers → usa a linha principal
    }
  }
  return runOnMainThread(opts);
}

// Tempo máximo de EXECUÇÃO (depois que o Python e as bibliotecas já carregaram).
const EXEC_TIMEOUT_MS = 30000;
class WorkerUnavailable extends Error {}
let worker = null;
let workerBroken = false;
let workerReady = false;      // já respondeu alguma vez (o Pyodide carregou)
let jobSeq = 0;
let pending = null;           // { id, resolve, reject, onStatus, timer }
let chain = Promise.resolve();

function enqueue(fn) {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

function killWorker() {
  if (worker) worker.terminate();
  worker = null;
  workerReady = false;
}

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./python-worker.js', import.meta.url));
  worker.onmessage = (e) => {
    const { id, status, result } = e.data;
    if (!pending || pending.id !== id) return;
    if (status) {
      if (status === 'Executando...') {
        workerReady = true;
        clearTimeout(pending.timer);
        const job = pending;
        job.timer = setTimeout(() => {
          if (pending !== job) return;
          killWorker();
          pending = null;
          job.resolve({ ok: false, stdout: '', error: `O código passou de ${EXEC_TIMEOUT_MS / 1000} segundos e foi interrompido. Confira se há um laço infinito (um while cuja condição nunca fica falsa).`, figures: [] });
        }, EXEC_TIMEOUT_MS);
      }
      pending.onStatus(status);
      return;
    }
    clearTimeout(pending.timer);
    const job = pending;
    pending = null;
    job.resolve(result);
  };
  worker.onerror = (e) => {
    e.preventDefault?.();
    const job = pending;
    pending = null;
    const neverWorked = !workerReady;
    killWorker();
    if (job) {
      clearTimeout(job.timer);
      if (neverWorked) job.reject(new WorkerUnavailable(e.message || 'worker'));
      else job.resolve({ ok: false, stdout: '', error: 'O Python foi reiniciado após um erro interno. Execute de novo.', figures: [] });
    }
  };
  return worker;
}

async function runInWorker({ setup = '', code = '', tests = '', packages = [], onStatus = () => {} }) {
  const base = await resolvePyodideUrl();
  if (!workerReady) onStatus(base === CDN_URL ? 'Baixando o Python (só na primeira vez, ~10 MB)...' : 'Iniciando o Python...');
  return new Promise((resolve, reject) => {
    let w;
    try { w = getWorker(); } catch (e) { reject(new WorkerUnavailable(e.message)); return; }
    const id = ++jobSeq;
    pending = { id, resolve, reject, onStatus, timer: null };
    w.postMessage({ id, base, setup, code, tests, packages });
  });
}

/** Interrompe uma execução em andamento (ex.: ao sair da lição). */
export function cancelPython() {
  if (!pending) return;
  const job = pending;
  pending = null;
  clearTimeout(job.timer);
  killWorker();
  job.resolve({ ok: false, stdout: '', error: 'Execução interrompida.', figures: [] });
}

async function runOnMainThread({ setup = '', code = '', tests = '', packages = [], onStatus = () => {} }) {
  const pyodide = await initPython(onStatus);
  const stdout = [];
  pyodide.setStdout({ batched: (s) => { if (!s.startsWith('Matplotlib is building the font cache')) stdout.push(s); } });
  pyodide.setStderr({ batched: (s) => { if (!s.startsWith('Matplotlib is building the font cache')) stdout.push(s); } });

  try {
    onStatus('Carregando bibliotecas...');
    if (packages.length) await pyodide.loadPackage(packages);
    await pyodide.loadPackagesFromImports(`${setup}\n${code}\n${tests}`);
  } catch (e) {
    const demo = window.DATALINGO_DEMO
      ? 'Nesta demonstração online o pandas e o matplotlib não estão disponíveis (os arquivos passam do limite de tamanho da página). No app instalado (Android, Windows ou Linux) eles funcionam offline.'
      : `Falha ao carregar bibliotecas: ${e.message}`;
    return { ok: false, stdout: stdout.join('\n'), error: demo };
  }

  onStatus('Executando...');
  const ns = pyodide.globals.get('dict')();
  // disponibiliza os helpers no namespace isolado
  ns.set('_datalingo_fmt', pyodide.globals.get('_datalingo_fmt'));
  ns.set('_datalingo_figs', pyodide.globals.get('_datalingo_figs'));
  const result = { ok: true, stdout: '', error: null, value: null, figures: [], testError: null };

  try {
    if (setup) await pyodide.runPythonAsync(setup, { globals: ns });
  } catch (e) {
    result.ok = false;
    result.error = 'Erro no código de preparação do exercício: ' + cleanError(e);
  }

  if (result.ok) {
    try {
      const value = await pyodide.runPythonAsync(code, { globals: ns });
      if (value !== undefined && value !== null && !tests) {
        ns.set('_datalingo_last', value);
        const fmt = pyodide.runPython('_datalingo_fmt(_datalingo_last)', { globals: ns }).toJs();
        result.value = { kind: fmt[0], content: fmt[1] };
        if (value && typeof value.destroy === 'function') value.destroy();
      }
    } catch (e) {
      result.ok = false;
      result.error = cleanError(e);
    }
  }

  if (result.ok && tests) {
    try {
      await pyodide.runPythonAsync(tests, { globals: ns });
    } catch (e) {
      result.ok = false;
      const msg = cleanError(e);
      const m = msg.match(/AssertionError:?\s*(.*)$/s);
      result.testError = m ? (m[1].trim() || 'O resultado não é o esperado.') : msg;
    }
  }

  try {
    const figs = pyodide.runPython('_datalingo_figs()', { globals: ns });
    result.figures = figs.toJs();
    figs.destroy();
  } catch { /* sem figuras */ }

  ns.destroy();
  result.stdout = stdout.join('\n');
  return result;
}
