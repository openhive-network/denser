import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { openSignerPopup, SignerError, signerErrorKey, SIGNER_ROLES } = await import('./signer-client.ts');

const ORIGIN = 'https://signer.syncad.com';
const ROOT_KEY = 'STM6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4';
const KEYS = [{ path: "m/48'/13'/0'/0'/0'", role: 0, account: 0, key: 0, publicKey: ROOT_KEY }];

type Sent = { message: unknown; targetOrigin: string };

/**
 * A signer popup driven by the test: it records what the opener posts, and `answer` delivers a
 * message from it as the opener's window would see it.
 */
function fakeSigner() {
  const host = new EventTarget();
  const sent: Sent[] = [];
  const popup = {
    closed: false,
    close() {
      this.closed = true;
    },
    postMessage(message: unknown, targetOrigin: string) {
      sent.push({ message, targetOrigin });
    }
  };
  const opened: string[] = [];
  const signerHost = {
    open: (url: string) => (opened.push(url), popup),
    addEventListener: (type: 'message', listener: (event: MessageEvent) => void) =>
      host.addEventListener(type, listener as EventListener),
    removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) =>
      host.removeEventListener(type, listener as EventListener)
  };
  const answer = (data: unknown, origin = ORIGIN, source: unknown = popup) =>
    host.dispatchEvent(Object.assign(new Event('message'), { data, origin, source }));
  return { signerHost, popup, sent, opened, answer };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const lastRequestId = (sent: Sent[]) => (sent.at(-1)?.message as { id: string }).id;

describe('openSignerPopup', () => {
  it('opens the sign page, sends the request once ready, and resolves with the result', async () => {
    const signer = fakeSigner();
    const popup = openSignerPopup(ORIGIN, signer.signerHost);
    const keys = popup.call('getPublicKeys', { roles: [SIGNER_ROLES.owner], account: 0 });
    await tick();
    assert.equal(signer.sent.length, 0, 'nothing is sent before the page is ready');

    signer.answer({ hiveSignerReady: true, hiveSigner: '1' });
    await tick();
    assert.deepEqual(signer.opened, [`${ORIGIN}/sign/`]);
    assert.equal(signer.sent.length, 1);
    const { message, targetOrigin } = signer.sent[0];
    assert.equal(targetOrigin, ORIGIN);
    assert.deepEqual(
      { ...(message as object), id: 'x' },
      { hiveSigner: '1', id: 'x', method: 'getPublicKeys', params: { roles: [0], account: 0 } }
    );

    signer.answer({ hiveSigner: '1', id: 'another-request', result: { keys: [] } });
    signer.answer(
      { hiveSigner: '1', id: lastRequestId(signer.sent), result: { keys: KEYS } },
      'https://evil.example'
    );
    signer.answer({ hiveSigner: '1', id: lastRequestId(signer.sent), result: { keys: KEYS } });
    assert.deepEqual(await keys, { keys: KEYS });
  });

  it('rejects with the signer error code of an error reply', async () => {
    const signer = fakeSigner();
    const popup = openSignerPopup(ORIGIN, signer.signerHost);
    signer.answer({ hiveSignerReady: true, hiveSigner: '1' });
    const signed = popup.call('signDigest', { sigDigest: 'a'.repeat(64), publicKey: ROOT_KEY });
    await tick();
    signer.answer({
      hiveSigner: '1',
      id: lastRequestId(signer.sent),
      error: { code: 'owner_blind_signing', message: 'no' }
    });
    await assert.rejects(
      signed,
      (error: unknown) => error instanceof SignerError && error.code === 'owner_blind_signing'
    );
  });

  it('rejects a result of the wrong shape', async () => {
    const signer = fakeSigner();
    const popup = openSignerPopup(ORIGIN, signer.signerHost);
    signer.answer({ hiveSignerReady: true, hiveSigner: '1' });
    const keys = popup.call('getPublicKeys', { roles: [0] });
    await tick();
    signer.answer({ hiveSigner: '1', id: lastRequestId(signer.sent), result: { keys: [{ publicKey: 7 }] } });
    await assert.rejects(keys, (error: unknown) => error instanceof SignerError && error.code === 'internal');
  });

  it('is cancelled when the user closes the popup', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
    const signer = fakeSigner();
    const popup = openSignerPopup(ORIGIN, signer.signerHost);
    const keys = popup.call('getPublicKeys', { roles: [0] });
    signer.popup.closed = true;
    t.mock.timers.tick(600);
    await assert.rejects(
      keys,
      (error: unknown) => error instanceof SignerError && error.code === 'cancelled'
    );
  });

  it('says popup_blocked when the browser refuses to open it', () => {
    const signer = fakeSigner();
    assert.throws(
      () => openSignerPopup(ORIGIN, { ...signer.signerHost, open: () => null }),
      (error: unknown) => error instanceof SignerError && error.code === 'popup_blocked'
    );
  });
});

describe('signerErrorKey', () => {
  it('is silent for cancelled and names every other cause', () => {
    assert.equal(signerErrorKey(new SignerError('cancelled', '')), null);
    assert.equal(signerErrorKey(new SignerError('owner_blind_signing', '')), 'owner_blind_signing');
    assert.equal(signerErrorKey(new SignerError('key_not_found', '')), 'key_not_found');
    assert.equal(signerErrorKey(new SignerError('something_new', '')), 'internal');
    assert.equal(signerErrorKey(new Error('boom')), 'internal');
  });
});
