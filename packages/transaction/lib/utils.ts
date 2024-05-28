import getSlug from 'speakingurl';
import base58 from 'bs58';
import secureRandom from 'secure-random';
import { getPostHeader } from './bridge';
import { getLogger } from '@hive/ui/lib/logging';
import { WaxChainApiError } from '@hiveio/wax';
import { transactionService } from 'index';
const logger = getLogger('app');

export async function createPermlink(title: string, author: string) {
  let permlink;
  if (title && title.trim() !== '') {
    let s = getSlug(title.replace(/[<>]/g, ''), { truncate: 128 });
    if (s === '') {
      s = base58.encode(secureRandom.randomBuffer(4));
    }
    // only letters numbers and dashes shall survive
    s = s.toLowerCase().replace(/[^a-z0-9-]+/g, '');

    // ensure the permlink is unique
    let head;
    try {
      head = await getPostHeader(author, s);
    } catch (e) {}
    if (head && !!head.category) {
      const noise = base58.encode(secureRandom.randomBuffer(4)).toLowerCase();
      permlink = noise + '-' + s;
    } else {
      permlink = s;
    }

    // ensure permlink conforms to STEEMIT_MAX_PERMLINK_LENGTH
    if (permlink.length > 255) {
      permlink = permlink.substring(0, 255);
    }
  } else {
    permlink = Math.floor(Date.now() / 1000).toString(36);
  }

  return permlink;
}

/**
 * Return error description by trying to find a message for user in error stuff,
 * then swallow error
 *
 * @param {*} e
 * @param {{ method: string } & T} ctx
 * @returns error description
 */
export function transformError<T>(e: any, ctx?: { method: string } & T) {
  logger.error('Got error: %o on %o', e, ctx);
  const isError = (err: unknown): err is Error => err instanceof Error;
  const isWaxError = (err: unknown): err is WaxChainApiError => err instanceof WaxChainApiError;

  let description = 'Operation failed';

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

  return description;
}
