import type { Page, Route } from '@playwright/test';

/**
 * A Matrix homeserver for the native chat client, answered with `page.route`: sign-in with a login
 * token, a first sync of two rooms (`#general` with unread messages and history before them, and
 * `#lobby`), long polls that answer what a test queues, `/messages`, sending, read receipts (which
 * clear the room's unread count in the next sync), `/account/whoami` for the access tokens it
 * issued and has not signed out, and sign-out. Every request is recorded.
 */

export const HOMESERVER = 'https://matrix.matrix.test';
export const SERVER_NAME = 'matrix.matrix.test';
export const GENERAL_ROOM = `!general:${SERVER_NAME}`;
export const LOBBY_ROOM = `!lobby:${SERVER_NAME}`;
export const OTHER_USER = `@bob:${SERVER_NAME}`;

/** What `#general` shows after the first sync, and before it on scrolling back */
export const GENERAL_MESSAGES = ['Welcome to general', 'Have a look at https://hive.blog/trending'];
export const OLDER_GENERAL_MESSAGE = 'The first message of general';
export const LOBBY_MESSAGE = 'Hello from the lobby';
/** Notifications unread in each room at the first sync */
export const UNREAD = { general: 2, lobby: 1 };

/** How long a long poll waits for a queued sync before answering an empty one */
const LONG_POLL_MS = 500;
const POLL_STEP_MS = 50;

export interface RecordedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

type Json = Record<string, unknown>;

const message = (eventId: string, body: string, ts: number, sender = OTHER_USER) => ({
  type: 'm.room.message',
  event_id: eventId,
  sender,
  origin_server_ts: ts,
  content: { msgtype: 'm.text', body }
});

const stateEvent = (type: string, stateKey: string, content: Json) => ({
  type,
  state_key: stateKey,
  content,
  event_id: `$${type}.${stateKey}`,
  sender: OTHER_USER,
  origin_server_ts: 1
});

function room(alias: string, name: string, userId: string, timeline: object[], unread: number, prevBatch?: string) {
  return {
    state: {
      events: [
        stateEvent('m.room.create', '', { creator: OTHER_USER }),
        stateEvent('m.room.name', '', { name }),
        stateEvent('m.room.canonical_alias', '', { alias }),
        stateEvent('m.room.member', OTHER_USER, { membership: 'join', displayname: 'Bob' }),
        stateEvent('m.room.member', userId, { membership: 'join', displayname: userId.slice(1).split(':')[0] })
      ]
    },
    timeline: { events: timeline, limited: !!prevBatch, prev_batch: prevBatch },
    unread_notifications: { notification_count: unread, highlight_count: 0 }
  };
}

const sync = (batch: number, join: Json = {}) => ({ next_batch: `s${batch}`, rooms: { join } });

export class MatrixHomeserverStub {
  readonly requests: RecordedRequest[] = [];
  private readonly userId: string;
  private readonly queued: Json[] = [];
  private batch = 1;
  private failSends = 0;
  /** Device of each access token issued and not signed out */
  private readonly sessions = new Map<string, string>();
  private issued = 0;

  constructor(userId: string) {
    this.userId = userId;
  }

  /** Requests to client API paths ending in `pathEnd` */
  requestsTo(pathEnd: string, method?: string): RecordedRequest[] {
    return this.requests.filter((request) => request.path.endsWith(pathEnd) && (!method || request.method === method));
  }

  /** Requests whose path contains `part` */
  requestsWith(part: string, method?: string): RecordedRequest[] {
    return this.requests.filter((request) => request.path.includes(part) && (!method || request.method === method));
  }

  /** The next long poll answers new messages in a room */
  queueMessages(roomId: string, events: Array<{ eventId: string; body: string; sender?: string }>): void {
    const timeline = events.map((event, index) => message(event.eventId, event.body, Date.now() + index, event.sender));
    this.queued.push({ [roomId]: { timeline: { events: timeline, limited: false } } });
  }

  /** The next long poll answers a room's notification count */
  queueUnread(roomId: string, unread: number): void {
    this.queued.push({ [roomId]: { unread_notifications: { notification_count: unread, highlight_count: 0 } } });
  }

  /** The next `count` sends fail */
  failNextSends(count: number): void {
    this.failSends = count;
  }

