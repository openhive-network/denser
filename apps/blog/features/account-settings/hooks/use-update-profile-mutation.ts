import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { FullAccount } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type UpdateProfileParams = {
  profile_image?: string;
  cover_image?: string;
  name?: string;
  about?: string;
  location?: string;
  website?: string;
  witness_owner?: string;
  witness_description?: string;
  blacklist_description?: string;
  muted_list_description?: string;
  version?: number;
};

export function useUpdateProfileMutation() {
  const { user } = useUserClient();
  const queryKey = ['profileData', user.username];
  return useOperationMutation({
    name: 'useUpdateProfileMutation',
    run: (params: UpdateProfileParams) =>
      transactionService.updateProfile(
        params.profile_image,
        params.cover_image,
        params.name,
        params.about,
        params.location,
        params.website,
        params.witness_owner,
        params.witness_description,
        params.blacklist_description,
        params.muted_list_description,
        params.version,
        OBSERVE
      ),
    onSuccess: (_data, params, queryClient) => {
      const prevProfileData: FullAccount | undefined = queryClient.getQueryData(queryKey);
      if (!prevProfileData) return;
      queryClient.setQueryData(queryKey, {
        ...prevProfileData,
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
      title: 'Profile updated successfully',
      description: 'Your profile has been updated.'
    }),
    invalidate: () => [queryKey],
    invalidateDelays: [4000]
  });
}
