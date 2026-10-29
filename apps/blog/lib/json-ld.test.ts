import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { serializeJsonLd } = await import('./json-ld.ts');

const HOSTILE = '</script><script>alert(1)</script> & <!-- \u2028\u2029';

describe('serializeJsonLd', () => {
  it('leaves no character that can end the script element or open markup', () => {
    const text = serializeJsonLd({ '@type': 'Article', headline: HOSTILE, keywords: [HOSTILE] });
    assert.doesNotMatch(text, /[<>&\u2028\u2029]/);
    assert.ok(!text.toLowerCase().includes('</script'));
  });

  it('parses back to the same value', () => {
    const node = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: HOSTILE,
      author: { name: 'a&b' }
    };
    assert.deepEqual(JSON.parse(serializeJsonLd(node)), node);
  });

  it('escapes as JSON unicode escapes', () => {
    assert.equal(
      serializeJsonLd({ '@type': 'Thing', name: '<&>' }),
      '{"@type":"Thing","name":"\\u003c\\u0026\\u003e"}'
    );
  });
});
