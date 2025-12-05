import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { getPost } from '@transaction/lib/bridge-api';
import { getQueryClient } from '@/blog/lib/react-query';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export async function generateMetadata({
  params
}: {
  params: { param: string; p2: string; permlink: string };
}): Promise<Metadata> {
  const author = params?.p2?.replace('%40', '');
  const permlink = params?.permlink;
  const observer = getObserverFromCookies();

  const queryClient = getQueryClient();
  try {
    const post = await queryClient.fetchQuery({
      queryKey: ['postData', author, permlink],
      queryFn: () => getPost(author, permlink, observer)
    });

    const title = post?.title ? `${post.title} ` : 'Hive Blog';
    const description =
      post?.json_metadata?.summary ||
      post?.json_metadata?.description ||
      (post?.body ? post.body.substring(0, 160) : '');
    const image =
      post?.json_metadata?.image?.[0] ||
      post?.json_metadata?.images?.[0] ||
      'https://hive.blog/images/hive-blog-share.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [image]
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image]
      }
    };
  } catch (error) {
    logger.error('Error in generateMetadata:', error);
    return {
      title: 'Hive',
      description: 'Hive: Communities Without Borders.',
      openGraph: {
        title: 'Hive',
        description: 'Hive: Communities Without Borders.'
      }
    };
  }
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
