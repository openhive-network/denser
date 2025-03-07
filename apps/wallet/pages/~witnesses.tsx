import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import {
  getAccount,
  getAccounts,
  getDynamicGlobalProperties,
  getListWitnessVotes
} from '@transaction/lib/hive';
import { Icons } from '@hive/ui/components/icons';
import { Input } from '@hive/ui/components/input';
import { FullAccount } from '@transaction/lib/app-types';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import { useRouter } from 'next/router';
import { Button } from '@hive/ui/components/button';
import { IWitness, getWitnessesByVote } from '@/wallet/lib/hive';
import WitnessListItem from '@/wallet/components/witnesses-list-item';
import DialogLogin from '../components/dialog-login';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getServerSidePropsDefault, getTranslations } from '../lib/get-translations';
import { useWitnessVoteMutation } from '../components/hooks/use-vote-witness-mutation';
import WitnessRemoveVote from '../components/witness-remove-vote';
import { CircleSpinner } from 'react-spinners-kit';
import { useSetProxyMutation } from '../components/hooks/use-set-proxy-mutation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  Separator
} from '@ui/components';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

const LAST_BLOCK_AGE_THRESHOLD_IN_SEC = 2592000;

const mapWitnesses =
  (totalVesting: Big, totalShares: Big, headBlock: number, observer?: string[]) =>
  (witness: IWitness, i: number, witnessList: IWitness[]) => {
    const vestsToHpPrev = witnessList[i - 1]
      ? totalVesting.times(Big(witnessList[i - 1].votes).div(totalShares)).div(1000000)
      : 0;
    const vestsToHp = Big(totalVesting.times(Big(witness.votes).div(totalShares))).div(1000000);
    const deltaHpf = Big(vestsToHpPrev).minus(vestsToHp);
    return {
      ...witness,
      rank: i + 1,
      vestsToHp,
      requiredHpToRankUp: deltaHpf.gt(0) ? deltaHpf : null,
      witnessLastBlockAgeInSecs: (headBlock - witness.last_confirmed_block_num) * 3,
      url: witness.url.replace('steemit.com', 'hive.blog'),
      observer: observer ? observer.includes(witness.owner) : false
    };
  };
export type ExtendWitness = ReturnType<ReturnType<typeof mapWitnesses>>;

