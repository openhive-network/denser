import { Checkbox } from "@hive/ui/components/checkbox";
import { Input } from "@hive/ui/components/input";
import { useTranslation } from 'next-i18next';

export type TransferFilters = {
  search: string;
  others: boolean;
  incoming: boolean;
  outcoming: boolean;
  exlude: boolean;
};
interface TransfersHistoryFilterProps {
  onFiltersChange: (value: Partial<TransferFilters>) => void;
  value: TransferFilters;
}
function TransfersHistoryFilter({
  onFiltersChange,
  value,
}: TransfersHistoryFilterProps) {
  const { t } = useTranslation('common_wallet');
  return (
    <div className="flex flex-col  gap-2 border-b-2 border-zinc-500 p-2 sm:p-4 text-xs">
      <h1 className="font-bold">{t('select_sort.sort_account_history.filters')}</h1>

      <div className="flex gap-1 sm:gap-4">
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
                  search: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default TransfersHistoryFilter;
