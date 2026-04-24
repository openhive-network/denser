import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Server } from 'http';

/**
 * A single recorded request/response pair.
 *
 * Handles both JSON-RPC (POST / with {method, params}) and arbitrary HTTP
 * calls (REST, GETs, etc.). Matching during replay is done via `requestHash`,
 * which is derived from (httpMethod + requestPath + requestQuery + requestBody).
 *
 * For JSON-RPC requests we additionally record `method` and `params` for
 * human readability, but they are not used for matching.
 */
export interface IFixtureEntry {
  httpMethod: string;
  requestPath: string;
  requestQuery?: Record<string, unknown>;
  requestBody?: unknown;
  requestHash: string;

  /** JSON-RPC method name, when applicable (e.g. "bridge.list_communities") */
  method?: string;
  /** JSON-RPC params, when applicable */
  params?: Record<string, unknown>;
  /** Legacy hash of (method, params) — kept for backward compatibility with old fixtures */
  paramsHash?: string;

  response: unknown;
  responseStatus?: number;
  responseContentType?: string;
}

export interface IFixtureProxyHandle {
  close: () => Promise<void>;
  port: number;
  url: string;
  fixtureDir: string;
  mode: 'record' | 'replay';
}

const FIXTURES_ROOT = path.resolve(__dirname, '..', '..', 'mock', 'fixtures');

/**
 * Fields that vary per-call and must be stripped before hashing so that
 * record and replay signatures match. Covers:
 *   - `id`: JSON-RPC request counter (increments per call)
 *   - `signatures`: cryptographic sigs, regenerated on each attempt
 *   - `expiration`, `ref_block_num`, `ref_block_prefix`: transaction
 *     TaPoS metadata tied to the current head block
 */
const VOLATILE_FIELDS = new Set([
  'id',
  'signatures',
  'expiration',
  'ref_block_num',
  'ref_block_prefix'
]);

function stripVolatileFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripVolatileFields);
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!VOLATILE_FIELDS.has(k)) {
        result[k] = stripVolatileFields(v);
      }
    }
    return result;
  }
  return value;
}

/**
 * Normalize a request body for hashing.
 *
 * Strips volatile fields (JSON-RPC `id`, signatures, TaPoS metadata) so
 * that two semantically-identical calls produce the same hash at record
 * and replay time.
 */
function normalizeBodyForHash(body: unknown): unknown {
  return stripVolatileFields(body);
}

/**
 * Compute a stable hash of a full HTTP request signature.
 * Same (method + path + query + body) = same hash.
 */
