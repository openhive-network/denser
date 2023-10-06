import type { User } from './user';
import { withIronSessionApiRoute } from 'iron-session/next';
import { sessionOptions } from 'lib/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { getAccount } from '@hive/ui/lib/hive';

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  const { username } = await req.body
  try {
    const hiveUserProfile = await getHiveUserProfile(username);
    const user = { isLoggedIn: true, login: username, avatarUrl: hiveUserProfile.picture } as User;
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
      if (!chainAccount) {
          console.error(
              'gethiveUserProfile error: missing blockchain account',
              hiveUsername
              );
          throw new Error('gethiveUserProfile error: missing blockchain account');
      }

      if (Object.prototype.hasOwnProperty
              .call(chainAccount, 'posting_json_metadata')) {
          const postingJsonMetadata = JSON.parse(
                  chainAccount.posting_json_metadata
                  );
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
      console.error('gethiveUserProfile error', error);
      throw error;
  }
  return hiveUserProfile;
}
