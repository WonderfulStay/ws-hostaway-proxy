const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ACCOUNT_ID = '108363';
const SECRET = 'cc3b40ffdec6f95314d709a7908d046faff5f08ba9234910a6d56def0c9b1e87';

function addCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function proxyRequest(targetUrl, options, body, res) {
  const parsed = url.parse(targetUrl);
  const reqOptions = {
    hostname: parsed.hostname,
    port: 443,
    path: parsed.path,
    method: options.method || 'GET',
    headers: options.headers || {}
  };

  const req = https.request(reqOptions, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      addCORS(res);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(proxyRes.statusCode);
      res.end(data);
    });
  });

  req.on('error', (e) => {
    addCORS(res);
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  });

  if (body) req.write(body);
  req.end();
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  // Handle preflight
  if (req.method === 'OPTIONS') {
    addCORS(res);
    res.writeHead(200);
    res.end();
    return;
  }

  // Ping
  if (path === '/ping') {
    addCORS(res);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'awake', time: new Date().toISOString() }));
    return;
  }

  // Root
  if (path === '/') {
    addCORS(res);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'Wonderful Stay Proxy v3', cors: 'enabled' }));
    return;
  }

  // Token
  if (path === '/token' && req.method === 'POST') {
    const body = `grant_type=client_credentials&client_id=${ACCOUNT_ID}&client_secret=${SECRET}&scope=general`;
    proxyRequest('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'application/json'
      }
    }, body, res);
    return;
  }

  // API proxy
  if (path.startsWith('/api/')) {
    const hostawayPath = path.replace('/api/', '');
    const queryString = parsed.search || '';
    const targetUrl = `https://api.hostaway.com/v1/${hostawayPath}${queryString}`;
    const auth = req.headers['authorization'] || '';

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      proxyRequest(targetUrl, {
        method: req.method,
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
        }
      }, body || null, res);
    });
    return;
  }

  // 404
  addCORS(res);
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Keep-alive
const SELF = process.env.RENDER_EXTERNAL_URL || 'https://ws-hostaway-proxy.onrender.com';
setInterval(() => {
  https.get(`${SELF}/ping`, (r) => {
    console.log(`[keep-alive] ${new Date().toISOString()} status:${r.statusCode}`);
  }).on('error', e => console.log(`[keep-alive] error: ${e.message}`));
}, 14 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Proxy v3 running on port ${PORT} — zero dependencies CORS`);
});
