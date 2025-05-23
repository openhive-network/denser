import { Button } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import DialogLogin from '@/wallet/components/dialog-login';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { getServerSidePropsDefault } from '../lib/get-translations';
import { useRouter } from 'next/router';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useEffect } from 'react';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

const TAB_TITLE = 'Hive Wallet - Home';
export default function HomePage() {
  const { t } = useTranslation('common_wallet');
  const router = useRouter();
  const { user } = useUser();
  useEffect(() => {
    if (user.isLoggedIn) {
      router.push(`/@${user.username}/transfers`);
    }
  }, [user.isLoggedIn]);
  if (user.isLoggedIn) return null;

  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="mx-2 flex flex-col gap-24 pt-16 sm:flex-row sm:justify-around sm:gap-0">
        <div className="flex flex-col gap-3 sm:mr-4 sm:gap-8">
          <div className="text-lg font-bold sm:text-3xl">{t('wallet_index.title')}</div>
          <p className="text-sm leading-relaxed sm:max-w-xs">{t('wallet_index.content')}</p>
          <DialogLogin>
            <Button className="w-28 rounded-none" data-testid="wallet-login-button">
              {t('wallet_index.login_button')}
            </Button>
          </DialogLogin>
        </div>
        <div className="mr-6 sm:mt-6 sm:w-full sm:max-w-lg">
          <div className="h-[260px] w-full border-[1px] border-solid border-border bg-background-tertiary drop-shadow">
            <div className="relative right-[-10px] top-[-12px] h-[260px] w-full border-[1px] border-solid border-border bg-background-tertiary drop-shadow">
              <div className="relative right-[-10px] top-[-12px] flex h-[260px] w-full flex-col justify-center gap-4 border-[1px] border-solid border-border bg-background-tertiary pl-4 drop-shadow sm:pr-4">
                <div className="text-lg font-bold sm:text-2xl">{t('wallet_index.card.title')}</div>
                <div className="flex gap-3">
                  <Icons.hivetoken />
                  <span className="flex flex-col justify-center">
                    <span className="font-semibold" data-testid="hive-token-label">
                      HIVE
                    </span>
                    <p className="text-xs font-light text-primary/60">
                      {t('wallet_index.card.liquid_platform_token')}
                    </p>
                  </span>
                </div>{' '}
                <div className="flex gap-3">
                  <Icons.hivetokenpower />
                  <span className="flex flex-col justify-center">
                    <span className="font-semibold" data-testid="hive-power-token-label">
                      HIVE power
                    </span>
                    <p className="text-xs font-light text-primary/60">
                      {t('wallet_index.card.vesting_influence_token')}
                    </p>
                  </span>
                </div>{' '}
                <div className="flex gap-3">
                  <Icons.hbdtoken />
                  <span className="flex flex-col justify-center">
                    <span className="font-semibold" data-testid="hive-hbd-label">
                      HBD
                    </span>
                    <p className="text-xs font-light text-primary/60">
                      {t('wallet_index.card.seeks_price_stability')}
                    </p>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
