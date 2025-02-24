import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { type Subscription, getCommunities } from '@transaction/lib/bridge';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';

export function CommunitiesSelect({
  title,
  mySubsData,
  username
}: {
  title: string;
  mySubsData: Subscription[] | null | undefined;
  username?: string;
}) {
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const sort = 'rank';
  const query = null;
  const { isLoading, error, data } = useQuery(['communitiesList', sort, query], () =>
    getCommunities(sort, query)
  );

  const filteredCommunity = data
    ?.slice(0, 12)
    .filter((c) => !mySubsData?.map((my) => my[0]).includes(c.name));

  if (isLoading) return <p>{t('global.loading')}...</p>;
  return (
    <Select
      onValueChange={(e) => {
        e === 'communities' ? router.push('communities') : router.push(`/trending/${e}`);
      }}
    >
      <SelectTrigger className="bg-white dark:bg-background/95 dark:text-white">
        <SelectValue placeholder={title} />
      </SelectTrigger>
      <SelectContent
      className="overflow-y-auto max-h-96"
        ref={(ref) => {
          if (!ref) return;
          ref.ontouchstart = (e) => {
            e.preventDefault();
          };
        }}
      >
        <SelectGroup>
          <SelectItem value="/">{t('navigation.communities_nav.all_posts')}</SelectItem>
        </SelectGroup>
        {username && (
          <SelectGroup>
            <SelectItem value={`../@${username}/feed`}>My friends</SelectItem>
            <SelectItem value={`../trending/my`}>My communities</SelectItem>
            {mySubsData && mySubsData.length > 0 ? (
              <SelectItem disabled value="my-communities" className="text-slate-400">
                My communities
              </SelectItem>
            ) : null}
            {mySubsData && mySubsData.length > 0
              ? mySubsData?.map((e) => (
                  <SelectItem key={e[0]} value={e[0]}>
                    {e[1]}
                  </SelectItem>
                ))
              : null}
          </SelectGroup>
        )}
        <SelectGroup>
          <SelectItem disabled value="trending-communities" className="text-slate-400">
            {t('navigation.communities_nav.trending_communities')}
          </SelectItem>
          {user && user.isLoggedIn
            ? filteredCommunity?.slice(0, 12).map((community) => (
                <SelectItem key={community.id} value={community.name}>
                  {community.title}
                </SelectItem>
              ))
            : data?.slice(0, 12).map((community) => (
                <SelectItem key={community.id} value={community.name}>
                  {community.title}
                </SelectItem>
              ))}
          <SelectItem value="communities">{t('navigation.communities_nav.explore_communities')}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
