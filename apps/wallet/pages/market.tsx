import { convertStringToBig } from '@hive/ui/lib/helpers';
import Loading from '@hive/ui/components/loading';
import Big from 'big.js';
import clsx from 'clsx';
import { useMarket } from '@/wallet/components/hooks/use-market';
import TradeHive from '@/wallet/components/trade-hive';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { getServerSidePropsDefault } from '../lib/get-translations';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

const Box = ({
  label,
  value,
  diff,
  percent = false,
  dollar = false,
  testId
}: {
  label: string;
  value: string;
  diff?: string;
  percent?: boolean;
  dollar?: boolean;
  testId?: string;
}) => {
  return (
    <div className="flex bg-background-secondary px-2 text-xs drop-shadow-md" data-testid={testId}>
      <span className="border-r-[1px] border-border py-1 pr-2 font-semibold" data-testid={testId ? `${testId}-label` : undefined}>{label}</span>
      <span className="py-1 pl-2" data-testid={testId ? `${testId}-value` : undefined}>
        {dollar ? '$' : null}
        {value}
        {percent ? '%' : null}
      </span>
      {diff ? (
        <span
          className={clsx('py-1 ', {
            'text-red-500': Number(diff) < 0,
            'text-green-500': Number(diff) > 0
          })}
          data-testid={testId ? `${testId}-diff` : undefined}
        >
          ({Number(diff) > 0 ? '+' : null}
          {diff + '%'})
        </span>
      ) : null}
    </div>
  );
};

const TAB_TITLE = 'Hive Wallet - Market';
function Market() {
  const { t } = useTranslation('common_wallet');
  const { data: tickerData, isLoading: tickerLoading } = useMarket();

  if (!tickerData || tickerLoading) {
    return <Loading loading />;
  }

  const spread = Big(200).times(
    tickerData.lowest_ask
      .minus(tickerData.highest_bid)
      .div(tickerData.highest_bid.plus(tickerData.lowest_ask))
  );
  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="flex flex-col items-center gap-4 px-4 pb-8" data-testid="market-page">
        <div className="flex w-full flex-wrap justify-center gap-1" data-testid="market-statistics">
          <Box
            label={t('market_page.last_price')}
            value={convertStringToBig(tickerData.latest).toFixed(6)}
            diff={convertStringToBig(tickerData.percent_change).toFixed(2)}
            dollar
            testId="market-last-price"
          />
          <Box
            label={t('market_page.volume')}
            value={convertStringToBig(tickerData?.hbd_volume).toFixed(2)}
            dollar
            testId="market-volume"
          />
          <Box label={t('market_page.bid')} value={tickerData.highest_bid.toFixed(6)} dollar testId="market-bid" />
          <Box label={t('market_page.ask')} value={tickerData.lowest_ask.toFixed(6)} dollar testId="market-ask" />

          <Box label={t('market_page.spread')} value={spread.toFixed(3)} percent testId="market-spread" />
        </div>
        <TradeHive tickerData={tickerData} />
      </div>
    </>
  );
}

export default Market;
