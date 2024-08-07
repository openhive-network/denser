import { Button } from '@hive/ui';
import clsx from 'clsx';
import { useState } from 'react';
import { dateToRelative } from '@ui/lib/parse-date';
import Big from 'big.js';
import { useTranslation } from 'next-i18next';

export interface OrdersItem {
  total: number;
  created: string;
  hbd: number;
  hive: number;
  order_price: {
    base: string;
    quote: string;
  };
  real_price: string;
}
type TradeHistory = {
  hbd: Big;
  hive: Big;
  date: string;
  current_pays: string;
  open_pays: string;
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
  return (
    <div className={clsx('mt-4 flex h-[342px] w-1/2 flex-col justify-between')}>
      <div className="flex flex-col gap-2">
        <div className="text-2xl ">{label}</div>
        <table className="table-auto text-end text-xs">
          <thead>
            <tr className="bg-background-secondary">
              {params.map((e: string) => (
                <th key={e}>{e}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(sliceFrom, sliceTo).map((e: OrdersItem) => (
              <tr
                className="relative cursor-pointer after:absolute after:inset-0
                  after:animate-pulse after:bg-slate-500 after:opacity-0 after:repeat-1 even:bg-background-tertiary"
                key={e.real_price}
                onClick={() => handleSetterPrices(Big(e.real_price).toFixed(6))}
              >
                {type === 'buy' ? (
                  <>
                    <td>{e.total.toFixed(3)}</td>
                    <td>{(e.hbd / 1000).toFixed(3)}</td>
                    <td>{(e.hive / 1000).toFixed(3)}</td>
                    <td className="p-1 font-semibold">{Big(e.real_price).toFixed(6)}</td>
                  </>
                ) : null}
                {type === 'sell' ? (
                  <>
                    <td className="p-1 font-semibold">{Big(e.real_price).toFixed(6)}</td>
                    <td>{(e.hive / 1000).toFixed(3)}</td>
                    <td>{(e.hbd / 1000).toFixed(3)}</td>
                    <td>{e.total.toFixed(3)}</td>
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
}
const TablePagination = ({
  onNext,
  onPrev,
  page,
  totalPages,
  nextLabel,
  prevLabel
}: TablePaginationProps) => {
  return (
    <div className="flex w-full justify-between">
      <Button variant="outlineRed" size="sm" onClick={onPrev} disabled={!page}>
        {nextLabel}
      </Button>
      <Button variant="outlineRed" size="sm" onClick={onNext} disabled={page === totalPages}>
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
  return (
    <div className={clsx('mt-4 flex h-[342px] w-1/2 flex-col justify-between')}>
      <div className="flex flex-col gap-2">
        <div className="text-2xl ">{label}</div>

        <table className="table-auto text-end text-xs">
          <thead>
            <tr className="bg-background-secondary">
              {params.map((e: string) => (
                <th key={e}>{e}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(sliceFrom, sliceTo).map((e: TradeHistory) => (
              <tr className="even:bg-background-tertiary" key={Math.random()}>
                <td title={e.date.replace('T', ' ')}>{dateToRelative(e.date, t)}</td>
                <td
                  className={clsx({
                    'text-destructive': e.current_pays.includes('HIVE'),
                    'text-green-500': e.current_pays.includes('HBD')
                  })}
                >
                  {e.hbd.div(e.hive).toFixed(6)}
                </td>
                <td>{e.hive.toFixed(3)}</td>
                <td className="p-1 font-semibold">{e.hbd.toFixed(3)}</td>
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
      />
    </div>
  );
}
