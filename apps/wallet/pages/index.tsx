import { Button } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import DialogLogin from '@/wallet/components/dialog-login';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from 'next-i18next.config';

export default function HomePage() {
  const { t } = useTranslation('common_wallet');
  return (
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
        <div className="h-[260px] w-full border-[1px] border-solid border-slate-200 bg-white drop-shadow dark:bg-slate-900">
          <div className="relative right-[-10px] top-[-12px] h-[260px] w-full border-[1px] border-solid border-slate-200 bg-white drop-shadow dark:bg-slate-900">
            <div className="relative right-[-10px] top-[-12px] flex h-[260px] w-full flex-col justify-center gap-4 border-[1px] border-solid border-slate-200 bg-white pl-4 drop-shadow  dark:bg-slate-900 sm:pr-4">
              <div className="text-lg font-bold sm:text-2xl">{t('wallet_index.card.title')}</div>
              <div className="flex gap-3">
                <Icons.hivetoken />
                <span className="flex flex-col justify-center">
                  <span className="font-semibold" data-testid="hive-token-label">
                    Hive
                  </span>
                  <p className="text-xs font-light text-slate-500">
                    {t('wallet_index.card.liquid_platform_token')}
                  </p>
                </span>
              </div>{' '}
              <div className="flex gap-3">
                <Icons.hivetokenpower />
                <span className="flex flex-col justify-center">
                  <span className="font-semibold" data-testid="hive-power-token-label">
                    Hive power
                  </span>
                  <p className="text-xs font-light text-slate-500">
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
                  <p className="text-xs font-light text-slate-500">
                    {t('wallet_index.card.seeks_price_stability')}
                  </p>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_wallet',
        'smart-signer'
      ]))
    }
  };
};
