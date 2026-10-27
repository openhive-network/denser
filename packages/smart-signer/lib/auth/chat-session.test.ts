import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { User } from '@smart-signer/types/common';

// Under node's type stripping the `@smart-signer/` alias does not resolve
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@smart-signer/lib/auth/accounts') return nextResolve('./accounts.ts', context);
    return nextResolve(specifier, context);
  }
});

const { endAllChatSessions, endCurrentChatSession, rocketChatSessionEnder } = await import('./chat-session.ts');

function account(username: string, chatAuthToken: string): User {
  return {
    isLoggedIn: true,
    username,
    avatarUrl: '',
    // Values of LoginType.keychain and KeyType.posting: the enums cannot load under type stripping
    loginType: 'keychain' as User['loginType'],
    keyType: 'posting' as User['keyType'],
    authenticateOnBackend: true,
    chatAuthToken,
    oauthConsent: { openhive_chat: true },
    strict: true
  };
}

function recorder() {
  const revoked: string[] = [];
  const failures: string[] = [];
  return {
    revoked,
    failures,
    ender: rocketChatSessionEnder(
      async (username: string, token: string) => {
        revoked.push(`${username}:${token}`);
      },
      (username: string, reason: string) => failures.push(`${username}: ${reason}`)
    )
  };
}

describe('endCurrentChatSession', () => {
  it("revokes the outgoing user's token once and forgets it, so switching back requests a new one", () => {
    const { revoked, failures, ender } = recorder();
    const alice = account('alice', 'token-a');
    const bob = account('bob', '');
    const session = { user: alice, accounts: [alice, bob] };

    endCurrentChatSession(session, ender);
    // What the switch handler does next
    session.user = bob;

    assert.deepEqual(revoked, ['alice:token-a']);
    assert.equal(session.accounts.find((a) => a.username === 'alice')?.chatAuthToken, '');
    assert.deepEqual(failures, []);

    // Switching away from bob, who has no chat token, revokes nothing more
    endCurrentChatSession(session, ender);
    assert.deepEqual(revoked, ['alice:token-a']);
  });

  it('does nothing for a user who never had chat access, or no user', () => {
    const { revoked, ender } = recorder();
    const carol = account('carol', '');
    const session = { user: carol, accounts: [carol] };

    endCurrentChatSession(session, ender);
    endCurrentChatSession({}, ender);

    assert.deepEqual(revoked, []);
    assert.equal(session.user, carol);
  });

  it('returns before Rocket.Chat answers, and reports a failure without the token', async () => {
    let fail: (error: Error) => void = () => {};
    const failures: string[] = [];
    const session = { user: account('alice', 'token-a') };

    endCurrentChatSession(
      session,
      rocketChatSessionEnder(
        () => new Promise<void>((_resolve, reject) => (fail = reject)),
        (username, reason) => failures.push(`${username}: ${reason}`)
      )
    );
    assert.equal(session.user.chatAuthToken, '');

    fail(new Error('refused token-a'));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(failures, ['alice: refused [redacted]']);
  });

  it('revokes the token of a user signing in again, who receives a new one', () => {
    const { revoked, ender } = recorder();
    const session = { user: account('alice', 'token-a') };

    endCurrentChatSession(session, ender, account('alice', 'token-a2'));

    assert.deepEqual(revoked, ['alice:token-a']);
  });

  it('keeps a session the incoming user holds too', () => {
    const ended: string[] = [];
    const byUsername = {
      sessionOf: (user: User) => user.username,
      end: async (user: User) => ended.push(user.username) > 0
    };
    const alice = account('alice', '');
    const session = { user: alice };

    endCurrentChatSession(session, byUsername, account('alice', ''));
    assert.deepEqual(ended, []);

    endCurrentChatSession(session, byUsername, account('bob', ''));
    assert.deepEqual(ended, ['alice']);
    assert.equal(session.user, alice);
  });
});

describe('endAllChatSessions', () => {
  it('revokes each token the session holds once, and tells that each was ended', async () => {
    const { revoked, ender } = recorder();
    const alice = account('alice', 'token-a');
    const session = { user: alice, accounts: [alice, account('bob', 'token-b'), account('carol', '')] };

    const ended = endAllChatSessions(session, ender);

    assert.deepEqual(revoked, ['alice:token-a', 'bob:token-b']);
    assert.equal(await ended, true);
  });

  it('tells that not all were ended when one fails, or when the session holds none', async () => {
    const failing = rocketChatSessionEnder(
      async (username: string) => {
        if (username === 'bob') throw new Error('refused');
      },
      () => {}
    );
    const alice = account('alice', 'token-a');

    assert.equal(await endAllChatSessions({ user: alice, accounts: [alice, account('bob', 'token-b')] }, failing), false);
    assert.equal(await endAllChatSessions({ user: account('carol', '') }, failing), false);
    assert.equal(await endAllChatSessions({}, failing), false);
  });
});
