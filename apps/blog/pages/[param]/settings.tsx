import ProfileLayout from '@/blog/components/common/profile-layout';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components';
import { useLocalStorage } from 'usehooks-ts';
import { GetServerSideProps } from 'next';
import { useParams } from 'next/navigation';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { getAccountFull } from '@transaction/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { TFunction } from 'i18next';
import { MutableRefObject, useEffect, useRef, useState } from 'react';

import { Signer } from '@smart-signer/lib/signer/signer';
import { getLogger } from '@ui/lib/logging';
import { toast } from '@ui/components/hooks/use-toast';
import { useUnmuteMutation } from '@/blog/components/hooks/use-mute-mutations';
import { useUpdateProfileMutation } from '@/blog/components/hooks/use-update-profile-mutation';
import { z } from 'zod';
import { getAccountMetadata, getTranslations, MetadataProps } from '@/blog/lib/get-translations';
import { CircleSpinner } from 'react-spinners-kit';
import { useSignerContext } from '@smart-signer/components/signer-provider';
import { handleError } from '@ui/lib/handle-error';
import Head from 'next/head';
import { ApiChecker, HealthCheckerComponent } from '@hiveio/healthchecker-component';
import { useHealthChecker } from '@ui/hooks/useHealthChecker';

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
export interface Preferences {
  nsfw: 'hide' | 'warn' | 'show';
  blog_rewards: '0%' | '50%' | '100%';
  comment_rewards: '0%' | '50%' | '100%';
  referral_system: 'enabled' | 'disabled';
}
export const DEFAULT_PREFERENCES: Preferences = {
  nsfw: 'warn',
  blog_rewards: '50%',
  comment_rewards: '50%',
  referral_system: 'enabled'
};
const DEFAULT_SETTINGS: Settings = {
  profile_image: '',
  cover_image: '',
  name: '',
  about: '',
  location: '',
  website: '',
  blacklist_description: '',
  muted_list_description: ''
};

const urlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith('https://') || url.startsWith('http://'), {
    message: 'This Appears To Be A Bad URL, Please Check It And Try Again'
  });

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

    const postUrl = `${configuredImagesEndpoint}${username}/${sig}`;

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

