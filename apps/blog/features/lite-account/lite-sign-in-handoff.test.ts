import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the `@ui/*` alias nor the repo's extensionless relative imports, and the
// pino logger does not load under type stripping: point them at the sources, and a silent logger.
const UI_LIB = new URL('../../../../packages/ui/lib/', import.meta.url);
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    if (specifier === './storage-with-ttl') return nextResolve(new URL('storage-with-ttl.ts', UI_LIB).href, context);
    if (specifier.startsWith('@ui/lib/')) return nextResolve(new URL(`${specifier.slice('@ui/lib/'.length)}.ts`, UI_LIB).href, context);
    return nextResolve(specifier, context);
  }
});

class MemoryStorage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
}

class FakeStorageEvent extends Event {
  readonly key: string | null;
  constructor(type: string, init: { key?: string | null }) {
    super(type);
    this.key = init.key ?? null;
  }
}

const storage = new MemoryStorage();
const fakeWindow = Object.assign(new EventTarget(), { localStorage: storage });
Object.assign(globalThis, { window: fakeWindow, localStorage: storage, StorageEvent: FakeStorageEvent });

const { adoptLiteReplyDraft, adoptLiteRootDraft, liteReplyDraftKey, markLiteReplySignIn, takeLiteReplySignIn, LITE_POST_DRAFT_KEY } =
  await import('./lite-sign-in-handoff.ts');
const { getStorageItem, setStorageItem, StorageTTL } = await import('../../../../packages/ui/lib/storage-with-ttl.ts');

const PARENT = { author: 'did:lite:warm-zebra-201', permlink: 're-lite-test-478380rd5v' };
const LITE_KEY = liteReplyDraftKey(PARENT.author, PARENT.permlink);
const OWN_KEY = `replyTo-/${PARENT.author}/${PARENT.permlink}-gtg`;
const POST_KEY = 'postData-new-gtg';

const changed: string[] = [];
fakeWindow.addEventListener('storage', (event) => {
  if (event instanceof FakeStorageEvent && event.key) changed.push(event.key);
});

describe('reply draft hand-off', () => {
  beforeEach(() => {
    storage.clear();
    changed.length = 0;
  });

  it('adopts the lite draft into an empty own draft and removes the lite one', () => {
    setStorageItem(LITE_KEY, 'typed as a guest', StorageTTL.DRAFT);

    assert.equal(adoptLiteReplyDraft(PARENT.author, PARENT.permlink, OWN_KEY), 'typed as a guest');
    assert.equal(getStorageItem<string>(OWN_KEY), 'typed as a guest');
    assert.equal(storage.getItem(LITE_KEY), null);
    // The open reply box reads its draft through the same-tab storage event.
    assert.deepEqual(changed, [OWN_KEY, LITE_KEY]);
  });

  it('keeps an own draft and leaves the lite draft untouched', () => {
    setStorageItem(LITE_KEY, 'typed as a guest', StorageTTL.DRAFT);
    setStorageItem(OWN_KEY, 'my own draft', StorageTTL.DRAFT);

    assert.equal(adoptLiteReplyDraft(PARENT.author, PARENT.permlink, OWN_KEY), null);
    assert.equal(getStorageItem<string>(OWN_KEY), 'my own draft');
    assert.equal(getStorageItem<string>(LITE_KEY), 'typed as a guest');
  });

  it('adopts nothing for another parent or an empty lite draft', () => {
    setStorageItem(liteReplyDraftKey('someone', 'else'), 'other reply', StorageTTL.DRAFT);
    assert.equal(adoptLiteReplyDraft(PARENT.author, PARENT.permlink, OWN_KEY), null);

    setStorageItem(LITE_KEY, '', StorageTTL.DRAFT);
    assert.equal(adoptLiteReplyDraft(PARENT.author, PARENT.permlink, OWN_KEY), null);
    assert.equal(storage.getItem(OWN_KEY), null);
  });

  it('reopens the reply once, only for the parent the guest left to sign in', () => {
    markLiteReplySignIn(PARENT.author, PARENT.permlink);

    assert.equal(takeLiteReplySignIn('someone', PARENT.permlink), false);
    assert.equal(takeLiteReplySignIn(PARENT.author, PARENT.permlink), true);
    assert.equal(takeLiteReplySignIn(PARENT.author, PARENT.permlink), false);
  });
});

describe('root post draft hand-off', () => {
  const LITE_DRAFT = { title: 'Guest title', body: 'guest body', tags: 'hive lite', category: 'hive-123' };

  beforeEach(() => storage.clear());

  it('adopts title, body, tags and category into an empty editor draft and removes the lite one', () => {
    setStorageItem(LITE_POST_DRAFT_KEY, LITE_DRAFT, StorageTTL.DRAFT);
    setStorageItem(POST_KEY, { title: '', postArea: '', tags: '', payoutType: '50%' }, StorageTTL.DRAFT);

    assert.equal(adoptLiteRootDraft(POST_KEY), true);
    assert.deepEqual(getStorageItem(POST_KEY), {
      title: 'Guest title',
      postArea: 'guest body',
      tags: 'hive lite',
      category: 'hive-123',
      payoutType: '50%'
    });
    assert.equal(storage.getItem(LITE_POST_DRAFT_KEY), null);
  });

  it('keeps an editor draft with content and leaves the lite draft untouched', () => {
    setStorageItem(LITE_POST_DRAFT_KEY, LITE_DRAFT, StorageTTL.DRAFT);
    setStorageItem(POST_KEY, { title: '', postArea: 'my body', tags: '' }, StorageTTL.DRAFT);

    assert.equal(adoptLiteRootDraft(POST_KEY), false);
    assert.deepEqual(getStorageItem(POST_KEY), { title: '', postArea: 'my body', tags: '' });
    assert.deepEqual(getStorageItem(LITE_POST_DRAFT_KEY), LITE_DRAFT);
  });

  it('adopts nothing from an empty lite draft', () => {
    setStorageItem(LITE_POST_DRAFT_KEY, { title: '', body: '', tags: '', category: 'blog' }, StorageTTL.DRAFT);

    assert.equal(adoptLiteRootDraft(POST_KEY), false);
    assert.equal(storage.getItem(POST_KEY), null);
  });
});
