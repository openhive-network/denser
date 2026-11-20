'use client';

import { convertStringToBig } from '@hive/ui/lib/helpers';
import Loading from '@hive/ui/components/loading';
import Big from 'big.js';
import clsx from 'clsx';
import { useMarket } from '@/wallet/components/hooks/use-market';
import TradeHive from '@/wallet/components/trade-hive';
import { useTranslation } from '@/wallet/i18n/client';
import { useLocale } from '@ui/components/locale-context';
import { formatDollars, formatPercent } from '@ui/lib/locale-format';

const PRICE_DECIMALS = 6;

const Box = ({ label, value, diff, testId }: { label: string; value: string; diff?: Big; testId?: string }) => {
  const { locale } = useLocale();
  return (
    <div className="flex bg-background-secondary px-2 text-xs drop-shadow-md" data-testid={testId}>
      <span className="border-r border-border py-1 pr-2 font-semibold" data-testid={testId ? `${testId}-label` : undefined}>{label}</span>
      <span className="py-1 pl-2" data-testid={testId ? `${testId}-value` : undefined}>
        {value}
      </span>
      {diff ? (
        <span
          className={clsx('py-1 ', {
            'text-red-500': diff.lt(0),
            'text-green-500': diff.gt(0)
          })}
          data-testid={testId ? `${testId}-diff` : undefined}
        >
          ({diff.gt(0) ? '+' : null}
          {formatPercent(diff.toNumber(), locale, 2)})
        </span>
      ) : null}
    </div>
  );
};

export default function MarketPage() {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const { data: tickerData, isPending: tickerLoading } = useMarket();

  if (!tickerData || tickerLoading) {
    return <Loading loading />;
  }

  const spread = Big(200).times(
    tickerData.lowest_ask
      .minus(tickerData.highest_bid)
      .div(tickerData.highest_bid.plus(tickerData.lowest_ask))
  );
  return (
    <div className="flex flex-col items-center gap-4 px-4 pb-8" data-testid="market-page">
      <h1 className="sr-only">{t('profile.market')}</h1>
      <div className="flex w-full flex-wrap justify-center gap-1" data-testid="market-statistics">
        <Box
          label={t('market_page.last_price')}
          value={formatDollars(convertStringToBig(tickerData.latest), locale, PRICE_DECIMALS)}
          diff={convertStringToBig(tickerData.percent_change)}
          testId="market-last-price"
        />
        <Box
          label={t('market_page.volume')}
          value={formatDollars(convertStringToBig(tickerData?.hbd_volume), locale)}
          testId="market-volume"
        />
        <Box
          label={t('market_page.bid')}
          value={formatDollars(tickerData.highest_bid, locale, PRICE_DECIMALS)}
          testId="market-bid"
        />
        <Box
          label={t('market_page.ask')}
          value={formatDollars(tickerData.lowest_ask, locale, PRICE_DECIMALS)}
          testId="market-ask"
        />

        <Box
          label={t('market_page.spread')}
          value={formatPercent(spread.toNumber(), locale, 3)}
          testId="market-spread"
        />
      </div>
      <TradeHive tickerData={tickerData} />
    </div>
  );
}
