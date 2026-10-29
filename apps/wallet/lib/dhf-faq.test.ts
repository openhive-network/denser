import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DHF_FAQ_ANCHOR } from './dhf-faq.ts';

const FAQ_MARKDOWN = readFileSync(new URL('../../blog/lib/markdowns/faq.md', import.meta.url), 'utf8');

describe('DHF FAQ links', () => {
  it('point at an anchor the blog FAQ defines', () => {
    assert.ok(DHF_FAQ_ANCHOR.startsWith('#'));
    assert.ok(FAQ_MARKDOWN.includes(`<span id="${DHF_FAQ_ANCHOR.slice(1)}">`), `faq.md has no ${DHF_FAQ_ANCHOR}`);
  });
});