  async install(page: Page): Promise<void> {
    await page.route(`${HOMESERVER}/**`, (route) => this.answer(route));
  }

  private async answer(route: Route): Promise<void> {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body: unknown = request.postData() ? request.postDataJSON() : undefined;
    const path = url.pathname.replace(/^\/_matrix\/client\/(v3|v1|r0)/, '');
    if (method !== 'OPTIONS') this.requests.push({ method, path, query: url.searchParams, body });
    const json = (answer: unknown, status = 200) =>
      route.fulfill({ status, json: answer, headers: { 'access-control-allow-origin': '*' } }).catch(() => undefined);

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'Authorization, Content-Type'
        }
      });
    }
    if (url.pathname === '/_matrix/client/versions') return json({ versions: ['v1.11'] });
    if (path === '/login' && method === 'POST') {
      const requested = typeof body === 'object' && body !== null ? Reflect.get(body, 'device_id') : undefined;
      const deviceId = typeof requested === 'string' ? requested : 'STUBDEVICE';
      // As Synapse does: signing a device in again ends its previous access token
      for (const [token, device] of this.sessions) if (device === deviceId) this.sessions.delete(token);
      const accessToken = `stub-access-token-${++this.issued}`;
      this.sessions.set(accessToken, deviceId);
      return json({ user_id: this.userId, access_token: accessToken, device_id: deviceId });
    }
    const accessToken = request.headers()['authorization']?.replace(/^Bearer /, '') ?? '';
    if (path === '/account/whoami') {
      const deviceId = this.sessions.get(accessToken);
      return deviceId
        ? json({ user_id: this.userId, device_id: deviceId })
        : json({ errcode: 'M_UNKNOWN_TOKEN', error: 'Invalid access token passed.' }, 401);
    }
    if (path === '/logout' && method === 'POST') {
      this.sessions.delete(accessToken);
      return json({});
    }
    if (path.endsWith('/filter') && method === 'POST') return json({ filter_id: 'stub-filter' });
    if (path === '/sync') return json(await this.nextSync(url.searchParams.has('since')));
    if (path.endsWith('/messages')) return json(this.olderMessages(path, url.searchParams));
    if (path.includes('/send/m.room.message/')) {
      if (this.failSends > 0) {
        this.failSends--;
        return json({ errcode: 'M_UNKNOWN', error: 'stub send failure' }, 500);
      }
      return json({ event_id: `$sent.${path.split('/').at(-1)}` });
    }
    if (path.includes('/receipt/') && method === 'POST') {
      // As Synapse does: a read receipt for the latest message clears the room's count
      this.queueUnread(decodeURIComponent(path.split('/')[2]), 0);
      return json({});
    }
    if (path === '/capabilities') return json({ capabilities: {} });
    // No default rules, as from a Synapse older than the SDK: the SDK adds its own, warning of each
    if (path === '/pushrules/') {
      return json({ global: { override: [], content: [], room: [], sender: [], underride: [] } });
    }
    if (path.startsWith('/media/')) return json({ errcode: 'M_NOT_FOUND' }, 404);
    return json({});
  }

  private async nextSync(longPoll: boolean): Promise<Json> {
    if (!longPoll) {
      return sync(this.batch++, {
        [GENERAL_ROOM]: room(
          `#general:${SERVER_NAME}`,
          'general',
          this.userId,
          GENERAL_MESSAGES.map((body, index) => message(`$general.${index + 1}`, body, 1_000 + index)),
          UNREAD.general,
          'general-history'
        ),
        [LOBBY_ROOM]: room(`#lobby:${SERVER_NAME}`, 'lobby', this.userId, [message('$lobby.1', LOBBY_MESSAGE, 500)], UNREAD.lobby)
      });
    }
    for (let waited = 0; waited < LONG_POLL_MS && this.queued.length === 0; waited += POLL_STEP_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_STEP_MS));
    }
    return sync(this.batch++, this.queued.shift() ?? {});
  }

  private olderMessages(path: string, query: URLSearchParams): Json {
    const isGeneral = decodeURIComponent(path).includes(GENERAL_ROOM) && query.get('from') === 'general-history';
    return {
      chunk: isGeneral ? [message('$general.0', OLDER_GENERAL_MESSAGE, 900)] : [],
      start: query.get('from')
    };
  }
}
