import { Icons } from '@hive/ui/components/icons';
import { useTranslation } from '@/wallet/i18n/client';

/** The line between the proposals the DHF pays in its next round of payouts and those it does not. */
export function ProposalsFundingLine() {
  const { t } = useTranslation('common_wallet');

  return (
    <div
      className="flex flex-col gap-1 border-y-2 border-dashed border-red-500 py-2 text-sm font-semibold text-slate-700 dark:border-red-400 dark:text-slate-300"
      data-testid="proposals-funding-line"
    >
      <p className="flex items-center gap-1">
        <Icons.chevronUp className="h-4 w-4" aria-hidden="true" />
        {t('proposals_page.funding_line_funded')}
      </p>
      <p className="flex items-center gap-1">
        <Icons.chevronDown className="h-4 w-4" aria-hidden="true" />
        {t('proposals_page.funding_line_not_funded')}
      </p>
    </div>
  );
}
