-- Marca quando um lead do Hub foi copiado (não movido) pro Aeroporto da Mentoria,
-- via botão "→ Mentoria" no Aeroporto de Leads do Hub. O lead permanece em
-- leads_hub sempre — este campo só evita reenviar o mesmo lead duas vezes.
alter table leads_hub add column if not exists enviado_mentoria_em timestamptz;
