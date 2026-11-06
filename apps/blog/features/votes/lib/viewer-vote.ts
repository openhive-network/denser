import type { Entry, EntryObserverVote, IVoteListItem } from '@hive/common-hiveio-packages/wax';

type TVotedEntry = Pick<Entry, 'author' | 'permlink' | 'active_votes' | 'observer_vote' | '_observer'>;

/** The answer of `database_api.list_votes` for one voter on one post: their vote, or none. */
export interface IViewerVotes {
  votes: IVoteListItem[];
}

/** What a post entry tells of the viewer's vote, see `viewerVoteOf`. */
export type TViewerVote = { known: true; votes: IViewerVotes } | { known: false; lookUp: boolean };

const toListedVote = (post: TVotedEntry, voter: string, vote: EntryObserverVote): IVoteListItem => ({
  id: 0,
  voter,
  author: post.author,
  permlink: post.permlink,
  weight: '0',
  rshares: vote.rshares,
  vote_percent: vote.percent,
  last_update: '',
  num_changes: 0,
  _temporary: false
});

/**
 * What `post` tells of `viewer`'s vote on it. A vote-free entry read as the viewer has it
 * (`observer_vote`): `known`, in the shape `database_api.list_votes` answers, with no vote when
 * they have not voted. Otherwise it is not known and is to be looked up when `lookUp`: when the
 * entry's `active_votes` list the viewer, or when it is a vote-free entry read as another observer,
 * which says nothing of the viewer's vote. Nothing is looked up for a signed-out viewer (`''`).
 */
export function viewerVoteOf(post: TVotedEntry, viewer: string): TViewerVote {
  if (!viewer) return { known: false, lookUp: false };
  if (post.observer_vote !== undefined && post._observer === viewer) {
    const { observer_vote: vote } = post;
    return { known: true, votes: { votes: vote ? [toListedVote(post, viewer, vote)] : [] } };
  }
  if (post.active_votes) return { known: false, lookUp: post.active_votes.some((vote) => vote.voter === viewer) };
  return { known: false, lookUp: true };
}
