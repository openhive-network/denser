import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const { createLiteNameChecker, NAME_CHECK_DEBOUNCE_MS } = await import('./lite-name-checker.ts');

type Availability = Awaited<ReturnType<Parameters<typeof createLiteNameChecker>[0]>>;

const answer = (name: string, overrides: Partial<Availability> = {}): Availability => ({
  name,
  available: true,
  lite_grammar_ok: true,
  l1_grammar_ok: true,
  lite_taken: false,
  l1_taken: false,
  ...overrides
});

/** A gateway whose answers the test releases one by one, in any order. */
function fakeGateway() {
  const pending: { name: string; signal: AbortSignal; resolve: (a: Availability) => void; reject: (e: Error) => void }[] = [];
  const check = (name: string, signal: AbortSignal) =>
    new Promise<Availability>((resolve, reject) => pending.push({ name, signal, resolve, reject }));
  return { check, pending };
}

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function recorder() {
  const states: string[] = [];
  return { states, onState: (name: string, state: string) => states.push(`${name}:${state}`) };
}

describe('createLiteNameChecker', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
  afterEach(() => mock.timers.reset());

  it('reports a name outside the grammar as invalid at once, without asking the gateway', () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    createLiteNameChecker(gateway.check, onState).update('Bad_Name');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS);
    assert.deepEqual(states, ['Bad_Name:invalid']);
    assert.equal(gateway.pending.length, 0);
  });

  it('asks the gateway once typing has paused for the debounce', async () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gateway.check, onState);
    checker.update('lite-smo');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS - 1);
    checker.update('lite-smoke-1016');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS - 1);
    assert.equal(gateway.pending.length, 0);
    mock.timers.tick(1);
    assert.deepEqual(gateway.pending.map((p) => p.name), ['lite-smoke-1016']);

    gateway.pending[0].resolve(answer('lite-smoke-1016', { available: false, lite_taken: true }));
    await settle();
    assert.deepEqual(states, ['lite-smo:checking', 'lite-smoke-1016:checking', 'lite-smoke-1016:taken_lite']);
  });

  it('says what its `classify` makes of an answer', async () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gateway.check, onState, { classify: (a) => (a.lite_taken ? 'available' : 'taken') });
    checker.update('lite-smoke-1016');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS);
    gateway.pending[0].resolve(answer('lite-smoke-1016', { available: false, lite_taken: true }));
    await settle();
    assert.deepEqual(states, ['lite-smoke-1016:checking', 'lite-smoke-1016:available']);
  });

  it('never reports an answer for a name the user has typed past, and aborts its request', async () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gateway.check, onState);
    checker.update('test-gateway-1');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS);
    checker.update('test-gateway-12');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS);
    const [older, newer] = gateway.pending;
    assert.equal(older.signal.aborted, true);

    newer.resolve(answer('test-gateway-12'));
    await settle();
    older.resolve(answer('test-gateway-1', { available: false, l1_taken: true }));
    await settle();
    assert.deepEqual(states, ['test-gateway-1:checking', 'test-gateway-12:checking', 'test-gateway-12:available']);
  });

  it('reports a gateway failure as check_failed and asks again next time', async () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gateway.check, onState);
    checker.update('brave-otter-482');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS);
    gateway.pending[0].reject(new Error('HTTP 503'));
    await settle();
    checker.update('brave-otter-482');
    assert.deepEqual(states, ['brave-otter-482:checking', 'brave-otter-482:check_failed', 'brave-otter-482:checking']);
  });

  it('answers a name it already knows at once, including one remembered as taken', async () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gateway.check, onState);
    checker.update('brave-otter-482');
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS);
    gateway.pending[0].resolve(answer('brave-otter-482'));
    await settle();
    checker.remember('swift-fox-101', 'taken');
    checker.update('brave-otter-482');
    checker.update('swift-fox-101');
    assert.equal(gateway.pending.length, 1);
    assert.deepEqual(states.slice(-2), ['brave-otter-482:available', 'swift-fox-101:taken']);
  });

  it('reports nothing after cancel', async () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gateway.check, onState);
    checker.update('brave-otter-482');
    checker.cancel();
    mock.timers.tick(NAME_CHECK_DEBOUNCE_MS);
    assert.equal(gateway.pending.length, 0);
    assert.deepEqual(states, ['brave-otter-482:checking']);
  });
});

describe('createLiteNameChecker suggest', () => {
  const taken = new Set(['calm-owl-100', 'bold-yak-200']);
  const gatewayOf = (fail = false) => async (name: string) => {
    if (fail) throw new Error('unreachable');
    return answer(name, taken.has(name) ? { available: false, lite_taken: true } : {});
  };
  const sequence = (...names: string[]) => () => names.shift() ?? 'last-name-999';

  it('generates names until the gateway says one is available', async () => {
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gatewayOf(), onState, { generate: sequence('bold-yak-200', 'warm-seal-300') });
    assert.equal(await checker.suggest('calm-owl-100'), 'warm-seal-300');
    assert.deepEqual(states, ['warm-seal-300:available']);
  });

  it('stops after the attempts allowed, offering the last name as it is', async () => {
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gatewayOf(), onState, { generate: sequence('bold-yak-200', 'warm-seal-300'), maxAttempts: 2 });
    assert.equal(await checker.suggest('calm-owl-100'), 'bold-yak-200');
    assert.deepEqual(states, ['bold-yak-200:taken_lite']);
  });

  it('offers the first name when the gateway cannot be asked', async () => {
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gatewayOf(true), onState, { generate: sequence('warm-seal-300') });
    assert.equal(await checker.suggest('calm-owl-100'), 'calm-owl-100');
    assert.deepEqual(states, ['calm-owl-100:check_failed']);
  });

  it('gives up without reporting when the user types meanwhile', async () => {
    const gateway = fakeGateway();
    const { states, onState } = recorder();
    const checker = createLiteNameChecker(gateway.check, onState);
    const suggestion = checker.suggest('calm-owl-100');
    await settle();
    checker.update('my-own-name');
    gateway.pending[0].resolve(answer('calm-owl-100'));
    assert.equal(await suggestion, undefined);
    assert.deepEqual(states, ['my-own-name:checking']);
  });
});
