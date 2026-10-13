#!/usr/bin/env node
// A root-path front for a Next.js server built with a base path, used by the
// test stack's wallet-live (.aidev/wallet-serve-standalone.sh).
//
//   node base-path-front.mjs --port 4000 --upstream 4001 --base /wallet
//
// The wallet's live e2e specs were written for its root deployment: they open
// `/` and `/@gtg/transfers` and match the page URL against `<host>/@gtg/...`.
// This passes a request for a path under --base through unchanged (the build's
// own links, assets and API calls), serves any other path from under --base
// (`/x` from `/wallet/x`, `/` from `/wallet`), and takes --base off a redirect's
// same-origin Location, so a page the specs open stays at its root-path URL.
import http from 'node:http';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    upstream: { type: 'string' },
    base: { type: 'string' }
  }
});
const port = Number(values.port);
const upstreamPort = Number(values.upstream);
const base = values.base ?? '';
if (!Number.isInteger(port) || !Number.isInteger(upstreamPort) || !/^\/[^/?#]+$/.test(base)) {
  console.error('usage: base-path-front.mjs --port N --upstream N --base /segment');
  process.exit(2);
}

function underBase(url) {
  return url === base || url.startsWith(`${base}/`) || url.startsWith(`${base}?`);
}

function upstreamPath(url) {
  if (underBase(url)) return url;
  return url === '/' || url.startsWith('/?') ? base + url.slice(1) : base + url;
}

function rootLocation(location) {
  if (typeof location !== 'string' || !underBase(location)) return location;
  return location.slice(base.length) || '/';
}

const server = http.createServer((req, res) => {
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: upstreamPort,
      method: req.method,
      path: upstreamPath(req.url ?? '/'),
      headers: req.headers
    },
    (answer) => {
      const headers = { ...answer.headers };
      if (headers.location) headers.location = rootLocation(headers.location);
      res.writeHead(answer.statusCode ?? 502, headers);
      answer.pipe(res);
    }
  );
  upstream.on('error', (error) => {
    console.error(`base-path-front: ${req.method} ${req.url}: ${error.message}`);
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`upstream :${upstreamPort} unavailable\n`);
  });
  req.pipe(upstream);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`base-path-front: :${port} -> 127.0.0.1:${upstreamPort}${base}`);
});
