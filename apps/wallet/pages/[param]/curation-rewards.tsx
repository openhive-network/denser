import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import { getAccountMetadata, getTranslations } from '@/wallet/lib/get-translations';
import Head from 'next/head';
import { useRewardsHistory } from '@/wallet/components/hooks/use-rewards-history';
import Loading from '@ui/components/loading';
import Link from 'next/link';
import { convertToHP } from '@ui/lib/utils';
import { convertStringToBig } from '@ui/lib/helpers';
import env from '@beam-australia/react-env';
import { useState, useMemo } from 'react';
import { Button } from '@ui/components/button';
import { Table, TableBody, TableCell, TableRow } from '@ui/components/table';
import Big from 'big.js';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@ui/components/tooltip';
import { InfoIcon } from 'lucide-react';
import TimeAgo from '@ui/components/time-ago';
import { convertToFormattedHivePower } from '@/wallet/lib/utils';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

const WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

function CurationRewardsPage({ username, metadata }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const { data, dynamicData, isLoading } = useRewardsHistory(username, 'curation_reward_operation');
  const [currentPage, setCurrentPage] = useState(0);
    const hiveChain = hiveChainService.reuseHiveChain();

  const itemsPerPage = 50;
  const totalPages = data ? Math.ceil(data.length / itemsPerPage) : 0;
  const currentItems = data?.reverse()?.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const weeklyRewards = useMemo(() => {
    if (!data || !dynamicData) return 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return data
      .filter((reward) => new Date(reward.timestamp) > oneWeekAgo)
      .reduce((total, reward) => {
        const rewardHP = convertToHP(
          convertStringToBig(reward.op.reward ?? '0'),
          dynamicData.total_vesting_shares,
          dynamicData.total_vesting_fund_hive
        );
        return Number(Big(total).plus(rewardHP));
      }, 0);
  }, [data, dynamicData]);

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        <div>
          <div className="flex flex-col border-b-2 p-2 text-sm sm:flex-row sm:justify-between sm:p-4">
            <div>{t('profile.estimated_curation_rewards_last_week')}</div>
            <div className="flex flex-col">
              <span>{weeklyRewards.toFixed(3)} HIVE POWER</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-2 sm:p-4">
            <h4 className="text-lg">
              {t('profile.curation_rewards_history')}
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
              <div className="flex items-center justify-center">
                <Loading loading={isLoading} />
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <Button
                    variant="outlineRed"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    disabled={currentPage === 0}
                  >
                    {t('profile.newer')}
                  </Button>
                  <Button
                    variant="outlineRed"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    {t('profile.older')}
                  </Button>
                </div>
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
                          {new Date(reward.timestamp) > new Date(Date.now() - WEEK_IN_MILLISECONDS)
                            ? t('profile.potential_curation_reward_title')
                            : t('profile.curation_reward_title')}
                          <Link
                            href={`${env('BLOG_DOMAIN')}/@${reward.op.author}/${reward.op.permlink}`}
                            className="text-destructive"
                          >
                            {reward.op.permlink}
                          </Link>
                          {t('profile.by')}
                          <Link className="text-destructive" href={`/@${reward.op.author}`}>
                            {reward.op.author}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          {reward.op.reward && dynamicData && hiveChain
                            ? convertToFormattedHivePower(
                                reward.op.reward,
                                dynamicData.total_vesting_fund_hive,
                                dynamicData.total_vesting_shares,
                                hiveChain
                              )
                            : '0'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between">
                  <Button
                    variant="outlineRed"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    disabled={currentPage === 0}
                  >
                    {t('profile.newer')}
                  </Button>
                  <Button
                    variant="outlineRed"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    {t('profile.older')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}

export default CurationRewardsPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      metadata: await getAccountMetadata(username, 'Curation Rewards'),
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
