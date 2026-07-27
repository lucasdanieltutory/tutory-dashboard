const https = require('https');

function gadsRequest(version, customerId, devToken, loginCustomer, authHeader, query) {
  return new Promise((resolve) => {
    const postBody = JSON.stringify({ query });
    const options = {
      hostname: 'googleads.googleapis.com',
      path: `/${version}/customers/${customerId}/googleAds:search`,
      method: 'POST',
      headers: {
        'Authorization':     authHeader,
        'developer-token':   devToken,
        'login-customer-id': loginCustomer,
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(postBody),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.status || res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(postBody);
    req.end();
  });
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

  const query = (req.body || {}).query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const CUSTOMER_ID    = '4301688199';
  const LOGIN_CUSTOMER = '5041220639';
  const DEV_TOKEN      = process.env.GADS_DEV_TOKEN ||
    [121,102,75,56,75,49,98,113,112,88,109,45,86,57,70,114,79,56,85,88,51,81]
      .map(c => String.fromCharCode(c)).join('');

  // Versões ATUAIS da Google Ads API (v20 e anteriores foram descontinuadas).
  // Ordem crescente: usa a mais antiga ainda suportada e sobe se ela for bloqueada.
  const VERSIONS = ['v21', 'v22', 'v23', 'v24'];
  let lastError = '';

  for (const version of VERSIONS) {
    const r = await gadsRequest(version, CUSTOMER_ID, DEV_TOKEN, LOGIN_CUSTOMER, authHeader, query);
    const isJson = (r.headers && r.headers['content-type'] || '').includes('json') ||
                   (r.body && r.body.trim().startsWith('{'));
    if (isJson) {
      try {
        const parsed = JSON.parse(r.body);
        // Versão descontinuada → tenta a próxima (auto-resiliência a deprecações futuras)
        if (parsed.error && JSON.stringify(parsed.error).indexOf('UNSUPPORTED_VERSION') !== -1) {
          lastError = `${version}: descontinuada`;
          console.log(`Google Ads ${version} descontinuada, tentando próxima...`);
          continue;
        }
        return res.status(r.status || 200).json(parsed);
      } catch(e) {
        lastError = `${version}: parse error - ${r.body.substring(0, 200)}`;
        continue;
      }
    }
    // Não foi JSON (404 HTML etc) — tenta próxima versão
    lastError = `${version}: HTTP ${r.status} não-JSON`;
    console.log(`Google Ads ${version} returned non-JSON (${r.status}), trying next...`);
  }

  // Nenhuma versão funcionou
  return res.status(502).json({
    error: { message: 'Nenhuma versão da API funcionou. Último erro: ' + lastError }
  });
};
