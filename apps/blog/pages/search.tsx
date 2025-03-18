import { Input } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { useRouter } from 'next/router';
import { useState, KeyboardEvent } from 'react';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../lib/get-translations';
import { useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import PostList from '../components/post-list';
import { getSimilarPosts } from '@transaction/lib/bridge';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

export default function SearchPage() {
  const router = useRouter();
  const [value, setValues] = useState((router.query.q as string) ?? '');
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      router.push(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  const { data, isLoading } = useQuery(['posts', router.query.q as string], () =>
    getSimilarPosts(router.query.q as string)
  );

  return (
    <div className="flex flex-col gap-12 px-4 py-8">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icons.search className="h-5 w-5 rotate-90" />
          </div>
          <Input
            type="search"
            className="block rounded-full p-4 pl-10 text-sm "
            placeholder="Search..."
            value={value}
            onChange={(e) => setValues(e.target.value)}
            onKeyDown={(e) => handleEnter(e)}
          />
        </div>
      </div>

      {isLoading ? <Loading loading={isLoading} /> : data ? <PostList data={data} /> : null}
    </div>
  );
}
