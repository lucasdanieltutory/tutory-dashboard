module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPA_URL = 'https://stgzgtpcuhtayglignik.supabase.co';
  const SUPA_KEY = 'sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';

  const b = req.body || {};

  // Colunas reais da tabela leads_mentoria
  const payload = {
    contact_name:      b.contact_name      || '',
    contact_email:     b.contact_email      || b.email     || '',
    contact_phone:     b.contact_phone      || b.telefone  || '',
    contact_instagram: b.contact_instagram  || b.instagram || '',
    cargo:             b.area_de_atuacao    || b.cargo     || '',
    cargo_lp:          b.area_de_atuacao    || b.cargo     || '',
    faturamento:       b.faturamento        || '',
    momento:           b.situacao_atual     || b.situacao  || b.momento || '',
    canal:             b.canal              || 'Typebot',
  };

  // Remove campos vazios
  Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

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

  if (!r.ok) {
    const err = await r.text();
    console.error('[leads] Supabase error:', r.status, err);
    return res.status(200).json({ warning: 'supabase_error', status: r.status, detail: err });
  }

  return res.status(201).json({ success: true });
};
