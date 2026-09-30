#!/usr/bin/env node
// The fixture proxy of AIDEV's service stacks (.aidev/dev-stack.compose.yml,
// .aidev/test-stack.compose.yml), run standalone rather than inside a
// Playwright worker, plus the small TCP forwarder the stack scripts need.
//
//   node .aidev/fixture-proxy-serve.mjs serve [--port 8200]
//   node .aidev/fixture-proxy-serve.mjs forward <listen-port> <host:port>
//
// `serve` listens on --port (default 8200, what playwright.fixture.config.ts and
// the broadcast interceptor expect) and hands every request to one backend:
//
//   replay   — apps/blog/playwright/tests/support/mock-server/fixture-proxy.ts's
//              createReplayProxy for one recording, started on an internal port.
//              The initial recording is $FIXTURE_SET; switch it at run time with
//              `PUT /__aidev/fixture-set/<name>` (a switch restarts the replay
//              proxy, so its per-request call counters start over, as they do
//              when a spec file starts its own).
//   relay    — forward to another fixture proxy, e.g. the one a Playwright worker
//              starts inside the suite's container. `POST /__aidev/upstream`
//              (optionally `?port=8200` or a JSON body {"url": "http://h:p"})
//              registers the requester's own address; `DELETE` drops it.
//
// `GET /__aidev/status` reports the current backend. With no backend the proxy
// answers a JSON-RPC error, the shape a replay MISS has, so the blog renders its
// error states rather than hanging.
//
// The replay backend needs node_modules (express, cors, jiti); relay and
// forward use node's standard library only.
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLOG = path.join(ROOT, 'apps/blog');
const PROXY_TS = path.join(BLOG, 'playwright/tests/support/mock-server/fixture-proxy.ts');
const INTERNAL_REPLAY_PORT = Number(process.env.FIXTURE_REPLAY_INTERNAL_PORT || 8299);

function log(message) {
  console.log(`[aidev-fixture-proxy] ${message}`);
}

// ---------------------------------------------------------------- replay ----

let replayModule;
function loadReplayModule() {
  if (!replayModule) {
    // fixture-proxy.ts is TypeScript with CommonJS semantics (__dirname), so it
    // is loaded through jiti, which the workspace already carries (tailwindcss
    // depends on it) — no build step and no new dependency.
    const blogRequire = createRequire(path.join(BLOG, 'package.json'));
    const tailwindRequire = createRequire(blogRequire.resolve('tailwindcss/package.json'));
    const jiti = tailwindRequire('jiti')(path.join(BLOG, 'aidev-fixture-proxy.js'), { interopDefault: true });
    replayModule = jiti(PROXY_TS);
  }
  return replayModule;
}

// ----------------------------------------------------------------- serve ----

