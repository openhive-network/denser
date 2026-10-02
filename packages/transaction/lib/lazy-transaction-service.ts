import type { TransactionService } from '../index';

type AsyncMethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => Promise<unknown> ? K : never;
}[keyof T];

/** The asynchronous operations of `TransactionService` (broadcasts, signing, chain access). */
export type LazyTransactionService = Pick<TransactionService, AsyncMethodNames<TransactionService>>;

const loadTransactionService = async (): Promise<TransactionService> => (await import('../index')).transactionService;

/**
 * Stands in for `transactionService` from `@transaction/index` in client components: that module
 * imports wax, the signers and workerbee, so this one loads it on the first call instead, when a
 * user writes to the chain. Calls go to the same singleton the signer options are set on.
 */
export const transactionService = new Proxy(
  {},
  {
    get: (_target, method) => {
      // Not a thenable: `await`ing or returning the stand-in must not call a method.
      if (typeof method === 'symbol' || method === 'then') return undefined;
      return async (...args: unknown[]) => {
        const service = await loadTransactionService();
        return Reflect.apply(Reflect.get(service, method), service, args);
      };
    }
  }
  // A Proxy hides its members from TypeScript; every async method is forwarded as typed above.
) as LazyTransactionService;
