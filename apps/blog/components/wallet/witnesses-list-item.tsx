import Link from 'next/link';
import { ExtendWitness } from '../../pages/witnesses';
import clsx from 'clsx';
import { DISABLED_SIGNING_KEY } from '@/blog/lib/wallet/constants';
import { blockGap, getRoundedAbbreveration } from '@hive/ui/lib/utils';
import { Icons } from '@hive/ui/components/icons';
import { FullAccount } from '@transaction/lib/app-types';
import { dateToRelative } from '@hive/ui/lib/parse-date';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { CircleSpinner } from 'react-spinners-kit';
import WitnessRemoveVote from './witness-remove-vote';
import TimeAgo from '@ui/components/time-ago';

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
  onVote: (approve: boolean) => void;
  voteEnabled: boolean;
  isVoted: boolean;
  voteLoading: boolean;
}

const ONE_WEEK_IN_SEC = 604800;

function WitnessListItem({
  data,
  headBlock,
  witnessAccount,
  onVote,
  voteEnabled,
  isVoted,
  voteLoading
}: WitnessListItemProps) {
  const { t } = useTranslation('common_blog');
  const disableUser = data.signing_key === DISABLED_SIGNING_KEY;
  const witnessDescription = witnessAccount?.profile?.witness_description;
  const witnessOwner = witnessAccount?.profile?.witness_owner;

  function witnessLink() {
    if (disableUser)
      return (
        <span>
          {t('witnesses_page.disabled')}
          {blockGap(headBlock, data.last_confirmed_block_num, t)}
        </span>
      );

    if (!data.url.startsWith('http')) return <>({t('witnesses_page.no_url_provided')})</>;

    const urlToWitnessPage = new URL(data.url);
    if (['hive.blog', 'localhost'].includes(urlToWitnessPage.hostname))
      return (
        <Link
          href={encodeURI(data.url)}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-2 text-xs font-light hover:text-red-400 dark:hover:text-red-400"
        >
          <span>{t('witnesses_page.open_witness_annoucement')}</span>
          <Icons.forward className="h-4 w-4 text-gray-400 dark:text-gray-400" />
        </Link>
      );

    return (
      <Link
        href={encodeURI(data.url)}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-2 text-xs font-light hover:text-red-400 dark:hover:text-red-400"
      >
        <span>{t('witnesses_page.open_external_site')}</span>
        <Icons.forward className="h-4 w-4 text-gray-400 dark:text-gray-400" />
      </Link>
    );
  }

  const router = useRouter();

  const ref = useRef<HTMLTableRowElement>(null);
  const markedWitness = router.query.highlight === data.owner;
  useEffect(() => {
    let highlight = '';
    if (Array.isArray(router.query.highlight)) {
      highlight = router.query.highlight[0];
    } else {
      highlight = router.query.highlight ?? '';
    }
    if (highlight === data.owner && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [data.owner, router.query.highlight]);

  return (
    <tr
      className={clsx('border-b border-gray-200', {
        'bg-yellow-200 dark:bg-zinc-800': markedWitness,
        'even:bg-background dark:even:bg-background': !markedWitness
      })}
      ref={ref}
    >
      <td>
        <div className="flex flex-col-reverse items-center gap-1 sm:flex-row sm:p-2">
          <span className="sm:text-sm">{data.rank < 10 ? `0${data.rank}` : data.rank}</span>
          {voteEnabled ? (
            <div title={t('witnesses_page.vote')} className="group relative flex" data-testid="witness-vote">
              <span className="opocity-75 absolute inline-flex h-5 w-5 rounded-full bg-primary p-0 group-hover:animate-ping dark:bg-red-400"></span>
              {voteLoading ? (
                <span className="relative rounded-full bg-white dark:bg-slate-900">
                  <CircleSpinner loading={voteLoading} size={20} color="#dc2626" />
                </span>
              ) : !isVoted ? (
                <Icons.arrowUpCircle
                  onClick={() => onVote(true)}
                  viewBox="1.7 1.7 20.7 20.7"
                  className={clsx(
                    'text-primary-forground relative inline-flex h-5 w-5 cursor-pointer rounded-full stroke-1',
                    {
                      'bg-slate-100 dark:bg-slate-900': !markedWitness,
                      'bg-primary dark:bg-rose-800': markedWitness
                    }
                  )}
                />
              ) : (
                <WitnessRemoveVote onVote={onVote}>
                  <Icons.arrowUpCircle className="text-primary-forground relative inline-flex h-5 w-5 cursor-pointer rounded-full bg-primary stroke-1 font-semibold dark:text-black" />
                </WitnessRemoveVote>
              )}
            </div>
          ) : (
            <DialogLogin>
              <div
                title={t('witnesses_page.vote')}
                className="group relative flex"
                data-testid="witness-vote"
              >
                <span className="opocity-75 absolute inline-flex h-5 w-5 rounded-full bg-red-600 p-0 group-hover:animate-ping dark:bg-red-400"></span>
                <Icons.arrowUpCircle
                  viewBox="1.7 1.7 20.7 20.7"
                  className={clsx(
                    'relative inline-flex h-5 w-5 cursor-pointer rounded-full stroke-1 text-red-600 dark:text-red-500',
                    {
                      'bg-slate-100 dark:bg-slate-900': !markedWitness,
                      'bg-rose-200  dark:bg-rose-800': markedWitness
                    }
                  )}
                />
              </div>
            </DialogLogin>
          )}
        </div>
      </td>
      <td className="font-light md:font-normal">
        <div className="flex py-1" data-testid="witness-list-item-info">
          <div className="flex flex-col gap-1 sm:px-2">
            <div className="flex items-center gap-2">
              <div className="self" title={t('witnesses_page.navigate_to_witness_profile')}>
                <Link href={`/@${data.owner}`} target="_blank">
                  <img
                    className={clsx('h-[26px] min-w-[26px] rounded-full md:h-[32px] md:min-w-[32px]', {
                      'opacity-50': disableUser
                    })}
                    src={`https://images.hive.blog/u/${data.owner}/avatar`}
                    alt={`${data.owner} profile picture`}
                  />
                </Link>
              </div>

              <Link
                href={`/@${data.owner}`}
                data-testid="witness-name-link"
                target="_blank"
                title={t('witnesses_page.navigate_to_witness_profile')}
              >
                {
                  <div
                    className={clsx(
                      'md:text-md font-semibold',
                      {
                        'text-gray-500 line-through opacity-50 dark:text-gray-300': disableUser
                      },
                      {
                        'font-bold text-secondary': !disableUser
                      }
                    )}
                  >
                    {data.owner}
                  </div>
                }
              </Link>
              {witnessOwner && (
                <div className="text-xs  text-gray-600 sm:text-sm  ">
                  {t('witnesses_page.by')} {getOwnersString(witnessOwner)}
                </div>
              )}

              <Link
                href={
                  router.query.highlight !== data.owner ? `/witnesses?highlight=${data.owner}` : `/witnesses`
                }
                replace
                scroll={false}
                data-testid="witness-highlight-link"
                title={t('witnesses_page.use_this_for_linking_title')}
              >
                <Icons.link className="h-[1em] w-[1em]" />
              </Link>
            </div>

            {!disableUser && witnessDescription && (
              <div className="mb-1 p-1 text-xs italic">{witnessDescription}</div>
            )}

            {data.witnessLastBlockAgeInSecs > ONE_WEEK_IN_SEC && (
              <span
                className="font-semibold text-red-600"
                data-testid="witness-has-not-produced-blocks-warning"
              >
                {t('witnesses_page.has_not_produced_blocks')}
              </span>
            )}
            {/* <div>
              {t('witnesses_page.last_block')}
              <Link
                href={`https://hiveblocks.com/b/${data.last_confirmed_block_num}`}
                className="text-red-500"
                data-testid="last-block-number"
              >
                <span className="font-semibold ">#{data.last_confirmed_block_num}</span>
              </Link>{' '}
              {blockGap(headBlock, data.last_confirmed_block_num, t)}
            </div> */}
            {disableUser ? (
              <></>
            ) : (
              <div className="text-sm font-light text-gray-500" data-testid="witness-created">
                {t('witnesses_page.witness_age')}
                {dateToRelative(data.created, t).replace('ago', '')}
              </div>
            )}

            <div data-testid="witness-external-site-link">{witnessLink()}</div>
          </div>
        </div>
      </td>
      <td>
        <div className="text-sm">v{data.running_version}</div>
      </td>

      <td className=" p-1  sm:p-2">
        <div className="text-sm" data-testid="witness-votes-received">
          {getRoundedAbbreveration(data.vestsToHp)}
          {/* {' HP'} */}
        </div>
        {/* {data.requiredHpToRankUp && (
          <div className="text-xs font-light">
            {t('witnesses_page.hp_required_to_rank_up', {
              value: getRoundedAbbreveration(data.requiredHpToRankUp)
            })}
          </div>
        )} */}
      </td>
      <td className="text-center">
        <div className="text-sm">{data.last_confirmed_block_num}</div>
        <div className="text-xs font-light text-gray-400">
          {blockGap(headBlock, data.last_confirmed_block_num, t)}
        </div>
      </td>

      <td className="text-center sm:p-2">
        <div className="font-sm" data-testid="witness-price-feed">
          ${parseFloat(data.hbd_exchange_rate.base)}
        </div>
        <div className="text-xs font-light">
          <TimeAgo date={data.last_hbd_exchange_update} />
        </div>
      </td>
    </tr>
  );
}

export default WitnessListItem;
