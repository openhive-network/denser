import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import type { Server } from 'http';

export interface IRecordedEntry {
  index: number;
  method: string;
  request: {
    id: number;
    jsonrpc: string;
    method: string;
    params: Record<string, unknown>;
  };
  response: Record<string, unknown>;
  timestamp: string;
  durationMs: number;
}

export interface IRecordingProxyHandle {
  close: () => Promise<void>;
  port: number;
  url: string;
  outputDir: string;
  recordedCount: () => number;
}

/**
 * Creates an Express-based recording proxy that forwards all JSON-RPC requests
 * to a real Hive API and saves each request/response pair as a separate JSON file.
 *
 * Each run uses a timestamped subdirectory so previous data is never overwritten.
 *
 * Uses native fetch() for proxying (simple and reliable).
 */
export async function createRecordingProxy(
  target: string = 'api.hive.blog',
  port: number = 8200,
  baseDir?: string
): Promise<IRecordingProxyHandle> {
  const resolvedBaseDir =
    baseDir ?? path.resolve(__dirname, '..', '..', '..', 'recorded-api-data');

  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(resolvedBaseDir, `run-${runId}`);
  fs.mkdirSync(outputDir, { recursive: true });

  let entryIndex = 0;
  const methodCounts = new Map<string, number>();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/', (_req, res) => {
    res.json({
      status: 'recording-proxy',
      totalRequests: entryIndex,
      methods: methodCounts.size,
      outputDir
    });
  });

  // Proxy + record all POST requests
  app.post('/', async (req, res) => {
    const startTime = Date.now();
    const body = req.body;
    const rpcMethod =
      typeof body === 'object' && typeof body.method === 'string'
        ? body.method
        : '_unknown';

    const targetUrl = `https://${target}`;

    try {
      const proxyResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const responseBody = await proxyResponse.json();
      const durationMs = Date.now() - startTime;

      // Record to file immediately
      entryIndex++;
      methodCounts.set(rpcMethod, (methodCounts.get(rpcMethod) ?? 0) + 1);

      const paddedIndex = String(entryIndex).padStart(4, '0');
      const safeMethod = rpcMethod.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${paddedIndex}-${safeMethod}.json`;

      const entry: IRecordedEntry = {
        index: entryIndex,
        method: rpcMethod,
        request: {
          id: body.id,
          jsonrpc: body.jsonrpc,
          method: body.method,
          params: body.params ?? {}
        },
        response: responseBody as Record<string, unknown>,
        timestamp: new Date().toISOString(),
        durationMs
      };

      fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(entry, null, 2));

      // Forward response to client
      res.status(proxyResponse.status).json(responseBody);

      if (entryIndex % 100 === 0) {
        console.log(`[recording-proxy] ${entryIndex} requests recorded...`);
      }
    } catch (err) {
      console.error(`[recording-proxy] Error proxying ${rpcMethod}:`, err);
      res.status(502).json({ error: 'Proxy error', details: String(err) });
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
    `[recording-proxy] Running on port ${port}, recording to ${outputDir}, proxying to ${target}`
  );

  return {
    close: () => {
      // Write summary
      const methodStats: Record<string, number> = {};
      for (const [m, c] of methodCounts.entries()) {
        methodStats[m] = c;
      }
      fs.writeFileSync(
        path.join(outputDir, '_index.json'),
        JSON.stringify(
          {
            recordedAt: new Date().toISOString(),
            totalRequests: entryIndex,
            totalMethods: methodCounts.size,
            methods: methodStats
          },
          null,
          2
        )
      );
      console.log(
        `[recording-proxy] Summary: ${entryIndex} requests across ${methodCounts.size} methods`
      );

      return new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    port,
    url: `http://localhost:${port}`,
    outputDir,
    recordedCount: () => entryIndex
  };
}
