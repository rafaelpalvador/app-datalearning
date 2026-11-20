-- Depois do estresse: tudo abaixo precisa dar "true".
SELECT (SELECT count(*) FROM contas WHERE saldo < 0) = 0                         AS nenhum_saldo_negativo,
       (SELECT sum(saldo) FROM contas) = (SELECT total FROM ledger_antes)          AS dinheiro_conservado,
       (SELECT count(*) FROM transferencias) * 2 =
       (SELECT count(*) FROM lancamentos WHERE descricao LIKE 'transferência %')  AS partidas_dobradas;
