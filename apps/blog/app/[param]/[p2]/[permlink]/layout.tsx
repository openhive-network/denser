import React, { PropsWithChildren } from 'react';
import { notFound } from 'next/navigation';
import { isPermlinkValid, isPostAuthorValid, isValidUserParam, postAuthorFromParam } from '@/blog/utils/validate-links';
import { getEffectiveObserverFromCookies } from '@/blog/lib/auth-utils';
import { isPostDeleted } from '@/blog/lib/deleted-post';
import DeletedPost from '@/blog/features/post-rendering/deleted-post';
import { DeletedPostNoticeProvider } from '@/blog/features/post-rendering/deleted-post-context';

// generateMetadata for this route lives in page.tsx: it must run there (with
// searchParams and before the loading boundary streams) so notFound() yields a
// real HTTP 404 - see #930.

export default async function Layout(
  props: PropsWithChildren<{ params: Promise<{ param: string; p2: string; permlink: string }> }>
) {
  const params = await props.params;

  const {
    children
  } = props;

  // Validate p2 param - must start with @ or %40 for valid post URLs
  if (!isValidUserParam(params?.p2)) {
    notFound();
  }

  // A deleted post answers 404 like a missing one (the page's notFound()), and its not-found
  // boundary says what happened to it. The post read is the page's, deduplicated by getPostCached,
  // so it is made only for the URLs the page reads a post for.
  const author = postAuthorFromParam(params.p2);
  const deletedAuthor =
    author &&
    isPermlinkValid(params.permlink) &&
    (await isPostAuthorValid(author)) &&
    (await isPostDeleted(author, params.permlink, await getEffectiveObserverFromCookies()))
      ? author
      : null;

  return (
    <DeletedPostNoticeProvider notice={deletedAuthor ? <DeletedPost author={deletedAuthor} /> : null}>
      {children}
    </DeletedPostNoticeProvider>
  );
}
