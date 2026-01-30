import ProfileLayout from '@/blog/features/layouts/user-profile/profile-layout';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/blog/lib/react-query';
import { getAccountFullCached } from '@/blog/lib/cached-api';
import { getAccountReputations, getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { getTwitterInfo, isThirdPartyApiEnabled } from '@transaction/lib/custom-api';
import { isUsernameValid } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export async function generateMetadata({
  params
}: {
  params: Promise<{ param: string }>;
}): Promise<Metadata> {
  const { param: raw } = await params;
  // Only process if it looks like a username (starts with @ or %40)
  if (!raw.startsWith('@') && !raw.startsWith('%40')) {
    return {
      title: 'Hive',
      description: 'Hive: Communities Without Borders.'
    };
  }
  const username = raw.startsWith('%40') ? raw.replace('%40', '') : raw.replace('@', '');
  try {
    // Use cached version - deduplicated with Layout's prefetch within the same request
    const account = await getAccountFullCached(username);
    const image = account?.profile?.profile_image || 'https://hive.blog/images/hive-blog-share.png';
    const about = account?.profile?.about || `Profile of @${username} on Hive.`;
    const title = `Blog ${username}`;
    return {
      title: {
        default: title,
        template: '%s - Hive'
      },
      description: about,
      openGraph: {
        title,
        description: about,
        images: [image]
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: about,
        images: [image]
      }
    };
  } catch (error) {
    logger.error(error, 'Error in generateMetadata:');
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

const Layout = async ({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ param: string }>;
}) => {
  const queryClient = getQueryClient();
  const { param } = await params;

  // Only process if it looks like a username (starts with @ or %40)
  if (!param.startsWith('@') && !param.startsWith('%40')) {
    notFound();
  }

  const username = param.startsWith('%40') ? param.replace('%40', '') : param.replace('@', '');

  const valid = await isUsernameValid(username);
  if (!valid) {
    notFound();
  }

  try {
    const prefetchPromises = [
      // Use cached version - deduplicated with generateMetadata within the same request
      queryClient.prefetchQuery({
        queryKey: ['profileData', username],
        queryFn: () => getAccountFullCached(username)
      }),
      queryClient.prefetchQuery({
        queryKey: ['accountReputationData', username],
        queryFn: () => getAccountReputations(username, 1)
      }),
      queryClient.prefetchQuery({
        queryKey: ['dynamicGlobalData'],
        queryFn: () => getDynamicGlobalProperties()
      })
    ];

    // Only prefetch Twitter data if third-party APIs are enabled
    if (isThirdPartyApiEnabled()) {
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['twitterData', username],
          queryFn: () => getTwitterInfo(username)
        })
      );
    }

    await Promise.all(prefetchPromises);
  } catch (error) {
    logger.error(error, 'Error in Layout:');
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileLayout>{children}</ProfileLayout>
    </HydrationBoundary>
  );
};

export default Layout;
