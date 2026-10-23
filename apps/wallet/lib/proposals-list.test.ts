import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
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

describe('fundingMarks', () => {
  const active = (id: number) => ({ proposal_id: id, status: 'active' });
  const upcoming = (id: number) => ({ proposal_id: id, status: 'inactive' });
  const funded = new Set([3, 5, 0]);

  it('draws the line after the last funded proposal, with no badges', () => {
    const marks = fundingMarks([active(3), active(5), active(0), active(7)], funded, true);

    assert.equal(marks.lineIndex, 2);
    assert.deepEqual(marks.badges, [undefined, undefined, undefined, undefined]);
  });

  it('badges an unfunded proposal listed above the line', () => {
    const marks = fundingMarks([active(3), upcoming(9), active(0), active(7)], funded, true);

    assert.equal(marks.lineIndex, 2);
    assert.deepEqual(marks.badges, [undefined, 'not_funded', undefined, undefined]);
  });

  it('badges each active proposal when the list is not in vote order', () => {
    const marks = fundingMarks([active(7), upcoming(9), active(3)], funded, false);

    assert.equal(marks.lineIndex, -1);
    assert.deepEqual(marks.badges, ['not_funded', undefined, 'funded']);
  });

  it('falls back to badges when no listed proposal is funded', () => {
    const marks = fundingMarks([active(7), active(8)], funded, true);

    assert.equal(marks.lineIndex, -1);
    assert.deepEqual(marks.badges, ['not_funded', 'not_funded']);
  });
});

describe('isProposalStatusTab', () => {
  it('accepts the list_proposals statuses the page offers', () => {
    assert.equal(isProposalStatusTab('votable'), true);
    assert.equal(isProposalStatusTab('inactive'), true);
    assert.equal(isProposalStatusTab('removed'), false);
  });
});
