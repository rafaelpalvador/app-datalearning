// Cliente do worker do PostgreSQL: fila de pedidos, mensagens de progresso e limite de tempo
// (uma consulta que não termina é interrompida e o banco é reaberto a partir do cache).
const EXEC_TIMEOUT_MS = 30000;
let worker = null;
let seq = 0;
let pending = null;
let chain = Promise.resolve();
let everReady = false;

function kill() { worker?.terminate(); worker = null; }

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./pg-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const { id, status, result } = e.data;
    if (!pending || pending.id !== id) return;
    if (status) {
      if (status === 'Executando...') {
        everReady = true;
        clearTimeout(pending.timer);
        const job = pending;
        job.timer = setTimeout(() => {
          if (pending !== job) return;
          kill();
          pending = null;
          job.resolve({ ok: false, error: true, timeout: true, reason: `A consulta passou de ${EXEC_TIMEOUT_MS / 1000} segundos e foi interrompida. Confira se falta uma condição de parada (CTE recursiva) ou um filtro/JOIN (produto cartesiano).` });
        }, EXEC_TIMEOUT_MS);
      }
      job_status(status);
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
    kill();
    job?.resolve({ ok: false, error: true, reason: 'O PostgreSQL foi reiniciado após um erro interno. Execute de novo.' });
  };
  return worker;
}
function job_status(s) { pending?.onStatus?.(s); }

function call(msg, onStatus = () => {}) {
  const next = chain.then(() => new Promise((resolve) => {
    const id = ++seq;
    pending = { id, resolve, onStatus, timer: null };
    getWorker().postMessage({ id, ...msg });
  }));
  chain = next.catch(() => {});
  return next;
}

export const pgReady = () => everReady;
/** Executa SQL no PostgreSQL (nada é gravado: cada execução começa do banco original). */
export const pgRun = (sql, onStatus) => call({ op: 'run', sql }, onStatus);
/** Corrige um exercício: compara o resultado do aluno com o da solução. */
export const pgEvaluate = (step, code, onStatus) => call({ op: 'evaluate', step: { solution: step.solution, check: step.check || null, ordered: !!step.ordered }, code }, onStatus);
/** Abre o banco em segundo plano (ex.: ao entrar na trilha). */
export const pgWarm = (onStatus) => call({ op: 'warm' }, onStatus);
