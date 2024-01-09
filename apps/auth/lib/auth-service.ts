import { OnlineClient } from '@hive/hb-auth';

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
