import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchProposalPagesFrom,
  fundingMarks,
  isProposalStatusTab,
  matchesProposalSearch,
  remainingDays,
  uniqueProposals
} from './proposals-list.ts';

const NOW = Date.parse('2026-06-01T12:00:00Z');

describe('remainingDays', () => {
  it('counts a started day as a whole one', () => {
    assert.equal(remainingDays('2026-06-11T12:00:00', NOW), 10);
    assert.equal(remainingDays('2026-06-11T12:00:01', NOW), 11);
    assert.equal(remainingDays('2026-06-01T13:00:00', NOW), 1);
  });

  it('reads the end date as UTC', () => {
    assert.equal(remainingDays('2026-06-02T00:00:00', Date.parse('2026-06-01T00:00:00Z')), 1);
  });

  it('is 0 once the end date has passed', () => {
    assert.equal(remainingDays('2026-06-01T12:00:00', NOW), 0);
    assert.equal(remainingDays('2026-01-01T00:00:00', NOW), 0);
  });
});

describe('matchesProposalSearch', () => {
  const proposal = { subject: 'Hive Core Development', creator: 'alice', receiver: 'core.dev' };

  it('finds the query in the title, the creator or the receiver, ignoring case', () => {
    assert.equal(matchesProposalSearch(proposal, 'core dev'), true);
    assert.equal(matchesProposalSearch(proposal, 'ALI'), true);
    assert.equal(matchesProposalSearch(proposal, 'core.dev'), true);
    assert.equal(matchesProposalSearch(proposal, 'bob'), false);
  });

  it('matches every proposal on a blank query', () => {
    assert.equal(matchesProposalSearch(proposal, '  '), true);
  });
});

describe('uniqueProposals', () => {
  const proposal = (id: number) => ({ proposal_id: id });

  it('keeps the first of a proposal repeated across page boundaries, in page order', () => {
    const pages = [
      [proposal(1), proposal(309)],
      [proposal(309), proposal(158)],
      [proposal(158), proposal(2)]
    ];

    assert.deepEqual(
      uniqueProposals(pages).map((p) => p.proposal_id),
      [1, 309, 158, 2]
    );
  });

  it('keeps pages without repeats as they are', () => {
    assert.deepEqual(uniqueProposals([[proposal(3)], [proposal(4)]]), [proposal(3), proposal(4)]);
    assert.deepEqual(uniqueProposals([]), []);
  });
});

describe('fetchProposalPagesFrom', () => {
  /** A listing of proposals `ids`, served in pages of `limit` from the cursor on; records the cursors asked for. */
  const listing = (ids: number[], limit: number) => {
    const cursors: (number | undefined)[] = [];
    const fetchPage = async (lastId: number | undefined) => {
      cursors.push(lastId);
      const from = lastId === undefined ? 0 : ids.indexOf(lastId);
      return ids.slice(from, from + limit).map((id) => ({ id }));
    };
    return { cursors, fetchPage };
  };
  const pageIds = (pages: { id: number }[][]) => pages.map((page) => page.map(({ id }) => id));

  it('takes the rest in one call when it fits in a page', async () => {
    const { cursors, fetchPage } = listing([5, 9, 2, 7, 4], 1000);

    assert.deepEqual(pageIds(await fetchProposalPagesFrom(fetchPage, 9, 1000)), [[9, 2, 7, 4]]);
    assert.deepEqual(cursors, [9]);
  });

  it('follows full pages from the last proposal of each until a short one', async () => {
    const { cursors, fetchPage } = listing([5, 9, 2, 7, 4, 8], 3);

    assert.deepEqual(pageIds(await fetchProposalPagesFrom(fetchPage, 9, 3)), [[9, 2, 7], [7, 4, 8], [8]]);
    assert.deepEqual(cursors, [9, 7, 8]);
  });

  it('starts at the beginning without a cursor and stops at an empty page', async () => {
    const { cursors, fetchPage } = listing([], 3);

    assert.deepEqual(pageIds(await fetchProposalPagesFrom(fetchPage, undefined, 3)), [[]]);
    assert.deepEqual(cursors, [undefined]);
  });

  it('stops when a full page does not move past its cursor', async () => {
    const { cursors, fetchPage } = listing([5, 9], 1);

    assert.deepEqual(pageIds(await fetchProposalPagesFrom(fetchPage, 9, 1)), [[9]]);
    assert.deepEqual(cursors, [9]);
  });

  it('passes on a failed page', async () => {
    await assert.rejects(
      fetchProposalPagesFrom(() => Promise.reject(new Error('node down')), undefined, 3),
      /node down/
    );
  });
});

describe('fundingMarks', () => {
  const active = (id: number) => ({ proposal_id: id, status: 'active', receiver: `receiver${id}` });
  const upcoming = (id: number) => ({ proposal_id: id, status: 'inactive', receiver: `receiver${id}` });
  const refund = (id: number) => ({ proposal_id: id, status: 'active', receiver: 'hive.fund' });
  const funded = new Set([3, 5, 0]);
  const REFUND_ACCOUNTS = ['hive.fund'];

  it('draws the line after the last funded proposal, with no badges', () => {
    const marks = fundingMarks([active(3), active(5), active(0), active(7)], funded, true, REFUND_ACCOUNTS);

    assert.equal(marks.lineIndex, 2);
    assert.deepEqual(marks.badges, [undefined, undefined, undefined, undefined]);
  });

  it('badges an unfunded proposal listed above the line', () => {
    const marks = fundingMarks([active(3), upcoming(9), active(0), active(7)], funded, true, REFUND_ACCOUNTS);

    assert.equal(marks.lineIndex, 2);
    assert.deepEqual(marks.badges, [undefined, 'not_funded', undefined, undefined]);
  });

  it('badges each active proposal when the list is not in vote order', () => {
    const marks = fundingMarks([active(7), upcoming(9), active(3)], funded, false, REFUND_ACCOUNTS);

    assert.equal(marks.lineIndex, -1);
    assert.deepEqual(marks.badges, ['not_funded', undefined, 'funded']);
  });

  it('falls back to badges when no listed proposal is funded', () => {
    const marks = fundingMarks([active(7), active(8)], funded, true, REFUND_ACCOUNTS);

    assert.equal(marks.lineIndex, -1);
    assert.deepEqual(marks.badges, ['not_funded', 'not_funded']);
  });

  it('gives a refund proposal no badge, funded or not, while the proposals around it keep theirs', () => {
    const marks = fundingMarks([active(3), refund(0), active(7), refund(8)], funded, false, REFUND_ACCOUNTS);

    assert.deepEqual(marks.badges, ['funded', undefined, 'not_funded', undefined]);
  });

  it('gives an unfunded refund proposal above the line no badge', () => {
    const marks = fundingMarks([active(3), refund(9), upcoming(4), active(5)], funded, true, REFUND_ACCOUNTS);

    assert.equal(marks.lineIndex, 3);
    assert.deepEqual(marks.badges, [undefined, undefined, 'not_funded', undefined]);
  });
});

describe('isProposalStatusTab', () => {
  it('accepts the list_proposals statuses the page offers', () => {
    assert.equal(isProposalStatusTab('votable'), true);
    assert.equal(isProposalStatusTab('inactive'), true);
    assert.equal(isProposalStatusTab('removed'), false);
  });
});
