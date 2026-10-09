import {
  getAiEndpoint,
  getApiEndpoints,
  getChain,
  reuseHiveChain,
  HiveChain,
  IApiEndpoints,
  setAiEndpoint,
  setAutoRpcEndpoint,
  setRpcEndpoint
} from "@hive/common-hiveio-packages/wax";

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

  /** Switches to `newEndpoint` for this browser session only, keeping the user's stored choice. */
  public setAutoHiveChainEndpoint(newEndpoint: string): void {
    setAutoRpcEndpoint(newEndpoint);
  }

  public async setAiSearchEndpoint(newEndpoint: string) {
    setAiEndpoint(newEndpoint);
  }

  public getAiSearchEndpoint(): string {
    return getAiEndpoint();
  }

  public getApiEndpoints(): IApiEndpoints {
    return getApiEndpoints();
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
