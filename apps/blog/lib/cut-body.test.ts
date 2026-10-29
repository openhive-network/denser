import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { JsonMetadata } from '@hive/common-hiveio-packages/wax';

const { dropUnfinishedMarkup } = await import('./cut-body.ts');
const { getPostSummary } = await import('./post-summary.ts');

const CUT_LENGTH = 100;
const metadata: JsonMetadata = { image: '', images: [], author: undefined };

/** `opening` cut like HiveSense cuts a search result body. */
const cut = (opening: string) => (opening + 'x'.repeat(CUT_LENGTH)).slice(0, CUT_LENGTH);

describe('dropUnfinishedMarkup', () => {
  it('drops a markdown image or link a cut left inside its brackets or URL', () => {
    const text = 'y'.repeat(60) + '\n\n';
    for (const fragment of [
      '![20191028_185309.jpg](',
      '![2018-01-04 12.42.39.png](https://steemitimages.com/DQmTAzKg',
      '[ Fuente de imagen](https://k46.kn3.net/taringa/D/8',
      '![img_2026',
      '<img src="https://files.peakd.com/file'
    ]) {
      const body = (text + fragment).padStart(CUT_LENGTH, 'z');
      assert.equal(dropUnfinishedMarkup(body, CUT_LENGTH), body.slice(0, -fragment.length), fragment);
    }
  });

  it('keeps complete markup and a body shorter than the cut', () => {
    const image = '![a.png](https://example.com/a.png)';
    const complete = 'y'.repeat(CUT_LENGTH - image.length) + image;
    const short = 'A short post ending in ![img](https://example.com/a.png';

    assert.equal(dropUnfinishedMarkup(complete, CUT_LENGTH), complete);
    assert.equal(dropUnfinishedMarkup(short, CUT_LENGTH), short);
  });

  it('leaves a post cut inside its opening image with no summary, not a markdown fragment', () => {
    const body = cut('![20191028_185309.jpg](https://cdn.steemitimages.com/DQmYhU9TXdXnBJMoFwv9yMC7TftGNrierzmtMcz9Lpu4UhM/20191028_185309.jpg)');

    assert.match(getPostSummary(metadata, body), /!\[20191028_185309\.jpg\]/);
    assert.equal(getPostSummary(metadata, dropUnfinishedMarkup(body, CUT_LENGTH)), '');
  });
});
