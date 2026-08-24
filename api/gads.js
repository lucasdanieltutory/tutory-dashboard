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

  // Versões ATUAIS da Google Ads API (v21 e anteriores foram descontinuadas
  // em ago/2026). Ordem: da mais nova (maior vida útil) pra mais antiga —
  // v25 foi lançada em jul/2026 e só descontinua em ago/2027.
  // Atualizar quando voltar a dar erro: developers.google.com/google-ads/api/docs/sunset-dates
  const VERSIONS = ['v25', 'v24', 'v23', 'v22'];
  let lastError = '';

  for (let i = 0; i < VERSIONS.length; i++) {
    const version = VERSIONS[i];
    const isLast = i === VERSIONS.length - 1;
    const r = await gadsRequest(version, CUSTOMER_ID, DEV_TOKEN, LOGIN_CUSTOMER, authHeader, query);
    const isJson = (r.headers && r.headers['content-type'] || '').includes('json') ||
                   (r.body && r.body.trim().startsWith('{'));
    if (isJson) {
      try {
        const parsed = JSON.parse(r.body);
        // Qualquer erro (versão descontinuada, argumento inválido por causa da
        // versão, etc.) → tenta a próxima versão da lista, não só quando o
        // texto é literalmente "UNSUPPORTED_VERSION" (a Google nem sempre usa
        // esse texto quando a versão morre de verdade — foi o que aconteceu
        // com a v21 em ago/2026: voltava "invalid argument" e o código antigo
        // devolvia isso na hora, sem tentar as próximas).
        if (parsed.error && !isLast) {
          lastError = `${version}: ${JSON.stringify(parsed.error).substring(0, 200)}`;
          console.log(`Google Ads ${version} falhou, tentando próxima versão...`);
          continue;
        }
        return res.status(r.status || 200).json(parsed);
      } catch(e) {
        lastError = `${version}: parse error - ${r.body.substring(0, 200)}`;
        if (!isLast) continue;
      }
    } else {
      // Não foi JSON (404 HTML etc) — tenta próxima versão
      lastError = `${version}: HTTP ${r.status} não-JSON`;
      console.log(`Google Ads ${version} returned non-JSON (${r.status}), trying next...`);
      if (!isLast) continue;
    }
  }

  // Nenhuma versão funcionou
  return res.status(502).json({
    error: { message: 'Nenhuma versão da API funcionou. Último erro: ' + lastError }
  });
};
