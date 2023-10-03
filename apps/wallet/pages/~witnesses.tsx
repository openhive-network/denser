import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Big from "big.js";
import { getAccounts, getDynamicGlobalProperties } from "@hive/ui/lib/hive";
import { Icons } from "@hive/ui/components/icons";
import { Input } from "@hive/ui/components/input";
import { FullAccount } from "@hive/ui/store/app-types";
import { convertStringToBig } from "@hive/ui/lib/helpers";
import { useRouter } from "next/router";
import { Button } from "@hive/ui/components/button";
import { Witness, getWitnessesByVote } from "@/wallet/lib/hive";
import WitnessListItem from "@/wallet/components/witnesses-list-item";
import DialogLogin from "../components/dialog-login";
import { AlertDialogProxy } from "../components/alert-dialog-proxy";

const LAST_BLOCK_AGE_THRESHOLD_IN_SEC = 2592000;

const mapWitnesses =
  (totalVesting: Big, totalShares: Big, headBlock: number) =>
  (witness: Witness, i: number, witnessList: Witness[]) => {
    const vestsToHpPrev = witnessList[i - 1]
      ? totalVesting
          .times(Big(witnessList[i - 1].votes).div(totalShares))
          .div(1000000)
      : 0;
    const vestsToHp = Big(
      totalVesting.times(Big(witness.votes).div(totalShares))
    ).div(1000000);
    const deltaHpf = Big(vestsToHpPrev).minus(vestsToHp);
    return {
      ...witness,
      rank: i + 1,
      vestsToHp,
      requiredHpToRankUp: deltaHpf.gt(0) ? deltaHpf : null,
      witnessLastBlockAgeInSecs:
        (headBlock - witness.last_confirmed_block_num) * 3,
      url: witness.url.replace("steemit.com", "hive.blog"),
    };
  };
