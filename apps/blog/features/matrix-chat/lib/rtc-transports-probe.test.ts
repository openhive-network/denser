import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withLocalRtcTransportsAnswer } from './rtc-transports-probe.ts';

const RTC_TRANSPORTS = 'https://matrix.example.org/_matrix/client/unstable/org.matrix.msc4143/rtc/transports';

/** A fetch that records what reaches it and answers 200 `{ok: true}` */
function network() {
  const reached: string[] = [];
  const fetchFn: typeof fetch = async (input) => {
    reached.push(input instanceof Request ? input.url : input.toString());
    return Response.json({ ok: true });
  };
  return { fetchFn, reached };
}

describe('withLocalRtcTransportsAnswer', () => {
  it("answers the MatrixRTC transports request with the homeserver's 404 M_UNRECOGNIZED, off the network", async () => {
    const { fetchFn, reached } = network();
    const fetchWithAnswer = withLocalRtcTransportsAnswer(fetchFn);

    for (const input of [RTC_TRANSPORTS, new URL(RTC_TRANSPORTS), new Request(`${RTC_TRANSPORTS}?x=1`)]) {
      const response = await fetchWithAnswer(input, { method: 'GET' });
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { errcode: 'M_UNRECOGNIZED', error: 'Unrecognized request' });
    }
    assert.deepEqual(reached, []);
  });

  it('passes every other request on unchanged, with its options', async () => {
    const seen: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const fetchWithAnswer = withLocalRtcTransportsAnswer(async (input, init) => {
      seen.push([input, init]);
      return Response.json({ next_batch: 's1' });
    });
    const init = { method: 'GET', headers: { Authorization: 'Bearer access' } };
    const sync = 'https://matrix.example.org/_matrix/client/v3/sync?filter=f';
    const elsewhere = `https://matrix.example.org/_matrix/client/v3/rooms/x/messages?from=${encodeURIComponent(
      '/org.matrix.msc4143/rtc/transports'
    )}`;

    assert.deepEqual(await (await fetchWithAnswer(sync, init)).json(), { next_batch: 's1' });
    await fetchWithAnswer(elsewhere);
    assert.deepEqual(seen, [
      [sync, init],
      [elsewhere, undefined]
    ]);
  });
});
