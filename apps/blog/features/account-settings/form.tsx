'use client';

import { useTranslation } from '@/blog/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, Settings, uploadImg, validation } from './lib/utils';
import { Button } from '@ui/components/button';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
import { useUpdateProfileMutation } from './hooks/use-update-profile-mutation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@ui/components/select';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { CircleSpinner } from 'react-spinners-kit';
import { Signer } from '@smart-signer/lib/signer/signer';
import { useSignerContext } from '@smart-signer/components/signer-provider';

const SettingsForm = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');
  const { data } = useQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });
  const [preferences, setPreferences] = useLocalStorage<Preferences>(
    `user-preferences-${username}`,
    DEFAULT_PREFERENCES
  );
  const profileData = data?.profile;

  const { signer } = useSignerContext();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [insertImg, setInsertImg] = useState('');
  const inputProfileRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const inputCoverRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement>;
  const validationCheck = validation(settings, t);
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

  const updateProfileMutation = useUpdateProfileMutation();

  const sameData =
    profileSettings.profile_image === settings.profile_image &&
    profileSettings.cover_image === settings.cover_image &&
    profileSettings.name === settings.name &&
    profileSettings.location === settings.location &&
    profileSettings.website === settings.website &&
    profileSettings.about === settings.about &&
    profileSettings.blacklist_description === settings.blacklist_description &&
    profileSettings.muted_list_description === settings.muted_list_description;

  const disabledBtn = Object.values(validationCheck).some((value) => typeof value === 'string');

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

  const inputProfileHandler = async (event: { target: { files: FileList } }) => {
    if (event.target.files && event.target.files.length === 1) {
      setInsertImg('');
      const url = await onImageUpload(event.target.files[0], username, signer);
      setSettings((prev) => ({ ...prev, profile_image: url }));
    }
  };

  const onImageUpload = async (file: File, username: string, signer: Signer) => {
    const url = await uploadImg(file, username, signer);
    return url;
  };
  const inputCoverHandler = async (event: { target: { files: FileList } }) => {
    if (event.target.files && event.target.files.length === 1) {
      setInsertImg('');
      const url = await onImageUpload(event.target.files[0], username, signer);
      setSettings((prev) => ({ ...prev, cover_image: url }));
    }
  };

  useEffect(() => {
    setSettings(profileSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="py-8">
        <h2 className="py-4 text-lg font-semibold leading-5">{t('settings_page.public_profile_settings')}</h2>
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
              onChange={(e) => setSettings((prev) => ({ ...prev, blacklist_description: e.target.value }))}
            />
            <span className="pt-2 text-xs text-destructive">{validationCheck.blacklist_description}</span>
          </div>

          <div>
            <Label htmlFor="mutedListDescription">{t('settings_page.mute_list_description')}</Label>
            <Input
              type="text"
              id="mutedListDescription"
              name="mutedListDescription"
              value={settings.muted_list_description}
              onChange={(e) => setSettings((prev) => ({ ...prev, muted_list_description: e.target.value }))}
            />
            <span className="pt-2 text-xs text-destructive">{validationCheck.muted_list_description}</span>
          </div>
        </div>
        <Button
          onClick={() => onSubmit()}
          className="my-4 w-44"
          data-testid="pps-update-button"
          disabled={sameData || disabledBtn || updateProfileMutation.isPending || data?._temporary}
        >
          {updateProfileMutation.isPending ? (
            <span className="flex items-center justify-center">
              <CircleSpinner loading={updateProfileMutation.isPending} size={18} color="#dc2626" />
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
            <Label htmlFor="comment-post-rewards">{t('settings_page.choose_default_comment_payout')}</Label>
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
                  <SelectItem value="enabled">{t('settings_page.default_beneficiaries_enabled')}</SelectItem>
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
  );
};

export default SettingsForm;
