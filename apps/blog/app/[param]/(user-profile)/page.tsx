import Content from './content';
import PostsPage from '@/blog/features/account-profile/posts-page';

const query = 'blog';

const Page = ({ params }: { params: { param: string } }) => {
  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};

export default Page;
