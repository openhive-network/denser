// site-router.mjs's counterpart of stack/integration/Caddyfile.static.releases:
// /<app>/_next/static/<file> served from a directory, with the .br/.zst sidecars
// scripts/precompress-static.mjs wrote, the immutable cache header on a hit, and a
// 404 (never the app) on a miss.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const CONTENT_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};
// caddy's `precompressed br zstd gzip`: the first of these the client accepts.
const SIDECARS = [
  ['br', '.br'],
  ['zstd', '.zst'],
  ['gzip', '.gz']
];
const IMMUTABLE = 'public, max-age=31536000, immutable';

async function regularFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/**
 * The file `relative` (the URL path after /<app>/_next/static, still encoded)
 * names under `root`, or undefined when it names none or leaves `root`.
 */
export async function resolveStatic(root, relative) {
  let decoded;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    return undefined;
  }
  const file = path.resolve(root, `.${path.posix.normalize(`/${decoded}`)}`);
  if (!file.startsWith(path.resolve(root) + path.sep)) return undefined;
  return (await regularFile(file)) ? file : undefined;
}

/**
 * Answers `req` with `file` (from resolveStatic), or a 404 when it is undefined:
 * with the first sidecar of an encoding in `accepted`, else by handing the
 * original's stream and headers to `sendOriginal`, which may compress it on the
 * fly as caddy's `encode` would.
 */
export async function sendStatic(req, res, file, accepted, sendOriginal) {
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    return;
  }
  const headers = {
    'content-type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream',
    'cache-control': IMMUTABLE,
    'x-content-type-options': 'nosniff',
    vary: 'Accept-Encoding'
  };
  for (const [encoding, suffix] of SIDECARS) {
    if (accepted.includes(encoding) && (await regularFile(file + suffix))) {
      const { size } = await stat(file + suffix);
      res.writeHead(200, { ...headers, 'content-encoding': encoding, 'content-length': size });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file + suffix).pipe(res);
      return;
    }
  }
  const { size } = await stat(file);
  sendOriginal(createReadStream(file), { ...headers, 'content-length': String(size) });
}
