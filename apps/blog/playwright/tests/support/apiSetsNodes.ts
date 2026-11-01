import { spawn } from 'child_process';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { timed } from '../../../../../playwright/support/timeouts';

/**
 * Two API nodes for the API set specs (apiSetsLite.spec.ts): the fixture proxy, which serves
 * `lite.*` with a lite-aware recording (`litePost`), and a stub in front of it that does not, as
 * api.hive.blog does not. The suite's fourth blog server (API_SETS_BLOG_PORT) has the stub as its
 * API endpoint and both nodes as allowed nodes, so its API sets route core and bridge to the stub
 * and lite to the proxy. The suite's probing variant starts a blog server of its own, the same but
 * probing, once both nodes are up (`startBlogServer`).
 */
export const LITE_LESS_NODE_PORT = 8209;
export const LITE_LESS_NODE_URL = `http://localhost:${LITE_LESS_NODE_PORT}`;
export const API_SETS_BLOG_PORT = 3003;
export const API_SETS_PROBING_BLOG_PORT = 3004;

export interface ILiteLessNode {
  /** The JSON-RPC methods the node was asked, in order. */
  readonly methods: string[];
  close(): Promise<void>;
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS'
};

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

const methodOf = (body: string): string => {
  try {
    const call: unknown = JSON.parse(body);
    return typeof call === 'object' && call !== null && 'method' in call && typeof call.method === 'string'
      ? call.method
      : '';
  } catch {
    return '';
  }
};

const send = (response: ServerResponse, status: number, body: string) => {
  response.writeHead(status, { ...CORS_HEADERS, 'content-type': 'application/json' });
  response.end(body);
};

/**
 * Starts a node that answers every `lite.*` call with "Api not found lite", as a node without the
 * lite API does, and passes every other JSON-RPC call to the fixture proxy at `fixtureProxyUrl`. It
 * serves no REST API: any other request is answered 404.
 */
export async function startLiteLessNode(fixtureProxyUrl: string): Promise<ILiteLessNode> {
  const methods: string[] = [];
  const answer = async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, CORS_HEADERS);
      response.end();
      return;
    }
    if (request.method !== 'POST' || request.url !== '/') {
      send(response, 404, JSON.stringify({ message: 'Not Found' }));
      return;
    }
    const body = await readBody(request);
    const method = methodOf(body);
    methods.push(method);
    if (method.startsWith('lite.')) {
      send(
        response,
        200,
        JSON.stringify({ jsonrpc: '2.0', id: 0, error: { code: -32601, message: 'Api not found lite' } })
      );
      return;
    }
    const upstream = await fetch(fixtureProxyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body
    });
    send(response, upstream.status, await upstream.text());
  };
  const server: Server = createServer((request, response) => {
    answer(request, response).catch((error: unknown) =>
      send(response, 502, JSON.stringify({ message: String(error) }))
    );
  });
  await new Promise<void>((resolve) => server.listen(LITE_LESS_NODE_PORT, resolve));
  return {
    methods,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      })
  };
}

/** A blog server a spec starts itself (a project's `apiSetsServer`): JSON, as a worker option is. */
export interface IBlogServerSpec {
  /** The standalone build's `server.js`, whose static files are in place. */
  serverJs: string;
  env: Record<string, string>;
  /** Answers once the server is ready. */
  readyUrl: string;
}

export interface IBlogServer {
  close(): Promise<void>;
}

/** The most server output a failed start reports. */
const MAX_REPORTED_OUTPUT = 4_000;
const READY_POLL_MS = 250;

const isReady = (url: string): Promise<boolean> =>
  fetch(url).then(
    (response) => response.ok,
    () => false
  );

/** Starts `spec`'s server and resolves once it answers its ready URL; rejects when it exits first. */
export async function startBlogServer(spec: IBlogServerSpec): Promise<IBlogServer> {
  const server = spawn(process.execPath, [spec.serverJs], {
    env: { ...process.env, ...spec.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  const keep = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-MAX_REPORTED_OUTPUT);
  };
  server.stdout.on('data', keep);
  server.stderr.on('data', keep);
  let exitCode: number | null | undefined;
  const exited = new Promise<void>((resolve) =>
    server.once('exit', (code) => {
      exitCode = code;
      resolve();
    })
  );
  const close = async () => {
    if (exitCode === undefined) server.kill('SIGTERM');
    await exited;
  };

  try {
    await timed('api-sets-blog-server', 60_000, async (timeoutMs) => {
      const deadline = Date.now() + timeoutMs;
      while (!(await isReady(spec.readyUrl))) {
        if (exitCode !== undefined) throw new Error(`exited with ${exitCode}`);
        if (Date.now() > deadline) throw new Error(`not ready within ${timeoutMs / 1000} s`);
        await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
      }
    });
  } catch (error) {
    await close();
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`The blog server at ${spec.readyUrl} ${reason}; its output:\n${output}`);
  }
  return { close };
}
