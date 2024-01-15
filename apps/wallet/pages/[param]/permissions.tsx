import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';
import WalletMenu from '@/wallet/components/wallet-menu';
import { Button, Card, Input, Label, Separator } from '@ui/components';
import Link from 'next/link';
import { cn } from '@ui/lib/utils';

function Permissions({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ProfileLayout>
      <div className="flex flex-col gap-8 ">
        <div className="flex gap-6">
          <WalletMenu username={username} />
        </div>
        <div className="flex flex-col gap-8 px-6">
          <h1 className="text-2xl font-semibold">Keys & Permissions</h1>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex flex-col gap-6 text-sm">
              <p>
                Any password or key is more likely to get compromised the more it is used. That&apos;s why
                Hive uses a hierarchical key system to keep you safe. You are issued with four keys which have
                different permissions. For example, the Posting Key (which is intended to be used frequently)
                has a limited set of permissions for social actions that require less security. You&apos;ll
                need to be more careful with your Active Key since it has permissions to perform wallet
                related actions
              </p>
              <p>
                Please take note of your Hive Keys listed below. Ideally, use a Password Manager (like
                1Password or LastPass) or store an offline copy safely (on a piece of paper or on a file on a
                USB drive).
              </p>
            </div>
            <img className="w-[300px]" src="/permissions.png" alt="Permmisions info graphic" />
          </div>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">Posting Key</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>
                  This key should be used for social networking actions, like posting, commenting and voting.
                  This key has a limited set of permissions and it is not able to be used for monetary
                  actions. So you can&apos;t lose money if someone else gets access to this key.
                </p>
                <p>
                  Use this key to log in to other Hive-powered social networks like Hive.blog, Busy and
                  Esteem. Store this key safely.
                </p>
                <div className="flex flex-col">
                  <Label htmlFor="postingKey" className="text-lg font-semibold">
                    Your Private Posting Key
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
                      Reveal
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">Posting Key permissions</h1>
                <span>Use your Posting Key to:</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2">
                  <li>Publish a post or comment</li>
                  <li>Edit a post or comment</li>
                  <li>Upvote or downvote</li>
                  <li>Reblog content</li>
                  <li>Follow people</li>
                  <li>Mute accounts</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">Active Key</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>
                  This key has additional permissions for more sensitive monetary-related actions, like
                  transferring and exchanging tokens.
                </p>
                <p>
                  When performing a wallet related action, you may be prompted to authenticate with your
                  Active key. You should only enter your Active Key into apps which you trust because anyone
                  with access to this key can take your tokens. Do yourself a favor and store this key safely
                  to avoid losing tokens in the future.
                </p>
                <div className="flex flex-col">
                  <Label htmlFor="activeKey" className="text-lg font-semibold">
                    Your Private Active Key
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
                      Reveal
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">Active Key permissions</h1>
                <span>Use your Active Key to:</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2 ">
                  <li>Transfer tokens</li>
                  <li>Power HIVE up or down</li>
                  <li>Power HIVE up or down</li>
                  <li>Vote for witnesses</li>
                  <li>Place an order on an exchange</li>
                  <li>Certain profile changes</li>
                  <li>Publish a Witness price feed</li>
                  <li>Create a new user</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">Owner Key</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>
                  The owner key is required to change the other keys. This key has additional permissions to
                  recover your account or change your other keys. It&apos;s the most important key and should
                  be securely stored offline.
                </p>
                <div className="flex flex-col">
                  <Label htmlFor="ownerKey" className="text-lg font-semibold">
                    Your Private Owner Key
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
                      Reveal
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">Owner Key permissions</h1>
                <span>Use your Owner Key to:</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2">
                  <li>Reset Owner, Active, and Posting keys</li>
                  <li>Recover your account</li>
                  <li>Decline voting rights</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className={cn('flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white')}>
            <h1 className="p-4 text-2xl font-semibold">Memo Key</h1>
            <Separator />
            <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
              <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
                <p>
                  The Memo key because it is a bit of an outlier. The only thing the Memo Key can do is
                  encrypt and decrypt private messages that are sent through the blockchain. While this could
                  one day be a powerful feature, today it is not commonly used. If you have received a private
                  message that you would like to decrypt, as always you should use the key with the minimum
                  necessary authorities, which in this case would be the Memo Key.
                </p>

                <div className="flex flex-col">
                  <Label htmlFor="memoKey" className="text-lg font-semibold">
                    Your Private Memo Key
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
                      Reveal
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col p-4">
                <h1 className="text-lg font-semibold">Memo Key permissions</h1>
                <span>Use your Memo Key to:</span>
                <ul className="flex list-disc flex-col gap-2 px-5 pt-2">
                  <li>Send an encrypted message</li>
                  <li>View an encrypted message</li>
                </ul>
              </div>
            </div>
          </Card>

          <Separator />
          <div className="flex flex-col gap-4 py-12 text-sm">
            <h1 className="text-xl font-semibold">Public Keys</h1>
            <p>
              Each Hive Key has a public and private key to encrypt and decrypt data. Public keys are
              associated with usernames and can be used to look up associated transactions on the blockchain.
              Your public keys are not required for login on Hive.blog and you don&apos;t need to store these
              safely.
            </p>
            <div>
              <p>View public key information for this account (in the &apos;Authorities&apos; module):</p>
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
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_wallet']))
    }
  };
};
