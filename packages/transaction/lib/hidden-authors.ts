/**
 * Hivemind applies an observer's lists to the feeds it serves through their `observer` parameter.
 * A feed from another service takes no observer, so its reader drops the posts itself, by the same
 * lists: the observer's mutes and blacklist, and the mute lists and blacklists it follows.
 */

export interface IHiddenAuthorsApi {
  getFollowList: (
    observer: string,
    followType: 'muted' | 'blacklisted' | 'follow_muted' | 'follow_blacklist'
  ) => Promise<{ name: string }[]>;
}

/** The authors whose posts `observer` does not read. Rejects as the API calls do. */
export async function fetchHiddenAuthors(observer: string, api: IHiddenAuthorsApi): Promise<Set<string>> {
  const [muted, blacklisted, followedMuteLists, followedBlacklists] = await Promise.all([
    api.getFollowList(observer, 'muted'),
    api.getFollowList(observer, 'blacklisted'),
    api.getFollowList(observer, 'follow_muted'),
    api.getFollowList(observer, 'follow_blacklist')
  ]);
  const followedLists = await Promise.all([
    ...followedMuteLists.map((owner) => api.getFollowList(owner.name, 'muted')),
    ...followedBlacklists.map((owner) => api.getFollowList(owner.name, 'blacklisted'))
  ]);
  return new Set([muted, blacklisted, ...followedLists].flat().map((account) => account.name));
}

/** `entries` without the posts of `hiddenAuthors`. */
export function withoutHiddenAuthors<T extends { author: string }>(
  entries: readonly T[],
  hiddenAuthors: ReadonlySet<string>
): T[] {
  return entries.filter((entry) => !hiddenAuthors.has(entry.author));
}
