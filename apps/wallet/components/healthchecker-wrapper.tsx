'use client';

import { hiveChainService } from '@transaction/lib/hive-chain-service';
import type { TApiSetChecks } from '@transaction/lib/api-sets/definitions';
import { isJsonObject } from '@transaction/lib/json-object';
import { ApiSetsPanel } from '@ui/components/api-sets-panel';
import { translateApiSetsLabels } from '@ui/lib/api-sets-labels';
import { translateApiSetTitles } from '@ui/lib/api-set-titles';
import { useCallback, useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from '@/wallet/i18n/client';

const firstAccountName = (data: unknown): unknown => {
  const accounts = isJsonObject(data) ? data.accounts : undefined;
  return Array.isArray(accounts) && isJsonObject(accounts[0]) ? accounts[0].name : undefined;
};

// The bare chain: a check must ask each node itself, never fail over to another one.
const createWalletChecks = async (t: TFunction<'common_wallet'>): Promise<TApiSetChecks> => {
  const hiveChain = await hiveChainService.getHiveChain();
  return {
    core: [
      {
        title: t('api_sets.checks.find_accounts'),
        method: hiveChain.api.database_api.find_accounts,
        params: { accounts: ['guest4test'], delayed_votes_active: false },
        validatorFunction: (data) => (firstAccountName(data) === 'guest4test' ? true : 'Find accounts error')
      },
      {
        title: t('api_sets.checks.savings_withdrawals'),
        method: hiveChain.api.database_api.find_savings_withdrawals,
        params: { account: 'guest4test' },
        validatorFunction: (data) =>
          isJsonObject(data) && !!data.withdrawals ? true : 'Get saving withdrawals error'
      }
    ],
    hafah: [
      {
        title: t('api_sets.checks.operation_types'),
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
  const labels = useMemo(() => translateApiSetsLabels(t), [t]);
  const setTitles = useMemo(() => translateApiSetTitles(t), [t]);
  const createChecks = useCallback(() => createWalletChecks(t), [t]);
  return (
    <div className="p4 lg:px-48">
      <div className="mx-auto flex flex-col items-center py-8">
        <h3 className="py-4 text-lg">{t('api_sets.title')}</h3>
        <p className="text-muted-foreground mb-4 text-center">{t('api_sets.description')}</p>
      </div>
      <ApiSetsPanel
        snapshot={snapshot}
        createChecks={createChecks}
        checkLabel={t('api_sets.check_nodes')}
        stopLabel={t('api_sets.stop_checking')}
        catalogOnlyNote={t('api_sets.catalog_only')}
        labels={labels}
        setTitles={setTitles}
      />
    </div>
  );
};

export default HealthCheckerWrapper;
