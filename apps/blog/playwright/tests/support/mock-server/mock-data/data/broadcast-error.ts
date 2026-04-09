import type { IJsonRpcResponse } from '../../api-mock';

/**
 * Error response for broadcast_transaction - e.g. expired transaction.
 */
const broadcastError: IJsonRpcResponse = {
  id: 1,
  jsonrpc: '2.0',
  error: {
    code: -32000,
    message: 'Assert Exception:now < trx.expiration: ',
    data: {
      code: 10,
      name: 'assert_exception',
      message: 'Assert Exception',
      stack: [
        {
          context: {
            level: 'error',
            file: 'database.cpp',
            line: 3556,
            method: '_apply_transaction',
            hostname: '',
            thread_name: 'th_a',
            timestamp: '2025-01-01T00:00:00'
          },
          format: 'now < trx.expiration: ',
          data: {}
        }
      ]
    }
  }
};

export default broadcastError;
