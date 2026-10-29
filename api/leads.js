// Porta de entrada dos leads da Mentoria: os Typebots mandam aqui, gravamos em
// leads_mentoria. Regras (29/10/2026):
//  • NUNCA perder lead: se o banco falhar, tenta de novo (~8 s); se ainda
//    falhar, registra o lead completo no log (LEAD_NAO_GRAVADO) e responde
//    erro — nunca mais "ok" com o lead sumindo.
//  • Origem só pela UTM (mesma regra do Tutory OS: origemDoLead() em
//    tutory-os-next/src/lib/plataforma.ts). Sem UTM = orgânico. Nada de
//    adivinhar por plataforma_ad fixo do Typebot nem por fbclid.
//  • Valores falsos ("—", "{{placement}}", "{{campaign.name}}"…) viram vazio.
//  • Guarda fbclid/gclid (clique do anúncio) e o ID do anúncio (vk_ad_id → ad_id).
//  • Pessoa repetida: grava; o gatilho do banco marca DUP (sql do tutory-os-next).
//  • Senha: header x-tutory-segredo = env TUTORY_LEADS_SEGREDO. Fase 1 (agora):
//    aceita sem senha e só registra no log; fase 2: exigir (LEADS_EXIGE_SEGREDO=1).
const SUPA_URL = 'https://stgzgtpcuhtayglignik.supabase.co';
const SUPA_KEY = 'sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';

const VAZIOS = new Set(['', '—', '-', '--', 'null', 'undefined', 'n/a', 'na', '(not set)', 'none', 'others']);
function limpo(v) {
  const s = (v == null ? '' : String(v)).trim();
  if (/^\{\{.*\}\}$/.test(s)) return ''; // macro do anúncio que não foi trocada ({{placement}})
  return VAZIOS.has(s.toLowerCase()) ? '' : s;
}

// Mesma regra do dashboard novo — origem só pela UTM.
function origemDoLead(source, medium, content) {
  let s = limpo(source).toLowerCase(), m = limpo(medium).toLowerCase();
  const c = limpo(content).toLowerCase();
  if ((s === 'google-meta' && m === 'campanhas') || (s === 'site' && m === 'organico')) {
    if (/googleads|pmax/.test(c)) return 'google';
    if (/metaads|^ad\d+-fb-/.test(c)) return 'meta';
    s = ''; m = '';
  }
  if (!s && !m) return 'organico';
  if (/chatgpt|openai|perplexity|gemini|claude|copilot/.test(s)) return 'ia';
  if (s === 'comercial' || m === 'outreach') return 'comercial';
  if (/^(social|organico|orgânico|organic|bio)$/.test(m) || /^(organico|orgânico|organic|linktree)$/.test(s)) return 'organico';
  if (/youtube/.test(s) || s === 'yt') return 'youtube';
  if (/google|gads|adwords|pmax|demandgen/.test(s) || /googleads|gads|^ppc$/.test(m)) return 'google';
  if (/tiktok/.test(s)) return 'tiktok';
  if (/linkedin/.test(s)) return 'linkedin';
  if (/meta|facebook|instagram|audience_network|messenger|threads|^fb$|^ig$/.test(s) || /meta/.test(m)) return 'meta';
  if (m === 'cpc' || m === 'paid') return 'meta'; // Meta usa medium "cpc" com o placement no source
  return 'organico';
}

