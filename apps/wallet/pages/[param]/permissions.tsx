import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import WalletMenu from '@/wallet/components/wallet-menu';
import { Card, Separator } from '@ui/components';
import Link from 'next/link';
import { cn } from '@ui/lib/utils';
import { getTranslations } from '../../lib/get-translations';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import env from '@beam-australia/react-env';
import { useState } from 'react';
import { getPrivateKeys } from '@transaction/lib/hive';
import { toast } from '@ui/components/hooks/use-toast';
import RevealKeyComponent from '@/wallet/components/receal-key-component';

function Permissions({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const { user } = useUser();
  const explorerURL = env('EXPLORER_DOMAIN');
  const wifLogin = user.isLoggedIn && user.loginType === 'wif';
  const [reveal, setReveal] = useState({
    posting: false,
    active: false,
    owner: false,
    memo: false
  });
  const mockValue = Array.from({ length: 50 }, (_, i) => '1')
    .toString()
    .replace(/,/g, '');
  const [keys, setKeys] = useState({
    posting: mockValue,
    active: mockValue,
    owner: mockValue,
    memo: mockValue
  });
  const onReveal = async (password: string, keyType: 'posting' | 'active' | 'owner' | 'memo') => {
    if (keys[keyType] !== mockValue) {
      setReveal((prev) => ({ ...prev, [keyType]: true }));
      return;
    }
    try {
      const keysCheck = await getPrivateKeys(user.username, password);
      if (keysCheck.some((key) => key.correctKey !== true)) {
        toast({
          title: 'Error',
          description: 'Invalid password',
          variant: 'destructive'
        });
      } else {
        setKeys((prev) => ({
          posting: keysCheck.find((key) => key.type === 'posting')?.privateKey || prev.posting,
          active: keysCheck.find((key) => key.type === 'active')?.privateKey || prev.active,
          owner: keysCheck.find((key) => key.type === 'owner')?.privateKey || prev.owner,
          memo: keysCheck.find((key) => key.type === 'memo')?.privateKey || prev.memo
        }));
        setReveal((prev) => ({ ...prev, [keyType]: true }));
      }
    } catch {
      console.log('error');
    }
  };
  return (
    <ProfileLayout>
      <div className="flex flex-col gap-8 ">
        <div className="flex gap-6">
          <WalletMenu username={username} />
        </div>
        <div className="flex flex-col gap-8 px-6">
          <h1 className="text-2xl font-semibold">{t('permissions.keys_and_permissions')}</h1>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex flex-col gap-6 text-sm">
              <p>{t('permissions.any_password')}</p>
              <p>{t('permissions.note')}</p>
            </div>
            <img className="w-[300px]" src="/permissions.png" alt="Permmisions info graphic" />
          </div>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">{t('permissions.posting_key.name')}</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>{t('permissions.posting_key.info')}</p>
                <p>{t('permissions.posting_key.use')}</p>
                {wifLogin ? (
                  <RevealKeyComponent
                    reveal={reveal.posting}
                    keyValue={keys.posting}
                    onReveal={(password) => onReveal(password, 'posting')}
                    title={t('permissions.posting_key.private')}
                    mockValue={mockValue}
                    type="posting"
                  />
                ) : null}
              </div>

              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">{t('permissions.posting_key.permissions')}</h1>
                <span>{t('permissions.posting_key.to')}</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2">
                  <li>{t('permissions.posting_key.publish')}</li>
                  <li>{t('permissions.posting_key.edit')}</li>
                  <li>{t('permissions.posting_key.upvote')}</li>
                  <li>{t('permissions.posting_key.reblog')}</li>
                  <li>{t('permissions.posting_key.follow')}</li>
                  <li>{t('permissions.posting_key.mute')}</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">{t('permissions.active_key.name')}</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>{t('permissions.active_key.info')}</p>
                <p>{t('permissions.active_key.use')}</p>
                {wifLogin ? (
                  <RevealKeyComponent
                    reveal={reveal.active}
                    keyValue={keys.active}
                    onReveal={(password) => onReveal(password, 'active')}
                    title={t('permissions.active_key.private')}
                    mockValue={mockValue}
                    type="active"
                  />
                ) : null}
              </div>
              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">{t('permissions.active_key.permissions')}</h1>
                <span>{t('permissions.active_key.to')}</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2 ">
                  <li>{t('permissions.active_key.transfer')}</li>
                  <li>{t('permissions.active_key.power_hive')}</li>
                  <li>{t('permissions.active_key.vote')}</li>
                  <li>{t('permissions.active_key.place_order')}</li>
                  <li>{t('permissions.active_key.profile_changes')}</li>
                  <li>{t('permissions.active_key.publish')}</li>
                  <li>{t('permissions.active_key.create')}</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">{t('permissions.owner_key.name')}</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>{t('permissions.owner_key.info')}</p>
                {wifLogin ? (
                  <RevealKeyComponent
                    reveal={reveal.owner}
                    keyValue={keys.owner}
                    onReveal={(password) => onReveal(password, 'owner')}
                    title={t('permissions.owner_key.private')}
                    mockValue={mockValue}
                    type="owner"
                  />
                ) : null}
              </div>
              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">{t('permissions.owner_key.permissions')}</h1>
                <span>{t('permissions.owner_key.to')}</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2">
                  <li>{t('permissions.owner_key.reset')}</li>
                  <li>{t('permissions.owner_key.recover')}</li>
                  <li>{t('permissions.owner_key.decline')}</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">{t('permissions.memo_key.name')}</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>{t('permissions.memo_key.info')}</p>

                {wifLogin ? (
                  <RevealKeyComponent
                    reveal={reveal.memo}
                    keyValue={keys.memo}
                    onReveal={(password) => onReveal(password, 'memo')}
                    title={t('permissions.memo_key.private')}
                    mockValue={mockValue}
                    type="memo"
                  />
                ) : null}
              </div>
              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">{t('permissions.memo_key.permissions')}</h1>
                <span>{t('permissions.memo_key.to')}</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2">
                  <li>{t('permissions.memo_key.send')}</li>
                  <li>{t('permissions.memo_key.view')}</li>
                </ul>
              </div>
            </div>
          </Card>

          <Separator />
          <div className="flex flex-col gap-4 py-12 text-sm">
            <h1 className="text-xl font-semibold">{t('permissions.public_keys')}</h1>
            <p>{t('permissions.public_info')}</p>
            <div>
              <p>{t('permissions.view_public')}</p>
              <Link href={`${explorerURL}L/@${username}`} className="font-bold text-red-600">
                {`Block Explorer - ${username}`}
              </Link>
            </div>
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
      ...(await getTranslations(ctx))
    }
  };
};
