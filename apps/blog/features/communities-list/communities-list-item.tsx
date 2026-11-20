'use client';

import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@hive/ui/components/card';
import { Link } from '@hive/ui';
import BasePathLink from '@/blog/components/base-path-link';
import { Community } from '@hive/common-hiveio-packages/wax';
import type { TFunction } from 'i18next';
import CommunitySubscribeButton from '../community-profile/community-subscribe-button';
import type { CommunitySubscriptionState } from './use-communities-subscription';

const CommunitiesListItem = ({
  community,
  t,
  subscription,
  onSubscribeClick
}: {
  community: Community;
  t: TFunction<'common_blog'>;
  subscription: CommunitySubscriptionState;
  onSubscribeClick: (community: Community, state: CommunitySubscriptionState) => void;
}) => {
  return (
    <Card
      className={cn('hover my-4 flex justify-between bg-background text-primary')}
      data-testid="community-list-item"
    >
      <div className="w-4/6">
        <CardHeader>
          <Link
            href={`trending/${community.name}`}
            className="text-destructive"
            data-testid="community-list-item-title"
          >
            <CardTitle>{community.title}</CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="px-6">
          <p data-testid="community-list-item-about">{community.about}</p>
        </CardContent>
        <CardFooter
          className="flex flex-col items-start px-6 text-sm"
          data-testid="community-list-item-footer"
        >
          <p className="text-sm font-medium leading-5 text-primary/80">
            {/* eslint-disable-next-line @hive/i18n/no-joined-translation -- an existing fragment join, to become one key with placeholders */}
            {community.subscribers} {t('communities.subscribers')} <span className="mx-1">•</span>{' '}
            {/* eslint-disable-next-line @hive/i18n/no-joined-translation -- an existing fragment join, to become one key with placeholders */}
            {community.num_authors} {t('communities.authors')} <span className="mx-1">•</span>
            {/* eslint-disable-next-line @hive/i18n/no-joined-translation -- an existing fragment join, to become one key with placeholders */}
            {community.num_pending} {t('communities.posts')}
          </p>
          {community.admins && community.admins?.length > 0 ? (
            <p className="text-sm font-medium text-primary/80">
              <span>{community.admins?.length > 1 ? t('communities.admins') : t('communities.admin')}: </span>
              {community.admins.map((admin: string, index: number) => (
                <span key={index} className="text-destructive">
                  <BasePathLink href={`/@${admin}`}>{admin}</BasePathLink>{' '}
                  {community.admins && index !== community.admins.length - 1 ? (
                    <span className="mx-1">•</span>
                  ) : null}
                </span>
              ))}
            </p>
          ) : null}
        </CardFooter>
      </div>
      <div className="mr-4 flex w-24 items-center">
        <CommunitySubscribeButton
          t={t}
          subscribed={subscription.subscribed}
          busy={subscription.busy}
          disabled={subscription.disabled}
          retrySecondsLeft={subscription.retrySecondsLeft}
          onClick={() => onSubscribeClick(community, subscription)}
        />
      </div>
    </Card>
  );
};

export default CommunitiesListItem;
