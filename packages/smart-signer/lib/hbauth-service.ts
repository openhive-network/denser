import type { OnlineClient, OfflineClient } from '@hiveio/hb-auth';

import { getOnlineClient, getOfflineClient, logoutFromEveryWorker, withOnlineClient } from "@hive/common-hiveio-packages";

class HbauthService {
  async getOnlineClient(): Promise<OnlineClient> {
    return await getOnlineClient();
  }
  async getOfflineClient(): Promise<OfflineClient> {
    return await getOfflineClient();
  }
  withOnlineClient<T>(operation: (client: OnlineClient) => Promise<T>): Promise<T> {
    return withOnlineClient(operation);
  }
  async logout(username: string): Promise<void> {
    await logoutFromEveryWorker(username);
  }
}

export const hbauthService = new HbauthService();
