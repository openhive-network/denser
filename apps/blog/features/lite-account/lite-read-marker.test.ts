import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { liteReadMarkerDate, showsLiteReadMarker } = await import('./lite-read-marker.ts');

const row = (date: string) => ({ id: date, msg: '@did:lite:bob followed you', url: '@did:lite:bob', date, type: 'follow', score: 15 });

describe('liteReadMarkerDate', () => {
  it('takes the newest row date, whatever the order of the rows', () => {
    const rows = [row('2026-10-16T19:46:51'), row('2026-10-16T19:54:15'), row('2026-10-16T00:39:03')];
    assert.equal(liteReadMarkerDate(rows), '2026-10-16T19:54:15');
  });

  it('without rows, takes the browser time a minute back, as naive UTC', () => {
    assert.equal(liteReadMarkerDate([], Date.parse('2026-10-26T12:00:30Z')), '2026-10-26T11:59:30');
    assert.equal(liteReadMarkerDate(null, Date.parse('2026-10-26T12:00:30Z')), '2026-10-26T11:59:30');
  });
});

describe('showsLiteReadMarker', () => {
  it("compares the node's space-separated lastread with the T-separated marker", () => {
    assert.equal(showsLiteReadMarker({ lastread: '2026-10-16 19:54:15', unread: 0 }, '2026-10-16T19:54:15'), true);
    assert.equal(showsLiteReadMarker({ lastread: '2026-10-19 22:56:51', unread: 0 }, '2026-10-16T19:54:15'), true);
  });

  it('is false while the node still has the earlier marker', () => {
    assert.equal(showsLiteReadMarker({ lastread: '2026-10-16 19:54:14', unread: 2 }, '2026-10-16T19:54:15'), false);
    assert.equal(showsLiteReadMarker({ lastread: '', unread: 2 }, '2026-10-16T19:54:15'), false);
  });
});
