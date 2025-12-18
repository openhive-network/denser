import { getChain, reuseHiveChain, HiveChain, setAiEndpoint, setRpcEndpoint } from "@hive/common-hiveio-packages";

export type { HiveChain };

export class HiveChainService {
  public getHiveChain(): Promise<HiveChain> {
    return getChain();
  }

  public reuseHiveChain(): HiveChain | undefined {
    return reuseHiveChain();
  }

  public async setHiveChainEndpoint(newEndpoint: string) {
    setRpcEndpoint(newEndpoint);
  }

  public async setAiSearchEndpoint(newEndpoint: string) {
    setAiEndpoint(newEndpoint);
  }
}

// Factory function for SSR-safe HiveChainService instantiation
let _hiveChainServiceInstance: HiveChainService | undefined;

/**
 * Get or create HiveChainService instance.
 * SSR-safe: Creates instance with appropriate storage based on environment.
 *
 * @returns HiveChainService instance
 */
export function getHiveChainService(): HiveChainService {
  if (!_hiveChainServiceInstance) {
    _hiveChainServiceInstance = new HiveChainService();
  }

  return _hiveChainServiceInstance;
}

// Backward compatibility via Proxy - allows existing code to continue using hiveChainService
// The Proxy lazily initializes the service when any property is accessed
export const hiveChainService = new Proxy({} as HiveChainService, {
  get(_target, prop) {
    const instance = getHiveChainService();
    return instance[prop as keyof HiveChainService];
  }
});
