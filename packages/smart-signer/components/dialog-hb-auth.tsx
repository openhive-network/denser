import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import { ReactNode, SyntheticEvent, useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@ui/components';
import { isBrowser, AuthUser } from '@hive/hb-auth';
import type { KeyAuthorityType } from '@hive/hb-auth';
import { toast } from '@ui/components/hooks/use-toast';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { DialogPasswordModalPromise } from '@smart-signer/components/dialog-password';
import { RadioGroup } from '@ui/components/radio-group';
import { radioGroupItems, IRadioGroupItem } from '@smart-signer/components/radio-group-item';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

interface DialogHBAuthProps {
  children: ReactNode;
  defaultKeyType?: KeyAuthorityType;
  resetToDefaultKeyTypeOnOpen?: boolean;
  onAuthComplete?: (username: string, keyType: KeyAuthorityType) => void;
  i18nNamespace?: string;
}

export function DialogHBAuth({
  children,
  defaultKeyType = 'posting',
  resetToDefaultKeyTypeOnOpen = true,
  onAuthComplete = (username: string, keyType: KeyAuthorityType) => { return },
  i18nNamespace = 'smart-signer'
}: DialogHBAuthProps) {
  const { t } = useTranslation(i18nNamespace);
  const [open, setOpen] = useState(false);
  const [keyTypeSwitch, setKeyTypeSwitch] = useState<KeyAuthorityType>(defaultKeyType);

  const updateStatus = (user: AuthUser | null = null, err: any = null) => {
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
          variant: 'default'
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
    const keyType = form.get('keyType') as KeyAuthorityType;
    const key = form.get('key') as string;

    logger.info('handleSubmit input data: %o', { username, keyType, keyTypeSwitch, password, key });

    if (isBrowser) {
      const authClient = await hbauthService.getOnlineClient();

      if (target.name === 'login') {
        const auth = await authClient.getAuthByUser(username);
        if (auth?.authorized) {
          updateStatus(auth);
        } else {
          let password = '';
          try {
            const result = await DialogPasswordModalPromise({
              isOpen: true,
              ...{
                i18nKeyPlaceholder: 'login_form.password_hbauth_placeholder',
                i18nKeyTitle: 'login_form.title_hbauth_dialog_password'
              }
            });
            password = result;
            if (!password) {
              updateStatus(null, 'No password');
              return;
            }
          } catch (error) {
            updateStatus(null, 'No password');
            return;
          }

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

  const items: IRadioGroupItem[] = [
    {
      value: 'posting',
      disabled: false,
      labelText: t(`login_form.posting_private_key_placeholder`),
      labelImageSrc: '',
      labelImageAlt: ''
    },
    {
      value: 'active',
      disabled: false,
      labelText: t(`login_form.active_private_key_placeholder`),
      labelImageSrc: '',
      labelImageAlt: ''
    }
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={
        (open: boolean) => {
          setOpen(open);
          // Reset key to default value on every dialog open.
          if (resetToDefaultKeyTypeOnOpen && open) setKeyTypeSwitch(defaultKeyType);
        }
      }
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog-hb-auth">
        <Tabs defaultValue="login" className="w-full py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="hbauth-unlock-key-button">
              {t('login_form.title_action_unlock_key')}
            </TabsTrigger>
            <TabsTrigger value="authorize" data-testid="hbauth-add-key-button">
              {t('login_form.title_action_add_key')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
              <div className="mx-auto flex w-full max-w-md flex-col items-center">
                <h2 className="w-full pb-6 text-3xl text-gray-800" data-testid="hbauth-unlock-key-header">
                  {t('login_form.title_hbauth_form')}
                  {t('login_form.title_action_unlock_key')}
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
                      data-testid="hbauth-unlock-key-username-input"
                    />
                    <span className="absolute top-0 h-full w-10 rounded-bl-lg rounded-tl-lg bg-gray-400 text-gray-600">
                      <div className="flex h-full w-full items-center justify-center"> @</div>
                    </span>
                  </div>
                  <div className="mb-5" data-testid="hbauth-unlock-key-select-key-type">

                    {/* <Select name="keytype" onValueChange={(e) => setKey(e)}>
                      <SelectTrigger
                        className="w-[200px]"
                        data-testid="hbauth-unlock-key-select-key-type-trigger"
                      >
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
                    </Select> */}

                    {/* <RadioGroup
                      defaultValue={keyTypeSwitch}
                      onValueChange={(v: KeyAuthorityType) => {
                        setKeyTypeSwitch(v)
                      }}
                      name='keyType'
                      aria-label={t('login_form.title_select_key_type')}
                    >
                      <h3>{t('login_form.title_select_key_type')}</h3>
                      {radioGroupItems(items)}
                    </RadioGroup> */}

                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none  disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
                      data-testid="hbauth-unlock-key-submit-button"
                    >
                      {t('login_form.login_button')}
                    </button>
                    <button
                      type="reset"
                      className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
                      data-testid="hbauth-unlock-key-reset-button"
                    >
                      {t('login_form.reset_button')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="authorize">
            <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
              <div className="mx-auto flex w-full max-w-md flex-col items-center">
                <h2 className="w-full pb-6 text-3xl text-gray-800" data-testid="hbauth-add-key-header">
                  {t('login_form.title_hbauth_form')}
                  {t('login_form.title_action_add_key')}
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
                      data-testid="hbauth-add-key-username-input"
                    />
                    <span className="absolute top-0 h-full w-10 rounded-bl-lg rounded-tl-lg bg-gray-400 text-gray-600">
                      <div className="flex h-full w-full items-center justify-center"> @</div>
                    </span>
                  </div>
                  <div className="mb-5">
                    <input
                      autoComplete="current-password"
                      type="password"
                      id="password"
                      name="password"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                      placeholder="Password"
                      required
                      data-testid="hbauth-add-key-password-input"
                    />
                  </div>

                  <div className="mb-5" data-testid="hbauth-add-key-select-key-type">

                    {/* <Select name="keytype">
                      <SelectTrigger
                        className="w-[200px]"
                        data-testid="hbauth-add-key-select-key-type-trigger"
                      >
                        <SelectValue placeholder="Select a key type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Key type</SelectLabel>
                          <SelectItem value="posting">Posting</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select> */}

                    {/* <RadioGroup
                      defaultValue={keyTypeSwitch}
                      onValueChange={(v: KeyAuthorityType) => {
                        setKeyTypeSwitch(v);
                      }}
                      name='keyType'
                      aria-label={t('login_form.title_select_key_type')}
                    >
                      <h3>{t('login_form.title_select_key_type')}</h3>
                      {radioGroupItems(items)}
                    </RadioGroup> */}

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
                      data-testid="hbauth-add-key-private-key-input"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none  disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
                      data-testid="hbauth-add-key-submit-button"
                    >
                      {t('login_form.login_button')}
                    </button>
                    <button
                      type="reset"
                      className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
                      data-testid="hbauth-add-key-reset-button"
                    >
                      {t('login_form.reset_button')}
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
