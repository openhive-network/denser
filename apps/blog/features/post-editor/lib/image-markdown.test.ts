import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { imageMarkdown, hasFailedUploadPlaceholder } = await import('./image-markdown.ts');

const UPLOADED_URL = 'https://images.hive.blog/guest4test1/a.png';

describe('imageMarkdown', () => {
  it('links the uploaded image', () => {
    assert.equal(imageMarkdown('a.png', UPLOADED_URL), `![a.png](${UPLOADED_URL})`);
  });

  it('marks a failed upload with a placeholder', () => {
    assert.equal(imageMarkdown('a.png', ''), '![a.png](UPLOAD FAILED)');
  });
});

describe('hasFailedUploadPlaceholder', () => {
  it('detects the placeholder written for a failed upload', () => {
    assert.equal(hasFailedUploadPlaceholder(`Reply ${imageMarkdown('ChatGPT Image.png', '')} more`), true);
  });

  it('accepts bodies with uploaded images only', () => {
    assert.equal(hasFailedUploadPlaceholder(`Reply ${imageMarkdown('a.png', UPLOADED_URL)}`), false);
  });

  it('does not flag the words in plain text', () => {
    assert.equal(hasFailedUploadPlaceholder('My UPLOAD FAILED yesterday'), false);
  });
});
