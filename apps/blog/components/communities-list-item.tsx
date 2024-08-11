import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@hive/ui/components/card';
import Link from 'next/link';
import type { Community } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import SubscribeCommunity from './subscribe-community';
import { useEffect, useState } from 'react';

const CommunitiesListItem = ({ community }: { community: Community }) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [isSubscribed, setIsSubscribed] = useState(() => community.context.subscribed);
  useEffect(() => {
    setIsSubscribed(community.context.subscribed);
  }, [community.context.subscribed]);
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
            {community.subscribers} {t('communities.subscribers')} <span className="mx-1">•</span>{' '}
            {community.num_authors} {t('communities.authors')} <span className="mx-1">•</span>
            {community.num_pending} {t('communities.posts')}
          </p>
          {community.admins && community.admins?.length > 0 ? (
            <p className="text-sm font-medium text-primary/80">
              <span>{community.admins?.length > 1 ? t('communities.admins') : t('communities.admin')}: </span>
              {community.admins.map((admin: string, index: number) => (
                <span key={index} className="text-destructive">
                  <Link href={`@${admin}`}>{admin}</Link>{' '}
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
        <SubscribeCommunity
          user={user}
          community={community.name}
          isSubscribed={isSubscribed}
          onIsSubscribed={(e) => setIsSubscribed(e)}
        />
      </div>
    </Card>
  );
};

export default CommunitiesListItem;
