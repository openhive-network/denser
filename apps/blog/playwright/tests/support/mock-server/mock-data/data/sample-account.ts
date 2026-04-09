import type { IJsonRpcResponse } from '../../api-mock';

/**
 * Sample mock response for database_api.find_accounts({ accounts: ['gtg'] }).
 * Modeled after a real Hive API response with fields commonly used in denser.
 */
const sampleAccount: IJsonRpcResponse = {
  id: 1,
  jsonrpc: '2.0',
  result: {
    accounts: [
      {
        id: 6763,
        name: 'gtg',
        owner: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STM5z4sHkN2PrDFb93XPeKBzwXVzwgFiXNUbVUfGR3FuRgakJsrJd', 1]]
        },
        active: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STM5z4sHkN2PrDFb93XPeKBzwXVzwgFiXNUbVUfGR3FuRgakJsrJd', 1]]
        },
        posting: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STM5z4sHkN2PrDFb93XPeKBzwXVzwgFiXNUbVUfGR3FuRgakJsrJd', 1]]
        },
        memo_key: 'STM5z4sHkN2PrDFb93XPeKBzwXVzwgFiXNUbVUfGR3FuRgakJsrJd',
        json_metadata: '{}',
        posting_json_metadata:
          '{"profile":{"name":"gtg","about":"Gandalf the Grey - Witness","location":"Middle-earth","website":"https://gtg.openhive.network"}}',
        proxy: '',
        last_owner_update: '2020-04-30T17:23:36',
        last_account_update: '2023-05-17T14:31:54',
        created: '2016-08-01T20:25:51',
        mined: false,
        recovery_account: 'steem',
        last_account_recovery: '1970-01-01T00:00:00',
        comment_count: 0,
        post_count: 438,
        can_vote: true,
        voting_manabar: { current_mana: '31029442254328', last_update_time: 1700000000 },
        downvote_manabar: { current_mana: '7757360563582', last_update_time: 1700000000 },
        balance: { amount: '12345', nai: '@@000000021', precision: 3 },
        savings_balance: { amount: '0', nai: '@@000000021', precision: 3 },
        hbd_balance: { amount: '67890', nai: '@@000000013', precision: 3 },
        savings_hbd_balance: { amount: '0', nai: '@@000000013', precision: 3 },
        vesting_shares: { amount: '31029442254328', nai: '@@000000037', precision: 6 },
        delegated_vesting_shares: { amount: '0', nai: '@@000000037', precision: 6 },
        received_vesting_shares: { amount: '0', nai: '@@000000037', precision: 6 },
        vesting_withdraw_rate: { amount: '0', nai: '@@000000037', precision: 6 },
        post_voting_power: { amount: '31029442254328', nai: '@@000000037', precision: 6 },
        reward_hbd_balance: { amount: '0', nai: '@@000000013', precision: 3 },
        reward_hive_balance: { amount: '0', nai: '@@000000021', precision: 3 },
        reward_vesting_balance: { amount: '0', nai: '@@000000037', precision: 6 },
        reward_vesting_hive: { amount: '0', nai: '@@000000021', precision: 3 },
        curation_rewards: 123456,
        posting_rewards: 654321,
        witness_votes: ['blocktrades', 'good-karma'],
        witnesses_voted_for: 2
      }
    ]
  }
};

export default sampleAccount;
