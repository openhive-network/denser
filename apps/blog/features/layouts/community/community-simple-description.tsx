'use client';

import { Card, CardTitle } from '@ui/components/card';
import { Community, IAccountNotification } from '@hive/common-hiveio-packages/wax';
import { SubsListDialog } from './subscription-list-dialog';
import { ActivityLogDialog } from '../../activity-log/dialog';
import { useTranslation } from '@/blog/i18n/client';
import SubscribeCommunity from '../../community-profile/subscribe-community';
import NewPost from './new-post-button';
import { useEffect, useState } from 'react';
import { Badge } from '@ui/components';
import BasePathLink from '@/blog/components/base-path-link';
import EditCommunityDialog from '../../community-profile/edit-dialog';
import clsx from 'clsx';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const CommunitySimpleDescription = ({
  data,
  subs,
  notificationData,
  username,
  userSubscriptions
}: {
  data: Community;
  subs: string[][];
  notificationData: IAccountNotification[] | null | undefined;
  username: string;
  userSubscriptions?: string[][] | null;
}) => {
  const { t } = useTranslation('common_blog');
  // Determine subscription from user's subscriptions list (available immediately
  // after hydration) as a fallback when community context.subscribed is stale
  // due to SSR fetching with DEFAULT_OBSERVER instead of the logged-in user.
  const subscribedFromList = userSubscriptions?.some((sub) => sub[0] === data.name) ?? false;
  const [isSubscribed, setIsSubscribed] = useState(
    () => Boolean(data.context.subscribed) || subscribedFromList
  );
  const { user } = useUserClient();

  useEffect(() => {
    setIsSubscribed(Boolean(data.context.subscribed) || subscribedFromList);
  }, [data.context.subscribed, subscribedFromList]);

  const userRole = data.team.find((e) => e[0] === user.username);
  const userCanModerate = data.team.find((e) => e[0] === user.username);
  const adminRole = data.team.find((e) => e[0] === user.username && e[1] === 'admin');

  return (
    <Card
      className={clsx('my-4 flex h-fit w-full flex-col gap-3 p-3 text-primary dark:bg-background sm:p-4', {
        'animate-pulse': data._temporary
      })}
      data-testid="community-simple-description-sidebar"
    >
      {/* Header: Title + Action Buttons */}
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="flex flex-wrap items-center gap-1 text-base sm:text-lg">
          <span>{data.title}</span>
          {data.is_nsfw ? <Badge variant="red">NSFW</Badge> : null}
        </CardTitle>
        <div className="flex shrink-0 gap-2 [&_button]:w-auto [&_button]:whitespace-nowrap">
          <SubscribeCommunity
            user={user}
            community={data.name}
            isSubscribed={isSubscribed}
            onIsSubscribed={(e) => setIsSubscribed(e)}
            communityTitle={data.title}
            temprary={data.context._temporary}
          />
          <NewPost disabled={!isSubscribed} name={data.name} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
        <SubsListDialog
          title={data.title}
          subs={subs}
          moderateEnabled={Boolean(userCanModerate)}
          community={username}
        >
          <span data-testid="community-simple-subscribers">
            <strong>{data.subscribers}</strong> {t('communities.buttons.subscribers')}
          </span>
        </SubsListDialog>
        <span className="text-muted-foreground">•</span>
        <span data-testid="community-simple-active-posters">
          <strong>{data.num_authors}</strong> {t('communities.titles.active_posters')}
        </span>
        <span className="text-muted-foreground">•</span>
        <ActivityLogDialog username={username} data={notificationData}>
          <span className="text-destructive">{t('communities.buttons.activity_log')}</span>
        </ActivityLogDialog>
        {userRole ? (
          <>
            <span className="text-muted-foreground">•</span>
            <BasePathLink href={`/roles/${username}`} className="text-destructive">
              {t('communities.roles')}
            </BasePathLink>
          </>
        ) : null}
        {adminRole ? (
          <>
            <span className="text-muted-foreground">•</span>
            <EditCommunityDialog data={data} />
          </>
        ) : null}
      </div>

      {/* About */}
      {data.about ? <p className="text-xs text-muted-foreground sm:text-sm">{data.about}</p> : null}
    </Card>
  );
};

export default CommunitySimpleDescription;
