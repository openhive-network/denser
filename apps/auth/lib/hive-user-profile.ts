import { getAccount } from '@hive/ui/lib/hive';
import { getLogger } from "@hive/ui/lib/logging";

export interface HiveUserProfile {
    name?: string;
    picture?: string;
    website?: string;
}

const logger = getLogger('app');

/**
 * Get Hive user's profile data from posting_json_metadata.
 *
 * TODO We can also try to read profile from chainAccount.json_metadata,
 * when chainAccount.posting_json_metadata doesn't exist.
 */
export async function getHiveUserProfile(hiveUsername: string): Promise<HiveUserProfile> {
    const hiveUserProfile: HiveUserProfile = {};
    let chainAccount;
    try {
        chainAccount = await getAccount(hiveUsername);
        if (!chainAccount) {
            throw new Error(`gethiveUserProfile error: missing blockchain account "${hiveUsername}"`);
        }
        if (Object.prototype.hasOwnProperty.call(
                chainAccount, 'posting_json_metadata')) {
            let postingJsonMetadata: any = {};
                postingJsonMetadata = JSON.parse(
                    chainAccount.posting_json_metadata
                );
            if (Object.prototype.hasOwnProperty.call(
                    postingJsonMetadata, 'profile')) {
                if (Object.prototype.hasOwnProperty.call(
                        postingJsonMetadata.profile, 'name')) {
                    hiveUserProfile.name = postingJsonMetadata.profile.name;
                }
                if (Object.prototype.hasOwnProperty.call(
                        postingJsonMetadata.profile, 'profile_image')) {
                    hiveUserProfile.picture = postingJsonMetadata
                        .profile.profile_image;
                }
                if (Object.prototype.hasOwnProperty.call(
                        postingJsonMetadata.profile, 'website')) {
                    hiveUserProfile.website = postingJsonMetadata
                        .profile.website;
                }
            }
        }
    } catch (error) {
        if (!chainAccount) {
            logger.error(error);
            throw error;
        }
    }
    return hiveUserProfile;
}
