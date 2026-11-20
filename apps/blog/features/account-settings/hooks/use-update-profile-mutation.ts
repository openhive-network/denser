import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import type { ProfileMetadataUpdate } from '@transaction/index';
import { mergePostingJsonMetadata } from '@transaction/lib/profile-metadata';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { recordAvatarVersion } from '@ui/lib/avatar-version';

type UpdateProfileParams = Omit<ProfileMetadataUpdate, 'version'> & { version?: number };

const PROFILE_METADATA_VERSION = 2; // signals the upgrade to posting_json_metadata

const withVersion = (params: UpdateProfileParams): ProfileMetadataUpdate => ({
  ...params,
  version: params.version ?? PROFILE_METADATA_VERSION
});

const changesImage = (params: UpdateProfileParams, prevProfile: FullAccount['profile']): boolean =>
  (params.profile_image ?? '') !== (prevProfile?.profile_image ?? '') ||
  (params.cover_image ?? '') !== (prevProfile?.cover_image ?? '');

export function useUpdateProfileMutation() {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const queryKey = ['profileData', user.username];
  return useOperationMutation({
    name: 'useUpdateProfileMutation',
    run: (params: UpdateProfileParams) =>
      transactionService.updateProfile(withVersion(params), OBSERVE),
    onSuccess: (_data, params, queryClient) => {
      const prevProfileData: FullAccount | undefined = queryClient.getQueryData(queryKey);
      if (!prevProfileData) return;
      // The browser caches imagehoster's avatar redirect: version this user's own avatar URL
      if (changesImage(params, prevProfileData.profile)) recordAvatarVersion(user.username);
      queryClient.setQueryData(queryKey, {
        ...prevProfileData,
        posting_json_metadata: mergePostingJsonMetadata(prevProfileData.posting_json_metadata, withVersion(params)),
        profile: {
          ...prevProfileData.profile,
          profile_image: params.profile_image,
          cover_image: params.cover_image,
          name: params.name,
          about: params.about,
          location: params.location,
          website: params.website,
          blacklist_description: params.blacklist_description,
          muted_list_description: params.muted_list_description,
          version: params.version
        },
        _temporary: true
      });
    },
    successToast: () => ({
      title: t('settings_page.profile_toasts.updated_title'),
      description: t('settings_page.profile_toasts.updated_description')
    }),
    invalidate: () => [queryKey],
    invalidateDelays: [4000]
  });
}
