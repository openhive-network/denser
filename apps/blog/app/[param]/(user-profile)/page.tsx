import Content from './content';
import PostsPage from '@/blog/features/account-profile/posts-page';
import { extractUsernameFromParam, isUsernameValid } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';

const query = 'blog';

const Page = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  const valid = await isUsernameValid(username);
  if (!valid) notFound();

  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};

export default Page;
