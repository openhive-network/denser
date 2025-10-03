import { getLogger } from '@hive/ui/lib/logging';
import { getAccount } from '@transaction/lib/hive-api';

const logger = getLogger('app');

export interface HiveUserProfile {
  name?: string;
  picture?: string;
  website?: string;
}

/**
 * Get Hive user's profile data from posting_json_metadata. Then output
 * properties as standard or custom id_token jwt claims.
 *
 * @param {string} hiveUsername
 * @return {*}
 */
export const getHiveUserProfile = async (hiveUsername: string): Promise<HiveUserProfile> => {
  const hiveUserProfile: HiveUserProfile = {};

  // Add properties to user profile.
  try {
    const chainAccount = await getAccount(hiveUsername);
    if (!chainAccount) {
      logger.error('gethiveUserProfile error: missing blockchain account', hiveUsername);
      return hiveUserProfile;
    }

    if (Object.prototype.hasOwnProperty.call(chainAccount, 'posting_json_metadata')) {
      const postingJsonMetadata = JSON.parse(chainAccount.posting_json_metadata);
      if (Object.prototype.hasOwnProperty.call(postingJsonMetadata, 'profile')) {
        if (Object.prototype.hasOwnProperty.call(postingJsonMetadata.profile, 'name')) {
          hiveUserProfile.name = postingJsonMetadata.profile.name;
        }

        // The property `profile_image` is read in Rocket
        // Chat on each login, but changes don't cause
        // changing existing avatar. However a new image is
        // addded to the list of available avatars in Rocket
        // Chat.
        if (Object.prototype.hasOwnProperty.call(postingJsonMetadata.profile, 'profile_image')) {
          hiveUserProfile.picture = postingJsonMetadata.profile.profile_image;
        }

        // The property `website` does nothing in Rocket
        // Chat – there's not such field there.
        if (Object.prototype.hasOwnProperty.call(postingJsonMetadata.profile, 'website')) {
          hiveUserProfile.website = postingJsonMetadata.profile.website;
        }
      }
    }

    // TODO We can also try to read profile from
    // chainAccount.json_metadata, when
    // chainAccount.posting_json_metadata doesn't exist.
  } catch (error) {
    logger.error('gethiveUserProfile error', error);
  }
  return hiveUserProfile;
};
