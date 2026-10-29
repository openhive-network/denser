import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';

const { createMentionSource, MENTION_MAX_OPTIONS } = await import('./mention-completion.ts');

/** A completion query with the cursor at the end of `doc`; `aborted` as the editor would set it. */
function contextAt(doc: string, aborted = false) {
  const context = new CompletionContext(EditorState.create({ doc }), doc.length, false);
  if (aborted) Object.defineProperty(context, 'aborted', { get: () => true });
  return context;
}

function setup(answer: string[]) {
  const asked: { prefix: string; limit: number }[] = [];
  const source = createMentionSource({
    lookup: async (prefix, limit) => {
      asked.push({ prefix, limit });
      return answer;
    },
    detail: 'lite account',
    debounceMs: 5
  });
  return { source, asked };
}

describe('createMentionSource', () => {
  it('offers the lite names after @ and two characters, inserting the DID over the typed @…', async () => {
    const { source, asked } = setup(['did:lite:alice', 'did:lite:alpine-7']);
    const result = await source(contextAt('Thanks @Al'));

    assert.deepEqual(asked, [{ prefix: 'al', limit: MENTION_MAX_OPTIONS }]);
    assert.equal(result?.from, 'Thanks '.length);
    assert.deepEqual(
      result?.options.map(({ label, apply }) => ({ label, apply })),
      [
        { label: 'alice', apply: '@did:lite:alice' },
        { label: 'alpine-7', apply: '@did:lite:alpine-7' }
      ]
    );
  });

  it('asks nothing before two characters, inside a word or an e-mail address', async () => {
    const { source, asked } = setup(['did:lite:alice']);
    for (const doc of ['@', '@a', 'mail me at bob@alice', 'path/@al']) {
      assert.equal(await source(contextAt(doc)), null, doc);
    }
    assert.deepEqual(asked, []);
  });

  it('takes a prefix typed as a DID, and asks with the bare name', async () => {
    const { source, asked } = setup(['did:lite:alice']);
    const result = await source(contextAt('@did:lite:al'));
    assert.deepEqual(asked, [{ prefix: 'al', limit: MENTION_MAX_OPTIONS }]);
    assert.equal(result?.from, 0);
  });

  it('asks nothing once the editor aborted the query during the pause', async () => {
    const { source, asked } = setup(['did:lite:alice']);
    assert.equal(await source(contextAt('@alic', true)), null);
    assert.deepEqual(asked, []);
  });

  it('offers at most ten names, and nothing for an empty answer', async () => {
    const many = Array.from({ length: 12 }, (_, i) => `did:lite:al-${String(i).padStart(2, '0')}x`);
    assert.equal((await setup(many).source(contextAt('@al')))?.options.length, MENTION_MAX_OPTIONS);
    assert.equal(await setup([]).source(contextAt('@al')), null);
  });
});