function WitnessesPage() {
  const { user } = useUser();
  const { t } = useTranslation('common_wallet');
  const [voteInput, setVoteInput] = useState('');
  const {
    data: dynamicData,
    isSuccess: dynamicSuccess,
    isLoading: dynamicLoading
  } = useQuery(['dynamicGlobalProperties'], () => getDynamicGlobalProperties(), {
    select: (data) => {
      return {
        ...data,
        total_vesting_fund_hive: convertStringToBig(data.total_vesting_fund_hive),
        total_vesting_shares: convertStringToBig(data.total_vesting_shares)
      };
    }
  });
  const { data: observerData } = useQuery(
    ['accountData', user?.username || ''],
    () => getAccount(user?.username || ''),

    { enabled: user?.isLoggedIn }
  );
  const [proxy, setProxy] = useState('');
  const { data: listWitnessVotesData } = useQuery(
    ['listWitnessVotesData', user?.username || ''],
    () => getListWitnessVotes(user?.username, 30, 'by_account_witness'),
    {
      enabled: user?.isLoggedIn
    }
  );

  const headBlock = dynamicData?.head_block_number ?? 0;
  const totalVesting = dynamicData?.total_vesting_fund_hive ?? Big(0);
  const totalShares = dynamicData?.total_vesting_shares ?? Big(0);

  const {
    data: witnessesData,
    isLoading: witnessesLoading,
    isSuccess: witnessesSuccess
  } = useQuery(['witnesses'], () => getWitnessesByVote('', 250), {
    select: (witnesses) => {
      const witnessVotes = listWitnessVotesData?.votes
        .filter((vote) => {
          if (vote.witness === user?.username) return vote;
        })
        .map((witnessObj) => witnessObj.witness);
      return witnesses
        .map(mapWitnesses(totalVesting, totalShares, headBlock, witnessVotes))
        .filter(
          (witness) =>
            witness.rank <= 101 || witness.witnessLastBlockAgeInSecs <= LAST_BLOCK_AGE_THRESHOLD_IN_SEC
        );
    },
    enabled: dynamicSuccess
  });

  const { data: accountData, isLoading: accountLoading } = useQuery(
    ['accountsData'],
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
  const voteMutation = useWitnessVoteMutation();
  const proxyMutation = useSetProxyMutation();
  const onVote = (witness: string, approve: boolean) => {
    if (observerData && user) {
      voteMutation.mutate({
        account: user.username,
        witness: witness,
        approve: approve
      });
    }
  };
  const onSetProxy = (witness: string) => {
    proxyMutation.mutate({
      witness: witness
    });
  };

  useEffect(() => {
    if (Array.isArray(router.query.highlight)) {
      setVoteInput(router.query.highlight[0]);
    } else {
      setVoteInput(router.query.highlight ?? '');
    }
  }, [router.query.highlight]);
  return !observerData || observerData.proxy === '' ? (
    <div className="mx-auto max-w-5xl">
      <div className="mx-2 flex flex-col gap-4">
        <div className="text-xl md:text-4xl" data-testid="witness-header">
          {t('witnesses_page.title')}
        </div>
        <p className="text-xs sm:text-sm" data-testid="witness-header-vote">
          <span className="font-semibold " data-testid="witness-header-vote-remaining">
            {t('witnesses_page.you_have_votes_remaining.other', { value: 30 })}
          </span>{' '}
          {t('witnesses_page.you_can_vote_for_maximum_of_witnesses')}
        </p>
        <p className="text-xs sm:text-sm" data-testid="witness-header-description">
          {t('witnesses_page.witness_list_notes')}
        </p>
      </div>
      <table className="mt-4 w-full table-auto text-xs">
        <thead className=" h-10 bg-zinc-100 text-left  dark:bg-slate-900" data-testid="witness-table-head">
          <tr className="font-semibold sm:text-sm">
            <th className="p-2">{t('witnesses_page.rank')}</th>
            <th className="p-2">{t('witnesses_page.witness')}</th>
            <th className="p-2">{t('witnesses_page.votes_received')}</th>
            <th className="p-2">{t('witnesses_page.price_feed')}</th>
          </tr>
        </thead>
        <tbody data-testid="witness-table-body">
          {witnessesLoading || dynamicLoading || accountLoading ? (
            <tr>
              <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>

              <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>

              <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>

              <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>
            </tr>
          ) : !witnessesData || !dynamicData || !accountData ? (
            <tr>
              <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
              <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
              <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
              <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
            </tr>
          ) : (
            witnessesData.map((element) => (
              <WitnessListItem
                onVote={(approve) => onVote(element.owner, approve)}
                data={element}
                witnessAccount={accountData?.get(element.owner)}
                key={element.id}
                headBlock={headBlock}
                voteEnabled={user?.isLoggedIn}
                isVoted={observerData?.witness_votes.includes(element.owner) ?? false}
                voteLoading={voteMutation.isLoading && voteMutation.variables?.witness === element.owner}
              />
            ))
          )}
        </tbody>
      </table>
      <div className="my-8 flex flex-col gap-8 p-2">
        <div className="flex flex-col gap-4" data-testid="witnesses-vote-box">
          <p className="text-xs sm:text-sm">{t('witnesses_page.vote_description')}</p>
          <div className="relative max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
              <Icons.atSign />
            </div>
            <Input
              className="block p-4 pl-10 pr-24 text-sm"
              value={voteInput}
              onChange={(e) => setVoteInput(e.target.value)}
            />
            <div className="items absolute bottom-0.5 right-0.5">
              {!observerData?.witness_votes.includes(voteInput) ? (
                <Button className="h-fit" variant="destructive" onClick={() => onVote(voteInput, true)}>
                  {voteMutation.isLoading ? (
                    <CircleSpinner loading={voteMutation.isLoading} size={20} color="#fff" />
                  ) : (
                    t('witnesses_page.vote')
                  )}
                </Button>
              ) : observerData?.witness_votes.includes(voteInput) ? (
                <WitnessRemoveVote onVote={() => onVote(voteInput, false)}>
                  <Button className="h-fit" variant="destructive" disabled={voteMutation.isLoading}>
                    {voteMutation.isLoading ? (
                      <CircleSpinner loading={voteMutation.isLoading} size={20} color="#fff" />
                    ) : (
                      t('witnesses_page.vote')
                    )}
                  </Button>
                </WitnessRemoveVote>
              ) : (
                <DialogLogin>
                  <Button className="h-fit" variant="destructive">
                    {t('witnesses_page.vote')}
                  </Button>
                </DialogLogin>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4" data-testid="witnesses-set-proxy-box">
          <p className="text-xs sm:text-sm">{t('witnesses_page.proxy_description')}</p>
          <div className="relative max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
              <Icons.atSign />
            </div>
            <Input
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              className="block p-4 pl-10 pr-28 text-sm"
            />
            <div className="items absolute bottom-0.5 right-0.5">
              {!user.isLoggedIn ? (
                <DialogLogin>
                  <Button className="h-fit" variant="destructive">
                    {t('witnesses_page.set_proxy')}
                  </Button>
                </DialogLogin>
              ) : (
                <ProxyDialog
                  loading={proxyMutation.isLoading}
                  onSetProxy={() => onSetProxy(proxy)}
                  description={t('witnesses_page.proxy_form.set_proxy_to', { proxy: proxy })}
                  buttonTitle={t('witnesses_page.set_proxy')}
                  t={t}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="m-4 flex max-w-xl flex-col gap-3">
      <h2 className="text-4xl">{t('witnesses_page.title')}</h2>
      <p>{t('witnesses_page.setted_proxy_description')}</p>
      <p>
        {t('witnesses_page.current_proxy', {
          value: observerData?.proxy
        })}
      </p>
      <div className="relative max-w-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
          <Icons.atSign />
        </div>
        <Input value={observerData?.proxy} disabled className="block p-4 pl-10 pr-28 text-sm" />
        <div className="items absolute bottom-0.5 right-0.5">
          <ProxyDialog
            loading={proxyMutation.isLoading}
            onSetProxy={() => onSetProxy('')}
            description={t('witnesses_page.proxy_form.description')}
            buttonTitle={t('witnesses_page.clear_proxy')}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

export default WitnessesPage;

const ProxyDialog = ({
  loading,
  onSetProxy,
  description,
  buttonTitle,
  t
}: {
  loading: boolean;
  onSetProxy: () => void;
  description: string;
  buttonTitle: string;
  t: any;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-fit" variant="destructive" disabled={loading}>
          {loading ? <CircleSpinner loading={loading} size={20} color="#fff" /> : buttonTitle}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>{t('witnesses_page.proxy_form.title')}</DialogHeader>
        <Separator />
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter className="flex flex-row items-center justify-between pt-4">
          <Button
            variant="redHover"
            onClick={() => {
              onSetProxy();
              setOpen(false);
            }}
          >
            {t('witnesses_page.ok')}
          </Button>
          <Button variant="outlineRed" onClick={() => setOpen(false)}>
            {t('witnesses_page.cancel_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
