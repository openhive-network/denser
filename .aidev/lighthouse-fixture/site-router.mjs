#!/usr/bin/env node
// The one origin of the deterministic Lighthouse pass (.aidev/run-lighthouse-fixture.sh):
// the integration site's routing (stack/integration/Caddyfile.routes) without caddy,
// which the suite's image does not carry.
//
//   node site-router.mjs --port 8000 --blog 3000 --wallet 4000 \
//       [--static-blog DIR] [--static-wallet DIR]
//
// /blog and /blog/* go to the blog server, /wallet and /wallet/* to the wallet's,
// anything else redirects to /blog. With --static-<app> DIR, /<app>/_next/static/*
// is served from DIR instead, precompressed (static-files.mjs), as the integration
// site's caddy serves it. Like caddy's `encode zstd gzip`, a compressible
// response the app sends unencoded (the blog leaves compression to the proxy) is
// compressed, zstd when the browser accepts it, else gzip. With DENSER_FIXTURE_CLOCK
// set, every HTML document also gets clock.cjs's browser clock as the first element
// of its <head>. Everything stays streamed.
import http from 'node:http';
import { createRequire } from 'node:module';
import { Transform } from 'node:stream';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';
import { resolveStatic, sendStatic } from './static-files.mjs';

const require = createRequire(import.meta.url);
const { browserClockScript } = require('./clock.cjs');

const HEAD_OPEN = /<head(\s[^>]*)?>/i;
// Give up looking for <head> after this much of a document.
const HEAD_SEARCH_LIMIT = 64 * 1024;

// [decoder, encoder(streamed)]. A streamed encoder flushes every chunk, so a document
// streams as the app sends it; any other response is compressed whole, so its bytes do
// not depend on how the app's writes happened to be split.
const CODECS = {
  zstd: [() => zlib.createZstdDecompress(), (streamed) => zlib.createZstdCompress(streamed ? { flush: zlib.constants.ZSTD_e_flush } : {})],
  gzip: [() => zlib.createGunzip(), (streamed) => zlib.createGzip(streamed ? { flush: zlib.constants.Z_SYNC_FLUSH } : {})],
  deflate: [() => zlib.createInflate(), (streamed) => zlib.createDeflate(streamed ? { flush: zlib.constants.Z_SYNC_FLUSH } : {})],
  br: [() => zlib.createBrotliDecompress(), (streamed) => zlib.createBrotliCompress(streamed ? { flush: zlib.constants.BROTLI_OPERATION_FLUSH } : {})],
};
// caddy's encode defaults: the types it compresses, the size below which it does not,
// and the order of `encode zstd gzip` (stack/integration/Caddyfile.session).
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xhtml\+xml|atom\+xml|rss\+xml|wasm)|image\/svg\+xml)/;
const MIN_COMPRESS_BYTES = 512;
const ENCODE_ORDER = ['zstd', 'gzip'];

// Searched as latin1, which maps bytes one to one, so a UTF-8 character split across
// chunks passes through intact.
function injectAfterHead(snippet) {
  const bytes = (text) => Buffer.from(text, 'latin1');
  let pending = '';
  let done = false;
  return new Transform({
    transform(chunk, _encoding, callback) {
      if (done) return callback(null, chunk);
      pending += chunk.toString('latin1');
      const match = HEAD_OPEN.exec(pending);
      if (match) {
        const at = match.index + match[0].length;
        done = true;
        return callback(null, bytes(pending.slice(0, at) + snippet + pending.slice(at)));
      }
      if (pending.length > HEAD_SEARCH_LIMIT) {
        done = true;
        return callback(null, bytes(pending));
      }
      callback();
    },
    flush(callback) {
      callback(null, done ? undefined : bytes(pending));
    },
  });
}

// The encoding caddy would add to this unencoded response, or none.
function addedEncoding(req, upstream) {
  if (req.method === 'HEAD' || [204, 304].includes(upstream.statusCode)) return undefined;
  if (!COMPRESSIBLE.test(String(upstream.headers['content-type'] || ''))) return undefined;
  const length = upstream.headers['content-length'];
  if (length !== undefined && Number(length) < MIN_COMPRESS_BYTES) return undefined;
  const accepted = acceptedEncodings(req);
  return ENCODE_ORDER.find((encoding) => accepted.includes(encoding));
}

