'use client';

import { hiveChainService } from '@transaction/lib/hive-chain-service';
import type { TApiSetChecks } from '@transaction/lib/api-sets/definitions';
import { isJsonObject } from '@transaction/lib/json-object';
import { ApiSetsPanel } from '@ui/components/api-sets-panel';
import { useTranslation } from '@/blog/i18n/client';

const isNonEmptyList = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

const firstAccountName = (data: unknown): unknown => {
  const accounts = isJsonObject(data) ? data.accounts : undefined;
  return Array.isArray(accounts) && isJsonObject(accounts[0]) ? accounts[0].name : undefined;
};

// The bare chain: a check must ask each node itself, never fail over to another one.
const createBlogChecks = async (): Promise<TApiSetChecks> => {
  const hiveChain = await hiveChainService.getHiveChain();
  return {
    core: [
      {
        title: 'Database - Find accounts',
        method: hiveChain.api.database_api.find_accounts,
        params: { accounts: ['guest4test'], delayed_votes_active: false },
        validatorFunction: (data) => (firstAccountName(data) === 'guest4test' ? true : 'Find accounts error')
      }
    ],
    bridge: [
      {
        title: 'Bridge - Get post',
        method: hiveChain.api.bridge.get_post,
        params: { author: 'guest4test', permlink: '6wpmjy-test', observer: '' },
        validatorFunction: (data) =>
          isJsonObject(data) && data.author === 'guest4test' ? true : 'Bridge API get post error'
      },
      {
        title: 'Bridge - List Communities',
        method: hiveChain.api.bridge.list_communities,
        params: { query: null, sort: 'rank', observer: 'hive.blog' },
        validatorFunction: (data) => (isNonEmptyList(data) ? true : 'Bridge API get community list error')
      },
      {
        title: 'Bridge - Get Ranked Posts',
        method: hiveChain.api.bridge.get_ranked_posts,
        params: { observer: 'hive.blog', tag: '', limit: 10, sort: 'trending' },
        validatorFunction: (data) => (isNonEmptyList(data) ? true : 'Bridge API get ranked posts error')
      }
    ],
    hivesense: [
      {
        title: 'AI search',
        method: hiveChain.restApi['hivesense-api'].posts.search,
        params: { q: 'test', truncate: 100, result_limit: 10, full_posts: 10 },
        validatorFunction: (data) => (isNonEmptyList(data) ? true : 'AI search error')
      },
      {
        title: 'AI similar posts',
        method: hiveChain.restApi['hivesense-api'].posts.author.permlink.similar,
        params: {
          author: 'thebeedevs',
          permlink: 'clive-updates-clive-in-spring-colors',
          truncate: 100,
          result_limit: 1
        },
        validatorFunction: (data) => (isNonEmptyList(data) ? true : 'AI similar posts error')
      }
    ]
  };
};

const HealthCheckersWrapper = ({ snapshot }: { snapshot: unknown }) => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="p4 lg:px-48">
      <div className="mx-auto flex flex-col items-center py-8">
        <h3 className="py-4 text-lg">API switch and HealthChecker</h3>
        <p className="text-muted-foreground mb-4 text-center">{t('api_sets.description')}</p>
      </div>
      <ApiSetsPanel
        snapshot={snapshot}
        createChecks={createBlogChecks}
        checkLabel={t('api_sets.check_nodes')}
        stopLabel={t('api_sets.stop_checking')}
      />
    </div>
  );
};

export default HealthCheckersWrapper;
