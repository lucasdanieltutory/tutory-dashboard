-- ============================================================
--  Tutory · Colunas de atribuição de origem — leads_hub
--  Rode no Supabase → SQL Editor (uma vez). Seguro reexecutar:
--  todos os comandos usam "if not exists".
--  Espelha exatamente o que já existe em leads_mentoria
--  (ver sql/001-atribuicao-e-colunas-faltantes.sql).
-- ============================================================

alter table leads_hub add column if not exists plataforma_ad text;  -- meta | google | youtube | tiktok | linkedin | organico
alter table leads_hub add column if not exists utm_source    text;
alter table leads_hub add column if not exists utm_medium    text;
alter table leads_hub add column if not exists utm_campaign  text;  -- nome da campanha
alter table leads_hub add column if not exists utm_content   text;  -- nome do anúncio (base da atribuição por criativo)
alter table leads_hub add column if not exists utm_term      text;  -- conjunto/ad set

create index if not exists idx_leads_hub_plataforma on leads_hub (plataforma_ad);
create index if not exists idx_leads_hub_utm_content on leads_hub (utm_content);
create index if not exists idx_leads_hub_created on leads_hub (created_at desc);

-- ============================================================
-- Conferência (opcional):
-- select column_name from information_schema.columns
--   where table_name = 'leads_hub' and column_name like 'utm%' or column_name='plataforma_ad';
-- ============================================================
