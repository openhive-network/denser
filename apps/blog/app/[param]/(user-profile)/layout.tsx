import ProfileLayout from '@/blog/features/layouts/user-profile/profile-layout';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/blog/lib/react-query';
import { getAccountFull, getAccountReputations, getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { getTwitterInfo } from '@transaction/lib/custom-api';
import { isUsernameValid } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';


export async function generateMetadata({ params }: { params: { param: string } }): Promise<Metadata> {
  const raw = params.param;
  const username = raw.startsWith('%40') ? raw.replace('%40', '') : raw;
  const queryClient = getQueryClient();
  const account = await queryClient.fetchQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });
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
}

const Layout = async ({ children, params }: { children: ReactNode; params: { param: string } }) => {
  const queryClient = getQueryClient();
  const { param } = params;
  const username = param.startsWith('%40') ? param.replace('%40', '') : param;

  const valid = await isUsernameValid(username);
  if (!valid) {
    notFound();
  }

  await queryClient.prefetchQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });
  await queryClient.prefetchQuery({
    queryKey: ['accountReputationData', username],
    queryFn: () => getAccountReputations(username, 1)
  });
  await queryClient.prefetchQuery({
    queryKey: ['twitterData', username],
    queryFn: () => getTwitterInfo(username)
  });
  await queryClient.prefetchQuery({
    queryKey: ['dynamicGlobalData'],
    queryFn: () => getDynamicGlobalProperties()
  });
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <ProfileLayout>{children}</ProfileLayout>
    </Hydrate>
  );
};

export default Layout;
