'use client';

import { Checkbox } from '@ui/components/checkbox';
import { Input } from '@ui/components/input';
import { useTranslation } from '@/wallet/i18n/client';

export type TransferFilters = {
  search: string;
  others: boolean;
  incoming: boolean;
  outcoming: boolean;
  exlude: boolean;
  historyView: 'hive' | 'token';
};
interface TransfersHistoryFilterProps {
  onFiltersChange: (value: Partial<TransferFilters>) => void;
  value: TransferFilters;
  token?: string;
}
function TransfersHistoryFilter({ onFiltersChange, value, token }: TransfersHistoryFilterProps) {
  const { t } = useTranslation('common_wallet');
  const hasTokenTab = Boolean(token && token.trim().length > 0);
  const isTokenView = value.historyView === 'token';

  return (
    <div className="flex flex-col  gap-2 border-y-2 border-zinc-500 p-2 text-xs sm:p-4">
      <h1 className="font-bold">{t('select_sort.sort_account_history.filters')}</h1>
      {hasTokenTab ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`rounded border px-3 py-1 text-xs font-semibold ${
              isTokenView
                ? 'border-border bg-background-tertiary text-primary/70'
                : 'border-border bg-background text-primary'
            }`}
            onClick={() => onFiltersChange({ historyView: 'hive' })}
            data-testid="wallet-history-tab-hive"
          >
            Hive
          </button>
          <button
            type="button"
            className={`rounded border px-3 py-1 text-xs font-semibold ${
              isTokenView
                ? 'border-destructive text-destructive'
                : 'border-border bg-background text-primary'
            }`}
            onClick={() => onFiltersChange({ historyView: 'token' })}
            data-testid="wallet-history-tab-token"
          >
            {token}
          </button>
        </div>
      ) : null}

      <div className="flex gap-1 sm:gap-4">
        {isTokenView ? (
          <div className="text-primary/70" data-testid="wallet-token-history-description">
            Showing {token} wallet transactions (buy, sell, stake, transfer, receive).
          </div>
        ) : null}

        {!isTokenView ? (
          <>
            <div className="flex flex-col gap-2">
              <label className="flex gap-1 sm:gap-2">
                <Checkbox
                  className="border-zinc-700"
                  checked={value.others}
                  onClick={() => onFiltersChange({ others: !value.others })}
                  data-testid="wallet-checkbox-others"
                />
                <span>{t('select_sort.sort_account_history.others')}</span>
              </label>
              <label className="flex gap-1 sm:gap-2">
                <Checkbox
                  className="border-zinc-700"
                  data-testid="wallet-checkbox-incoming"
                  checked={value.incoming}
                  onClick={() => onFiltersChange({ incoming: !value.incoming })}
                />
                <span>{t('select_sort.sort_account_history.incoming')}</span>
              </label>
              <label className="flex gap-1 sm:gap-2">
                <Checkbox
                  className="border-zinc-700"
                  data-testid="wallet-checkbox-outcoming"
                  checked={value.outcoming}
                  onClick={() => onFiltersChange({ outcoming: !value.outcoming })}
                />
                <span>{t('select_sort.sort_account_history.outgoing')}</span>
              </label>
              <label className="flex gap-1 sm:gap-2">
                <Checkbox
                  className="border-zinc-700"
                  data-testid="wallet-checkbox-exclude-less-than-1-hbd-hive"
                  checked={value.exlude}
                  onClick={() => onFiltersChange({ exlude: !value.exlude })}
                />
                <span>{t('select_sort.sort_account_history.exclude_less_than_one')}</span>
              </label>
            </div>
            <div className="flex flex-col gap-1 sm:gap-2">
              <div className="flex flex-col gap-1">
                <span>{t('select_sort.sort_account_history.input_title')}</span>
                <Input
                  className="border-zinc-500"
                  placeholder={t('select_sort.sort_account_history.input_placeholder')}
                  data-testid="wallet-search-input"
                  value={value.search}
                  onChange={(e) =>
                    onFiltersChange({
                      search: e.target.value
                    })
                  }
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
export default TransfersHistoryFilter;
