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
 * @export
 * @param {string} [username='']
 * @returns {Promise<ResultToken>}
 */
export async function getRCAuthToken(username = '') {

  try {
      const url = `${siteConfig.openhiveChatApiUri}/users.createToken`;
      const responseData = await fetchJson(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              ...rocketChatAdminUserAuthHeaders,
          },
          body: JSON.stringify({username}),
      });

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
      logger.error('getRCAuthToken error: %o', error);
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

  let responseData1;
  try {
      const url1 = new URL(`${siteConfig.openhiveChatApiUri}/users.info`);
      url1.searchParams.append('username', username);
      responseData1 = await fetchJson(url1, {
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
              ...rocketChatAdminUserAuthHeaders,
          },
      });
  } catch (error: any) {
      if (error.response && error.response.data
              && error.response.data.error === 'User not found.') {
          responseData1 = error.response.data;
      } else {
          logger.error('Error code 2 in getChatAuthToken: %o', error);
          return {
              success: false,
              error: 'Error code 2'
          };
      }
  }

  if (responseData1.success) {
      // User exists.
      if (responseData1.user.active) {
          // User is active, so we'll output token.
          return getRCAuthToken(username);
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
                  return getRCAuthToken(username);
              }
              return {
                  success: false,
                  error: 'Error code 4. ' + responseData2.error
              };
          } catch (error) {
              logger.error('Error code 3 in getChatAuthToken: %o', error);
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
