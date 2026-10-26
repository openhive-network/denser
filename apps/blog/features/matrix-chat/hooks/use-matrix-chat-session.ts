'use client';

/**
 * The browser keeps the chat's Matrix session (user, device, access token) in localStorage, as
 * Element does, not in memory: a session in memory had to be signed in again with a freshly
 * minted login token on every page load, a reload or a new tab, and Synapse allows about one
 * login token per user per minute, so a second page load within a minute failed to sign in.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getLogger } from '@ui/lib/logging';
import { requestMatrixLoginToken } from '@/blog/lib/fetch-matrix-login-token';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
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
}

interface MatrixChatSessionOptions {
  /** The Matrix user to sign in; none ends the session */
  userId: string;
  /** Sign in now: the drawer was warmed up or opened */
  start: boolean;
  homeserverUrl: string;
  defaultRoom: string;
}

interface OpenSessionOptions extends Omit<MatrixChatSessionOptions, 'start'> {
  onLoggedOut: () => void;
  signal: AbortSignal;
}

const IDLE: ChatSessionState = { status: 'idle', session: null };

// One sign-in or sign-out at a time: an ending session deletes its device, which the next
// sign-in of the same user in this browser reuses
let lifecycle: Promise<unknown> = Promise.resolve();
function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = lifecycle.then(task);
  lifecycle = run.catch(() => undefined);
  return run;
}

function openSession({ userId, homeserverUrl, defaultRoom, onLoggedOut, signal }: OpenSessionOptions) {
  // The SDK's chunk loads while the stored session is read or denser's server mints a login token
  const sdk = import('@/blog/features/matrix-chat/lib/matrix-chat-session');
  const common = { homeserverUrl, defaultRoom, logger: matrixSdkLogger, onLoggedOut };
  return signInToMatrixChat({
    userId,
    store: browserMatrixSessionStore,
    requestLoginToken: requestMatrixLoginToken,
    logIn: async (loginToken) =>
      (await sdk).startMatrixChatSession({ ...common, userId, loginToken, deviceId: chatDeviceId(userId) }),
    resume: async (credentials) => (await sdk).resumeMatrixChatSession({ ...common, credentials }),
    signal
  });
}

/**
 * The native chat client's Matrix session for `userId`, signed in once `start` is set: with the
 * session the browser stored, else with a login token denser's server mints. A change of user
 * (sign-out, account switch, the end of denser's session) or unmounting ends it: the client
 * stops, its state and stored session are dropped and its device signed out. A session the
 * homeserver signs out is dropped too; the session another tab stored since is then resumed,
 * else it signs in again with a newly minted login token, once until `retry` or another user.
 */
export function useMatrixChatSession(options: MatrixChatSessionOptions) {
  const { userId, start, homeserverUrl, defaultRoom } = options;
  const [state, setState] = useState<ChatSessionState>(IDLE);
  const [attempt, setAttempt] = useState(0);
  // Whether the session was signed in again after the homeserver signed one out, which happens once
  const mintedAgain = useRef(false);

  useEffect(() => {
    mintedAgain.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId || !start) return;
    let current = true;
    let started: StartedChatSession | null = null;
    const aborted = new AbortController();
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
      openSession({ userId, homeserverUrl, defaultRoom, onLoggedOut, signal: aborted.signal })
    );
    opening.then(
      (opened) => {
        started = opened;
        if (current) setState({ status: 'ready', session: opened.session });
      },
      (error: unknown) => {
        if (aborted.signal.aborted) return;
        logger.error(error, 'The Matrix chat could not sign in');
        if (current) setState({ status: 'failed', session: null });
      }
    );
    return () => {
      current = false;
      aborted.abort();
      setState(IDLE);
      void inTurn(async () => {
        const opened = await opening.catch(() => null);
        if (!opened) return;
        forgetMatrixSession(browserMatrixSessionStore, opened.credentials);
        await opened.session.end();
      });
    };
  }, [userId, start, homeserverUrl, defaultRoom, attempt]);

  const retry = useCallback(() => {
    mintedAgain.current = false;
    setAttempt((count) => count + 1);
  }, []);
  return { ...state, retry };
}
