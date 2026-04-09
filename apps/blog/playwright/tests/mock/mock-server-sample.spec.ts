import { test, expect } from '@playwright/test';
import { setupMockServer, type IMockServerHandle, type IJsonRpcMockData } from '../support/mock-server';
import sampleAccount from '../support/mock-server/mock-data/data/sample-account';
import sampleRankedPosts from '../support/mock-server/mock-data/data/sample-ranked-posts';

/**
 * Sample tests demonstrating the mock server usage.
 *
 * These tests show how to:
 * 1. Set up and tear down the mock server
 * 2. Make API calls against the mock server
 * 3. Verify mock responses
 * 4. Inspect captured broadcast transactions
 * 5. Use custom/override mock handlers
 *
 * Run with:
 *   pnpm --filter @hive/blog test:mock
 */

let mockServer: IMockServerHandle;

test.describe('Mock Server - Basic API mocking', () => {
  test.beforeAll(async () => {
    mockServer = await setupMockServer();
  });

  test.afterAll(async () => {
    await mockServer.close();
  });

  test.afterEach(() => {
    // Clear captured transactions between tests
    mockServer.transactionStore.clear();
  });

  test('should return mock data for database_api.find_accounts', async ({ request }) => {
    const response = await request.post(mockServer.url, {
      data: {
        id: 1,
        jsonrpc: '2.0',
        method: 'database_api.find_accounts',
        params: { accounts: ['gtg'] }
      }
    });

    const json = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(json).toEqual(sampleAccount);
    expect(json.result.accounts[0].name).toBe('gtg');
    expect(json.result.accounts[0].posting_json_metadata).toContain('Gandalf');
  });

  test('should return mock data for bridge.get_ranked_posts (trending)', async ({ request }) => {
    const response = await request.post(mockServer.url, {
      data: {
        id: 1,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'trending', limit: 20, tag: '', observer: '' }
      }
    });

    const json = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(json).toEqual(sampleRankedPosts);
    expect(json.result).toHaveLength(2);
    expect(json.result[0].author).toBe('gtg');
    expect(json.result[1].author).toBe('alice');
  });

  test('should proxy unmocked calls to real API', async ({ request }) => {
    // "hot" sort is not mocked - should proxy to real Hive API
    const response = await request.post(mockServer.url, {
      data: {
        id: 1,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'hot', limit: 1, tag: '', observer: '' }
      }
    });

    const json = await response.json();

    expect(response.ok()).toBeTruthy();
    // Real API returns actual posts - just verify it's a valid response
    expect(json.jsonrpc).toBe('2.0');
    expect(json.result).toBeDefined();
  });

  test('should capture broadcast transactions', async ({ request }) => {
    const sampleTrx = {
      ref_block_num: 12345,
      ref_block_prefix: 67890,
      expiration: '2030-01-01T00:00:00',
      operations: [
        {
          type: 'vote_operation',
          value: {
            voter: 'testuser',
            author: 'gtg',
            permlink: 'test-post',
            weight: 10000
          }
        }
      ],
      extensions: [],
      signatures: ['2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000']
    };

    // Initially no transactions captured
    expect(mockServer.transactionStore.count()).toBe(0);

    const response = await request.post(mockServer.url, {
      data: {
        id: 1,
        jsonrpc: '2.0',
        method: 'network_broadcast_api.broadcast_transaction',
        params: { trx: sampleTrx, max_block_age: -1 }
      }
    });

    const json = await response.json();

    // Verify successful mock response
    expect(response.ok()).toBeTruthy();
    expect(json.result).toEqual({});

    // Verify the transaction was captured
    expect(mockServer.transactionStore.count()).toBe(1);

    const captured = mockServer.transactionStore.getLast();
    expect(captured).toBeDefined();
    expect(captured!.trx).toEqual(sampleTrx);
    expect(captured!.params.max_block_age).toBe(-1);

    // Verify we can inspect individual operations
    const operations = (captured!.trx.operations as Array<Record<string, unknown>>);
    expect(operations[0]).toEqual({
      type: 'vote_operation',
      value: {
        voter: 'testuser',
        author: 'gtg',
        permlink: 'test-post',
        weight: 10000
      }
    });
  });

  test('should capture multiple broadcast transactions', async ({ request }) => {
    const makeTrx = (voter: string) => ({
      ref_block_num: 1,
      ref_block_prefix: 1,
      expiration: '2030-01-01T00:00:00',
      operations: [
        {
          type: 'vote_operation',
          value: { voter, author: 'gtg', permlink: 'test', weight: 10000 }
        }
      ],
      extensions: [],
      signatures: ['20' + '0'.repeat(128)]
    });

    // Broadcast three transactions
    for (const voter of ['alice', 'bob', 'charlie']) {
      await request.post(mockServer.url, {
        data: {
          id: 1,
          jsonrpc: '2.0',
          method: 'network_broadcast_api.broadcast_transaction',
          params: { trx: makeTrx(voter), max_block_age: -1 }
        }
      });
    }

    // All three should be captured
    expect(mockServer.transactionStore.count()).toBe(3);

    const all = mockServer.transactionStore.getAll();
    const voters = all.map((t) => {
      const ops = t.trx.operations as Array<Record<string, Record<string, string>>>;
      return ops[0].value.voter;
    });

    expect(voters).toEqual(['alice', 'bob', 'charlie']);
  });
});

test.describe('Mock Server - Custom handlers', () => {
  let customServer: IMockServerHandle;

  test.beforeAll(async () => {
    // Demonstrate overriding default mock data with custom handlers
    const customHandlers: IJsonRpcMockData = {
      'database_api.find_accounts': (params: Record<string, unknown>) => {
        const accounts = params.accounts as string[] | undefined;
        if (accounts?.[0] === 'custom-user') {
          return {
            id: 1,
            jsonrpc: '2.0',
            result: {
              accounts: [
                {
                  name: 'custom-user',
                  balance: { amount: '999999', nai: '@@000000021', precision: 3 }
                }
              ]
            }
          };
        }
        return;
      }
    };

    // Use a different port to avoid conflict
    customServer = await setupMockServer(customHandlers, 8101);
  });

  test.afterAll(async () => {
    await customServer.close();
  });

  test('should use custom handler for overridden method', async ({ request }) => {
    const response = await request.post(customServer.url, {
      data: {
        id: 1,
        jsonrpc: '2.0',
        method: 'database_api.find_accounts',
        params: { accounts: ['custom-user'] }
      }
    });

    const json = await response.json();

    expect(json.result.accounts[0].name).toBe('custom-user');
    expect(json.result.accounts[0].balance.amount).toBe('999999');
  });

  test('should fall through to proxy for non-matching params', async ({ request }) => {
    // 'custom-user' handler doesn't handle 'gtg' - falls through to proxy
    const response = await request.post(customServer.url, {
      data: {
        id: 1,
        jsonrpc: '2.0',
        method: 'database_api.find_accounts',
        params: { accounts: ['gtg'] }
      }
    });

    const json = await response.json();

    // Real API should return the actual gtg account
    expect(response.ok()).toBeTruthy();
    expect(json.jsonrpc).toBe('2.0');
    expect(json.result.accounts[0].name).toBe('gtg');
  });
});
