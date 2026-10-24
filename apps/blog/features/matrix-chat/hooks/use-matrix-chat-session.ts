'use client';

import { useCallback, useEffect, useState } from 'react';
import { getLogger } from '@ui/lib/logging';
import { fetchMatrixLoginToken } from '@/blog/lib/fetch-matrix-login-token';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import { chatDeviceId } from '@/blog/features/matrix-chat/lib/device-id';
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

const IDLE: ChatSessionState = { status: 'idle', session: null };

// One sign-in or sign-out at a time: an ending session deletes its device, which the next
// sign-in of the same user in this browser reuses
let lifecycle: Promise<unknown> = Promise.resolve();
function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = lifecycle.then(task);
  lifecycle = run.catch(() => undefined);
  return run;
}

async function openSession({ userId, homeserverUrl, defaultRoom }: MatrixChatSessionOptions): Promise<ChatSession> {
  // The SDK's chunk loads while denser's server mints the login token
  const [{ startMatrixChatSession }, loginToken] = await Promise.all([
    import('@/blog/features/matrix-chat/lib/matrix-chat-session'),
    fetchMatrixLoginToken()
  ]);
  if (!loginToken) throw new Error('denser minted no Matrix login token');
  return startMatrixChatSession({
    homeserverUrl,
    userId,
    loginToken,
    deviceId: chatDeviceId(userId),
    defaultRoom,
    logger: matrixSdkLogger
  });
}

/**
 * The native chat client's Matrix session for `userId`, signed in once `start` is set. A change
 * of user (sign-out, account switch, the end of denser's session) or unmounting ends it: the
 * client stops, its state is dropped and its device signed out.
 */
export function useMatrixChatSession(options: MatrixChatSessionOptions) {
  const { userId, start, homeserverUrl, defaultRoom } = options;
  const [state, setState] = useState<ChatSessionState>(IDLE);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId || !start) return;
    let current = true;
    setState({ status: 'starting', session: null });
    const opening = inTurn(() => openSession({ userId, start, homeserverUrl, defaultRoom }));
    opening.then(
      (session) => {
        if (current) setState({ status: 'ready', session });
      },
      (error: unknown) => {
        logger.error(error, 'The Matrix chat could not sign in');
        if (current) setState({ status: 'failed', session: null });
      }
    );
    return () => {
      current = false;
      setState(IDLE);
      void inTurn(async () => {
        const session = await opening.catch(() => null);
        await session?.end();
      });
    };
  }, [userId, start, homeserverUrl, defaultRoom, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, retry };
}
