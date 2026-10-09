'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getListWitnessVotes } from '@transaction/lib/hive';
import { Icons } from '@hive/ui/components/icons';
import { Input } from '@hive/ui/components/input';
import { useSearchParams } from 'next/navigation';
import { Button } from '@hive/ui/components/button';
import { getWitnessList, rankWitnesses, WITNESS_LIST_QUERY_KEY } from '@/wallet/lib/witness-list';
import WitnessListItem from '@/wallet/components/witnesses-list-item';
import DialogLogin from '@/wallet/components/dialog-login';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useWitnessVoteMutation } from '@/wallet/components/hooks/use-vote-witness-mutation';
import WitnessRemoveVote from '@/wallet/components/witness-remove-vote';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { useSetProxyMutation } from '@/wallet/components/hooks/use-set-proxy-mutation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  Separator
} from '@ui/components';
import { handleError } from '@ui/lib/handle-error';
import { getAccount } from '@transaction/lib/hive-api';

// User can vote only for 30 witnesses
const MAX_VOTES = 30;

export default function WitnessesPage() {
  const { user } = useUserClient();
  const { t } = useTranslation('common_wallet');
  const searchParams = useSearchParams();
  const highlight = searchParams?.get('highlight') ?? '';
  // value of input field for voting witness by name, not included in the list
  const [voteInput, setVoteInput] = useState(highlight);
  const { data: observerData } = useQuery({
    queryKey: ['accountData', user?.username || ''],
    queryFn: () => getAccount(user?.username || ''),
    enabled: user?.isLoggedIn
  });
  // value of input field for set proxy witness by name
  const [proxy, setProxy] = useState('');
  const { data: listWitnessVotesData } = useQuery({
    queryKey: ['listWitnessVotesData', user?.username || ''],
    queryFn: () => getListWitnessVotes(user?.username, 30, 'by_account_witness'),
    enabled: user?.isLoggedIn
  });

  // Extract list of witnesses the user has voted for from listWitnessVotesData
  const userWitnessVotes = useMemo(() => {
    if (!listWitnessVotesData?.votes || !user?.username) return [];
    return listWitnessVotesData.votes
      .filter((vote) => vote.account === user.username)
      .map((vote) => vote.witness);
  }, [listWitnessVotesData?.votes, user?.username]);

  const { data: witnessList, isPending: witnessesLoading } = useQuery({
    queryKey: WITNESS_LIST_QUERY_KEY,
    queryFn: getWitnessList
  });
  const rankedWitnesses = useMemo(() => (witnessList ? rankWitnesses(witnessList) : undefined), [witnessList]);

  // Mutation for handle voting witness
  const voteMutation = useWitnessVoteMutation();
  // Mutation for handle set proxy
  const proxyMutation = useSetProxyMutation();

  const { mutateAsync: voteWitness } = voteMutation;
  // Function for handle voting witness; stable, so the memoized rows don't re-render on every page render
  const onVote = useCallback(
    async (witness: string, approve: boolean) => {
      // Check if user is logged in and observerData is loaded
      if (observerData && user) {
        try {
          await voteWitness({
            account: user.username,
            witness: witness,
            approve: approve
          });
        } catch (error) {
          handleError(error, {
            method: 'voteWitness',
            params: { account: user.username, witness: witness, approve: approve }
          });
        }
      }
    },
    [observerData, user, voteWitness]
  );

  // Function for handle set proxy
  const onSetProxy = async (witness: string) => {
    try {
      await proxyMutation.mutateAsync({
        witness: witness
      });
    } catch (error) {
      handleError(error, { method: 'setProxy', params: { witness: witness } });
    }
  };

  useEffect(() => {
    setVoteInput(highlight);
  }, [highlight]);

  // Calculate how many votes user have left
  const votesLeft = MAX_VOTES - userWitnessVotes.length;

  return (
    <>
      {!observerData || observerData.proxy === '' ? (
        <div className="mx-auto max-w-5xl">
          <div className="mx-2 flex flex-col gap-4">
            <div className="text-xl md:text-4xl" data-testid="witness-header">
              {t('witnesses_page.title')}
            </div>
            <p className="text-xs sm:text-sm" data-testid="witness-header-vote">
              <span className="font-semibold " data-testid="witness-header-vote-remaining">
                {t('witnesses_page.you_have_votes_remaining.other', { value: votesLeft })}
              </span>{' '}
              {t('witnesses_page.you_can_vote_for_maximum_of_witnesses')}
            </p>
            <p className="text-xs sm:text-sm" data-testid="witness-header-description">
              {t('witnesses_page.witness_list_notes')}
            </p>
          </div>
          <table className="mt-4 w-full table-fixed text-xs">
            <colgroup>
              <col className="w-12 sm:w-20" />
              <col />
              <col className="w-24 sm:w-40" />
              <col className="w-20 sm:w-32" />
            </colgroup>
            <thead
              className=" h-10 bg-zinc-100 text-left  dark:bg-slate-900"
              data-testid="witness-table-head"
            >
              <tr className="font-semibold sm:text-sm">
                <th className="p-2">{t('witnesses_page.rank')}</th>
                <th className="p-2">{t('witnesses_page.witness')}</th>
                <th className="p-2">{t('witnesses_page.votes_received')}</th>
                <th className="p-2">{t('witnesses_page.price_feed')}</th>
              </tr>
            </thead>
            <tbody data-testid="witness-table-body">
              {witnessesLoading ? (
                <tr>
                  <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>

                  <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>

                  <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>

                  <td className="animate-pulse p-2 text-xl">{t('global.loading')}</td>
                </tr>
              ) : !witnessList || !rankedWitnesses ? (
                <tr>
                  <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
                  <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
                  <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
                  <td className="animate-pulse p-2 text-xl">{t('global.something_went_wrong')}</td>
                </tr>
              ) : (
                rankedWitnesses.map((element) => (
                  <WitnessListItem
                    onVote={onVote}
                    data={element}
                    witnessProfile={witnessList.profiles[element.owner]}
                    key={element.id}
                    headBlock={witnessList.headBlock}
                    highlighted={highlight === element.owner}
                    voteEnabled={user?.isLoggedIn}
                    isVoted={userWitnessVotes.includes(element.owner)}
                    voteLoading={voteMutation.isPending && voteMutation.variables?.witness === element.owner}
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
                <div className="items absolute bottom-[1px] right-[1px]">
                  {!user.isLoggedIn ? (
                    <DialogLogin>
                      <Button className="h-fit" variant="destructive">
                        {t('witnesses_page.vote')}
                      </Button>
                    </DialogLogin>
                  ) : !userWitnessVotes.includes(voteInput) ? (
                    <Button
                      className="h-fit"
                      variant="destructive"
                      onClick={() => onVote(voteInput, true)}
                      disabled={voteMutation.isPending}
                    >
                      {voteMutation.isPending ? (
                        <CircleSpinner loading={voteMutation.isPending} size={20} color="#fff" />
                      ) : (
                        t('witnesses_page.vote')
                      )}
                    </Button>
                  ) : (
                    <WitnessRemoveVote onVote={() => onVote(voteInput, false)}>
                      <Button className="h-fit" variant="destructive" disabled={voteMutation.isPending}>
                        {voteMutation.isPending ? (
                          <CircleSpinner loading={voteMutation.isPending} size={20} color="#fff" />
                        ) : (
                          t('witnesses_page.vote')
                        )}
                      </Button>
                    </WitnessRemoveVote>
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
                <div className="items absolute bottom-[1px] right-[1px]">
                  {!user.isLoggedIn ? (
                    <DialogLogin>
                      <Button className="h-fit" variant="destructive">
                        {t('witnesses_page.set_proxy')}
                      </Button>
                    </DialogLogin>
                  ) : (
                    <ProxyDialog
                      loading={proxyMutation.isPending}
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
        <div className="mx-auto flex max-w-5xl flex-col gap-5 p-5">
          <h2 className="text-xl md:text-4xl">{t('witnesses_page.title')}</h2>
          <div className="flex flex-col gap-4 bg-white p-4 drop-shadow-xl dark:bg-slate-800 sm:p-6">
            <p className="text-sm sm:text-base">{t('witnesses_page.setted_proxy_description')}</p>
            <p className="text-sm font-semibold sm:text-base">
              {t('witnesses_page.current_proxy', {
                value: observerData?.proxy
              })}
            </p>
            <div className="relative max-w-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                <Icons.atSign />
              </div>
              <Input value={observerData?.proxy} disabled className="block p-4 pl-10 pr-28 text-sm" />
              <div className="items absolute bottom-[1px] right-[1px]">
                <ProxyDialog
                  loading={proxyMutation.isPending}
                  onSetProxy={() => onSetProxy('')}
                  description={t('witnesses_page.proxy_form.description')}
                  buttonTitle={t('witnesses_page.clear_proxy')}
                  t={t}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
  t: ReturnType<typeof useTranslation>['t'];
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
