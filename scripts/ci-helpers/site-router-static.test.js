// The deterministic Lighthouse pass's site-router (.aidev/lighthouse-fixture/site-router.mjs)
// serving /<app>/_next/static/* from the build's files, as the integration site's
// caddy does (stack/integration/Caddyfile.static.releases).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

const ROUTER = path.join(__dirname, '../../.aidev/lighthouse-fixture/site-router.mjs');
const script = 'export const chunk = "denser";\n'.repeat(400);
const wasm = Buffer.alloc(20000, 3);

const freePort = () =>
  new Promise((resolve) => {
    const server = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

// The apps: answer every request with the app's name, and remember the paths.
const appHits = [];
const startApp = (name) =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      appHits.push(`${name} ${req.url}`);
      res.writeHead(200, { 'content-type': 'text/plain' }).end(name);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const get = (url, acceptEncoding) =>
  new Promise((resolve, reject) => {
    http
      .get(url, { headers: acceptEncoding ? { 'accept-encoding': acceptEncoding } : {} }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c)).on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });

let router;
let apps;
let site;

before(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-router-static-'));
  const staticDir = path.join(root, 'blog-static');
  fs.mkdirSync(path.join(staticDir, 'chunks'), { recursive: true });
  fs.mkdirSync(path.join(staticDir, 'media'), { recursive: true });
  fs.writeFileSync(path.join(staticDir, 'chunks/app-1a2b.js'), script);
  fs.writeFileSync(path.join(staticDir, 'chunks/app-1a2b.js.br'), zlib.brotliCompressSync(script));
  fs.writeFileSync(path.join(staticDir, 'media/wax.common.3c4d.wasm'), wasm);
  fs.writeFileSync(path.join(staticDir, 'media/wax.common.3c4d.wasm.br'), zlib.brotliCompressSync(wasm));
  fs.writeFileSync(path.join(root, 'secret.js'), 'outside the static root');

  apps = await Promise.all([startApp('blog'), startApp('wallet')]);
  const port = await freePort();
  site = `http://127.0.0.1:${port}`;
  router = spawn(process.execPath, [
    ROUTER,
    '--port', String(port),
    '--blog', String(apps[0].address().port),
    '--wallet', String(apps[1].address().port),
    '--static-blog', staticDir
  ], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve) => router.stdout.once('data', resolve));
});

after(() => {
  router.kill();
  for (const app of apps) app.close();
});

test('a /blog/_next/static chunk comes from the files, brotli, immutable, without reaching the app', async () => {
  appHits.length = 0;
  const res = await get(`${site}/blog/_next/static/chunks/app-1a2b.js`, 'gzip, deflate, br, zstd');
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-encoding'], 'br');
  assert.equal(res.headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal(res.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.equal(res.headers.vary, 'Accept-Encoding');
  assert.equal(res.headers['set-cookie'], undefined);
  assert.equal(zlib.brotliDecompressSync(res.body).toString(), script);
  assert.deepEqual(appHits, []);
});

test('the wasm is application/wasm', async () => {
  const res = await get(`${site}/blog/_next/static/media/wax.common.3c4d.wasm`, 'br');
  assert.equal(res.status, 200);
  assert.equal(res.headers['content-type'], 'application/wasm');
  assert.deepEqual(zlib.brotliDecompressSync(res.body), wasm);
});

test('with no sidecar for an accepted encoding the original is compressed on the fly', async () => {
  const res = await get(`${site}/blog/_next/static/chunks/app-1a2b.js`, 'gzip');
  assert.equal(res.headers['content-encoding'], 'gzip');
  assert.equal(zlib.gunzipSync(res.body).toString(), script);
  const plain = await get(`${site}/blog/_next/static/chunks/app-1a2b.js`);
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(plain.body.toString(), script);
});

test('an unknown static path, or one leaving the root, is a 404 without falling through to the app', async () => {
  appHits.length = 0;
  for (const p of ['/blog/_next/static/chunks/missing.js', '/blog/_next/static/chunks/%2e%2e%2f%2e%2e%2fsecret.js']) {
    const res = await get(`${site}${p}`, 'br');
    assert.equal(res.status, 404, p);
    assert.equal(res.headers['cache-control'], undefined, p);
  }
  assert.deepEqual(appHits, []);
});

test('a dot segment is resolved before routing, so it leaves the static route rather than the root', async () => {
  appHits.length = 0;
  const res = await get(`${site}/blog/_next/static/%2e%2e/%2e%2e/secret.js`);
  assert.equal(res.body.toString(), 'blog');
  assert.deepEqual(appHits, ['blog /blog/secret.js']);
});

test('pages, and the static files of an app with no static root, still go to the app', async () => {
  appHits.length = 0;
  assert.equal((await get(`${site}/blog/trending`)).body.toString(), 'blog');
  assert.equal((await get(`${site}/wallet/_next/static/chunks/w.js`)).body.toString(), 'wallet');
  assert.deepEqual(appHits, ['blog /blog/trending', 'wallet /wallet/_next/static/chunks/w.js']);
});
