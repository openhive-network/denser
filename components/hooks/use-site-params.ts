import * as React from 'react';
import { useRouter } from 'next/router';

interface SiteParams {
  sort: string | null;
  username: string;
  community?: string | null;
  permlink?: string | null;
  tag?: string;
}
function useSiteParams() {
  const [state, setState] = React.useState<SiteParams>({
    sort: null,
    username: '',
    community: null,
    permlink: null
  });
  const router = useRouter();
  const param = router.query?.param
    ? typeof router.query?.param === 'string'
      ? router.query.param
      : typeof router.query?.param === 'object'
      ? router.query.param[0]
      : ''
    : '';
  const tag = router.query?.param
    ? typeof router.query?.param === 'string'
      ? router.query.param
      : typeof router.query?.param === 'object'
      ? router.query.param[1]
      : ''
    : '';

  React.useEffect(() => {
    if (param.startsWith('@')) {
      setState({ sort: null, username: param.slice(1), community: null, permlink: null });
    } else if (param.startsWith('hive-') && typeof router.query === 'object') {
      setState({
        sort: null,
        username: String(router.query?.p2).slice(1) || '',
        community: param,
        permlink: String(router.query?.permlink) || null
      });
    } else {
      setState({ sort: param, username: '', community: null, permlink: null,  tag: tag });
    }
  }, [param, router.query, tag]);

  return {
    ...state
  };
}

export { useSiteParams };
