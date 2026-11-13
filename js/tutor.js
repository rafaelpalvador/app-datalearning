// Tutor de IA para tirar dúvidas, com o provedor de IA que o aluno preferir.
//
// Provedores:
//  - Claude (Anthropic): SDK oficial da Anthropic
//  - Gemini (Google): API Generative Language (REST com streaming SSE)
//  - ChatGPT (OpenAI), OpenRouter, Groq, Mistral, DeepSeek, Ollama e qualquer API
//    compatível com a OpenAI: endpoint /chat/completions com streaming SSE
//  - Na demonstração publicada no Claude: o recurso "sample" da página (sem chave)
//
// As chaves ficam salvas só no aparelho e são enviadas apenas ao provedor escolhido.

import { SCHEMA_DOC } from './content/datasets.js';
import * as store from './state.js';

export const PROVIDERS = {
  gemini: { name: 'Gemini', vendor: 'Google', kind: 'gemini', keyHint: 'AIza...', keyUrl: 'aistudio.google.com/apikey', modelPrefer: [/flash/, /pro/] },
  openai: { name: 'ChatGPT', vendor: 'OpenAI', kind: 'openai', base: 'https://api.openai.com/v1', keyHint: 'sk-...', keyUrl: 'platform.openai.com/api-keys', modelPrefer: [/^gpt.*mini/, /^gpt/] },
  anthropic: { name: 'Claude', vendor: 'Anthropic', kind: 'anthropic', keyHint: 'sk-ant-...', keyUrl: 'platform.claude.com/settings/keys', defaultModel: 'claude-haiku-5-5' },
  openrouter: { name: 'OpenRouter', vendor: 'centenas de modelos', kind: 'openai', base: 'https://openrouter.ai/api/v1', keyHint: 'sk-or-...', keyUrl: 'openrouter.ai/keys', modelPrefer: [/gemini.*flash/, /gpt.*mini/, /claude/] },
  groq: { name: 'Groq', vendor: 'modelos abertos, muito rápido', kind: 'openai', base: 'https://api.groq.com/openai/v1', keyHint: 'gsk_...', keyUrl: 'console.groq.com/keys', modelPrefer: [/llama/, /qwen/] },
  mistral: { name: 'Mistral', vendor: 'Mistral AI', kind: 'openai', base: 'https://api.mistral.ai/v1', keyHint: 'chave da Mistral', keyUrl: 'console.mistral.ai/api-keys', modelPrefer: [/mistral-small/, /mistral-medium/, /mistral/] },
  deepseek: { name: 'DeepSeek', vendor: 'DeepSeek', kind: 'openai', base: 'https://api.deepseek.com/v1', keyHint: 'sk-...', keyUrl: 'platform.deepseek.com/api_keys', modelPrefer: [/chat/] },
  ollama: { name: 'Ollama', vendor: 'IA local no seu computador', kind: 'openai', base: 'http://localhost:11434/v1', noKey: true, keyUrl: 'ollama.com', modelPrefer: [/./] },
  custom: { name: 'Outro', vendor: 'qualquer API compatível com a OpenAI', kind: 'openai', base: '', editableBase: true, optionalKey: true, keyUrl: '', modelPrefer: [/./] },
};
export const PROVIDER_ORDER = ['gemini', 'openai', 'anthropic', 'openrouter', 'groq', 'mistral', 'deepseek', 'ollama', 'custom'];

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

export class TutorError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ───────────── configuração
export const tutorConfig = () => store.getState().tutor;
export const providerOf = (id) => PROVIDERS[id] || PROVIDERS.gemini;
export const baseUrlOf = (id) => (PROVIDERS[id]?.editableBase ? tutorConfig().baseUrls?.[id] || '' : PROVIDERS[id]?.base || '');
export const keyOf = (id) => tutorConfig().keys?.[id] || '';
export const modelOf = (id) => tutorConfig().models?.[id] || PROVIDERS[id]?.defaultModel || '';

export function isConfigured(id = tutorConfig().provider) {
  const p = PROVIDERS[id];
  if (!p) return false;
  if (p.editableBase && !baseUrlOf(id)) return false;
  return p.noKey || p.optionalKey || !!keyOf(id);
}

let samplePromise = null;
function getSample() {
  if (!window.claude?.use) return Promise.resolve(null);
  samplePromise ??= window.claude.use('sample').catch(() => null);
  return samplePromise;
}
export const isDemoRuntime = () => !!window.claude?.use;

// Qual caminho está disponível agora: id do provedor | 'sample' | null
export async function tutorMode() {
  const id = tutorConfig().provider;
  if (id && isConfigured(id)) return id;
  if (await getSample()) return 'sample';
  return null;
}

