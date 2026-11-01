'use client';

import { hiveChainService } from '@transaction/lib/hive-chain-service';
import type { TApiSetChecks } from '@transaction/lib/api-sets/definitions';
import { isJsonObject } from '@transaction/lib/json-object';
import { ApiSetsPanel } from '@ui/components/api-sets-panel';
import { useTranslation } from '@/wallet/i18n/client';

const firstAccountName = (data: unknown): unknown => {
  const accounts = isJsonObject(data) ? data.accounts : undefined;
  return Array.isArray(accounts) && isJsonObject(accounts[0]) ? accounts[0].name : undefined;
};

// The bare chain: a check must ask each node itself, never fail over to another one.
const createWalletChecks = async (): Promise<TApiSetChecks> => {
  const hiveChain = await hiveChainService.getHiveChain();
  return {
    core: [
      {
        title: 'Database - Find accounts',
        method: hiveChain.api.database_api.find_accounts,
        params: { accounts: ['guest4test'], delayed_votes_active: false },
        validatorFunction: (data) => (firstAccountName(data) === 'guest4test' ? true : 'Find accounts error')
      },
      {
        title: 'Database - saving withdrawals',
        method: hiveChain.api.database_api.find_savings_withdrawals,
        params: { account: 'guest4test' },
        validatorFunction: (data) =>
          isJsonObject(data) && !!data.withdrawals ? true : 'Get saving withdrawals error'
      }
    ],
    hafah: [
      {
        title: 'HAFAH API',
        method: hiveChain.restApi['hafah-api']['operation-types'],
        params: {},
        validatorFunction: (data) =>
          Array.isArray(data) && data.length > 0 ? true : 'Get operation types error'
      }
    ]
  };
};

const HealthCheckerWrapper = ({ snapshot }: { snapshot: unknown }) => {
  const { t } = useTranslation('common_wallet');
  return (
    <div className="p4 lg:px-48">
      <div className="mx-auto flex flex-col items-center py-8">
        <h3 className="py-4 text-lg">API switch and HealthChecker</h3>
        <p className="text-muted-foreground mb-4 text-center">{t('api_sets.description')}</p>
      </div>
      <ApiSetsPanel
        snapshot={snapshot}
        createChecks={createWalletChecks}
        checkLabel={t('api_sets.check_nodes')}
        stopLabel={t('api_sets.stop_checking')}
        catalogOnlyNote={t('api_sets.catalog_only')}
      />
    </div>
  );
};

export default HealthCheckerWrapper;
