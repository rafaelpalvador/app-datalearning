// Dados realistas (e sujos de propósito) usados pelas lições profissionais da trilha de Estatística.
// Gerados com semente fixa: o mesmo resultado no app (Pyodide) e no validador (CPython).
export const PY_PRO = String.raw`
import numpy as np
import pandas as pd
_rng = np.random.default_rng(2024)

# Faturamento B2B (2023-2024), sujo de propósito
_n = 3000
_cli = _rng.integers(1, 801, size=_n)
_seg_cli = _rng.choice(["PME", "Mid-Market", "Enterprise"], size=801, p=[0.6, 0.3, 0.1])     # segmento é do cliente
_reg_cli = _rng.choice(["Sudeste", "Sul", "Nordeste", "Centro-Oeste", "Norte"], size=801, p=[0.45, 0.2, 0.18, 0.1, 0.07])
_seg = _seg_cli[_cli]
_mu = pd.Series(_seg).map({"PME": 7.6, "Mid-Market": 8.8, "Enterprise": 10.0}).to_numpy()
faturas = pd.DataFrame({
    "fatura_id": np.arange(1, _n + 1),
    "cliente_id": _cli,
    "segmento": _seg,
    "regiao": _reg_cli[_cli],
    "emissao": pd.Timestamp("2023-01-01") + pd.to_timedelta(_rng.integers(0, 730, size=_n), unit="D"),
    "valor": np.round(_rng.lognormal(_mu, 0.7), 2),
    "desconto_pct": np.round(np.clip(_rng.normal(5, 4, size=_n), 0, 30), 1),
    "dias_atraso": np.where(_rng.random(_n) < 0.7, 0, _rng.geometric(1 / 20, size=_n)),
})
faturas.loc[_rng.choice(_n, 60, replace=False), "valor"] = np.nan          # sem valor (falha de integração)
faturas.loc[[17, 911, 2048], "valor"] = faturas.loc[[17, 911, 2048], "valor"] * 100   # vírgula perdida (erro de digitação)
faturas.loc[[5, 1200], "valor"] = -faturas.loc[[5, 1200], "valor"]        # estornos lançados como fatura
_pme = faturas.index[faturas.segmento == "PME"].to_numpy()
faturas.loc[_rng.choice(_pme, 40, replace=False), "segmento"] = "pme"   # categoria mal escrita
faturas = pd.concat([faturas, faturas.iloc[[100, 200, 300, 400, 500]]], ignore_index=True)  # duplicadas

# Leads B2B (conversão, contagens e valores de contrato)
_m = 4000
leads = pd.DataFrame({
    "origem": _rng.choice(["inbound", "outbound", "indicacao", "evento"], size=_m, p=[0.45, 0.3, 0.15, 0.1]),
    "funcionarios": np.round(_rng.lognormal(4, 1.1, size=_m)).astype(int) + 1,
    "tempo_resposta_h": np.round(_rng.exponential(12, size=_m), 1),
    "contatos": _rng.poisson(3, size=_m) + 1,
    "demo": (_rng.random(_m) < 0.35).astype(int),
})
_eta = (-1.6 + 0.9 * (leads.origem == "indicacao") + 0.4 * (leads.origem == "inbound") - 0.3 * (leads.origem == "outbound")
        + 0.25 * np.log(leads.funcionarios) - 0.035 * leads.tempo_resposta_h + 1.1 * leads.demo)
leads["converteu"] = (_rng.random(_m) < 1 / (1 + np.exp(-_eta))).astype(int)
leads["chamados_mes"] = _rng.poisson(np.exp(-0.5 + 0.3 * np.log(leads.funcionarios)))
leads["valor_contrato"] = np.round(_rng.gamma(2.0, np.exp(7 + 0.35 * np.log(leads.funcionarios)) / 2.0), 2)

# Receita mensal 2017-2025 (tendência, sazonalidade anual e ruído)
_t = np.arange(108)
mensal = pd.DataFrame({
    "mes": pd.date_range("2017-01-01", periods=108, freq="MS"),
    "receita": np.round((100 + 1.2 * _t) * (1 + 0.18 * np.sin(2 * np.pi * (_t - 2) / 12)) + _rng.normal(0, 4, 108), 1),
})

# Campanha regional sem grupo de controle aleatório: 40 lojas × 26 semanas
_l, _s = 40, 26
_loja = np.repeat(np.arange(1, _l + 1), _s); _sem = np.tile(np.arange(1, _s + 1), _l)
_trat = (_loja <= 15).astype(int)
_base = np.repeat(_rng.normal(100, 15, _l) + 12 * (np.arange(1, _l + 1) <= 15), _s)
campanha = pd.DataFrame({"loja": _loja, "semana": _sem, "tratada": _trat, "pos": (_sem > 16).astype(int)})
campanha["vendas"] = np.round(_base + 0.8 * _sem + 9 * campanha.tratada * campanha.pos + _rng.normal(0, 5, _l * _s), 1)

# Clientes adquiridos (sobrevivência / churn, com censura)
_k = 1500
clientes = pd.DataFrame({
    "plano": _rng.choice(["mensal", "anual"], size=_k, p=[0.65, 0.35]),
    "canal": _rng.choice(["pago", "organico", "indicacao"], size=_k, p=[0.5, 0.35, 0.15]),
    "ticket": np.round(_rng.lognormal(5, 0.5, size=_k), 2),
})
_haz = 0.06 * np.exp(0.7 * (clientes.plano == "mensal") + 0.4 * (clientes.canal == "pago") - 0.3 * (clientes.canal == "indicacao"))
_tev = _rng.exponential(1 / _haz)
_cens = _rng.uniform(1, 30, size=_k)
clientes["meses"] = np.round(np.minimum(_tev, _cens), 1)
clientes["cancelou"] = (_tev <= _cens).astype(int)
`;

export const PY_PRO_NOTE = 'Já carregados (com `pd` e `np`): `faturas` (≈ 3 mil faturas B2B de 2023–2024, **com problemas reais**: valores faltantes, duplicadas, estornos negativos, erros de digitação e segmento mal escrito), `leads` (4 mil leads B2B: origem, funcionarios, tempo_resposta_h, contatos, demo, converteu, chamados_mes, valor_contrato), `mensal` (receita mensal de 2017 a 2025), `campanha` (40 lojas × 26 semanas: tratada, pos, vendas) e `clientes` (1.500 clientes: plano, canal, ticket, meses, cancelou).';

export const P = { setup: PY_PRO, setupNote: PY_PRO_NOTE, packages: ['pandas'] };
export const PM = { ...P, packages: ['pandas', 'matplotlib'] };