export function activeLabel(mode) {
  if (mode === 'sample') return 'Claude (desta página)';
  const p = PROVIDERS[mode];
  if (!p) return '';
  const m = modelOf(mode);
  return m ? `${p.name} · ${m}` : p.name;
}

// Contexto do exercício para a pergunta
export function contextFromStep(step, extra = {}) {
  if (!step) return '';
  const lines = ['[Contexto: o aluno está no exercício abaixo]'];
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
 * @param {{onText:(texto:string)=>void, signal?:AbortSignal, provider?:string}} opts onText recebe o texto COMPLETO até agora
 */
export async function askTutor(messages, { onText, signal, provider } = {}) {
  const mode = provider || await tutorMode();
  if (!mode) throw new TutorError('setup', 'Escolha uma IA e configure em Perfil → Tutor de IA.');
  store.countTutorQuestion();
  if (mode === 'sample') return askWithSample(messages, onText, signal);
  const p = providerOf(mode);
  if (p.kind === 'anthropic') return askAnthropic(messages, onText, signal);
  if (p.kind === 'gemini') return askGemini(mode, messages, onText, signal);
  return askOpenAICompatible(mode, messages, onText, signal);
}

// Teste rápido de conexão com o provedor escolhido.
export async function testConnection(id) {
  let text = '';
  await askTutor([{ role: 'user', content: 'Responda apenas com a palavra: ok' }], { provider: id, onText: (t) => { text = t; } });
  return text.trim();
}

// ───────────── Claude (Anthropic) — SDK oficial
let sdkPromise = null;
const loadSdk = () => (sdkPromise ??= import('../vendor/anthropic-sdk.js'));

// Modelos que aceitam o modelo de reserva no servidor (fallbacks). O Haiku não aceita:
// mandar o parâmetro para ele faria a requisição falhar.
const SUPPORTS_FALLBACK = /^claude-(fable-5-[12]|mythos-5-[12]|opus-5(-5)?|sonnet-5-5)$/;

async function askAnthropic(messages, onText, signal) {
  const { Anthropic } = await loadSdk();
  const client = new Anthropic({ apiKey: keyOf('anthropic'), dangerouslyAllowBrowser: true });
  const model = modelOf('anthropic') || PROVIDERS.anthropic.defaultModel;
  let text = '';
  try {
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
        output_config: { effort: 'low' }, // conversa de tutor: respostas rápidas e baratas
        // se o modelo recusar por política, a API tenta um modelo de reserva na mesma chamada
        ...(SUPPORTS_FALLBACK.test(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
        messages,
      },
      { signal },
    );
    stream.on('text', (delta) => {
      text += delta;
      onText?.(text);
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new TutorError('refusal', 'O tutor não pode responder a essa pergunta. Tente reformular.');
    return text;
  } catch (e) {
    if (e instanceof TutorError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new TutorError('auth', 'Chave da Anthropic inválida. Confira em Perfil → Tutor de IA.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new TutorError('auth', 'Esta chave não tem permissão para usar o modelo escolhido.');
    if (e instanceof Anthropic.NotFoundError) throw new TutorError('model', 'Modelo não encontrado. Escolha outro em Perfil → Tutor de IA.');
    if (e instanceof Anthropic.RateLimitError) throw new TutorError('rate', 'Muitas perguntas seguidas. Aguarde alguns segundos e tente de novo.');
    if (e instanceof Anthropic.APIUserAbortError) throw new TutorError('abort', 'Resposta interrompida.');
    if (e instanceof Anthropic.APIConnectionError) throw new TutorError('offline', 'Sem conexão com a internet. O tutor precisa de internet; o resto do app funciona offline.');
    if (e instanceof Anthropic.APIError) throw new TutorError('api', `Erro da API da Anthropic (${e.status ?? '?'}). Tente novamente.`);
    throw new TutorError('unknown', e?.message || 'Erro inesperado.');
  }
}

async function listAnthropicModels() {
  const { Anthropic } = await loadSdk();
  const client = new Anthropic({ apiKey: keyOf('anthropic'), dangerouslyAllowBrowser: true });
  const ids = [];
  for await (const m of client.models.list()) ids.push(m.id);
  return ids;
}

// ───────────── utilidades HTTP (Gemini e compatíveis com OpenAI)
async function httpError(res, providerName) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.error?.message || j?.message || '';
  } catch { /* corpo não é JSON */ }
  if (res.status === 401 || res.status === 403) return new TutorError('auth', `Chave inválida ou sem permissão no ${providerName}.${detail ? ` (${detail})` : ''}`);
  if (res.status === 404) return new TutorError('model', `Modelo ou endereço não encontrado no ${providerName}. Escolha outro modelo.${detail ? ` (${detail})` : ''}`);
  if (res.status === 429) return new TutorError('rate', `Limite de uso atingido no ${providerName}. Aguarde um pouco ou confira sua cota.`);
  return new TutorError('api', `Erro ${res.status} no ${providerName}.${detail ? ` ${detail}` : ''}`);
}

async function doFetch(url, init, providerName) {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (e?.name === 'AbortError') throw new TutorError('abort', 'Resposta interrompida.');
    throw new TutorError('offline', `Não foi possível conectar ao ${providerName}. Verifique a internet${providerName === 'Ollama' || providerName === 'Outro' ? ', se o servidor está rodando e se ele aceita chamadas do app (CORS; no Ollama: OLLAMA_ORIGINS=*)' : ''}.`);
  }
}

// Lê um stream SSE e chama onData(json) para cada evento "data:".
async function readSSE(res, onData) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try { onData(JSON.parse(data)); } catch { /* linha parcial ou não-JSON */ }
    }
  }
}

