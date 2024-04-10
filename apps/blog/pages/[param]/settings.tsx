import { Icons } from '@ui/components/icons';
import ProfileLayout from '@/blog/components/common/profile-layout';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { siteConfig } from '@ui/config/site';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';
import { useParams } from 'next/navigation';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { cn } from '@ui/lib/utils';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { transactionService } from '@transaction/index';
import { hbauthUseStrictMode, hbauthService } from '@smart-signer/lib/hbauth-service';
import { getAccountFull } from '@transaction/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { TFunction } from 'i18next';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import env from '@beam-australia/react-env';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { Signer } from '@smart-signer/lib/signer/signer';
import { useSigner } from '@smart-signer/lib/use-signer';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
interface Settings {
  profile_image: string;
  cover_image: string;
  name: string;
  about: string;
  location: string;
  website: string;
  blacklist_description: string;
  muted_list_description: string;
}
interface Preferences {
  nsfw: 'hide' | 'warn' | 'show';
  blog_rewards: '0%' | '50%' | '100%';
  comment_rewards: '0%' | '50%' | '100%';
  referral_system: 'enabled' | 'disabled';
}
const DEFAULT_PREFERENCES: Preferences = {
  nsfw: 'hide',
  blog_rewards: '50%',
  comment_rewards: '50%',
  referral_system: 'enabled'
};
const DEFAULTS_ENDPOINTS = [
  'https://api.hive.blog',
  'https://api.openhive.network',
  'https://rpc.ausbit.dev',
  'https://anyx.io',
  'https://api.deathwing.me'
];

const uploadImg = async (file: File, username: string, signer: Signer): Promise<string> => {
  try {
    let data;

    if (file) {
      const reader = new FileReader();

      data = new Promise((resolve) => {
        reader.addEventListener('load', () => {
          const result = Buffer.from(reader.result!.toString(), 'binary');
          resolve(result);
        });
        reader.readAsBinaryString(file);
      });
    }

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    data = await data;
    const prefix = Buffer.from('ImageSigningChallenge');
    const buf = Buffer.concat([prefix, data as unknown as Uint8Array]);

    const sig = await signer.signChallenge({
      message: buf,
      password: ''
    });

    const postUrl = `${env('IMAGES_ENDPOINT')}${username}/${sig}`;

    const response = await fetch(postUrl, { method: 'POST', body: formData });
    const resJSON = await response.json();
    return resJSON.url;
  } catch (error) {
    logger.error('Error when uploading file %s: %o', file.name, error);
  }
  return '';
};

function validation(values: Settings, t: TFunction<'common_blog'>) {
  return {
    profile_image:
      values.profile_image && !/^https?:\/\//.test(values.profile_image)
        ? t('settings_page.invalid_url')
        : null,
    cover_image:
      values.cover_image && !/^https?:\/\//.test(values.cover_image) ? t('settings_page.invalid_url') : null,
    name:
      values.name && values.name.length > 20
        ? t('settings_page.name_is_too_long')
        : values.name && /^\s*@/.test(values.name)
          ? t('settings_page.name_must_not_begin_with')
          : null,
    about: values.about && values.about.length > 160 ? t('settings_page.about_is_too_long') : null,
    location: values.location && values.location.length > 30 ? t('settings_page.location_is_too_long') : null,
    website:
      values.website && values.website.length > 100
        ? t('settings_page.website_url_is_too_long')
        : values.website && !/^https?:\/\//.test(values.website)
          ? t('settings_page.invalid_url')
          : null,
    blacklist_description:
      values.blacklist_description && values.blacklist_description.length > 256
        ? t('settings_page.description_is_too_long')
        : null,
    muted_list_description:
      values.muted_list_description && values.muted_list_description.length > 256
        ? t('settings_page.description_is_too_long')
        : null
  };
}

