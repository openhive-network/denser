import { AccountProfile, FullAccount } from "@ui/store/app-types";
import { bridgeServer } from "./bridge";

export interface DynamicGlobalProperties {
  hbd_print_rate: number;
  total_vesting_fund_hive: string;
  total_vesting_shares: string;
  hbd_interest_rate: number;
  head_block_number: number;
  vesting_reward_percent: number;
  virtual_supply: string;
}
export const getDynamicGlobalProperties =
  (): Promise<DynamicGlobalProperties> =>
    bridgeServer.database.getDynamicGlobalProperties().then((r: any) => {
      return {
        total_vesting_fund_hive:
          r.total_vesting_fund_hive || r.total_vesting_fund_steem,
        total_vesting_shares: r.total_vesting_shares,
        hbd_print_rate: r.hbd_print_rate || r.sbd_print_rate,
        hbd_interest_rate: r.hbd_interest_rate,
        head_block_number: r.head_block_number,
        vesting_reward_percent: r.vesting_reward_percent,
        virtual_supply: r.virtual_supply,
      };
    });
export const getAccounts = (usernames: string[]): Promise<FullAccount[]> => {
  return bridgeServer.database
    .getAccounts(usernames)
    .then((resp: any[]): FullAccount[] =>
      resp.map((x) => {
        const account: FullAccount = {
          name: x.name,
          owner: x.owner,
          active: x.active,
          posting: x.posting,
          memo_key: x.memo_key,
          post_count: x.post_count,
          created: x.created,
          reputation: x.reputation,
          posting_json_metadata: x.posting_json_metadata,
          last_vote_time: x.last_vote_time,
          last_post: x.last_post,
          json_metadata: x.json_metadata,
          reward_hive_balance: x.reward_hive_balance,
          reward_hbd_balance: x.reward_hbd_balance,
          reward_vesting_hive: x.reward_vesting_hive,
          reward_vesting_balance: x.reward_vesting_balance,
          balance: x.balance,
          hbd_balance: x.hbd_balance,
          savings_balance: x.savings_balance,
          savings_hbd_balance: x.savings_hbd_balance,
          savings_hbd_last_interest_payment:
            x.savings_hbd_last_interest_payment,
          savings_hbd_seconds_last_update: x.savings_hbd_seconds_last_update,
          savings_hbd_seconds: x.savings_hbd_seconds,
          next_vesting_withdrawal: x.next_vesting_withdrawal,
          vesting_shares: x.vesting_shares,
          delegated_vesting_shares: x.delegated_vesting_shares,
          received_vesting_shares: x.received_vesting_shares,
          vesting_withdraw_rate: x.vesting_withdraw_rate,
          to_withdraw: x.to_withdraw,
          withdrawn: x.withdrawn,
          witness_votes: x.witness_votes,
          proxy: x.proxy,
          proxied_vsf_votes: x.proxied_vsf_votes,
          voting_manabar: x.voting_manabar,
          voting_power: x.voting_power,
          downvote_manabar: x.downvote_manabar,
          vesting_balance: x.vesting_balance,
          __loaded: true,
        };

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
            about: "",
            cover_image: "",
            location: "",
            name: "",
            profile_image: "",
            website: "",
          };
        }

        return { ...account, profile };
      })
    );
};
export const getAccount = (username: string): Promise<FullAccount> =>
  getAccounts([username]).then((resp) => resp[0]);

export interface FeedHistory {
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
export const getFeedHistory = (): Promise<FeedHistory> =>
  bridgeServer.database.call("get_feed_history");