// Canal (entrada da Mentoria): Site ou Typebot.
function normalizeCanal(raw) {
  const c = (raw || '').trim().toLowerCase();
  if (!c) return 'Typebot';
  if (c === 'typebot' || c === 'instagram') return 'Typebot';
  if (c === 'site' || c === 'site oficial' || c === 'landing page' || c === 'lp') return 'Site';
  if (c === 'organico' || c === 'orgânico') return 'Orgânico';
  if (c === 'respondi') return 'Respondi';
  return raw.trim();
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function inserir(payload) {
  const esperas = [500, 1000, 2000, 4000]; // ~8 s no total
  let ultimo = { ok: false, status: 0, text: '' };
  for (let i = 0; i <= esperas.length; i++) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/leads_mentoria`, {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(payload),
      });
      ultimo = { ok: r.ok, status: r.status, text: r.ok ? '' : await r.text() };
      if (r.ok || r.status < 500) return ultimo; // 4xx = dado inválido: repetir não resolve
    } catch (e) {
      ultimo = { ok: false, status: 0, text: String(e && e.message || e) };
    }
    if (i < esperas.length) await espera(esperas[i]);
  }
  return ultimo;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-tutory-segredo');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Senha (fase 1: só registra quem chega sem; fase 2: exige)
  const segredo = process.env.TUTORY_LEADS_SEGREDO;
  const veio = req.headers['x-tutory-segredo'];
  if (segredo && veio !== segredo) {
    if (process.env.LEADS_EXIGE_SEGREDO === '1') return res.status(401).json({ error: 'sem permissão' });
    console.warn('[leads] chegou sem a senha (fase 1: aceito)');
  }

  // Aceita dados no corpo E na query (?utm_source=…). O corpo tem prioridade.
  const b = Object.assign({}, req.query || {}, req.body || {});

  const utm_source   = limpo(b.utm_source   || b.utmSource);
  const utm_medium   = limpo(b.utm_medium   || b.utmMedium);
  const utm_campaign = limpo(b.utm_campaign || b.utmCampaign);
  const utm_content  = limpo(b.utm_content  || b.utmContent);   // = nome do anúncio
  const utm_term     = limpo(b.utm_term     || b.utmTerm);      // = conjunto / grupo
  const plataforma   = origemDoLead(utm_source, utm_medium, utm_content);

  const base = {
    contact_name:      limpo(b.contact_name),
    lastname:          limpo(b.lastname || b.sobrenome || b.last_name),
    contact_email:     limpo(b.contact_email || b.email).toLowerCase(),
    contact_phone:     limpo(b.contact_phone || b.telefone),
    contact_instagram: limpo(b.contact_instagram || b.instagram),
    cargo:             limpo(b.area_de_atuacao || b.cargo),
    cargo_lp:          limpo(b.area_de_atuacao || b.cargo),
    faturamento:       limpo(b.faturamento),
    momento:           limpo(b.situacao_atual || b.situacao || b.momento),
    canal:             normalizeCanal(limpo(b.canal)),
    numero_de_alunos:  limpo(b.numero_de_alunos || b.numeroDeAlunos || b.numero_alunos || b.qtd_alunos),
  };
  const atrib = {
    plataforma_ad: plataforma,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbclid: limpo(b.fbclid),
    gclid:  limpo(b.gclid || b.gbraid || b.wbraid),
    ad_id:  limpo(b.vk_ad_id || b.ad_id), // ID do anúncio (vk_ad_id={{ad.id}} do link) — não muda se o anúncio for renomeado
  };
  const semVazios = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ''));

  if (!base.contact_name && !base.contact_email && !base.contact_phone)
    return res.status(400).json({ error: 'lead sem nome, e-mail e telefone' });

  let out = await inserir(semVazios({ ...base, ...atrib }));
  // Coluna nova ainda não existe no banco (42703): regrava sem ela pra NUNCA perder o lead.
  if (!out.ok && (out.text.includes('42703') || out.text.includes('does not exist'))) {
    console.warn('[leads] coluna ausente — regravando só com as colunas base:', out.text.slice(0, 200));
    out = await inserir(semVazios({ ...base, plataforma_ad: plataforma, utm_source, utm_medium, utm_campaign, utm_content, utm_term }));
  }

  if (!out.ok) {
    // Registro completo pra recuperar depois — e o Typebot recebe erro (não "ok").
    console.error('[leads] LEAD_NAO_GRAVADO', JSON.stringify({ status: out.status, erro: out.text.slice(0, 300), lead: { ...base, ...atrib } }));
    return res.status(502).json({ error: 'nao_gravado', status: out.status });
  }
  return res.status(201).json({ success: true, plataforma });
};
