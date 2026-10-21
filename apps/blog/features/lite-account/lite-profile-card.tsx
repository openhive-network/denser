'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AccountFollowStats, ILiteProfile } from '@hive/common-hiveio-packages/wax';
import { getLiteFollowCount } from '@transaction/lib/lite-social-api';
import { Button } from '@ui/components/button';
import { Icons } from '@hive/ui/components/icons';
import { formatMonthYear } from '@ui/lib/month-year';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import UserAvatar from '@/blog/features/post-rendering/user-avatar';
import { useTranslation } from '@/blog/i18n/client';
import LiteDidBadge from './lite-did-badge';
import { authorDisplayName } from './lite-did';
import { followCountKey } from './lite-social-cache';
import LiteSocialButtons from './lite-social-buttons';
import { LITE_PROFILE_FIELDS, type LiteProfileFields } from './lite-social-state';
import LiteProfileEditDialog from './lite-profile-edit-dialog';
import { useLiteSocialAccess } from './use-lite-social-mutation';

const initialFields = (profile: ILiteProfile): LiteProfileFields => {
  const stored = profile.metadata?.profile ?? {};
  return Object.fromEntries(LITE_PROFILE_FIELDS.map((field) => [field, stored[field] ?? '']));
};

const initialCounts = (profile: ILiteProfile): AccountFollowStats => ({
  account: profile.name,
  follower_count: profile.stats?.followers ?? 0,
  following_count: profile.stats?.following ?? 0
});

/** Follower and following counts of a lite account: the profile's, then `lite.get_follow_count` (shifted by the guest's follows). */
function useLiteFollowCounts(profile: ILiteProfile, social: boolean) {
  const { data } = useQuery({
    queryKey: followCountKey(profile.name),
    queryFn: async () => (await getLiteFollowCount(profile.name)) ?? initialCounts(profile),
    initialData: initialCounts(profile),
    enabled: social
  });
  return data;
}

/**
 * The card of a lite account's profile: name, badge, its `set_profile` fields, joined date, post
 * count and, on a node serving the lite social graph, follower counts with Follow / Mute for a
 * guest acting as another lite account and Edit profile for the browser's own lite account.
 */
export default function LiteProfileCard({ profile, social, isOwner }: { profile: ILiteProfile; social: boolean; isOwner: boolean }) {
  const { t, i18n } = useTranslation('common_blog');
  const { user } = useUserClient();
  const did = profile.name;
  const counts = useLiteFollowCounts(profile, social);
  const [fields, setFields] = useState(() => initialFields(profile));
  const [editing, setEditing] = useState(false);
  const canEdit = useLiteSocialAccess('set_profile').available && isOwner;

  return (
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
          {fields.name && fields.name !== authorDisplayName(did) ? (
            <p className="font-semibold" data-testid="lite-profile-display-name">{fields.name}</p>
          ) : null}
          {fields.about ? <p className="mt-2 text-white/90" data-testid="lite-profile-about">{fields.about}</p> : null}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/70 sm:justify-start sm:text-sm">
            {fields.location ? (
              <span className="flex items-center gap-1" data-testid="lite-profile-location">
                <Icons.mapPin className="h-4 w-4" />
                {fields.location}
              </span>
            ) : null}
            {fields.website ? (
              <a href={fields.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 hover:text-white" data-testid="lite-profile-website">
                <Icons.globe2 className="h-4 w-4" />
                {fields.website}
              </a>
            ) : null}
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
            {social ? (
              <>
                <span>
                  <span className="font-semibold text-white" data-testid="lite-profile-followers">
                    {counts.follower_count}
                  </span>{' '}
                  {t('user_profile.lists.followers_label')}
                </span>
                <span>
                  <span className="font-semibold text-white" data-testid="lite-profile-following">
                    {counts.following_count}
                  </span>{' '}
                  {t('user_profile.lists.following_label')}
                </span>
              </>
            ) : null}
          </div>
          {social && !user.isLoggedIn ? (
            <div className="mt-4 flex flex-wrap gap-2 empty:hidden">
              {canEdit ? (
                <Button size="sm" variant="outlineRed" onClick={() => setEditing(true)} data-testid="lite-profile-edit">
                  {t('lite_account.profile.edit')}
                </Button>
              ) : isOwner ? null : (
                <LiteSocialButtons target={did} variant="outlineRed" fallback={null} />
              )}
            </div>
          ) : null}
        </div>
      </div>
      {canEdit ? (
        <LiteProfileEditDialog open={editing} onOpenChange={setEditing} fields={fields} onSaved={setFields} />
      ) : null}
    </div>
  );
}
