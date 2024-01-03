import { KeyAuthorityType, AuthUser, isBrowser } from '@hive/hb-auth';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem
} from '@ui/components';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from 'next-i18next';
import { SyntheticEvent } from 'react';
import { authService } from '../lib/authService';

function AuthorizeForm() {
  const { t } = useTranslation('common_blog');

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = e.target as unknown as HTMLFormElement;

    const form = new FormData(e.target as HTMLFormElement);
    const username = form.get('username') as string;
    const password = form.get('password') as string;
    const keyType = form.get('keytype') as string as KeyAuthorityType;
    const key = form.get('key') as string;

    const updateStatus = (user: AuthUser | null = null, err = null) => {
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
          // onAuthComplete(user.username, user.keyType!);
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

    if (isBrowser) {
      const authClient = await authService.getOnlineClient();

      authClient
        .register(username, password, key, keyType)
        .then(async () => {
          const auth = await authClient.getAuthByUser(username);
          updateStatus(auth);
        })
        .catch((err: any) => {
          updateStatus(null, err);
        });

      target.reset();
    }
  }

  return (
    <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
      <div className="mx-auto flex w-[440px] max-w-md flex-col items-center">
        <h2 className="w-full pb-6 text-3xl text-gray-800">{t('login_form.authorize_button')}</h2>
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
                <SelectValue placeholder={t('login_form.select_a_key_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('login_form.key_type')}</SelectLabel>
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
              {t('login_form.authorize_button')}
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
  );
}

export default AuthorizeForm;
