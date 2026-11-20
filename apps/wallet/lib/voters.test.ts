import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import Big from 'big.js';
import type { HafbeWitnessVoters } from '@hive/common-hiveio-packages/wax';
import type { GovernanceAccount, Voter, WitnessVotersReads } from './voters.ts';

// Node resolves neither the tsconfig path alias nor an extensionless import: point `@ui/…` at the
// package's TypeScript source and give the package's relative imports their `.ts`.
const UI_ALIAS = '@ui/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(UI_ALIAS)) {
      const source = new URL(`../../../packages/ui/${specifier.slice(UI_ALIAS.length)}.ts`, import.meta.url);
      return nextResolve(source.href, context);
    }
    const inUi = context.parentURL?.includes('/packages/ui/');
    if (inUi && specifier.startsWith('./') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});

const {
  FIRST_WITNESS_VOTERS_PAGE,
  PROPOSAL_VOTES_BATCH_SIZE,
  VOTERS_PAGE_SIZE,
  asAccountName,
  breakdownOf,
  fetchProposalVoters,
  fetchWitnessVotersPage,
  filterByName,
  findWitnessVoter,
  formatShare,
  shareOf,
  sortByWeight,
  totalHpOf,
  vestsToHp
} = await import('./voters.ts');

const voter = (name: string, ownHp: number, proxyHp = 0): Voter => ({ name, weight: { ownHp, proxyHp } });

// 1 HP per 2 VESTS: 1,000,000 VESTS satoshis (1 VESTS) are worth 0.5 HP.
const TOTALS = { vestingFundHive: Big(1000), vestingShares: Big(2000) };
const toHp = (vests: string) => vestsToHp(vests, TOTALS);

describe('vestsToHp', () => {
  it('values VESTS satoshis at the vesting fund over the shares issued', () => {
    assert.equal(vestsToHp('1000000', TOTALS), 0.5);
    assert.equal(vestsToHp('53551248642075618', TOTALS), 26_775_624_321.037809);
    assert.equal(vestsToHp(0, TOTALS), 0);
  });

  it('values nothing while no shares are issued', () => {
    assert.equal(vestsToHp('1000000', { vestingFundHive: Big(1000), vestingShares: Big(0) }), 0);
  });
});

describe('shares', () => {
  it('is the part of the total, kept within 0 and 1', () => {
    assert.equal(shareOf(25, 100), 0.25);
    assert.equal(shareOf(150, 100), 1);
    assert.equal(shareOf(5, 0), 0);
  });

  it('shows a share as a percentage with one decimal, a tiny one as below 0.1%', () => {
    assert.equal(formatShare(0.42189, 'en'), '42.2%');
    assert.equal(formatShare(1, 'en'), '100.0%');
    assert.equal(formatShare(0, 'en'), '0.0%');
    assert.equal(formatShare(0.0004, 'en'), '<0.1%');
    assert.equal(formatShare(0.0005, 'en'), '0.1%');
    assert.equal(formatShare(0.42189, 'pl'), '42,2%');
  });

  it('sorts by own and proxied weight together, then by name, and sums them', () => {
    const voters = [voter('carol', 10), voter('bob', 5, 20), voter('alice', 25), voter('dave', 1)];
    assert.deepEqual(
      sortByWeight(voters).map((item) => item.name),
      ['alice', 'bob', 'carol', 'dave']
    );
    assert.equal(totalHpOf(voters), 61);
    assert.equal(totalHpOf([{ name: 'names-only', weight: null }]), 0);
  });
});

describe('breakdownOf', () => {
  it('shows the six largest voters apart and the rest as one segment', () => {
    const voters = sortByWeight([
      voter('a', 30),
      voter('b', 20, 5),
      voter('c', 15),
      voter('d', 10),
      voter('e', 6),
      voter('f', 5),
      voter('g', 4),
      voter('h', 5)
    ]);
    const breakdown = breakdownOf(voters, 100, 8);
    assert.deepEqual(
      breakdown.segments.map((segment) => [segment.name, segment.share]),
      [
        ['a', 0.3],
        ['b', 0.25],
        ['c', 0.15],
        ['d', 0.1],
        ['e', 0.06],
        ['f', 0.05]
      ]
    );
    assert.equal(breakdown.rest?.count, 2);
    assert.ok(Math.abs((breakdown.rest?.share ?? 0) - 0.09) < 1e-9);
  });

  it('puts voters under 1% with the rest, counting the voters not loaded yet', () => {
    const breakdown = breakdownOf([voter('whale', 50), voter('minnow', 0.5)], 100, 1658);
    assert.deepEqual(breakdown.segments, [{ name: 'whale', share: 0.5 }]);
    assert.deepEqual(breakdown.rest, { count: 1657, share: 0.5 });
  });

  it('has no rest when the voters shown hold everything', () => {
    assert.deepEqual(breakdownOf([voter('solo', 10)], 10, 1), { segments: [{ name: 'solo', share: 1 }], rest: null });
  });
});

