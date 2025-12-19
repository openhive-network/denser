import type { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { getHiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import pLimit from 'p-limit';
import type { HiveChain } from '@hive/common-hiveio-packages';

let chain: TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>> | undefined = undefined;

// Serialize access to wax chain instance to prevent WASM memory corruption
// from concurrent calls. WASM modules are not thread-safe, and concurrent
// access (e.g., from Next.js Server Components) can cause "memory access
// out of bounds" errors.
const wasmLock = pLimit(1);

export async function getChain(): Promise<HiveChain> {
  return wasmLock(async () => {
    if (!chain) {
      const service = getHiveChainService();
      const rawChain = await service.getHiveChain();
      chain = wrapChainWithLogging(rawChain);
    }
    return chain;
  });
}
