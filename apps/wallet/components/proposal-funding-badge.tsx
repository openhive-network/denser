import { Badge } from '@ui/components/badge';
import { useTranslation } from '@/wallet/i18n/client';
import type { ProposalFundingBadge as ProposalFundingBadgeType } from '@/wallet/lib/proposals-list';

/** The "funded" / "not funded" badge of a proposal in the next round of DHF payouts. */
export function ProposalFundingBadge({ funding }: { funding: ProposalFundingBadgeType }) {
  const { t } = useTranslation('common_wallet');
  return funding === 'funded' ? (
    <Badge
      variant="outline"
      className="border-green-700 text-green-700 dark:border-green-400 dark:text-green-400"
      data-testid="proposal-funding-badge"
    >
      {t('proposals_page.funded')}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-slate-500 text-slate-600 dark:border-slate-400 dark:text-slate-300"
      data-testid="proposal-funding-badge"
    >
      {t('proposals_page.not_funded')}
    </Badge>
  );
}
