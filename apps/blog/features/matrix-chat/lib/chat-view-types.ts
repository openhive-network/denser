/** What the drawer shows of a message: its text, sanitized HTML, or a placeholder. */
export type ChatMessageContent =
  | { kind: 'text'; text: string }
  | { kind: 'html'; html: string }
  | { kind: 'encrypted' }
  | { kind: 'unsupported' };

export interface ChatMessageView {
  eventId: string;
  senderId: string;
  senderName: string;
  /** The sender's avatar as an `mxc://` URI, null for none */
  avatarMxc: string | null;
  timestamp: number;
  /** `m.emote`: shown after the sender's name */
  emote: boolean;
  content: ChatMessageContent;
}

/** Who a message is from, as its room names them */
export interface ChatSenderView {
  name: string;
  /** Their avatar as an `mxc://` URI, null for none */
  avatarMxc: string | null;
}

export interface ChatRoomView {
  roomId: string;
  name: string;
  /** Notifications the homeserver counts unread in the room */
  unread: number;
  encrypted: boolean;
}

/**
 * A signed-in Matrix session, as the drawer uses it. Its getters read the latest sync; a
 * listener added with `subscribe` is called whenever that changes, and `version` grows with it.
 */
export interface ChatSession {
  readonly userId: string;
  subscribe(listener: () => void): () => void;
  version(): number;
  rooms(): ChatRoomView[];
  /** The configured default room, when the user is in it */
  defaultRoomId(): string | null;
  unreadCount(): number;
  messages(roomId: string): ChatMessageView[];
  /** The signed-in user as the room names them, their user id when it has no member for them */
  ownSender(roomId: string): ChatSenderView;
  /** Loads older messages of the room; resolves to whether there are more before them. */
  paginateBack(roomId: string): Promise<boolean>;
  /** Sends `text` as `m.text`; the same `txnId` again retries the same message. Resolves to its event id. */
  sendText(roomId: string, txnId: string, text: string): Promise<string>;
  /** Marks the room read up to its latest message. */
  markRead(roomId: string): void;
  /** An object URL of the thumbnail of `mxc`, fetched with the session's token, or null */
  avatarUrl(mxc: string): Promise<string | null>;
  /** Stops syncing, signs the device out on the homeserver and drops what the session held. */
  end(): Promise<void>;
}
