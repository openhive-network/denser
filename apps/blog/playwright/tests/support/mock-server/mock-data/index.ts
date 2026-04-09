import type { IJsonRpcMockData } from '../api-mock';
import sampleAccount from './data/sample-account';
import sampleRankedPosts from './data/sample-ranked-posts';
import broadcastSuccess from './data/broadcast-success';

/**
 * Central mock data registry.
 *
 * Each key is a JSON-RPC method name. The handler function receives
 * the request params and returns either:
 * - An IJsonRpcResponse to serve the mock response
 * - undefined/void to fall through to the proxy (real API)
 *
 * This allows selective mocking: only the calls you care about
 * are intercepted, everything else goes to the real Hive node.
 */
const mockData: IJsonRpcMockData = {
  'database_api.find_accounts': (params: Record<string, unknown>) => {
    const accounts = params.accounts as string[] | undefined;

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) return;

    if (accounts.length === 1 && accounts[0] === 'gtg') return sampleAccount;

    // Fall through to real API for unmocked accounts
    return;
  },

  'bridge.get_ranked_posts': (params: Record<string, unknown>) => {
    const sort = params.sort as string | undefined;

    // Only mock trending sort to demonstrate selective mocking
    if (sort === 'trending') return sampleRankedPosts;

    return;
  },

  /**
   * Broadcast transaction handler.
   *
   * Always returns success. The actual transaction data is captured
   * by the TransactionStore middleware in proxy-mock-server.ts
   * regardless of this handler's response.
   */
  'network_broadcast_api.broadcast_transaction': () => {
    return broadcastSuccess;
  }
};

export default mockData;
