import { useQuery } from "@tanstack/react-query";
import Big from "big.js";
import {
  getAccount,
  getDynamicGlobalProperties,
  getFeedHistory,
} from "@hive/ui/lib/hive";
import { getAccountHistory } from "@/wallet/lib/hive";
import { getCurrentHpApr } from "@/wallet/lib/utils";
import { delegatedHive, vestingHive } from "@hive/ui/lib/utils";
import { numberWithCommas } from "@hive/ui/lib/utils";
import { dateToFullRelative } from "@hive/ui/lib/parse-date";
import { convertStringToBig } from "@hive/ui/lib/helpers";
import { AccountHistory } from "@/wallet/store/app-types";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import Loading from "@hive/ui/components/loading";
import TransfersHistoryFilter, {
  TransferFilters,
} from "@/wallet/components/transfers-history-filter";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== "@") {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      username: username.replace("@", ""),
    },
  };
};

const initialFilters: TransferFilters = {
  search: "",
  rewards: true,
  incoming: true,
  outcoming: true,
  exlude: false,
};
type Transfer = {
  type: "transfer";
  amount?: string;
  from?: string;
  memo?: string;
  to?: string;
};
type ClaimRewardBalance = {
  type: "claim_reward_balance";
  account?: string;
  reward_hbd: Big;
  reward_hive: Big;
  reward_vests: Big;
};
type Operation = Transfer | ClaimRewardBalance;

const mapToAccountHistoryObject = ([id, data]: AccountHistory) => {
  const { op, ...rest } = data;
  const operation: Operation | undefined =
    op && op[0] === "transfer"
      ? {
          type: "transfer",
          amount: op[1].amount,
          from: op[1].from,
          memo: op[1].memo,
          to: op[1].to,
        }
      : op && op[0] === "claim_reward_balance"
      ? {
          type: "claim_reward_balance",
          account: op[1].account,
          reward_hbd: convertStringToBig(op[1]?.reward_hbd ?? "0"),
          reward_hive: convertStringToBig(op[1]?.reward_hive ?? "0"),
          reward_vests: convertStringToBig(op[1]?.reward_vests ?? "0"),
        }
      : undefined;

  return { id, ...rest, operation };
};

