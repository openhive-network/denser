import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { alignBlockKinds, blockAnchorPairs } = await import('./scroll-sync-anchors.ts');

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

describe('blockAnchorPairs', () => {
  it('anchors each image inside a block to its rendered edges', () => {
    // <center>, image line, caption, </center>: a 400px image above a caption
    const pairs = blockAnchorPairs({ top: 100, bottom: 188 }, { top: 500, bottom: 960 }, [{ top: 122, bottom: 144 }], [
      { top: 505, bottom: 905 }
    ]);
    assert.deepEqual(pairs, [
      [100, 500],
      [122, 505],
      [144, 905],
      [188, 960]
    ]);
  });

  it('falls back to the block edges when the image counts differ', () => {
    const pairs = blockAnchorPairs({ top: 100, bottom: 144 }, { top: 500, bottom: 1300 }, [{ top: 100, bottom: 122 }], [
      { top: 500, bottom: 900 },
      { top: 900, bottom: 1300 }
    ]);
    assert.deepEqual(pairs, [
      [100, 500],
      [144, 1300]
    ]);
  });

  it('keeps an image anchor that shares the top edge of its block', () => {
    const pairs = blockAnchorPairs({ top: 100, bottom: 188 }, { top: 500, bottom: 951 }, [{ top: 122, bottom: 144 }], [
      { top: 500, bottom: 912 }
    ]);
    assert.deepEqual(pairs, [
      [100, 500],
      [122, 500],
      [144, 912],
      [188, 951]
    ]);
  });

  it('drops repeated pairs and pairs that would run backwards', () => {
    // a single-line image whose rendered image overflows its block
    const pairs = blockAnchorPairs({ top: 100, bottom: 122 }, { top: 500, bottom: 900 }, [{ top: 100, bottom: 122 }], [
      { top: 500, bottom: 912 }
    ]);
    assert.deepEqual(pairs, [
      [100, 500],
      [122, 912]
    ]);
  });
});