function serve(port) {
  let backend = null; // { kind: 'replay', name, handle, url } | { kind: 'relay', url }
  let switching = Promise.resolve();

  async function stopReplay() {
    if (backend?.kind === 'replay') {
      const { handle } = backend;
      backend = null;
      await handle.close();
    }
  }

  async function useReplay(name) {
    const mod = loadReplayModule();
    if (!mod.hasFixtures(name)) throw new Error(`no recording named ${JSON.stringify(name)} under playwright/tests/mock/fixtures`);
    await stopReplay();
    const handle = await mod.createReplayProxy(name, { port: INTERNAL_REPLAY_PORT });
    backend = { kind: 'replay', name, handle, url: `http://127.0.0.1:${INTERNAL_REPLAY_PORT}` };
    log(`backend: replay ${name}`);
  }

  async function useRelay(url) {
    await stopReplay();
    backend = { kind: 'relay', url };
    log(`backend: relay to ${url}`);
  }

  function status() {
    if (!backend) return { backend: 'none' };
    return backend.kind === 'replay'
      ? { backend: 'replay', fixtureSet: backend.name }
      : { backend: 'relay', upstream: backend.url };
  }

  function reply(res, code, body) {
    res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(body));
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  function remoteHost(req) {
    const addr = req.socket.remoteAddress || '127.0.0.1';
    const v4 = addr.replace(/^::ffff:/, '');
    return v4.includes(':') ? `[${v4}]` : v4;
  }

  async function control(req, res, url) {
    const parts = url.pathname.split('/').filter(Boolean); // ['__aidev', ...]
    try {
      if (parts[1] === 'status' && req.method === 'GET') return reply(res, 200, status());
      if (parts[1] === 'fixture-set' && parts[2] && (req.method === 'PUT' || req.method === 'POST')) {
        const name = decodeURIComponent(parts[2]);
        switching = switching.then(() => useReplay(name));
        await switching;
        return reply(res, 200, status());
      }
      if (parts[1] === 'upstream' && req.method === 'POST') {
        const raw = (await readBody(req)).toString().trim();
        let target = raw ? JSON.parse(raw).url : '';
        if (!target) target = `http://${remoteHost(req)}:${url.searchParams.get('port') || 8200}`;
        switching = switching.then(() => useRelay(target.replace(/\/+$/, '')));
        await switching;
        return reply(res, 200, status());
      }
      if ((parts[1] === 'upstream' || parts[1] === 'fixture-set') && req.method === 'DELETE') {
        switching = switching.then(async () => {
          await stopReplay();
          backend = null;
          log('backend: none');
        });
        await switching;
        return reply(res, 200, status());
      }
      return reply(res, 404, { error: `unknown control request ${req.method} ${url.pathname}` });
    } catch (error) {
      switching = Promise.resolve();
      return reply(res, 400, { error: String(error?.message || error) });
    }
  }

  function noBackend(req, res) {
    readBody(req).then((body) => {
      let id = 0;
      try {
        id = JSON.parse(body.toString()).id ?? 0;
      } catch {
        // not JSON-RPC
      }
      reply(res, 200, { id, jsonrpc: '2.0', error: { code: -32000, message: 'aidev fixture proxy: no fixture set or upstream selected' } });
    });
  }

  function forward(req, res, base) {
    const target = new URL(req.url, base);
    const upstream = http.request(
      target,
      { method: req.method, headers: { ...req.headers, host: target.host } },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      }
    );
    upstream.on('error', (error) => {
      if (res.headersSent) return res.destroy(error);
      reply(res, 502, { jsonrpc: '2.0', id: 0, error: { code: -32000, message: `aidev fixture proxy: ${base} unreachable (${error.code || error.message})` } });
    });
    req.pipe(upstream);
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://proxy');
    if (url.pathname.startsWith('/__aidev/')) return void control(req, res, url);
    if (!backend) return noBackend(req, res);
    forward(req, res, backend.url);
  });
  server.keepAliveTimeout = 5000;

  server.listen(port, async () => {
    log(`listening on :${port}`);
    if (process.env.FIXTURE_SET) {
      try {
        await useReplay(process.env.FIXTURE_SET);
      } catch (error) {
        log(`FIXTURE_SET=${process.env.FIXTURE_SET}: ${error.message}`);
        process.exit(1);
      }
    }
  });

  const shutdown = () => stopReplay().finally(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// --------------------------------------------------------------- forward ----

function forwardTcp(listenPort, target) {
  const [host, port] = target.split(/:(?=\d+$)/);
  const server = net.createServer((client) => {
    const upstream = net.connect(Number(port), host);
    client.pipe(upstream).pipe(client);
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
  });
  server.listen(Number(listenPort), '127.0.0.1', () => log(`forwarding 127.0.0.1:${listenPort} -> ${target}`));
  process.on('SIGTERM', () => process.exit(0));
}

// ------------------------------------------------------------------ main ----

const [mode, ...args] = process.argv.slice(2);
if (mode === 'serve') {
  const i = args.indexOf('--port');
  serve(Number(i >= 0 ? args[i + 1] : process.env.FIXTURE_PORT || 8200));
} else if (mode === 'forward' && args.length === 2) {
  forwardTcp(args[0], args[1]);
} else {
  console.error('usage: fixture-proxy-serve.mjs serve [--port N] | forward <listen-port> <host:port>');
  process.exit(2);
}
