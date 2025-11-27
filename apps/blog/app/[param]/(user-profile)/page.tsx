import Content from './content';
import PostsPage from '@/blog/features/account-profile/posts-page';
import { isUsernameValid } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';


const query = 'blog';

const Page = async ({ params }: { params: { param: string } }) => {
  const raw = params.param;
  const username = raw.startsWith('%40') ? raw.replace('%40', '') : raw;

  const valid = await isUsernameValid(username);
  if (!valid) {
    notFound();
  }

  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};

export default Page;
