import { AccountFollowStats, AccountProfile, FullAccount } from 'lib/app-types';
import {
  ApiAccount,
  TWaxApiRequest,
  createHiveChain,
  GetDynamicGlobalPropertiesResponse
} from '@hive/wax/web';

const chain = await createHiveChain();

export type IDynamicGlobalProperties = GetDynamicGlobalPropertiesResponse;

export const getDynamicGlobalProperties = (): Promise<IDynamicGlobalProperties> =>
  chain.api.database_api.get_dynamic_global_properties({});

export const getAccounts = (usernames: string[]): Promise<FullAccount[]> => {
  return chain.api.database_api
    .find_accounts({ accounts: usernames })
    .then((resp: { accounts: ApiAccount[] }): FullAccount[] =>
      resp.accounts.map((x: ApiAccount) => {
        let profile: AccountProfile | undefined;

        try {
          profile = JSON.parse(x.posting_json_metadata!).profile;
        } catch (e) {}

        if (!profile) {
          try {
            profile = JSON.parse(x.json_metadata!).profile;
          } catch (e) {}
        }

        if (!profile) {
          profile = {
            about: '',
            cover_image: '',
            location: '',
            name: '',
            profile_image: '',
            website: ''
          };
        }

        return { ...x, profile };
      })
    );
};
export const getAccount = (username: string): Promise<FullAccount> =>
  getAccounts([username]).then((resp) => resp[0]);

export const getAccountFull = (username: string): Promise<FullAccount> =>
  getAccount(username).then(async (account) => {
    let follow_stats: AccountFollowStats | undefined;
    try {
      follow_stats = await getFollowCount(username);
    } catch (e) {}

    return { ...account, follow_stats };
  });

export interface IFeedHistory {
  current_median_history: {
    base: string;
    quote: string;
  };
  price_history: [
    {
      base: string;
      quote: string;
    }
  ];
}

type GetFeedHistoryData = {
  database: {
    get_feed_history: TWaxApiRequest<void, IFeedHistory>;
  };
};

export const getFeedHistory = (): Promise<IFeedHistory> =>
  chain.extend<GetFeedHistoryData>().api.database.get_feed_history();

interface IFollowCount {
  username: string;
}
type GetFollowCountData = {
  database: {
    get_follow_count: TWaxApiRequest<IFollowCount, AccountFollowStats>;
  };
};

export const getFollowCount = (username: string): Promise<AccountFollowStats> =>
  chain.extend<GetFollowCountData>().api.database.get_follow_count({ username });
