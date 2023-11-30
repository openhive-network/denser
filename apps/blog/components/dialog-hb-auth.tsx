import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { FormEventHandler, ReactNode, SyntheticEvent, useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
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
import { AlertCircle } from 'lucide-react';
import { OnlineClient, isBrowser, AuthStatus, AuthUser } from '@hive/hb-auth';
import type { KeyAuthorityType } from '@hive/hb-auth';

function DialogHBAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common_blog');
  const [auth, setAuth] = useState<AuthUser | null>();
  const [status, setStatus] = useState<AuthStatus>();

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = e.target as unknown as HTMLFormElement;

    const form = new FormData(e.target as HTMLFormElement);
    const username = form.get('username') as string;
    const password = form.get('password') as string;
    const keyType = form.get('keytype') as string as KeyAuthorityType;
    const key = form.get('key') as string;

    if (isBrowser) {
      const client = new OnlineClient();

      const authClient = await client.initialize();

      console.log('auth', auth);
      setAuth(auth);

      console.log({ username, password, keyType, key });

      if (target.name === 'login') {
        console.log('login');
        authClient
          .authenticate(username, password, keyType as KeyAuthorityType)
          .then(async (status) => {
            const auth = await authClient.getAuthByUser(username);
            setAuth(auth);
          })
          .catch((err) => {
            console.log(err);
          });
      }

      if (target.name === 'authorize') {
        console.log('authorize');
        authClient
          .register(username, password, key, keyType)
          .then(async (status) => {
            const auth = await authClient.getAuthByUser(username);
            setAuth(auth);
          })
          .catch((err) => {
            console.log(err);
          });
      }

      target.reset();
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog-hb-auth">
        {!auth ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>There is no registered user</AlertDescription>
          </Alert>
        ) : auth.authorized ? (
          <Alert variant="success">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              Authorized with username: <strong>@{auth.username}</strong>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              User: <strong>{auth.username}</strong> requires authorization
            </AlertDescription>
          </Alert>
        )}

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
