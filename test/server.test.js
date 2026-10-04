const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('../app/server/index');

async function withServer(fn) {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('health endpoint works', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });
});

test('component can fail and recover', async () => {
  await withServer(async (base) => {
    let res = await fetch(`${base}/api/components/drums/fail`, { method: 'POST' });
    let body = await res.json();
    assert.equal(body.state.components.drums, 'failed');
    assert.equal(body.event.type, 'com.redhat.gary.component.failed');

    res = await fetch(`${base}/api/components/drums/recover`, { method: 'POST' });
    body = await res.json();
    assert.equal(body.state.components.drums, 'healthy');
    assert.equal(body.event.type, 'com.redhat.gary.component.recovered');
  });
});
