import ProfileLayout from '@/blog/components/common/profile-layout';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { useMemo, useState } from 'react';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getAccountFull } from '@transaction/lib/hive';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import { MetadataProps } from '@/blog/lib/get-translations';
import ListVariant from '../feature/account-lists/list-variant';

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
  const { user } = useUser();
  const { data: profilData } = useQuery(['profileData', username], () => getAccountFull(username));
  const [filter, setFilter] = useState('');
  const [splitArrays, setSplitArrays] = useState<IFollowList[][]>([]);

  const filteredNames = useMemo(() => {
    return data
      ?.filter((e) => e.name !== 'null')
      .filter((value: IFollowList) => {
        const searchWord = filter.toLowerCase();
        const userName = value.name.toLowerCase();
        return userName.includes(searchWord);
      });
  }, [data, filter]);

  useMemo(() => {
    if (data && filteredNames && data.length > 0) {
      const newSplitArrays = [];
      for (let i = 0; i < filteredNames.length; i += CHUNK_SIZE) {
        const chunk = filteredNames.slice(i, i + CHUNK_SIZE);
        newSplitArrays.push(chunk);
      }
      setSplitArrays(newSplitArrays);
    }
  }, [filteredNames, data]);

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
