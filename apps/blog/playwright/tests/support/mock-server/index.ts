/**
 * Hive API Mock Server for Playwright E2E tests.
 *
 * Provides an Express-based proxy server that intercepts specific JSON-RPC
 * calls and returns mock responses, while transparently proxying all other
 * requests to a real Hive API node.
 *
 * Features:
 * - Selective mocking: only intercept the API calls you register
 * - Transparent proxy fallback: unmocked calls go to the real API
 * - Transaction capture: all broadcast_transaction calls are stored
 *   for test assertions via TransactionStore
 * - Custom mock data: extend mock-data/index.ts or pass your own handlers
 *
 * @example Basic usage in a Playwright test:
 * ```ts
 * import { setupMockServer, defaultMockData } from '../support/mock-server';
 * import { JsonRpcMock } from '../support/mock-server/api-mock';
 *
 * let mockServer: Awaited<ReturnType<typeof setupMockServer>>;
 *
 * test.beforeAll(async () => {
 *   mockServer = await setupMockServer();
 * });
 *
 * test.afterAll(async () => {
 *   await mockServer.close();
 * });
 *
 * test('example', async ({ page }) => {
 *   // Use mockServer.url as API endpoint
 *   // Check mockServer.transactionStore for broadcasted txs
 * });
 * ```
 */
export { AProxyMockResolver, JsonRpcMock, type IJsonRpcMockData, type IJsonRpcResponse } from './api-mock';
export { createMockServer, type IMockServerHandle } from './proxy-mock-server';
export { TransactionStore, type IBroadcastedTransaction } from './transaction-store';
export { default as defaultMockData } from './mock-data';
export { createRecordingProxy, type IRecordingProxyHandle, type IRecordedEntry } from './recording-proxy';
export {
  createFixtureProxy,
  createReplayProxy,
  getFixtureDir,
  hasFixtures,
  type IFixtureProxyHandle,
  type IFixtureEntry
} from './fixture-proxy';

import { JsonRpcMock } from './api-mock';
import { createMockServer, type IMockServerHandle } from './proxy-mock-server';
import { TransactionStore } from './transaction-store';
import defaultMockData from './mock-data';
import type { IJsonRpcMockData } from './api-mock';

/**
 * Convenience function to set up a mock server with default configuration.
 *
 * @param overrides - Optional mock data handlers to merge with/override defaults
 * @param port - Port to listen on (default: 8100)
 * @param target - Fallback API host for unmocked calls (default: api.hive.blog)
 */
export async function setupMockServer(
  overrides?: IJsonRpcMockData,
  port: number = 8100,
  target: string = 'api.hive.blog'
): Promise<IMockServerHandle> {
  const mockData = overrides ? { ...defaultMockData, ...overrides } : defaultMockData;
  const transactionStore = new TransactionStore();
  const mockInstance = new JsonRpcMock(mockData);

  return createMockServer(mockInstance, transactionStore, target, port);
}
