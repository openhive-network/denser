import ProfileLayout from '@/blog/features/layouts/user-profile/profile-layout';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { useMemo, useState } from 'react';
import { getAccountFull } from '@transaction/lib/hive-api';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import { MetadataProps } from '@/blog/lib/get-translations';
import ListVariant from '../features/account-lists/list-variant';

const CHUNK_SIZE = 10;

export default function ProfileLists({
  username,
  variant,
  data,
  metadata
}: {
  username: string;
  variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute';
  data: IFollowList[] | undefined;
  metadata: MetadataProps;
}) {
  const { data: profilData } = useQuery(['profileData', username], () => getAccountFull(username));
  const [filter, setFilter] = useState('');

  const splitArrays = useMemo(() => {
    const filteredNames =
      data?.filter((e) => e.name !== 'null' && e.name.toLowerCase().includes(filter.toLowerCase())) ?? [];
    if (!filteredNames.length) return [];

    return Array.from({ length: Math.ceil(filteredNames.length / CHUNK_SIZE) }, (_, i) =>
      filteredNames.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    );
  }, [data, filter]);

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        {profilData && (
          <ListVariant
            variant={variant}
            username={username}
            profileData={profilData}
            data={data}
            splitArrays={splitArrays}
            onSearchChange={setFilter}
          />
        )}
      </ProfileLayout>
    </>
  );
}
