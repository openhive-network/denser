import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useQuery } from '@tanstack/react-query';
import { getDynamicGlobalProperties } from '@hive/ui/lib/hive';
import { getVestingDelegations } from '@/wallet/lib/hive';
import Loading from '@hive/ui/components/loading';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';
import { useTranslation } from 'next-i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import { Input, Separator } from '@ui/components';

function Permissions({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  return (
    <ProfileLayout>
      <div className="flex flex-col gap-8 ">
        <div className="flex gap-6">
          <WalletMenu username={username} />
        </div>
        <div className="flex flex-col gap-8 px-4">
          <h1 className="text-2xl font-semibold">Keys & Permissions</h1>
          <div className="flex gap-6">
            <div className="flex flex-col gap-6 text-sm">
              <p>
                Any password or key is more likely to get compromised the more it is used. That's why Hive
                uses a hierarchical key system to keep you safe. You are issued with four keys which have
                different permissions. For example, the Posting Key (which is intended to be used frequently)
                has a limited set of permissions for social actions that require less security. You'll need to
                be more careful with your Active Key since it has permissions to perform wallet related
                actions
              </p>
              <p>
                Please take note of your Hive Keys listed below. Ideally, use a Password Manager (like
                1Password or LastPass) or store an offline copy safely (on a piece of paper or on a file on a
                USB drive).
              </p>
            </div>
            <img className="w-[300px]" src="/22c1f34f0456af880028970e289b54c9.png" />
          </div>
          <div className="flex flex-col gap-6 bg-white p-2 text-sm">
            <h1 className="text-2xl font-semibold">Posting Key</h1>
            <Separator />
            <p>
              This key should be used for social networking actions, like posting, commenting and voting. This
              key has a limited set of permissions and it is not able to be used for monetary actions. So you
              can't lose money if someone else gets access to this key.
            </p>
            <p>
              Use this key to log in to other Hive-powered social networks like Hive.blog, Busy and Esteem.
              Store this key safely.
            </p>
            <div>
              <h1 className="text-lg font-semibold">Active Key permissions</h1>
              <Input className="bg-slate-200" value="wqinufiqwhuifhq783hfuq83hqsadasdasfas9h3q9ruq3h" />
            </div>
            <h1 className="text-lg font-semibold">Your PrivatePosting Key</h1>
            <ul className="flex flex-col gap-1">
              <li>Use your Active Key to:</li>
              <li>- Transfer tokens</li>
              <li>- Power HIVE up or down</li>
              <li>- Power HIVE up or down</li>
              <li>- Vote for witnesses</li>
              <li>- Place an order on an exchange</li>
              <li>- Certain profile changes</li>
              <li>- Publish a Witness price feed</li>
              <li>- Create a new user</li>
            </ul>
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}

export default Permissions;

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
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_wallet']))
    }
  };
};
