import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { ReactNode, SyntheticEvent, useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@ui/components';
import { isBrowser, AuthUser } from '@hive/hb-auth';
import type { KeyAuthorityType } from '@hive/hb-auth';
import { toast } from '@ui/components/hooks/use-toast';
import { authService } from '@/blog/lib/authService';

interface DialogHBAuthProps {
  children: ReactNode;
  onAuthComplete: (username: string, keyType: KeyAuthorityType) => void;
}

function DialogHBAuth({ children, onAuthComplete }: DialogHBAuthProps) {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);
  const [k, setKey] = useState('');

  const updateStatus = (user: AuthUser | null = null,  err = null) => {
    if (!user) {
      toast({
        title: 'Info!',
        description: `There is no registered user`,
        variant: 'default'
      });
    } else {
      if (user.authorized) {
        toast({
          title: 'Success!',
          description: `Authorized with username: @${user.username}`,
          variant: 'success'
        });
        setOpen(false);
        onAuthComplete(user.username, user.keyType!);
      } else {
        toast({
          title: 'Error!',
          description: `User: ${user.username} requires authorization`,
          variant: 'destructive'
        });
      }
    }

    if (err) {
      toast({
        title: 'Error!',
        description: `${err}`,
        variant: 'destructive'
      });
    }
  };

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = e.target as unknown as HTMLFormElement;

    const form = new FormData(e.target as HTMLFormElement);
    const username = form.get('username') as string;
    const password = form.get('password') as string;
    const keyType = form.get('keytype') as string as KeyAuthorityType;
    const key = form.get('key') as string;

    if (isBrowser) {
      const authClient = await authService.getOnlineClient();

      if (target.name === 'login') {
        authClient
          .authenticate(username, password, keyType)
          .then(async () => {
            const auth = await authClient.getAuthByUser(username);
            updateStatus(auth);
          })
          .catch((err: any) => {
            updateStatus(null, err);
          });
      }

      if (target.name === 'authorize') {
        authClient
          .register(username, password, key, keyType)
          .then(async () => {
            const auth = await authClient.getAuthByUser(username);
            updateStatus(auth);
          })
          .catch((err: any) => {
            updateStatus(null, err);
          });
      }

      target.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog-hb-auth">
        <Tabs defaultValue="login" className="w-full py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="authorize">Authorize</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
              <div className="mx-auto flex w-[440px] max-w-md flex-col items-center">
                <h2 className="w-full pb-6 text-3xl text-gray-800">
                  {t('login_form.title')}
                  {t('login_form.title_action_login_to_vote')}
                </h2>
                <form onSubmit={handleSubmit} className="w-full" name="login">
                  <div className="relative mb-5">
                    <input
                      type="text"
                      id="firstName"
                      name="username"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 pl-11 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                      placeholder={t('login_form.username_placeholder')}
                      required
                    />
                    <span className="absolute top-0 h-full w-10 rounded-bl-lg rounded-tl-lg bg-gray-400 text-gray-600">
                      <div className="flex h-full w-full items-center justify-center"> @</div>
                    </span>
                  </div>
                  <div className="mb-5">
                    <input
                      autoComplete="off"
                      type="password"
                      id="password"
                      name="password"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                      placeholder="Password"
                      required
                      disabled={k === 'watch'}
                    />
                  </div>

                  <div className="mb-5">
                    <Select name="keytype" onValueChange={(e) => setKey(e)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a key type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Key type</SelectLabel>
                          <SelectItem value="posting">Posting</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="watch">Watch Mode</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none  disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
                    >
                      {t('login_form.login_button')}
                    </button>
                    <button
                      type="reset"
                      className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
                    >
                      {t('login_form.cancel_button')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="authorize">
            <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
              <div className="mx-auto flex w-[440px] max-w-md flex-col items-center">
                <h2 className="w-full pb-6 text-3xl text-gray-800">
                  {t('login_form.title')}
                  {t('login_form.title_action_login_to_vote')}
                </h2>
                <form onSubmit={handleSubmit} className="w-full" name="authorize">
                  <div className="relative mb-5">
                    <input
                      type="text"
                      id="firstName"
                      name="username"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 pl-11 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                      placeholder={t('login_form.username_placeholder')}
                      required
                    />
                    <span className="absolute top-0 h-full w-10 rounded-bl-lg rounded-tl-lg bg-gray-400 text-gray-600">
                      <div className="flex h-full w-full items-center justify-center"> @</div>
                    </span>
                  </div>
                  <div className="mb-5">
                    <input
                      autoComplete="off"
                      type="password"
                      id="password"
                      name="password"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                      placeholder="Password"
                      required
                    />
                  </div>

                  <div className="mb-5">
                    <Select name="keytype">
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a key type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Key type</SelectLabel>
                          <SelectItem value="posting">Posting</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mb-5">
                    <input
                      autoComplete="off"
                      type="password"
                      id="key"
                      name="key"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                      placeholder="Your private key"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none  disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
                    >
                      {t('login_form.login_button')}
                    </button>
                    <button
                      type="reset"
                      className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
                    >
                      {t('login_form.cancel_button')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default DialogHBAuth;
