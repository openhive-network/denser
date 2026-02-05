import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { notFound } from 'next/navigation';
import { getPostCached } from '@/blog/lib/cached-api';
import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { isValidUserParam } from '@/blog/utils/validate-links';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export async function generateMetadata({
  params
}: {
  params: { param: string; p2: string; permlink: string };
}): Promise<Metadata> {
  // p2 should start with @ or %40 for valid post URLs - skip metadata fetch for invalid URLs
  if (!isValidUserParam(params?.p2)) {
    return {
      title: 'Not Found',
      description: 'Page not found'
    };
  }
  const author = params.p2.replace('%40', '').replace('@', '');
  const permlink = params?.permlink;
  const observer = await getObserverFromCookies();

  try {
    // Use cached version - deduplicated with page's prefetch within the same request
    const post = await getPostCached(author, permlink, observer);

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
    logger.error(error, 'Error in generateMetadata');
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

export default async function Layout({
  children,
  params
}: PropsWithChildren<{ params: { param: string; p2: string; permlink: string } }>) {
  // Validate p2 param - must start with @ or %40 for valid post URLs
  if (!isValidUserParam(params?.p2)) {
    notFound();
  }

  return <>{children}</>;
}
