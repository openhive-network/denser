import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatSession } from './chat-view-types.ts';
import {
  forgetMatrixSession,
  hasNewerMatrixSession,
  signInToMatrixChat,
  StoredSessionRejectedError,
  type LoginTokenAnswer,
  type MatrixCredentials,
  type MatrixSessionStore
} from './matrix-chat-sign-in.ts';

const ALICE = '@alice:example.org';
const STORED: MatrixCredentials = { userId: ALICE, deviceId: 'DENSERSTORED', accessToken: 'syt_stored' };
const MINTED: MatrixCredentials = { userId: ALICE, deviceId: 'DENSERSTORED', accessToken: 'syt_minted' };

/** A session the tests tell apart by the access token it was started with */
const sessionWith = (credentials: MatrixCredentials) => ({ token: credentials.accessToken }) as unknown as ChatSession;

/** localStorage in memory; `onWait` stands in for another tab while one waits for a write */
function memoryStore(slots: Record<string, unknown> = {}, onWait: (store: MatrixSessionStore) => void = () => {}) {
  const waits: number[] = [];
  const store: MatrixSessionStore = {
    read: (userId) => slots[userId] ?? null,
    write: (credentials) => {
      slots[credentials.userId] = { ...credentials };
    },
    remove: (userId) => {
      delete slots[userId];
    },
    waitForWrite: async (_userId, ms) => {
      waits.push(ms);
      onWait(store);
    }
  };
  return { store, slots, waits };
}

/** Signs Alice in against `store`; the mint answers `answers` in turn */
async function signIn(
  store: MatrixSessionStore,
  answers: LoginTokenAnswer[],
  resume?: (credentials: MatrixCredentials) => Promise<ChatSession>
) {
  const calls = { mints: 0, logIns: [] as string[], resumed: [] as string[] };
  const started = await signInToMatrixChat({
    userId: ALICE,
    store,
    requestLoginToken: async () => answers[calls.mints++] ?? { kind: 'none' },
    logIn: async (loginToken) => {
      calls.logIns.push(loginToken);
      return { session: sessionWith(MINTED), credentials: MINTED };
    },
    resume: async (credentials) => {
      calls.resumed.push(credentials.accessToken);
      return resume ? resume(credentials) : sessionWith(credentials);
    },
    signal: new AbortController().signal
  });
  return { started, calls };
}

const rejected = async (): Promise<ChatSession> => {
  throw new StoredSessionRejectedError('M_UNKNOWN_TOKEN');
};

describe('signInToMatrixChat', () => {
  it('resumes a stored session the homeserver accepts, without minting a login token', async () => {
    const { store, slots } = memoryStore({ [ALICE]: { ...STORED } });
    const { started, calls } = await signIn(store, [{ kind: 'token', loginToken: 'syl_unused' }]);

    assert.deepEqual(started.credentials, STORED);
    assert.deepEqual(started.session, sessionWith(STORED));
    assert.deepEqual(calls, { mints: 0, logIns: [], resumed: ['syt_stored'] });
    assert.deepEqual(slots[ALICE], STORED);
  });

  it('mints a login token when the stored session is rejected, and stores the new one in its place', async () => {
    const { store, slots } = memoryStore({ [ALICE]: { ...STORED } });
    const { started, calls } = await signIn(store, [{ kind: 'token', loginToken: 'syl_login' }], rejected);

    assert.deepEqual(started.credentials, MINTED);
    assert.deepEqual(calls, { mints: 1, logIns: ['syl_login'], resumed: ['syt_stored'] });
    assert.deepEqual(slots[ALICE], MINTED);
  });

  it("ignores and removes another user's session, or anything else, stored for the user", async () => {
    for (const stored of [{ ...STORED, userId: '@bob:example.org' }, { userId: ALICE }, 'syt_bare']) {
      const removed: string[] = [];
      const { store, slots } = memoryStore({ [ALICE]: stored });
      const remove = store.remove;
      store.remove = (userId) => {
        removed.push(userId);
        remove(userId);
      };
      const { calls } = await signIn(store, [{ kind: 'token', loginToken: 'syl_login' }]);

      assert.deepEqual(calls.resumed, [], JSON.stringify(stored));
      assert.deepEqual(removed, [ALICE]);
      assert.equal(calls.mints, 1);
      assert.deepEqual(slots[ALICE], MINTED);
    }
  });

  it('mints when nothing is stored', async () => {
    const { store, slots } = memoryStore();
    const { calls } = await signIn(store, [{ kind: 'token', loginToken: 'syl_login' }]);
    assert.deepEqual(calls, { mints: 1, logIns: ['syl_login'], resumed: [] });
    assert.deepEqual(slots[ALICE], MINTED);
  });

  it('keeps the stored session and mints nothing when the homeserver cannot be reached', async () => {
    const { store, slots } = memoryStore({ [ALICE]: { ...STORED } });
    const unreachable = async (): Promise<ChatSession> => {
      throw new TypeError('Failed to fetch');
    };
    await assert.rejects(signIn(store, [{ kind: 'token', loginToken: 'syl_login' }], unreachable), TypeError);
    assert.deepEqual(slots[ALICE], STORED);
  });

  it('waits out a rate-limited mint once, then mints again', async () => {
    const { store, slots, waits } = memoryStore();
    const { calls } = await signIn(store, [
      { kind: 'rate-limited', retryAfterMs: 1_500 },
      { kind: 'token', loginToken: 'syl_later' }
    ]);
    assert.deepEqual(waits, [1_500]);
    assert.deepEqual(calls, { mints: 2, logIns: ['syl_later'], resumed: [] });
    assert.deepEqual(slots[ALICE], MINTED);
  });

  it('resumes the session another tab stored while waiting out a rate-limited mint', async () => {
    const { store, slots } = memoryStore({}, (other) => other.write(STORED));
    const { started, calls } = await signIn(store, [
      { kind: 'rate-limited', retryAfterMs: 60_000 },
      { kind: 'token', loginToken: 'syl_unused' }
    ]);
    assert.deepEqual(started.credentials, STORED);
    assert.deepEqual(calls, { mints: 1, logIns: [], resumed: ['syt_stored'] });
    assert.deepEqual(slots[ALICE], STORED);
  });

  it('fails when no token is minted, or the retry after a rate limit gets none either', async () => {
    const answers: LoginTokenAnswer[][] = [
      [{ kind: 'none' }],
      [
        { kind: 'rate-limited', retryAfterMs: 10 },
        { kind: 'rate-limited', retryAfterMs: 10 }
      ]
    ];
    for (const answered of answers) {
      const { store, slots, waits } = memoryStore();
      await assert.rejects(signIn(store, answered), /denser minted no Matrix login token/);
      assert.equal(waits.length, answered.length - 1);
      assert.deepEqual(slots, {});
    }
  });
});

describe('forgetMatrixSession', () => {
  it("removes the session's stored credentials when it ends", () => {
    const { store, slots } = memoryStore({ [ALICE]: { ...STORED } });
    forgetMatrixSession(store, STORED);
    assert.deepEqual(slots, {});
  });

  it('keeps a newer session another tab stored since', () => {
    const { store, slots } = memoryStore({ [ALICE]: { ...MINTED } });
    assert.equal(hasNewerMatrixSession(store, STORED), true);
    forgetMatrixSession(store, STORED);
    assert.deepEqual(slots[ALICE], MINTED);
    assert.equal(hasNewerMatrixSession(store, MINTED), false);
  });
});
