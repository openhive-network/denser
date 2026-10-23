import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chatAppUrl,
  matrixFrameOrigins,
  matrixSessionPageUrl,
  resolveChatProvider,
  resolveMatrixChatConfig
} from './chat.ts';

const ROCKET_CHAT_URL = 'https://openhive.chat';

const readFrom =
  (values: Record<string, string>) =>
  (key: string): string | undefined =>
    values[key];

const MATRIX = resolveMatrixChatConfig(
  readFrom({
    MATRIX_ELEMENT_URL: 'https://chat.example.org/',
    MATRIX_HOMESERVER_URL: 'https://matrix.example.org/'
  })
);

describe('resolveChatProvider', () => {
  it('keeps Rocket.Chat unless Matrix is asked for', () => {
    assert.equal(resolveChatProvider(undefined), 'rocketchat');
    assert.equal(resolveChatProvider(''), 'rocketchat');
    assert.equal(resolveChatProvider('rocketchat'), 'rocketchat');
    assert.equal(resolveChatProvider('slack'), 'rocketchat');
  });

  it('selects Matrix for "matrix", in any case', () => {
    assert.equal(resolveChatProvider('matrix'), 'matrix');
    assert.equal(resolveChatProvider(' Matrix '), 'matrix');
  });
});

describe('resolveMatrixChatConfig', () => {
  it('drops trailing slashes, takes the server name from the homeserver host, and defaults the IdP', () => {
    assert.deepEqual(MATRIX, {
      elementUrl: 'https://chat.example.org',
      homeserverUrl: 'https://matrix.example.org',
      serverName: 'matrix.example.org',
      idpId: 'oidc-denser',
      defaultRoom: '#general:matrix.example.org'
    });
  });

  it('uses an explicit server name and IdP id, and the general room of that server', () => {
    const matrix = resolveMatrixChatConfig(
      readFrom({
        MATRIX_HOMESERVER_URL: 'https://matrix.example.org',
        MATRIX_SERVER_NAME: 'example.org',
        MATRIX_IDP_ID: 'oidc-hive'
      })
    );
    assert.equal(matrix.serverName, 'example.org');
    assert.equal(matrix.idpId, 'oidc-hive');
    assert.equal(matrix.defaultRoom, '#general:example.org');
  });

  it('uses an explicit default room', () => {
    const matrix = resolveMatrixChatConfig(
      readFrom({ MATRIX_HOMESERVER_URL: 'https://matrix.example.org', MATRIX_DEFAULT_ROOM: ' #lobby:example.org ' })
    );
    assert.equal(matrix.defaultRoom, '#lobby:example.org');
  });

  it('leaves everything but the IdP empty when nothing is configured', () => {
    assert.deepEqual(resolveMatrixChatConfig(readFrom({})), {
      elementUrl: '',
      homeserverUrl: '',
      serverName: '',
      idpId: 'oidc-denser',
      defaultRoom: ''
    });
  });
});

describe('matrixSessionPageUrl', () => {
  it("starts at Element's session page with the expected Matrix user, the IdP and the room to open", () => {
    const url = new URL(matrixSessionPageUrl(MATRIX, 'alice'));
    assert.equal(url.origin + url.pathname, 'https://chat.example.org/denser-session.html');
    assert.equal(url.searchParams.get('user'), '@alice:matrix.example.org');
    assert.equal(url.searchParams.get('idp'), 'oidc-denser');
    assert.equal(url.searchParams.get('room'), '#general:matrix.example.org');
  });

  it('names no room when none is configured', () => {
    const url = new URL(matrixSessionPageUrl({ ...MATRIX, defaultRoom: '' }, 'alice'));
    assert.equal(url.searchParams.has('room'), false);
  });

  it("passes denser's resolved theme", () => {
    assert.equal(new URL(matrixSessionPageUrl(MATRIX, 'alice', 'dark')).searchParams.get('theme'), 'dark');
    assert.equal(new URL(matrixSessionPageUrl(MATRIX, 'alice', 'light')).searchParams.get('theme'), 'light');
  });

  it('names no theme when none is known, or for anything but light and dark', () => {
    for (const theme of [undefined, '', 'system', 'Dark', 'dark&user=@mallory:matrix.example.org']) {
      assert.equal(new URL(matrixSessionPageUrl(MATRIX, 'alice', theme)).searchParams.has('theme'), false, theme);
    }
  });

  it('names no user for ending the session only', () => {
    assert.equal(matrixSessionPageUrl(MATRIX), 'https://chat.example.org/denser-session.html');
    assert.equal(matrixSessionPageUrl(MATRIX, undefined, 'dark'), 'https://chat.example.org/denser-session.html');
  });
});

describe('chat app URL and frame origin', () => {
  it('point at Element in Matrix mode', () => {
    assert.equal(chatAppUrl('matrix', MATRIX, ROCKET_CHAT_URL), 'https://chat.example.org');
    assert.deepEqual(matrixFrameOrigins('matrix', MATRIX), ['https://chat.example.org', 'https://matrix.example.org']);
  });

  it('list one origin when Element and the homeserver share it', () => {
    const shared = resolveMatrixChatConfig(
      readFrom({ MATRIX_ELEMENT_URL: 'https://example.org/element/', MATRIX_HOMESERVER_URL: 'https://example.org' })
    );
    assert.deepEqual(matrixFrameOrigins('matrix', shared), ['https://example.org']);
  });

  it('keep Rocket.Chat in Rocket.Chat mode, and when Matrix has no Element URL', () => {
    assert.equal(chatAppUrl('rocketchat', MATRIX, ROCKET_CHAT_URL), ROCKET_CHAT_URL);
    assert.deepEqual(matrixFrameOrigins('rocketchat', MATRIX), []);
    const noElement = resolveMatrixChatConfig(readFrom({}));
    assert.equal(chatAppUrl('matrix', noElement, ROCKET_CHAT_URL), ROCKET_CHAT_URL);
    assert.deepEqual(matrixFrameOrigins('matrix', noElement), []);
  });
});
