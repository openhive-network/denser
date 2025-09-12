import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import { Label } from '@ui/components/label';
import { getAccountMetadata, getTranslations } from '@/wallet/lib/get-translations';
import Head from 'next/head';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import {ApiChecker, HealthCheckerComponent } from "@hiveio/healthchecker-component";
import { useEffect, useState } from 'react';
import {useHealthChecker} from "@ui/hooks/useHealthChecker";

function Communities({ username, metadata }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const [walletApiCheckers, setWalletApiCheckers] = useState<ApiChecker[] | undefined>(undefined);
    const createApiCheckers = async () => {
      const hiveChain = await hiveChainService.getHiveChain();
      const apiCheckers: ApiChecker[] = [
        {
          title: "Condenser - Get accounts",
          method: hiveChain.api.condenser_api.get_accounts,
          params: [["guest4test"]],
          validatorFunction: data => data[0].name === "guest4test" ? true : "Get block error",
        },
        {
          title: "Database - saving withdrawals",
          method: hiveChain.api.database_api.find_savings_withdrawals,
          params: {account: "guest4test"},
          validatorFunction: data => !!data.withdrawals ? true : "Get post error",
        },
     ]
      setWalletApiCheckers(apiCheckers);
    }
  const healthCheckerService = useHealthChecker("wallet-api", walletApiCheckers, "node-endpoint", hiveChainService.setAiSearchEndpoint );
  const { t } = useTranslation('common_wallet');
  useEffect(() => {
    createApiCheckers();
  }, []);



  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        <div className="flex flex-col gap-8 ">
          <div className="flex gap-6">
            <WalletMenu username={username} />
          </div>
          <div className="px-2 py-8" data-testid="settings-preferences">
            <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
              {t('settings.preferences')}
            </h2>

            <Label htmlFor="choose-api-node">{t('settings.choose_api')}</Label>
            { !!healthCheckerService && <HealthCheckerComponent className='m-4' healthCheckerService={healthCheckerService} />}
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}

export default Communities;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      username: username.replace('@', ''),
      metadata: await getAccountMetadata(username, 'Settings'),
      ...(await getTranslations(ctx))
    }
  };
};
