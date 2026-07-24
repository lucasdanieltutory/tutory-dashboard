-- ============================================================
--  Tutory · Colunas de atribuição de origem dos leads
--  Rode no Supabase → SQL Editor (uma vez). Seguro reexecutar:
--  todos os comandos usam "if not exists".
-- ============================================================

-- 1) leads_mentoria: de onde o lead veio (plataforma, campanha, anúncio)
alter table leads_mentoria add column if not exists plataforma_ad text;  -- meta | google | youtube | tiktok | linkedin | organico
alter table leads_mentoria add column if not exists utm_source   text;
alter table leads_mentoria add column if not exists utm_medium   text;
alter table leads_mentoria add column if not exists utm_campaign text;   -- nome da campanha
alter table leads_mentoria add column if not exists utm_content  text;   -- NOME DO ANÚNCIO (base da atribuição por criativo)
alter table leads_mentoria add column if not exists utm_term     text;

-- 2) leads_hub: colunas que o dashboard usa mas não existiam
--    (sem elas, qualificar um lead da Hub no dash dá erro)
alter table leads_hub add column if not exists classificacao_manual text;
alter table leads_hub add column if not exists canal text default 'Slack/Hub';

-- 3) Índices para os filtros/rankings do dashboard ficarem rápidos
create index if not exists idx_leads_mentoria_plataforma on leads_mentoria (plataforma_ad);
create index if not exists idx_leads_mentoria_utm_content on leads_mentoria (utm_content);
create index if not exists idx_leads_mentoria_created on leads_mentoria (created_at desc);

-- ============================================================
-- Conferência (opcional): deve listar as colunas novas
-- select column_name from information_schema.columns
--   where table_name = 'leads_mentoria' and column_name like 'utm%';
-- ============================================================
