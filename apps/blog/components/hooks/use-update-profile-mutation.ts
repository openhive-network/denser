import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes update profile transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateProfileMutation() {
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
      const response = { ...params, broadcastResult };
      logger.info('Done update profile transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUpdateProfileMutation onSuccess data: %o', data);
    }
  });

  return updateProfileMutation;
}
