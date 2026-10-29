import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { LiteRelayError } from '@hiveio/lite-account';

const { availabilityState, canConfirmLiteName, checkLiteNameAvailability, graduationNameState, isLiteNameTaken } = await import(
  './lite-name-availability.ts'
);

type Answer = Parameters<typeof availabilityState>[0];

const free: Answer = { name: 'brave-otter-482', available: true, lite_grammar_ok: true, l1_grammar_ok: true, lite_taken: false, l1_taken: false };

const originalFetch = globalThis.fetch;
const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBasePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
  else process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
});

describe('checkLiteNameAvailability', () => {
  it('asks the gateway pass-through under the base path and returns its answer', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/blog';
    const requested: string[] = [];
    globalThis.fetch = async (input: string | URL | Request) => {
      requested.push(String(input));
      return Response.json(free);
    };
    assert.deepEqual(await checkLiteNameAvailability('brave-otter-482'), free);
    assert.deepEqual(requested, ['/blog/api/lite-gateway/names/brave-otter-482/availability']);
  });

  it('throws for an error status or an answer that is not an availability record', async () => {
    globalThis.fetch = async () => Response.json({ ok: false, code: 'relay_unavailable' }, { status: 503 });
    await assert.rejects(checkLiteNameAvailability('brave-otter-482'), /HTTP 503/);
    globalThis.fetch = async () => Response.json({ name: 'brave-otter-482', available: 'yes' });
    await assert.rejects(checkLiteNameAvailability('brave-otter-482'), /HTTP 200/);
    globalThis.fetch = async () => new Response('<html>bad gateway</html>', { status: 502 });
    await assert.rejects(checkLiteNameAvailability('brave-otter-482'), /HTTP 502/);
  });
});

describe('availabilityState', () => {
  it('names why a name cannot be taken, grammar before registries', () => {
    assert.equal(availabilityState(free), 'available');
    assert.equal(availabilityState({ ...free, available: false, lite_taken: true }), 'taken_lite');
    assert.equal(availabilityState({ ...free, available: false, l1_taken: true }), 'taken_l1');
    assert.equal(availabilityState({ ...free, available: false, lite_taken: true, l1_taken: true }), 'taken_lite');
    assert.equal(availabilityState({ ...free, available: false, l1_grammar_ok: false }), 'invalid_l1');
    assert.equal(availabilityState({ ...free, available: false, lite_grammar_ok: false, l1_grammar_ok: false }), 'invalid');
    assert.equal(availabilityState({ ...free, available: false }), 'taken');
  });
});

describe('graduationNameState', () => {
  const own = 'brave-otter-482';
  it('takes the lite account\'s own name, which the lite registry holds for it', () => {
    assert.equal(graduationNameState({ ...free, available: false, lite_taken: true }, own), 'available');
    assert.equal(graduationNameState(free, own), 'available');
  });

  it('refuses a Hive account\'s name, another lite account\'s name and a name hived refuses', () => {
    assert.equal(graduationNameState({ ...free, available: false, lite_taken: true, l1_taken: true }, own), 'taken_l1');
    const other = { ...free, name: 'calm-heron-17', available: false, lite_taken: true };
    assert.equal(graduationNameState(other, own), 'taken_lite');
    assert.equal(graduationNameState({ ...free, available: false, l1_grammar_ok: false }, own), 'invalid_l1');
  });
});

describe('canConfirmLiteName', () => {
  it('lets an available name through, and any name the gateway could not check', () => {
    assert.equal(canConfirmLiteName('available'), true);
    assert.equal(canConfirmLiteName('check_failed'), true);
    for (const state of ['invalid', 'checking', 'taken', 'taken_lite', 'taken_l1', 'invalid_l1'] as const) {
      assert.equal(canConfirmLiteName(state), false, state);
    }
  });
});

// The relay error carries the gateway's code as it came; the package's code union lacks `name_taken`.
const relayError = (code: string) => Object.assign(new LiteRelayError('invalid_request', code), { code });

describe('isLiteNameTaken', () => {
  it('is true for the gateway refusing a taken name only', () => {
    assert.equal(isLiteNameTaken(relayError('name_taken')), true);
    assert.equal(isLiteNameTaken(relayError('rate_limited')), false);
    assert.equal(isLiteNameTaken(new Error('name_taken')), false);
  });
});
