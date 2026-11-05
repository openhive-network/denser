'use client';

/**
 * The browser keeps the chat's Matrix session (user, device, access token) in localStorage, as
 * Element does, not in memory: a session in memory had to be signed in again with a freshly
 * minted login token on every page load, a reload or a new tab, and Synapse allows about one
 * login token per user per minute, so a second page load within a minute failed to sign in.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getLogger } from '@ui/lib/logging';
import { takeSignOut } from '@smart-signer/lib/auth/chat-sign-out';
import { requestMatrixLoginToken } from '@/blog/lib/fetch-matrix-login-token';
import { LoginTokenGate } from '@/blog/features/matrix-chat/lib/login-token-gate';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import type { LoginTokenAnswer } from '@/blog/features/matrix-chat/lib/matrix-chat-sign-in';
import { chatDeviceId } from '@/blog/features/matrix-chat/lib/device-id';
import {
  afterSignOutByHomeserver,
  forgetMatrixSession,
  signInToMatrixChat,
  type StartedChatSession
} from '@/blog/features/matrix-chat/lib/matrix-chat-sign-in';
import { browserMatrixSessionStore } from '@/blog/features/matrix-chat/lib/stored-session';
import { matrixSdkLogger } from '@/blog/features/matrix-chat/lib/sdk-logger';

const logger = getLogger('app');

export type ChatSessionStatus = 'idle' | 'starting' | 'ready' | 'failed';

interface ChatSessionState {
  status: ChatSessionStatus;
  session: ChatSession | null;
  /** A failed sign-in whose last login token was asked for without creating the account */
  failedWithoutCreating?: boolean;
}

interface MatrixChatSessionOptions {
  /** The Matrix user to sign in; none ends the session */
  userId: string;
  /** Sign in now: the drawer was warmed up or opened */
  start: boolean;
  /** The drawer was opened, so a login token may create the user's missing Matrix account */
  createAccount: boolean;
  homeserverUrl: string;
  defaultRoom: string;
}

interface OpenSessionOptions extends Omit<MatrixChatSessionOptions, 'start' | 'createAccount'> {
  requestLoginToken: () => Promise<LoginTokenAnswer>;
  onLoggedOut: () => void;
  signal: AbortSignal;
}

const IDLE: ChatSessionState = { status: 'idle', session: null };

/**
 * How long after an account switch no login token is asked for: switching on within it leaves the
 * account switched away from without one, which Synapse would count against it for a minute
 */
const SWITCH_SETTLE_MS = 1_000;

// Shared by every sign-in in this page, so that a rate limit holds back the next one of that user
const loginTokens = new LoginTokenGate();

// One sign-in or sign-out at a time: an ending session deletes its device, which the next
// sign-in of the same user in this browser reuses
let lifecycle: Promise<unknown> = Promise.resolve();
function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = lifecycle.then(task);
  lifecycle = run.catch(() => undefined);
  return run;
}

function openSession({ userId, homeserverUrl, defaultRoom, requestLoginToken, onLoggedOut, signal }: OpenSessionOptions) {
  // The SDK's chunk loads while the stored session is read or denser's server mints a login token
  const sdk = import('@/blog/features/matrix-chat/lib/matrix-chat-session');
  const common = { homeserverUrl, defaultRoom, logger: matrixSdkLogger, onLoggedOut };
  return signInToMatrixChat({
    userId,
    store: browserMatrixSessionStore,
    requestLoginToken,
    logIn: async (loginToken) =>
      (await sdk).startMatrixChatSession({ ...common, userId, loginToken, deviceId: chatDeviceId(userId) }),
    resume: async (credentials) => (await sdk).resumeMatrixChatSession({ ...common, credentials }),
    onUnreachable: (error, delayMs) =>
      logger.warn('The Matrix chat could not reach the homeserver, trying again in %d ms: %o', delayMs, error.cause),
    signal
  });
}

