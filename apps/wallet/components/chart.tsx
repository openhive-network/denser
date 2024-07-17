import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { OrdersItem } from './market-table';
import Big from 'big.js';
import { getRoundedAbbreveration } from '@ui/lib/utils';
import { useTranslation } from 'next-i18next';

export type PayloadOrder = {
  total: number;
  created: string;
  hbd: number;
  hive: number;
  ask: number;
  bid: number;
  order_price: {
    base: string;
    quote: string;
  };
  real_price: string;
};
interface Payload {
  value: number;
  color: string;
  dataKey: string;
  fill: string;
  fillOpacity: number;
  name: string;
  payload: PayloadOrder;
}
function getWindowWidth() {
  return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
}
const CustomizedDot = ({
  cy,
  cx,
  payload,
  type
}: {
  cy: number;
  cx: number;
  payload: PayloadOrder;
  type: Extract<keyof PayloadOrder, 'ask' | 'bid'>;
}) => {
  if (payload[type] === 0) return null;

  return (
    <circle cx={cx} cy={cy} r={5} stroke="black" strokeWidth={1} fill={type === 'ask' ? 'red' : 'green'} />
  );
};

const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(getWindowWidth());

  useEffect(() => {
    function handleResize() {
      setWindowWidth(getWindowWidth());
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return windowWidth;
};

function getMinMax(bids: number[], asks: number[]) {
  const highestBid = bids.length ? bids[bids.length - 1] : 0;
  const lowestAsk = asks.length ? asks[0] : 1;

  const middle = (highestBid + lowestAsk) / 2;

  return {
    min: Math.max(middle * 0.65, bids[0]),
    max: Math.min(middle * 1.35, asks[asks.length - 1])
  };
}

const CustomTooltip = ({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Payload[];
  label?: number;
}) => {
  const { t } = useTranslation('common_wallet');

  if (active && payload && payload.length) {
    return (
      <div className="bg-background-tertiary p-2 text-sm">
        <p>{t('market_page.price') + `: ${label} $/HIVE`}</p>
        <p>
          {payload[0].value !== 0
            ? t('market_page.bid') + payload[0].value
            : t('market_page.ask') + payload[1].value}
          {' HBD($)'}
        </p>
      </div>
    );
  }
};
const XTick = ({ x, y, payload }: { x: number; y: number; payload: any }) => {
  if (payload)
    return (
      <text x={x - 12} y={y + 12} className="text-xs">
        {(+payload.value).toFixed(2)}
      </text>
    );
  return <></>;
};
const YTick = ({ x, y, payload }: { x: number; y: number; payload: any }) => {
  if (payload)
    return (
      <text x={x} y={y + 12} className="text-xs">
        {getRoundedAbbreveration(new Big(payload.value), 0)}
      </text>
    );
  return <></>;
};

export default function Chart({ bids, asks }: { bids: OrdersItem[]; asks: OrdersItem[] }) {
  const windowWidth = useWindowWidth();
  const data = bids
    .map((e) => ({
      ...e,
      real_price: Big(e.real_price).toFixed(6),
      bid: Number(Big(e.total).toFixed(3)),
      ask: 0
    }))
    .concat(
      asks.map((e) => ({
        ...e,
        real_price: Big(e.real_price).toFixed(6),
        ask: Number(Big(e.total).toFixed(3)),
        bid: 0
      }))
    );

  const maxY = data.reduce((max, current) => {
    return current.total > max ? current.total : max;
  }, 0);

  const { min: minX, max: maxX } = getMinMax(
    bids.map((b) => +b.real_price),
    asks.map((a) => +a.real_price)
  );
  return (
    <>
      <AreaChart
        width={windowWidth / 1.1}
        height={250}
        data={data}
        margin={{
          top: 10,
          right: 0,
          left: 0,
          bottom: 0
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="real_price"
          type="number"
          tickCount={64}
          domain={[minX, maxX]}
          tick={XTick}
          allowDataOverflow={true}
        />
        <YAxis
          orientation="right"
          type="number"
          tickCount={12}
          tickLine={false}
          tick={YTick}
          domain={[0, maxY]}
          allowDataOverflow={true}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="bid"
          stroke=""
          fill="rgb(134 239 172)"
          activeDot={({ cx, cy, payload }) => <CustomizedDot cx={cx} cy={cy} payload={payload} type="bid" />}
        />
        <Area
          type="monotone"
          dataKey="ask"
          stroke=""
          fill="rgb(239 68 68)"
          activeDot={({ cx, cy, payload }) => <CustomizedDot cx={cx} cy={cy} payload={payload} type="ask" />}
        />
      </AreaChart>{' '}
    </>
  );
}