export default function UserSettings() {
  const { user } = useUser();
  const { isLoading, error, data } = useQuery(
    ['profileData', user.username],
    () => getAccountFull(user.username),
    {
      enabled: !!user.username
    }
  );
  const profileData = data?.profile;
  const DEFAULT_SETTINGS: Settings = {
    profile_image: profileData?.profile_image ? profileData.profile_image : '',
    cover_image: profileData?.cover_image ? profileData.cover_image : '',
    name: profileData?.name ? profileData.name : '',
    about: profileData?.about ? profileData.about : '',
    location: profileData?.location ? profileData.location : '',
    website: profileData?.website ? profileData.website : '',
    blacklist_description: profileData?.blacklist_description ? profileData.blacklist_description : '',
    muted_list_description: profileData?.muted_list_description ? profileData.muted_list_description : ''
  };
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [endpoints, setEndpoints] = useLocalStorage('hive-blog-endpoints', DEFAULTS_ENDPOINTS);
  const [endpoint, setEndpoint] = useLocalStorage('hive-blog-endpoint', siteConfig.endpoint);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [insertImg, setInsertImg] = useState('');
  const params = useParams();
  const mutedQuery = useFollowListQuery(user.username, 'muted');
  const { t } = useTranslation('common_blog');
  const inputProfileRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const inputCoverRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const disabledBtn = validation(settings, t);
  const { signerOptions } = useSigner();
  const signer = getSigner(signerOptions);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const sameData =
    DEFAULT_SETTINGS.profile_image === settings.profile_image &&
    DEFAULT_SETTINGS.cover_image === settings.cover_image &&
    DEFAULT_SETTINGS.name === settings.name &&
    DEFAULT_SETTINGS.location === settings.location &&
    DEFAULT_SETTINGS.website === settings.website &&
    DEFAULT_SETTINGS.about === settings.about &&
    DEFAULT_SETTINGS.blacklist_description === settings.blacklist_description &&
    DEFAULT_SETTINGS.muted_list_description === settings.muted_list_description;

  async function onSubmit() {
    try {
      await transactionService.updateProfile(
        settings.profile_image !== '' ? settings.profile_image : undefined,
        settings.cover_image !== '' ? settings.cover_image : undefined,
        settings.name !== '' ? settings.name : undefined,
        settings.about !== '' ? settings.about : undefined,
        settings.location !== '' ? settings.location : undefined,
        settings.website !== '' ? settings.website : undefined,
        settings.blacklist_description !== '' ? settings.blacklist_description : undefined,
        settings.muted_list_description !== '' ? settings.muted_list_description : undefined
      );
    } catch (error) {
      console.error(error);
    }
  }
  const onImageUpload = async (file: File, username: string, signer: Signer) => {
    const url = await uploadImg(file, username, signer);
    return url;
  };

  const inputProfileHandler = async (event: { target: { files: FileList } }) => {
    if (event.target.files && event.target.files.length === 1) {
      setInsertImg('');
      const url = await onImageUpload(event.target.files[0], user.username, signer);
      setSettings((prev) => ({ ...prev, profile_image: url }));
    }
  };
  const inputCoverHandler = async (event: { target: { files: FileList } }) => {
    if (event.target.files && event.target.files.length === 1) {
      setInsertImg('');
      const url = await onImageUpload(event.target.files[0], user.username, signer);
      setSettings((prev) => ({ ...prev, cover_image: url }));
    }
  };
  return (
    <ProfileLayout>
      <div className="flex flex-col" data-testid="public-profile-settings">
        {isClient && user?.isLoggedIn && user?.username === params.param.slice(1) ? (
          <>
            <div className="py-8">
              <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
                {t('settings_page.public_profile_settings')}
              </h2>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div>
                  <Label htmlFor="profileImage">{t('settings_page.profile_image_url')}</Label>
                  <Input
                    type="text"
                    id="profileImage"
                    name="profileImage"
                    value={settings.profile_image}
                    onChange={(e) => setSettings((prev) => ({ ...prev, profile_image: e.target.value }))}
                  />
                  <span>
                    <Label
                      className="text-sm font-normal text-red-500 hover:cursor-pointer"
                      htmlFor="profilePicture"
                    >
                      {t('settings_page.upload_image')}
                    </Label>
                    <Input
                      id="profilePicture"
                      type="file"
                      className="hidden"
                      ref={inputProfileRef}
                      accept=".jpg,.png,.jpeg,.jfif,.gif,.webp"
                      name="avatar"
                      value={insertImg}
                      //@ts-ignore
                      onChange={inputProfileHandler}
                    />
                  </span>
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.profile_image}</span>
                </div>

                <div>
                  <Label htmlFor="coverImage">{t('settings_page.cover_image_url')}</Label>
                  <Input
                    type="text"
                    id="coverImage"
                    name="coverImage"
                    value={settings.cover_image}
                    onChange={(e) => setSettings((prev) => ({ ...prev, cover_image: e.target.value }))}
                  />
                  <span>
                    <Label
                      className="text-sm font-normal text-red-500 hover:cursor-pointer"
                      htmlFor="coverPicture"
                    >
                      {t('settings_page.upload_image')}
                    </Label>
                    <Input
                      id="coverPicture"
                      type="file"
                      className="hidden"
                      ref={inputCoverRef}
                      accept=".jpg,.png,.jpeg,.jfif,.gif,.webp"
                      name="avatar"
                      value={insertImg}
                      //@ts-ignore
                      onChange={inputCoverHandler}
                    />
                  </span>
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.cover_image}</span>
                </div>

                <div>
                  <Label htmlFor="name">{t('settings_page.profile_name')}</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={settings.name}
                    onChange={(e) => setSettings((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.name}</span>
                </div>

                <div>
                  <Label htmlFor="about">{t('settings_page.profile_about')}</Label>
                  <Input
                    type="email"
                    id="about"
                    name="about"
                    value={settings.about}
                    onChange={(e) => setSettings((prev) => ({ ...prev, about: e.target.value }))}
                  />
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.about}</span>
                </div>

                <div>
                  <Label htmlFor="location">{t('settings_page.profile_location')}</Label>
                  <Input
                    type="text"
                    id="location"
                    name="location"
                    value={settings.location}
                    onChange={(e) => setSettings((prev) => ({ ...prev, location: e.target.value }))}
                  />
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.location}</span>
                </div>

                <div>
                  <Label htmlFor="website">{t('settings_page.profile_website')}</Label>
                  <Input
                    type="text"
                    id="website"
                    name="website"
                    value={settings.website}
                    onChange={(e) => setSettings((prev) => ({ ...prev, website: e.target.value }))}
                  />
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.website}</span>
                </div>

                <div>
                  <Label htmlFor="blacklistDescription">{t('settings_page.blacklist_description')}</Label>
                  <Input
                    type="text"
                    id="blacklistDescription"
                    name="blacklistDescription"
                    value={settings.blacklist_description}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, blacklist_description: e.target.value }))
                    }
                  />
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.blacklist_description}</span>
                </div>

                <div>
                  <Label htmlFor="mutedListDescription">{t('settings_page.mute_list_description')}</Label>
                  <Input
                    type="text"
                    id="mutedListDescription"
                    name="mutedListDescription"
                    value={settings.muted_list_description}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, muted_list_description: e.target.value }))
                    }
                  />
                  <span className="pt-2 text-xs text-red-500">{disabledBtn.muted_list_description}</span>
                </div>
              </div>
              <Button
                onClick={() => onSubmit()}
                className="my-4 w-44"
                data-testid="pps-update-button"
                disabled={sameData}
              >
                {t('settings_page.update')}
              </Button>
            </div>
            <div className="py-8" data-testid="settings-preferences">
              <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
                {t('settings_page.preferences')}
              </h2>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div data-testid="choose-language">
                  <Label htmlFor="choose-language">{t('settings_page.choose_language')}</Label>
                  <Select defaultValue="en" name="choose-language">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Language" />
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

                <div data-testid="not-safe-for-work-content">
                  <Label htmlFor="not-safe-for-work-content">
                    {t('settings_page.not_safe_for_work_nsfw_content')}
                  </Label>
                  <Select
                    value={preferences.nsfw}
                    onValueChange={(e: 'hide' | 'warn' | 'show') =>
                      setPreferences((prev) => ({ ...prev, nsfw: e }))
                    }
                    name="not-safe-for-work-content"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not safe for work (NSFW) content" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="hide">{t('settings_page.always_hide')}</SelectItem>
                        <SelectItem value="warn">{t('settings_page.always_warn')}</SelectItem>
                        <SelectItem value="show">{t('settings_page.always_show')}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="blog-post-rewards">
                  <Label htmlFor="blog-post-rewards">{t('settings_page.choose_default_blog_payout')}</Label>
                  <Select
                    value={preferences.blog_rewards}
                    onValueChange={(e: '0%' | '50%' | '100%') =>
                      setPreferences((prev) => ({ ...prev, blog_rewards: e }))
                    }
                    name="blog-post-rewards"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('settings_page.choose_default_blog_payout')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="0%">{t('settings_page.decline_payout')}</SelectItem>
                        <SelectItem value="50%">{'50% HBD / 50% HP'}</SelectItem>
                        <SelectItem value="100%">{t('settings_page.power_up')}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="comment-post-rewards">
                  <Label htmlFor="comment-post-rewards">
                    {t('settings_page.choose_default_comment_payout')}
                  </Label>
                  <Select
                    name="comment-post-rewards"
                    value={preferences.comment_rewards}
                    onValueChange={(e: '0%' | '50%' | '100%') =>
                      setPreferences((prev) => ({ ...prev, comment_rewards: e }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('settings_page.choose_default_comment_payout')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="0%">{t('settings_page.decline_payout')}</SelectItem>
                        <SelectItem value="50%">{'50% HBD / 50% HP'}</SelectItem>
                        <SelectItem value="100%">{t('settings_page.power_up')}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div data-testid="referral-system">
                  <Label htmlFor="referral-system">{t('settings_page.default_beneficiaries')}</Label>
                  <Select
                    name="referral-system"
                    value={preferences.referral_system}
                    onValueChange={(e: 'enabled' | 'disabled') =>
                      setPreferences((prev) => ({ ...prev, referral_system: e }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Referral System" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="enabled">
                          {t('settings_page.default_beneficiaries_enabled')}
                        </SelectItem>
                        <SelectItem value="disabled">
                          {t('settings_page.default_beneficiaries_disabled')}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="py-8">
          <h2 className="py-4 text-lg font-semibold leading-5 text-slate-900 dark:text-white">
            {t('settings_page.advanced')}
          </h2>
          <h4 className="text-md py-2 font-semibold leading-5 text-slate-900 dark:text-white">
            {t('settings_page.api_endpoint_options')}
          </h4>
          <RadioGroup
            defaultValue={endpoint}
            className="w-full gap-0 md:w-8/12"
            data-testid="api-endpoint-radiogroup"
            onValueChange={async (newEndpoint) => {
              setEndpoint(newEndpoint);
              await hiveChainService.setHiveChainEndpoint(newEndpoint);
              await hbauthService.setOnlineClient(hbauthUseStrictMode, { node: newEndpoint });
            }}
            value={endpoint}
          >
            <div className="grid grid-cols-3">
              <span>{t('settings_page.endpoint')}</span>
              <span>{t('settings_page.preferred')}</span>
              <span>{t('settings_page.remove')}</span>
            </div>
            {endpoints?.map((endpoint, index) => (
              <div
                key={endpoint}
                className={cn(
                  'grid grid-cols-3 items-center p-2',
                  index % 2 === 0 ? 'bg-slate-100 dark:bg-slate-500' : 'bg-slate-200 p-2 dark:bg-slate-600'
                )}
              >
                <Label htmlFor={`e#{index}`}>{endpoint}</Label>
                <RadioGroupItem value={endpoint} id={`e#{index}`} className="border-red-600" />
                <Icons.trash />
              </div>
            ))}
          </RadioGroup>

          <div className="my-4 flex w-full max-w-sm items-center space-x-2" data-testid="add-api-endpoint">
            <Input
              type="text"
              placeholder="Add API Endpoint"
              value={newEndpoint}
              onChange={(e) => setNewEndpoint(e.target.value)}
            />
            <Button
              type="submit"
              onClick={() =>
                setEndpoints(endpoints ? [...endpoints, newEndpoint] : [...DEFAULTS_ENDPOINTS, newEndpoint])
              }
            >
              {t('settings_page.add_api_endpoint')}
            </Button>
          </div>
          <Button className="my-4 w-44">{t('settings_page.reset_endpoints')}</Button>
        </div>
        <div>
          {mutedQuery.data?.map((mutedUser, index) => (
            <>
              <div>{t('settings_page.muted_users')}</div>
              <ul>
                <li key={mutedUser.name}>
                  <span>{index + 1}. </span>
                  <span className="text-red-500">{mutedUser.name}</span>
                  <Button
                    className="text-red-500"
                    variant="link"
                    onClick={() => transactionService.unmute(mutedUser.name)}
                  >
                    [{t('settings_page.unmute')}]
                  </Button>
                </li>
              </ul>
            </>
          ))}
        </div>
      </div>
    </ProfileLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_blog',
        'smart-signer'
      ]))
    }
  };
};
