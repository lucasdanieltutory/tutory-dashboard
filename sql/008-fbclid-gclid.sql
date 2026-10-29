-- Clique do anúncio guardado no lead (melhora a correspondência dos eventos
-- enviados ao Meta/Google pelo servidor). Só acrescenta colunas.
alter table public.leads_mentoria add column if not exists fbclid text;
alter table public.leads_mentoria add column if not exists gclid text;
alter table public.leads_hub add column if not exists fbclid text;
alter table public.leads_hub add column if not exists gclid text;
