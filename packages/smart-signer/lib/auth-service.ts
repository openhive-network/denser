import { OnlineClient } from '@hive/hb-auth';
import { KeychainKeyTypes, KeychainKeyTypesLC } from 'hive-keychain-commons';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

class AuthService {

  static onlineClient: OnlineClient;

  async getOnlineClient() {
    if (!AuthService.onlineClient) {
      AuthService.onlineClient = await new OnlineClient().initialize();
    }
    return AuthService.onlineClient;
  }

  async sign(
    username: string,
    password: string,
    digest: string,
    keyType: KeychainKeyTypesLC = KeychainKeyTypesLC.posting
  ) {
    logger.info('sign args: %o', { username, password, keyType });

    const authClient = await authService.getOnlineClient();
    const auth = await authClient.getAuthByUser(username);
    logger.info('auth: %o', auth);

    if (!auth) {
      throw new Error(`No auth for username ${username}`);
    }

    if (!auth.authorized) {
      if (!['posting', 'active'].includes(keyType)) {
        throw new Error(`Unsupported keyType: ${keyType}`);
      }
      const authStatus = await authClient.authenticate(
        username,
        password,
        keyType as unknown as 'posting' | 'active'
      );

      logger.info('authStatus', { authStatus });
      if (!authStatus.ok) {
        throw new Error(`Unlocking wallet failed`);
      }
    }

    if (!['posting', 'active'].includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`);
    }

    const signature = await authClient.sign(
      username,
      digest,
      keyType as unknown as 'posting' | 'active'
    );
    logger.info('hbauth: %o', { digest, signature });

    return signature;
  };

  async checkAuths(username: string, keyType: string) {
    const authClient = await authService.getOnlineClient();
    const auths = await authClient.getAuths();
    logger.info('auths: %o', auths);
    const auth = auths.find((auth) => auth.username === username);
    if (auth) {
      logger.info('found auth: %o', auth);
      if (auth.authorized) {
        if (auth.keyType === keyType) {
          logger.info('user is authorized and we are ready to proceed');
          // We're ready to sign loginChallenge and proceed.
        } else {
          logger.info('user is authorized, but with incorrect keyType: %s', auth.keyType);
        }
      } else {
        logger.info('user is not authorized');
        // We should tell to unlock wallet (login to wallet).
      }
    } else {
      logger.info('auth for user not found: %s', username);
      // We should offer adding account to wallet.
    }
  };

}

export const authService = new AuthService();
