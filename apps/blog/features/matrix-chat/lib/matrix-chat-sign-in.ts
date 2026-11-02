import type { ChatSession } from './chat-view-types.ts';

/** What a browser keeps to resume a Matrix session without signing in again */
export interface MatrixCredentials {
  userId: string;
  deviceId: string;
  accessToken: string;
}

export type LoginTokenAnswer =
  | { kind: 'token'; loginToken: string }
  | { kind: 'rate-limited'; retryAfterMs: number }
  | { kind: 'none' };

export interface StartedChatSession {
  session: ChatSession;
  credentials: MatrixCredentials;
}

/** One stored session per Matrix user, shared by the browser's tabs */
export interface MatrixSessionStore {
  /** What is stored for `userId`, unchecked */
  read(userId: string): unknown;
  write(credentials: MatrixCredentials): void;
  remove(userId: string): void;
  /**
   * Resolves after `ms`, or sooner when another tab stores a session for `userId`; rejects when
   * `signal` aborts
   */
  waitForWrite(userId: string, ms: number, signal: AbortSignal): Promise<void>;
}

/** The homeserver no longer accepts the stored access token, or it names another user or device */
export class StoredSessionRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoredSessionRejectedError';
  }
}

/**
 * The homeserver could not be reached, or answered with a server error or a rate limit: the same
 * sign-in may succeed a little later
 */
export class ChatUnreachableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ChatUnreachableError';
  }
}

/** The waits before signing in again after a `ChatUnreachableError`, one per retry */
const UNREACHABLE_RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

export interface MatrixChatSignIn {
  userId: string;
  store: MatrixSessionStore;
  requestLoginToken: () => Promise<LoginTokenAnswer>;
  /** Signs in with a login token denser's server minted */
  logIn: (loginToken: string) => Promise<StartedChatSession>;
  /** Starts with stored credentials; rejects with `StoredSessionRejectedError` when they are no longer valid */
  resume: (credentials: MatrixCredentials) => Promise<ChatSession>;
  /** Told of a `ChatUnreachableError`, before waiting `delayMs` to sign in again */
  onUnreachable?: (error: ChatUnreachableError, delayMs: number) => void;
  signal: AbortSignal;
}

function isCredentials(value: unknown): value is MatrixCredentials {
  if (typeof value !== 'object' || value === null) return false;
  return ['userId', 'deviceId', 'accessToken'].every((name) => {
    const field: unknown = Reflect.get(value, name);
    return typeof field === 'string' && field !== '';
  });
}

/** The session stored for `userId`; anything else stored there, such as another user's, is removed */
function storedCredentials(store: MatrixSessionStore, userId: string): MatrixCredentials | null {
  const stored = store.read(userId);
  if (stored === null || stored === undefined) return null;
  if (isCredentials(stored) && stored.userId === userId) return stored;
  store.remove(userId);
  return null;
}

async function resumeStored(signIn: MatrixChatSignIn): Promise<StartedChatSession | null> {
  const credentials = storedCredentials(signIn.store, signIn.userId);
  if (!credentials) return null;
  try {
    const session = await signIn.resume(credentials);
    signIn.store.write(credentials);
    return { session, credentials };
  } catch (error) {
    if (!(error instanceof StoredSessionRejectedError)) throw error;
    forgetMatrixSession(signIn.store, credentials);
    return null;
  }
}

async function logInAndStore(signIn: MatrixChatSignIn, loginToken: string): Promise<StartedChatSession> {
  const started = await signIn.logIn(loginToken);
  signIn.store.write(started.credentials);
  return started;
}

async function signInOnce(signIn: MatrixChatSignIn): Promise<StartedChatSession> {
  const resumed = await resumeStored(signIn);
  if (resumed) return resumed;
  const answer = await signIn.requestLoginToken();
  if (answer.kind === 'token') return logInAndStore(signIn, answer.loginToken);
  if (answer.kind === 'rate-limited') {
    await signIn.store.waitForWrite(signIn.userId, answer.retryAfterMs, signIn.signal);
    const another = await resumeStored(signIn);
    if (another) return another;
    const again = await signIn.requestLoginToken();
    if (again.kind === 'token') return logInAndStore(signIn, again.loginToken);
  }
  throw new Error('denser minted no Matrix login token');
}

/**
 * Signs `signIn.userId` in to the chat: with the session the browser stored, when the homeserver
 * still accepts it, else with a login token denser's server mints, storing the new session. A
 * rate-limited mint is waited out once, after which the session another tab stored meanwhile is
 * used, or a token minted again. A homeserver that cannot be reached (`ChatUnreachableError`) is
 * tried again after each of `retryDelaysMs`, or sooner when another tab stores a session. Rejects
 * when no session could be started, or when `signIn.signal` aborts a wait.
 */
export async function signInToMatrixChat(
  signIn: MatrixChatSignIn,
  retryDelaysMs: readonly number[] = UNREACHABLE_RETRY_DELAYS_MS
): Promise<StartedChatSession> {
  for (const delayMs of retryDelaysMs) {
    try {
      return await signInOnce(signIn);
    } catch (error) {
      if (!(error instanceof ChatUnreachableError)) throw error;
      signIn.onUnreachable?.(error, delayMs);
      await signIn.store.waitForWrite(signIn.userId, delayMs, signIn.signal);
    }
  }
  return signInOnce(signIn);
}

/** Removes the stored session of `credentials`, unless another tab has stored a newer one since */
export function forgetMatrixSession(store: MatrixSessionStore, credentials: MatrixCredentials): void {
  const stored = store.read(credentials.userId);
  if (!isCredentials(stored) || stored.accessToken === credentials.accessToken) store.remove(credentials.userId);
}

/** Whether the browser holds a session for `credentials.userId` other than `credentials` */
export function hasNewerMatrixSession(store: MatrixSessionStore, credentials: MatrixCredentials): boolean {
  const stored = storedCredentials(store, credentials.userId);
  return !!stored && stored.accessToken !== credentials.accessToken;
}

/** What follows the homeserver signing a running session out */
export type SignedOutNext = 'resume-newer' | 'mint' | 'fail';

/**
 * Forgets `credentials`, which the homeserver signed out, and tells what follows: resuming the
 * session another tab stored since, else signing in with a newly minted login token, unless the
 * chat already did that after an earlier sign-out (`mintedAgain`), when it fails.
 */
export function afterSignOutByHomeserver(
  store: MatrixSessionStore,
  credentials: MatrixCredentials,
  mintedAgain: boolean
): SignedOutNext {
  forgetMatrixSession(store, credentials);
  if (hasNewerMatrixSession(store, credentials)) return 'resume-newer';
  return mintedAgain ? 'fail' : 'mint';
}