export default function UserSettings({ metadata }: { metadata: MetadataProps }) {
  const { user } = useUser();
  const { isLoading, data } = useQuery(['profileData', user.username], () => getAccountFull(user.username), {
    enabled: !!user.username
  });

  const profileData = data?.profile;
  const profileSettings: Settings = {
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
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const [isClient, setIsClient] = useState(false);
  const [insertImg, setInsertImg] = useState('');
  const [nodeApiCheckers, setNodeApiCheckers] = useState<ApiChecker[] | undefined>(undefined);
  const [aiSearchApiCheckers, setAiSearchApiCheckers] = useState<ApiChecker[] | undefined>(undefined);
  const params = useParams();
  const mutedQuery = useFollowListQuery(user.username, 'muted');
  const { t } = useTranslation('common_blog');
  const inputProfileRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const inputCoverRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const validationCheck = validation(settings, t);
  const disabledBtn = Object.values(validationCheck).some((value) => typeof value === 'string');
  const { signer } = useSignerContext();
  const sameData =
    profileSettings.profile_image === settings.profile_image &&
    profileSettings.cover_image === settings.cover_image &&
    profileSettings.name === settings.name &&
    profileSettings.location === settings.location &&
    profileSettings.website === settings.website &&
    profileSettings.about === settings.about &&
    profileSettings.blacklist_description === settings.blacklist_description &&
    profileSettings.muted_list_description === settings.muted_list_description;
  const unmuteMutation = useUnmuteMutation();
  const updateProfileMutation = useUpdateProfileMutation();

  const DEFAULT_AI_ENDPOINTS = [
    'https://api.hive.blog',
    'https://api.syncad.com',
    'https://api.openhive.network',
    'https://api.dev.openhive.network'
  ];

  const nodeHcService = useHealthChecker(
    'node-api',
    nodeApiCheckers,
    'node-endpoint',
    hiveChainService.setHiveChainEndpoint
  );
  const aiSearchHcService = useHealthChecker(
    'ai-search',
    aiSearchApiCheckers,
    'ai-search-endpoint',
    hiveChainService.setAiSearchEndpoint,
    DEFAULT_AI_ENDPOINTS
  );

  const createApiCheckers = async () => {
    const hiveChain = await hiveChainService.getHiveChain();
    const nodeApiCheckers: ApiChecker[] = [
      {
        title: 'Condenser - Get accounts',
        method: hiveChain.api.condenser_api.get_accounts,
        params: [['guest4test']],
        validatorFunction: (data) => (data[0].name === 'guest4test' ? true : 'Get block error')
      },
      {
        title: 'Bridge - Get post',
        method: hiveChain.api.bridge.get_post,
        params: { author: 'guest4test', permlink: '6wpmjy-test', observer: '' },
        validatorFunction: (data) => (data.author === 'guest4test' ? true : 'Get post error')
      }
    ];
    const aiSearchApiCheckers: ApiChecker[] = [
      {
        title: 'AI search',
        method: hiveChain.restApi['hivesense-api'].similarposts,
        params: {
          pattern: 'test',
          tr_body: 100,
          posts_limit: 20
        },
        validatorFunction: (data) => (data[0] ? true : 'AI search error')
      }
    ];
    setNodeApiCheckers(nodeApiCheckers);
    setAiSearchApiCheckers(aiSearchApiCheckers);
  };

  useEffect(() => {
    setIsClient(true);
    createApiCheckers();
  }, []);
  useEffect(() => {
    setSettings(profileSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);
  async function onSubmit() {
    const updateProfileParams = {
      profile_image: settings.profile_image !== '' ? settings.profile_image : undefined,
      cover_image: settings.cover_image !== '' ? settings.cover_image : undefined,
      name: settings.name !== '' ? settings.name : undefined,
      about: settings.about !== '' ? settings.about : undefined,
      location: settings.location !== '' ? settings.location : undefined,
      website: settings.website !== '' ? settings.website : undefined,
      witness_owner: profileData?.witness_owner,
      witness_description: profileData?.witness_description,
      blacklist_description:
        settings.blacklist_description !== '' ? settings.blacklist_description : undefined,
      muted_list_description:
        settings.muted_list_description !== '' ? settings.muted_list_description : undefined
    };

    try {
      await updateProfileMutation.mutateAsync(updateProfileParams);

      toast({
        title: t('settings_page.changes_saved'),
        variant: 'success'
      });
    } catch (error) {
      handleError(error, { method: 'updateProfile', params: updateProfileParams });
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
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        <div className="flex flex-col" data-testid="public-profile-settings">
          {isClient && user?.isLoggedIn && user?.username === params.param.slice(1) ? (
            <>
              <div className="py-8">
                <h2 className="py-4 text-lg font-semibold leading-5">
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
                        className="text-sm font-normal text-destructive hover:cursor-pointer"
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
                        //@ts-expect-error
                        onChange={inputProfileHandler}
                      />
                    </span>
                    <span className="pt-2 text-xs text-destructive">{validationCheck.profile_image}</span>
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
                        className="text-sm font-normal text-destructive hover:cursor-pointer"
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
                        //@ts-expect-error
                        onChange={inputCoverHandler}
                      />
                    </span>
                    <span className="pt-2 text-xs text-destructive">{validationCheck.cover_image}</span>
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
                    <span className="pt-2 text-xs text-destructive">{validationCheck.name}</span>
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
                    <span className="pt-2 text-xs text-destructive">{validationCheck.about}</span>
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
                    <span className="pt-2 text-xs text-destructive">{validationCheck.location}</span>
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
                    <span className="pt-2 text-xs text-destructive">{validationCheck.website}</span>
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
                    <span className="pt-2 text-xs text-destructive">
                      {validationCheck.blacklist_description}
                    </span>
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
                    <span className="pt-2 text-xs text-destructive">
                      {validationCheck.muted_list_description}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => onSubmit()}
                  className="my-4 w-44"
                  data-testid="pps-update-button"
                  disabled={sameData || disabledBtn || updateProfileMutation.isLoading || data?._temporary}
                >
                  {updateProfileMutation.isLoading ? (
                    <span className="flex items-center justify-center">
                      <CircleSpinner loading={updateProfileMutation.isLoading} size={18} color="#dc2626" />
                    </span>
                  ) : (
                    t('settings_page.update')
                  )}
                </Button>
              </div>
              <div className="py-8" data-testid="settings-preferences">
                <h2 className="py-4 text-lg font-semibold leading-5">{t('settings_page.preferences')}</h2>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
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

          <div className="p-8">
            <Accordion type="single" collapsible defaultValue="main-hc">
              <AccordionItem value="main-hc">
                <AccordionTrigger>API Endpoint</AccordionTrigger>
                <AccordionContent>
                  {!!nodeHcService && (
                    <HealthCheckerComponent className="m-4" healthCheckerService={nodeHcService} />
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="search-hc">
                <AccordionTrigger>Endpoint for AI search</AccordionTrigger>
                <AccordionContent>
                  {!!aiSearchHcService && (
                    <HealthCheckerComponent className="m-4" healthCheckerService={aiSearchHcService} />
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          {mutedQuery.data ? (
            <div>
              <div>{t('settings_page.muted_users')}</div>
              <ul>
                {mutedQuery.data.map((mutedUser, index) => {
                  const mute_item =
                    unmuteMutation.isLoading && unmuteMutation.variables?.username === mutedUser.name;
                  return (
                    <li key={mutedUser.name}>
                      <span>{index + 1}. </span>
                      <span className="text-destructive">{mutedUser.name}</span>
                      <Button
                        className="h-fit p-1 text-destructive"
                        variant="link"
                        onClick={async () => {
                          const params = { username: mutedUser.name };
                          try {
                            await unmuteMutation.mutateAsync(params);
                          } catch (error) {
                            handleError(error, { method: 'unmute', params });
                          }
                        }}
                        disabled={mute_item}
                      >
                        [
                        {mute_item ? (
                          <span className="flex items-center justify-center">
                            <CircleSpinner loading={unmuteMutation.isLoading} size={18} color="#dc2626" />
                          </span>
                        ) : (
                          t('settings_page.unmute')
                        )}
                        ]
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </ProfileLayout>
    </>
  );
}
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      metadata: await getAccountMetadata((ctx.params?.param as string) ?? '', 'Settings'),
      ...(await getTranslations(ctx))
    }
  };
};
