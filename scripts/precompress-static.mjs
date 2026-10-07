#!/usr/bin/env node
// Writes FILE.br (brotli, quality 11) and FILE.zst (zstd, level 19) next to every
// compressible file under each DIR, for a proxy that serves precompressed sidecars
// (caddy's `file_server { precompressed br zstd gzip }`). The originals stay. A
// sidecar that would not be smaller than its original is not written, and a stale
// one is removed.
//
//   node scripts/precompress-static.mjs apps/blog/.next/static [DIR...]
//
// Prints one summary line per DIR; exits 1 on a missing DIR or a failed write.
import { availableParallelism } from 'node:os';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import zlib from 'node:zlib';

const COMPRESSIBLE_EXTENSIONS = new Set(['.js', '.mjs', '.css', '.wasm', '.json', '.svg', '.txt', '.map']);
// Below this, a sidecar saves less than its own request headers cost.
const MIN_BYTES = 256;

const brotli = promisify(zlib.brotliCompress);
const zstd = promisify(zlib.zstdCompress);

const ENCODERS = {
  br: (data) =>
    brotli(data, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length
      }
    }),
  zst: (data) =>
    zstd(data, {
      params: {
        [zlib.constants.ZSTD_c_compressionLevel]: 19,
        [zlib.constants.ZSTD_c_checksumFlag]: 1
      }
    })
};

async function* compressibleFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* compressibleFiles(full);
    else if (entry.isFile() && COMPRESSIBLE_EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

async function precompressFile(file, totals) {
  const data = await readFile(file);
  totals.files += 1;
  totals.raw += data.length;
  for (const [suffix, encode] of Object.entries(ENCODERS)) {
    const sidecar = `${file}.${suffix}`;
    const encoded = data.length >= MIN_BYTES ? await encode(data) : undefined;
    if (encoded && encoded.length < data.length) {
      await writeFile(sidecar, encoded);
      totals[suffix] += encoded.length;
    } else {
      await rm(sidecar, { force: true });
      totals[suffix] += data.length;
    }
  }
}

/**
 * Precompresses every compressible file under `dir`.
 * @returns {Promise<{files: number, raw: number, br: number, zst: number}>} the
 *   file count and the bytes a client gets with no encoding, brotli and zstd.
 */
export async function precompressDir(dir) {
  const totals = { files: 0, raw: 0, br: 0, zst: 0 };
  const queue = compressibleFiles(dir);
  // zlib's async calls run on libuv's pool; one worker per core keeps it busy.
  const worker = async () => {
    for (let next = await queue.next(); !next.done; next = await queue.next()) {
      await precompressFile(next.value, totals);
    }
  };
  await Promise.all(Array.from({ length: availableParallelism() }, worker));
  return totals;
}

async function main(dirs) {
  if (dirs.length === 0) {
    console.error('usage: precompress-static.mjs DIR...');
    process.exit(64);
  }
  for (const dir of dirs) {
    const t = await precompressDir(dir);
    const kb = (n) => `${Math.round(n / 1024)} KB`;
    console.log(`precompress: ${dir}: ${t.files} files, ${kb(t.raw)} raw, ${kb(t.br)} br, ${kb(t.zst)} zst`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`precompress: ${error.message}`);
    process.exit(1);
  });
}
