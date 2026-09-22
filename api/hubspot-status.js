// api/hubspot-status.js — proxy serverless pro CRM do HubSpot (evita CORS,
// não expõe o token no navegador). Mesmo padrão de api/hubspot-deals.js.
//
// Pra que serve: o Make às vezes não dispara (fica parado numa "Incomplete
// execution" — ver histórico de erros de validação de propriedade) e o lead
// precisa ser cadastrado manualmente no HubSpot. Sem essa coluna, não dava
// pra saber isso olhando só o Aeroporto de Leads (que é só o Supabase) — o
// lead aparecia normal aqui e podia estar invisível lá.
//
// Recebe uma lista de e-mails (os mesmos do Aeroporto) e devolve, por
// e-mail: se existe Contact no HubSpot, e se tem Lead associado, em qual
// estágio (Novos/Abordagem/Conectado/Qualificado/etc — mesmos nomes das 2
// pipelines reais, "Pipeline Leads HUB" e "Pipeline Leads Mentory").
//
// Mesma cadeia de associação do hubspot-deals.js: Contact --associação-->
// Lead (objeto próprio, separado de Contact). Precisa do escopo
// crm.objects.leads.read além do de contacts.

const https = require('https');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function hsRequestOnce(path, method, token, body) {
  return new Promise((resolve) => {
    const postBody = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.hubapi.com',
      path,
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(postBody ? { 'Content-Length': Buffer.byteLength(postBody) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 0, body: JSON.stringify({ error: e.message }) }));
    if (postBody) req.write(postBody);
    req.end();
  });
}

