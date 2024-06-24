import { useQuery } from '@tanstack/react-query';
import { getAccount } from '@transaction/lib/hive';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import Loading from '@hive/ui/components/loading';
import Big from 'big.js';
import clsx from 'clsx';
import { useMarket } from '@/wallet/components/hooks/use-market';
import TradeHive from '@/wallet/components/trade-hive';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { getServerSidePropsDefault } from '../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

const Box = ({
  label,
  value,
  diff,
  percent = false,
  dollar = false
}: {
  label: string;
  value: string;
  diff?: string;
  percent?: boolean;
  dollar?: boolean;
}) => {
  return (
    <div className="flex bg-slate-100 px-2 text-xs drop-shadow-md dark:bg-slate-800">
      <span className="border-r-[1px] border-black py-1 pr-2 font-semibold">{label}</span>
      <span className="py-1 pl-2">
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
        >
          ({Number(diff) > 0 ? '+' : null}
          {diff + '%'})
        </span>
      ) : null}
    </div>
  );
};

function Market() {
  const { t } = useTranslation('common_wallet');
  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError
  } = useQuery(['accountData', 'market'], () => getAccount('market'));

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
    <div className="flex flex-col items-center gap-4 px-4 pb-8">
      <div className="flex w-full flex-wrap justify-center gap-1">
        <Box
          label={t('market_page.last_price')}
          value={convertStringToBig(tickerData.latest).toFixed(6)}
          diff={convertStringToBig(tickerData.percent_change).toFixed(2)}
          dollar
        />
        <Box
          label={t('market_page.volume')}
          value={convertStringToBig(tickerData?.hbd_volume).toFixed(2)}
          dollar
        />
        <Box label={t('market_page.bid')} value={tickerData.highest_bid.toFixed(6)} dollar />
        <Box label={t('market_page.ask')} value={tickerData.lowest_ask.toFixed(6)} dollar />

        <Box label={t('market_page.spread')} value={spread.toFixed(3)} percent />
      </div>
      <TradeHive tickerData={tickerData} />
    </div>
  );
}

export default Market;
