'use client';

import { useQuery } from '@tanstack/react-query';
import { getPost } from '@transaction/lib/bridge-api';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

const RedirectContent = () => {
  const params = useParams<{ param: string; p2: string }>();
  const username = params?.param.replace('%40', '');

  const { data } = useQuery({
    queryKey: ['postData', username, params?.p2],
    queryFn: () => getPost(username, String(params?.p2))
  });

  const url = `/${data?.category ?? data?.community}/@${data?.author}/${data?.permlink}`;

  useEffect(() => {
    if (url) {
      window.location.href = url;
    }
  }, [url]);
  return (
    <div className="flex items-center justify-center py-12">
      Redirecting to post:
      <a className="ml-1 text-destructive" href={url}>
        {url}
      </a>
    </div>
  );
};

export default RedirectContent;