// Retry automático em 429 — mesmo motivo do hubspot-deals.js (a Vercel bate
// no limite por segundo do endpoint de busca antes do loop seguinte começar).
async function hsRequest(path, method, token, body, tentativa) {
  tentativa = tentativa || 0;
  const r = await hsRequestOnce(path, method, token, body);
  if (r.status === 429 && tentativa < 4) {
    let espera = 400 * Math.pow(2, tentativa);
    const retryAfter = r.headers && (r.headers['retry-after'] || r.headers['Retry-After']);
    if (retryAfter) espera = Math.max(espera, (+retryAfter || 1) * 1000);
    await sleep(espera);
    return hsRequest(path, method, token, body, tentativa + 1);
  }
  return r;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing Authorization' });
  const token = authHeader.slice(7).trim();

  const emails = (req.body || {}).emails;
  if (!Array.isArray(emails) || !emails.length)
    return res.status(400).json({ error: 'Missing emails[]' });

  try {
    // 0) Estágios reais das pipelines de LEAD (não confundir com pipeline de
    // Deal — objeto diferente). id -> label, igual ao padrão de stages do
    // hubspot-deals.js.
    const stageLabel = {};
    const pr = await hsRequest('/crm/v3/pipelines/leads', 'GET', token);
    if (pr.status >= 200 && pr.status < 300) {
      const pd = safeParse(pr.body);
      (pd.results || []).forEach(pipe => {
        (pipe.stages || []).forEach(st => { stageLabel[st.id] = st.label; });
      });
    }

    // 1) Contact por e-mail, em blocos de 90 (mesmo limite prático da busca).
    const CHUNK = 90;
    const contacts = [];
    const cleanEmails = [...new Set(emails.filter(Boolean).map(e => String(e).trim().toLowerCase()))];
    for (let i = 0; i < cleanEmails.length; i += CHUNK) {
      if (i > 0) await sleep(150);
      const chunk = cleanEmails.slice(i, i + CHUNK);
      if (!chunk.length) continue;
      const r = await hsRequest('/crm/v3/objects/contacts/search', 'POST', token, {
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'IN', values: chunk }] }],
        properties: ['email'],
        limit: 100
      });
      if (r.status < 200 || r.status >= 300) {
        return res.status(r.status || 502).json({ error: 'Falha ao buscar contacts no HubSpot', detail: safeParse(r.body) });
      }
      const d = safeParse(r.body);
      (d.results || []).forEach(c => contacts.push(c));
    }

    // e-mail em minúsculo -> status. Começa todo mundo como "não encontrado";
    // quem aparecer na busca acima vira inHubspot:true.
    const status = {};
    cleanEmails.forEach(em => { status[em] = { inHubspot: false, stage: null }; });
    contacts.forEach(c => {
      const em = (c.properties && c.properties.email || '').trim().toLowerCase();
      if (em) status[em] = { inHubspot: true, stage: null, contactId: c.id };
    });

    if (!contacts.length) {
      const out = {}; Object.keys(status).forEach(em => { out[em] = { inHubspot: status[em].inHubspot, stage: null, contactId: status[em].contactId || null }; });
      return res.status(200).json({ status: out });
    }

    // 2) Contact -> Lead(s), em lote (batch associations) — nunca 1 chamada
    // por contact, senão centenas de e-mails estouram o timeout serverless.
    const BATCH = 900;
    const contactIds = contacts.map(c => c.id);
    const contactToLeads = {};
    for (let i = 0; i < contactIds.length; i += BATCH) {
      const inputs = contactIds.slice(i, i + BATCH).map(id => ({ id: String(id) }));
      const r = await hsRequest('/crm/v4/associations/contacts/leads/batch/read', 'POST', token, { inputs });
      if (r.status < 200 || r.status >= 300) continue;
      const d = safeParse(r.body);
      (d.results || []).forEach(row => {
        const fromId = row.from && row.from.id;
        if (!fromId) return;
        contactToLeads[fromId] = (row.to || []).map(x => String(x.toObjectId)).filter(Boolean);
      });
    }

    const allLeadIds = [...new Set(Object.values(contactToLeads).flat())];
    if (allLeadIds.length) {
      // 3) Estágio de cada Lead, em lote. ATENÇÃO: /crm/v3/objects/.../batch/read
      // (leitura de objeto) tem limite de 100 por chamada — é diferente do limite
      // de 900+ da leitura de ASSOCIAÇÕES (/crm/v4/associations/.../batch/read)
      // usada acima. Usar BATCH=900 aqui faz o HubSpot rejeitar a chamada inteira
      // com 400 assim que passa de 100 leads, e o `continue` abaixo mascarava
      // isso silenciosamente — todo mundo ficava sem estágio.
      const BATCH_OBJ = 100;
      const leadStage = {}; // leadId -> stageId
      for (let i = 0; i < allLeadIds.length; i += BATCH_OBJ) {
        const br = await hsRequest('/crm/v3/objects/leads/batch/read', 'POST', token, {
          inputs: allLeadIds.slice(i, i + BATCH_OBJ).map(id => ({ id })),
          properties: ['hs_pipeline_stage', 'hs_lead_name', 'createdate']
        });
        if (br.status < 200 || br.status >= 300) continue;
        const bd = safeParse(br.body);
        (bd.results || []).forEach(lead => { leadStage[lead.id] = lead.properties || {}; });
      }

      // 4) Junta: contact -> primeiro lead associado (o mais recente, se tiver
      // mais de um) -> label do estágio real.
      contacts.forEach(c => {
        const em = (c.properties && c.properties.email || '').trim().toLowerCase();
        if (!em || !status[em]) return;
        const leadIds = contactToLeads[c.id] || [];
        if (!leadIds.length) return;
        const comData = leadIds
          .map(lid => ({ lid, props: leadStage[lid] }))
          .filter(x => x.props)
          .sort((a, b) => new Date(b.props.createdate || 0) - new Date(a.props.createdate || 0));
        const escolhido = comData[0];
        if (!escolhido) return;
        const stageId = escolhido.props.hs_pipeline_stage;
        status[em].stage = (stageId && stageLabel[stageId]) || null;
      });
    }

    const out = {};
    Object.keys(status).forEach(em => { out[em] = { inHubspot: status[em].inHubspot, stage: status[em].stage, contactId: status[em].contactId || null }; });
    res.status(200).json({ status: out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

function safeParse(s) { try { return JSON.parse(s); } catch (e) { return { raw: s }; } }
