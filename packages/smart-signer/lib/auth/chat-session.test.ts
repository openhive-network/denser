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

const { endAllChatSessions, endCurrentChatSession } = await import('./chat-session.ts');

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
    revoke: async (username: string, token: string) => {
      revoked.push(`${username}:${token}`);
    },
    onFailure: (username: string, reason: string) => failures.push(`${username}: ${reason}`)
  };
}

describe('endCurrentChatSession', () => {
  it("revokes the outgoing user's token once and forgets it, so switching back requests a new one", () => {
    const { revoked, failures, revoke, onFailure } = recorder();
    const alice = account('alice', 'token-a');
    const bob = account('bob', '');
    const session = { user: alice, accounts: [alice, bob] };

    endCurrentChatSession(session, revoke, onFailure);
    // What the switch handler does next
    session.user = bob;

    assert.deepEqual(revoked, ['alice:token-a']);
    assert.equal(session.accounts.find((a) => a.username === 'alice')?.chatAuthToken, '');
    assert.deepEqual(failures, []);

    // Switching away from bob, who has no chat token, revokes nothing more
    endCurrentChatSession(session, revoke, onFailure);
    assert.deepEqual(revoked, ['alice:token-a']);
  });

  it('does nothing for a user who never had chat access, or no user', () => {
    const { revoked, revoke, onFailure } = recorder();
    const carol = account('carol', '');
    const session = { user: carol, accounts: [carol] };

    endCurrentChatSession(session, revoke, onFailure);
    endCurrentChatSession({}, revoke, onFailure);

    assert.deepEqual(revoked, []);
    assert.equal(session.user, carol);
  });

  it('returns before Rocket.Chat answers, and reports a failure without the token', async () => {
    let fail: (error: Error) => void = () => {};
    const failures: string[] = [];
    const session = { user: account('alice', 'token-a') };

    endCurrentChatSession(
      session,
      () => new Promise<void>((_resolve, reject) => (fail = reject)),
      (username, reason) => failures.push(`${username}: ${reason}`)
    );
    assert.equal(session.user.chatAuthToken, '');

    fail(new Error('refused token-a'));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(failures, ['alice: refused [redacted]']);
  });
});

describe('endAllChatSessions', () => {
  it('revokes each token the session holds once', () => {
    const { revoked, revoke, onFailure } = recorder();
    const alice = account('alice', 'token-a');
    const session = { user: alice, accounts: [alice, account('bob', 'token-b'), account('carol', '')] };

    endAllChatSessions(session, revoke, onFailure);

    assert.deepEqual(revoked, ['alice:token-a', 'bob:token-b']);
  });
});
