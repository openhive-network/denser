import Link from "next/link";
import { ExtendWitness } from "@/wallet/pages/~witnesses";
import clsx from "clsx";
import { DISABLED_SIGNING_KEY } from "@/wallet/lib/constants";
import { blockGap, getRoundedAbbreveration } from "@hive/ui/lib/utils";
import { Icons } from "@hive/ui/components/icons";
import { FullAccount } from "@hive/ui/store/app-types";
import moment from "moment";
import { dateToFullRelative } from "@hive/ui/lib/parse-date";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import DialogLogin from "./dialog-login";

const getOwnersString = (owners?: string) => {
  if (!owners) return "";
  const ownersArray = owners.split(",");
  const lastOwner = ownersArray.pop();
  if (ownersArray.length === 0) return lastOwner;
  return ownersArray.join(", ") + " & " + lastOwner;
};

interface WitnessListItemProps {
  data: ExtendWitness;
  witnessAccount?: FullAccount;
  headBlock: number;
}

const ONE_WEEK_IN_SEC = 604800;

function WitnessListItem({
  data,
  headBlock,
  witnessAccount,
}: WitnessListItemProps) {
  const disableUser = data.signing_key === DISABLED_SIGNING_KEY;

  const witnessDescription = witnessAccount?.profile?.witness_description;
  const witnessOwner = witnessAccount?.profile?.witness_owner;

  function witnessLink() {
    if (disableUser)
      return (
        <span>
          {"Disabled "}
          {blockGap(headBlock, data.last_confirmed_block_num)}
        </span>
      );
    if (!data.url.includes("http")) return <>(No URL provided)</>;

    if (data.url.includes("hive.blog") || data.url.includes("localhost"))
      return (
        <Link
          href={data.url}
          target="_blank"
          className="flex items-center gap-2 font-semibold hover:text-red-400 dark:hover:text-red-400"
        >
          <span>Open witness annoucement</span>
          <Icons.forward className="text-red-600 dark:text-red-500" />
        </Link>
      );
    return (
      <Link
        href={data.url}
        target="_blank"
        className="flex items-center gap-2 font-semibold hover:text-red-400 dark:hover:text-red-400"
      >
        <span>Open external site</span>
        <Icons.forward className="text-red-600 dark:text-red-500" />
      </Link>
    );
  }

  const router = useRouter();

  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    let highlight = "";
    if (Array.isArray(router.query.highlight)) {
      highlight = router.query.highlight[0];
    } else {
      highlight = router.query.highlight ?? "";
    }
    if (highlight === data.owner && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [router.query.highlight]);

  return (
    <tr
      className={clsx({
        "bg-rose-200  dark:bg-rose-800": router.query.highlight === data.owner,
        "even:bg-zinc-100 dark:even:bg-slate-900":
          router.query.highlight !== data.owner,
      })}
      ref={ref}
    >
      <td>
        <div className="flex flex-col-reverse items-center gap-1 sm:flex-row sm:p-2">
          <span className="sm:text-sm">
            {data.rank < 10 ? `0${data.rank}` : data.rank}
          </span>
          <DialogLogin>
            <div title="vote" className="group relative flex" data-testid="witness-vote">
              <span className="opocity-75 absolute inline-flex h-5 w-5 rounded-full bg-red-600 p-0 group-hover:animate-ping dark:bg-red-400"></span>
              <Icons.arrowUpCircle
                viewBox="1.7 1.7 20.7 20.7"
                className={clsx(
                  "relative inline-flex h-5 w-5 rounded-full stroke-1 text-red-600 dark:text-red-500 cursor-pointer",
                  {
                    "bg-slate-100 dark:bg-slate-900":
                      router.query.highlight !== data.owner,
                    "bg-rose-200  dark:bg-rose-800":
                      router.query.highlight === data.owner,
                  }
                )}
              />
            </div>
          </DialogLogin>
        </div>
      </td>
      <td className="font-light md:font-normal">
        <div className="flex" data-testid="witness-list-item-info">
          <div
            className="hidden p-2 sm:block self"
            title="Navigate to this user's profile"
          >
            <Link href={`http://localhost:3000/@${data.owner}`} target="_blank">
              <img
                className={clsx("mr-1 h-[47px] min-w-[47px] rounded-full", {
                  "opacity-50": disableUser,
                })}
                height="40"
                width="40"
                src={`https://images.hive.blog/u/${data.owner}/avatar`}
                alt={`${data.owner} profile picture`}
              />
            </Link>
          </div>
          <div className="flex flex-col gap-1 py-1 sm:px-2">
            <div className="flex items-center gap-2">
              <Link
                href={`http://localhost:3000/@${data.owner}`}
                data-testid="witness-name-link"
                target="_blank"
                title="Navigate to this user's profile"
              >
                {
                  <div
                    className={clsx(
                      "font-semibold sm:text-sm",
                      {
                        "text-gray-500 line-through opacity-50 dark:text-gray-300":
                          disableUser,
                      },
                      {
                        "font-bold text-red-500": !disableUser,
                      }
                    )}
                  >
                    {data.owner}
                  </div>
                }
              </Link>
              {witnessOwner && (
                <div className="text-xs  text-gray-600 sm:text-sm  ">
                  by {getOwnersString(witnessOwner)}
                </div>
              )}

              <Link
                href={
                  router.query.highlight !== data.owner
                    ? `/~witnesses?highlight=${data.owner}`
                    : `/~witnesses`
                }
                replace
                scroll={false}
                data-testid="witness-highlight-link"
              >
                <Icons.link className="h-[1em] w-[1em]" />
              </Link>
            </div>
            {!disableUser && witnessDescription && (
              <div className="ml-4 mb-1 hidden max-h-16 max-w-lg overflow-y-auto overflow-x-hidden border-b-[1px] border-dotted border-gray-400 p-1 italic sm:block">
                {witnessDescription}
              </div>
            )}

            {data.witnessLastBlockAgeInSecs > ONE_WEEK_IN_SEC && (
              <span className="font-semibold">
                ⚠️Has not produced any blocks for over a week.
              </span>
            )}
            <div>
              Last block{" "}
              <Link
                href={`https://hiveblocks.com/b/${data.last_confirmed_block_num}`}
                className="text-red-500"
                data-testid="last-block-number"
              >
                <span className="font-semibold ">
                  #{data.last_confirmed_block_num}
                </span>
              </Link>{" "}
              {blockGap(headBlock, data.last_confirmed_block_num)} v
              {data.running_version}
            </div>
            {disableUser ? (
              <></>
            ) : (
              <div data-testid="witness-created">
                Witness age: {moment().from(data.created, true)}
              </div>
            )}

            <div data-testid="witness-external-site-link">{witnessLink()}</div>
          </div>
        </div>
      </td>
      <td className="p-1 sm:p-2">
        <div className="font-medium " data-testid="witness-votes-received">
          {getRoundedAbbreveration(data.vestsToHp)}
          {" HP"}
        </div>
        {data.requiredHpToRankUp && (
          <div className="font-light">
            Need {getRoundedAbbreveration(data.requiredHpToRankUp)} to level up
          </div>
        )}
      </td>
      <td className=" sm:p-2">
        <div className="font-medium" data-testid="witness-price-feed">
          ${parseFloat(data.hbd_exchange_rate.base)}
        </div>
        <div className="font-light">
          {dateToFullRelative(data.last_hbd_exchange_update)}
        </div>
      </td>
    </tr>
  );
}

export default WitnessListItem;
