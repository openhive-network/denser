import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { getCommunities } from '@/blog/lib/bridge';
import { useRouter } from 'next/router';

export function CommunitiesSelect({ username }: { username: string }) {
  const router = useRouter();
  const sort = 'rank';
  const query = null;
  const { isLoading, error, data } = useQuery(['communitiesList', sort, query], () =>
    getCommunities(sort, query)
  );

  if (isLoading) return <p>Loading...</p>;
  return (
    <Select
      onValueChange={(e) => {
        e === 'communities' ? router.push('communities') : router.push(`/trending/${e}`);
      }}
    >
      <SelectTrigger className="bg-white dark:bg-background/95 dark:text-white">
        <SelectValue placeholder={username} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="">All posts</SelectItem>
          <SelectItem disabled value="none" className="text-slate-400">
            Trending Communities
          </SelectItem>
          {data?.slice(0, 12).map((community) => (
            <SelectItem key={community.id} value={community.name}>
              {community.title}
            </SelectItem>
          ))}
          <SelectItem value="communities">Explore communities...</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
