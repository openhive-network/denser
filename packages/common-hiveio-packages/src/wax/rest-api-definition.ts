/**
 * URL layout of the REST APIs described by `ExtendedRestApi`, in the shape wax's `extendRest`
 * takes: a node's `urlPath` replaces its key in the URL, `{name}` segments are filled from the
 * request params, and `method` applies to the node and everything below it (default `GET`).
 *
 * Shared by the wax chain and the wasm-free read client so both build the same requests.
 */
export const EXTENDED_REST_API_DEFINITION = {
  'hivesense-api': {
    posts: {
      urlPath: 'posts',
      search: {
        urlPath: 'search',
        method: 'GET'
      },
      author: {
        urlPath: '{author}',
        permlink: {
          urlPath: '{permlink}',
          similar: {
            urlPath: 'similar',
            method: 'GET'
          }
        }
      },
      byIds: {
        urlPath: 'by-ids',
        method: 'POST'
      },
      byIdsQuery: {
        urlPath: 'by-ids-query',
        method: 'GET'
      }
    },
    authors: {
      urlPath: 'authors',
      search: {
        urlPath: 'search',
        method: 'GET'
      }
    }
  },
  method: 'GET',
  'hivemind-api': {
    accountsOperations: {
      urlPath: 'accounts/{account-name}/operations'
    }
  },
  'hafah-api': {
    'operation-types': {
      urlPath: 'operation-types'
    }
  },
  'balance-api': {
    accountDelegations: {
      urlPath: 'accounts/{account-name}/delegations'
    }
  }
};