function computeRequestHash(
  httpMethod: string,
  requestPath: string,
  query: Record<string, unknown>,
  body: unknown
): string {
  const payload = JSON.stringify({
    m: httpMethod.toUpperCase(),
    p: requestPath,
    q: query,
    b: normalizeBodyForHash(body)
  });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

/**
 * Legacy hash used by older JSON-RPC-only fixtures.
 */
function computeParamsHash(method: string, params: Record<string, unknown>): string {
  const payload = JSON.stringify({ method, params });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function extractJsonRpc(
  body: unknown
): { method: string; params: Record<string, unknown> } | null {
  if (typeof body !== 'object' || body === null) return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj.method !== 'string') return null;
  return {
    method: obj.method,
    params: (obj.params as Record<string, unknown>) ?? {}
  };
}

function safeFilenamePart(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return cleaned.slice(0, 80) || 'root';
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Get the fixture directory for a given test name.
 */
export function getFixtureDir(testName: string): string {
  const safeName = testName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(FIXTURES_ROOT, safeName);
}

/**
 * Check if fixtures already exist for a test.
 */
export function hasFixtures(testName: string): boolean {
  const dir = getFixtureDir(testName);
  return fs.existsSync(path.join(dir, '_index.json'));
}

// ─── RECORD MODE ────────────────────────────────────────────────────────────

/**
 * Creates a recording proxy that forwards all requests (any HTTP method,
 * any path) to the real API and saves each unique request/response pair
 * into a test-specific fixture directory.
 *
 * Duplicate (method + path + body + query) combos are skipped to keep
 * fixture directories small.
 */
export async function createFixtureProxy(
  testName: string,
  options: {
    target?: string;
    port?: number;
  } = {}
): Promise<IFixtureProxyHandle> {
  const { target = 'api.hive.blog', port = 8200 } = options;

  const fixtureDir = getFixtureDir(testName);

  // Clean previous fixtures for this test
  if (fs.existsSync(fixtureDir)) {
    fs.rmSync(fixtureDir, { recursive: true });
  }
  fs.mkdirSync(fixtureDir, { recursive: true });

  let requestCount = 0;
  let savedCount = 0;
  let inFlightRequests = 0;
  const labelCounts = new Map<string, number>();
  const savedHashes = new Set<string>();

  const app = express();
  app.use(cors());
  // JSON-RPC payloads can be large (e.g. ranked_posts). Allow 10mb.
  app.use(express.json({ limit: '10mb' }));
  // Fallback for non-JSON text payloads (rare, but keeps us robust).
  app.use(express.text({ limit: '10mb', type: ['text/*'] }));

  app.get('/_status', (_req, res) => {
    res.json({
      status: 'fixture-proxy-record',
      testName,
      totalRequests: requestCount,
      savedFixtures: savedCount
    });
  });

  app.use(async (req, res) => {
    inFlightRequests++;
    const startTime = Date.now();
    const httpMethod = req.method;
    const requestPath = req.path;
    const query = req.query as Record<string, unknown>;
    // express.json/text give us {} for empty bodies — normalize to undefined
    // so requestHash is stable for GET requests
    const reqBody =
      httpMethod === 'GET' || httpMethod === 'HEAD'
        ? undefined
        : typeof req.body === 'object' && req.body !== null && Object.keys(req.body).length === 0
          ? undefined
          : req.body;

    const targetHost = (req.headers['x-hive-target'] as string) || target;
    const targetUrl = `https://${targetHost}${req.originalUrl}`;

    const jsonRpc = extractJsonRpc(reqBody);
    const label = jsonRpc?.method || `${httpMethod} ${requestPath}`;

    try {
      const fetchHeaders: Record<string, string> = {};
      const reqContentType = req.headers['content-type'];
      if (reqContentType) fetchHeaders['content-type'] = String(reqContentType);
      else if (reqBody !== undefined) fetchHeaders['content-type'] = 'application/json';

      const fetchOpts: RequestInit = {
        method: httpMethod,
        headers: fetchHeaders
      };
      if (reqBody !== undefined) {
        fetchOpts.body = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
      }

      const upstream = await fetch(targetUrl, fetchOpts);
      const upstreamContentType = upstream.headers.get('content-type') || '';
      const rawText = await upstream.text();
      const responseBody = upstreamContentType.includes('json')
        ? safeJsonParse(rawText)
        : rawText;
      const durationMs = Date.now() - startTime;

      requestCount++;
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);

      const requestHash = computeRequestHash(httpMethod, requestPath, query, reqBody);

      if (!savedHashes.has(requestHash)) {
        savedHashes.add(requestHash);
        savedCount++;

        const paddedIndex = String(savedCount).padStart(4, '0');
        const nameStem = jsonRpc?.method
          ? safeFilenamePart(jsonRpc.method)
          : `${httpMethod}_${safeFilenamePart(requestPath)}`;
        const filename = `${paddedIndex}-${nameStem}.json`;

        const entry: IFixtureEntry = {
          httpMethod,
          requestPath,
          requestQuery: Object.keys(query).length > 0 ? query : undefined,
          requestBody: reqBody,
          requestHash,
          method: jsonRpc?.method,
          params: jsonRpc?.params,
          response: responseBody,
          responseStatus: upstream.status,
          responseContentType: upstreamContentType || undefined
        };

        fs.writeFileSync(path.join(fixtureDir, filename), JSON.stringify(entry, null, 2));

        console.log(
          `[fixture-proxy:record] #${savedCount} ${label} (${durationMs}ms) → ${filename}`
        );
      } else {
        console.log(
          `[fixture-proxy:record] ${label} (${durationMs}ms) — duplicate, skipped`
        );
      }

      // Forward upstream response to the app
      if (upstreamContentType) res.setHeader('content-type', upstreamContentType);
      res.status(upstream.status).send(rawText);
    } catch (err) {
      console.error(
        `[fixture-proxy:record] Error proxying ${httpMethod} ${requestPath}:`,
        err
      );
      res.status(502).json({ error: 'Proxy error', details: String(err) });
    } finally {
      inFlightRequests--;
    }
  });

  let server: Server;
  await new Promise<void>((resolve, reject) => {
    server = app.listen(port, (error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  console.log(
    `[fixture-proxy:record] Test "${testName}" — recording to ${fixtureDir}, proxying to ${target}`
  );

  return {
    close: async () => {
      // Wait for in-flight requests to complete (max 5s)
      const deadline = Date.now() + 5000;
      while (inFlightRequests > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 100));
      }

      // Write index/summary
      const methodStats: Record<string, number> = {};
      for (const [m, c] of labelCounts.entries()) {
        methodStats[m] = c;
      }
      fs.writeFileSync(
        path.join(fixtureDir, '_index.json'),
        JSON.stringify(
          {
            testName,
            recordedAt: new Date().toISOString(),
            totalRequests: requestCount,
            savedFixtures: savedCount,
            duplicatesSkipped: requestCount - savedCount,
            methods: methodStats
          },
          null,
          2
        )
      );
      console.log(
        `[fixture-proxy:record] Done — ${savedCount} unique fixtures saved (${requestCount - savedCount} duplicates skipped) for "${testName}"`
      );

      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    port,
    url: `http://localhost:${port}`,
    fixtureDir,
    mode: 'record'
  };
}

// ─── REPLAY MODE ────────────────────────────────────────────────────────────

/**
 * Read a fixture directory's `_index.json` if present. Returns an empty
 * object when the file is missing or unparseable — the fixture dir may be
 * a pre-record scratch dir or a hand-rolled variant.
 */
function readIndex(fixtureDir: string): { base?: string } & Record<string, unknown> {
  const indexPath = path.join(fixtureDir, '_index.json');
  if (!fs.existsSync(indexPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Parse one fixture file and normalize it to a current-shape IFixtureEntry
 * (keyed by the freshly computed request hash). Migrates legacy JSON-RPC-only
 * fixtures (which carried `paramsHash` instead of `requestHash`).
 */
function parseFixtureFile(absPath: string): { hash: string; entry: IFixtureEntry } {
  const raw = JSON.parse(fs.readFileSync(absPath, 'utf-8')) as Partial<IFixtureEntry>;

  let entry: IFixtureEntry;
  if (!raw.requestHash) {
    const method = raw.method ?? '';
    const params = (raw.params as Record<string, unknown>) ?? {};
    const legacyHash = raw.paramsHash ?? computeParamsHash(method, params);
    entry = {
      httpMethod: 'POST',
      requestPath: '/',
      requestBody: { jsonrpc: '2.0', method, params, id: 1 },
      requestHash: legacyHash,
      method,
      params,
      paramsHash: legacyHash,
      response: raw.response,
      responseStatus: 200,
      responseContentType: 'application/json'
    };
  } else {
    entry = raw as IFixtureEntry;
  }

  // Always recompute the hash from the stored request (with normalization),
  // so fixtures recorded before id-stripping was added still match at replay.
  const hash = computeRequestHash(
    entry.httpMethod,
    entry.requestPath,
    (entry.requestQuery as Record<string, unknown>) ?? {},
    entry.requestBody
  );
  return { hash, entry };
}

/**
 * Load all fixture entries from a test's fixture directory, grouped by
 * requestHash. For backward compat with older JSON-RPC-only fixtures,
 * legacy entries are keyed off their `paramsHash` and re-hashed to the new
 * (method + path + body + query) scheme at load time.
 *
 * Overlay resolution: if `_index.json` contains a string `base` field, that
 * directory (resolved relative to `FIXTURES_ROOT`) is loaded first and this
 * dir's files then replace any entries that share the same request hash.
 * Variant dirs therefore only need to commit the fixture files whose
 * **response** differs from the base — saving ~80% of on-disk footprint
 * when many variants share most responses. Base chains are allowed; cycles
 * are detected and rejected.
 */
function loadFixtures(
  fixtureDir: string,
  visited: Set<string> = new Set()
): Map<string, IFixtureEntry[]> {
  const absDir = path.resolve(fixtureDir);
  if (visited.has(absDir)) {
    throw new Error(`Circular fixture base chain detected at ${absDir}`);
  }
  visited.add(absDir);

  const index = readIndex(absDir);

  // Resolve and load base first, so variant files can override by hash.
  const fixtures = new Map<string, IFixtureEntry[]>();
  if (typeof index.base === 'string' && index.base.length > 0) {
    const baseDir = path.resolve(FIXTURES_ROOT, index.base);
    const baseFixtures = loadFixtures(baseDir, visited);
    for (const [hash, entries] of baseFixtures.entries()) {
      fixtures.set(hash, [...entries]);
    }
  }

  const files = fs
    .readdirSync(absDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort(); // sorted by index prefix

  // Group this dir's entries by hash so that a variant with N calls to
  // the same RPC still replaces — rather than appends to — the base array.
  const localByHash = new Map<string, IFixtureEntry[]>();
  for (const file of files) {
    const { hash, entry } = parseFixtureFile(path.join(absDir, file));
    if (!localByHash.has(hash)) localByHash.set(hash, []);
    localByHash.get(hash)!.push(entry);
  }
  for (const [hash, entries] of localByHash.entries()) {
    fixtures.set(hash, entries); // full replace — variant wins over base
  }

  return fixtures;
}

/**
 * Creates a replay proxy that serves responses from previously recorded
 * fixture files. No real API calls are made.
 *
 * Matching strategy:
 * 1. Compute hash of incoming (httpMethod + path + query + body)
 * 2. Look up the fixture entries for that hash
 * 3. Return the next response in sequence (supports repeated identical calls)
 * 4. If no match, also try a legacy JSON-RPC lookup (method + params hash)
 * 5. If still no match, return a 404-like JSON-RPC error so callers see
 *    a clear signal rather than a hang
 */
export async function createReplayProxy(
  testName: string,
  options: {
    port?: number;
  } = {}
): Promise<IFixtureProxyHandle> {
  const { port = 8200 } = options;

  const fixtureDir = getFixtureDir(testName);

  if (!fs.existsSync(path.join(fixtureDir, '_index.json'))) {
    throw new Error(
      `No fixtures found for test "${testName}" at ${fixtureDir}. ` +
        `Run the test in record mode first.`
    );
  }

  const fixtures = loadFixtures(fixtureDir);
  const callCounters = new Map<string, number>();
  let servedCount = 0;
  let missCount = 0;

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ limit: '10mb', type: ['text/*'] }));

  app.get('/_status', (_req, res) => {
    res.json({
      status: 'fixture-proxy-replay',
      testName,
      served: servedCount,
      misses: missCount
    });
  });

  app.use((req, res) => {
    const httpMethod = req.method;
    const requestPath = req.path;
    const query = req.query as Record<string, unknown>;
    const reqBody =
      httpMethod === 'GET' || httpMethod === 'HEAD'
        ? undefined
        : typeof req.body === 'object' && req.body !== null && Object.keys(req.body).length === 0
          ? undefined
          : req.body;

    const jsonRpc = extractJsonRpc(reqBody);
    const label = jsonRpc?.method || `${httpMethod} ${requestPath}`;

    const requestHash = computeRequestHash(httpMethod, requestPath, query, reqBody);
    let entries = fixtures.get(requestHash);

    // Legacy fallback: if nothing found, try JSON-RPC params hash
    if ((!entries || entries.length === 0) && jsonRpc) {
      const legacyHash = computeParamsHash(jsonRpc.method, jsonRpc.params);
      entries = fixtures.get(legacyHash);
    }

    if (!entries || entries.length === 0) {
      missCount++;
      console.warn(
        `[fixture-proxy:replay] MISS — no fixture for ${label} (hash: ${requestHash})`
      );
      res.status(200).json({
        id: (reqBody as { id?: unknown })?.id ?? 0,
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `No recorded fixture for ${label}`
        }
      });
      return;
    }

    const callIndex = callCounters.get(requestHash) ?? 0;
    // Use modulo to cycle if more calls than recorded (e.g. polling)
    const entry = entries[callIndex % entries.length];
    callCounters.set(requestHash, callIndex + 1);
    servedCount++;

    console.log(
      `[fixture-proxy:replay] ${label} → fixture #${(callIndex % entries.length) + 1}/${entries.length}`
    );

    const status = entry.responseStatus ?? 200;
    const contentType = entry.responseContentType ?? 'application/json';
    res.setHeader('content-type', contentType);
    if (typeof entry.response === 'string') {
      res.status(status).send(entry.response);
    } else {
      res.status(status).json(entry.response);
    }
  });

  let server: Server;
  await new Promise<void>((resolve, reject) => {
    server = app.listen(port, (error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  const totalEntries = Array.from(fixtures.values()).reduce((sum, arr) => sum + arr.length, 0);
  console.log(
    `[fixture-proxy:replay] Test "${testName}" — serving ${totalEntries} fixtures from ${fixtureDir}`
  );

  return {
    close: async () => {
      console.log(
        `[fixture-proxy:replay] Done — served ${servedCount}, misses ${missCount}`
      );
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    port,
    url: `http://localhost:${port}`,
    fixtureDir,
    mode: 'replay'
  };
}
