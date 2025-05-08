import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import { getAccountMetadata, getTranslations } from '@/wallet/lib/get-translations';
import Head from 'next/head';
import { useRewardsHistory } from '@/wallet/components/hooks/use-rewards-history';
import Link from 'next/link';
import env from '@beam-australia/react-env';
import { convertStringToBig } from '@ui/lib/helpers';
import { convertToHP } from '@ui/lib/utils';
import Loading from '@ui/components/loading';
import { useMemo, useState } from 'react';
import Big from 'big.js';
import { Table, TableBody, TableCell, TableRow } from '@ui/components/table';
import { Button } from '@ui/components/button';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import TimeAgo from '@ui/components/time-ago';

const WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

function AuthorRewardsPage({ username, metadata }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const { data, isLoading, dynamicData } = useRewardsHistory(username, 'author_reward');
  const [currentPage, setCurrentPage] = useState(0);

  const itemsPerPage = 50;
  const totalPages = data ? Math.ceil(data.length / itemsPerPage) : 0;
  const currentItems = data?.reverse()?.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const weeklyRewards = useMemo(() => {
    if (!data || !dynamicData) return { hbd: 0, hive: 0, hp: 0 };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return data
      .filter((reward) => new Date(reward.timestamp) > oneWeekAgo)
      .reduce(
        (total, reward) => {
          const rewardHP = convertToHP(
            convertStringToBig(reward.op.vesting_payout ?? '0'),
            dynamicData.total_vesting_shares,
            dynamicData.total_vesting_fund_hive
          );
          const rewardHBD = convertStringToBig(reward.op.hbd_payout ?? '0');
          const rewardHIVE = convertStringToBig(reward.op.hive_payout ?? '0');
          return {
            hbd: Number(Big(total.hbd).plus(rewardHBD)),
            hive: Number(Big(total.hive).plus(rewardHIVE)),
            hp: Number(Big(total.hp).plus(rewardHP))
          };
        },
        { hbd: 0, hive: 0, hp: 0 }
      );
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
            <div>{t('profile.estimated_author_rewards_last_week')}</div>
            <div className="flex flex-col">
              <div className="flex flex-col">
                <span>{weeklyRewards.hp.toFixed(3)} HIVE POWER</span>
                <span>{weeklyRewards.hive.toFixed(3)} HIVE</span>
                <span>{weeklyRewards.hbd.toFixed(3)} HBD</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-2 sm:p-4">
            <h4 className="text-lg">
              {t('profile.author_rewards_history')}
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
                              <TooltipTrigger>
                                <TimeAgo date={reward.timestamp} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{reward.timestamp}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {new Date(reward.timestamp) > new Date(Date.now() - WEEK_IN_MILLISECONDS)
                              ? t('profile.potential_author_rewards_title')
                              : t('profile.author_rewards_title')}
                            <Link
                              href={`${env('BLOG_DOMAIN')}/@${reward.op.author}/${reward.op.permlink}`}
                              className="text-destructive"
                            >
                              {reward.op.permlink}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>
                              {reward.op.vesting_payout && dynamicData
                                ? convertToHP(
                                    convertStringToBig(reward.op.vesting_payout),
                                    dynamicData.total_vesting_shares,
                                    dynamicData.total_vesting_fund_hive
                                  ).toFixed(3)
                                : '0'}{' '}
                              HP
                            </span>
                            <span>{reward.op.hive_payout}</span>
                            <span>{reward.op.hbd_payout}</span>
                          </div>
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

export default AuthorRewardsPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      metadata: await getAccountMetadata(username, 'Author Rewards'),
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
