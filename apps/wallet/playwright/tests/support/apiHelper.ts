import { Page } from "@playwright/test";

export class ApiHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Get account info as json from API response
  async getAccountInfoAPI(username: string) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseGetAccounts = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "condenser_api.get_accounts",
        params: [[`${username}`]],
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return responseGetAccounts.json();
  }

  // Get Follow count info as json from API response
  async getFollowCountAPI(username: string) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseGetFollowCount = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "condenser_api.get_follow_count",
        params: [`${username}`],
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return responseGetFollowCount.json();
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
  async getListWitnessesByVoteAPI(startName: string = "", limit: number = 100) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const response = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "condenser_api.get_witnesses_by_vote",
        params: [`${startName}`, `${limit}`],
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
        method: "condenser_api.get_dynamic_global_properties",
        params: [],
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

  // Get list of proposals as json from API response from condenser_api.list_proposals
  async getListOfProposalsAPI(
    start: [] = [],
    limit: number = 30,
    order: string = "by_total_votes",
    order_direction: string = "descending",
    status: string = "votable"
  ) {
    const url = process.env.REACT_APP_API_ENDPOINT;

    const responseGetListOfProposals = await this.page.request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: "2.0",
        method: "condenser_api.list_proposals",
        params: [
          start,
          limit,
          order,
          order_direction,
          status
        ],
      },
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return responseGetListOfProposals.json();
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
            last_id: last_id
          },
        },
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      });

      return responseGetListOfProposals.json();
    }
}