function acceptedEncodings(req) {
  return String(req.headers['accept-encoding'] || '').split(',').map((e) => e.trim().split(';')[0]);
}

function respond(req, upstream, res, injectClock) {
  const sent = upstream.headers['content-encoding'];
  const html = String(upstream.headers['content-type']).startsWith('text/html');
  const inject = injectClock && html && (!sent || CODECS[sent]);
  const encoding = sent || addedEncoding(req, upstream);
  if (!inject && encoding === sent) {
    res.writeHead(upstream.statusCode, upstream.headers);
    upstream.pipe(res);
    return;
  }
  const headers = { ...upstream.headers, 'content-encoding': encoding };
  delete headers['content-length'];
  if (!encoding) delete headers['content-encoding'];
  if (!sent && encoding) headers.vary = [upstream.headers.vary, 'Accept-Encoding'].filter(Boolean).join(', ');
  res.writeHead(upstream.statusCode, headers);
  let stream = upstream;
  if (inject && sent) stream = stream.pipe(CODECS[sent][0]());
  if (inject) stream = stream.pipe(injectAfterHead(browserClockScript(Date.now())));
  if (encoding && (inject || !sent)) stream = stream.pipe(CODECS[encoding][1](html));
  stream.pipe(res);
}

function backendOf(pathname, ports) {
  const app = pathname.split('/')[1];
  return ports[app];
}

const STATIC_PATH = /^\/([^/]+)\/_next\/static\/(.+)$/;

async function serveStatic(req, res, root, relative) {
  const file = await resolveStatic(root, relative);
  // The original as a proxied response, for respond()'s on-the-fly encoding.
  await sendStatic(req, res, file, acceptedEncodings(req), (stream, headers) =>
    respond(req, Object.assign(stream, { statusCode: 200, headers }), res, false)
  );
}

function route(req, res, ports, staticRoots, injectClock) {
  const { pathname } = new URL(req.url, 'http://router');
  const [, app, relative] = pathname.match(STATIC_PATH) || [];
  const staticRoot = Object.hasOwn(staticRoots, app ?? '') ? staticRoots[app] : undefined;
  if (staticRoot) {
    serveStatic(req, res, staticRoot, relative).catch((error) => {
      if (res.headersSent) return res.destroy(error);
      res.writeHead(500, { 'content-type': 'text/plain' }).end(`site-router: ${error.message}`);
    });
    return;
  }
  const port = backendOf(pathname, ports);
  if (!port) {
    res.writeHead(302, { location: '/blog' }).end();
    return;
  }
  const headers = {
    ...req.headers,
    'x-forwarded-for': req.socket.remoteAddress,
    'x-forwarded-proto': 'http',
    'x-forwarded-host': req.headers.host,
  };
  const upstream = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers }, (up) =>
    respond(req, up, res, injectClock)
  );
  upstream.on('error', (error) => {
    if (res.headersSent) return res.destroy(error);
    res.writeHead(502, { 'content-type': 'text/plain' }).end(`site-router: 127.0.0.1:${port}: ${error.message}`);
  });
  req.pipe(upstream);
}

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '8000' },
    blog: { type: 'string' },
    wallet: { type: 'string' },
    'static-blog': { type: 'string' },
    'static-wallet': { type: 'string' },
  },
});
if (!values.blog || !values.wallet) {
  console.error('usage: site-router.mjs [--port N] --blog <port> --wallet <port> [--static-blog DIR] [--static-wallet DIR]');
  process.exit(2);
}
const ports = { blog: Number(values.blog), wallet: Number(values.wallet) };
const staticRoots = { blog: values['static-blog'], wallet: values['static-wallet'] };
const injectClock = Boolean(process.env.DENSER_FIXTURE_CLOCK);
const server = http.createServer((req, res) => route(req, res, ports, staticRoots, injectClock));
server.keepAliveTimeout = 65_000;
server.listen(Number(values.port), '127.0.0.1', () =>
  console.log(`[site-router] :${values.port} /blog -> ${ports.blog}, /wallet -> ${ports.wallet}${Object.entries(staticRoots).filter(([, dir]) => dir).map(([app, dir]) => `, /${app}/_next/static -> ${dir}`).join('')}${injectClock ? `, clock ${process.env.DENSER_FIXTURE_CLOCK}` : ''}`)
);
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
