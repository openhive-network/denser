import { Page } from "@playwright/test";

// Market API Response Types
export interface MarketTickerResult {
  latest: string;
  lowest_ask: string;
  highest_bid: string;
  percent_change: string;
  hive_volume: { amount: string; precision: number; nai: string };
  hbd_volume: { amount: string; precision: number; nai: string };
}

export interface MarketTickerResponse {
  id: number;
  jsonrpc: string;
  result: MarketTickerResult;
}

export interface OrderBookOrder {
  order_price: {
    base: { amount: string; precision: number; nai: string };
    quote: { amount: string; precision: number; nai: string };
  };
  real_price: string;
  hive: number;
  hbd: number;
  created: string;
}

export interface OrderBookResult {
  bids: OrderBookOrder[];
  asks: OrderBookOrder[];
}

export interface OrderBookResponse {
  id: number;
  jsonrpc: string;
  result: OrderBookResult;
}

export interface RecentTrade {
  date: string;
  current_pays: { amount: string; precision: number; nai: string };
  open_pays: { amount: string; precision: number; nai: string };
}

export interface RecentTradesResult {
  trades: RecentTrade[];
}

export interface RecentTradesResponse {
  id: number;
  jsonrpc: string;
  result: RecentTradesResult;
}

export class ApiHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Get account info as json from API response
  async getAccountInfoAPI(username: string) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "database_api.find_accounts",
        params: { accounts: [username], delayed_votes_active: false },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    const json = await response.json();
    // Transform response to match the old format for backward compatibility in tests
    return { result: json.result?.accounts };
  }

  // Get Follow count info as json from API response using bridge.get_profile
  async getFollowCountAPI(username: string) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "bridge.get_profile",
        params: { account: `${username}` },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    const json = await response.json();
    // Transform response to match the old format for backward compatibility in tests
    return {
      result: {
        follower_count: json.result?.stats?.followers ?? 0,
        following_count: json.result?.stats?.following ?? 0,
        account: username,
      },
    };
  }

  // Get ranked post (default: sort'tranding', limit=20)
  async getRankedPostsAPI(
    sort: string = "trending",
    start_author: string = "",
    start_permlink: string = "",
    limit: number = 20,
    tag: string = "",
    observer: string = ""
  ) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "bridge.get_ranked_posts",
        params: {
          sort: `${sort}`,
          start_author: `${start_author}`,
          start_permlink: `${start_permlink}`,
          limit: limit,
          tag: `${tag}`,
          observer: `${observer}`,
        },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }

  // Get List Communities as json from API
  async getListCommunitiesAPI(
    last: string = "",
    limit: number = 100,
    query: string | null = null,
    sort: string = "rank",
    observer: string = ""
  ) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "bridge.list_communities",
        params: {
          last: `${last}`,
          limit: limit,
          query: query,
          sort: `${sort}`,
          observer: `${observer}`,
        },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }

  // Get list of witnesses by vote as json from API
  async getListWitnessesByVoteAPI(limit: number = 100) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "database_api.list_witnesses",
        // Use max int64 value as starting point since API iterates downward
        params: { start: ["9223372036854775807", ""], limit: limit, order: "by_vote_name" },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }

  // Get dynamic global properties as json from API
  async getDynamicGlobalPropertiesAPI() {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "database_api.get_dynamic_global_properties",
        params: {},
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }

  // Get discussion - post comments (Default - author: "gtg", permlink: "hive-hardfork-25-jump-starter-kit")
  async getDiscussionCommentsAPI(
    author: string = "gtg",
    permlink: string = "hive-hardfork-25-jump-starter-kit"
  ) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "bridge.get_discussion",
        params: {
          author: `${author}`,
          permlink: `${permlink}`,
        },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }

  // Get community subscribers as json from API response
  async getCommunitySubscribersAPI(
    account: string,
    limit: number = 50,
    lastId: number = 0
  ) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseGetCommunitySubscribers = await this.page.request.post(
      `${url}/`,
      {
        data: {
          id: 0,
          jsonrpc: "2.0",
          method: "bridge.account_notifications",
          params: { account: account, limit: limit, last_id: lastId },
        },
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      }
    );

    return responseGetCommunitySubscribers.json();
  }

  // Get list of proposals as json from API response from database_api.list_proposals
  async getListOfProposalsDatabaseAPI(
    start: [] = [],
    limit: number = 30,
    order: string = "by_total_votes",
    order_direction: string = "descending",
    status: string = "votable",
    last_id?: number
  ) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseGetListOfProposals = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "database_api.list_proposals",
        params: {
          start: start,
          limit: limit,
          order: order,
          order_direction: order_direction,
          status: status,
          last_id: last_id,
        },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return responseGetListOfProposals.json();
  }

  // Get account history as json from API response using account_history_api
  async getAccountHistoryAPI(account: string, start: number, limit: number) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseGetAccountHistory = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "account_history_api.get_account_history",
        params: {
          account,
          start,
          limit,
          operation_filter_low: 199284866418737180,
          include_reversible: true
        },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    const json = await responseGetAccountHistory.json();
    // Transform response to maintain backward compatibility with tests
    // account_history_api returns { result: { history: [...] } }
    if (json.result && json.result.history) {
      json.result = json.result.history;
    }
    return json;
  }

  // Get account history as json from API response
  async getVestingDelegationsAPI(account: string, startDelegatee: string = '', limit: number = 1000) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "database_api.list_vesting_delegations",
        params: {
          start: [account, startDelegatee],
          limit,
          order: "by_delegation"
        },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    const json = await response.json();
    // Filter to only include delegations where the account is the delegator
    // and transform to match expected format
    if (json.result && json.result.delegations) {
      json.result = json.result.delegations.filter(
        (d: { delegator: string }) => d.delegator === account
      );
    }
    return json;
  }

  /**
   * Get market ticker (statistics) from API.
   * Returns latest price, highest bid, lowest ask, percent change, and volumes.
   */
  async getMarketTickerAPI(): Promise<MarketTickerResponse> {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "market_history_api.get_ticker",
        params: {},
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }

  /**
   * Get order book (buy and sell orders) from API.
   * @param limit Maximum number of orders to return (default: 500)
   */
  async getOrderBookAPI(limit: number = 500): Promise<OrderBookResponse> {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "market_history_api.get_order_book",
        params: { limit },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }

  /**
   * Get recent trades from API.
   * @param limit Maximum number of trades to return (default: 1000)
   */
  async getRecentTradesAPI(limit: number = 1000): Promise<RecentTradesResponse> {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "market_history_api.get_recent_trades",
        params: { limit },
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return response.json();
  }
}
