// Base "Superstore Brasil" usada pela trilha de Tableau: gerada de forma determinística
// (mesma semente = mesmos dados no app e no validador). Inspirada no Sample Superstore do Tableau.

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIOES = {
  Sudeste: [['São Paulo', 'SP', -23.55, -46.63], ['Campinas', 'SP', -22.91, -47.06], ['Rio de Janeiro', 'RJ', -22.91, -43.17], ['Belo Horizonte', 'MG', -19.92, -43.94], ['Vitória', 'ES', -20.32, -40.34]],
  Sul: [['Porto Alegre', 'RS', -30.03, -51.23], ['Curitiba', 'PR', -25.43, -49.27], ['Florianópolis', 'SC', -27.6, -48.55]],
  Nordeste: [['Salvador', 'BA', -12.97, -38.5], ['Recife', 'PE', -8.05, -34.88], ['Fortaleza', 'CE', -3.73, -38.53], ['Natal', 'RN', -5.79, -35.21]],
  'Centro-Oeste': [['Brasília', 'DF', -15.79, -47.88], ['Goiânia', 'GO', -16.68, -49.25], ['Campo Grande', 'MS', -20.47, -54.62]],
  Norte: [['Manaus', 'AM', -3.12, -60.02], ['Belém', 'PA', -1.46, -48.5]],
};
const PESO_REGIAO = { Sudeste: 0.44, Sul: 0.18, Nordeste: 0.2, 'Centro-Oeste': 0.11, Norte: 0.07 };
const PRODUTOS = {
  Tecnologia: {
    Telefones: [['Smartphone Aurora X', 2400], ['Telefone IP Conecta', 520], ['Smartphone Lite 5', 1300]],
    Computadores: [['Notebook Pro 14', 6200], ['Desktop Office i5', 3900], ['Notebook Estudante', 2700]],
    Acessórios: [['Mouse sem fio', 120], ['Teclado mecânico', 380], ['Headset USB', 260], ['Webcam Full HD', 330]],
    Copiadoras: [['Multifuncional Laser', 2100], ['Copiadora Corporativa', 9800]],
  },
  Móveis: {
    Cadeiras: [['Cadeira ergonômica', 1450], ['Cadeira de visitante', 390], ['Banqueta alta', 280]],
    Mesas: [['Mesa em L', 1900], ['Mesa de reunião', 3400], ['Mesa regulável', 2600]],
    Estantes: [['Estante de aço', 760], ['Estante de madeira', 980]],
    Decoração: [['Luminária de mesa', 160], ['Quadro branco', 230], ['Relógio de parede', 95]],
  },
  'Material de Escritório': {
    Papel: [['Resma A4', 32], ['Bloco adesivo', 14], ['Papel fotográfico', 45]],
    Fichários: [['Fichário 4 argolas', 38], ['Pasta suspensa (cx)', 62]],
    Armazenamento: [['Arquivo de aço', 690], ['Caixa organizadora', 48]],
    Etiquetas: [['Etiqueta térmica', 55], ['Etiqueta de envio', 29]],
    Utensílios: [['Grampeador', 42], ['Tesoura', 18], ['Calculadora', 75]],
  },
};
const SEGMENTOS = [['Consumidor', 0.5], ['Corporativo', 0.32], ['Home Office', 0.18]];
const MODOS = [['Padrão', 0.6, [3, 7]], ['Segunda classe', 0.2, [2, 5]], ['Primeira classe', 0.14, [1, 3]], ['Mesmo dia', 0.06, [0, 0]]];
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sofia', 'Tiago', 'Vanessa', 'William'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Lima', 'Costa', 'Pereira', 'Almeida', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Dias', 'Barbosa'];

const escolher = (r, pares) => { let x = r(); for (const p of pares) { x -= p[1]; if (x <= 0) return p; } return pares[pares.length - 1]; };
const dia = (ano, mes, d) => new Date(Date.UTC(ano, mes - 1, d));

