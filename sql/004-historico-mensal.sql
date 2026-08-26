-- Histórico mensal fechado (Nov/2025 em diante), usado pelo comparativo do
-- relatório e pela Visão Geral. Substitui os 2 blocos hardcoded e duplicados
-- que existiam em js/tab-aeroporto-geral.js (_sHD) e js/relatorio-export.js
-- (staticHistData) — mesma fonte agora, edita em 1 lugar só.
create table if not exists historico_mensal (
  mes text primary key,                          -- formato 'YYYY-MM'
  invest_mentoria numeric not null default 0,
  invest_hub numeric not null default 0,
  invest_experience numeric not null default 0,
  leads_mentoria int not null default 0,
  leads_hub int not null default 0,
  qualificados_mentoria int                       -- null = não rastreado nesse mês (meses antigos)
);

insert into historico_mensal (mes, invest_mentoria, invest_hub, invest_experience, leads_mentoria, leads_hub, qualificados_mentoria) values
('2025-11', 8907.13, 3019.70, 0, 80, 66, null),
('2025-12', 10711.03, 3120.99, 0, 70, 59, null),
('2026-01', 12060.48, 4390.54, 0, 112, 71, 39),
('2026-02', 16935.56, 5674.59, 0, 169, 67, 19),
('2026-03', 26394.82, 8532.08, 0, 145, 62, 17),
('2026-04', 22896.85, 6708.03, 0, 312, 67, 46),
('2026-05', 18815.66, 8619.64, 0, 177, 131, 52),
('2026-06', 14284.24, 10203.81, 0, 99, 162, 26),
('2026-07', 20409.05, 9094.47, 0, 133, 103, 48)
on conflict (mes) do nothing;
