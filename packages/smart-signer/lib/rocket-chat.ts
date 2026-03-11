import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@ui/config/site';
import { fetchJson } from './fetch-json';

const logger = getLogger('app');

export const rocketChatAdminUserAuthHeaders = {
  'X-User-Id': siteConfig.openhiveChatAdminUserId,
  'X-Auth-Token': siteConfig.openhiveChatAdminUserToken,
};

/**
 * Get authToken for user (admin action). This will work only if Rocket
 * Chat was started with env variable `CREATE_TOKENS_FOR_USERS=true`.
 *
 * For RC 8.0.0+, this requires `CREATE_TOKENS_FOR_USERS_SECRET` env var
 * to be set on the RC server, and we must pass userId + secret.
 *
 * @export
 * @param {string} userId - The RC user ID (from users.info response)
 * @param {string} [username=''] - Username for logging/response only
 * @returns {Promise<ResultToken>}
 */
export async function getRCAuthToken(userId: string, username = '') {
  logger.info('getRCAuthToken called for userId: %s, username: %s', userId, username);
  try {
      const url = `${siteConfig.openhiveChatApiUri}/users.createToken`;
      const secret = siteConfig.openhiveChatCreateTokenSecret;

      // RC 8.0.0+ requires userId + secret (not username)
      // RC 7.x accepts username without secret
      const bodyPayload = secret
        ? { userId, secret }  // RC 8.0.0+ format
        : { username };       // RC 7.x fallback

      logger.info('getRCAuthToken calling: %s (using %s format)', url, secret ? '8.0.0' : '7.x');
      const responseData = await fetchJson(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              ...rocketChatAdminUserAuthHeaders,
          },
          body: JSON.stringify(bodyPayload),
      });
      logger.info('getRCAuthToken response: success=%s', responseData.success);

      // Succesful response looks like this:
      //
      // {
      //     "data": {
      //       "userId": "YYAveLvzKCMSQkrTG",
      //       "authToken": "pSQctfITPgmOJ9mJf7hHK0trxPSTpqYBVonNzrP2uas"
      //     },
      //     "success": true
      // }

      if (responseData.success) {
          return {
              success: true,
              error: '',
              data: {...responseData.data, ...{username}},
          };
      }
      return {
          success: false,
          error: responseData.error
                  || 'getRCAuthToken unspecified in responseData3'
      };
  } catch (error) {
      logger.error('getRCAuthToken error: %s', error instanceof Error ? error.message : String(error));
      return {
          success: false,
          error: 'getRCAuthToken unknown'
      };
  }
}

/**
 * Check if user exists in Rocket Chat, and create user if one doesn't
 * exist. Then get Rocket Chat login token for this user and return it.
 *
 * @export
 * @param {string} [username='']
 * @returns {Promise<ResultToken>}
 */
export async function getChatAuthToken(username = '') {
  logger.info('Running getChatAuthToken for user: %s', username);
  logger.info('getChatAuthToken config: apiUri=%s, adminUserId=%s, adminTokenPresent=%s',
    siteConfig.openhiveChatApiUri,
    siteConfig.openhiveChatAdminUserId,
    !!siteConfig.openhiveChatAdminUserToken && siteConfig.openhiveChatAdminUserToken !== 'your-admin-user-token'
  );

  let responseData1;
  try {
      const url1 = new URL(`${siteConfig.openhiveChatApiUri}/users.info`);
      url1.searchParams.append('username', username);
      logger.info('getChatAuthToken calling users.info: %s', url1.toString());
      responseData1 = await fetchJson(url1, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
              ...rocketChatAdminUserAuthHeaders,
          },
      });
      logger.info('getChatAuthToken users.info response: success=%s', responseData1?.success);
  } catch (error: any) {
      logger.info('getChatAuthToken users.info caught error: %s', error instanceof Error ? error.message : String(error));
      // FetchError has error.data (parsed JSON), not error.response.data
      if (error.data && error.data.error === 'User not found.') {
          responseData1 = error.data;
      } else {
          logger.error('Error code 2 in getChatAuthToken: %s', error instanceof Error ? error.message : String(error));
          return {
              success: false,
              error: 'Error code 2'
          };
      }
  }

  if (responseData1.success) {
      // User exists.
      logger.info('getChatAuthToken user exists, active=%s, _id=%s', responseData1.user.active, responseData1.user._id);
      if (responseData1.user.active) {
          // User is active, so we'll output token.
          // Pass userId (for RC 8.0.0+) and username (for logging/response)
          return getRCAuthToken(responseData1.user._id, username);
      }
      return {
          success: false,
          error: 'User is inactive'
      };
  }

  // If user doesn't exist, let's create a user, when the settings
  // allow to do this.
  if (responseData1.error === 'User not found.') {
      if (siteConfig.openhiveChatIframeCreateUsers === 'yes') {
          const url2 = `${siteConfig.openhiveChatApiUri}/users.create`;
          const data2 = {
              name: username,
              username,
              email: '',
              password: crypto.randomUUID(),
              active: true,
              joinDefaultChannels: true,
              sendWelcomeEmail: false
          };
          try {
              const responseData2 = await fetchJson(url2, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      ...rocketChatAdminUserAuthHeaders,
                  },
                  body: JSON.stringify(data2),
              });
              if (responseData2.success) {
                  // users.create returns the created user with _id
                  const newUserId = responseData2.user?._id;
                  logger.info('getChatAuthToken user created, _id=%s', newUserId);
                  return getRCAuthToken(newUserId, username);
              }
              return {
                  success: false,
                  error: 'Error code 4. ' + responseData2.error
              };
          } catch (error) {
              logger.error('Error code 3 in getChatAuthToken: %s', error instanceof Error ? error.message : String(error));
              return {
                  success: false,
                  error: 'Error code 3'
              };
          }
      } else {
          return {
              success: false,
              error: 'User does not exist'
          };
      }
  }

  return {
      success: false,
      error: 'Error code 1'
  };
}
