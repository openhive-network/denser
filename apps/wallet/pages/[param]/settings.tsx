import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';
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

function Communities({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  return (
    <ProfileLayout>
      <div className="flex flex-col gap-8 ">
        <div className="flex gap-6">
          <WalletMenu username={username} />
        </div>
        <div className="px-2 py-8" data-testid="settings-preferences">
          <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">Preferences</h2>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div data-testid="choose-language">
              <div className="py-1 text-sm">Choose Language</div>
              <Select defaultValue="en">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish Español</SelectItem>
                    <SelectItem value="ru">Russian русский</SelectItem>
                    <SelectItem value="fr">French français</SelectItem>
                    <SelectItem value="it">Italian italiano</SelectItem>
                    <SelectItem value="ko">Korean 한국어</SelectItem>
                    <SelectItem value="ja">Japanese 日本語</SelectItem>
                    <SelectItem value="pl">Polish Polski</SelectItem>
                    <SelectItem value="zh">Chinese 简体中文</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="py-1 text-sm">Choose Your Preferred API Node</div>
              <Select defaultValue="api">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="api">https://api.hive.blog</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </ProfileLayout>
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
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_wallet',
        'smart-signer'
      ]))
    }
  };
};
