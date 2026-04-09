import proxy from 'express-http-proxy';
import express from 'express';
import cors from 'cors';
import type { Server } from 'http';
import { AProxyMockResolver } from './api-mock';
import { TransactionStore } from './transaction-store';

export interface IMockServerHandle {
  /** Stop the mock server */
  close: () => Promise<void>;
  /** Access captured broadcast transactions */
  transactionStore: TransactionStore;
  /** The port the server is listening on */
  port: number;
  /** Base URL of the mock server (e.g. http://localhost:8100) */
  url: string;
}

/**
 * Creates an Express-based mock server that intercepts JSON-RPC calls
 * matching registered handlers and proxies everything else to a real
 * Hive API node.
 *
 * Broadcast transactions are automatically captured in a TransactionStore
 * accessible via the returned handle, regardless of whether a specific
 * mock handler exists for them.
 */
export async function createMockServer(
  mockInstance: AProxyMockResolver,
  transactionStore: TransactionStore,
  target: string = 'api.hive.blog',
  port: number = 8100
): Promise<IMockServerHandle> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Transaction capture + mock interception middleware
  app.use('/', (req, res, next) => {
    const isJsonRpc =
      req.method === 'POST' && typeof req.body === 'object' && typeof req.body.method === 'string';
    const methodStr = isJsonRpc ? ` [${req.body.method}]` : '';

    // Capture broadcast transactions regardless of mock handling
    if (isJsonRpc && req.body.method === 'network_broadcast_api.broadcast_transaction') {
      transactionStore.capture(req.body.params ?? {});
    }

    if (mockInstance.hasHandler(req)) {
      mockInstance.handle(req, res);
      res.status(200).end();
      return;
    }

    console.log(
      `[mock-server] No mock data found${methodStr} - proxying to "${(req.headers['x-hive-target'] as string) || target}"...`
    );
    next();
  });

  // Transparent proxy fallback to real API
  app.use(
    '/',
    proxy((req) => (req.headers['x-hive-target'] as string) || target, {
      https: true,
      memoizeHost: false,
      preserveHostHdr: false
    })
  );

  let server: Server;

  await new Promise<void>((resolve, reject) => {
    server = app.listen(port, (error?: Error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  console.log(`[mock-server] Running on port ${port}, proxying unmocked calls to ${target}`);

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
    transactionStore,
    port,
    url: `http://localhost:${port}`
  };
}
