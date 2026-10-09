'use client';

import { useMemo, useState } from 'react';
import env from '@beam-australia/react-env';
import { InfoIcon } from 'lucide-react';
import { Link } from '@hive/ui';
import Loading from '@ui/components/loading';
import { Button } from '@ui/components/button';
import { Table, TableBody, TableCell, TableRow } from '@ui/components/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import TimeAgo from '@ui/components/time-ago';
import { useTranslation } from '@/wallet/i18n/client';
import { useRewardsHistory } from '@/wallet/components/hooks/use-rewards-history';
import AccountHistoryError from '@/wallet/components/account-history-error';
import { REWARD_TYPES, type RewardType } from './reward-types';

const WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
const ITEMS_PER_PAGE = 50;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation('common_wallet');
  return (
    <div className="flex justify-between">
      <Button
        variant="outlineRed"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        {t('profile.newer')}
      </Button>
      <Button
        variant="outlineRed"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
      >
        {t('profile.older')}
      </Button>
    </div>
  );
}

export default function RewardsHistoryPage({
  username,
  rewardType
}: {
  username: string;
  rewardType: RewardType;
}) {
  const { t } = useTranslation('common_wallet');
  const config = REWARD_TYPES[rewardType];
  const { data, isLoading, dynamicData, isError, refetch } = useRewardsHistory(username, config.opType);
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = data ? Math.ceil(data.length / ITEMS_PER_PAGE) : 0;
  const currentItems = data
    ?.reverse()
    ?.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  const weeklyTotals = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const lastWeekRewards =
      data && dynamicData ? data.filter((reward) => new Date(reward.timestamp) > oneWeekAgo) : [];
    return config.weeklyTotals(lastWeekRewards, dynamicData);
  }, [config, data, dynamicData]);

  const pagination = (
    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
  );

  return (
    <div>
      <div className="flex flex-col border-b-2 p-2 text-sm sm:flex-row sm:justify-between sm:p-4">
        <div>{t(config.estimatedLastWeekKey)}</div>
        <div className="flex flex-col">
          <div className="flex flex-col">
            {weeklyTotals.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-2 sm:p-4">
        <h4 className="text-lg">
          {t(config.historyKey)}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="ml-1 h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{t('profile.potential_author_rewards_info')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h4>
        {isLoading ? (
          <Loading loading={isLoading} />
        ) : isError ? (
          <AccountHistoryError onRetry={refetch} t={t} />
        ) : (
          <>
            {pagination}
            <Table className="min-w-full table-auto">
              <TableBody className="divide-y">
                {currentItems?.map((reward, index) => (
                  <TableRow key={index} className="text-sm">
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="text-left">
                            <TimeAgo date={reward.timestamp} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{reward.timestamp}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className={config.descriptionClassName}>
                        {new Date(reward.timestamp) > new Date(Date.now() - WEEK_IN_MILLISECONDS)
                          ? t(config.potentialTitleKey)
                          : t(config.titleKey)}
                        <Link
                          href={`${env('BLOG_DOMAIN')}/@${reward.op.author}/${reward.op.permlink}`}
                          className="text-destructive"
                        >
                          {reward.op.permlink}
                        </Link>
                        {config.linksPostAuthor && (
                          <>
                            {t('profile.by')}
                            <Link className="text-destructive" href={`/@${reward.op.author}`}>
                              {reward.op.author}
                            </Link>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        {config.payoutLines(reward.op, dynamicData).map((line, lineIndex) => (
                          <span key={lineIndex}>{line}</span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination}
          </>
        )}
      </div>
    </div>
  );
}
