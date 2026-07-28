module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPA_URL = 'https://stgzgtpcuhtayglignik.supabase.co';
  const SUPA_KEY = 'sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';

  // Aceita dados no corpo E na query string (?utm_source=linkedin). O corpo
  // tem prioridade; a query preenche o que faltar — permite taggar a origem
  // só pela URL do webhook, sem mexer no corpo JSON do bloco do Typebot.
  const b = Object.assign({}, req.query || {}, req.body || {});
  const s = v => (v == null ? '' : String(v).trim());

  // ── Detecta a plataforma de origem ────────────────────────────
  // 1º pela utm_source; 2º pelos click ids que as redes anexam sozinhas
  // (gclid=Google, fbclid=Meta, ttclid=TikTok) — rede de segurança caso
  // algum anúncio fique sem UTM.
  function detectPlataforma(src) {
    const u = src.toLowerCase();
    if (u.includes('google') || u.includes('gads')) return 'google';
    if (u.includes('youtube') || u === 'yt') return 'youtube';
    if (u.includes('tiktok')) return 'tiktok';
    if (u.includes('linkedin')) return 'linkedin';
    if (u.includes('meta') || u.includes('facebook') || u.includes('instagram') || u === 'fb' || u === 'ig') return 'meta';
    if (s(b.gclid) || s(b.wbraid) || s(b.gbraid)) return 'google';
    if (s(b.fbclid)) return 'meta';
    if (s(b.ttclid)) return 'tiktok';
    if (s(b.li_fat_id)) return 'linkedin';
    return u ? u : '';
  }

  const utm_source   = s(b.utm_source   || b.utmSource);
  const utm_medium   = s(b.utm_medium   || b.utmMedium);
  const utm_campaign = s(b.utm_campaign || b.utmCampaign);
  const utm_content  = s(b.utm_content  || b.utmContent);   // = nome do anúncio
  const utm_term     = s(b.utm_term     || b.utmTerm);
  const plataforma   = s(b.plataforma_ad) || detectPlataforma(utm_source);

  // Colunas base (já existiam na tabela)
  const base = {
    contact_name:      s(b.contact_name),
    contact_email:     s(b.contact_email     || b.email),
    contact_phone:     s(b.contact_phone     || b.telefone),
    contact_instagram: s(b.contact_instagram || b.instagram),
    cargo:             s(b.area_de_atuacao   || b.cargo),
    cargo_lp:          s(b.area_de_atuacao   || b.cargo),
    faturamento:       s(b.faturamento),
    momento:           s(b.situacao_atual    || b.situacao || b.momento),
    canal:             s(b.canal) || 'Typebot',
  };

  // Colunas de atribuição (podem ainda não existir na tabela)
  const atrib = {
    plataforma_ad: plataforma,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  };

  const limpar = o => {
    const r = {};
    Object.keys(o).forEach(k => { if (o[k] !== '') r[k] = o[k]; });
    return r;
  };

  async function inserir(payload) {
    const r = await fetch(`${SUPA_URL}/rest/v1/leads_mentoria`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    return { ok: r.ok, status: r.status, text: r.ok ? '' : await r.text() };
  }

  // Tenta com atribuição; se as colunas ainda não existirem (42703),
  // regrava só com as colunas base para NUNCA perder o lead.
  let out = await inserir(limpar({ ...base, ...atrib }));
  if (!out.ok && (out.text.includes('42703') || out.text.includes('does not exist'))) {
    console.warn('[leads] colunas de atribuicao ausentes — regravando sem elas. Rode o SQL de atribuicao.');
    out = await inserir(limpar(base));
    if (out.ok) return res.status(201).json({ success: true, warning: 'atribuicao_ignorada_rode_o_sql' });
  }

  if (!out.ok) {
    console.error('[leads] Supabase error:', out.status, out.text);
    return res.status(200).json({ warning: 'supabase_error', status: out.status, detail: out.text });
  }

  return res.status(201).json({ success: true, plataforma: plataforma || null });
};
