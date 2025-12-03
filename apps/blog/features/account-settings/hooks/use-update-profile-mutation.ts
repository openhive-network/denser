import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { FullAccount } from '@transaction/lib/app-types';
import { toast } from '@ui/components/hooks/use-toast';

/**
 * Makes update profile transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateProfileMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const updateProfileMutation = useMutation({
    mutationFn: async (params: {
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
    }) => {
      const {
        profile_image,
        cover_image,
        name,
        about,
        location,
        website,
        witness_owner,
        witness_description,
        blacklist_description,
        muted_list_description,
        version
      } = params;
      const broadcastResult = await transactionService.updateProfile(
        profile_image,
        cover_image,
        name,
        about,
        location,
        website,
        witness_owner,
        witness_description,
        blacklist_description,
        muted_list_description,
        version,
        { observe: true }
      );
      const prevProfileData: FullAccount | undefined = queryClient.getQueryData([
        'profileData',
        user.username
      ]);

      const response = { ...params, broadcastResult, prevProfileData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const {
        prevProfileData,
        profile_image,
        cover_image,
        name,
        about,
        location,
        website,
        blacklist_description,
        muted_list_description,
        version
      } = data;
      if (!!prevProfileData) {
        queryClient.setQueryData(['profileData', user.username], {
          ...prevProfileData,
          profile: {
            ...prevProfileData.profile,
            profile_image,
            name,
            about,
            location,
            website,
            blacklist_description,
            muted_list_description,
            cover_image,
            version
          },
          _temporary: true
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Profile updated successfully',
        description: 'Your profile has been updated.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['profileData', user.username] });
      }, 4000);
    }
  });

  return updateProfileMutation;
}
