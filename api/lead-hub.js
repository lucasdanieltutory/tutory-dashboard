// Recebe leads do TutoryHub (ex.: Slack → Make) e grava na tabela leads_hub,
// que alimenta o Aeroporto da Hub no dashboard. Métrica separada dos dados do Meta.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPA_URL = 'https://stgzgtpcuhtayglignik.supabase.co';
  const SUPA_KEY = 'sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';

  const b = req.body || {};

  // Aceita vários nomes de campo p/ o módulo do Make ficar simples.
  const perfil = b.perfil || b.Perfil || '';
  const payload = {
    contact_name:      b.contact_name      || b.nome      || b.Nome      || '',
    contact_email:     b.contact_email     || b.email     || b.Email     || '',
    contact_phone:     b.contact_phone     || b.telefone  || b.celular   || b.Celular || '',
    contact_instagram: b.contact_instagram || b.instagram || b.Instagram || '',
    origem:            b.origem            || b.Origem    || '',
    observacao:        b.observacao        || b.obs       || (perfil ? ('Perfil: ' + perfil) : ''),
  };

  // Remove campos vazios (não sobrescreve defaults do Supabase)
  Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

  // Precisa de pelo menos um identificador
  if (!payload.contact_name && !payload.contact_email && !payload.contact_phone) {
    return res.status(400).json({ error: 'lead sem nome/email/telefone' });
  }

  const r = await fetch(`${SUPA_URL}/rest/v1/leads_hub`, {
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
    console.error('[lead-hub] Supabase error:', r.status, err);
    return res.status(200).json({ warning: 'supabase_error', status: r.status, detail: err });
  }

  return res.status(201).json({ success: true });
};