function TransfersPage({
  username,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [filter, setFilter] = useState<TransferFilters>(initialFilters);

  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError,
  } = useQuery(["accountData", username], () => getAccount(username), {
    enabled: Boolean(username),
  });
  const {
    data: dynamicData,
    isSuccess: dynamicSuccess,
    isLoading: dynamicLoading,
    isError: dynamicError,
  } = useQuery(["dynamicGlobalProperties"], () => getDynamicGlobalProperties());
  const {
    data: accountHistoryData,
    isLoading: accountHistoryLoading,
    isError: accountHistoryError,
  } = useQuery(
    ["accountHistory", username],
    () => getAccountHistory(username, -1, 500),
    {
      select: (data) => data.map(mapToAccountHistoryObject),
    }
  );
  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isError: historyFeedError,
  } = useQuery(["feedHistory"], () => getFeedHistory());

  if (accountLoading || dynamicLoading || historyFeedLoading) {
    return (
      <Loading
        loading={accountLoading || dynamicLoading || historyFeedLoading}
      />
    );
  }
  if (!accountData || !dynamicData || !historyFeedData || !accountHistoryData) {
    return <p className="my-32 text-center text-3xl">Something went wrong</p>;
  }

  const totalFund = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const historyFeedArr = historyFeedData.price_history;
  const price_per_hive = convertStringToBig(
    historyFeedArr[historyFeedArr.length - 1].base
  );
  const totalShares = convertStringToBig(dynamicData.total_vesting_shares);
  const vesting_hive = vestingHive(accountData, dynamicData);
  const delegated_hive = delegatedHive(accountData, dynamicData);
  const received_power_balance =
    (delegated_hive.lt(0) ? "+" : "") +
    numberWithCommas((-delegated_hive).toFixed(3));
  const saving_balance_hive = convertStringToBig(accountData.savings_balance);
  const hbd_balance = convertStringToBig(accountData.hbd_balance);
  const hbd_balance_savings = convertStringToBig(
    accountData.savings_hbd_balance
  );
  const balance_hive = convertStringToBig(accountData.balance);
  const savings_hbd_pending = 0; //NEED TO LOGIN
  const hbdOrders = 0; //NEED TO LOGIN
  const conversionValue = 0; //NEED TO LOGIN
  const savings_pending = 0; //NEED TO LOGIN
  const hiveOrders = 0; //NEED TO LOGIN
  //estimated account value, no correct
  const total_hbd = hbd_balance
    .plus(hbd_balance_savings)
    .plus(savings_hbd_pending)
    .plus(hbdOrders)
    .plus(conversionValue);
  const total_hive = vesting_hive
    .plus(balance_hive)
    .plus(saving_balance_hive)
    .plus(savings_pending)
    .plus(hiveOrders);
  const total_value = numberWithCommas(
    total_hive.times(Big(price_per_hive)).plus(total_hbd).toFixed(2)
  );

  const filteredHistoryList = accountHistoryData?.filter(({ operation }) => {
    if (!operation) return false;
    if (operation.type === "transfer") {
      const opAmount = convertStringToBig(operation.amount ?? "0");
      if (filter.exlude && opAmount.lt(1)) return false;

      if (!filter.incoming && operation.to === username) return false;
      if (!filter.outcoming && operation.from === username) return false;
      return (
        operation.to?.includes(filter.search) ||
        operation.from?.includes(filter.search)
      );
    }
    if (operation.type === "claim_reward_balance") {
      if (
        filter.exlude &&
        operation.reward_hbd.lt(1) &&
        operation.reward_hive.lt(1) &&
        totalFund.times(operation.reward_vests.div(totalShares)).lt(1)
      )
        return false;
      if (!filter.rewards) return false;
    }

    return true;
  });

  function historyItemDescription(operation: Operation) {
    if (operation.type === "claim_reward_balance") {
      const powerHP = totalFund.times(operation.reward_vests.div(totalShares));
      const displayHBD = operation.reward_hbd.gt(0);
      const displayHIVE = operation.reward_hive.gt(0);

      return (
        <span>
          {"Claim rewards: "}
          {displayHBD && (
            <span>
              {operation.reward_hbd.toString() +
                " HBD " +
                (displayHIVE ? ", " : "and ")}
            </span>
          )}
          {displayHIVE && (
            <span>{operation.reward_hive.toString() + " HIVE and "}</span>
          )}
          {powerHP.toFixed(3)}
          {" HIVE POWER"}
        </span>
      );
    }
    if (operation.type === "transfer") {
      if (operation.to === username)
        return (
          <span>
            {"Received "} {operation.amount?.toString()} {" from "}{" "}
            <Link
              href={`/@${operation.from}`}
              className="font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400"
            >
              {operation.from}
            </Link>
          </span>
        );
      if (operation.from === username)
        return (
          <span>
            {"Transfer "}
            {operation.amount?.toString()} {" to "}{" "}
            <Link
              href={`/@${operation.to}`}
              className="font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400"
            >
              {operation.to}
            </Link>
          </span>
        );
    }
  }
  return (
    <div>
      <div className="flex gap-6 border-b-2 border-zinc-500 px-4 py-2">
        <a href="" className="hover:text-red-600 dark:hover:text-red-400">
          Balances
        </a>
        <Link href={`/@${username}/delegations`}>
          <div className="hover:text-red-600 dark:hover:text-red-400">
            Delegations
          </div>
        </Link>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 p-2">
          <div className="font-bold">HIVE</div>
          <p className="text-xs text-zinc-600">
            Tradeable tokens that may be transferred anywhere at anytime. Hive
            can be converted to HIVE POWER in a process called powering up.
          </p>
          <div className="font-bold">
            {numberWithCommas(balance_hive.toFixed(3)) + " HIVE"}
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2">
          <div className="font-bold">HIVE POWER</div>
          <p className="text-xs text-zinc-600 ">
            Influence tokens which give you more control over post payouts and
            allow you to earn on curation rewards. Part of {accountData?.name}
            &apos;s HIVE POWER is currently delegated. Delegation is donated for
            influence or to help new users perform actions on Hive. Your
            delegation amount can fluctuate. HIVE POWER increases at an APR of
            approximately {getCurrentHpApr(dynamicData).toFixed(2)}%, subject to
            blockchain variance.{" "}
            <span className="font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400">
              <Link href="https://hive.blog/faq.html#How_many_new_tokens_are_generated_by_the_blockchain">
                See FAQ for details.
              </Link>
            </span>
          </p>
          <div className="flex flex-col font-bold ">
            <span>{numberWithCommas(vesting_hive.toFixed(3)) + " HIVE"}</span>
            <span>({received_power_balance + " HIVE"})</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2">
          <div className="font-bold">HIVE DOLLARS</div>
          <p className="text-xs text-zinc-600">
            Tradeable tokens that may be transferred anywhere at anytime.
          </p>
          <div className="font-bold">
            {"$" + numberWithCommas(hbd_balance.toFixed(3))}
          </div>
        </div>
        <div className="flex flex-col gap-2 p-2">
          <div className="font-bold">SAVINGS</div>
          <p className="text-xs text-zinc-600">
            &quot;Balances subject to 3 day withdraw waiting period. HBD
            interest rate: 20.00% APR (as voted by the{" "}
            <span className="font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400">
              {<Link href={`../~witnesses`}>Witnesses</Link>}
            </span>
            )&quot;
          </p>
          <div className="flex flex-col font-bold">
            <span>{saving_balance_hive.toFixed(3) + " HIVE"}</span>
            <span>
              {numberWithCommas("$" + hbd_balance_savings.toFixed(3))}
            </span>
          </div>
        </div>
        <div className="flex  flex-col gap-2 p-2">
          <div className="font-bold">Estimated Account Value</div>
          <p className="text-xs text-zinc-600">
            The estimated value is based on an average value of Hive in US
            dollars.
          </p>
          <div className="font-bold">{"$" + total_value}</div>
        </div>
      </div>
      <TransfersHistoryFilter
        onFiltersChange={(value) => {
          setFilter((prevFilters) => ({
            ...prevFilters,
            ...value,
          }));
        }}
        value={filter}
      />
      <div className="p-2">
        <div className="font-bold">Account History</div>
        <p className="text-xs text-zinc-600">
          Beware of spam and phishing links in transfer memos. Do not open links
          from users you do not trust. Do not provide your private keys to any
          third party websites. Transactions will not show until they are
          confirmed on the blockchain, which may take a few minutes.
        </p>
      </div>
      {accountHistoryLoading ? (
        <div>Loading</div>
      ) : !accountHistoryData ? (
        <div>error</div>
      ) : (
        accountHistoryData && (
          <table className="p-2">
            <tbody>
              {filteredHistoryList?.reverse().map((element) => {
                if (!element.operation) return null;
                return (
                  <tr
                    key={element.id}
                    className="m-0 p-0 text-sm text-xs even:bg-slate-100 dark:even:bg-slate-700 sm:text-sm"
                  >
                    <td className=" px-4 py-2 ">
                      {dateToFullRelative(element.timestamp)}
                    </td>
                    <td className=" da px-4 py-2 ">
                      {historyItemDescription(element.operation)}
                    </td>
                    <td className="break-all px-4 py-2 ">
                      {element.operation.type === "transfer"
                        ? element.operation.memo
                        : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
export default TransfersPage;
