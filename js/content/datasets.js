// Banco de dados de exemplo usado em todos os exercícios de SQL.
// Uma loja online fictícia ("DataShop") + o time de funcionários.

export const LOJA_SQL = `
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  cidade TEXT,
  estado TEXT,
  data_cadastro TEXT NOT NULL
);
INSERT INTO clientes VALUES
 (1,'Ana Souza','ana@email.com','São Paulo','SP','2023-01-15'),
 (2,'Bruno Lima','bruno@email.com','Rio de Janeiro','RJ','2023-02-03'),
 (3,'Carla Dias',NULL,'Belo Horizonte','MG','2023-03-22'),
 (4,'Diego Alves','diego@email.com','São Paulo','SP','2023-05-10'),
 (5,'Elisa Rocha','elisa@email.com','Curitiba','PR','2023-06-01'),
 (6,'Felipe Melo','felipe@email.com','Porto Alegre','RS','2023-08-19'),
 (7,'Gabriela Nunes','gabi@email.com','São Paulo','SP','2023-09-30'),
 (8,'Henrique Costa',NULL,'Recife','PE','2024-01-12'),
 (9,'Isabela Martins','isa@email.com','Rio de Janeiro','RJ','2024-02-25'),
 (10,'João Pereira','joao@email.com',NULL,NULL,'2024-04-07');

CREATE TABLE produtos (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  preco REAL NOT NULL,
  estoque INTEGER NOT NULL
);
INSERT INTO produtos VALUES
 (1,'Notebook Pro 14','Eletrônicos',5200.00,8),
 (2,'Mouse Sem Fio','Acessórios',89.90,150),
 (3,'Teclado Mecânico','Acessórios',349.90,60),
 (4,'Monitor 27','Eletrônicos',1899.00,20),
 (5,'Cadeira Ergonômica','Móveis',1290.00,15),
 (6,'Mesa Ajustável','Móveis',2100.00,5),
 (7,'Headset Gamer','Acessórios',459.00,40),
 (8,'Webcam Full HD','Acessórios',279.00,0),
 (9,'Smartphone X','Eletrônicos',3499.00,25),
 (10,'Livro SQL Prático','Livros',99.00,200),
 (11,'Livro Python para Dados','Livros',129.00,180),
 (12,'Hub USB-C','Acessórios',149.90,0);

CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  data_pedido TEXT NOT NULL,
  status TEXT NOT NULL
);
INSERT INTO pedidos VALUES
 (1,1,'2024-01-05','entregue'),
 (2,2,'2024-01-12','entregue'),
 (3,1,'2024-02-03','entregue'),
 (4,3,'2024-02-14','cancelado'),
 (5,4,'2024-02-20','entregue'),
 (6,5,'2024-03-02','entregue'),
 (7,2,'2024-03-15','entregue'),
 (8,6,'2024-03-28','entregue'),
 (9,7,'2024-04-04','entregue'),
 (10,1,'2024-04-18','entregue'),
 (11,8,'2024-05-09','cancelado'),
 (12,9,'2024-05-21','entregue'),
 (13,4,'2024-06-02','entregue'),
 (14,7,'2024-06-15','enviado'),
 (15,3,'2024-06-30','entregue'),
 (16,5,'2024-07-08','pendente'),
 (17,9,'2024-07-19','entregue'),
 (18,2,'2024-08-03','entregue'),
 (19,6,'2024-08-25','pendente'),
 (20,1,'2024-09-10','enviado');

CREATE TABLE itens_pedido (
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario REAL NOT NULL,
  PRIMARY KEY (pedido_id, produto_id)
);
INSERT INTO itens_pedido VALUES
 (1,1,1,5200.00),(1,2,1,89.90),
 (2,9,1,3499.00),(2,10,2,99.00),
 (3,3,1,349.90),(3,7,1,459.00),
 (4,5,1,1290.00),
 (5,4,2,1899.00),(5,2,2,89.90),
 (6,11,3,129.00),(6,10,1,99.00),
 (7,6,1,2100.00),
 (8,1,1,5200.00),(8,8,1,279.00),
 (9,9,1,3499.00),(9,7,1,459.00),
 (10,10,1,99.00),(10,11,1,129.00),
 (11,3,1,349.90),
 (12,5,2,1290.00),
 (13,2,3,89.90),(13,3,1,349.90),
 (14,4,1,1899.00),
 (15,8,2,279.00),
 (16,1,1,5200.00),
 (17,11,2,129.00),(17,2,1,89.90),
 (18,7,2,459.00),
 (19,9,1,3499.00),
 (20,6,1,2100.00),(20,5,1,1290.00);

CREATE TABLE funcionarios (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  salario REAL NOT NULL,
  gerente_id INTEGER REFERENCES funcionarios(id),
  data_admissao TEXT NOT NULL
);
INSERT INTO funcionarios VALUES
 (1,'Marina Teixeira','CEO','Diretoria',35000,NULL,'2018-03-01'),
 (2,'Paulo Ribeiro','Diretor de Dados','Dados',22000,1,'2019-06-15'),
 (3,'Renata Gomes','Diretora Comercial','Comercial',21000,1,'2019-09-01'),
 (4,'Lucas Freitas','Cientista de Dados','Dados',14000,2,'2021-02-10'),
 (5,'Sofia Cardoso','Analista de Dados','Dados',9500,2,'2022-05-03'),
 (6,'Tiago Barros','Engenheiro de Dados','Dados',13500,2,'2020-11-20'),
 (7,'Vanessa Pinto','Vendedora','Comercial',6000,3,'2022-08-08'),
 (8,'William Araújo','Vendedor','Comercial',6500,3,'2021-07-19'),
 (9,'Yasmin Castro','Analista de Dados Jr','Dados',6200,5,'2024-01-08'),
 (10,'Rafael Moura','Gerente de Contas','Comercial',11000,3,'2020-04-14');
`;

