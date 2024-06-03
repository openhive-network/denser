import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface UpdateProfileParams {
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
}

/**
 * Makes update profile transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateProfileMutation() {
  const updateProfileMutation = useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
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

      await transactionService.updateProfile(
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

      logger.info('Update profile: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUpdateProfileMutation onSuccess data: %o', data);
    }
  });

  const updateProfile = async (params: UpdateProfileParams) => {
    try {
      await updateProfileMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'updateProfile', ...params });
    }
  };

  return { updateProfile, updateProfileMutation };
}
