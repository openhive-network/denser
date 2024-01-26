import { OnlineClient } from '@hive/hb-auth';

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

}

export const authService = new AuthService();
