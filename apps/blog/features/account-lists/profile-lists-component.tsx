'usle client';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { useMemo, useState } from 'react';
import { getAccountFull } from '@transaction/lib/hive-api';
import { useQuery } from '@tanstack/react-query';
import ListVariant from './list-variant';

const CHUNK_SIZE = 10;

export default function ProfileLists({
  username,
  variant,
  data
}: {
  username: string;
  variant: 'blacklisted' | 'muted' | 'follow_blacklist' | 'followed_muted_lists';
  data: IFollowList[] | undefined;
}) {
  const { data: profilData } = useQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });
  const [filter, setFilter] = useState('');

  const splitArrays = useMemo(() => {
    const filteredNames =
      data?.filter((e) => e.name !== 'null' && e.name.toLowerCase().includes(filter.toLowerCase())) ?? [];
    if (!filteredNames.length) return [];

    return Array.from({ length: Math.ceil(filteredNames.length / CHUNK_SIZE) }, (_, i) =>
      filteredNames.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    );
  }, [data, filter]);

  return profilData ? (
    <ListVariant
      variant={variant}
      username={username}
      profileData={profilData}
      data={data}
      splitArrays={splitArrays}
      onSearchChange={setFilter}
    />
  ) : null;
}
