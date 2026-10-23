import { useId } from 'react';
import env from '@beam-australia/react-env';
import { Link } from '@hive/ui';
import { numberWithCommas } from '@hive/ui/lib/utils';
import { Skeleton } from '@ui/components/skeleton';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import type { DhfFunding } from './hooks/use-dhf-funding';

const HBD_PRECISION = 3;
const HBD_SATOSHIS_PER_UNIT = BigInt(10 ** HBD_PRECISION);
// The FAQ section on the new tokens, of which the DHF receives its share.
const DHF_FAQ_ANCHOR = '#How_many_new_tokens_are_generated_by_the_blockchain';

/** `satoshis` HBD written exactly, with thousands separators, e.g. `23,223,141.076 HBD`. */
const hbdText = (satoshis: bigint) => {
  const whole = numberWithCommas((satoshis / HBD_SATOSHIS_PER_UNIT).toString());
  const fraction = (satoshis % HBD_SATOSHIS_PER_UNIT).toString().padStart(HBD_PRECISION, '0');
  return `${whole}.${fraction} HBD`;
};

function SummaryStat({ label, satoshis, testId }: { label: string; satoshis: bigint; testId: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="font-semibold" data-testid={testId}>
        {hbdText(satoshis)}
      </dd>
    </div>
  );
}

interface ProposalsDhfSummaryProps {
  funding: DhfFunding | undefined;
  isPending: boolean;
}

/** The DHF's budget and what it pays out a day, above the list of proposals. */
export function ProposalsDhfSummary({ funding, isPending }: ProposalsDhfSummaryProps) {
  const { t } = useTranslation('common_wallet');
  const titleId = useId();

  return (
    <section
      className="flex flex-col gap-3 bg-white p-3 text-sm drop-shadow-xl dark:bg-slate-800"
      aria-labelledby={titleId}
      data-testid="dhf-summary"
    >
      <h2 id={titleId} className="font-semibold">
        {t('proposals_page.dhf_title')}
      </h2>
      {isPending ? (
        <Skeleton className="h-10 w-full bg-slate-300 dark:bg-slate-900" />
      ) : funding ? (
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