export type ExtendWitness = ReturnType<ReturnType<typeof mapWitnesses>>;
function WitnessesPage() {
  const [voteInput, setVoteInput] = useState("");
  const [proxy, setProxy] = useState("");
  const {
    data: dynamicData,
    isSuccess: dynamicSuccess,
    isLoading: dynamicLoading,
    isError: dynamicError,
  } = useQuery(
    ["dynamicGlobalProperties"],
    () => getDynamicGlobalProperties(),
    {
      select: (data) => {
        return {
          ...data,
          total_vesting_fund_hive: convertStringToBig(
            data.total_vesting_fund_hive
          ),
          total_vesting_shares: convertStringToBig(data.total_vesting_shares),
        };
      },
    }
  );
  const headBlock = dynamicData?.head_block_number ?? 0;
  const totalVesting = dynamicData?.total_vesting_fund_hive ?? Big(0);
  const totalShares = dynamicData?.total_vesting_shares ?? Big(0);

  const {
    data: witnessesData,
    isLoading: witnessesLoading,
    isSuccess: witnessesSuccess,
    isError: witnessError,
  } = useQuery(["wintesses"], () => getWitnessesByVote("", 250), {
    select: (witnesses) => {
      return witnesses
        .map(mapWitnesses(totalVesting, totalShares, headBlock))
        .filter(
          (witness) =>
            witness.rank <= 101 ||
            witness.witnessLastBlockAgeInSecs <= LAST_BLOCK_AGE_THRESHOLD_IN_SEC
          //&& !myVote need LOGIN
        );
    },
    enabled: dynamicSuccess,
  });
  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError,
  } = useQuery(
    ["accountsData"],
    async () => {
      const res = await getAccounts(witnessesData!.map((wit) => wit.owner));
      return res.reduce((prev, curr) => {
        prev.set(curr.name, curr);
        return prev;
      }, new Map<string, FullAccount>());
    },
    { enabled: witnessesSuccess || Boolean(witnessesData) }
  );
  const router = useRouter();

  useEffect(() => {
    if (Array.isArray(router.query.highlight)) {
      setVoteInput(router.query.highlight[0]);
    } else {
      setVoteInput(router.query.highlight ?? "");
    }
  }, [router.query.highlight]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mx-2 flex flex-col gap-4">
        <div className="text-xl md:text-4xl" data-testid="witness-header">
          Witness Voting
        </div>
        <p className="text-xs sm:text-sm" data-testid="witness-header-vote">
          <span
            className="font-semibold "
            data-testid="witness-header-vote-remaining"
          >
            You have 30 votes remaining.
          </span>{" "}
          You can vote for a maximum of 30 witnesses.
        </p>
        <p
          className="text-xs sm:text-sm"
          data-testid="witness-header-description"
        >
          Notes: in the list below, the first 100 witnesses are unfiltered, this
          includes active and inactive witnesses. Past the rank of 100,
          witnesses will be filtered out of the list if they have not produced
          any block for the last 30 days.
        </p>
      </div>
      <table className="mt-4 w-full table-auto text-xs">
        <thead
          className=" h-10 bg-zinc-100 text-left  dark:bg-slate-900"
          data-testid="witness-table-head"
        >
          <tr className="sm:text-sm font-semibold">
            <th className="p-2">Rank</th>
            <th className="p-2">Witness</th>
            <th className="p-2">Votes received</th>
            <th className="p-2">Price feed</th>
          </tr>
        </thead>
        <tbody data-testid="witness-table-body">
          {witnessesLoading || dynamicLoading || accountLoading ? (
            <tr>
              <td className="animate-pulse p-2 text-xl">Loading</td>

              <td className="animate-pulse p-2 text-xl">Loading</td>

              <td className="animate-pulse p-2 text-xl">Loading</td>

              <td className="animate-pulse p-2 text-xl">Loading</td>
            </tr>
          ) : !witnessesData || !dynamicData || !accountData ? (
            <tr>
              <td className="animate-pulse p-2 text-xl">
                Something went wrong
              </td>
              <td className="animate-pulse p-2 text-xl">
                Something went wrong
              </td>
              <td className="animate-pulse p-2 text-xl">
                Something went wrong
              </td>
              <td className="animate-pulse p-2 text-xl">
                Something went wrong
              </td>
            </tr>
          ) : (
            witnessesData.map((element) => (
              <WitnessListItem
                data={element}
                witnessAccount={accountData?.get(element.owner)}
                key={element.id}
                headBlock={headBlock}
              />
            ))
          )}
        </tbody>
      </table>
      <div className="my-8 flex flex-col gap-8 p-2">
        <div className="flex flex-col gap-4" data-testid="witnesses-vote-box">
          <p className="text-xs sm:text-sm">
            If you would like to vote for a witness outside of the top 200,
            enter the account name below to cast a vote.
          </p>
          <div className="flex items-center">
            <span className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-black bg-slate-300 font-bold dark:bg-slate-700">
              <Icons.atSign />
            </span>
            <Input
              className="mx-1 max-w-sm"
              value={voteInput}
              onChange={(e) => setVoteInput(e.target.value)}
            />
            <DialogLogin>
              <Button variant="destructive">VOTE</Button>
            </DialogLogin>
          </div>
        </div>
        <div
          className="flex flex-col gap-4"
          data-testid="witnesses-set-proxy-box"
        >
          <p className="text-xs sm:text-sm">
            You can also choose a proxy that will vote for witnesses for you.
            This will reset your current witness selection.
          </p>
          <div className="flex items-center">
            <span className="max-w-12 flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-black bg-slate-300 font-bold dark:bg-slate-700">
              <Icons.atSign />
            </span>
            <Input
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              className="mx-1 max-w-sm"
            />
            <AlertDialogProxy proxy={proxy}>
              <Button variant="destructive">SET PROXY</Button>
            </AlertDialogProxy>
          </div>
        </div>
      </div>
    </div>
  );
}
export default WitnessesPage;
