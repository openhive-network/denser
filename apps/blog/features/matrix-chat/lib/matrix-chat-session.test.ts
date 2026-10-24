import { describe, it, afterEach, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { MatrixSdkLogger } from './sdk-logger-type.ts';
import { startMatrixChatSession } from './matrix-chat-session.ts';
import type { ChatSession } from './chat-view-types.ts';

const HOMESERVER = 'https://matrix.example.org';
const USER = '@alice:example.org';
const GENERAL = '!general:example.org';
const LOBBY = '!lobby:example.org';

const quiet: MatrixSdkLogger = {
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  getChild: () => quiet
};

const stateEvent = (type: string, content: object, stateKey = '', sender = USER) => ({
  type,
  state_key: stateKey,
  content,
  sender,
  event_id: `$${type}-${stateKey}`,
  origin_server_ts: 1
});

const message = (id: string, body: string, ts: number, sender = '@bob:example.org') => ({
  type: 'm.room.message',
  content: { msgtype: 'm.text', body },
  sender,
  event_id: id,
  origin_server_ts: ts
});

function joinedRoom(alias: string, events: object[], notifications: number) {
  return {
    state: {
      events: [
        stateEvent('m.room.create', { creator: USER }),
        stateEvent('m.room.member', { membership: 'join', displayname: 'alice' }, USER),
        stateEvent('m.room.member', { membership: 'join', displayname: 'Bob' }, '@bob:example.org'),
        stateEvent('m.room.canonical_alias', { alias })
      ]
    },
    timeline: { events, limited: true, prev_batch: `prev-${alias}` },
    unread_notifications: { notification_count: notifications, highlight_count: 0 }
  };
}

interface Request {
  method: string;
  path: string;
  body: unknown;
}

/** A homeserver answering the client API from `rooms`, recording every request */
function fakeHomeserver() {
  const requests: Request[] = [];
  let syncs = 0;
  const later: Array<() => void> = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input.toString());
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: url.pathname, body });
    const path = url.pathname.replace(/^\/_matrix\/client\/(v3|v1|r0)/, '');
    if (path === '/login' && method === 'POST') {
      return json({ user_id: USER, access_token: 'access', device_id: body.device_id });
    }
    if (path === '/versions' || url.pathname === '/_matrix/client/versions') return json({ versions: ['v1.11'] });
    if (path.endsWith('/filter')) return json({ filter_id: 'filter' });
    if (path === '/sync') {
      if (syncs++ === 0) {
        return json({
          next_batch: 's1',
          rooms: {
            join: {
              [GENERAL]: joinedRoom('#general:example.org', [message('$m1', 'hello', 10), message('$m2', 'there', 20)], 2),
              [LOBBY]: joinedRoom('#lobby:example.org', [message('$l1', 'hi', 5)], 1)
            }
          }
        });
      }
      // Later syncs wait until the client stops
      return new Promise((_resolve, reject) => {
        later.push(() => reject(new DOMException('aborted', 'AbortError')));
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }
    if (path.includes('/messages')) {
      return json({ chunk: [message('$m0', 'older', 1)], start: url.searchParams.get('from'), end: undefined });
    }
    if (path.includes('/send/m.room.message/')) return json({ event_id: '$sent' });
    if (path === '/logout') return json({});
    return json({});
  };
  return { fetchFn, requests, stop: () => later.forEach((abort) => abort()) };
}

describe('startMatrixChatSession', () => {
  let session: ChatSession | undefined;
  let homeserver: ReturnType<typeof fakeHomeserver>;

  const start = async (defaultRoom = '#general:example.org') => {
    homeserver = fakeHomeserver();
    session = await startMatrixChatSession({
      homeserverUrl: HOMESERVER,
      userId: USER,
      loginToken: 'login-token',
      deviceId: 'DENSERDEVICE',
      defaultRoom,
      logger: quiet,
      fetchFn: homeserver.fetchFn
    });
    return session;
  };

  // The SDK leaves each request's timeout timer running (80 s for a sync): faked, they keep no
  // test waiting
  before(() => mock.timers.enable({ apis: ['setTimeout', 'setInterval'] }));
  after(() => mock.timers.reset());

  afterEach(async () => {
    await session?.end();
    homeserver.stop();
    session = undefined;
  });

  it("signs in with the login token on the browser's device and syncs with lazy-loaded members", async () => {
    await start();
    const login = homeserver.requests.find((request) => request.path.endsWith('/login'));
    assert.deepEqual(login?.body, {
      type: 'm.login.token',
      token: 'login-token',
      device_id: 'DENSERDEVICE',
      initial_device_display_name: 'denser chat'
    });
    const filter = homeserver.requests.find((request) => request.path.endsWith('/filter'));
    const roomFilter = (filter?.body as { room: { state: unknown; timeline: unknown } }).room;
    assert.deepEqual(roomFilter.state, { lazy_load_members: true });
  });

  it('opens in the default room, with its messages, senders and the unread count from the sync', async () => {
    const chat = await start();
    assert.equal(chat.defaultRoomId(), GENERAL);
    assert.deepEqual(
      chat.messages(GENERAL).map((view) => [view.eventId, view.senderName, view.content]),
      [
        ['$m1', 'Bob', { kind: 'text', text: 'hello' }],
        ['$m2', 'Bob', { kind: 'text', text: 'there' }]
      ]
    );
    assert.deepEqual(
      chat.rooms().map((room) => [room.roomId, room.unread]),
      [
        [GENERAL, 2],
        [LOBBY, 1]
      ]
    );
    assert.equal(chat.unreadCount(), 3);
  });

  it('opens in no room when the default room is not one the user is in', async () => {
    const chat = await start('#elsewhere:example.org');
    assert.equal(chat.defaultRoomId(), null);
  });

  it('loads older messages scrolling back, and tells when the history starts', async () => {
    const chat = await start();
    const changes: number[] = [];
    chat.subscribe(() => changes.push(chat.version()));

    const more = await chat.paginateBack(GENERAL);

    assert.equal(more, false);
    assert.deepEqual(
      chat.messages(GENERAL).map((view) => view.eventId),
      ['$m0', '$m1', '$m2']
    );
    assert.ok(changes.length > 0);
    const page = homeserver.requests.find((request) => request.path.includes('/messages'));
    assert.match(page?.path ?? '', new RegExp(`/rooms/${encodeURIComponent(GENERAL)}/messages$`));
  });

  it('sends m.text with the given transaction id, so that a retry is the same message', async () => {
    const chat = await start();
    assert.equal(await chat.sendText(GENERAL, 'txn-1', 'hi all'), '$sent');
    const sent = homeserver.requests.filter((request) => request.method === 'PUT' && request.path.includes('/send/'));
    assert.deepEqual(
      sent.map((request) => [request.path.split('/').slice(-4).join('/'), request.body]),
      [[`${encodeURIComponent(GENERAL)}/send/m.room.message/txn-1`, { msgtype: 'm.text', body: 'hi all' }]]
    );
  });

  it('sends a read receipt for the latest message once', async () => {
    const chat = await start();
    chat.markRead(GENERAL);
    chat.markRead(GENERAL);
    await new Promise((resolve) => setImmediate(resolve));
    const receipts = homeserver.requests.filter((request) => request.path.includes('/receipt/'));
    assert.equal(receipts.length, 1);
    assert.match(receipts[0].path, /\/receipt\/m\.read\/%24m2$/);
  });

  it('signs the device out when it ends', async () => {
    const chat = await start();
    await chat.end();
    session = undefined;
    assert.ok(homeserver.requests.some((request) => request.method === 'POST' && request.path.endsWith('/logout')));
  });
});
