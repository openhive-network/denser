import PostListItem from '@/components/post-list-item';
import { GetServerSideProps } from 'next';
import { dehydrate, DehydratedState, QueryClient, useQuery, UseQueryResult } from '@tanstack/react-query';
import { FC } from 'react';
import { getPostsRanked } from '@/lib/bridge';

const HydrationExamplePage: FC = () => {
  const { isLoading, isError, error, data }: UseQueryResult = useQuery(
    ['posts'],
    () => getPostsRanked()
  );

  if (isLoading) {
    return (
      <div>
        <p>Loading...</p>
      </div>
    );
  }
  if (isError) return <p>Boom boy: Error is -- {error?.message}</p>;

  return (
    <ul>
      {data?.map((post) => (
        <li key={post.author}>
          <PostListItem post={post} />
        </li>
      ))}
    </ul>
  )
};



  export const getServerSideProps: GetServerSideProps = async (): Promise<{
    props: { dehydratedState: DehydratedState };
  }> => {
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery(['posts'], () => getPostsRanked() );
    return { props: { dehydratedState: dehydrate(queryClient) } };
  };

  export default HydrationExamplePage;
