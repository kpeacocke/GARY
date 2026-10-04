const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8080);
const UI_DIR = path.resolve(__dirname, '../ui');
const COMPONENTS = ['drums', 'bass', 'synth', 'voice'];

const state = {
  gary: 'online',
  components: Object.fromEntries(COMPONENTS.map((name) => [name, 'healthy'])),
  beatContinuity: true,
  updatedAt: new Date().toISOString(),
};

const events = [];

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function emitEvent(component, status, reason = 'audience') {
  const evt = {
    specversion: '1.0',
    type: `com.redhat.gary.component.${status === 'failed' ? 'failed' : 'recovered'}`,
    source: '/gary/simulator',
    subject: `audio/${component}`,
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    data: { component, status, reason },
  };
  events.unshift(evt);
  events.splice(50);
  return evt;
}

function mutateComponent(component, status, reason) {
  if (!COMPONENTS.includes(component)) return null;
  state.components[component] = status;
  state.updatedAt = new Date().toISOString();
  const event = emitEvent(component, status, reason);
  return { state, event };
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  }[ext] || 'application/octet-stream';
}

function serveStatic(req, res) {
  let requested = new URL(req.url, 'http://localhost').pathname;
  if (requested === '/') requested = '/index.html';
  const filePath = path.resolve(UI_DIR, '.' + requested);
  if (!filePath.startsWith(UI_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    res.writeHead(200, { 'content-type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/healthz') {
      return json(res, 200, { status: 'ok' });
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      return json(res, 200, state);
    }

    if (req.method === 'GET' && url.pathname === '/api/events') {
      return json(res, 200, { events });
    }

    if (req.method === 'POST' && url.pathname === '/api/reset') {
      for (const name of COMPONENTS) state.components[name] = 'healthy';
      state.updatedAt = new Date().toISOString();
      return json(res, 200, state);
    }

    const match = url.pathname.match(/^\/api\/components\/([^/]+)\/(fail|recover)$/);
    if (req.method === 'POST' && match) {
      const [, component, action] = match;
      const status = action === 'fail' ? 'failed' : 'healthy';
      const result = mutateComponent(component, status, url.searchParams.get('reason') || 'audience');
      if (!result) return json(res, 404, { error: 'unknown component', component });
      return json(res, 200, result);
    }

    if (url.pathname.startsWith('/api/')) {
      return json(res, 404, { error: 'not found' });
    }

    return serveStatic(req, res);
  });
}

if (require.main === module) {
  createServer().listen(PORT, '0.0.0.0', () => {
    console.log(`GARY listening on :${PORT}`);
  });
}

module.exports = { createServer, state, events, mutateComponent };
