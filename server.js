const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());

// ── KEEP-ALIVE: ping zichzelf elke 14 minuten ────────────────────────────────
const SELF_URL = process.env.RENDER_EXTERNAL_URL || "https://ws-hostaway-proxy.onrender.com";
setInterval(async () => {
  try {
    await fetch(`${SELF_URL}/ping`);
    console.log(`[keep-alive] ping sent at ${new Date().toISOString()}`);
  } catch(e) {
    console.log(`[keep-alive] ping failed: ${e.message}`);
  }
}, 14 * 60 * 1000); // elke 14 minuten

app.get('/ping', (req, res) => res.json({ status: "awake", time: new Date().toISOString() }));

// ── HOSTAWAY TOKEN ───────────────────────────────────────────────────────────
app.post('/token', async (req, res) => {
  try {
    const r = await fetch('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=108363&client_secret=7e00ad68fdc06e5d80d743b3a9dbd48112f189e56fabdda911186eef8ee9c8fc&scope=general'
    });
    const data = await r.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── HOSTAWAY API PROXY ───────────────────────────────────────────────────────
app.all('/api/*', async (req, res) => {
  try {
    const path  = req.path.replace('/api/', '');
    const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const r = await fetch(`https://api.hostaway.com/v1/${path}${query}`, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });
    const data = await r.json();
    res.json(data);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
  console.log(`Keep-alive active — pinging ${SELF_URL}/ping every 14 min`);
});
