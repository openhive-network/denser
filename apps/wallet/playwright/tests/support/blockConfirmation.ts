import type { Page, Route } from '@playwright/test';
import { FIXTURE_API_PORT } from './apiStub';
import { BROADCAST_METHODS } from './broadcastInterceptor';

/** Where the synthetic chain's head starts once a transaction is broadcast. */
const FIRST_BLOCK_NUM = 100_000_000;

/** 40-hex block id derived from the block number, as the chain's ids lead with it. */
const blockId = (blockNum: number) => blockNum.toString(16).padStart(8, '0') + 'deadbeef'.repeat(4);

const chainTime = () => new Date().toISOString().replace(/\.\d+Z$/, '');

const fulfillResult = (route: Route, id: unknown, result: unknown) =>
  route.fulfill({ json: { jsonrpc: '2.0', id: id ?? 1, result } });

/**
 * Has the stub node include each broadcast transaction in a block, so an observed broadcast
 * (WorkerBee watching for it) resolves and the operation's success path runs. Once a transaction
 * is broadcast, every `get_dynamic_global_properties` reports a new head block and every block
 * read answers a block holding that transaction. Call after `installBroadcastInterceptor`: this
 * route runs first and hands the broadcast itself on to the interceptor.
 */
export async function confirmBroadcastsInBlocks(page: Page): Promise<void> {
  const { createHiveChain } = await import('@hiveio/wax');
  const chain = await createHiveChain();
  let captured: { trx: unknown; id: string } | null = null;
  let headBlockNum = FIRST_BLOCK_NUM;

  const block = (blockNum: number) => ({
    previous: blockId(blockNum - 1),
    timestamp: chainTime(),
    witness: 'stub-witness',
    transaction_merkle_root: '0'.repeat(40),
    extensions: [],
    witness_signature: '20' + '0'.repeat(128),
    transactions: captured ? [captured.trx] : [],
    block_id: blockId(blockNum),
    signing_key: 'STM7zmnfQpukRrPv2v3kRH7DcYPSBeUzEuzwhJBcb7P3oV1jvDEdb',
    transaction_ids: captured ? [captured.id] : []
  });

  await page.route(
    (url) => url.hostname === '127.0.0.1' && url.port === String(FIXTURE_API_PORT),
    async (route) => {
      const body: { method?: string; params?: Record<string, unknown>; id?: unknown } | null =
        route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      const method = body?.method ?? '';
      if (BROADCAST_METHODS.has(method)) {
        const trx = JSON.stringify(body?.params?.trx);
        captured = { trx: body?.params?.trx, id: chain.createTransactionFromJson(trx).id };
        return route.fallback();
      }
      if (!captured) return route.fallback();
      if (method === 'database_api.get_dynamic_global_properties') {
        headBlockNum += 1;
        const upstream = await route.fetch();
        const { result } = await upstream.json();
        return fulfillResult(route, body?.id, {
          ...result,
          head_block_number: headBlockNum,
          head_block_id: blockId(headBlockNum),
          last_irreversible_block_num: headBlockNum - 20,
          time: chainTime()
        });
      }
      if (method === 'block_api.get_block') {
        const blockNum = Number(body?.params?.block_num ?? headBlockNum);
        return fulfillResult(route, body?.id, { block: block(blockNum) });
      }
      if (method === 'block_api.get_block_range') {
        const blockNum = Number(body?.params?.starting_block_num ?? headBlockNum);
        return fulfillResult(route, body?.id, { blocks: [block(blockNum)] });
      }
      return route.fallback();
    }
  );
}
