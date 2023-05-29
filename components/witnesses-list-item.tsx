import Link from 'next/link';
import { ExtendWitness } from '@/pages/~witnesses';
import clsx from 'clsx';
import { DISABLED_SIGNING_KEY } from '@/lib/constants';
import { blockGap, getRoundedAbbreveration } from '@/lib/utils';
import { Icons } from './icons';
import { FullAccount } from '@/store/app-types';
import moment from 'moment';
import { dateToFullRelative } from '@/lib/parse-date';

const getOwnersString = (owners?: string) => {
  if (!owners) return '';
  const ownersArray = owners.split(',');
  const lastOwner = ownersArray.pop();
  if (ownersArray.length === 0) return lastOwner;
  return ownersArray.join(', ') + ' & ' + lastOwner;
};

interface WitnessListItemProps {
  data: ExtendWitness;
  witnessAccount?: FullAccount;
  headBlock: number;
}
const oneWeekInSec = 604800;
function WitnessListItem({ data, headBlock, witnessAccount }: WitnessListItemProps) {
  const disableUser = data.signing_key === DISABLED_SIGNING_KEY;

  const witnessDescription = witnessAccount?.profile?.witness_description;

  const witnessOwner = witnessAccount?.profile?.witness_owner;
  function witnessLink() {
    if (disableUser)
      return (
        <span>
          {'Disabled '}
          {blockGap(headBlock, data.last_confirmed_block_num)}
        </span>
      );
    if (!data.url.includes('http')) return <>(No URL provided)</>;

    if (data.url.includes('hive.blog') || data.url.includes('localhost'))
      return (
        <Link
          href={data.url}
          className="flex items-center gap-2 font-semibold hover:text-red-400 dark:hover:text-blue-400"
        >
          <span>Open witness annoucement</span>
          <Icons.forward className="text-red-600 dark:text-blue-500" />
        </Link>
      );
    return (
      <Link
        href={data.url}
        className="flex items-center gap-2 font-semibold hover:text-red-400 dark:hover:text-blue-400"
      >
        <span>Open external side</span>
        <Icons.forward className="text-red-600 dark:text-blue-500" />
      </Link>
    );
  }

  return (
    <tr className="even:bg-slate-100 dark:even:bg-slate-900 ">
      <td>
        <div className="flex flex-col-reverse items-center gap-1 sm:flex-row sm:p-2">
          <span className="sm:text-sm">{data.rank < 10 ? `0${data.rank}` : data.rank}</span>
          <div className="group relative flex">
            <span className="opocity-75 absolute inline-flex h-6 w-6 rounded-full bg-red-600 p-0 group-hover:animate-ping group-hover:[animation-iteration-count:_1] dark:bg-blue-400 sm:h-8 sm:w-8"></span>
            <Icons.arrowUpCircle className="relative inline-flex h-6 w-6 rounded-full bg-white text-red-600 dark:bg-slate-800 dark:text-blue-500 sm:h-8 sm:w-8" />
          </div>
        </div>
      </td>
      <td className="font-light md:font-normal">
        <div className="flex items-center">
          <div className="hidden p-2 sm:block">
            <Link href={`@${data.owner}`}>
              <img
                className={clsx('mr-3 h-[80px] min-w-[80px] rounded-full', {
                  'opacity-50': disableUser
                })}
                height="40"
                width="40"
                src={`https://images.hive.blog/u/${data.owner}/avatar`}
                alt={`${data.owner} profile picture`}
              />
            </Link>
          </div>
          <div className="flex flex-col gap-1 py-4 sm:px-2">
            <div className="flex items-center gap-2">
              <Link href={`@${data.owner}`}>
                {
                  <div
                    className={clsx(
                      'font-bold sm:text-base',
                      {
                        'text-gray-500 line-through opacity-50 dark:text-gray-300': disableUser
                      },
                      {
                        'font-bold text-red-600 hover:text-black dark:text-blue-400 hover:dark:text-blue-200 md:text-lg':
                          !disableUser
                      }
                    )}
                  >
                    {data.owner}
                  </div>
                }
              </Link>
              {witnessOwner && (
                <div className="text-xs  text-gray-500 sm:text-base sm:font-bold ">
                  by {getOwnersString(witnessOwner)}
                </div>
              )}
              <button>
                <Link
                  href={`/~witnesses?highlight=${data.owner}`}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  {' '}
                  <Icons.link className="h-[1em] w-[1em]" />
                </Link>
              </button>
            </div>
            {!disableUser && witnessDescription && (
              <div className="mb-1 block hidden max-h-16 max-w-lg overflow-y-auto overflow-x-hidden border-b-[1px] border-dotted border-gray-400 p-1 text-center italic sm:block">
                {witnessDescription}
              </div>
            )}

            {data.witnessLastBlockAgeInSecs > oneWeekInSec && (
              <span className="font-semibold">⚠️Has not produced any blocks for over a week.</span>
            )}
            <div>
              Last block{' '}
              <Link
                href={`https://hiveblocks.com/b/${data.last_confirmed_block_num}`}
                className="hover:text-red-600 dark:hover:text-blue-400"
              >
                <span className="font-semibold ">#{data.last_confirmed_block_num}</span>
              </Link>{' '}
              {blockGap(headBlock, data.last_confirmed_block_num)} v{data.running_version}
            </div>
            {disableUser ? <></> : <div>Witness age: {moment().from(data.created, true)}</div>}

            <div>{witnessLink()}</div>
          </div>
        </div>
      </td>
      <td className="p-1 sm:p-2 sm:text-sm">
        <div className="font-medium ">
          {getRoundedAbbreveration(data.vestsToHp)}
          {' HP'}
        </div>
        {data.requiredHpToRankUp && (
          <div className="font-light">
            Need {getRoundedAbbreveration(data.requiredHpToRankUp)} to level up
          </div>
        )}
      </td>
      <td className=" sm:p-2 sm:text-sm">
        <div className="font-medium">${parseFloat(data.hbd_exchange_rate.base)}</div>
        <div className="font-light">{dateToFullRelative(data.last_hbd_exchange_update)}</div>
      </td>
    </tr>
  );
}
export default WitnessListItem;
