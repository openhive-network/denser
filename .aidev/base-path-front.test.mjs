// base-path-front.mjs between a client and a stand-in upstream that records the
// paths it is asked for and answers some with redirects.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const front = path.join(path.dirname(fileURLToPath(import.meta.url)), 'base-path-front.mjs');
let upstream;
let frontProcess;
let frontPort;

function listening(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

async function freePort() {
  const probe = http.createServer();
  const port = await listening(probe);
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

before(async () => {
  upstream = http.createServer((req, res) => {
    if (req.url === '/wallet/@gtg') {
      res.writeHead(307, { location: '/wallet/@gtg/transfers' });
      return res.end();
    }
    if (req.url === '/wallet/elsewhere') {
      res.writeHead(307, { location: 'https://example.org/wallet/x' });
      return res.end();
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`${req.method} ${req.url}`);
  });
  const upstreamPort = await listening(upstream);
  frontPort = await freePort();
  frontProcess = spawn('node', [front, '--port', String(frontPort), '--upstream', String(upstreamPort), '--base', '/wallet'], {
    stdio: ['ignore', 'pipe', 'inherit']
  });
  await new Promise((resolve) => frontProcess.stdout.once('data', resolve));
});

after(() => {
  frontProcess.kill();
  upstream.close();
});

async function get(url) {
  const res = await fetch(`http://127.0.0.1:${frontPort}${url}`, { redirect: 'manual' });
  return { status: res.status, location: res.headers.get('location'), body: await res.text() };
}

test('a root path is served from under the base path', async () => {
  assert.equal((await get('/')).body, 'GET /wallet');
  assert.equal((await get('/?tab=x')).body, 'GET /wallet?tab=x');
  assert.equal((await get('/@gtg/transfers')).body, 'GET /wallet/@gtg/transfers');
  assert.equal((await get('/api/health')).body, 'GET /wallet/api/health');
});

test('a path under the base path passes through unchanged', async () => {
  assert.equal((await get('/wallet')).body, 'GET /wallet');
  assert.equal((await get('/wallet/_next/static/a.js')).body, 'GET /wallet/_next/static/a.js');
  assert.equal((await get('/wallet?x=1')).body, 'GET /wallet?x=1');
});

test('a path that only starts with the base segment is not taken as under it', async () => {
  assert.equal((await get('/walletfoo')).body, 'GET /wallet/walletfoo');
});

test('a same-origin redirect loses the base path, another keeps its location', async () => {
  const local = await get('/@gtg');
  assert.equal(local.status, 307);
  assert.equal(local.location, '/@gtg/transfers');
  assert.equal((await get('/elsewhere')).location, 'https://example.org/wallet/x');
});

test('an upstream that does not answer is a 502', async () => {
  const closedPort = await freePort();
  const port = await freePort();
  const lonely = spawn('node', [front, '--port', String(port), '--upstream', String(closedPort), '--base', '/wallet'], {
    stdio: ['ignore', 'pipe', 'ignore']
  });
  try {
    await new Promise((resolve) => lonely.stdout.once('data', resolve));
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 502);
  } finally {
    lonely.kill();
  }
});
