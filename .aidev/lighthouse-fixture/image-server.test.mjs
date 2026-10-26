// image-server.mjs in replay mode, on a free port, over a recording of one path: what
// it counts as a MISS and what its status reports.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const server = path.join(path.dirname(fileURLToPath(import.meta.url)), 'image-server.mjs');
let dir;
let serverProcess;
let origin;

async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-server-test-'));
  fs.writeFileSync(path.join(dir, 'body'), 'png');
  fs.writeFileSync(
    path.join(dir, '_index.json'),
    JSON.stringify({ '/p/recorded?width=64': { file: 'body', status: 200, contentType: 'image/png' } })
  );
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  serverProcess = spawn('node', [server, 'replay', dir, '--port', String(port)], { stdio: ['ignore', 'pipe', 'ignore'] });
  await new Promise((resolve) => serverProcess.stdout.once('data', resolve));
});

after(() => {
  serverProcess.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

async function status() {
  return (await fetch(`${origin}/__aidev/status`)).json();
}

test('the harness requests under /__aidev/ are not misses', async () => {
  for (let i = 0; i < 3; i++) assert.equal((await fetch(`${origin}/__aidev/status`)).status, 200);
  assert.equal((await fetch(`${origin}/__aidev/status?probe=1`)).status, 200);
  assert.equal((await fetch(`${origin}/__aidev/fixture-set/lighthouse`, { method: 'PUT' })).status, 404);
  assert.equal((await fetch(`${origin}/__aidev/status`, { method: 'HEAD' })).status, 404);
  const counts = await status();
  assert.equal(counts.misses, 0);
  assert.deepEqual(counts.missed, []);
});

test('a recorded path is served, each unrecorded request is a counted 404, listed once by path', async () => {
  const recorded = await fetch(`${origin}/p/recorded?width=64`);
  assert.equal(recorded.status, 200);
  assert.equal(await recorded.text(), 'png');
  assert.equal((await fetch(`${origin}/p/recorded?width=128`)).status, 404);
  assert.equal((await fetch(`${origin}/rpc`)).status, 404);
  assert.equal((await fetch(`${origin}/rpc`, { method: 'HEAD' })).status, 404);
  const counts = await status();
  assert.equal(counts.served, 1);
  assert.equal(counts.misses, 3);
  assert.deepEqual(counts.missed, ['/p/recorded?width=128', '/rpc']);
});
