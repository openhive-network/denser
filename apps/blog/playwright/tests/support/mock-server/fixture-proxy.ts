import express from 'express';
import proxy from 'express-http-proxy';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Server } from 'http';

/**
 * A single recorded request/response pair.
 */
export interface IFixtureEntry {
  method: string;
  params: Record<string, unknown>;
  response: Record<string, unknown>;
  paramsHash: string;
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
 * Compute a stable hash for JSON-RPC method + params to uniquely
 * identify a request. Same method + same params = same hash.
 */
function computeParamsHash(method: string, params: Record<string, unknown>): string {
  const payload = JSON.stringify({ method, params });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
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
 * Creates a recording proxy that forwards all requests to the real API
 * and saves each request/response pair into a test-specific fixture directory.
 *
 * Requests are saved with a sequential index and a params hash so that
 * during replay we can match by (method + params) with a call counter
 * for repeated identical calls.
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
  const methodCounts = new Map<string, number>();
  /** Tracks which (method + params) combos have already been saved to avoid duplicates */
  const savedHashes = new Set<string>();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/', (_req, res) => {
    res.json({ status: 'fixture-proxy-record', testName, totalRequests: requestCount, savedFixtures: savedCount });
  });

  app.post('/', async (req, res) => {
    inFlightRequests++;
    const startTime = Date.now();
    const body = req.body;
    const rpcMethod =
      typeof body === 'object' && typeof body.method === 'string' ? body.method : '_unknown';
    const rpcParams = (body.params as Record<string, unknown>) ?? {};

    const targetHost = (req.headers['x-hive-target'] as string) || target;
    const targetUrl = `https://${targetHost}`;

    try {
      const proxyResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const responseBody = await proxyResponse.json();
      const durationMs = Date.now() - startTime;

      requestCount++;
      methodCounts.set(rpcMethod, (methodCounts.get(rpcMethod) ?? 0) + 1);

      const paramsHash = computeParamsHash(rpcMethod, rpcParams);
      const key = `${rpcMethod}::${paramsHash}`;

      // Only save one fixture per unique (method + params) — duplicates are skipped
      if (!savedHashes.has(key)) {
        savedHashes.add(key);
        savedCount++;

        const paddedIndex = String(savedCount).padStart(4, '0');
        const safeMethod = rpcMethod.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${paddedIndex}-${safeMethod}.json`;

        const entry: IFixtureEntry = {
          method: rpcMethod,
          params: rpcParams,
          response: responseBody as Record<string, unknown>,
          paramsHash
        };

        fs.writeFileSync(path.join(fixtureDir, filename), JSON.stringify(entry, null, 2));

        console.log(
          `[fixture-proxy:record] #${savedCount} ${rpcMethod} (${durationMs}ms) → ${filename}`
        );
      } else {
        console.log(
          `[fixture-proxy:record] ${rpcMethod} (${durationMs}ms) — duplicate, skipped`
        );
      }

      res.status(proxyResponse.status).json(responseBody);
    } catch (err) {
      console.error(`[fixture-proxy:record] Error proxying ${rpcMethod}:`, err);
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
      for (const [m, c] of methodCounts.entries()) {
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
 * Load all fixture entries from a test's fixture directory.
 * Returns them grouped by (method + paramsHash) with a call counter
 * so that repeated identical calls return sequential responses.
 */
function loadFixtures(fixtureDir: string): Map<string, IFixtureEntry[]> {
  const fixtures = new Map<string, IFixtureEntry[]>();

  const files = fs
    .readdirSync(fixtureDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort(); // sorted by index prefix

  for (const file of files) {
    const content = fs.readFileSync(path.join(fixtureDir, file), 'utf-8');
    const entry: IFixtureEntry = JSON.parse(content);
    const key = `${entry.method}::${entry.paramsHash}`;

    if (!fixtures.has(key)) {
      fixtures.set(key, []);
    }
    fixtures.get(key)!.push(entry);
  }

  return fixtures;
}

/**
 * Creates a replay proxy that serves responses from previously recorded
 * fixture files. No real API calls are made.
 *
 * Matching strategy:
 * 1. Compute hash of incoming (method + params)
 * 2. Look up the fixture entries for that hash
 * 3. Return the next response in sequence (supports repeated identical calls)
 * 4. If no fixture found, return a 404-like JSON-RPC error
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

  app.get('/', (_req, res) => {
    res.json({
      status: 'fixture-proxy-replay',
      testName,
      served: servedCount,
      misses: missCount
    });
  });

  app.post('/', (req, res) => {
    const body = req.body;
    const rpcMethod =
      typeof body === 'object' && typeof body.method === 'string' ? body.method : '_unknown';
    const rpcParams = (body.params as Record<string, unknown>) ?? {};

    const paramsHash = computeParamsHash(rpcMethod, rpcParams);
    const key = `${rpcMethod}::${paramsHash}`;

    const entries = fixtures.get(key);
    if (!entries || entries.length === 0) {
      missCount++;
      console.warn(
        `[fixture-proxy:replay] MISS — no fixture for ${rpcMethod} (hash: ${paramsHash})`
      );
      res.status(200).json({
        id: body.id ?? 0,
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: `No recorded fixture for method "${rpcMethod}" with these params`
        }
      });
      return;
    }

    const callIndex = callCounters.get(key) ?? 0;
    // Use modulo to cycle if more calls than recorded (e.g. polling)
    const entry = entries[callIndex % entries.length];
    callCounters.set(key, callIndex + 1);
    servedCount++;

    console.log(
      `[fixture-proxy:replay] ${rpcMethod} → fixture #${callIndex + 1}/${entries.length}`
    );

    res.status(200).json(entry.response);
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
