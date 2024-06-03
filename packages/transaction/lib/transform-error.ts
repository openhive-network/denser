import { getLogger } from '@hive/ui/lib/logging';
import { WaxChainApiError } from '@hiveio/wax';
import { transactionService } from '@hive/transaction';
const logger = getLogger('app');

/**
 * Return error description by trying to find a message for user in error stuff,
 * then swallow error
 *
 * @param {*} e
 * @param {{ method: string } & T} ctx
 * @returns error description
 */
export function transformError<T>(e: any, ctx?: { method: string } & T, defaultDescription?: string) {
  logger.error('Got error: %o on %o', e, ctx);
  const isError = (err: unknown): err is Error => err instanceof Error;
  const isWaxError = (err: unknown): err is WaxChainApiError => err instanceof WaxChainApiError;

  let description = 'Operation failed';

  if (!defaultDescription) {
    let errorDescription;
    if (isWaxError(e)) {
      const error = e as any;
      // this is temporary solution for "wait 5 minut after create another post" error
      if (error?.apiError?.code === -32003) {
        errorDescription = error?.apiError?.data?.stack[0]?.format;
      } else {
        errorDescription = error?.message ?? transactionService.errorDescription;
      }
    } else if (isError(e)) {
      errorDescription = e.message;
    } else if (typeof e === 'string') {
      errorDescription = e;
    }

    let wellKnownErrorDescription;
    for (const wked of transactionService.wellKnownErrorDescriptions) {
      if (errorDescription.includes(wked)) {
        wellKnownErrorDescription = wked;
        break;
      }
    }

    if (wellKnownErrorDescription) {
      description = wellKnownErrorDescription;
    }
  }

  return defaultDescription ?? description;
}
