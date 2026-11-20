import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { SERVICE_UNAVAILABLE_ENGLISH } = await import('./service-unavailable-english.ts');

const english = JSON.parse(readFileSync(new URL('../locales/en/common_blog.json', import.meta.url), 'utf8'));
const lookup = (key: string): unknown => key.split('.').reduce((node, part) => node?.[part], english);

describe('SERVICE_UNAVAILABLE_ENGLISH', () => {
  it('is the English locale text of each key the 503 page shows', () => {
    for (const [key, text] of Object.entries(SERVICE_UNAVAILABLE_ENGLISH)) {
      assert.equal(text, lookup(key), key);
    }
  });
});
