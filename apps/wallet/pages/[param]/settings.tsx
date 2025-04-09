import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { Label } from '@ui/components/label';
import { getAccountMetadata, getTranslations } from '@/wallet/lib/get-translations';
import Head from 'next/head';

function Communities({ username, metadata }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
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
            <Select defaultValue="api" name="choose-api-node">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="api">https://api.openhive.network</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
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
