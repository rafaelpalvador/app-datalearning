// Trilha "Bancos de Dados com PostgreSQL": do modelo relacional ao ecossistema moderno.
// Formação para Engenharia de Dados, Analytics Engineering, Backend focado em dados e DBA.
import { DB_N1 } from './db/n1.js';
import { DB_N2 } from './db/n2.js';
import { DB_N3 } from './db/n3.js';
import { DB_N4 } from './db/n4.js';
import { DB_N5 } from './db/n5.js';

export const DB_COURSE = {
  id: 'db',
  title: 'Bancos de Dados com PostgreSQL',
  icon: 'database',
  color: '#6250d6',
  description: 'Modelagem, SQL profissional, concorrência, internals e performance, operação em produção e ecossistema moderno (OLAP, NoSQL, cloud e migrations), num PostgreSQL 18 real rodando no aparelho.',
  units: [DB_N1, DB_N2, DB_N3, DB_N4, DB_N5],
};
