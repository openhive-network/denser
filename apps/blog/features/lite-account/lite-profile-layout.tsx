'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ILiteProfile } from '@hive/common-hiveio-packages/wax';
import ListItem from '@/blog/features/layouts/user-profile/list-item';
import { useTranslation } from '@/blog/i18n/client';
import LiteProfileCard from './lite-profile-card';
import LiteSecurityNotice from './lite-security-notice';
import { useLitePasskeyAccess, useLiteSecurityWarning } from './use-lite-passkey';
import { useIsLiteIdentity, useStoredLiteIdentity } from './use-stored-lite-identity';

const LiteSecureDialog = dynamic(() => import('./lite-secure-dialog'), { ssr: false });

/** The tabs every lite-aware node serves: `lite.get_account_posts` sorts, each one a profile sub-route. */
const POST_TABS = ['posts', 'comments', 'replies'] as const;
/** The tabs of a node serving the lite social graph, by sub-route; `''` is the blog (the profile's root). */
const SOCIAL_TABS = ['followers', 'followed', 'lists/muted'] as const;

type Tab = { path: string; label: string };

type TabOptions = { social: boolean; notifications: boolean; isOwner: boolean; devices: boolean };

function useTabs(did: string, { social, notifications, isOwner, devices }: TabOptions): Tab[] {
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
  const all: { segment: string; label: string }[] = [
    ...tabs,
    ...(notifications ? [{ segment: 'notifications', label: t('navigation.profile_navbar.notifications') }] : []),
    ...(devices ? [{ segment: 'devices', label: t('lite_account.profile.tabs.devices') }] : [])
  ];
  return all.map(({ segment, label }) => ({ path: segment ? `/@${did}/${segment}` : `/@${did}`, label }));
}

/**
 * A lite account's profile: its card and the tabs of its posts, comments and replies; on a node
 * serving the lite social graph also its blog (with reblogs), followers, follows and mutes, and
 * for the browser's own lite account its feed; on a node serving lite notifications its
 * notifications. Where the gateway relays authority edits, the owner
 * also gets its Devices tab and the account's security notice. No wallet: a lite account has none.
 */
export default function LiteProfileLayout({
  profile,
  social,
  notifications,
  children
}: {
  profile: ILiteProfile;
  social: boolean;
  /** Whether the node serves `lite.account_notifications`. */
  notifications: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const isOwner = useIsLiteIdentity(profile.name);
  const identity = useStoredLiteIdentity();
  const passkey = useLitePasskeyAccess().available && isOwner && !!identity?.registered;
  const warning = useLiteSecurityWarning(isOwner ? identity : null, isOwner);
  const [isSecureOpen, setIsSecureOpen] = useState(false);
  const tabs = useTabs(profile.name, { social, notifications, isOwner, devices: passkey });
  const current = decodeURIComponent(pathname).replace(/\/+$/, '');

  return (
    <div>
      <LiteProfileCard profile={profile} social={social} isOwner={isOwner} />
      {warning ? (
        <div className="container mx-auto max-w-screen-xl px-4 pb-2 sm:px-8">
          <LiteSecurityNotice warning={warning} onSecure={() => setIsSecureOpen(true)} />
        </div>
      ) : null}
      {passkey && isSecureOpen ? <LiteSecureDialog open onOpenChange={setIsSecureOpen} /> : null}
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
