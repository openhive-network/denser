import type { User } from './user';
import { withIronSessionApiRoute } from 'iron-session/next';
import { sessionOptions } from 'lib/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { getAccount } from '@hive/ui/lib/hive';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  const { username } = await req.body
  try {
    const hiveUserProfile = await getHiveUserProfile(username);
    const user = { isLoggedIn: true, username: username, avatarUrl: hiveUserProfile?.picture || '' } as User;
    req.session.user = user;
    await req.session.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);

export interface IHiveUserProfile {
  name?: string;
  picture?: string;
  website?: string;
}

/**
 * Get Hive user's profile data from posting_json_metadata.
 */
export async function getHiveUserProfile(hiveUsername: string): Promise<IHiveUserProfile> {
  const hiveUserProfile: IHiveUserProfile = {};

  // Add properties to user profile.
  try {
      const chainAccount = await getAccount(hiveUsername);
      logger.debug(`typeof chainAccount: ${typeof chainAccount}`);
      logger.debug(chainAccount);
      if (!chainAccount) {
          throw new Error(`gethiveUserProfile error: missing blockchain account "${hiveUsername}"`);
      }

      if (Object.prototype.hasOwnProperty
              .call(chainAccount, 'posting_json_metadata')) {
          let postingJsonMetadata: any = {};
          try {
            postingJsonMetadata = JSON.parse(
                  chainAccount.posting_json_metadata
                  );
          } catch (e) {
            // do nothing
          }
          if (Object.prototype.hasOwnProperty
                  .call(postingJsonMetadata, 'profile')) {

              if (Object.prototype.hasOwnProperty
                      .call(postingJsonMetadata.profile, 'name')) {
                  hiveUserProfile.name = postingJsonMetadata.profile.name;
              }

              if (Object.prototype.hasOwnProperty
                      .call(postingJsonMetadata.profile, 'profile_image')) {
                  hiveUserProfile.picture = postingJsonMetadata
                          .profile.profile_image;
              }

              if (Object.prototype.hasOwnProperty
                      .call(postingJsonMetadata.profile, 'website')) {
                  hiveUserProfile.website = postingJsonMetadata
                          .profile.website;
              }
          }
      }

      // TODO We can also try to read profile from
      // chainAccount.json_metadata, when
      // chainAccount.posting_json_metadata doesn't exist.

  } catch (error) {
      logger.error(error);
      throw error;
  }
  return hiveUserProfile;
}
