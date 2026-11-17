import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './sentry-early-errors') return nextResolve('./sentry-early-errors.ts', context);
    return nextResolve(specifier, context);
  }
});

const { deferSentryLoad } = await import('./sentry-deferred-load.ts');
const { bufferHandledError } = await import('./sentry-early-errors.ts');

// Longer than any delay the loader may wait for after `load`.
const LONG_AFTER_LOAD_MS = 60_000;

interface FakeWindow extends EventTarget {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void;
}

const globals = globalThis as unknown as { window?: FakeWindow; document?: { readyState: string } };

let idleCallbacks: (() => void)[];
let page = { window: new EventTarget(), document: { readyState: 'loading' } };

const setUpPage = (readyState: string, { idleCallback = true } = {}) => {
  const window: FakeWindow = new EventTarget();
  if (idleCallback) window.requestIdleCallback = (callback) => idleCallbacks.push(callback);
  page = { window, document: { readyState } };
  globals.window = page.window;
  globals.document = page.document;
};

const fireLoad = () => {
  page.document.readyState = 'complete';
  page.window.dispatchEvent(new Event('load'));
};

const runIdleCallbacks = () => idleCallbacks.splice(0).forEach((callback) => callback());

const throwUncaught = (error: Error) => page.window.dispatchEvent(Object.assign(new Event('error'), { error }));

const rejectUnhandled = (reason: unknown) =>
  page.window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));

/** A deferSentryLoad `load` that records each call and the errors it was handed. */
const recordLoads = () => {
  const loads: unknown[][] = [];
  return {
    loads,
    load: (stopBufferingEarlyErrors: () => unknown[]) => loads.push(stopBufferingEarlyErrors())
  };
};

describe('deferSentryLoad', () => {
  beforeEach(() => {
    idleCallbacks = [];
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    mock.timers.reset();
    delete globals.window;
    delete globals.document;
  });

  it('does not load during the page load, and loads once the page has loaded and gone idle', () => {
    setUpPage('loading');
    const { loads, load } = recordLoads();
    deferSentryLoad(load);

    mock.timers.tick(LONG_AFTER_LOAD_MS);
    runIdleCallbacks();
    assert.equal(loads.length, 0, 'loaded before `load`');

    fireLoad();
    mock.timers.tick(1_000);
    runIdleCallbacks();
    assert.equal(loads.length, 0, 'loaded right after `load`');

    mock.timers.tick(LONG_AFTER_LOAD_MS);
    assert.equal(loads.length, 0, 'loaded before the main thread was idle');
    runIdleCallbacks();
    assert.deepEqual(loads, [[]]);
  });

  it('waits after `load` when the page has already loaded', () => {
    setUpPage('complete', { idleCallback: false });
    const { loads, load } = recordLoads();
    deferSentryLoad(load);

    mock.timers.tick(1_000);
    assert.equal(loads.length, 0);
    mock.timers.tick(LONG_AFTER_LOAD_MS);
    assert.deepEqual(loads, [[]]);
  });

  it('does not load for errors raised during the page load, and hands them to the load', () => {
    setUpPage('loading');
    const { loads, load } = recordLoads();
    const uncaught = new Error('uncaught');
    deferSentryLoad(load);

    throwUncaught(uncaught);
    rejectUnhandled('rejected');
    fireLoad();
    mock.timers.tick(1_000);
    runIdleCallbacks();
    assert.equal(loads.length, 0);

    mock.timers.tick(LONG_AFTER_LOAD_MS);
    runIdleCallbacks();
    assert.deepEqual(loads, [[uncaught, 'rejected']]);
  });

  it('collects errors raised while the SDK loads, and none after it has taken over', () => {
    setUpPage('complete');
    let stop: (() => unknown[]) | undefined;
    deferSentryLoad((stopBufferingEarlyErrors) => {
      stop = stopBufferingEarlyErrors;
    });
    mock.timers.tick(LONG_AFTER_LOAD_MS);
    runIdleCallbacks();
    assert.ok(stop);

    const whileLoading = new Error('while loading');
    throwUncaught(whileLoading);
    assert.deepEqual(stop(), [whileLoading]);
    throwUncaught(new Error('after'));
    assert.deepEqual(stop(), [whileLoading]);
  });
});

describe('bufferHandledError', () => {
  beforeEach(() => {
    idleCallbacks = [];
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    mock.timers.reset();
    delete globals.window;
    delete globals.document;
  });

  it('hands a caught error to the deferred load', () => {
    setUpPage('complete');
    const { loads, load } = recordLoads();
    const handled = new Error('handled');
    deferSentryLoad(load);

    assert.equal(bufferHandledError(handled), true);
    assert.equal(loads.length, 0);
    mock.timers.tick(LONG_AFTER_LOAD_MS);
    runIdleCallbacks();
    assert.deepEqual(loads, [[handled]]);
  });

  it('declines once the SDK has taken over, or when nothing is deferred', () => {
    assert.equal(bufferHandledError(new Error('no DSN')), false);

    setUpPage('complete');
    const { loads, load } = recordLoads();
    deferSentryLoad(load);
    mock.timers.tick(LONG_AFTER_LOAD_MS);
    runIdleCallbacks();
    assert.deepEqual(loads, [[]]);

    assert.equal(bufferHandledError(new Error('after load')), false);
  });
});
