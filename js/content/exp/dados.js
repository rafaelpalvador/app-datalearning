// Dados da trilha de Experimentação. Gerados com semente fixa: o mesmo resultado no app (Pyodide)
// e no validador (CPython). Cada nível tem a sua base, para o código de preparo ficar leve.
const r = String.raw;

const BASE = r`
import numpy as np
import pandas as pd
from math import erf, erfc, sqrt, log, exp, ceil
from statistics import NormalDist
`;

// ── Nível 1: teste do botão "Comprar agora" em um e-commerce (14 dias)
const N1 = BASE + r`
_r = np.random.default_rng(7)
_n = 30000
teste = pd.DataFrame({
    "usuario": np.arange(1, _n + 1),
    "grupo": np.where(_r.random(_n) < 0.5, "A", "B"),
    "dia": _r.integers(1, 15, size=_n),
    "dispositivo": _r.choice(["mobile", "desktop"], size=_n, p=[0.7, 0.3]),
})
_b = (teste.grupo == "B").to_numpy()
_p = 0.040 + 0.010 * (teste.dispositivo == "desktop").to_numpy() + 0.004 * _b
teste["converteu"] = (_r.random(_n) < _p).astype(int)
teste["receita"] = np.where(teste.converteu == 1, np.round(_r.lognormal(5.0, 0.8, size=_n), 2), 0.0)
teste["minutos"] = np.round(_r.gamma(2.0, 3.0 + 0.15 * _b), 2)
`;
const N1_NOTE = 'Já carregados: `teste` (30 mil usuários de um teste A/B de 14 dias do botão "Comprar agora": usuario, grupo A/B, dia, dispositivo, converteu 0/1, receita, minutos de sessão), `pd`, `np`, `NormalDist` e `erf`, `erfc`, `sqrt`, `log`, `exp`, `ceil` do módulo math.';

// ── Nível 2: app de delivery, teste do novo carrinho (4 semanas), com sessões e segmentos
const N2 = BASE + r`
_r = np.random.default_rng(11)
_n = 24000
usuarios = pd.DataFrame({
    "usuario": np.arange(1, _n + 1),
    "variante": np.where(_r.random(_n) < 0.5, "controle", "tratamento"),
    "plataforma": _r.choice(["ios", "android", "web"], size=_n, p=[0.35, 0.40, 0.25]),
    "tipo": _r.choice(["novo", "recorrente"], size=_n, p=[0.45, 0.55]),
    "semana": _r.integers(1, 5, size=_n),
    "viu_carrinho": (_r.random(_n) < 0.38).astype(int),
})
_t = (usuarios.variante == "tratamento").to_numpy() * usuarios.viu_carrinho.to_numpy()
_ef = np.where(usuarios.plataforma == "android", 0.030, np.where(usuarios.plataforma == "ios", 0.012, 0.0))
_nov = np.where(usuarios.semana == 1, 0.030, 0.0)
_base = 0.05 + 0.02 * (usuarios.tipo == "recorrente").to_numpy() + 0.06 * usuarios.viu_carrinho.to_numpy()
usuarios["converteu"] = (_r.random(_n) < _base + _t * (_ef + _nov)).astype(int)
_baleia = _r.random(_n) < 0.004
usuarios["receita"] = np.where(usuarios.converteu == 1, np.round(_r.lognormal(4.2, 1.0, size=_n) * np.where(_baleia, 40, 1), 2), 0.0)
usuarios["latencia_ms"] = np.round(_r.lognormal(np.log(420) + 0.03 * (usuarios.variante == "tratamento").to_numpy(), 0.45))
_k = (_r.poisson(3, size=_n) + 1).astype(np.intp)
sessoes = pd.DataFrame({"usuario": np.repeat(usuarios.usuario.to_numpy(), _k),
                        "variante": np.repeat(usuarios.variante.to_numpy(), _k)})
_af = np.repeat(_r.normal(0, 1.2, size=_n), _k)
sessoes["clicou"] = (_r.random(len(sessoes)) < 1 / (1 + np.exp(-(-1.4 + _af + 0.03 * (sessoes.variante == "tratamento").to_numpy())))).astype(int)
`;
const N2_NOTE = 'Já carregados: `usuarios` (24 mil usuários de um teste de 4 semanas do novo carrinho de um app de delivery: usuario, variante controle/tratamento, plataforma ios/android/web, tipo novo/recorrente, semana de entrada 1–4, viu_carrinho 0/1, converteu, receita com cauda longa, latencia_ms), `sessoes` (≈ 96 mil sessões dos mesmos usuários: usuario, variante, clicou), `pd`, `np`, `NormalDist` e funções do math (`erf`, `erfc`, `sqrt`, `log`, `exp`, `ceil`).';