// ───────────── Tabelas maiores para estatística e entrevistas
// Geradas de forma determinística (mesma semente → mesmos dados em qualquer aparelho).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r2 = (x) => Math.round(x * 100) / 100;
function gauss(rand) {
  // Box-Muller
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildStatsData() {
  // 1) teste A/B do novo checkout: 2.000 usuários
  const ab = [];
  {
    const rand = rng(2024);
    const devices = ['mobile', 'desktop', 'tablet'];
    for (let i = 1; i <= 2000; i++) {
      const grupo = i % 2 === 0 ? 'B' : 'A';
      const disp = devices[rand() < 0.62 ? 0 : rand() < 0.85 ? 1 : 2];
      const base = grupo === 'A' ? 0.10 : 0.13;
      const conv = rand() < base + (disp === 'desktop' ? 0.02 : 0) ? 1 : 0;
      const valor = conv ? r2(Math.max(20, 180 + gauss(rand) * 60 + (grupo === 'B' ? 8 : 0))) : 0;
      const dia = 1 + Math.floor(rand() * 28);
      ab.push([i, grupo, disp, conv, valor, `2024-09-${String(dia).padStart(2, '0')}`]);
    }
  }
  // 2) vendas diárias de 2024 em 3 lojas (sazonalidade semanal e de fim de ano)
  const diarias = [];
  {
    const rand = rng(77);
    const lojas = [['Centro', 1.0], ['Shopping', 1.35], ['Online', 1.8]];
    const start = Date.UTC(2024, 0, 1);
    for (let d = 0; d < 366; d++) {
      const dt = new Date(start + d * 86400000);
      const iso = dt.toISOString().slice(0, 10);
      const dow = dt.getUTCDay();
      const mes = dt.getUTCMonth();
      const semana = dow === 0 ? 0.7 : dow === 6 ? 1.25 : dow === 5 ? 1.15 : 1;
      const sazonal = mes === 10 ? 1.35 : mes === 11 ? 1.6 : mes === 0 ? 0.85 : 1;
      for (const [loja, f] of lojas) {
        const visitantes = Math.round(Math.max(50, (420 * f * semana * sazonal) + gauss(rand) * 45));
        const taxa = Math.min(0.2, Math.max(0.02, 0.075 + gauss(rand) * 0.012));
        const pedidos = Math.max(1, Math.round(visitantes * taxa));
        const ticket = 145 + gauss(rand) * 18 + (loja === 'Online' ? -12 : 0);
        const outlier = rand() < 0.004 ? 4 : 1; // raros dias atípicos (outliers)
        diarias.push([iso, loja, visitantes, pedidos, r2(pedidos * ticket * outlier)]);
      }
    }
  }
  // 3) avaliações de produtos (notas 1–5)
  const aval = [];
  {
    const rand = rng(5);
    const qualidade = { 1: 4.4, 2: 4.1, 3: 4.6, 4: 4.3, 5: 4.5, 6: 3.6, 7: 4.0, 8: 3.1, 9: 4.2, 10: 4.7, 11: 4.8, 12: 3.9 };
    for (let i = 1; i <= 420; i++) {
      const prod = 1 + Math.floor(rand() * 12);
      const cli = 1 + Math.floor(rand() * 10);
      const nota = Math.min(5, Math.max(1, Math.round(qualidade[prod] + gauss(rand) * 0.9)));
      const mes = 1 + Math.floor(rand() * 9);
      const dia = 1 + Math.floor(rand() * 28);
      aval.push([i, prod, cli, nota, `2024-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`]);
    }
  }
  return { ab, diarias, aval };
}

const STATS = buildStatsData();
const sqlVal = (v) => (typeof v === 'string' ? `'${v}'` : String(v));
const sqlRows = (rows) => rows.map((r) => `(${r.map(sqlVal).join(',')})`).join(',');
const csv = (header, rows) => [header, ...rows.map((r) => r.join(','))].join('\n');

export const STATS_SQL = `
CREATE TABLE experimento_ab (
  usuario_id INTEGER PRIMARY KEY,
  grupo TEXT NOT NULL,          -- 'A' = checkout atual, 'B' = checkout novo
  dispositivo TEXT NOT NULL,
  converteu INTEGER NOT NULL,   -- 1 = comprou, 0 = não comprou
  valor_compra REAL NOT NULL,   -- 0 quando não comprou
  data_acesso TEXT NOT NULL
);
INSERT INTO experimento_ab VALUES ${sqlRows(STATS.ab)};
CREATE TABLE vendas_diarias (
  data TEXT NOT NULL,
  loja TEXT NOT NULL,
  visitantes INTEGER NOT NULL,
  pedidos INTEGER NOT NULL,
  receita REAL NOT NULL,
  PRIMARY KEY (data, loja)
);
INSERT INTO vendas_diarias VALUES ${sqlRows(STATS.diarias)};
CREATE TABLE avaliacoes (
  id INTEGER PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  data_avaliacao TEXT NOT NULL
);
INSERT INTO avaliacoes VALUES ${sqlRows(STATS.aval)};
`;
export const DB_SQL = LOJA_SQL + '\n' + STATS_SQL;

// Os mesmos dados como DataFrames do pandas (usados nos exercícios de estatística).
export const PY_STATS = `
import io
import numpy as np
import pandas as pd
ab = pd.read_csv(io.StringIO("""${csv('usuario_id,grupo,dispositivo,converteu,valor_compra,data_acesso', STATS.ab)}"""))
diarias = pd.read_csv(io.StringIO("""${csv('data,loja,visitantes,pedidos,receita', STATS.diarias)}"""), parse_dates=["data"])
avaliacoes = pd.read_csv(io.StringIO("""${csv('id,produto_id,cliente_id,nota,data_avaliacao', STATS.aval)}"""))
`;
export const PY_STATS_NOTE = 'Já carregados: `ab` (teste A/B, 2.000 usuários: grupo, dispositivo, converteu, valor_compra), `diarias` (vendas diárias de 2024 por loja: data, loja, visitantes, pedidos, receita) e `avaliacoes` (420 notas de 1 a 5), além de `pd` e `np`.';

export const SCHEMA_DOC = [
  { tabela: 'clientes', colunas: 'id, nome, email, cidade, estado, data_cadastro' },
  { tabela: 'produtos', colunas: 'id, nome, categoria, preco, estoque' },
  { tabela: 'pedidos', colunas: 'id, cliente_id → clientes.id, data_pedido, status' },
  { tabela: 'itens_pedido', colunas: 'pedido_id → pedidos.id, produto_id → produtos.id, quantidade, preco_unitario' },
  { tabela: 'funcionarios', colunas: 'id, nome, cargo, departamento, salario, gerente_id → funcionarios.id, data_admissao' },
  { tabela: 'experimento_ab', colunas: 'usuario_id, grupo (A/B), dispositivo, converteu (0/1), valor_compra, data_acesso — 2.000 linhas' },
  { tabela: 'vendas_diarias', colunas: 'data, loja (Centro/Shopping/Online), visitantes, pedidos, receita — 1.098 linhas (ano de 2024)' },
  { tabela: 'avaliacoes', colunas: 'id, produto_id → produtos.id, cliente_id → clientes.id, nota (1–5), data_avaliacao — 420 linhas' },
];

// Código Python reutilizado como "setup" nos exercícios de pandas.
export const PY_VENDAS = String.raw`
import pandas as pd
import numpy as np
vendas = pd.DataFrame({
    "pedido":   [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "data":     ["2024-01-05", "2024-01-12", "2024-02-03", "2024-02-14", "2024-02-20", "2024-03-02",
                 "2024-03-15", "2024-03-28", "2024-04-04", "2024-04-18", "2024-05-09", "2024-05-21"],
    "cliente":  ["Ana", "Bruno", "Ana", "Carla", "Diego", "Elisa", "Bruno", "Felipe", "Gabi", "Ana", "Henrique", "Isa"],
    "estado":   ["SP", "RJ", "SP", "MG", "SP", "PR", "RJ", "RS", "SP", "SP", "PE", "RJ"],
    "categoria":["Eletrônicos", "Eletrônicos", "Acessórios", "Móveis", "Eletrônicos", "Livros",
                 "Móveis", "Eletrônicos", "Eletrônicos", "Livros", "Acessórios", "Móveis"],
    "valor":    [5289.9, 3697.0, 808.9, 1290.0, 3977.8, 486.0, 2100.0, 5479.0, 3958.0, 228.0, 349.9, 2580.0],
    "status":   ["entregue", "entregue", "entregue", "cancelado", "entregue", "entregue",
                 "entregue", "entregue", "entregue", "entregue", "cancelado", "entregue"],
})
`;
