-- Gerado por scripts/gerar-lab.mjs (escala 10). Não edite: rode o gerador de novo.
\timing on

CREATE EXTENSION IF NOT EXISTS pg_trgm;
SELECT setseed(0.42);

CREATE TABLE categorias (
  id      int  PRIMARY KEY,
  nome    text NOT NULL,
  pai_id  int  REFERENCES categorias(id)
);
INSERT INTO categorias (id, nome, pai_id) VALUES
 (1,'Eletrônicos',NULL),(2,'Casa',NULL),(3,'Moda',NULL),(4,'Livros',NULL),(5,'Esporte',NULL),
 (11,'Informática',1),(12,'Celulares',1),(13,'Áudio',1),(111,'Notebooks',11),(112,'Periféricos',11),(113,'Monitores',11),
 (121,'Smartphones',12),(122,'Acessórios para celular',12),(131,'Fones',13),(132,'Caixas de som',13),
 (21,'Móveis',2),(22,'Cozinha',2),(211,'Escritório',21),(212,'Sala',21),(221,'Eletroportáteis',22),(222,'Utensílios',22),
 (31,'Masculino',3),(32,'Feminino',3),(33,'Calçados',3),(41,'Técnicos',4),(42,'Ficção',4),(411,'Dados e IA',41),(412,'Programação',41),
 (51,'Corrida',5),(52,'Academia',5),(53,'Ciclismo',5);

CREATE TABLE clientes (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome        text        NOT NULL,
  email       text,
  cpf         char(11),
  uf          char(2)     NOT NULL,
  cidade      text        NOT NULL,
  segmento    text        NOT NULL CHECK (segmento IN ('varejo','atacado','corporativo')),
  criado_em   timestamptz NOT NULL,
  ativo       boolean     NOT NULL DEFAULT true
);
INSERT INTO clientes (nome, email, cpf, uf, cidade, segmento, criado_em, ativo)
SELECT
  (ARRAY['Ana','Bruno','Carla','Diego','Elisa','Felipe','Gabriela','Henrique','Isabela','João','Karina','Lucas','Marina','Nicolas','Olívia','Paulo','Renata','Sérgio','Tatiane','Vitor'])[1 + (g % 20)]
    || ' ' || (ARRAY['Souza','Lima','Dias','Rocha','Alves','Costa','Pereira','Gomes','Martins','Ribeiro','Teixeira','Cardoso'])[1 + ((g * 7) % 12)],
  CASE WHEN g % 37 = 0 THEN NULL ELSE 'cliente' || g || '@' || (ARRAY['gmail.com','outlook.com','empresa.com.br','yahoo.com.br'])[1 + (g % 4)] END,
  lpad(((g * 7919) % 99999999999)::text, 11, '0'),
  uf.uf, uf.cidade,
  CASE WHEN g % 10 < 7 THEN 'varejo' WHEN g % 10 < 9 THEN 'atacado' ELSE 'corporativo' END,
  timestamptz '2022-01-01 00:00:00+00' + (random() * 1000) * interval '1 day',
  g % 23 <> 0
FROM generate_series(1, 100000) g
CROSS JOIN LATERAL (
  SELECT (ARRAY['SP','SP','SP','RJ','RJ','MG','MG','PR','RS','BA','PE','SC','GO','DF','CE'])[1 + (g % 15)] AS uf,
         (ARRAY['São Paulo','Campinas','Santos','Rio de Janeiro','Niterói','Belo Horizonte','Uberlândia','Curitiba','Porto Alegre','Salvador','Recife','Florianópolis','Goiânia','Brasília','Fortaleza'])[1 + (g % 15)] AS cidade
) uf;

