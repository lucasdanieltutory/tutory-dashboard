// Vercel Serverless Function — Proxy para Google Ads API
// Usa https nativo (sem fetch) para compatibilidade com qualquer versão Node.js
const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const body = req.body || {};
  const query = body.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  // Credenciais Google Ads — server-side apenas
  const CUSTOMER_ID    = '4301688199';
  const LOGIN_CUSTOMER = '5041220639';
  const DEV_TOKEN      = process.env.GADS_DEV_TOKEN ||
    [121,102,75,56,75,49,98,113,112,88,109,45,86,57,70,114,79,56,85,88,51,81]
      .map(c => String.fromCharCode(c)).join('');

  const postBody = JSON.stringify({ query });

  return new Promise((resolve) => {
    const options = {
      hostname: 'googleads.googleapis.com',
      path: `/v17/customers/${CUSTOMER_ID}/googleAds:search`,
      method: 'POST',
      headers: {
        'Authorization':     authHeader,
        'developer-token':   DEV_TOKEN,
        'login-customer-id': LOGIN_CUSTOMER,
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(postBody),
      },
    };

    const gaReq = https.request(options, (gaRes) => {
      let data = '';
      gaRes.on('data', (chunk) => { data += chunk; });
      gaRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.status(gaRes.statusCode).json(parsed);
        } catch (e) {
          res.status(500).json({ error: 'Parse error', raw: data.substring(0, 300) });
        }
        resolve();
      });
    });

    gaReq.on('error', (err) => {
      console.error('https error:', err);
      res.status(500).json({ error: err.message });
      resolve();
    });

    gaReq.write(postBody);
    gaReq.end();
  });
};
