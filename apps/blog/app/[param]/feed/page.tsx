import PostsPage from '@/blog/features/account-profile/posts-page';
import { extractSocialAccountFromParam } from '@/blog/lib/hive-account-route';
import { notFound } from 'next/navigation';
import Content from './content';

const query = 'feed';

const Page = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  if (!(await extractSocialAccountFromParam(params.param))) notFound();

  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};
export default Page;
