import type { Entry } from '@hive/common-hiveio-packages/wax';
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

/**
 * `entry` without its body and the metadata derived from it (description, summary, images, links),
 * marked `_bodyWithheld` so the client fetches the post when it needs the body.
 */
export function withholdBody(entry: Entry): Entry {
  const { description: _description, summary: _summary, links: _links, flow: _flow, ...jsonMetadata } =
    entry.json_metadata;
  return {
    ...entry,
    body: '',
    json_metadata: { ...jsonMetadata, image: '', images: [] },
    original_entry: undefined,
    _bodyWithheld: true
  };
}

/** `entries` with the body of the `author`/`permlink` entry withheld, as `withholdBody` does. */
export function withholdEntryBody(
  entries: Record<string, Entry>,
  author: string,
  permlink: string
): Record<string, Entry> {
  return Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => [
      key,
      entry.author === author && entry.permlink === permlink ? withholdBody(entry) : entry
    ])
  );
}
