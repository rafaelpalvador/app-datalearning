// Trilha "Tableau do Leigo ao Master": do primeiro gráfico à arquitetura enterprise e analytics agêntico.
// Os cálculos rodam no motor do app (js/engines/tableau-engine.js) sobre a base Superstore Brasil.
import { TB_N1 } from './tableau/n1.js';
import { TB_N2 } from './tableau/n2.js';
import { TB_N3 } from './tableau/n3.js';
import { TB_N4 } from './tableau/n4.js';
import { TB_N5 } from './tableau/n5.js';

export const TABLEAU_COURSE = {
  id: 'tableau',
  title: 'Tableau do Leigo ao Master',
  icon: 'chart',
  color: '#b9530c',
  description: 'BI e visualização, pílulas azuis e verdes, campos calculados, LOD, cálculos de tabela, modelagem, Prep, performance, governança, APIs e IA (Pulse, Agent, Next), com os cálculos rodando de verdade no app.',
  units: [TB_N1, TB_N2, TB_N3, TB_N4, TB_N5],
};