/**
 * The native chat client's Matrix session for `userId`, signed in once `start` is set: with the
 * session the browser stored, else with a login token denser's server mints. A change of user
 * (sign-out, account switch, the end of denser's session) or unmounting ends it: the client
 * stops, its state and stored session are dropped and its device signed out, by denser's server
 * when it says it did so on signing out of denser, else by the client. A session the
 * homeserver signs out is dropped too; the session another tab stored since is then resumed,
 * else it signs in again with a newly minted login token, once until `retry` or another user.
 * A homeserver it cannot reach is tried again with backoff, the status staying `starting`, and
 * `retry` after a failure starts the sign-in over, backoff included.
 *
 * Only once `createAccount` is set does a login token create the user's missing Matrix account
 * (and join the default room): a warm-up signs in only a user who has one, and a warm-up that
 * failed without creating it signs in again when `createAccount` is set.
 *
 * No login token is asked for within `SWITCH_SETTLE_MS` of an account switch, nor for a user
 * before the wait of their last rate-limited token request has passed; a sign-in ended meanwhile
 * asks for none.
 */
export function useMatrixChatSession(options: MatrixChatSessionOptions) {
  const { userId, start, createAccount, homeserverUrl, defaultRoom } = options;
  const [state, setState] = useState<ChatSessionState>(IDLE);
  const [attempt, setAttempt] = useState(0);
  // Whether the session was signed in again after the homeserver signed one out, which happens once
  const mintedAgain = useRef(false);
  // Read when a login token is asked for, so opening the drawer does not restart a sign-in
  const createAccountRef = useRef(createAccount);

  useEffect(() => {
    createAccountRef.current = createAccount;
  }, [createAccount]);

  // When the last account switch has settled, as of `Date.now()`
  const switchSettledAt = useRef(0);
  const previousUser = useRef(userId);

  useEffect(() => {
    mintedAgain.current = false;
    if (previousUser.current && userId && previousUser.current !== userId) {
      switchSettledAt.current = Date.now() + SWITCH_SETTLE_MS;
    }
    previousUser.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId || !start) return;
    // A sign-out pending from before this session does not end it
    takeSignOut();
    let current = true;
    let started: StartedChatSession | null = null;
    let askedWithoutCreating = false;
    const aborted = new AbortController();
    const askForLoginToken = () => {
      askedWithoutCreating = !createAccountRef.current;
      return requestMatrixLoginToken(createAccountRef.current);
    };
    const requestLoginToken = () =>
      loginTokens.request(userId, askForLoginToken, aborted.signal, switchSettledAt.current);
    const onLoggedOut = () => {
      if (!started) return;
      const next = afterSignOutByHomeserver(browserMatrixSessionStore, started.credentials, mintedAgain.current);
      if (!current) return;
      logger.info('The homeserver signed the Matrix chat session out');
      if (next === 'fail') {
        setState({ status: 'failed', session: null });
        return;
      }
      if (next === 'mint') mintedAgain.current = true;
      setAttempt((count) => count + 1);
    };
    setState({ status: 'starting', session: null });
    const opening = inTurn(() =>
      openSession({ userId, homeserverUrl, defaultRoom, requestLoginToken, onLoggedOut, signal: aborted.signal })
    );
    opening.then(
      (opened) => {
        started = opened;
        if (current) setState({ status: 'ready', session: opened.session });
      },
      (error: unknown) => {
        if (aborted.signal.aborted) return;
        logger.error(error, 'The Matrix chat could not sign in');
        if (current) setState({ status: 'failed', session: null, failedWithoutCreating: askedWithoutCreating });
      }
    );
    return () => {
      current = false;
      aborted.abort();
      setState(IDLE);
      // Set when signing out of denser ends the session, whose server then deletes the device
      const serverSignOut = takeSignOut() ?? undefined;
      void inTurn(async () => {
        const opened = await opening.catch(() => null);
        if (!opened) return;
        forgetMatrixSession(browserMatrixSessionStore, opened.credentials);
        await opened.session.end(serverSignOut);
      });
    };
  }, [userId, start, homeserverUrl, defaultRoom, attempt]);

  const { status, failedWithoutCreating } = state;
  useEffect(() => {
    if (createAccount && status === 'failed' && failedWithoutCreating) setAttempt((count) => count + 1);
  }, [createAccount, status, failedWithoutCreating]);

  const retry = useCallback(() => {
    mintedAgain.current = false;
    setAttempt((count) => count + 1);
  }, []);
  return { status, session: state.session, retry };
}