/** Gera as linhas do Superstore Brasil (≈ 3 mil itens de pedido, 2022 a 2025). */
export function superstore() {
  const r = prng(20240611);
  const clientes = [];
  const usados = new Set();
  for (let i = 1; i <= 420; i++) {
    const regiao = escolher(r, Object.entries(PESO_REGIAO))[0];
    const [cidade, estado, lat, lon] = REGIOES[regiao][Math.floor(r() * REGIOES[regiao].length)];
    let nome;
    do { nome = `${NOMES[Math.floor(r() * NOMES.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]} ${SOBRENOMES[Math.floor(r() * SOBRENOMES.length)]}`; } while (usados.has(nome));
    usados.add(nome);
    clientes.push({ id: `CL-${String(i).padStart(4, '0')}`, nome, segmento: escolher(r, SEGMENTOS)[0], regiao, cidade, estado, lat, lon });
  }
  const catalogo = [];
  for (const [categoria, subs] of Object.entries(PRODUTOS)) for (const [sub, itens] of Object.entries(subs)) for (const [nome, preco] of itens) catalogo.push({ categoria, sub, nome, preco });
  const linhas = [];
  let pedido = 1000;
  // pedidos crescem ~18% ao ano e têm sazonalidade (picos em novembro e dezembro)
  const pesoMes = [0.7, 0.68, 0.85, 0.82, 0.9, 0.88, 0.86, 0.92, 1.0, 1.05, 1.35, 1.5];
  for (let ano = 2022; ano <= 2025; ano++) {
    const fator = Math.pow(1.18, ano - 2022);
    for (let mes = 1; mes <= 12; mes++) {
      const nPedidos = Math.round(36 * fator * pesoMes[mes - 1] * (0.85 + r() * 0.3));
      for (let k = 0; k < nPedidos; k++) {
        pedido += 1;
        const cli = clientes[Math.floor(Math.pow(r(), 1.4) * clientes.length)];
        const data = dia(ano, mes, 1 + Math.floor(r() * 28));
        const [modo, , [dmin, dmax]] = escolher(r, MODOS);
        const envio = new Date(data.getTime() + (dmin + Math.floor(r() * (dmax - dmin + 1))) * 86400000);
        const nItens = 1 + Math.floor(Math.pow(r(), 2) * 4);
        for (let j = 0; j < nItens; j++) {
          const p = catalogo[Math.floor(r() * catalogo.length)];
          const qtd = 1 + Math.floor(Math.pow(r(), 2.2) * (p.preco > 1000 ? 3 : 9));
          const desconto = p.categoria === 'Móveis' ? [0, 0, 0.1, 0.2, 0.3, 0.4][Math.floor(r() * 6)] : [0, 0, 0, 0.1, 0.2][Math.floor(r() * 5)];
          const vendas = Math.round(p.preco * qtd * (1 - desconto) * (0.9 + r() * 0.2) * 100) / 100;
          const margem = { Tecnologia: 0.21, Móveis: 0.11, 'Material de Escritório': 0.27 }[p.categoria] - desconto * 0.8 + (r() - 0.5) * 0.14;
          linhas.push({
            'ID da Linha': linhas.length + 1,
            'ID do Pedido': `BR-${ano}-${pedido}`,
            'Data do Pedido': data,
            'Data de Envio': envio,
            'Modo de Envio': modo,
            'ID do Cliente': cli.id,
            'Cliente': cli.nome,
            'Segmento': cli.segmento,
            'Cidade': cli.cidade,
            'Estado': cli.estado,
            'Região': cli.regiao,
            'Latitude': cli.lat,
            'Longitude': cli.lon,
            'Categoria': p.categoria,
            'Subcategoria': p.sub,
            'Produto': p.nome,
            'Vendas': vendas,
            'Quantidade': qtd,
            'Desconto': desconto,
            'Lucro': Math.round(vendas * margem * 100) / 100,
          });
        }
      }
    }
  }
  return linhas;
}

let cache = null;
export const SUPERSTORE = () => (cache ||= superstore());

/** Campos da fonte de dados, como aparecem no painel de dados do Tableau. */
export const TABLEAU_SCHEMA = [
  { campo: 'ID da Linha', tipo: '# inteiro (medida)', papel: 'medida' },
  { campo: 'ID do Pedido', tipo: 'Abc texto', papel: 'dimensão' },
  { campo: 'Data do Pedido', tipo: 'data', papel: 'dimensão' },
  { campo: 'Data de Envio', tipo: 'data', papel: 'dimensão' },
  { campo: 'Modo de Envio', tipo: 'Abc texto: Padrão, Segunda classe, Primeira classe, Mesmo dia', papel: 'dimensão' },
  { campo: 'ID do Cliente', tipo: 'Abc texto', papel: 'dimensão' },
  { campo: 'Cliente', tipo: 'Abc texto (nome)', papel: 'dimensão' },
  { campo: 'Segmento', tipo: 'Abc texto: Consumidor, Corporativo, Home Office', papel: 'dimensão' },
  { campo: 'Cidade', tipo: 'geográfico (cidade)', papel: 'dimensão' },
  { campo: 'Estado', tipo: 'geográfico (UF)', papel: 'dimensão' },
  { campo: 'Região', tipo: 'Abc texto: Norte, Nordeste, Centro-Oeste, Sudeste, Sul', papel: 'dimensão' },
  { campo: 'Latitude', tipo: '# decimal (graus, da cidade)', papel: 'medida' },
  { campo: 'Longitude', tipo: '# decimal (graus, da cidade)', papel: 'medida' },
  { campo: 'Categoria', tipo: 'Abc texto: Tecnologia, Móveis, Material de Escritório', papel: 'dimensão' },
  { campo: 'Subcategoria', tipo: 'Abc texto', papel: 'dimensão' },
  { campo: 'Produto', tipo: 'Abc texto', papel: 'dimensão' },
  { campo: 'Vendas', tipo: '# decimal (R$)', papel: 'medida' },
  { campo: 'Quantidade', tipo: '# inteiro', papel: 'medida' },
  { campo: 'Desconto', tipo: '# decimal (0 a 0,4)', papel: 'medida' },
  { campo: 'Lucro', tipo: '# decimal (R$, pode ser negativo)', papel: 'medida' },
];
