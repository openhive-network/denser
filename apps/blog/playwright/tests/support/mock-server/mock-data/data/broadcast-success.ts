import type { IJsonRpcResponse } from '../../api-mock';

/**
 * Successful broadcast_transaction response.
 * The real API returns an empty result on success.
 */
const broadcastSuccess: IJsonRpcResponse = {
  id: 1,
  jsonrpc: '2.0',
  result: {}
};

export default broadcastSuccess;
