// Worker do Python: roda o Pyodide fora da linha principal, para a interface
// nunca travar (carregar o pandas leva alguns segundos e um laço infinito
// do aluno não pode congelar o app). Recebe { id, base, setup, code, tests, packages }
// e devolve { id, status } durante a execução e { id, result } no fim.

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

let pyodidePromise = null;

function loadPy(base, status) {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      status('Iniciando o Python...');
      importScripts(`${base}pyodide.js`);
      const pyodide = await self.loadPyodide({ indexURL: base });
      await pyodide.runPythonAsync(HELPERS);
      return pyodide;
    })().catch((e) => { pyodidePromise = null; throw e; });
  }
  return pyodidePromise;
}

function cleanError(e) {
  const msg = String(e.message || e);
  const lines = msg.trim().split('\n');
  const idx = lines.findIndex((l) => l.includes('File "<exec>"'));
  return (idx >= 0 ? lines.slice(idx) : lines.slice(-4)).join('\n');
}

async function run({ base, setup = '', code = '', tests = '', packages = [] }, status) {
  let pyodide;
  try {
    pyodide = await loadPy(base, status);
  } catch (e) {
    return { ok: false, stdout: '', error: 'Não foi possível carregar o Python: ' + (e.message || e) };
  }
  const stdout = [];
  pyodide.setStdout({ batched: (s) => { if (!s.startsWith('Matplotlib is building the font cache')) stdout.push(s); } });
  pyodide.setStderr({ batched: (s) => { if (!s.startsWith('Matplotlib is building the font cache')) stdout.push(s); } });
  try {
    status('Carregando bibliotecas...');
    if (packages.length) await pyodide.loadPackage(packages);
    await pyodide.loadPackagesFromImports(`${setup}\n${code}\n${tests}`);
  } catch (e) {
    return { ok: false, stdout: stdout.join('\n'), error: `Falha ao carregar bibliotecas: ${e.message}` };
  }

  status('Executando...');
  const ns = pyodide.globals.get('dict')();
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

self.onmessage = async (e) => {
  const { id } = e.data;
  const status = (msg) => self.postMessage({ id, status: msg });
  let result;
  try {
    result = await run(e.data, status);
  } catch (err) {
    result = { ok: false, stdout: '', error: String(err.message || err) };
  }
  self.postMessage({ id, result });
};
