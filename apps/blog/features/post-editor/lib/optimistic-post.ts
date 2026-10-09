import { NaiAsset } from '@hiveio/wax';
import { PUBLISHING_APP } from '@transaction/lib/publishing-app';
import { Beneficiarie } from '@hive/common-hiveio-packages/wax';
import { formatNaiAsset } from '@ui/lib/helpers';

const PAYOUT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface PostParams {
  permlink: string;
  title: string;
  body: string;
  reputation: number;
  tags: string[];
  category: string;
  summary: string;
  altAuthor: string;
  image?: string;
  editMode: boolean;
  beneficiaries: Beneficiarie[];
  maxAcceptedPayout: NaiAsset;
  percentHbd: number;
  rewardOptionsChanged?: boolean;
}

/** The entry a new post's page renders from until Hivemind has indexed the real one. */
export function buildOptimisticPost(params: PostParams, username: string) {
  const { permlink, title, body, tags, category, summary, reputation, image } = params;
  const { beneficiaries, maxAcceptedPayout, percentHbd } = params;
  const now = new Date().toISOString();
  return {
    author: username,
    permlink,
    title,
    body,
    category,
    tags,
    json_metadata: { tags, image: image ? [image] : [], description: summary, app: PUBLISHING_APP },
    created: now,
    updated: now,
    active_votes: [],
    children: 0,
    author_reputation: reputation,
    pending_payout_value: '0.000 HBD',
    curator_payout_value: '0.000 HBD',
    author_payout_value: '0.000 HBD',
    payout: 0,
    payout_at: new Date(Date.now() + PAYOUT_WINDOW_MS).toISOString(),
    is_paidout: false,
    net_rshares: 0,
    url: `/${category}/@${username}/${permlink}`,
    // Use actual user-selected values for payout settings (e.g. "1000000.000 HBD")
    max_accepted_payout: maxAcceptedPayout ? formatNaiAsset(maxAcceptedPayout) : '1000000.000 HBD',
    beneficiaries: beneficiaries ?? [],
    percent_hbd: percentHbd ?? 10000,
    blacklists: [],
    depth: 0,
    promoted: '0.000 HBD',
    replies: [],
    stats: { total_votes: 0, hide: false, gray: false, flag_weight: 0 },
    _optimistic: true
  };
}
