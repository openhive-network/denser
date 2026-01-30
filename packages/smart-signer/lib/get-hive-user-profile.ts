import { getLogger } from '@hive/ui/lib/logging';
import { getAccount } from '@transaction/lib/hive-api';

const logger = getLogger('app');

export interface HiveUserProfile {
  name?: string;
  picture?: string;
  website?: string;
  about?: string;
  location?: string;
}

interface ProfileData {
  name?: string;
  profile_image?: string;
  website?: string;
  about?: string;
  location?: string;
}

/**
 * Extract profile fields from a metadata profile object.
 */
const extractProfileFields = (profile: ProfileData): HiveUserProfile => {
  const result: HiveUserProfile = {};
  if (profile.name) result.name = profile.name;
  if (profile.profile_image) result.picture = profile.profile_image;
  if (profile.website) result.website = profile.website;
  if (profile.about) result.about = profile.about;
  if (profile.location) result.location = profile.location;
  return result;
};

/**
 * Safely parse JSON metadata and extract profile.
 */
const parseMetadataProfile = (jsonString: string | undefined): ProfileData | null => {
  if (!jsonString || jsonString === '' || jsonString === '{}') return null;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed?.profile || null;
  } catch {
    return null;
  }
};

/**
 * Get Hive user's profile data from posting_json_metadata, with fallback
 * to json_metadata if posting_json_metadata is empty.
 *
 * @param {string} hiveUsername
 * @return {*}
 */
export const getHiveUserProfile = async (hiveUsername: string): Promise<HiveUserProfile> => {
  try {
    const chainAccount = await getAccount(hiveUsername);
    if (!chainAccount) {
      logger.error('getHiveUserProfile error: missing blockchain account %s', hiveUsername);
      return {};
    }

    // Try posting_json_metadata first (preferred - updated by posting key)
    const postingProfile = parseMetadataProfile(chainAccount.posting_json_metadata);
    if (postingProfile) {
      return extractProfileFields(postingProfile);
    }

    // Fallback to json_metadata (updated by active key, may be older)
    const jsonProfile = parseMetadataProfile(chainAccount.json_metadata);
    if (jsonProfile) {
      return extractProfileFields(jsonProfile);
    }

    return {};
  } catch (error) {
    logger.error(error, 'getHiveUserProfile error');
    return {};
  }
};
