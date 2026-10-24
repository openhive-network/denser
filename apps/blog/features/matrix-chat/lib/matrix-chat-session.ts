import {
  ClientEvent,
  createClient,
  Method,
  NotificationCountType,
  RoomEvent,
  SyncState,
  type MatrixClient,
  type MatrixEvent,
  type Room
} from 'matrix-js-sdk';
import { toMessageView } from './message-view.ts';
import type { MatrixSdkLogger } from './sdk-logger-type.ts';
import type { ChatMessageView, ChatRoomView, ChatSession } from './chat-view-types.ts';

/** Messages per room in the first sync, and per page scrolling back */
const TIMELINE_PAGE_SIZE = 20;
const AVATAR_SIZE_PX = 64;
const DEVICE_DISPLAY_NAME = 'denser chat';
const JOINED = 'join';
/** Room events that change what the drawer shows; a sync brings the new unread counts */
const CHANGES = [
  RoomEvent.Timeline,
  RoomEvent.TimelineReset,
  RoomEvent.Redaction,
  RoomEvent.Receipt,
  RoomEvent.Name,
  RoomEvent.MyMembership
] as const;

export interface MatrixChatSessionOptions {
  homeserverUrl: string;
  /** The Matrix user denser's server minted `loginToken` for */
  userId: string;
  loginToken: string;
  /** This browser's device, so that signing in again reuses it */
  deviceId: string;
  /** Alias or ID of the room the drawer opens in */
  defaultRoom: string;
  logger: MatrixSdkLogger;
  fetchFn?: typeof fetch;
}

class MatrixChatSession implements ChatSession {
  readonly userId: string;
  private readonly client: MatrixClient;
  private readonly fetchFn: typeof fetch;
  private readonly logger: MatrixSdkLogger;
  private readonly listeners = new Set<() => void>();
  private changes = 0;
  private defaultRoom: string | null = null;
  private roomsCache: { version: number; rooms: ChatRoomView[] } | null = null;
  private readonly messagesCache = new Map<string, { version: number; messages: ChatMessageView[] }>();
  private readonly avatars = new Map<string, Promise<string | null>>();
  private readonly readUpTo = new Map<string, string>();

  constructor(client: MatrixClient, fetchFn: typeof fetch, logger: MatrixSdkLogger) {
    this.client = client;
    this.fetchFn = fetchFn;
    this.logger = logger;
    this.userId = client.getSafeUserId();
    client.on(ClientEvent.Sync, this.notify);
    for (const change of CHANGES) client.on(change, this.notify);
  }

  private readonly notify = () => {
    this.changes++;
    for (const listener of this.listeners) listener();
  };

  /** Resolves after the first sync, or rejects when it fails */
  async start(defaultRoom: string): Promise<void> {
    const synced = new Promise<void>((resolve, reject) => {
      const onSync = (state: SyncState) => {
        if (state === SyncState.Prepared || state === SyncState.Syncing) resolve();
        else if (state === SyncState.Error) reject(new Error('The first Matrix sync failed'));
        else return;
        this.client.off(ClientEvent.Sync, onSync);
      };
      this.client.on(ClientEvent.Sync, onSync);
    });
    await this.client.startClient({
      initialSyncLimit: TIMELINE_PAGE_SIZE,
      lazyLoadMembers: true,
      disablePresence: true,
      threadSupport: false
    });
    await synced;
    this.defaultRoom = await this.resolveRoomId(defaultRoom);
    this.notify();
  }

  private async resolveRoomId(aliasOrId: string): Promise<string | null> {
    if (!aliasOrId) return null;
    if (aliasOrId.startsWith('!')) return aliasOrId;
    const joined = this.joinedRooms();
    const known = joined.find((room) => room.getCanonicalAlias() === aliasOrId || room.getAltAliases().includes(aliasOrId));
    if (known) return known.roomId;
    try {
      return (await this.client.getRoomIdForAlias(aliasOrId)).room_id;
    } catch {
      // An alias that does not resolve leaves the drawer in the user's first room
      return null;
    }
  }

