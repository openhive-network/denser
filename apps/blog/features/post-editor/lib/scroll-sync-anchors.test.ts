import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { alignBlockKinds } = await import('./scroll-sync-anchors.ts');

describe('alignBlockKinds', () => {
  it('pairs blocks one to one when both sides have the same structure', () => {
    const kinds = ['heading', 'paragraph', 'image', 'paragraph', 'image', 'paragraph'] as const;
    assert.deepEqual(alignBlockKinds([...kinds], [...kinds]), [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5]
    ]);
  });

  it('skips a preview block with no editor counterpart instead of shifting later pairs', () => {
    assert.deepEqual(alignBlockKinds(['heading', 'paragraph', 'list'], ['heading', 'hr', 'paragraph', 'list']), [
      [0, 0],
      [1, 2],
      [2, 3]
    ]);
  });

  it('skips an editor block the preview did not render', () => {
    assert.deepEqual(alignBlockKinds(['paragraph', 'table', 'heading', 'paragraph'], ['paragraph', 'heading', 'paragraph']), [
      [0, 0],
      [2, 1],
      [3, 2]
    ]);
  });

  it('pairs a linked image written as paragraph text with its image-only preview block', () => {
    assert.deepEqual(alignBlockKinds(['heading', 'paragraph', 'quote'], ['heading', 'image', 'quote']), [
      [0, 0],
      [1, 1],
      [2, 2]
    ]);
  });

  it('prefers exact kinds over loose matches', () => {
    assert.deepEqual(alignBlockKinds(['image'], ['paragraph', 'image']), [[0, 1]]);
  });

  it('lets raw html match any block kind', () => {
    assert.deepEqual(alignBlockKinds(['html', 'paragraph'], ['table', 'paragraph']), [
      [0, 0],
      [1, 1]
    ]);
  });

  it('never pairs incompatible kinds', () => {
    assert.deepEqual(alignBlockKinds(['code'], ['list']), []);
    assert.deepEqual(alignBlockKinds([], ['paragraph']), []);
  });
});
