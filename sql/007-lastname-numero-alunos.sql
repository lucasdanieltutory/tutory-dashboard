-- 007-lastname-numero-alunos.sql
-- Sobrenome e número de alunos já são perguntados no Typebot de Mentoria e
-- já chegam no HubSpot (propriedades lastname / numero_de_alunos, confirmado
-- em produção) — só nunca foram salvos aqui, porque api/leads.js não
-- encaminhava esses 2 campos pro Supabase. Sem coluna própria, o Aeroporto
-- de Leads não tinha onde mostrar esse dado.
-- Hub não tem: o formulário de cadastro do Hub não faz essas 2 perguntas
-- (confirmado: contatos vindos do Hub estão com lastname/numero_de_alunos
-- nulos no HubSpot também) — por isso as colunas ficam só em leads_mentoria.

ALTER TABLE leads_mentoria ADD COLUMN IF NOT EXISTS lastname text;
ALTER TABLE leads_mentoria ADD COLUMN IF NOT EXISTS numero_de_alunos text;
