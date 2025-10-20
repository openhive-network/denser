'use client';

import SocialActivities from '@/blog/components/social-activities';
import SubscriptionList from '@/blog/features/account-social/subscription-list';
import { useTranslation } from '@/blog/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptions } from '@transaction/lib/bridge-api';
import { getHivebuzzBadges, getPeakdBadges } from '@transaction/lib/custom-api';
import { getUserAvatarUrl } from '@ui/lib/avatar-utils';
import Link from 'next/link';

const CommunityContent = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');
  const { data } = useQuery({
    queryKey: ['listAllSubscription', username],
    queryFn: () => getSubscriptions(username)
  });

  const { data: hivebuzz } = useQuery({
    queryKey: ['hivebuzz', username],
    queryFn: () => getHivebuzzBadges(username)
  });

  const { data: peakd } = useQuery({
    queryKey: ['peakd', username],
    queryFn: () => getPeakdBadges(username),
    select: (data) =>
      data.map((e: { id: string; name: string; title: string }) => ({
        id: e.title,
        url: getUserAvatarUrl(e.name, 'medium'),
        title: e.title
      }))
  });

  return (
    <div className="flex flex-col py-8">
      <h2 className="text-xl font-semibold" data-testid="community-subscriptions-label">
        {t('user_profile.social_tab.community_subscriptions_title')}
      </h2>
      <p data-testid="community-subscriptions-description">
        {t('user_profile.social_tab.the_author_has_subscribed_to_the_following')}
      </p>
      {data && data.length > 0 ? (
        <SubscriptionList data={data} />
      ) : (
        <div
          key="empty"
          className="border-card-empty-border my-12 border-2 border-solid bg-card-noContent  px-4 py-6 text-sm"
          data-testid="user-does-not-have-any-subscriptions-yet"
        >
          {t('user_profile.social_tab.you_dont_have_any_subscriptions')}
        </div>
      )}
      <h2 className="text-xl font-semibold" data-testid="badges-achievements-label">
        {t('user_profile.social_tab.badges_and_achievements_title')}
      </h2>
      <p data-testid="badges-achievements-description">
        {t('user_profile.social_tab.these_are_badges_received_by_the_author')}
        <Link href="https://peakd.com/" className="text-destructive hover:underline" target="_blank">
          Peakd
        </Link>
        {` & `}
        <Link href="https://hivebuzz.me/" className="text-destructive hover:underline" target="_blank">
          Hivebuzz
        </Link>
        .
      </p>

      <SocialActivities data={hivebuzz ?? []} peakd={peakd ?? []} username={username} />
    </div>
  );
};
export default CommunityContent;