// ───────────── Gemini (Google)
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function ensureModel(id) {
  let m = modelOf(id);
  if (m) return m;
  const list = await listModels(id);
  m = pickModel(id, list);
  if (!m) throw new TutorError('model', 'Nenhum modelo disponível. Escolha um em Perfil → Tutor de IA.');
  store.setTutorModel(id, m);
  return m;
}

async function askGemini(id, messages, onText, signal) {
  const model = await ensureModel(id);
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
  };
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(model.replace(/^models\//, ''))}:streamGenerateContent?alt=sse`;
  const res = await doFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': keyOf(id) },
    body: JSON.stringify(body),
    signal,
  }, 'Gemini');
  if (!res.ok) throw await httpError(res, 'Gemini');
  let text = '';
  let blocked = '';
  await readSSE(res, (j) => {
    const parts = j?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) if (p.text && !p.thought) text += p.text;
    if (j?.promptFeedback?.blockReason) blocked = j.promptFeedback.blockReason;
    onText?.(text);
  });
  if (!text && blocked) throw new TutorError('refusal', 'O Gemini bloqueou essa pergunta. Tente reformular.');
  return text;
}

// ───────────── OpenAI e compatíveis
function openAIHeaders(id) {
  const h = { 'content-type': 'application/json' };
  const key = keyOf(id);
  if (key) h.authorization = `Bearer ${key}`;
  if (id === 'openrouter') h['x-title'] = 'Datum';
  return h;
}

async function askOpenAICompatible(id, messages, onText, signal) {
  const p = providerOf(id);
  const base = baseUrlOf(id).replace(/\/+$/, '');
  if (!base) throw new TutorError('setup', 'Informe o endereço da API em Perfil → Tutor de IA.');
  const model = await ensureModel(id);
  const res = await doFetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: openAIHeaders(id),
    body: JSON.stringify({ model, stream: true, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages] }),
    signal,
  }, p.name);
  if (!res.ok) throw await httpError(res, p.name);
  let text = '';
  await readSSE(res, (j) => {
    const delta = j?.choices?.[0]?.delta?.content;
    if (delta) {
      text += delta;
      onText?.(text);
    }
  });
  return text;
}

// ───────────── lista de modelos de cada provedor
export async function listModels(id) {
  const p = providerOf(id);
  if (p.kind === 'anthropic') {
    try { return await listAnthropicModels(); } catch { throw new TutorError('auth', 'Não foi possível listar os modelos. Confira a chave.'); }
  }
  if (p.kind === 'gemini') {
    const res = await doFetch(`${GEMINI_BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': keyOf(id) } }, 'Gemini');
    if (!res.ok) throw await httpError(res, 'Gemini');
    const j = await res.json();
    return (j.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((n) => !/embedding|aqa|imagen|veo|tts|image|audio|live/.test(n));
  }
  const base = baseUrlOf(id).replace(/\/+$/, '');
  if (!base) throw new TutorError('setup', 'Informe o endereço da API primeiro.');
  const res = await doFetch(`${base}/models`, { headers: openAIHeaders(id) }, p.name);
  if (!res.ok) throw await httpError(res, p.name);
  const j = await res.json();
  return (j.data || j.models || [])
    .map((m) => m.id || m.name)
    .filter(Boolean)
    .filter((n) => !/embed|whisper|tts|dall-e|image|audio|moderation|realtime|transcribe|search/i.test(n));
}

export function pickModel(id, list) {
  if (!list.length) return '';
  const prefer = providerOf(id).modelPrefer || [];
  for (const re of prefer) {
    const hit = [...list].sort().reverse().find((n) => re.test(n));
    if (hit) return hit;
  }
  return list[0];
}

// ───────────── demonstração no Claude (recurso "sample" da página)
async function askWithSample(messages, onText, signal) {
  const sample = await getSample();
  if (!sample) throw new TutorError('setup', 'Configure uma IA em Perfil → Tutor de IA.');
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
