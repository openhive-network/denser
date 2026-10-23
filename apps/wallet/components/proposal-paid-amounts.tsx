import type Big from 'big.js';
import { getRoundedAbbreveration, numberWithCommas } from '@hive/ui/lib/utils';
import { useTranslation } from '@/wallet/i18n/client';
import { proposalToPay } from '@/wallet/lib/proposal-payments';

interface ProposalPaidAmountsProps {
  status: string;
  /** HBD a day */
  dailyPay: Big;
  totalDays: number;
  /** HBD paid so far; nothing shows without it */
  paid?: Big;
}

const HbdAmount = ({ amount }: { amount: Big }) => (
  <span title={numberWithCommas(amount.toFixed(2)) + ' HBD'} className="font-semibold text-red-600 dark:text-red-200">
    {getRoundedAbbreveration(amount) + ' HBD'}
  </span>
);

/** What a proposal card shows of the DHF's payments: the HBD paid and, until it expires, what is left to pay. */
export function ProposalPaidAmounts({ status, dailyPay, totalDays, paid }: ProposalPaidAmountsProps) {
  const { t } = useTranslation('common_wallet');
  if (!paid) return null;
  const toPay = proposalToPay(status, dailyPay, totalDays, paid);
  return (
    <>
      <span className="whitespace-nowrap text-slate-500 dark:text-slate-400" data-testid="proposal-paid">
        {t('proposals_page.paid')} <HbdAmount amount={paid} />
      </span>
      {toPay ? (
        <span className="whitespace-nowrap text-slate-500 dark:text-slate-400" data-testid="proposal-to-pay">
          {t('proposals_page.to_pay')} <HbdAmount amount={toPay} />
        </span>
      ) : null}
    </>
  );
}