CREATE TABLE produtos (
  id            int           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku           text          NOT NULL UNIQUE,
  nome          text          NOT NULL,
  categoria_id  int           NOT NULL REFERENCES categorias(id),
  preco         numeric(12,2) NOT NULL CHECK (preco > 0),
  custo         numeric(12,2) NOT NULL CHECK (custo > 0),
  ativo         boolean       NOT NULL DEFAULT true,
  atributos     jsonb         NOT NULL DEFAULT '{}'
);
INSERT INTO produtos (sku, nome, categoria_id, preco, custo, ativo, atributos)
SELECT 'SKU-' || lpad(g::text, 5, '0'),
       (ARRAY['Notebook','Mouse','Teclado','Monitor','Smartphone','Capa','Fone','Caixa de som','Cadeira','Mesa','Liquidificador','Panela','Camiseta','Vestido','Tênis','Livro','Bicicleta','Halter','Garrafa','Mochila'])[1 + (g % 20)] || ' ' ||
       (ARRAY['Basic','Pro','Max','Lite','Plus','Ultra','Eco','Slim'])[1 + ((g * 3) % 8)] || ' ' || g,
       (ARRAY[111,112,112,113,121,122,131,132,211,212,221,222,31,32,33,411,53,52,51,5])[1 + (g % 20)],
       p.preco, round((p.preco * (0.45 + random() * 0.3))::numeric, 2),
       g % 41 <> 0,
       jsonb_build_object('cor', (ARRAY['preto','branco','azul','vermelho','cinza'])[1 + (g % 5)],
                          'peso_kg', round((0.1 + random() * 12)::numeric, 2),
                          'garantia_meses', (ARRAY[3, 6, 12, 24])[1 + (g % 4)],
                          'tags', to_jsonb(ARRAY[(ARRAY['promo','novo','importado','nacional','premium'])[1 + (g % 5)]]))
FROM generate_series(1, 15000) g
CROSS JOIN LATERAL (SELECT round((15 + random() * random() * 6000 + g * 0)::numeric, 2) AS preco) p;

CREATE TABLE pedidos (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id  bigint      NOT NULL,
  criado_em   timestamptz NOT NULL,
  status      text        NOT NULL CHECK (status IN ('pendente','pago','enviado','entregue','cancelado','devolvido')),
  canal       text        NOT NULL CHECK (canal IN ('site','app','marketplace','loja')),
  cupom       text
);
INSERT INTO pedidos (cliente_id, criado_em, status, canal, cupom)
SELECT 1 + floor(power(random(), 1.6) * 100000)::int,
       timestamptz '2024-01-01 00:00:00+00' + (random() * 700) * interval '1 day',
       CASE WHEN r < 0.06 THEN 'pendente' WHEN r < 0.12 THEN 'pago' WHEN r < 0.20 THEN 'enviado'
            WHEN r < 0.88 THEN 'entregue' WHEN r < 0.97 THEN 'cancelado' ELSE 'devolvido' END,
       (ARRAY['site','site','app','app','marketplace','loja'])[1 + (g % 6)],
       CASE WHEN g % 9 = 0 THEN (ARRAY['BEMVINDO10','FRETEGRATIS','BLACK20'])[1 + (g % 3)] END
FROM generate_series(1, 800000) g
CROSS JOIN LATERAL (SELECT random() + g * 0 AS r) x;

CREATE TABLE itens_pedido (
  pedido_id       bigint        NOT NULL,
  produto_id      int           NOT NULL,
  quantidade      int           NOT NULL CHECK (quantidade > 0),
  preco_unitario  numeric(12,2) NOT NULL,
  desconto        numeric(5,2)  NOT NULL DEFAULT 0 CHECK (desconto BETWEEN 0 AND 100),
  PRIMARY KEY (pedido_id, produto_id)
);
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, desconto)
SELECT p.id, prod.id,
       1 + (p.id * k) % 3,
       prod.preco,
       CASE WHEN p.cupom IS NOT NULL THEN 10 ELSE 0 END
FROM pedidos p
CROSS JOIN LATERAL generate_series(1, 1 + (p.id % 4)::int) k
JOIN produtos prod ON prod.id = 1 + ((p.id * 7919 + k * 397) % 15000);

CREATE TABLE pagamentos (
  id         bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id  bigint        NOT NULL,
  metodo     text          NOT NULL CHECK (metodo IN ('pix','cartao','boleto')),
  valor      numeric(12,2) NOT NULL CHECK (valor > 0),
  pago_em    timestamptz   NOT NULL,
  status     text          NOT NULL CHECK (status IN ('aprovado','recusado','estornado'))
);
INSERT INTO pagamentos (pedido_id, metodo, valor, pago_em, status)
SELECT p.id, (ARRAY['pix','pix','cartao','cartao','cartao','boleto'])[1 + (p.id % 6)],
       t.total, p.criado_em + (random() * 3) * interval '1 day',
       CASE WHEN p.status = 'devolvido' THEN 'estornado' WHEN p.id % 31 = 0 THEN 'recusado' ELSE 'aprovado' END
