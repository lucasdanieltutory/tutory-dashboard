# Tutory Dashboard

Dashboard interno de inteligência de marketing da Tutory. HTML estático + JS puro, sem build step. Deploy automático via Vercel a cada push em `main`.

## Estrutura

```
tutory-dashboard-v24-staging.html   ← página oficial (servida na raiz do domínio)
index.html                          ← redireciona para o arquivo acima
vercel.json                         ← rewrite de "/" para o dashboard

css/
  dashboard.css                     ← todo o CSS (extraído do HTML)

js/
  core.js                           ← login, tokens Meta/YouTube/Google Ads, helpers Supabase
  dashboard-utils.js                ← helpers globais (charts, chips, badges, classificação)
  tab-aeroporto-geral.js            ← Aeroporto de Leads + Visão Geral
  tab-mentoria-hub.js               ← Tutory Mentoria + TutoryHub
  tab-experience-campanhas.js       ← Experience, navegação, modais, chat IA
  tab-prospeccoes.js                ← Prospecções
  relatorio-export.js               ← exportação de relatório PDF/CSV
  tab-criativos.js                  ← banco de criativos
  tab-google-ads.js                 ← integração Google Ads
  tab-youtube.js                    ← integração YouTube
  config-theme.js                   ← modal de configurações, tema, logout
  tab-beijamim.js                   ← Prospecções Beijamim
  tab-gamificacao.js                ← Leads Gamificação

assets/img/                         ← imagens (favicon, logos) — antes embutidas como base64 inline

api/                                ← Vercel Functions (leads.js, lead-hub.js, gads.js, hubspot-lead.js)
sql/                                ← migrations do Supabase
archive/                            ← versões antigas do dashboard, não usadas em produção (ver archive/README.md)
```

## Por que foi dividido assim

O arquivo original tinha ~8800 linhas e 1.4MB, com CSS, JS e ~830KB de imagens base64 tudo inline num único `<script>` gigante. Isso tornava qualquer edição cara (era preciso carregar o arquivo inteiro pra mexer em qualquer parte) e arriscada (uma mudança numa aba podia sem querer afetar outra).

A divisão em `js/*.js` por aba/funcionalidade segue os limites de escopo do JavaScript: `let`/`const` no topo de um `<script>` clássico ficam visíveis para os `<script>` seguintes na mesma página (não viram propriedade de `window`, mas continuam acessíveis como identificador solto), então múltiplos arquivos carregados na mesma ordem original se comportam exatamente como o script único de antes — só que agora cada arquivo pode ser lido/editado isoladamente.

**Regra ao editar:** os arquivos em `js/` dependem de ordem de carregamento (declarada nas tags `<script src>` dentro do HTML) — não reordene essas tags sem necessidade.
