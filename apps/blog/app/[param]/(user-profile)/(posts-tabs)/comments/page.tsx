import PostsPage from '@/blog/features/account-profile/posts-page';
import Content from './content';

const query = 'comments';

const Page = ({ params }: { params: { param: string } }) => {
  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};
export default Page;
