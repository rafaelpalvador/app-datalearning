// Reorganiza a trilha de Estatística em 5 níveis (estrutura do currículo profissional):
// 1 Descritiva · 2 Probabilidade e amostragem · 3 Inferência e A/B · 4 Modelagem e séries · 5 Sênior.
// Os ids das lições não mudam (o progresso e a revisão espaçada continuam valendo); só a ordem e o nível.
import { L_METODO, L_ROBUSTAS, L_VISUAL, L_OUTLIERS, L_FALTANTES, L_ARMADILHAS, L_PROJETO1 } from './n1.js';
import { L_BAYES_NEG, L_CAUDAS, L_PROJETO2 } from './n2.js';
import { L_POSTHOC, L_DESENHO, L_PROJETO3 } from './n3.js';
import { L_CRAMER, L_INTERACAO, L_GLM, L_SELECAO, L_PREVISAO, L_WALK, L_PROJETO4 } from './n4.js';
import { L_CAUSAL_BASE, L_HIERARQUICO, L_COX, L_MULTI, L_CAPSTONE } from './n5.js';

const NOVAS = [L_METODO, L_ROBUSTAS, L_VISUAL, L_OUTLIERS, L_FALTANTES, L_ARMADILHAS, L_PROJETO1,
  L_BAYES_NEG, L_CAUDAS, L_PROJETO2, L_POSTHOC, L_DESENHO, L_PROJETO3,
  L_CRAMER, L_INTERACAO, L_GLM, L_SELECAO, L_PREVISAO, L_WALK, L_PROJETO4,
  L_CAUSAL_BASE, L_HIERARQUICO, L_COX, L_MULTI, L_CAPSTONE];

const PLANO = [
  // ── Nível 1: Estatística descritiva e pensamento analítico
  { id: 'st-u0', level: 1, lessons: ['st-20-0', 'st-0-1', 'st-0-2'] },
  { id: 'st-u1', level: 1, lessons: ['st-1-1', 'st-20-1', 'st-1-2', 'st-1-3', 'st-1-4'] },
  { id: 'st-u20', level: 1, title: 'Visualização, qualidade dos dados e armadilhas', description: 'Gráficos estatísticos, outliers com critério, dados faltantes, Simpson e o diagnóstico executivo', lessons: ['st-20-2', 'st-20-3', 'st-20-4', 'st-20-5', 'st-20-6'] },
  // ── Nível 2: Probabilidade, distribuições e amostragem
  { id: 'st-u2', level: 2, lessons: ['st-2-0', 'st-2-1', 'st-21-1', 'st-2-4', 'st-2-2', 'st-2-3', 'st-2-5', 'st-21-2', 'st-2-6'] },
  { id: 'st-u21', level: 2, title: 'Amostragem e simulação', description: 'Desenhos amostrais, vieses, Monte Carlo e o simulador de receita', lessons: ['st-0-3', 'st-13-2', 'st-21-3'] },
  // ── Nível 3: Inferência estatística e experimentação
  { id: 'st-u3', level: 3 },
  { id: 'st-u4', level: 3 },
  { id: 'st-u7', level: 3, lessons: ['st-7-1', 'st-7-2', 'st-22-1'] },
  { id: 'st-u9', level: 3 },
  { id: 'st-u11', level: 3 },
  { id: 'st-u22', level: 3, title: 'Experimentação em produção', description: 'Espiar, SRM, testes sequenciais, desenho profissional e o framework completo de A/B', lessons: ['st-15-1', 'st-22-2', 'st-22-3'] },
  // ── Nível 4: Modelagem estatística e séries temporais
  { id: 'st-u5', level: 4, lessons: ['st-5-1', 'st-23-1', 'st-5-2', 'st-5-3'] },
  { id: 'st-u10', level: 4, title: 'Regressão avançada e GLMs', lessons: ['st-10-1', 'st-23-2', 'st-10-2', 'st-23-3'] },
  { id: 'st-u16', level: 4, lessons: ['st-16-1', 'st-23-4', 'st-16-2', 'st-16-3'] },
  { id: 'st-u6', level: 4, title: 'Séries temporais e previsão', description: 'Decomposição, anomalias, ACF/PACF, ARIMA, Holt-Winters, SARIMA, Prophet e validação walk-forward', lessons: ['st-6-1', 'st-6-2', 'st-6-3', 'st-6-4', 'st-23-5', 'st-23-6'] },
  { id: 'st-u23', level: 4, title: 'Projeto de modelagem', description: 'Drivers de conversão B2B e previsão de receita de 6 meses', lessons: ['st-23-7'] },
  // ── Nível 5: Estatística sênior
  { id: 'st-u14', level: 5, lessons: ['st-24-1', 'st-14-1', 'st-14-2', 'st-14-3'] },
  { id: 'st-u12', level: 5, title: 'Verossimilhança e inferência bayesiana', description: 'Máxima verossimilhança, Beta-Binomial, perda esperada, modelos hierárquicos e MCMC', lessons: ['st-13-1', 'st-12-1', 'st-12-2', 'st-24-2'] },
  { id: 'st-u15', level: 5, title: 'Sobrevivência e decisões sequenciais', description: 'Kaplan-Meier, regressão de Cox e bandits', lessons: ['st-15-3', 'st-24-3', 'st-15-2'] },
  { id: 'st-u17', level: 5, title: 'Estatística multivariada', description: 'PCA, análise fatorial, misturas gaussianas e k-means', lessons: ['st-17-1', 'st-24-4', 'st-17-2'] },
  { id: 'st-u18', level: 5 },
  { id: 'st-u24', level: 5, title: 'Capstone sênior', description: 'ROI causal de campanha (DiD) e risco de churn (Cox)', lessons: ['st-24-5'] },
];

export function organizarEstatistica(course) {
  if (course._organizado) return;
  course._organizado = true;
  const unidades = Object.fromEntries(course.units.map((u) => [u.id, u]));
  const licoes = Object.fromEntries(course.units.flatMap((u) => u.lessons).map((l) => [l.id, l]));
  for (const l of NOVAS) {
    if (licoes[l.id]) throw new Error(`lição duplicada: ${l.id}`);
    licoes[l.id] = l;
  }
  const usadas = new Set();
  course.units = PLANO.map((p) => {
    const base = unidades[p.id] || {};
    const ids = p.lessons || base.lessons.map((l) => l.id);
    const lessons = ids.map((id) => {
      if (!licoes[id]) throw new Error(`lição não encontrada no plano da Estatística: ${id}`);
      if (usadas.has(id)) throw new Error(`lição repetida no plano da Estatística: ${id}`);
      usadas.add(id);
      return licoes[id];
    });
    return { ...base, id: p.id, level: p.level, title: p.title || base.title, description: p.description || base.description, lessons };
  });
  const faltando = Object.keys(licoes).filter((id) => !usadas.has(id));
  if (faltando.length) throw new Error(`lições fora do plano da Estatística: ${faltando.join(', ')}`);
  course.description = 'Do zero ao nível sênior, em 5 níveis: descritiva e qualidade dos dados, probabilidade e Monte Carlo, inferência e testes A/B profissionais, regressão, GLMs e previsão, e inferência causal, bayesiana e sobrevivência. Cada nível termina com um projeto de portfólio sobre dados reais e sujos.';
}
