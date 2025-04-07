import { Icons } from '@ui/components/icons';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';

const TAB_TITLE = 'Hive Wallet - 404';
export default function FourOhFour() {
  const { t } = useTranslation('common_wallet');

  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="mx-auto flex flex-col items-center py-8">
        <Icons.hive className="h-16 w-16" />
        <h3 className="py-4 text-lg">{t('four_oh_four.this_page_does_not_exist')}</h3>
        <p className="text-md py-2">
          {t('four_oh_four.not_to_worry')}{' '}
          <Link href="/" className="text-blue-500 hover:cursor-pointer">
            {t('four_oh_four.our_homepage')}
          </Link>
        </p>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      ...(await serverSideTranslations(i18n.defaultLocale, ['common_wallet', 'smart-signer']))
    }
  };
};
