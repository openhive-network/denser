import PostsPage from '@/blog/features/account-profile/posts-page';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import Content from './content';

const query = 'feed';

const Page = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  if (!extractUsernameFromParam(params.param)) notFound();

  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};
export default Page;
