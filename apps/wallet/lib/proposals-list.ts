const DAY_MS = 24 * 60 * 60 * 1000;

/** The `list_proposals` statuses the proposals page offers as tabs, in tab order. */
export const PROPOSAL_STATUS_TABS = ['all', 'active', 'inactive', 'expired', 'votable'] as const;
export type ProposalStatusTab = (typeof PROPOSAL_STATUS_TABS)[number];

export const isProposalStatusTab = (value: string): value is ProposalStatusTab =>
  PROPOSAL_STATUS_TABS.some((tab) => tab === value);

/** The translation key of each status's label, shared by the status tabs and the status select. */
export const PROPOSAL_STATUS_LABEL_KEYS: Record<ProposalStatusTab, string> = {
  all: 'select_sort.sort_proposals.all',
  active: 'select_sort.sort_proposals.active',
  inactive: 'select_sort.sort_proposals.upcoming',
  expired: 'select_sort.sort_proposals.expired',
  votable: 'select_sort.sort_proposals.votable'
};

/**
 * Whole days, rounded up, from `now` (ms since the epoch) to `endDate`, a Hive API timestamp (UTC
 * without a zone designator); 0 once it has passed.
 */
export const remainingDays = (endDate: string, now: number): number =>
  Math.max(0, Math.ceil((Date.parse(`${endDate}Z`) - now) / DAY_MS));

/** Whether the proposal's title, creator or receiver contains `query`, ignoring case and surrounding blanks. */
export const matchesProposalSearch = (
  proposal: { subject: string; creator: string; receiver: string },
  query: string
): boolean => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [proposal.subject, proposal.creator, proposal.receiver].some((field) =>
    field.toLocaleLowerCase().includes(needle)
  );
};

type FundedSet = Pick<ReadonlyMap<number, unknown>, 'has'>;

export type ProposalFundingBadge = 'funded' | 'not_funded';

export interface FundingMarks {
  /** Index of the proposal the funding line follows, or -1 for no line. */
  lineIndex: number;
  /** Each proposal's funding badge, if it shows one. */
  badges: (ProposalFundingBadge | undefined)[];
}

const lastFundedIndex = (proposals: readonly { proposal_id: number }[], funded: FundedSet): number => {
  for (let index = proposals.length - 1; index >= 0; index--) {
    if (funded.has(proposals[index].proposal_id)) return index;
  }
  return -1;
};

/**
 * How the list marks the next round of DHF payouts. `withLine` (a list in vote order) draws a line
 * after the last `funded` proposal, and badges "not funded" any proposal above it that is not;
 * otherwise, or when no listed proposal is funded, every active proposal gets a badge.
 */
export function fundingMarks(
  proposals: readonly { proposal_id: number; status: string }[],
  funded: FundedSet,
  withLine: boolean
): FundingMarks {
  const lineIndex = withLine ? lastFundedIndex(proposals, funded) : -1;
  const badges = proposals.map((proposal, index): ProposalFundingBadge | undefined => {
    const isFunded = funded.has(proposal.proposal_id);
    if (lineIndex >= 0) return index < lineIndex && !isFunded ? 'not_funded' : undefined;
    if (proposal.status !== 'active') return undefined;
    return isFunded ? 'funded' : 'not_funded';
  });
  return { lineIndex, badges };
}
