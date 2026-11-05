import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LoginTokenGate, type GateClock } from './login-token-gate.ts';
import type { LoginTokenAnswer } from './matrix-chat-sign-in.ts';

const ALICE = '@alice:example.org';
const BOB = '@bob:example.org';
const TOKEN: LoginTokenAnswer = { kind: 'token', loginToken: 'syl_token' };
const RETRY_AFTER_MS = 30_000;
const RATE_LIMITED: LoginTokenAnswer = { kind: 'rate-limited', retryAfterMs: RETRY_AFTER_MS };

/** A clock whose sleeps pass at once, moving its time on; `onSleep` runs before one passes */
function fakeClock(onSleep: (ms: number) => void = () => {}) {
  let time = 1_000_000;
  const sleeps: number[] = [];
  const clock: GateClock = {
    now: () => time,
    sleep: async (ms, signal) => {
      sleeps.push(ms);
      onSleep(ms);
      signal.throwIfAborted();
      time += ms;
    }
  };
  return { clock, sleeps, advance: (ms: number) => (time += ms), now: () => time };
}

/** A token route answering `answers` in turn, recording when each request was sent */
function tokenRoute(clock: GateClock, answers: LoginTokenAnswer[]) {
  const sentAt: number[] = [];
  const ask = async () => {
    sentAt.push(clock.now());
    return answers[sentAt.length - 1] ?? TOKEN;
  };
  return { ask, sentAt };
}

describe('LoginTokenGate', () => {
  it('asks at once while no rate limit holds the user back', async () => {
    const { clock, sleeps } = fakeClock();
    const gate = new LoginTokenGate(clock);
    const route = tokenRoute(clock, []);

    assert.deepEqual(await gate.request(ALICE, route.ask, new AbortController().signal), TOKEN);
    assert.deepEqual(await gate.request(ALICE, route.ask, new AbortController().signal), TOKEN);
    assert.deepEqual(sleeps, []);
    assert.equal(route.sentAt.length, 2);
  });

  it("sends no request for a rate-limited user before the answer's wait has passed", async () => {
    const { clock, sleeps, advance } = fakeClock();
    const gate = new LoginTokenGate(clock);
    const route = tokenRoute(clock, [RATE_LIMITED]);

    assert.deepEqual(await gate.request(ALICE, route.ask, new AbortController().signal), RATE_LIMITED);
    advance(10_000);
    assert.deepEqual(await gate.request(ALICE, route.ask, new AbortController().signal), TOKEN);

    assert.deepEqual(sleeps, [20_000]);
    assert.equal(route.sentAt[1] - route.sentAt[0], RETRY_AFTER_MS);
  });

  it('holds back only the user who was rate-limited', async () => {
    const { clock, sleeps } = fakeClock();
    const gate = new LoginTokenGate(clock);

    await gate.request(ALICE, tokenRoute(clock, [RATE_LIMITED]).ask, new AbortController().signal);
    assert.deepEqual(await gate.request(BOB, tokenRoute(clock, []).ask, new AbortController().signal), TOKEN);
    assert.deepEqual(sleeps, []);
  });

  it('waits for `heldUntil` too, such as the end of an account switch', async () => {
    const { clock, sleeps, now } = fakeClock();
    const gate = new LoginTokenGate(clock);

    await gate.request(ALICE, tokenRoute(clock, []).ask, new AbortController().signal, now() + 1_000);
    assert.deepEqual(sleeps, [1_000]);
  });

  it('forgets the rate limit once a token was minted', async () => {
    const { clock, sleeps } = fakeClock();
    const gate = new LoginTokenGate(clock);
    const route = tokenRoute(clock, [RATE_LIMITED, TOKEN, TOKEN]);

    await gate.request(ALICE, route.ask, new AbortController().signal);
    await gate.request(ALICE, route.ask, new AbortController().signal);
    await gate.request(ALICE, route.ask, new AbortController().signal);
    assert.deepEqual(sleeps, [RETRY_AFTER_MS]);
  });

  it('sends nothing for a sign-in ended before or while it waits', async () => {
    const ended = new AbortController();
    const { clock } = fakeClock(() => ended.abort(new Error('switched away')));
    const gate = new LoginTokenGate(clock);
    const route = tokenRoute(clock, [RATE_LIMITED]);
    await gate.request(ALICE, route.ask, new AbortController().signal);

    await assert.rejects(gate.request(ALICE, route.ask, ended.signal), /switched away/);
    await assert.rejects(gate.request(BOB, route.ask, ended.signal), /switched away/);
    assert.equal(route.sentAt.length, 1);
  });
});