// ── Nível 3: assinatura de streaming (CUPED e razão), cidades (DiD e controle sintético),
//    cupom observacional (IPW), crédito por score (RDD) e switchback de preço dinâmico
const N3 = BASE + r`
_r = np.random.default_rng(23)
_n = 20000
ab = pd.DataFrame({"usuario": np.arange(1, _n + 1), "grupo": np.where(_r.random(_n) < 0.5, "A", "B")})
_b = (ab.grupo == "B").to_numpy()
_nivel = _r.gamma(2.0, 30.0, size=_n)
ab["minutos_pre"] = np.round(_nivel * _r.lognormal(0, 0.25, size=_n), 1)
ab["minutos"] = np.round(np.maximum(0, _nivel * _r.lognormal(0, 0.25, size=_n) + 1.8 * _b + _r.normal(0, 8, size=_n)), 1)
_engaj = _r.lognormal(0, 1.0, size=_n)
ab["paginas"] = _r.poisson(5 * _engaj) + 1
_ctr = np.clip(_r.beta(1.5, 12, size=_n) * (1 + 0.6 * (_engaj > 2)) + 0.008 * _b, 0.001, 0.999)
ab["cliques"] = _r.binomial(ab.paginas.to_numpy(), _ctr)

_cid = ["Recife", "Salvador", "Fortaleza", "Natal", "Maceió", "João Pessoa", "Aracaju", "Teresina", "São Luís", "Belém", "Manaus", "Goiânia"]
_w = np.arange(1, 61)
_comum = 100 + 0.6 * _w + 6 * np.sin(2 * np.pi * _w / 52)
_rows = []
for _i, _c in enumerate(_cid):
    _nv = _r.normal(0, 15) + (0.06 * _w * _r.normal(0, 1) if _c in ("Manaus", "Goiânia") else 0)
    _v = _comum + _nv + _r.normal(0, 2.0, size=60) + (np.where(_w >= 45, 9.0, 0.0) if _c == "Recife" else 0.0)
    _rows.append(pd.DataFrame({"cidade": _c, "semana": _w, "pedidos": np.round(_v, 1)}))
cidades = pd.concat(_rows, ignore_index=True)

_m = 12000
obs = pd.DataFrame({"ativo": (_r.random(_m) < 0.4).astype(int), "jovem": (_r.random(_m) < 0.5).astype(int)})
_ps = 0.15 + 0.45 * obs.ativo.to_numpy() + 0.10 * obs.jovem.to_numpy()
obs["cupom"] = (_r.random(_m) < _ps).astype(int)
obs["gasto"] = np.round(40 + 60 * obs.ativo + 10 * obs.jovem + 8 * obs.cupom + _r.normal(0, 15, size=_m), 2)

_q = 6000
rdd = pd.DataFrame({"score": _r.integers(300, 901, size=_q)})
rdd["limite"] = (rdd.score >= 600).astype(int)
rdd["gasto"] = np.round(200 + 0.5 * rdd.score + 70 * rdd.limite + _r.normal(0, 40, size=_q), 2)

_h = np.arange(21 * 24)
_jan = _h // 4
_trat = (_r.random(_jan.max() + 1) < 0.5).astype(int)[_jan]
_pos = _h % 4
_ant = np.r_[0, _trat[:-1]]
switch = pd.DataFrame({"hora": _h, "hora_do_dia": _h % 24, "janela": _jan, "tratamento": _trat, "hora_na_janela": _pos})
_efeito = np.where(_pos == 0, 4.0 * (0.5 * _trat + 0.5 * _ant), 4.0 * _trat)   # na 1ª hora da janela ainda sobra metade do efeito da janela anterior
switch["entregas"] = np.round(50 + 15 * np.sin(2 * np.pi * (_h % 24) / 24) + _efeito + _r.normal(0, 2, size=len(_h)), 1)
`;
const N3_NOTE = 'Já carregados: `ab` (20 mil assinantes de um streaming: usuario, grupo A/B, minutos_pre, minutos, paginas, cliques), `cidades` (12 capitais × 60 semanas de pedidos por mil habitantes; Recife lançou o programa de fidelidade na semana 45), `obs` (12 mil clientes **sem randomização**: ativo, jovem, cupom, gasto), `rdd` (6 mil clientes: score de 300 a 900, limite = 1 a partir de 600, gasto), `switch` (21 dias × 24 horas de um switchback de preço dinâmico em janelas de 4 horas: hora, hora_do_dia, janela, tratamento, hora_na_janela 0–3, entregas), `pd`, `np`, `NormalDist` e funções do math.';

