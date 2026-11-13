// Tutor de IA para tirar dúvidas.
//
// Dois caminhos:
//  1. Apps instalados (Android, Windows, Linux) e web: SDK oficial da Anthropic com a chave
//     de API do próprio aluno, guardada só no aparelho (Perfil → Tutor de IA).
//  2. Demonstração publicada no Claude: o recurso "sample" da página pergunta ao Claude de
//     quem está visualizando, sem chave.

import { SCHEMA_DOC } from './content/datasets.js';
import * as store from './state.js';

const MODEL = 'claude-opus-5-5';

const SYSTEM_PROMPT = `Você é o tutor do Datum, um app para aprender SQL, Python (pandas, NumPy) e estatística para análise de dados. Responda sempre em português do Brasil.

Como ensinar:
- Explique o conceito primeiro, de forma curta e clara, e depois mostre um exemplo pequeno.
- Quando o aluno estiver resolvendo um exercício, dê dicas progressivas: aponte o que observar e qual conceito usar. Só entregue a solução completa se ele pedir explicitamente.
- Se houver erro no código do aluno, diga qual é a causa provável e como corrigir, citando a linha ou trecho.
- Prefira respostas de até 200 palavras. Use Markdown: listas curtas, \`código inline\` e blocos de código com a linguagem (sql ou python).
- Se a pergunta fugir de dados, programação, SQL, Python ou estatística, diga com gentileza que você é o tutor desses temas.

O banco de dados usado nos exercícios de SQL (SQLite) tem estas tabelas:
${SCHEMA_DOC.map((t) => `- ${t.tabela}: ${t.colunas}`).join('\n')}
Nos exercícios de Python, os dados costumam vir em DataFrames já carregados (indicados no enunciado).`;

let sdkPromise = null;
const loadSdk = () => (sdkPromise ??= import('../vendor/anthropic-sdk.js'));

let samplePromise = null;
function getSample() {
  if (!window.claude?.use) return Promise.resolve(null);
  samplePromise ??= window.claude.use('sample').catch(() => null);
  return samplePromise;
}

// Qual caminho está disponível agora: 'key' | 'sample' | null
export async function tutorMode() {
  if (store.getState().tutor.apiKey) return 'key';
  if (await getSample()) return 'sample';
  return null;
}

export const isDemoRuntime = () => !!window.claude?.use;

// Monta o texto de contexto quando a dúvida nasce dentro de um exercício.
export function contextFromStep(step, extra = {}) {
  if (!step) return '';
  const lines = [`[Contexto: o aluno está no exercício abaixo]`];
  const enunciado = step.prompt || step.question || step.title || '';
  if (enunciado) lines.push(`Enunciado: ${enunciado}`);
  if (step.type) lines.push(`Tipo: ${step.type}`);
  if (step.setupNote) lines.push(`Dados: ${step.setupNote}`);
  if (step.options) lines.push(`Alternativas: ${step.options.join(' | ')}`);
  if (extra.code) lines.push(`Código atual do aluno:\n${extra.code}`);
  if (extra.feedback) lines.push(`Última correção do app: ${extra.feedback}`);
  return lines.join('\n');
}

/**
 * Envia a conversa ao tutor e transmite a resposta.
 * @param {{role:'user'|'assistant', content:string}[]} messages conversa (termina com o usuário)
 * @param {{onText:(texto:string)=>void, signal?:AbortSignal}} opts onText recebe o texto COMPLETO até agora
 * @returns {Promise<string>} resposta final
 */
export async function askTutor(messages, { onText, signal } = {}) {
  const mode = await tutorMode();
  if (!mode) throw new TutorError('setup', 'Configure o tutor em Perfil → Tutor de IA.');
  store.countTutorQuestion();
  return mode === 'key' ? askWithKey(messages, onText, signal) : askWithSample(messages, onText, signal);
}

export class TutorError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function askWithKey(messages, onText, signal) {
  const { Anthropic } = await loadSdk();
  const client = new Anthropic({ apiKey: store.getState().tutor.apiKey, dangerouslyAllowBrowser: true });
  let text = '';
  try {
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
        output_config: { effort: 'low' }, // conversa de tutor: respostas rápidas
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default', // se o modelo recusar por política, a API tenta o modelo de reserva
        messages,
      },
      { signal },
    );
    stream.on('text', (delta) => {
      text += delta;
      onText?.(text);
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      throw new TutorError('refusal', 'O tutor não pode responder a essa pergunta. Tente reformular.');
    }
    return text;
  } catch (e) {
    if (e instanceof TutorError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new TutorError('auth', 'Chave de API inválida. Confira em Perfil → Tutor de IA.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new TutorError('auth', 'Esta chave não tem permissão para usar o modelo.');
    if (e instanceof Anthropic.RateLimitError) throw new TutorError('rate', 'Muitas perguntas seguidas. Aguarde alguns segundos e tente de novo.');
    if (e instanceof Anthropic.APIUserAbortError) throw new TutorError('abort', 'Resposta interrompida.');
    if (e instanceof Anthropic.APIConnectionError) throw new TutorError('offline', 'Sem conexão com a internet. O tutor precisa de internet; o resto do app funciona offline.');
    if (e instanceof Anthropic.APIError) throw new TutorError('api', `Erro da API (${e.status ?? '?'}). Tente novamente.`);
    throw new TutorError('unknown', e?.message || 'Erro inesperado.');
  }
}

async function askWithSample(messages, onText, signal) {
  const sample = await getSample();
  // "sample" não tem prompt de sistema: as instruções vão no início da primeira mensagem.
  const [first, ...rest] = messages;
  const input = [{ role: 'user', content: `${SYSTEM_PROMPT}\n\n---\n\n${first.content}` }, ...rest];
  try {
    const res = await sample(input, { onText: ({ text }) => onText?.(text), signal, cache: false });
    return res.text;
  } catch (e) {
    if (e?.code === 'not_granted') throw new TutorError('auth', 'O acesso ao Claude não foi permitido nesta página.');
    if (e?.code === 'rate_limited') throw new TutorError('rate', 'Muitas perguntas seguidas. Aguarde um pouco.');
    throw new TutorError('api', e?.message || 'Não foi possível falar com o tutor.');
  }
}
