import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

/**
 * A stand-in for a Hive API node for the offline wallet specs: it answers the JSON-RPC methods and
 * REST paths it is given, every other JSON-RPC method with a JSON-RPC error and every other REST
 * path with a 404, so an unexpected read fails at once. It allows any origin, as the API nodes
 * do, so the browser can read from it as well as the wallet's server.
 */

/** The port playwright.fixture.config.ts points the wallet's API endpoints at */
export const FIXTURE_API_PORT = 8201;

export type JsonRpcResults = Record<string, (params: { accounts?: string[] }) => unknown>;
/** REST answers keyed by URL path (`/hafah-api/operation-types`). */
export type RestResults = Record<string, () => unknown>;

export interface IApiStubResults {
  jsonRpc: JsonRpcResults;
  rest?: RestResults;
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': '*'
};

const answerJsonRpc = (results: JsonRpcResults, body: string): unknown => {
  const { method, params, id } = JSON.parse(body);
  const result = results[method];
  if (!result) return { jsonrpc: '2.0', error: { code: -32601, message: `Not served by the stub: ${method}` }, id };
  return { jsonrpc: '2.0', result: result(params ?? {}), id };
};

const respond = (response: ServerResponse, status: number, body?: unknown): void => {
  response.writeHead(status, { ...CORS_HEADERS, 'content-type': 'application/json' });
  response.end(body === undefined ? undefined : JSON.stringify(body));
};

const handle = ({ jsonRpc, rest = {} }: IApiStubResults, request: IncomingMessage, response: ServerResponse, body: string) => {
  if (request.method === 'OPTIONS') return respond(response, 204);
  if (request.method === 'POST') return respond(response, 200, answerJsonRpc(jsonRpc, body));

  const restResult = rest[new URL(request.url ?? '/', 'http://stub').pathname];
  if (!restResult) return respond(response, 404, { message: `Not served by the stub: ${request.url}` });
  return respond(response, 200, restResult());
};

/** Starts the stub on 127.0.0.1; resolves with the server to close after the spec. */
export const startApiStub = (results: IApiStubResults, port = FIXTURE_API_PORT): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => (body += chunk));
      request.on('end', () => handle(results, request, response, body));
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
