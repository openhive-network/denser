'use client';

import { Button } from '@hive/ui';
import clsx from 'clsx';
import { useState } from 'react';
import TimeAgo from '@ui/components/time-ago';
import Big from 'big.js';
import { useTranslation } from '@/wallet/i18n/client';
import { NaiAsset } from '@hiveio/wax';
import { isHbd } from '@ui/lib/helpers';
import { useLocale } from '@ui/components/locale-context';
import { formatNumber } from '@ui/lib/locale-format';

const AMOUNT_DECIMALS = 3;
const PRICE_DECIMALS = 6;

export interface OrdersItem {
  total: number;
  created: string;
  hbd: number;
  hive: number;
  order_price: {
    base: NaiAsset;
    quote: NaiAsset;
  };
  real_price: string;
}
type TradeHistory = {
  hbd: Big;
  hive: Big;
  date: string;
  current_pays: NaiAsset;
  open_pays: NaiAsset;
};
const PAGE_SIZE = 10;

/** Keyboard path to a row's price: its click bubbles to the row, which sets the price. */
const UsePriceButton = ({ price }: { price: string }) => {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  return (
    <button type="button" className="font-semibold" aria-label={t('market_page.use_price', { price: formatNumber(Number(price), locale, PRICE_DECIMALS) })}>
      {formatNumber(Number(price), locale, PRICE_DECIMALS)}
    </button>
  );
};
export function MarketTable({
  data,
  params,
  type,
  label,
  handleSetterPrices
}: {
  data: OrdersItem[];
  params: string[];
  type: 'buy' | 'sell';
  label: string;
  handleSetterPrices: (e: string) => void;
}) {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const [page, setPage] = useState(0);
  const sliceFrom = page * PAGE_SIZE;
  const sliceTo = page * PAGE_SIZE + 10;
  const testIdPrefix = type === 'buy' ? 'buy-orders' : 'sell-orders';
  return (
    <div className={clsx('mt-4 flex h-[342px] w-1/2 flex-col justify-between')} data-testid={`${testIdPrefix}-section`}>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl" data-testid={`${testIdPrefix}-header`}>{label}</h2>
        <table className="table-auto text-end text-xs" data-testid={`${testIdPrefix}-table`}>
          <thead>
            <tr className="bg-background-secondary">
              {params.map((e: string) => (
                <th key={e}>{e}</th>
              ))}
            </tr>
          </thead>
          <tbody data-testid={`${testIdPrefix}-tbody`}>
            {data.slice(sliceFrom, sliceTo).map((e: OrdersItem, index: number) => (
              <tr
                className="relative cursor-pointer after:absolute after:inset-0
                  after:animate-pulse after:bg-slate-500 after:opacity-0 after:repeat-1 even:bg-background-tertiary"
                key={e.real_price}
                onClick={() => handleSetterPrices(Big(e.real_price).toFixed(6))}
                data-testid={`${testIdPrefix}-row-${index}`}
              >
                {type === 'buy' ? (
                  <>
                    <td data-testid={`${testIdPrefix}-row-${index}-total`}>{formatNumber(e.total, locale, AMOUNT_DECIMALS)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hbd`}>{formatNumber(e.hbd / 1000, locale, AMOUNT_DECIMALS)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hive`}>{formatNumber(e.hive / 1000, locale, AMOUNT_DECIMALS)}</td>
                    <td className="p-1 font-semibold" data-testid={`${testIdPrefix}-row-${index}-price`}>
                      <UsePriceButton price={Big(e.real_price).toFixed(6)} />
                    </td>
                  </>
                ) : null}
                {type === 'sell' ? (
                  <>
                    <td className="p-1 font-semibold" data-testid={`${testIdPrefix}-row-${index}-price`}>
                      <UsePriceButton price={Big(e.real_price).toFixed(6)} />
                    </td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hive`}>{formatNumber(e.hive / 1000, locale, AMOUNT_DECIMALS)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hbd`}>{formatNumber(e.hbd / 1000, locale, AMOUNT_DECIMALS)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-total`}>{formatNumber(e.total, locale, AMOUNT_DECIMALS)}</td>
                  </>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        onNext={() => {
          setPage((prev) => prev + 1);
        }}
        nextLabel={type === 'buy' ? t('market_page.lower') : t('market_page.higher')}
        onPrev={() => {
          setPage((prev) => prev - 1);
        }}
        prevLabel={type === 'buy' ? t('market_page.higher') : t('market_page.lower')}
        page={page}
        totalPages={Math.ceil(data.length / PAGE_SIZE) - 1}
        testIdPrefix={testIdPrefix}
      />
    </div>
  );
}

interface TablePaginationProps {
  onNext: () => void;
  onPrev: () => void;
  page: number;
  totalPages: number;
  nextLabel: string;
  prevLabel: string;
  testIdPrefix?: string;
}
const TablePagination = ({
  onNext,
  onPrev,
  page,
  totalPages,
  nextLabel,
  prevLabel,
  testIdPrefix
}: TablePaginationProps) => {
  return (
    <div className="flex w-full justify-between" data-testid={testIdPrefix ? `${testIdPrefix}-pagination` : undefined}>
      <Button variant="outlineRed" size="sm" onClick={onPrev} disabled={!page} data-testid={testIdPrefix ? `${testIdPrefix}-pagination-prev` : undefined}>
        {prevLabel}
      </Button>
      <Button variant="outlineRed" size="sm" onClick={onNext} disabled={page === totalPages} data-testid={testIdPrefix ? `${testIdPrefix}-pagination-next` : undefined}>
        {nextLabel}
      </Button>
    </div>
  );
};

export function HistoryTable({ data, params, label }: { data: any[]; params: string[]; label: string }) {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const [page, setPage] = useState(0);
  const sliceFrom = page * PAGE_SIZE;
  const sliceTo = page * PAGE_SIZE + 10;
  const testIdPrefix = 'trade-history';
  return (
    <div className={clsx('mt-4 flex h-[342px] w-1/2 flex-col justify-between')} data-testid={`${testIdPrefix}-section`}>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl" data-testid={`${testIdPrefix}-header`}>{label}</h2>

        <table className="table-auto text-end text-xs" data-testid={`${testIdPrefix}-table`}>
          <thead>
            <tr className="bg-background-secondary">
              {params.map((e: string) => (
                <th key={e}>{e}</th>
              ))}
            </tr>
          </thead>
          <tbody data-testid={`${testIdPrefix}-tbody`}>
            {data.slice(sliceFrom, sliceTo).map((e: TradeHistory, index: number) => (
              <tr className="even:bg-background-tertiary" key={`${e.date}-${index}`} data-testid={`${testIdPrefix}-row-${index}`}>
                <td title={e.date.replace('T', ' ')} data-testid={`${testIdPrefix}-row-${index}-date`}><TimeAgo date={e.date} /></td>
                <td
                  className={clsx({
                    'text-destructive': !isHbd(e.current_pays),
                    'text-green-500': isHbd(e.current_pays)
                  })}
                  data-testid={`${testIdPrefix}-row-${index}-price`}
                  data-trade-type={isHbd(e.current_pays) ? 'buy' : 'sell'}
                >
                  {formatNumber(e.hbd.div(e.hive), locale, PRICE_DECIMALS)}
                </td>
                <td data-testid={`${testIdPrefix}-row-${index}-hive`}>{formatNumber(e.hive, locale, AMOUNT_DECIMALS)}</td>
                <td className="p-1 font-semibold" data-testid={`${testIdPrefix}-row-${index}-hbd`}>{formatNumber(e.hbd, locale, AMOUNT_DECIMALS)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        onNext={() => {
          setPage((prev) => prev + 1);
        }}
        nextLabel={t('market_page.older')}
        onPrev={() => {
          setPage((prev) => prev - 1);
        }}
        prevLabel={t('market_page.newer')}
        page={page}
        totalPages={Math.ceil(data.length / PAGE_SIZE) - 1}
        testIdPrefix={testIdPrefix}
      />
    </div>
  );
}
