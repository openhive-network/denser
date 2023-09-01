import Big from "big.js";
import { useMemo, useState } from "react";
import BuyOrSellForm from "./buy-sell-form";
import { MarketTable, HistoryTable, OrdersItem } from "./market-table";
import Loading from "@hive/ui/components/loading";
import { useTradeHistory } from "./hooks/use-trade-history";
import { useOrderBook } from "./hooks/use-order-book";
import moment from "moment";
import Chart from "./chart";

interface Market {
  hbd_volume: string;
  highest_bid: Big;
  hive_volume: string;
  latest: string;
  lowest_ask: Big;
  percent_change: string;
}
const useTradeHive = (refetchInterval = 5000) => {
  const { data: orderData, isLoading: orderLoading } = useOrderBook({
    refetchInterval,
  });
  const { data: recentData, isLoading: recentLoading } = useTradeHistory({
    refetchInterval,
  });
  return {
    isLoading: orderLoading || recentLoading,
    data: {
      order: orderData,
      recent: recentData,
    },
  };
};
const reduced = (data: OrdersItem[]) => {
  return data.reduce(
    (
      newArr: OrdersItem[],
      curr: OrdersItem,
      i: number,
      array: OrdersItem[]
    ) => {
      const lastElement = newArr[newArr.length - 1];
      if (
        i === 0 ||
        Big(array[i - 1].real_price).toFixed(6) !==
          Big(array[i].real_price).toFixed(6)
      ) {
        newArr.push({
          ...curr,
          total: curr.total + (lastElement?.total ?? 0),
        });
      } else {
        newArr[newArr.length - 1] = {
          ...lastElement,
          hive: lastElement.hive + curr.hive,
          hbd: lastElement.hbd + curr.hbd,
          total: lastElement.total + curr.total,
        };
      }
      return newArr;
    },
    []
  );
};
const TradeHive = ({ tickerData }: { tickerData: Market }) => {
  const { data, isLoading } = useTradeHive();
  const [inputAsk, setInputAsk] = useState(tickerData.lowest_ask.toFixed(6));
  const [inputBid, setInputBid] = useState(tickerData.highest_bid.toFixed(6));
  const paramsBuy = ["Total HBD($)", "HBD($)", "Hive", "Price"];
  const paramsSell = ["Price", "Hive", "HBD($)", "Total HBD($)"];
  const paramsHistory = ["Date", "Price", "Hive", "HBD($)"];

  if (!data.order || !data.recent || isLoading) {
    return <Loading loading />;
  }
  const handleSetterPrices = (e: string) => {
    setInputAsk(e);
    setInputBid(e);
  };
  return (
    <div>
      <div className="flex flex-col justify-center items-center">
        <Chart
          bids={reduced(data.order.bids).sort(
            (a, b) => +a.real_price - +b.real_price
          )}
          asks={reduced(data.order.asks)
            .filter((e) => e.total < 50000 && Number(e.real_price) < 0.5)
            .sort((a, b) => +a.real_price - +b.real_price)}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-8">
        <BuyOrSellForm
          price={inputAsk}
          defaultPrice={tickerData.lowest_ask.toFixed(6)}
          transaction="buy"
        />{" "}
        <BuyOrSellForm
          defaultPrice={tickerData.highest_bid.toFixed(6)}
          price={inputBid}
          transaction="sell"
        />
      </div>
      <div className="gap-5 hidden sm:flex">
        <MarketTable
          data={reduced(
            data.order.bids.sort((a, b) => +b.real_price - +a.real_price)
          )}
          params={paramsBuy}
          type="buy"
          label="Buy Order"
          handleSetterPrices={handleSetterPrices}
        />
        <MarketTable
          data={reduced(
            data.order.asks.sort((a, b) => +a.real_price - +b.real_price)
          )}
          params={paramsSell}
          type="sell"
          label="Sell Order"
          handleSetterPrices={handleSetterPrices}
        />
      </div>
      <div className="hidden sm:flex">
        <HistoryTable
          data={data.recent.sort((a, b) => moment(b.date).diff(moment(a.date)))}
          params={paramsHistory}
          label="Trade History"
        />
      </div>
    </div>
  );
};
export default TradeHive;