// ── Nível 4: cupom em um marketplace (uplift), histórico de experimentos (meta-análise), logs de recomendação (OPE)
const N4 = BASE + r`
import hashlib
_r = np.random.default_rng(41)
_n = 30000
uplift = pd.DataFrame({
    "visitas_30d": _r.poisson(6, size=_n),
    "plano": _r.choice(["free", "pro"], size=_n, p=[0.75, 0.25]),
    "tratamento": (_r.random(_n) < 0.5).astype(int),
})
uplift["faixa"] = pd.cut(uplift.visitas_30d, [-1, 2, 5, 9, 100], labels=["0-2", "3-5", "6-9", "10+"]).astype(str)
_base = 0.04 + 0.012 * np.minimum(uplift.visitas_30d.to_numpy(), 12) + 0.10 * (uplift.plano == "pro").to_numpy()
_cate = np.select([uplift.plano == "pro", uplift.faixa == "3-5", uplift.faixa == "6-9", uplift.faixa == "0-2"], [-0.03, 0.08, 0.05, 0.01], 0.0)
uplift["comprou"] = (_r.random(_n) < np.clip(_base + uplift.tratamento.to_numpy() * _cate, 0, 1)).astype(int)

_k = 80
historico = pd.DataFrame({"experimento": [f"EXP-{i:03d}" for i in range(1, _k + 1)], "ep": np.round(_r.uniform(0.2, 0.6, size=_k), 3)})
_real = np.where(_r.random(_k) < 0.65, 0.0, _r.normal(0.5, 0.4, size=_k))
historico["estimativa"] = np.round(_real + _r.normal(0, historico.ep.to_numpy()), 3)
historico["efeito_real"] = np.round(_real, 3)

_l = 20000
logs = pd.DataFrame({"contexto": _r.choice(["manha", "tarde", "noite"], size=_l)})
_pa = np.where(logs.contexto == "noite", 0.7, 0.3)
logs["acao"] = np.where(_r.random(_l) < _pa, "filmes", "series")
logs["prob"] = np.where(logs.acao == "filmes", _pa, 1 - _pa)
_ctr = {("manha", "filmes"): 0.05, ("manha", "series"): 0.09, ("tarde", "filmes"): 0.06, ("tarde", "series"): 0.08, ("noite", "filmes"): 0.12, ("noite", "series"): 0.07}
logs["clicou"] = (_r.random(_l) < np.array([_ctr[(c, a)] for c, a in zip(logs.contexto, logs.acao)])).astype(int)
`;
const N4_NOTE = 'Já carregados: `uplift` (30 mil clientes de um teste de cupom: visitas_30d, faixa de visitas, plano free/pro, tratamento 0/1, comprou), `historico` (80 experimentos passados: experimento, estimativa do efeito em %, ep = erro padrão, efeito_real, conhecido só nesta simulação), `logs` (20 mil recomendações registradas: contexto, acao, prob = probabilidade com que a política de produção escolheu a ação, clicou), `hashlib`, `pd`, `np`, `NormalDist` e funções do math.';

export const D1 = { setup: N1, setupNote: N1_NOTE, packages: ['pandas'] };
export const D2 = { setup: N2, setupNote: N2_NOTE, packages: ['pandas'] };
export const D3 = { setup: N3, setupNote: N3_NOTE, packages: ['pandas'] };
export const D4 = { setup: N4, setupNote: N4_NOTE, packages: ['pandas'] };
export const PURO = { setup: BASE, setupNote: 'Já carregados: `pd`, `np`, `NormalDist` (módulo statistics) e `erf`, `erfc`, `sqrt`, `log`, `exp`, `ceil` (módulo math).', packages: ['pandas'] };
export const PURO_MPL = { ...PURO, packages: ['pandas', 'matplotlib'] };
