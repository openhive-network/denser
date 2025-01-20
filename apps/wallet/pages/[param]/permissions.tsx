import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import WalletMenu from '@/wallet/components/wallet-menu';
import { Button, Card, Input, Label, Separator } from '@ui/components';
import Link from 'next/link';
import { cn } from '@ui/lib/utils';
import { getTranslations } from '../../lib/get-translations';
import { useTranslation } from 'next-i18next';

function Permissions({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');

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
                <div className="flex flex-col">
                  <Label htmlFor="postingKey" className="text-lg font-semibold">
                    {t('permissions.posting_key.private')}
                  </Label>
                  <div className="md:relative md:h-10">
                    <Input
                      className="left-0 h-full md:absolute"
                      type="password"
                      id="postingKey"
                      name="postingKey"
                      value="wqinufiqwhuifhq783hfuq83hqsadasdasfas9h3q9ruq3h"
                    />
                    <Button className="right-0 mt-4 h-full p-2 md:absolute md:mt-0 md:rounded-l-none">
                      {t('permissions.reveal')}
                    </Button>
                  </div>
                </div>
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
                <div className="flex flex-col">
                  <Label htmlFor="activeKey" className="text-lg font-semibold">
                    {t('permissions.active_key.private')}
                  </Label>
                  <div className="relative md:h-10">
                    <Input
                      className="left-0 h-full md:absolute"
                      type="password"
                      id="activeKey"
                      name="activeKey"
                      value="wqinufiqwhuifhq783hfuq83hqsadasdasfas9h3q9ruq3h"
                    />
                    <Button className="right-0 mt-4 h-full p-2 md:absolute md:mt-0 md:rounded-l-none">
                      {t('permissions.reveal')}
                    </Button>
                  </div>
                </div>
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
                <div className="flex flex-col">
                  <Label htmlFor="ownerKey" className="text-lg font-semibold">
                    {t('permissions.owner_key.private')}
                  </Label>
                  <div className="relative md:h-10">
                    <Input
                      className="left-0 h-full md:absolute"
                      type="password"
                      id="ownerKey"
                      name="ownerKey"
                      value="wqinufiqwhuifhq783hfuq83hqsadasdasfas9h3q9ruq3h"
                    />
                    <Button className="right-0 mt-4 h-full p-2 md:absolute md:mt-0 md:rounded-l-none">
                      {t('permissions.reveal')}
                    </Button>
                  </div>
                </div>
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

                <div className="flex flex-col">
                  <Label htmlFor="memoKey" className="text-lg font-semibold">
                    {t('permissions.memo_key.private')}
                  </Label>
                  <div className="relative md:h-10">
                    <Input
                      className="left-0 h-full md:absolute"
                      type="password"
                      id="memoKey"
                      name="memoKey"
                      value="wqinufiqwhuifhq783hfuq83hqsadasdasfas9h3q9ruq3h"
                    />
                    <Button className="right-0 mt-4 h-full p-2 md:absolute md:mt-0 md:rounded-l-none">
                      {t('permissions.reveal')}
                    </Button>
                  </div>
                </div>
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
              <Link href="hiveblocks.com/@guest4test1" className="font-bold text-red-600">
                hiveblocks.com/@guest4test1
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