  private joinedRooms(): Room[] {
    return this.client.getRooms().filter((room) => room.getMyMembership() === JOINED);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  version = () => this.changes;

  rooms(): ChatRoomView[] {
    if (this.roomsCache?.version === this.changes) return this.roomsCache.rooms;
    const rooms = this.joinedRooms()
      .sort((a, b) => b.getLastActiveTimestamp() - a.getLastActiveTimestamp())
      .map((room) => ({
        roomId: room.roomId,
        name: room.name,
        unread: room.getUnreadNotificationCount(NotificationCountType.Total),
        encrypted: room.hasEncryptionStateEvent()
      }));
    this.roomsCache = { version: this.changes, rooms };
    return rooms;
  }

  defaultRoomId(): string | null {
    const id = this.defaultRoom;
    return id && this.rooms().some((room) => room.roomId === id) ? id : null;
  }

  unreadCount(): number {
    return this.rooms().reduce((total, room) => total + room.unread, 0);
  }

  messages(roomId: string): ChatMessageView[] {
    const cached = this.messagesCache.get(roomId);
    if (cached?.version === this.changes) return cached.messages;
    const events = this.client.getRoom(roomId)?.getLiveTimeline().getEvents() ?? [];
    const messages = events.flatMap((event) => {
      const view = toMessageView(viewInputOf(event));
      return view ? [view] : [];
    });
    this.messagesCache.set(roomId, { version: this.changes, messages });
    return messages;
  }

  async paginateBack(roomId: string): Promise<boolean> {
    const room = this.client.getRoom(roomId);
    if (!room) return false;
    const more = await this.client.paginateEventTimeline(room.getLiveTimeline(), {
      backwards: true,
      limit: TIMELINE_PAGE_SIZE
    });
    this.notify();
    return more;
  }

  async sendText(roomId: string, txnId: string, text: string): Promise<string> {
    // The client API directly, not the SDK's local echo: a retry with the same transaction id
    // is one message on the homeserver, and the drawer keeps its own sending state
    const path = `/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${encodeURIComponent(txnId)}`;
    const sent = await this.client.http.authedRequest<{ event_id: string }>(Method.Put, path, undefined, {
      msgtype: 'm.text',
      body: text
    });
    return sent.event_id;
  }

  markRead(roomId: string): void {
    const latest = this.client.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1);
    const eventId = latest?.getId();
    if (!latest || !eventId || this.readUpTo.get(roomId) === eventId) return;
    this.readUpTo.set(roomId, eventId);
    this.client.sendReadReceipt(latest).catch((error: unknown) => {
      this.readUpTo.delete(roomId);
      this.logger.warn('Read receipt failed', error);
    });
  }

  avatarUrl(mxc: string): Promise<string | null> {
    let url = this.avatars.get(mxc);
    if (!url) {
      url = this.fetchAvatar(mxc);
      this.avatars.set(mxc, url);
    }
    return url;
  }

  private async fetchAvatar(mxc: string): Promise<string | null> {
    // Authenticated media: the thumbnail needs the access token, which an <img> cannot send
    const thumbnail = this.client.mxcUrlToHttp(mxc, AVATAR_SIZE_PX, AVATAR_SIZE_PX, 'crop', false, true, true);
    if (!thumbnail) return null;
    try {
      const response = await this.fetchFn(thumbnail, {
        headers: { Authorization: `Bearer ${this.client.getAccessToken() ?? ''}` }
      });
      return response.ok ? URL.createObjectURL(await response.blob()) : null;
    } catch {
      // No picture: the drawer shows the sender's initial instead
      return null;
    }
  }

  async end(): Promise<void> {
    this.listeners.clear();
    this.client.off(ClientEvent.Sync, this.notify);
    for (const change of CHANGES) this.client.off(change, this.notify);
    try {
      // Deletes the device; denser's server-side cleanup covers it when this fails
      await this.client.logout(true);
    } catch (error) {
      this.logger.warn('Matrix sign-out failed', error);
    } finally {
      this.client.stopClient();
      this.client.removeAllListeners();
      const avatars = await Promise.all(this.avatars.values());
      for (const url of avatars) if (url) URL.revokeObjectURL(url);
      this.avatars.clear();
      this.messagesCache.clear();
    }
  }
}

function viewInputOf(event: MatrixEvent) {
  return {
    eventId: event.getId() ?? '',
    type: event.getType(),
    sender: event.getSender() ?? '',
    senderName: event.sender?.name ?? '',
    avatarMxc: event.sender?.getMxcAvatarUrl() ?? null,
    timestamp: event.getTs(),
    content: event.getContent(),
    isState: event.isState(),
    redacted: event.isRedacted()
  };
}

/**
 * Signs `options.userId` in with a login token on this browser's device, without crypto, and
 * resolves once the first sync is in. A token for another user, or a failed first sync, signs
 * that device out again and rejects.
 */
export async function startMatrixChatSession(options: MatrixChatSessionOptions): Promise<ChatSession> {
  const fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  const base = { baseUrl: options.homeserverUrl, fetchFn, logger: options.logger };
  const login = await createClient(base).loginRequest({
    type: 'm.login.token',
    token: options.loginToken,
    device_id: options.deviceId,
    initial_device_display_name: DEVICE_DISPLAY_NAME
  });
  const client = createClient({
    ...base,
    userId: login.user_id,
    deviceId: login.device_id,
    accessToken: login.access_token,
    timelineSupport: true,
    disableVoip: true
  });
  const session = new MatrixChatSession(client, fetchFn, options.logger);
  try {
    if (login.user_id !== options.userId) throw new Error(`Signed in as ${login.user_id}, not ${options.userId}`);
    await session.start(options.defaultRoom);
    return session;
  } catch (error) {
    await session.end();
    throw error;
  }
}
