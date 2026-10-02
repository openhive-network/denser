import { Entry } from '@hive/common-hiveio-packages/wax';

function keepEntryObserverVotes(entry: Entry, observer: string): Entry {
  const trimmed = { ...entry, active_votes: entry.active_votes.filter((vote) => vote.voter === observer) };
  if (entry.original_entry) {
    trimmed.original_entry = keepEntryObserverVotes(entry.original_entry, observer);
  }
  return trimmed;
}

/**
 * Drops every vote except the observer's own from server-fetched feed entries.
 *
 * Feed cards only check `active_votes` for the viewer's vote, but the full lists make up
 * roughly half of the server HTML (they are serialized into the RSC payload), which
 * delays everything the document carries, including the LCP image.
 */
export function keepObserverVotes(entries: Entry[], observer: string): Entry[] {
  return entries.map((entry) => keepEntryObserverVotes(entry, observer));
}
