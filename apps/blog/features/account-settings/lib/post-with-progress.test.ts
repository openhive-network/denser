import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ImageUploadError, postImageWithProgress } from './post-with-progress.ts';

type Listener = (event?: { lengthComputable: boolean; loaded: number; total: number }) => void;

/** Records the request and lets a test play the browser's events. */
class FakeXhr {
  static last: FakeXhr;
  readonly upload = new FakeTarget();
  private readonly target = new FakeTarget();
  method = '';
  url = '';
  sentBody: unknown;
  status = 0;
  responseText = '';

  constructor() {
    FakeXhr.last = this;
  }
  addEventListener(type: string, listener: Listener) {
    this.target.addEventListener(type, listener);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  send(body: unknown) {
    this.sentBody = body;
  }
  respond(status: number, responseText: string) {
    this.status = status;
    this.responseText = responseText;
    this.target.fire('load');
  }
  fire(type: string) {
    this.target.fire(type);
  }
}

class FakeTarget {
  private readonly listeners = new Map<string, Listener[]>();
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string, event?: Parameters<Listener>[0]) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

const UPLOAD_URL = 'https://images.example/alice/sig';

describe('postImageWithProgress', () => {
  before(() => Object.assign(globalThis, { XMLHttpRequest: FakeXhr }));
  after(() => Reflect.deleteProperty(globalThis, 'XMLHttpRequest'));

  it('POSTs the body, reports the percentage sent and resolves to the reply URL', async () => {
    const body = new FormData();
    const progress: number[] = [];
    const result = postImageWithProgress(UPLOAD_URL, body, (percent) => progress.push(percent));
    const xhr = FakeXhr.last;

    xhr.upload.fire('progress', { lengthComputable: true, loaded: 0, total: 2_200_000 });
    xhr.upload.fire('progress', { lengthComputable: false, loaded: 500, total: 0 });
    xhr.upload.fire('progress', { lengthComputable: true, loaded: 924_000, total: 2_200_000 });
    xhr.upload.fire('progress', { lengthComputable: true, loaded: 2_200_000, total: 2_200_000 });
    xhr.respond(200, JSON.stringify({ url: 'https://images.example/p/Qm1' }));

    assert.equal(await result, 'https://images.example/p/Qm1');
    assert.equal(xhr.method, 'POST');
    assert.equal(xhr.url, UPLOAD_URL);
    assert.equal(xhr.sentBody, body);
    assert.deepEqual(progress, [0, 42, 100]);
  });

  it('rejects an error status with the imagehoster error', async () => {
    const result = postImageWithProgress(UPLOAD_URL, new FormData(), () => {});
    FakeXhr.last.respond(400, JSON.stringify({ error: { name: 'invalid_signature' } }));

    await assert.rejects(result, (error: unknown) => {
      assert.ok(error instanceof ImageUploadError);
      assert.match(error.message, /400 \{"name":"invalid_signature"\}/);
      return true;
    });
  });

  it('rejects a reply without an image URL', async () => {
    const result = postImageWithProgress(UPLOAD_URL, new FormData(), () => {});
    FakeXhr.last.respond(200, '<html>gateway</html>');

    await assert.rejects(result, ImageUploadError);
  });

  it('rejects a network failure', async () => {
    const result = postImageWithProgress(UPLOAD_URL, new FormData(), () => {});
    FakeXhr.last.fire('error');

    await assert.rejects(result, /network error/);
  });
});
