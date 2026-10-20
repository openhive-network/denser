import { Metadata } from 'next';
import Content from './content';
import PostsPage from '@/blog/features/account-profile/posts-page';
import { profileCanonical } from '@/blog/lib/profile-canonical';
import { extractUsernameFromParam, isUsernameValid } from '@/blog/utils/validate-links';
import { notFound, redirect } from 'next/navigation';
import { postAuthorKind } from '@/blog/features/lite-account/lite-did';

const query = 'blog';

// Not in the profile layout: its metadata is inherited by every profile sub-route.
export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  return { alternates: profileCanonical(params.param) };
}

const Page = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();
  // A lite account has no blog (reblogs): its profile opens on its posts.
  if (postAuthorKind(username) === 'lite') redirect(`/@${username}/posts`);

  const valid = await isUsernameValid(username);
  if (!valid) notFound();

  return (
    <PostsPage param={params.param} query={query}>
      <Content />
    </PostsPage>
  );
};

export default Page;
