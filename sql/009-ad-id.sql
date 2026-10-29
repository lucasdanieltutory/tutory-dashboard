-- ID do anúncio que trouxe o lead (vk_ad_id={{ad.id}} no link do Meta;
-- {creative} no Google). Não muda quando o anúncio é renomeado — liga o lead
-- ao anúncio exato da plataforma. Só acrescenta colunas.
alter table public.leads_mentoria add column if not exists ad_id text;
alter table public.leads_hub add column if not exists ad_id text;
alter table public.leads_hub_teste add column if not exists ad_id text;
