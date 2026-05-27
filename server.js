const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

// CORS — sta alle origins toe (vereist voor browser-aanroepen)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.options('*', cors());
app.use(express.json());

// Keep-alive
const SELF_URL = process.env.RENDER_EXTERNAL_URL || "https://ws-hostaway-proxy.onrender.com";
setInterval(async () => {
  try {
    await fetch(`${SELF_URL}/ping`);
    console.log(`[keep-alive] ${new Date().toISOString()}`);
  } catch(e) {
    console.log(`[keep-alive] failed: ${e.message}`);
  }
}, 14 * 60 * 1000);

app.get('/ping', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ status: "awake", time: new Date().toISOString() });
});

// Token
app.post('/token', async (req, res) => {
  try {
    const r = await fetch('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=108363&client_secret=7e00ad68fdc06e5d80d743b3a9dbd48112f189e56fabdda911186eef8ee9c8fc&scope=general'
    });
    const data = await r.json();
    console.log('[token] response status:', r.status, '| has token:', !!data.access_token);
    res.json(data);
  } catch(e) {
    console.error('[token] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Hostaway API proxy
app.all('/api/*', async (req, res) => {
  try {
    const path  = req.path.replace('/api/', '');
    const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const url   = `https://api.hostaway.com/v1/${path}${query}`;
    console.log(`[api] ${req.method} ${url}`);
    const r = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error('[api] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'Wonderful Stay Proxy', version: '2.0' }));

app.listen(process.env.PORT || 3000, () => {
  console.log('Proxy v2 running — CORS enabled for all origins');
});