FROM pedidos p
JOIN (SELECT pedido_id, round(sum(quantidade * preco_unitario * (1 - desconto / 100)), 2) AS total FROM itens_pedido GROUP BY pedido_id) t ON t.pedido_id = p.id
WHERE p.status <> 'pendente';

CREATE TABLE faturas (
  id          bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id  bigint        NOT NULL,
  emissao     date          NOT NULL,
  vencimento  date          NOT NULL,
  valor       numeric(12,2) NOT NULL CHECK (valor > 0),
  pago_em     date,
  CHECK (vencimento >= emissao)
);
INSERT INTO faturas (cliente_id, emissao, vencimento, valor, pago_em)
SELECT c.id, e.emissao, e.emissao + 30, round((200 + random() * 9000)::numeric, 2),
       CASE WHEN random() < 0.82 THEN e.emissao + (10 + floor(random() * 40))::int END
FROM clientes c
CROSS JOIN LATERAL generate_series(1, 2) k
CROSS JOIN LATERAL (SELECT date '2025-01-05' + ((c.id * 13 + k * 101) % 300)::int AS emissao) e
WHERE c.segmento <> 'varejo';

CREATE TABLE funcionarios (
  id            int           PRIMARY KEY,
  nome          text          NOT NULL,
  cargo         text          NOT NULL,
  departamento  text          NOT NULL,
  gerente_id    int           REFERENCES funcionarios(id),
  salario       numeric(10,2) NOT NULL CHECK (salario > 0),
  admissao      date          NOT NULL
);
INSERT INTO funcionarios VALUES
 (1,'Marina Teixeira','CEO','Diretoria',NULL,48000,'2016-03-01'),
 (2,'Paulo Ribeiro','Diretor de Dados','Dados',1,32000,'2018-06-15'),
 (3,'Renata Gomes','Diretora Comercial','Comercial',1,31000,'2018-09-01'),
 (4,'Sérgio Martins','Diretor Financeiro','Financeiro',1,33000,'2017-01-10');
INSERT INTO funcionarios
SELECT 4 + g,
       'Funcionário ' || (4 + g),
       CASE WHEN g <= 9 THEN 'Coordenador' WHEN g % 4 = 0 THEN 'Analista Sênior' WHEN g % 4 = 1 THEN 'Analista Pleno' ELSE 'Analista Júnior' END,
       (ARRAY['Dados','Comercial','Financeiro'])[1 + (g % 3)],
       CASE WHEN g <= 9 THEN 2 + (g % 3) ELSE 5 + (g % 9) END,
       round((CASE WHEN g <= 9 THEN 18000 ELSE 5000 + random() * 9000 END)::numeric, 2),
       date '2019-01-01' + (g * 17 % 2000)
FROM generate_series(1, 296) g;

CREATE TABLE plano_contas (
  codigo  text PRIMARY KEY,
  nome    text NOT NULL,
  pai     text REFERENCES plano_contas(codigo),
  tipo    text NOT NULL CHECK (tipo IN ('ativo','passivo','receita','despesa'))
);
INSERT INTO plano_contas VALUES
 ('1','Ativo',NULL,'ativo'),('1.1','Ativo circulante','1','ativo'),('1.1.1','Caixa e bancos','1.1','ativo'),('1.1.2','Contas a receber','1.1','ativo'),
 ('1.2','Ativo não circulante','1','ativo'),('1.2.1','Imobilizado','1.2','ativo'),
 ('2','Passivo',NULL,'passivo'),('2.1','Fornecedores','2','passivo'),('2.2','Impostos a pagar','2','passivo'),
 ('3','Receitas',NULL,'receita'),('3.1','Vendas de mercadorias','3','receita'),('3.1.1','Vendas online','3.1','receita'),('3.1.2','Vendas em loja','3.1','receita'),('3.2','Receitas financeiras','3','receita'),
 ('4','Despesas',NULL,'despesa'),('4.1','Despesas comerciais','4','despesa'),('4.1.1','Marketing','4.1','despesa'),('4.1.2','Fretes','4.1','despesa'),('4.2','Despesas administrativas','4','despesa'),('4.2.1','Salários','4.2','despesa'),('4.2.2','Aluguel','4.2','despesa');

