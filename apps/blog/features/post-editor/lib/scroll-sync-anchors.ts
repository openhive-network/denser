/**
 * Kind of a top-level markdown block, as seen from the editor source or the
 * rendered preview. `html` is a wildcard: raw HTML and embeds render to
 * structures that cannot be predicted from either side alone.
 */
export type BlockKind = 'heading' | 'paragraph' | 'image' | 'list' | 'quote' | 'table' | 'code' | 'hr' | 'html';

const EXACT_MATCH = 2;
const LOOSE_MATCH = 1;

// Linked images and bare image URLs are paragraph text in the editor but render
// as image-only paragraphs, so the two kinds may still pair up.
function matchScore(a: BlockKind, b: BlockKind): number {
  if (a === b) return EXACT_MATCH;
  if (a === 'html' || b === 'html') return LOOSE_MATCH;
  if ((a === 'image' && b === 'paragraph') || (a === 'paragraph' && b === 'image')) return LOOSE_MATCH;
  return 0;
}

/**
 * Pairs editor blocks with preview blocks in document order, maximising the
 * summed match score (a weighted longest common subsequence). Blocks without a
 * counterpart, such as a bare link the renderer turns into an embed, are left
 * out rather than shifting every later pair.
 *
 * Returns `[editorIndex, previewIndex]` pairs, increasing in both indices.
 */
export function alignBlockKinds(editorKinds: BlockKind[], previewKinds: BlockKind[]): Array<[number, number]> {
  const rows = editorKinds.length;
  const cols = previewKinds.length;
  const width = cols + 1;
  // best[i * width + j]: highest score aligning editorKinds[i..] with previewKinds[j..]
  const best = new Uint32Array((rows + 1) * width);
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      const score = matchScore(editorKinds[i], previewKinds[j]);
      best[i * width + j] = Math.max(
        score > 0 ? best[(i + 1) * width + j + 1] + score : 0,
        best[(i + 1) * width + j],
        best[i * width + j + 1]
      );
    }
  }

  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    const score = matchScore(editorKinds[i], previewKinds[j]);
    if (score > 0 && best[i * width + j] === best[(i + 1) * width + j + 1] + score) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (best[(i + 1) * width + j] >= best[i * width + j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/** Vertical extent of an element, in its scroll container's coordinates. */
export interface Span {
  top: number;
  bottom: number;
}

/**
 * Scroll anchors for one aligned block, as `[editorOffset, previewOffset]`
 * pairs: the block's top and bottom edges and, when both sides hold the same
 * number of images, each image's edges in document order. A one-line image
 * source renders hundreds of pixels tall, so without its own anchors the
 * interpolation spreads it over the whole block and drifts inside it.
 *
 * Pairs never decrease on either side; one that would, or that repeats the
 * previous pair, is dropped. Equal offsets on one side are kept, as an image
 * at the very top of its block shares the block's preview offset.
 */
export function blockAnchorPairs(
  editorBlock: Span,
  previewBlock: Span,
  editorImages: Span[],
  previewImages: Span[]
): Array<[number, number]> {
  const candidates: Array<[number, number]> = [[editorBlock.top, previewBlock.top]];
  if (editorImages.length === previewImages.length) {
    editorImages.forEach((image, i) => {
      candidates.push([image.top, previewImages[i].top], [image.bottom, previewImages[i].bottom]);
    });
  }
  candidates.push([editorBlock.bottom, previewBlock.bottom]);

  const pairs: Array<[number, number]> = [];
  for (const pair of candidates) {
    const last = pairs[pairs.length - 1];
    if (!last) {
      pairs.push(pair);
      continue;
    }
    const monotonic = pair[0] >= last[0] && pair[1] >= last[1];
    const repeated = pair[0] === last[0] && pair[1] === last[1];
    if (monotonic && !repeated) pairs.push(pair);
  }
  return pairs;
}
