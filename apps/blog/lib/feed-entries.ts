import { Entry } from '@hive/common-hiveio-packages/wax';

interface IVotedEntry {
  active_votes?: Entry['active_votes'];
  original_entry?: IVotedEntry;
}

function keepEntryObserverVotes<T extends IVotedEntry>(entry: T, observer: string): T {
  return {
    ...entry,
    ...(entry.active_votes ? { active_votes: entry.active_votes.filter((vote) => vote.voter === observer) } : {}),
    ...(entry.original_entry ? { original_entry: keepEntryObserverVotes(entry.original_entry, observer) } : {})
  };
}

/**
 * Drops every vote except the observer's own from server-fetched feed entries; a vote-free entry
 * (read from a node with hivemind's vote-free post reads) has none to drop.
 *
 * Feed cards only check `active_votes` for the viewer's vote, but the full lists make up
 * roughly half of the server HTML (they are serialized into the RSC payload), which
 * delays everything the document carries, including the LCP image.
 */
export function keepObserverVotes<T extends IVotedEntry>(entries: T[], observer: string): T[] {
  return entries.map((entry) => keepEntryObserverVotes(entry, observer));
}
