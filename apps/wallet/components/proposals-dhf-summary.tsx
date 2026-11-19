import { useId } from 'react';
import Big from 'big.js';
import env from '@beam-australia/react-env';
import { Link } from '@hive/ui';
import { formatDecimal } from '@hive/ui/lib/utils';
import { useLocale } from '@ui/components/locale-context';
import { Skeleton } from '@ui/components/skeleton';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import { DHF_FAQ_ANCHOR } from '@/wallet/lib/dhf-faq';
import type { DhfFunding } from './hooks/use-dhf-funding';

const HBD_PRECISION = 3;

/** `satoshis` HBD written exactly in `locale`'s separators, e.g. `23,223,141.076 HBD` in en. */
const hbdText = (satoshis: bigint, locale: string) =>
  `${formatDecimal(Big(satoshis.toString()).div(10 ** HBD_PRECISION), HBD_PRECISION, locale)} HBD`;

function SummaryStat({ label, satoshis, testId }: { label: string; satoshis: bigint; testId: string }) {
  const { locale } = useLocale();
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
      <dt className="text-xs uppercase text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="font-semibold" data-testid={testId}>
        {hbdText(satoshis, locale)}
      </dd>
    </div>
  );
}

interface ProposalsDhfSummaryProps {
  funding: DhfFunding | undefined;
  isPending: boolean;
}

/**
 * The DHF's budget and what it pays out a day, above the list of proposals: its four figures as a
 * 2x2 grid on phones, from `sm` up as label-value pairs in a row.
 */
export function ProposalsDhfSummary({ funding, isPending }: ProposalsDhfSummaryProps) {
  const { t } = useTranslation('common_wallet');
  const titleId = useId();

  return (
    <section
      className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
      aria-labelledby={titleId}
      data-testid="dhf-summary"
    >
      <h2 id={titleId} className="font-semibold">
        {t('proposals_page.dhf_title')}
      </h2>
      {isPending ? (
        <Skeleton className="h-10 w-full bg-slate-300 dark:bg-slate-900 sm:h-5" />
      ) : funding ? (
        <dl className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
          <SummaryStat
            label={t('proposals_page.dhf_daily_funded')}
            satoshis={funding.dailyFunded}
            testId="dhf-daily-funded"
          />
          <SummaryStat
            label={t('proposals_page.dhf_stabilizer')}
            satoshis={funding.stabilizerFunded}
            testId="dhf-stabilizer"
          />
          <SummaryStat
            label={t('proposals_page.dhf_max_daily_budget')}
            satoshis={funding.dailyBudget}
            testId="dhf-max-daily-budget"
          />
          <SummaryStat
            label={t('proposals_page.dhf_total_budget')}
            satoshis={funding.totalBudget}
            testId="dhf-total-budget"
          />
        </dl>
      ) : (
        <p className="text-slate-600 dark:text-slate-300" data-testid="dhf-summary-unavailable">
          {t('proposals_page.dhf_unavailable')}
        </p>
      )}
      <p className="text-xs text-slate-600 dark:text-slate-300" data-testid="dhf-explanation">
        <Trans
          i18nKey="proposals_page.dhf_explanation"
          components={{
            faq: (
              <Link
                href={`${env('BLOG_DOMAIN')}/faq.html${DHF_FAQ_ANCHOR}`}
                className="text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              />
            )
          }}
        />
      </p>
    </section>
  );
}
