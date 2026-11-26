// Trilha "Experimentação e Testes A/B": do primeiro teste A/B à plataforma de experimentação em escala.
// Exercícios em Python (NumPy/pandas, sem scipy) e SQL (tabelas exp_* do banco do app).
import { EX_N1 } from './exp/n1.js';
import { EX_N2 } from './exp/n2.js';
import { EX_N3 } from './exp/n3.js';
import { EX_N4 } from './exp/n4.js';

export const EXP_COURSE = {
  id: 'exp',
  title: 'Experimentação e Testes A/B',
  icon: 'flask',
  color: '#0f766e',
  description: 'Hipóteses, p-valor e poder, tamanho de amostra, SRM, peeking, múltiplas comparações, CUPED, Delta Method, testes sequenciais e bayesianos, inferência causal, bandits, uplift e plataformas de experimentação em escala.',
  units: [...EX_N1, ...EX_N2, ...EX_N3, ...EX_N4],
};
