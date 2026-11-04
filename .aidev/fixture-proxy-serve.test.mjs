// fixture-proxy-serve.mjs `serve` with no recording, on a free port: which control
// requests it refuses, and that a refused one leaves its backend as it was.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const proxy = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixture-proxy-serve.mjs');
const RELAY = 'http://127.0.0.1:9';
let dir;
let proxyProcess;
let origin;
let token;

async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-proxy-serve-test-'));
  const tokenFile = path.join(dir, 'token');
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  proxyProcess = spawn('node', [proxy, 'serve', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'ignore'],
    env: { ...process.env, FIXTURE_SET: '', AIDEV_FIXTURE_TOKEN: '', AIDEV_FIXTURE_TOKEN_FILE: tokenFile },
  });
  await new Promise((resolve) => proxyProcess.stdout.once('data', resolve));
  token = fs.readFileSync(tokenFile, 'utf8');
});

after(() => {
  proxyProcess.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function backend() {
  return (await fetch(`${origin}/__aidev/status`)).json();
}

function registerRelay(headers) {
  return fetch(`${origin}/__aidev/upstream`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', ...headers },
    body: JSON.stringify({ url: RELAY }),
  });
}

test('the generated token is written to AIDEV_FIXTURE_TOKEN_FILE, readable by its owner only', () => {
  assert.match(token, /^[0-9a-f]{48}$/);
  assert.equal(fs.statSync(path.join(dir, 'token')).mode & 0o777, 0o600);
});

test('a relay registration without the token, or with a wrong one, answers 403 and changes nothing', async () => {
  for (const headers of [{}, { 'x-aidev-fixture-token': 'not-the-token' }]) {
    const res = await registerRelay(headers);
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
  assert.deepEqual(await backend(), { backend: 'none' });
});

test('a relay registration from a page (Origin header) answers 403 even with the token', async () => {
  const res = await registerRelay({ origin: 'https://evil.example', 'x-aidev-fixture-token': token });
  assert.equal(res.status, 403);
  assert.deepEqual(await backend(), { backend: 'none' });
});

test('status needs no token but refuses an Origin header', async () => {
  const res = await fetch(`${origin}/__aidev/status`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
  assert.equal((await fetch(`${origin}/__aidev/status`, { headers: { origin: 'http://localhost:3000' } })).status, 403);
});

test('with the token a relay is registered and dropped, a tokenless DELETE refused in between', async () => {
  const res = await registerRelay({ 'x-aidev-fixture-token': token });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { backend: 'relay', upstream: RELAY });

  assert.equal((await fetch(`${origin}/__aidev/upstream`, { method: 'DELETE' })).status, 403);
  assert.deepEqual(await backend(), { backend: 'relay', upstream: RELAY });

  const drop = await fetch(`${origin}/__aidev/upstream`, { method: 'DELETE', headers: { 'x-aidev-fixture-token': token } });
  assert.equal(drop.status, 200);
  assert.deepEqual(await backend(), { backend: 'none' });
});

test('API requests from the apps keep their CORS header', async () => {
  const res = await fetch(`${origin}/`, {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
    body: JSON.stringify({ id: 7, jsonrpc: '2.0', method: 'condenser_api.get_config', params: [] }),
  });
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.equal((await res.json()).id, 7);
});
