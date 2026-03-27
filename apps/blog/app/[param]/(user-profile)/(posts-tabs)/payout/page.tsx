import PostsPage from '@/blog/features/account-profile/posts-page';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import Content from './content';

const query = 'payout';

const Page = ({ params }: { params: { param: string } }) => {
  if (!extractUsernameFromParam(params.param)) notFound();

  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};
export default Page;
