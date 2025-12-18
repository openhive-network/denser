import type { OnlineClient } from '@hiveio/hb-auth';

import { getOnlineClient } from "@hive/common-hiveio-packages";

class HbauthService {
  async getOnlineClient(): Promise<OnlineClient> {
    return await getOnlineClient();
  }
  async getOfflineClient(): Promise<OnlineClient> {
    return await getOnlineClient();
  }
}

export const hbauthService = new HbauthService();
