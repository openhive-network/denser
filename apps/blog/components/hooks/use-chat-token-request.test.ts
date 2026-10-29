import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { useChatTokenRequest } = await import('./use-chat-token-request.ts');

type State = Parameters<typeof useChatTokenRequest>[0];

const SIGNED_OUT: State = { isIframeLoaded: false, isLoggedIn: false, username: '', chatAuthToken: '' };

describe('useChatTokenRequest', () => {
  let dom: JSDOM;
  let root: Root;
  let requests: string[];

  function Probe(state: State) {
    useChatTokenRequest(state, () => requests.push(state.username));
    return null;
  }

  function render(state: State) {
    act(() => root.render(createElement(Probe, state)));
  }

  before(() => {
    dom = new JSDOM('<!doctype html><div id="root"></div>');
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  });

  beforeEach(() => {
    requests = [];
    root = createRoot(dom.window.document.getElementById('root') as HTMLElement);
  });

  after(() => {
    dom.window.close();
  });

  it('requests once when the user signs in after the iframe loaded, and again for the next user', () => {
    render(SIGNED_OUT);
    render({ ...SIGNED_OUT, isIframeLoaded: true });
    assert.deepEqual(requests, []);

    const alice = { isIframeLoaded: true, isLoggedIn: true, username: 'alice', chatAuthToken: '' };
    render(alice);
    render(alice);
    render({ ...alice });
    assert.deepEqual(requests, ['alice']);

    // The iframe reports it is ready again while the request is in flight
    render({ ...alice, isIframeLoaded: false });
    render(alice);
    assert.deepEqual(requests, ['alice']);

    render({ ...alice, chatAuthToken: 'token-a' });
    assert.deepEqual(requests, ['alice']);

    render({ ...SIGNED_OUT, isIframeLoaded: true });
    render({ isIframeLoaded: true, isLoggedIn: true, username: 'bob', chatAuthToken: '' });
    assert.deepEqual(requests, ['alice', 'bob']);

    act(() => root.unmount());
  });

  it('requests once the iframe loads for a user signed in before it', () => {
    const alice = { isIframeLoaded: false, isLoggedIn: true, username: 'alice', chatAuthToken: '' };
    render(alice);
    assert.deepEqual(requests, []);

    render({ ...alice, isIframeLoaded: true });
    render({ ...alice, isIframeLoaded: true });
    assert.deepEqual(requests, ['alice']);

    act(() => root.unmount());
  });

  it('requests for the new account on an account switch without signing out', () => {
    const alice = { isIframeLoaded: true, isLoggedIn: true, username: 'alice', chatAuthToken: 'token-a' };
    render(alice);
    render({ ...alice, username: 'bob', chatAuthToken: '' });
    render({ ...alice, username: 'bob', chatAuthToken: '' });
    assert.deepEqual(requests, ['bob']);

    act(() => root.unmount());
  });

  it('does not request for a user who already holds a token', () => {
    render({ isIframeLoaded: true, isLoggedIn: true, username: 'alice', chatAuthToken: 'token-a' });
    assert.deepEqual(requests, []);

    act(() => root.unmount());
  });
});
