'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { ILiteProfile } from '@hive/common-hiveio-packages/wax';
import ListItem from '@/blog/features/layouts/user-profile/list-item';
import { useTranslation } from '@/blog/i18n/client';
import LiteProfileCard from './lite-profile-card';
import { useIsLiteIdentity } from './use-stored-lite-identity';

/** The tabs every lite-aware node serves: `lite.get_account_posts` sorts, each one a profile sub-route. */
const POST_TABS = ['posts', 'comments', 'replies'] as const;
/** The tabs of a node serving the lite social graph, by sub-route; `''` is the blog (the profile's root). */
const SOCIAL_TABS = ['followers', 'followed', 'lists/muted'] as const;

type Tab = { path: string; label: string };

function useTabs(did: string, social: boolean, isOwner: boolean): Tab[] {
  const { t } = useTranslation('common_blog');
  const posts = POST_TABS.map((tab) => ({ segment: tab, label: t(`lite_account.profile.tabs.${tab}`) }));
  const lists: Record<(typeof SOCIAL_TABS)[number], string> = {
    followers: t('user_profile.lists.followers_label'),
    followed: t('user_profile.lists.following_label'),
    'lists/muted': t('user_profile.lists.muted_users')
  };
  const tabs = social
    ? [
        { segment: '', label: t('lite_account.profile.tabs.blog') },
        ...posts,
        ...SOCIAL_TABS.map((tab) => ({ segment: tab, label: lists[tab] })),
        ...(isOwner ? [{ segment: 'feed', label: t('lite_account.profile.tabs.feed') }] : [])
      ]
    : posts;
  return tabs.map(({ segment, label }) => ({ path: segment ? `/@${did}/${segment}` : `/@${did}`, label }));
}

/**
 * A lite account's profile: its card and the tabs of its posts, comments and replies; on a node
 * serving the lite social graph also its blog (with reblogs), followers, follows and mutes, and
 * for the browser's own lite account its feed. No wallet: a lite account has none.
 */
export default function LiteProfileLayout({
  profile,
  social,
  children
}: {
  profile: ILiteProfile;
  social: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const isOwner = useIsLiteIdentity(profile.name);
  const tabs = useTabs(profile.name, social, isOwner);
  const current = decodeURIComponent(pathname).replace(/\/+$/, '');

  return (
    <div>
      <LiteProfileCard profile={profile} social={social} isOwner={isOwner} />
      <div className="flex flex-col pb-8 md:pb-4">
        <div className="bg-gray-700" data-testid="profile-navigation">
          <div className="container mx-auto max-w-screen-xl px-0 sm:px-8">
            <nav className="overflow-x-auto">
              <ul className="flex gap-1 text-white sm:gap-2">
                {tabs.map((tab) => (
                  <ListItem key={tab.path} href={tab.path} currentTab={current.endsWith(tab.path)} label={tab.label} />
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <main className="container mx-auto max-w-screen-xl pt-4">{children}</main>
      </div>
    </div>
  );
}
