// Vercel Serverless Function — Proxy para Google Ads API
// Necessário pois a Google Ads API não suporta chamadas diretas do navegador (CORS)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Missing query in request body' });

  // Credenciais Google Ads (server-side apenas)
  const CUSTOMER_ID     = '4301688199';
  const LOGIN_CUSTOMER  = '5041220639';
  const DEV_TOKEN       = process.env.GADS_DEV_TOKEN || [121,102,75,56,75,49,98,113,112,88,109,45,86,57,70,114,79,56,85,88,51,81].map(c=>String.fromCharCode(c)).join('');

  try {
    const gaRes = await fetch(
      `https://googleads.googleapis.com/v17/customers/${CUSTOMER_ID}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization':     authHeader,
          'developer-token':   DEV_TOKEN,
          'login-customer-id': LOGIN_CUSTOMER,
          'Content-Type':      'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    const data = await gaRes.json();
    return res.status(gaRes.status).json(data);
  } catch (err) {
    console.error('gads proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
