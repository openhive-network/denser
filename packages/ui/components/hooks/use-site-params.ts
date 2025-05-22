import * as React from 'react';
import { useRouter } from 'next/router';

interface SiteParams {
  sort: string;
  username: string;
  community?: string | null;
  permlink?: string | null;
  tag?: string;
}

const validSorts = ['trending', 'hot', 'created', 'payout', 'muted'] as const;
type ValidSort = typeof validSorts[number];

function useSiteParams() {
  const router = useRouter();

  // Get the first param from the URL
  const param = router.query?.param
    ? typeof router.query?.param === 'string'
      ? router.query.param
      : Array.isArray(router.query?.param)
      ? router.query.param[0]
      : ''
    : '';

  // Get the tag from the URL
  const tag = router.query?.param
    ? typeof router.query?.param === 'string'
      ? router.query.param
      : Array.isArray(router.query?.param)
      ? router.query.param[1]
      : ''
    : '';

  // Determine the current state based on URL parameters
  const state = React.useMemo(() => {
    const baseState = {
      sort: 'trending' as ValidSort,
      username: '',
      community: null as string | null,
      permlink: null as string | null,
      tag: ''
    };

    if (!param) return baseState;

    if (param.startsWith('@')) {
      return {
        ...baseState,
        sort: 'trending',
        username: param.slice(1),
        tag
      };
    }

    if (param.startsWith('hive-') && typeof router.query === 'object') {
      return {
        ...baseState,
        sort: 'trending',
        username: String(router.query?.p2 || '').slice(1),
        community: param,
        permlink: String(router.query?.permlink || ''),
        tag
      };
    }

    // If param is a valid sort value, use it
    if (validSorts.includes(param as ValidSort)) {
      return {
        ...baseState,
        sort: param as ValidSort,
        tag
      };
    }

    // Default to trending if no valid sort is found
    return {
      ...baseState,
      tag
    };
  }, [param, router.query, tag]);

  return state;
}

export { useSiteParams };