CREATE TABLE contas (
  id       int           PRIMARY KEY,
  titular  text          NOT NULL,
  saldo    numeric(14,2) NOT NULL CHECK (saldo >= 0),
  versao   int           NOT NULL DEFAULT 0
);
INSERT INTO contas SELECT g, 'Titular ' || g, round((random() * 5000)::numeric, 2), 0 FROM generate_series(1, 1000) g;

CREATE TABLE lancamentos (
  id         bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conta_id   int           NOT NULL REFERENCES contas(id),
  valor      numeric(14,2) NOT NULL CHECK (valor <> 0),
  descricao  text          NOT NULL,
  criado_em  timestamptz   NOT NULL
);
INSERT INTO lancamentos (conta_id, valor, descricao, criado_em)
SELECT 1 + (g % 1000), round(((random() - 0.45) * 800)::numeric, 2) + 0.01, (ARRAY['depósito','saque','transferência','tarifa'])[1 + (g % 4)],
       timestamptz '2025-01-01 00:00:00+00' + (g * 37 % 300) * interval '1 day' + (g % 1440) * interval '1 minute'
FROM generate_series(1, 200000) g;

CREATE TABLE eventos (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id   bigint      NOT NULL,
  tipo         text        NOT NULL,
  ocorrido_em  timestamptz NOT NULL,
  dados        jsonb       NOT NULL DEFAULT '{}'
);
INSERT INTO eventos (cliente_id, tipo, ocorrido_em, dados)
SELECT 1 + floor(power(random(), 1.3) * 100000)::int,
       (ARRAY['visita','visita','visita','busca','carrinho','compra'])[1 + (g % 6)],
       timestamptz '2025-01-01 00:00:00+00' + (random() * 330) * interval '1 day',
       jsonb_build_object('dispositivo', (ARRAY['android','ios','web'])[1 + (g % 3)], 'pagina', '/p/' || (1 + g % 200))
FROM generate_series(1, 600000) g;

-- importação "suja" vinda de um sistema legado (para limpeza no Nível 2)
CREATE TABLE importacao_vendas (
  linha        int  PRIMARY KEY,
  pedido_ext   text,
  email        text,
  data_txt     text,
  valor_txt    text,
  status_txt   text
);
INSERT INTO importacao_vendas
SELECT g,
       'EXT-' || (CASE WHEN g % 50 = 0 THEN g - 1 ELSE g END),
       CASE WHEN g % 29 = 0 THEN NULL WHEN g % 13 = 0 THEN '  CLIENTE' || (g % 10000) || '@GMAIL.COM ' ELSE 'cliente' || (g % 10000) || '@gmail.com' END,
       CASE WHEN g % 41 = 0 THEN '31/02/2025' WHEN g % 17 = 0 THEN 'ontem' WHEN g % 3 = 0
            THEN to_char(date '2025-01-01' + (g % 300), 'DD/MM/YYYY') ELSE to_char(date '2025-01-01' + (g % 300), 'YYYY-MM-DD') END,
       CASE WHEN g % 19 = 0 THEN NULL WHEN g % 4 = 0 THEN 'R$ ' || replace(to_char(10 + (g * 7919 % 500000) / 100.0, 'FM999999990.00'), '.', ',')
            ELSE to_char(10 + (g * 7919 % 500000) / 100.0, 'FM999999990.00') END,
       (ARRAY['pago','PAGO','Pago ','cancelado','CANCELADO','pendente', NULL])[1 + (g % 7)]
FROM generate_series(1, 200000) g;

-- chaves estrangeiras criadas depois da carga (carga em massa mais rápida)
ALTER TABLE pedidos      ADD CONSTRAINT pedidos_cliente_fk   FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ALTER TABLE itens_pedido ADD CONSTRAINT itens_pedido_fk      FOREIGN KEY (pedido_id)  REFERENCES pedidos(id) ON DELETE CASCADE;
ALTER TABLE itens_pedido ADD CONSTRAINT itens_produto_fk     FOREIGN KEY (produto_id) REFERENCES produtos(id);
ALTER TABLE pagamentos   ADD CONSTRAINT pagamentos_pedido_fk FOREIGN KEY (pedido_id)  REFERENCES pedidos(id);
ALTER TABLE faturas      ADD CONSTRAINT faturas_cliente_fk   FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ALTER TABLE eventos      ADD CONSTRAINT eventos_cliente_fk   FOREIGN KEY (cliente_id) REFERENCES clientes(id);
ANALYZE;

