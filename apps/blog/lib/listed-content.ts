import dmcaList from '../../../packages/ui/config/lists/dmca-list.ts';
import dmcaUserList from '../../../packages/ui/config/lists/dmca-user-list.ts';
import gdprUserList from '../../../packages/ui/config/lists/gdpr-user-list.ts';
import userIllegalContent from '../../../packages/ui/config/lists/user-illegal-content.ts';

/** Whether the GDPR or the legal list hides the account's profile. */
export function isProfileListed(username: string): boolean {
  return gdprUserList.includes(username) || userIllegalContent.includes(username);
}

/**
 * Whether the GDPR, legal or DMCA lists hide the body of the post at `/<category>/@<author>/<permlink>`.
 * The DMCA path list holds paths in that form, without the app's base path.
 */
export function isPostListed(category: string, author: string, permlink: string): boolean {
  return (
    isProfileListed(author) || dmcaUserList.includes(author) || dmcaList.includes(`/${category}/@${author}/${permlink}`)
  );
}
