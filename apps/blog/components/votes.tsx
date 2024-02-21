import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@hive/ui/components/tooltip';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Icons } from '@ui/components/icons';
import DialogLogin from './dialog-login';
import clsx from 'clsx';
import type { Entry } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { transactionService } from '@transaction/index';
import { useSigner } from '@/blog/components/hooks/use-signer';

const VotesComponent = ({ post }: { post: Entry }) => {
  const { user } = useUser();
  const { signerOptions } = useSigner();
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const checkVote = isClient && post.active_votes.find((e) => e.voter === user?.username);

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="upvote-button">
            {user && user.isLoggedIn ? (
              <Icons.arrowUpCircle
                className={clsx(
                  'h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1',
                  { 'bg-red-600 text-white': checkVote && checkVote?.rshares > 0 }
                )}
                onClick={(e) =>
                  transactionService.processHiveAppOperation((builder) => {
                    builder
                      .push({
                        vote: {
                          voter: user.username,
                          author: post.author,
                          permlink: post.permlink,
                          weight: 10000
                        }
                      })
                      .build();
                  }, signerOptions)
                }
              />
            ) : (
              <DialogLogin>
                <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
              </DialogLogin>
            )}
          </TooltipTrigger>
          <TooltipContent data-testid="upvote-button-tooltip">{t('cards.post_card.upvote')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="downvote-button">
            {user && user.isLoggedIn ? (
              <Icons.arrowDownCircle
                className={clsx(
                  'h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1',
                  { 'bg-gray-600 text-white': checkVote && checkVote?.rshares < 0 }
                )}
                onClick={(e) =>
                  transactionService.processHiveAppOperation((builder) => {
                    builder
                      .push({
                        vote: {
                          voter: user.username,
                          author: post.author,
                          permlink: post.permlink,
                          weight: -10000
                        }
                      })
                      .build();
                  }, signerOptions)
                }
              />
            ) : (
              <DialogLogin>
                <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
              </DialogLogin>
            )}
          </TooltipTrigger>
          <TooltipContent data-testid="downvote-button-tooltip">
            {t('cards.post_card.downvote')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {checkVote && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>{checkVote?.rshares === 0 && 'Voted'}</TooltipTrigger>
            <TooltipContent className="flex flex-col">
              <span>You voted but your Hive Power is too low to check if you upvote or downvote.</span>
              <span>
                Boost your Hive Power in
                <Link
                  className="font-bold hover:text-red-600"
                  target="_blank"
                  href={`https://wallet.openhive.network/${user?.username}/transfers`}
                >
                  {' Wallet '}
                </Link>
                to see more
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
export default VotesComponent;
