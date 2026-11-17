import type Big from 'big.js';
import type { ReactNode } from 'react';
import { cn, getRoundedAbbreveration, numberWithCommas } from '@hive/ui/lib/utils';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import { useLocale } from '@ui/components/locale-context';
import {
  proposalLastPaidWhileUnfunded,
  proposalUnfunded,
  proposalUpToLeft,
  type ProposalPaid,
  type ProposalTerms
} from '@/wallet/lib/proposal-payments';

interface ProposalPaidAmountsProps {
  proposal: ProposalTerms;
  /** HBD over the proposal's whole lifetime */
  total: Big;
  totalDays: number;
  /** What the DHF paid the proposal; the figures that need it show only with it */
  paid?: ProposalPaid;
}

const UNFUNDED_COLOR = 'text-amber-700 dark:text-amber-400';
const LAST_PAID_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

const HbdAmount = ({ amount, className }: { amount: Big; className?: string }) => (
  <span
    title={numberWithCommas(amount.toFixed(2)) + ' HBD'}
    className={cn('font-semibold text-red-600 dark:text-red-200', className)}
  >
    {getRoundedAbbreveration(amount)}
    {/* A phone's line is too narrow for the unit after every amount */}
    <span className="hidden sm:inline"> HBD</span>
  </span>
);

/** The figures of a line, separated by middle dots. */
const DottedLine = ({ children }: { children: ReactNode[] }) => (
  <p
    className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-600 dark:text-slate-400"
    data-testid="proposal-payments"
  >
    {children
      .filter((child) => child)
      .map((child, index) => (
        <span key={index} className="flex items-center gap-x-1.5 whitespace-nowrap">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          {child}
        </span>
      ))}
  </p>
);

/**
 * A proposal's money line: for an upcoming proposal its lifetime total; once it started what it
 * was paid, what it was not (the hours it ranked below the return proposal) and, while active,
 * the most it can still receive, with its last payment when it is not funded at the moment.
 */
export function ProposalPaidAmounts({ proposal, total, totalDays, paid }: ProposalPaidAmountsProps) {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const now = Date.now();
  const unfunded = paid ? proposalUnfunded(proposal, paid, now) : undefined;
  const upToLeft = proposalUpToLeft(proposal, now);
  const lastPaid = paid ? proposalLastPaidWhileUnfunded(proposal.status, paid.lastPaymentTime, now) : undefined;
  const expired = proposal.status === 'expired';

  if (!unfunded && !upToLeft) {
    return (
      <DottedLine>
        {[
          <span key="total" data-testid="proposal-total">
            <Trans
              i18nKey="proposals_page.total_over"
              values={{ duration: t('proposals_page.duration_days', { count: totalDays }) }}
              components={{ amount: <HbdAmount amount={total} /> }}
            />
          </span>
        ]}
      </DottedLine>
    );
  }

  return (
    <DottedLine>
      {[
        paid ? (
          <span key="paid" data-testid="proposal-paid">
            {expired ? (
              <Trans
                i18nKey="proposals_page.paid_of"
                components={{ paid: <HbdAmount amount={paid.paid} />, total: <HbdAmount amount={total} /> }}
              />
            ) : (
              <>
                {t('proposals_page.paid')} <HbdAmount amount={paid.paid} />
              </>
            )}
          </span>
        ) : null,
        unfunded ? (
          <span
            key="unfunded"
            title={t('proposals_page.unfunded_tooltip')}
            className={cn({ [UNFUNDED_COLOR]: unfunded.amount.gt(0) })}
            data-testid="proposal-unfunded"
          >
            {t('proposals_page.unfunded')}{' '}
            <HbdAmount amount={unfunded.amount} className={unfunded.amount.gt(0) ? UNFUNDED_COLOR : undefined} />
            {/* Like the unit, left out of a phone's narrow line */}
            <span className="hidden sm:inline">
              {unfunded.neverFunded
                ? ` (${t('proposals_page.never_funded')})`
                : unfunded.days > 0
                  ? ` (${t('proposals_page.duration_days', { count: unfunded.days })})`
                  : null}
            </span>
          </span>
        ) : null,
        upToLeft ? (
          <span key="up-to-left" data-testid="proposal-up-to-left">
            <Trans i18nKey="proposals_page.up_to_left" components={{ amount: <HbdAmount amount={upToLeft} /> }} />
          </span>
        ) : null,
        lastPaid !== undefined ? (
          <span key="last-paid" data-testid="proposal-last-paid">
            {t('proposals_page.last_paid', {
              date: new Intl.DateTimeFormat(locale, LAST_PAID_FORMAT).format(lastPaid)
            })}
          </span>
        ) : null
      ]}
    </DottedLine>
  );
}
