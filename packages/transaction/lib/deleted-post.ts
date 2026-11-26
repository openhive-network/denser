import { JsonRpcApiError } from './read-client';

/** hivemind's "invalid parameters", which it answers a deleted post with and many other bad calls too. */
const INVALID_PARAMETERS_CODE = -31999;
/** hivemind's `data` for a post its author deleted, e.g. "Post lampwork/tp1622 was deleted 1 time(s)". */
const DELETED_POST_DATA = /^Post [^/\s]+\/\S+ was deleted \d+ time\(s\)$/;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Whether `error` is hivemind's answer that the post asked for (`bridge.get_post` and the like) was
 * deleted by its author: code -31999 with the "was deleted" data. A post that never existed is
 * answered -32602 "does not exist", which this is false for, as for every transport failure.
 */
export const isPostDeletedError = (error: unknown): boolean => {
  if (!(error instanceof JsonRpcApiError)) return false;
  const { response } = error;
  if (!isRecord(response) || !isRecord(response.error)) return false;
  const { code, data } = response.error;
  return code === INVALID_PARAMETERS_CODE && typeof data === 'string' && DELETED_POST_DATA.test(data);
};
