import { OnlineClient } from '@hive/hb-auth';

class AuthService {
  static instance: OnlineClient;

  async getOnlineClient() {
    if (!AuthService.instance) {
      const client = new OnlineClient();
      AuthService.instance = await client.initialize();
    }

    return AuthService.instance;
  }
}

export const authService = new AuthService();
