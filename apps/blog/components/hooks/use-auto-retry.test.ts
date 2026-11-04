import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { useAutoRetry } = await import('./use-auto-retry.ts');

const SCHEDULE_MS = [2_000, 5_000, 10_000, 30_000, 30_000, 30_000];
const RESUME_GRACE_MS = 1_000;

describe('useAutoRetry', () => {
  let dom: JSDOM;
  let root: Root;
  let retries: number;
  let exhausted: boolean;

  function Probe() {
    exhausted = useAutoRetry(() => {
      retries += 1;
    }).exhausted;
    return null;
  }

  const mount = () => {
    root = createRoot(dom.window.document.getElementById('root') as HTMLElement);
    act(() => root.render(createElement(Probe)));
  };
  const unmount = () => act(() => root.unmount());
  const advance = (ms: number) => act(() => mock.timers.tick(ms));

  before(() => {
    // Visible, so an attempt that comes due is made at once.
    dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true });
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  });

  beforeEach(() => {
    retries = 0;
    exhausted = false;
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  after(() => {
    dom.window.close();
  });

  const endSession = () => {
    unmount();
    advance(RESUME_GRACE_MS);
  };

  it('retries on the backoff schedule, then stops and reports it is exhausted', () => {
    mount();
    SCHEDULE_MS.forEach((delay, index) => {
      assert.equal(exhausted, false);
      advance(delay - 1);
      assert.equal(retries, index);
      advance(1);
      assert.equal(retries, index + 1);
    });
    assert.equal(exhausted, true);

    advance(10 * 60_000);
    assert.equal(retries, SCHEDULE_MS.length);
    endSession();
  });

  it('resumes the schedule across a remount, so a remount after the last attempt does not retry', () => {
    mount();
    advance(SCHEDULE_MS[0]);
    unmount();
    mount();
    advance(SCHEDULE_MS[1]);
    assert.equal(retries, 2);

    for (const delay of SCHEDULE_MS.slice(2)) {
      unmount();
      mount();
      advance(delay);
    }
    assert.equal(retries, SCHEDULE_MS.length);

    unmount();
    mount();
    assert.equal(exhausted, true);
    advance(10 * 60_000);
    assert.equal(retries, SCHEDULE_MS.length);
    endSession();
  });

  it('starts over once the component stayed unmounted past the grace period', () => {
    mount();
    for (const delay of SCHEDULE_MS) advance(delay);
    assert.equal(exhausted, true);
    unmount();
    advance(RESUME_GRACE_MS);

    retries = 0;
    mount();
    assert.equal(exhausted, false);
    advance(SCHEDULE_MS[0]);
    assert.equal(retries, 1);
    endSession();
  });
});
