import { Button } from '@hive/ui';
import clsx from 'clsx';
import { useState } from 'react';
import { dateToRelative } from '@ui/lib/parse-date';
import Big from 'big.js';
import { useTranslation } from 'next-i18next';
import { NaiAsset } from '@hiveio/wax';
import { isHbd } from '@ui/lib/helpers';

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
  const [page, setPage] = useState(0);
  const sliceFrom = page * PAGE_SIZE;
  const sliceTo = page * PAGE_SIZE + 10;
  const testIdPrefix = type === 'buy' ? 'buy-orders' : 'sell-orders';
  return (
    <div className={clsx('mt-4 flex h-[342px] w-1/2 flex-col justify-between')} data-testid={`${testIdPrefix}-section`}>
      <div className="flex flex-col gap-2">
        <div className="text-2xl" data-testid={`${testIdPrefix}-header`}>{label}</div>
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
                    <td data-testid={`${testIdPrefix}-row-${index}-total`}>{e.total.toFixed(3)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hbd`}>{(e.hbd / 1000).toFixed(3)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hive`}>{(e.hive / 1000).toFixed(3)}</td>
                    <td className="p-1 font-semibold" data-testid={`${testIdPrefix}-row-${index}-price`}>{Big(e.real_price).toFixed(6)}</td>
                  </>
                ) : null}
                {type === 'sell' ? (
                  <>
                    <td className="p-1 font-semibold" data-testid={`${testIdPrefix}-row-${index}-price`}>{Big(e.real_price).toFixed(6)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hive`}>{(e.hive / 1000).toFixed(3)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-hbd`}>{(e.hbd / 1000).toFixed(3)}</td>
                    <td data-testid={`${testIdPrefix}-row-${index}-total`}>{e.total.toFixed(3)}</td>
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
        nextLabel={type === 'buy' ? t('market_page.higher') : t('market_page.lower')}
        onPrev={() => {
          setPage((prev) => prev - 1);
        }}
        prevLabel={type === 'sell' ? t('market_page.higher') : t('market_page.lower')}
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
        {nextLabel}
      </Button>
      <Button variant="outlineRed" size="sm" onClick={onNext} disabled={page === totalPages} data-testid={testIdPrefix ? `${testIdPrefix}-pagination-next` : undefined}>
        {prevLabel}
      </Button>
    </div>
  );
};

export function HistoryTable({ data, params, label }: { data: any[]; params: string[]; label: string }) {
  const { t } = useTranslation('common_wallet');
  const [page, setPage] = useState(0);
  const sliceFrom = page * PAGE_SIZE;
  const sliceTo = page * PAGE_SIZE + 10;
  const testIdPrefix = 'trade-history';
  return (
    <div className={clsx('mt-4 flex h-[342px] w-1/2 flex-col justify-between')} data-testid={`${testIdPrefix}-section`}>
      <div className="flex flex-col gap-2">
        <div className="text-2xl" data-testid={`${testIdPrefix}-header`}>{label}</div>

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
                <td title={e.date.replace('T', ' ')} data-testid={`${testIdPrefix}-row-${index}-date`}>{dateToRelative(e.date, t)}</td>
                <td
                  className={clsx({
                    'text-destructive': !isHbd(e.current_pays),
                    'text-green-500': isHbd(e.current_pays)
                  })}
                  data-testid={`${testIdPrefix}-row-${index}-price`}
                  data-trade-type={isHbd(e.current_pays) ? 'buy' : 'sell'}
                >
                  {e.hbd.div(e.hive).toFixed(6)}
                </td>
                <td data-testid={`${testIdPrefix}-row-${index}-hive`}>{e.hive.toFixed(3)}</td>
                <td className="p-1 font-semibold" data-testid={`${testIdPrefix}-row-${index}-hbd`}>{e.hbd.toFixed(3)}</td>
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
        prevLabel={t('market_page.older')}
        page={page}
        totalPages={Math.ceil(data.length / PAGE_SIZE) - 1}
        testIdPrefix={testIdPrefix}
      />
    </div>
  );
}
