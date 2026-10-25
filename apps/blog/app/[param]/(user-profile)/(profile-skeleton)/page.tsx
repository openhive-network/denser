import { Metadata } from 'next';
import Content from './content';
import PostsPage from '@/blog/features/account-profile/posts-page';
import { profileCanonical } from '@/blog/lib/profile-canonical';
import { getProfileAccount } from '@/blog/lib/profile-cache';
import { hiveTimeToIso } from '@/blog/lib/post-seo';
import { profilePageJsonLd } from '@/blog/lib/structured-data';
import { JsonLd } from '@/blog/components/json-ld';
import { extractUsernameFromParam, isUsernameValid } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';

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

  const valid = await isUsernameValid(username);
  if (!valid) notFound();

  // Deduplicated with the profile layout's read. A missing account or a failed read is the layout's
  // to answer (404 or 503), so here it only leaves the structured data out.
  const account = await getProfileAccount(username).catch(() => null);
  const profileJsonLd = account?.name
    ? profilePageJsonLd({
        username,
        name: account.profile?.name,
        about: account.profile?.about,
        image: account.profile?.profile_image,
        created: hiveTimeToIso(account.created)
      })
    : null;

  return (
    <>
      {profileJsonLd ? <JsonLd data={profileJsonLd} /> : null}
      <PostsPage param={params.param} query={query}>
        <Content />
      </PostsPage>
    </>
  );
};

export default Page;
