import type { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { hiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import pLimit from 'p-limit';

let chain: TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>> | undefined = undefined;

// Serialize access to wax chain instance to prevent WASM memory corruption
// from concurrent calls. WASM modules are not thread-safe, and concurrent
// access (e.g., from Next.js Server Components) can cause "memory access
// out of bounds" errors.
const wasmLock = pLimit(1);

export async function getChain() {
  return wasmLock(async () => {
    if (!chain) {
      const rawChain = await hiveChainService.getHiveChain();
      chain = wrapChainWithLogging(rawChain);
    }
    return chain;
  });
}
