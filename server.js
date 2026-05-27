const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/token', async (req, res) => {
  try {
    const r = await fetch('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&client_id=108363&client_secret=7e00ad68fdc06e5d80d743b3a9dbd48112f189e56fabdda911186eef8ee9c8fc&scope=general'
    });
    res.json(await r.json());
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.all('/api/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/','');
    const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const r = await fetch(`https://api.hostaway.com/v1/${path}${query}`, {
      method: req.method,
      headers: { 'Authorization': req.headers.authorization, 'Content-Type': 'application/json' }
    });
    res.json(await r.json());
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.listen(process.env.PORT || 3000, () => console.log('Proxy running'));
