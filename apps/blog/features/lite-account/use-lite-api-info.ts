'use client';

import { useQuery } from '@tanstack/react-query';
import { getReadChain } from '@transaction/lib/chain';
import { getLiteApiInfo, LITE_PROBE_TTL_MS, type TPostsNamespace } from '@transaction/lib/lite-api';

/** `lite.get_info` of the API node reads go to: null while unknown or when it is not lite-aware. */
export function useLiteApiInfo() {
  const endpoint = getReadChain().endpointUrl;
  return useQuery({
    queryKey: ['liteApiInfo', endpoint],
    queryFn: getLiteApiInfo,
    staleTime: LITE_PROBE_TTL_MS,
    retry: false
  });
}

/**
 * The namespace post reads of the current node go to, for their query keys: `bridge` until the
 * probe has answered, so a node without lite support keeps the keys and reads it always had.
 */
export function usePostsNamespace(): TPostsNamespace {
  const { data } = useLiteApiInfo();
  return data ? 'lite' : 'bridge';
}
