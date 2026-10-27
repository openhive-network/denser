import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { beginSignOut, takeSignOut } = await import('./chat-sign-out.ts');

describe('the sign-out channel', () => {
  it("resolves to whether /api/auth/logout's answer says the server ended the chat sessions", async () => {
    beginSignOut()({ isLoggedIn: false, username: '', chatSessionsEnded: true });
    assert.equal(await takeSignOut(), true);

    for (const answer of [{ isLoggedIn: false, chatSessionsEnded: false }, { isLoggedIn: false }, null]) {
      beginSignOut()(answer);
      assert.equal(await takeSignOut(), false, JSON.stringify(answer));
    }
  });

  it('hands a sign-out out once, before its answer is in', async () => {
    const settle = beginSignOut();
    const taken = takeSignOut();
    assert.equal(takeSignOut(), null);

    settle({ chatSessionsEnded: true });
    assert.equal(await taken, true);
  });

  it('hands out the sign-out begun last', async () => {
    beginSignOut();
    beginSignOut()({ chatSessionsEnded: true });
    assert.equal(await takeSignOut(), true);
  });
});
