module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-HubSpot-Signature');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPA_URL = 'https://stgzgtpcuhtayglignik.supabase.co';
  const SUPA_KEY = 'sb_publishable_qvOphao3X92qN_yQMVI5wA_9L6FpLgb';

  const b = req.body || {};

  const get = (key) => {
    const v = b[key];
    if (!v) return '';
    return typeof v === 'object' && v.value !== undefined ? v.value : String(v);
  };

  const firstName = get('firstname');
  const lastName  = get('lastname');
  const fullName  = [firstName, lastName].filter(Boolean).join(' ') || get('nome') || get('name');

  const faturamentoRaw = get('faturamento') || get('faixa_faturamento') || get('annual_revenue') || get('renda_mensal') || '';

  const email = get('email');
  const phone = get('phone') || get('mobilephone') || get('telefone');

  // Verificar duplicidade: checar se já existe lead com mesmo email ou telefone nos últimos 30 dias
  let isDuplicate = false;
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dupHeaders = {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
    };
    const checks = [];
    if (email) {
      checks.push(fetch(`${SUPA_URL}/rest/v1/leads_mentoria?select=id&contact_email=eq.${encodeURIComponent(email)}&created_at=gte.${since}&limit=1`, { headers: dupHeaders }));
    }
    if (phone) {
      const phoneClean = phone.replace(/\D/g, '');
      checks.push(fetch(`${SUPA_URL}/rest/v1/leads_mentoria?select=id&contact_phone=like.*${phoneClean.slice(-8)}&created_at=gte.${since}&limit=1`, { headers: dupHeaders }));
    }
    if (checks.length > 0) {
      const results = await Promise.all(checks.map(p => p.then(r => r.json())));
      isDuplicate = results.some(arr => Array.isArray(arr) && arr.length > 0);
    }
  } catch (dupErr) {
    console.warn('[hubspot-lead] Erro ao checar duplicidade:', dupErr.message);
  }

  const payload = {
    contact_name:      fullName,
    contact_email:     email,
    contact_phone:     phone,
    contact_instagram: get('instagram') || get('instagram_handle') || get('rede_social'),
    cargo:             get('cargo') || get('area_de_atuacao') || get('jobtitle') || get('job_function'),
    cargo_lp:          get('cargo') || get('area_de_atuacao') || get('jobtitle') || get('job_function'),
    faturamento:       faturamentoRaw,
    momento:           get('momento') || get('situacao_atual') || get('message'),
    canal:             'LP',
    plataforma_origem: 'LP',
    plataforma_ad:     'Meta',
    ...(isDuplicate ? { is_duplicate: true } : {}),
  };

  // Remove campos vazios
  Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });

  console.log('[hubspot-lead] Payload recebido:', JSON.stringify(b));
  console.log('[hubspot-lead] isDuplicate:', isDuplicate);
  console.log('[hubspot-lead] Inserindo no Supabase:', JSON.stringify(payload));

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
    console.error('[hubspot-lead] Supabase error:', r.status, err);
    return res.status(200).json({ warning: 'supabase_error', status: r.status, detail: err });
  }

  return res.status(201).json({ success: true, source: 'hubspot', duplicate: isDuplicate });
};
