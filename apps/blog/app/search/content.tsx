'use client';

import AccountTopicResult from '@/blog/features/search/account-topic-result';
import AIResult from '@/blog/features/search/ai-result';
import { DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useQuery } from '@tanstack/react-query';
import { getHiveSenseStatus } from '@transaction/lib/hivesense-api';
import { ModeSwitchInput } from '@ui/components/mode-switch-input';
import { SearchSort } from '@ui/hooks/use-search';
import { useLocalStorage } from 'usehooks-ts';

interface SearchContentProps {
  aiParam: string | undefined;
  classicQuery: string | undefined;
  userTopicQuery: string | undefined;
  topicQuery: string | undefined;
  sortQuery: SearchSort | undefined;
}

const SearchContent = ({
  aiParam,
  classicQuery,
  userTopicQuery,
  topicQuery,
  sortQuery
}: SearchContentProps) => {
  const { data: hiveSense } = useQuery({
    queryKey: ['hivesense-api'],
    queryFn: () => getHiveSenseStatus(),
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });
  const { user } = useUserClient();
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  return (
    <div className="m-auto flex max-w-4xl flex-col gap-12 px-4 py-8">
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <ModeSwitchInput searchPage aiAvailable={!!hiveSense} />
        </div>
      </div>
      {!!aiParam ? <AIResult query={aiParam} nsfwPreferences={preferences.nsfw} /> : null}
      {!!classicQuery && !!sortQuery ? (
        <AccountTopicResult nsfwPreferences={preferences.nsfw} query={classicQuery} sort={sortQuery} />
      ) : null}
      {!!userTopicQuery && !!topicQuery && !!sortQuery ? (
        <AccountTopicResult
          author={userTopicQuery}
          query={userTopicQuery}
          sort={sortQuery}
          nsfwPreferences={preferences.nsfw}
        />
      ) : null}
    </div>
  );
};

export default SearchContent;
