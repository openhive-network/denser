import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

const MATRIX_ENV = [
  'DENSER_SERVER_OAUTH_MATRIX_SECRET',
  'DENSER_SERVER_OAUTH_MATRIX_REDIRECT_URI',
  'REACT_APP_MATRIX_HOMESERVER_URL'
];
const SAVED = Object.fromEntries(MATRIX_ENV.map((key) => [key, process.env[key]]));

// The Rocket.Chat client's secret is read once, when the module loads
process.env.DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET = 'rocket-chat-secret';
for (const key of MATRIX_ENV) delete process.env[key];
const { findClient, getOAuthClients, validateClientCredentials, validateRedirectUri } = await import('./config.ts');

afterEach(() => {
  for (const key of MATRIX_ENV) {
    if (SAVED[key] === undefined) delete process.env[key];
    else process.env[key] = SAVED[key];
  }
});

const clientIds = () => getOAuthClients().map((client) => client.clientId);

describe('getOAuthClients', () => {
  it('knows only the Rocket.Chat client without the Matrix settings', () => {
    assert.deepEqual(clientIds(), ['denser']);
    assert.equal(findClient('matrix'), undefined);
  });

  it('keeps the Rocket.Chat client as it is', () => {
    process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET = 'matrix-secret';
    process.env.REACT_APP_MATRIX_HOMESERVER_URL = 'https://matrix.example.org';
    assert.deepEqual(findClient('denser'), {
      clientId: 'denser',
      clientSecret: 'rocket-chat-secret',
      redirectUris: ['https://openhive.chat/_oauth/denser'],
      clientName: 'Denser'
    });
  });

  it("registers `matrix` with the homeserver's OIDC callback derived from its URL", () => {
    process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET = 'matrix-secret';
    process.env.REACT_APP_MATRIX_HOMESERVER_URL = 'https://matrix.example.org/';
    assert.deepEqual(clientIds(), ['denser', 'matrix']);
    assert.deepEqual(findClient('matrix')?.redirectUris, ['https://matrix.example.org/_synapse/client/oidc/callback']);
  });

  it('prefers an explicit redirect URI to the derived one', () => {
    process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET = 'matrix-secret';
    process.env.REACT_APP_MATRIX_HOMESERVER_URL = 'https://matrix.example.org';
    process.env.DENSER_SERVER_OAUTH_MATRIX_REDIRECT_URI = 'https://hs.example.org/_synapse/client/oidc/callback';
    assert.deepEqual(findClient('matrix')?.redirectUris, ['https://hs.example.org/_synapse/client/oidc/callback']);
  });

  it('registers no Matrix client with a secret but no redirect URI, or a redirect URI but no secret', () => {
    process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET = 'matrix-secret';
    assert.deepEqual(clientIds(), ['denser']);
    delete process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET;
    process.env.REACT_APP_MATRIX_HOMESERVER_URL = 'https://matrix.example.org';
    assert.deepEqual(clientIds(), ['denser']);
  });

  it("accepts the Matrix client's own secret and redirect URI only", () => {
    process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET = 'matrix-secret';
    process.env.REACT_APP_MATRIX_HOMESERVER_URL = 'https://matrix.example.org';
    const client = validateClientCredentials('matrix', 'matrix-secret');
    assert.ok(client);
    assert.equal(validateClientCredentials('matrix', 'rocket-chat-secret'), null);
    assert.ok(validateRedirectUri(client, 'https://matrix.example.org/_synapse/client/oidc/callback'));
    assert.ok(!validateRedirectUri(client, 'https://openhive.chat/_oauth/denser'));
  });
});
