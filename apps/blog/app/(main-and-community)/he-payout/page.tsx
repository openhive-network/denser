import Content from './content';
import SortPage from '@/blog/features/tags-pages/sort-page';

const sort = 'created';
const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const INVALID_TOKEN_VALUES = new Set(['NULL', 'UNDEFINED', 'NONE', 'N/A', 'NA', 'FALSE', '0']);
const FEED_TAG_REGEX = /^[a-z0-9.-]{1,64}$/;

const getHeCommunityTagFromEnv = (): string => {
  const enabled = BOOLEAN_TRUE_VALUES.has((process.env.REACT_APP_HE_REWARDS_ENABLED ?? '').trim().toLowerCase());
  if (!enabled) {
    return '';
  }

  const token = (process.env.REACT_APP_HE_REWARDS_TOKEN ?? '').trim().toUpperCase();
  if (token.length === 0 || INVALID_TOKEN_VALUES.has(token)) {
    return '';
  }

  if (!/^[A-Z0-9.-]{1,32}$/.test(token)) {
    return '';
  }

  const configuredFeedTag = (process.env.REACT_APP_HE_REWARDS_FEED_TAG ?? process.env.REACT_APP_HE_REWARDS_COMMUNITY_TAG ?? '')
    .trim()
    .toLowerCase();

  return FEED_TAG_REGEX.test(configuredFeedTag) ? configuredFeedTag : token.toLowerCase();
};
const heCommunityTag = getHeCommunityTagFromEnv();

const Page = () => (
  <SortPage sort={sort} tag={heCommunityTag}>
    <Content tag={heCommunityTag} />
  </SortPage>
);

export default Page;
