import type { IJsonRpcResponse } from '../../api-mock';

/**
 * Sample mock response for bridge.get_ranked_posts.
 * Minimal set of fields commonly rendered by denser blog post lists.
 */
const sampleRankedPosts: IJsonRpcResponse = {
  id: 1,
  jsonrpc: '2.0',
  result: [
    {
      post_id: 100001,
      author: 'gtg',
      permlink: 'hive-hardfork-25-jump-starter-kit',
      category: 'hive',
      title: 'Hive HardFork 25 Jump Starter Kit',
      body: 'This is a sample post body for testing purposes.',
      json_metadata: '{"tags":["hive","hardfork"],"app":"hive-blog"}',
      created: '2024-01-15T10:00:00',
      updated: '2024-01-15T10:00:00',
      depth: 0,
      children: 5,
      net_rshares: 1000000000,
      author_reputation: 78.5,
      max_accepted_payout: '1000000.000 HBD',
      payout: 12.345,
      pending_payout_value: '12.345 HBD',
      curator_payout_value: '0.000 HBD',
      promoted: '0.000 HBD',
      replies: [],
      active_votes: [
        { voter: 'blocktrades', rshares: 500000000 },
        { voter: 'good-karma', rshares: 300000000 }
      ],
      author_payout_value: '0.000 HBD',
      url: '/hive/@gtg/hive-hardfork-25-jump-starter-kit',
      stats: { total_votes: 2, flag_weight: 0 },
      blacklists: []
    },
    {
      post_id: 100002,
      author: 'alice',
      permlink: 'hello-world',
      category: 'introduceyourself',
      title: 'Hello World - My First Post',
      body: 'Hello everyone! This is my first post on Hive.',
      json_metadata: '{"tags":["introduceyourself"],"app":"hive-blog"}',
      created: '2024-01-14T08:30:00',
      updated: '2024-01-14T08:30:00',
      depth: 0,
      children: 10,
      net_rshares: 500000000,
      author_reputation: 45.2,
      max_accepted_payout: '1000000.000 HBD',
      payout: 5.678,
      pending_payout_value: '5.678 HBD',
      curator_payout_value: '0.000 HBD',
      promoted: '0.000 HBD',
      replies: [],
      active_votes: [{ voter: 'gtg', rshares: 200000000 }],
      author_payout_value: '0.000 HBD',
      url: '/introduceyourself/@alice/hello-world',
      stats: { total_votes: 1, flag_weight: 0 },
      blacklists: []
    }
  ]
};

export default sampleRankedPosts;
