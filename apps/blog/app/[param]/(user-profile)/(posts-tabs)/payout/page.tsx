import PostsPage from '@/blog/features/account-profile/posts-page';
import Content from './content';

const query = 'payout';

const Page = async ({ params }: { params: Promise<{ param: string }> }) => {
  const { param } = await params;
  return (
    <PostsPage param={param} query={query}>
      <Content />
    </PostsPage>
  );
};
export default Page;
