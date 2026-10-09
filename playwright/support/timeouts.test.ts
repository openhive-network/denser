import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTestTimeouts } from './timeouts.ts';

let dir: string;
let observations: string;
let warnings: string[];

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-timeouts-'));
  observations = path.join(dir, 'out', 'observations.jsonl');
  warnings = [];
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const warn = (message: string) => warnings.push(message);

function withFile(content: string) {
  const file = path.join(dir, 'timeouts.json');
  fs.writeFileSync(file, content);
  return createTestTimeouts({ AIDEV_TIMEOUTS_FILE: file, AIDEV_TIMEOUTS_OBSERVATIONS: observations }, warn);
}

const readObservations = () =>
  fs
    .readFileSync(observations, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

describe('testTimeout', () => {
  it('returns every default unchanged without AIDEV_TIMEOUTS_FILE', () => {
    const { testTimeout } = createTestTimeouts({}, warn);
    // The Playwright configs' test, expect and webServer timeouts, and the stack-readiness wait.
    for (const [name, ms] of [
      ['playwright:test', 60_000],
      ['playwright:expect', 10_000],
      ['playwright:web-server', 120_000],
      ['fixture-stack-blog-ready', 180_000],
      ['hydration', 30_000]
    ] as const) {
      assert.equal(testTimeout(name, ms), ms);
    }
    assert.deepEqual(warnings, []);
  });

  it("takes an action's timeout from the file", () => {
    const { testTimeout } = withFile(
      JSON.stringify({ version: 1, scale: 1.4, actions: { navigation: { timeout_ms: 42_000 } } })
    );
    assert.equal(testTimeout('navigation', 30_000), 42_000);
    assert.deepEqual(warnings, []);
  });

  it('scales an action the file does not list', () => {
    const { testTimeout } = withFile(
      JSON.stringify({ version: 1, scale: 1.4, actions: { navigation: { timeout_ms: 42_000 } } })
    );
    assert.equal(testTimeout('editor-ready', 10_000), 14_000);
  });

  it('never goes below the default', () => {
    const { testTimeout } = withFile(
      JSON.stringify({ version: 1, scale: 0.5, actions: { navigation: { timeout_ms: 1_000 } } })
    );
    assert.equal(testTimeout('navigation', 30_000), 30_000);
    assert.equal(testTimeout('editor-ready', 10_000), 10_000);
  });

  for (const [label, content] of [
    ['invalid JSON', '{"version": 1,'],
    ['an unsupported version', JSON.stringify({ version: 2, scale: 3, actions: {} })],
    ['a non-numeric scale', JSON.stringify({ version: 1, scale: 'fast', actions: {} })],
    ['an action without timeout_ms', JSON.stringify({ version: 1, scale: 3, actions: { navigation: {} } })]
  ]) {
    it(`falls back to the defaults, warning once, on ${label}`, () => {
      const { testTimeout } = withFile(content);
      assert.equal(testTimeout('navigation', 30_000), 30_000);
      assert.equal(testTimeout('editor-ready', 10_000), 10_000);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /malformed/);
    });
  }

  it('falls back to the defaults, warning once, when the file is missing', () => {
    const { testTimeout } = createTestTimeouts({ AIDEV_TIMEOUTS_FILE: path.join(dir, 'absent.json') }, warn);
    assert.equal(testTimeout('navigation', 30_000), 30_000);
    assert.equal(testTimeout('navigation', 30_000), 30_000);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /cannot be read/);
  });

  it('reads the file once', () => {
    const { testTimeout } = withFile(JSON.stringify({ version: 1, scale: 2, actions: {} }));
    assert.equal(testTimeout('navigation', 1_000), 2_000);
    fs.writeFileSync(path.join(dir, 'timeouts.json'), JSON.stringify({ version: 1, scale: 3, actions: {} }));
    assert.equal(testTimeout('navigation', 1_000), 2_000);
  });
});

describe('timed', () => {
  it('passes the resolved timeout and records a completed action', async () => {
    const { timed } = withFile(JSON.stringify({ version: 1, scale: 2, actions: {} }));
    const result = await timed('editor-ready', 5_000, async (timeoutMs) => `waited up to ${timeoutMs}`);
    assert.equal(result, 'waited up to 10000');
    const [observation, ...rest] = readObservations();
    assert.deepEqual(rest, []);
    assert.deepEqual(Object.keys(observation), ['action', 'duration_ms', 'default_ms']);
    assert.equal(observation.action, 'editor-ready');
    assert.equal(observation.default_ms, 5_000);
    assert.ok(Number.isInteger(observation.duration_ms) && observation.duration_ms >= 0);
  });

  it('records nothing for an action that fails', async () => {
    const { timed } = withFile(JSON.stringify({ version: 1, scale: 1, actions: {} }));
    await assert.rejects(
      timed('navigation', 1_000, async () => {
        throw new Error('Timeout 1000ms exceeded');
      }),
      /Timeout 1000ms exceeded/
    );
    await timed('editor-ready', 1_000, async () => undefined);
    assert.deepEqual(
      readObservations().map((o) => o.action),
      ['editor-ready']
    );
  });

  it('appends one line per completed action', () => {
    const { recordTimedAction } = createTestTimeouts({ AIDEV_TIMEOUTS_OBSERVATIONS: observations }, warn);
    recordTimedAction('navigation', 8123.4, 30_000);
    recordTimedAction('navigation', 912, 30_000);
    assert.deepEqual(readObservations(), [
      { action: 'navigation', duration_ms: 8123, default_ms: 30_000 },
      { action: 'navigation', duration_ms: 912, default_ms: 30_000 }
    ]);
  });

  it('warns once, without throwing, when observations cannot be written', () => {
    const blocker = path.join(dir, 'not-a-directory');
    fs.writeFileSync(blocker, '');
    const { recordTimedAction } = createTestTimeouts(
      { AIDEV_TIMEOUTS_OBSERVATIONS: path.join(blocker, 'observations.jsonl') },
      warn
    );
    recordTimedAction('navigation', 1, 30_000);
    recordTimedAction('navigation', 2, 30_000);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /cannot be written/);
  });
});
