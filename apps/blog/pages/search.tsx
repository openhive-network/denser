import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../lib/get-translations';
import { useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import PostList from '../components/post-list';
import { getSimilarPosts } from '@transaction/lib/bridge';
import AISearchInput from '../components/ai-search-input';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

export default function SearchPage() {
  const router = useRouter();
  const query = router.query.q as string;

  const { data, isLoading } = useQuery(['posts', query], () => getSimilarPosts(query), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    enabled: !!router.query.q
  });

  return (
    <div className="flex flex-col gap-12 px-4 py-8">
      <div className="flex flex-col gap-4 lg:hidden">
        <AISearchInput />
      </div>
      {!query ? null : isLoading ? <Loading loading={isLoading} /> : data ? <PostList data={data} /> : null}
    </div>
  );
}
