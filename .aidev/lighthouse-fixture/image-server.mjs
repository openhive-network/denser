#!/usr/bin/env node
// The image proxy of the deterministic Lighthouse pass (.aidev/run-lighthouse-fixture.sh):
// what the apps' REACT_APP_IMAGES_ENDPOINT points at instead of images.hive.blog.
//
//   node image-server.mjs record <dir> [--port 8201] [--upstream https://images.hive.blog]
//   node image-server.mjs replay <dir> [--port 8201]
//   node image-server.mjs prune <dir> <origin> <report.json.gz>...
//
// record  forwards each GET to the upstream and stores the response (status, content
//         type, redirect target, body) under <dir>: one file per body, named by the hash
//         of the request path, and <dir>/_index.json mapping each path to its file.
//         Responses are stored as the upstream sends them for the browser's own Accept,
//         at the widths the pages request.
// replay  serves only <dir>; a path that was never recorded is a 404 and a MISS.
// prune   keeps the bodies of the paths the Lighthouse reports' network requests list
//         (under <origin>, the server's address while recording). Every other path
//         becomes a recorded 404 with no body: Lighthouse fetches those after its trace
//         (the natural size of lazy images, at full size), so no metric reads them, and
//         replay answers them without a MISS.
//
// A redirect's Location on the upstream is rewritten to this server, so the browser
// follows it here. `GET /__aidev/status` answers {mode, served, misses}.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import zlib from 'node:zlib';

const INDEX = '_index.json';

function readIndex(dir) {
  const file = path.join(dir, INDEX);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function writeIndex(dir, index) {
  const sorted = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(path.join(dir, `${INDEX}.tmp`), JSON.stringify(sorted, null, 2) + '\n');
  fs.renameSync(path.join(dir, `${INDEX}.tmp`), path.join(dir, INDEX));
}

function localLocation(location, upstream, self) {
  if (!location) return undefined;
  const target = new URL(location, upstream);
  return target.origin === new URL(upstream).origin ? `${self}${target.pathname}${target.search}` : target.href;
}

async function record(dir, upstream, req, index) {
  const response = await fetch(`${upstream}${req.url}`, {
    redirect: 'manual',
    headers: { accept: req.headers.accept || '*/*', 'user-agent': req.headers['user-agent'] || 'denser-lighthouse-fixture' },
  });
  const body = Buffer.from(await response.arrayBuffer());
  const file = crypto.createHash('sha256').update(req.url).digest('hex').slice(0, 20);
  fs.writeFileSync(path.join(dir, file), body);
  index[req.url] = {
    file,
    status: response.status,
    contentType: response.headers.get('content-type') || undefined,
    location: response.headers.get('location') || undefined,
  };
  writeIndex(dir, index);
  return { entry: index[req.url], body };
}

function serve({ mode, dir, port, upstream }) {
  fs.mkdirSync(dir, { recursive: true });
  const index = readIndex(dir);
  const self = `http://127.0.0.1:${port}`;
  let served = 0;
  let misses = 0;

  const server = http.createServer(async (req, res) => {
    if (req.url === '/__aidev/status') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ mode, served, misses }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }
    try {
      let entry = index[req.url];
      let body = entry && (entry.file ? fs.readFileSync(path.join(dir, entry.file)) : Buffer.alloc(0));
      if (!entry && mode === 'record') ({ entry, body } = await record(dir, upstream, req, index));
      if (!entry) {
        misses++;
        console.warn(`[image-server] MISS ${req.url}`);
        res.writeHead(404, { 'access-control-allow-origin': '*' }).end();
        return;
      }
      served++;
      const headers = { 'access-control-allow-origin': '*', 'content-length': body.length };
      if (entry.contentType) headers['content-type'] = entry.contentType;
      const location = localLocation(entry.location, upstream, self);
      if (location) headers.location = location;
      res.writeHead(entry.status, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      console.error(`[image-server] ${req.url}: ${error.message}`);
      if (!res.headersSent) res.writeHead(502);
      res.end();
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`[image-server] ${mode} ${dir} on ${self}${mode === 'record' ? ` from ${upstream}` : ''}`));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
}

function prune(dir, origin, reports) {
  const measured = new Set();
  for (const report of reports) {
    const { audits } = JSON.parse(zlib.gunzipSync(fs.readFileSync(report)));
    for (const { url } of audits['network-requests'].details.items) {
      if (url.startsWith(`${origin}/`)) measured.add(url.slice(origin.length));
    }
  }
  const index = readIndex(dir);
  let pruned = 0;
  for (const [requestPath, entry] of Object.entries(index)) {
    if (measured.has(requestPath) || !entry.file) continue;
    fs.rmSync(path.join(dir, entry.file));
    index[requestPath] = { status: 404, pruned: 'not fetched by a measured run' };
    pruned++;
  }
  writeIndex(dir, index);
  console.log(`[image-server] pruned ${pruned} of ${Object.keys(index).length} recorded paths; ${reports.length} reports list the rest`);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port: { type: 'string', default: '8201' },
    upstream: { type: 'string', default: 'https://images.hive.blog' },
  },
});
const [mode, dir, ...rest] = positionals;
if (mode === 'prune' && dir && rest.length >= 2) {
  prune(dir, rest[0].replace(/\/+$/, ''), rest.slice(1));
  process.exit(0);
}
if (!['record', 'replay'].includes(mode) || !dir) {
  console.error('usage: image-server.mjs record|replay <dir> [--port N] [--upstream URL] | prune <dir> <origin> <report.json.gz>...');
  process.exit(2);
}
serve({ mode, dir, port: Number(values.port), upstream: values.upstream.replace(/\/+$/, '') });
