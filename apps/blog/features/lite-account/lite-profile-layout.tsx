'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { ILiteProfile } from '@hive/common-hiveio-packages/wax';
import { Icons } from '@hive/ui/components/icons';
import { formatMonthYear } from '@ui/lib/month-year';
import UserAvatar from '@/blog/features/post-rendering/user-avatar';
import ListItem from '@/blog/features/layouts/user-profile/list-item';
import { useTranslation } from '@/blog/i18n/client';
import LiteDidBadge from './lite-did-badge';
import { authorDisplayName } from './lite-did';

/** The tabs the lite API serves: `lite.get_account_posts` sorts, each one a profile sub-route. */
const LITE_PROFILE_TABS = ['posts', 'comments', 'replies'] as const;

/**
 * A lite account's profile: its card (name, badge, joined date, post count) and the tabs of its
 * posts, comments and replies. No follows, mutes or wallet: a lite account has none of them.
 */
export default function LiteProfileLayout({ profile, children }: { profile: ILiteProfile; children: ReactNode }) {
  const { t, i18n } = useTranslation('common_blog');
  const pathname = usePathname();
  const currentTab = pathname?.slice(pathname.lastIndexOf('/') + 1);
  const did = profile.name;
  const labels: Record<(typeof LITE_PROFILE_TABS)[number], string> = {
    posts: t('lite_account.profile.tabs.posts'),
    comments: t('lite_account.profile.tabs.comments'),
    replies: t('lite_account.profile.tabs.replies')
  };

  return (
    <div>
      <div className="w-full bg-slate-800 px-4 py-8 text-sm leading-6 text-white" data-testid="profile-info">
        <div
          className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl bg-black/30 p-6 sm:flex-row sm:items-start sm:p-8"
          data-testid="lite-profile-card"
        >
          <UserAvatar username={did} size="xLarge" className="mr-0 h-20 w-20 shrink-0 ring-4 ring-white/30 sm:h-24 sm:w-24" />
          <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold sm:text-3xl" translate="no" data-testid="profile-name">
                {authorDisplayName(did)}
              </h1>
              <LiteDidBadge />
            </div>
            <p className="mt-1 text-white/80" data-testid="lite-profile-kind">
              {t('lite_account.profile.kind')}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/70 sm:justify-start sm:text-sm">
              <div className="flex items-center gap-1">
                <Icons.calendarHeart className="h-4 w-4" />
                <span data-testid="user-joined">
                  {t('user_profile.joined_date', { date: formatMonthYear(profile.created, i18n.language) })}
                </span>
              </div>
              <span>
                <span className="font-semibold text-white" data-testid="lite-profile-post-count">
                  {profile.post_count}
                </span>{' '}
                {t('user_profile.lists.posts_label')}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col pb-8 md:pb-4">
        <div className="bg-gray-700" data-testid="profile-navigation">
          <div className="container mx-auto max-w-screen-xl px-0 sm:px-8">
            <nav className="overflow-x-auto">
              <ul className="flex gap-1 text-white sm:gap-2">
                {LITE_PROFILE_TABS.map((tab) => (
                  <ListItem
                    key={tab}
                    href={`/@${did}/${tab}`}
                    currentTab={currentTab === tab}
                    label={labels[tab]}
                  />
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
