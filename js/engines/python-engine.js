// Motor Python: Pyodide (CPython compilado para WebAssembly) com pandas, NumPy,
// matplotlib, BeautifulSoup, sqlite3... tudo rodando no navegador do aluno.

const PYODIDE_VERSION = '0.27.2';
// Pode ser sobrescrito para hospedar o Pyodide você mesmo (ex.: uso offline):
//   <script>window.DATALINGO_PYODIDE_URL = '/pyodide/';</script>
const PYODIDE_URL = window.DATALINGO_PYODIDE_URL || `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

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
      onStatus('Baixando o Python (só na primeira vez, ~10 MB)...');
      await loadScript(`${PYODIDE_URL}pyodide.js`);
      const pyodide = await window.loadPyodide({ indexURL: PYODIDE_URL });
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

/**
 * Executa código Python.
 * @param {object} opts { setup, code, tests, packages, onStatus }
 * @returns {Promise<{ok, stdout, error, value, figures, testError}>}
 */
export async function runPython({ setup = '', code = '', tests = '', packages = [], onStatus = () => {} }) {
  const pyodide = await initPython(onStatus);
  const stdout = [];
  pyodide.setStdout({ batched: (s) => stdout.push(s) });
  pyodide.setStderr({ batched: (s) => stdout.push(s) });

  try {
    onStatus('Carregando bibliotecas...');
    if (packages.length) await pyodide.loadPackage(packages);
    await pyodide.loadPackagesFromImports(`${setup}\n${code}\n${tests}`);
  } catch (e) {
    return { ok: false, stdout: stdout.join('\n'), error: `Falha ao carregar bibliotecas: ${e.message}` };
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