describe('searching voters by name', () => {
  it('keeps the voters whose name contains the query, ignoring case and a leading @', () => {
    const voters = [voter('blocktrades', 1), voter('gtg', 1), voter('roelandp', 1)];
    assert.deepEqual(
      filterByName(voters, ' @BLOCK').map((item) => item.name),
      ['blocktrades']
    );
    assert.equal(filterByName(voters, '').length, 3);
  });

  it('takes only what may be a whole account name for an exact lookup', () => {
    assert.equal(asAccountName('@BlockTrades '), 'blocktrades');
    assert.equal(asAccountName('ab'), null);
    assert.equal(asAccountName('not a name'), null);
  });
});

const hafbePage = (names: string[], totalVotes: number, totalPages: number): HafbeWitnessVoters => ({
  total_votes: totalVotes,
  total_pages: totalPages,
  voters: names.map((name) => ({
    voter_name: name,
    vests: '3000000',
    account_vests: '2000000',
    proxied_vests: '1000000',
    timestamp: '2020-01-01T00:00:00'
  }))
});

/** Reads of a witness whose voters are `names` (in name order), hafbe-api answering with `hafbe`. */
const witnessReads = (
  names: string[],
  hafbe: WitnessVotersReads['hafbeVoters']
): WitnessVotersReads & { calls: string[]; unavailable: unknown[] } => {
  const calls: string[] = [];
  const unavailable: unknown[] = [];
  return {
    calls,
    unavailable,
    hafbeVoters: (witness, page, pageSize, voterName) => {
      calls.push(`hafbe ${witness} ${page} ${pageSize} ${voterName ?? ''}`);
      return hafbe(witness, page, pageSize, voterName);
    },
    voterNamesFrom: async (witness, from, limit) => {
      calls.push(`names ${witness} ${from} ${limit}`);
      return names.filter((name) => name >= from).slice(0, limit);
    },
    vestsToHp: toHp,
    onHafbeUnavailable: (error) => unavailable.push(error)
  };
};

const NAMES = Array.from({ length: 150 }, (_, index) => `voter-${String(index).padStart(3, '0')}`);

describe('fetchWitnessVotersPage', () => {
  it("pages hafbe-api's voters by weight, with own and proxied HP and the count of all voters", async () => {
    const reads = witnessReads(NAMES, async (_witness, page) => hafbePage([`top-${page}`], 1658, 17));

    const first = await fetchWitnessVotersPage(reads, 'gtg', FIRST_WITNESS_VOTERS_PAGE);
    assert.deepEqual(first, {
      voters: [{ name: 'top-1', weight: { ownHp: 1, proxyHp: 0.5 } }],
      weighted: true,
      voterCount: 1658,
      next: { source: 'hafbe', page: 2 }
    });
    const last = await fetchWitnessVotersPage(reads, 'gtg', { source: 'hafbe', page: 17 });
    assert.equal(last.next, null);
    assert.deepEqual(reads.calls, [`hafbe gtg 1 ${VOTERS_PAGE_SIZE} `, `hafbe gtg 17 ${VOTERS_PAGE_SIZE} `]);
  });

  it('lists the voters by name, without weights, when hafbe-api cannot serve the first page', async () => {
    const notServed = new Error('404 Not Found');
    const reads = witnessReads(NAMES, async () => {
      throw notServed;
    });

    const first = await fetchWitnessVotersPage(reads, 'gtg', FIRST_WITNESS_VOTERS_PAGE);
    assert.equal(first.weighted, false);
    assert.equal(first.voterCount, null);
    assert.equal(first.voters.length, VOTERS_PAGE_SIZE);
    assert.deepEqual(first.voters[0], { name: 'voter-000', weight: null });
    assert.deepEqual(first.next, { source: 'names', after: 'voter-099' });
    assert.deepEqual(reads.unavailable, [notServed]);

    // The listing starts at the name the last page ended with, which is not listed twice.
    assert.ok(first.next);
    const second = await fetchWitnessVotersPage(reads, 'gtg', first.next);
    assert.deepEqual(
      [second.voters[0]?.name, second.voters.length, second.next],
      ['voter-100', 50, null]
    );
    assert.deepEqual(reads.calls.slice(1), [`names gtg  ${VOTERS_PAGE_SIZE}`, `names gtg voter-099 ${VOTERS_PAGE_SIZE + 1}`]);
  });

  it('fails a later hafbe-api page rather than continue a list by weight with names', async () => {
    const reads = witnessReads(NAMES, async () => {
      throw new Error('503');
    });
    await assert.rejects(fetchWitnessVotersPage(reads, 'gtg', { source: 'hafbe', page: 2 }), /503/);
    assert.deepEqual(reads.unavailable, []);
  });

  it('looks a searched name up in hafbe-api only when it may be an account name', async () => {
    const reads = witnessReads(NAMES, async (_witness, _page, _size, name) => hafbePage(name ? [name] : [], 1, 1));
    assert.deepEqual(await findWitnessVoter(reads, 'gtg', 'Blocktrades'), [
      { name: 'blocktrades', weight: { ownHp: 1, proxyHp: 0.5 } }
    ]);
    assert.deepEqual(await findWitnessVoter(reads, 'gtg', 'bl'), []);
    assert.deepEqual(reads.calls, ['hafbe gtg 1 1 blocktrades']);
  });
});

describe('fetchProposalVoters', () => {
  it('reads every vote in batches, then the weights, and ranks the voters by weight', async () => {
    const voterCount = PROPOSAL_VOTES_BATCH_SIZE + 5;
    const names = Array.from({ length: voterCount }, (_, index) => `v${String(index).padStart(5, '0')}`);
    const votesFrom: string[] = [];
    const weightBatches: number[] = [];
    const voters = await fetchProposalVoters(
      {
        voterNamesFrom: async (_id, from, limit) => {
          votesFrom.push(from);
          return names.filter((name) => name >= from).slice(0, limit);
        },
        weightsOf: async (batch) => {
          weightBatches.push(batch.length);
          // The last voter in name order holds the most.
          return batch.map((name) => ({
            name,
            ownVests: name === names.at(-1) ? '9000000' : '2000000',
            delayedVests: '0',
            proxiedVests: '0',
            proxy: ''
          }));
        },
        vestsToHp: toHp
      },
      373
    );

    assert.deepEqual(votesFrom, ['', names[PROPOSAL_VOTES_BATCH_SIZE - 1]]);
    assert.deepEqual(weightBatches, [PROPOSAL_VOTES_BATCH_SIZE, 5]);
    assert.equal(voters.length, voterCount);
    assert.deepEqual(voters[0], { name: names.at(-1), weight: { ownHp: 4.5, proxyHp: 0 } });
    assert.equal(voters[1]?.name, names[0]);
  });

  /** Reads of a proposal whose voters are `accounts`, all in one batch. */
  const proposalReads = (accounts: GovernanceAccount[]) => ({
    voterNamesFrom: async () => accounts.map((account) => account.name),
    weightsOf: async (names: string[]) => accounts.filter((account) => names.includes(account.name)),
    vestsToHp: toHp
  });
  const account = (name: string, vests: Partial<GovernanceAccount>): GovernanceAccount => ({
    name,
    ownVests: '0',
    delayedVests: '0',
    proxiedVests: '0',
    proxy: '',
    ...vests
  });

  it('gives a voter who set a proxy no weight and lists them last, with their proxy', async () => {
    const voters = await fetchProposalVoters(
      proposalReads([
        account('alice', { ownVests: '8000000', proxy: 'bob' }),
        account('bob', { ownVests: '2000000', proxiedVests: '8000000' }),
        account('carol', { ownVests: '1000000' })
      ]),
      373
    );

    assert.deepEqual(voters, [
      { name: 'bob', weight: { ownHp: 1, proxyHp: 4 } },
      { name: 'carol', weight: { ownHp: 0.5, proxyHp: 0 } },
      { name: 'alice', weight: null, proxy: 'bob' }
    ]);
    // Alice's VESTS count once, through bob.
    assert.equal(totalHpOf(voters), 5.5);
  });

  it("leaves a voter's VESTS powered up too recently out of their weight", async () => {
    const [dave] = await fetchProposalVoters(
      proposalReads([account('dave', { ownVests: '10000000', delayedVests: '4000000', proxiedVests: '2000000' })]),
      0
    );
    assert.deepEqual(dave, { name: 'dave', weight: { ownHp: 3, proxyHp: 1 } });
  });

  it("totals the listed weights to the proposal's total_votes", async () => {
    // A stubbed proposal as the chain counts it: total_votes sums each voter without a proxy,
    // their VESTS not delayed and every VESTS proxied to them.
    const accounts = [
      account('whale', { ownVests: '50000000000', delayedVests: '1000000000', proxiedVests: '7000000000' }),
      account('dolphin', { ownVests: '3000000000', proxy: 'whale' }),
      account('fish', { ownVests: '20000000', delayedVests: '20000000' }),
      account('minnow', { ownVests: '1234567' })
    ];
    const totalVotes = '56001234567';

    const voters = await fetchProposalVoters(proposalReads(accounts), 373);
    assert.ok(Math.abs(totalHpOf(voters) - toHp(totalVotes)) < 1e-9);
    assert.deepEqual(
      voters.map((item) => item.name),
      ['whale', 'minnow', 'fish', 'dolphin']
    );
  });
});
