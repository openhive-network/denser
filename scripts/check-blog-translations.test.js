const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getLeaves } = require('./translation-validator');
const { compareLocale } = require('./check-blog-translations');

const reference = getLeaves({
  navigation: { main_nav_bar: { create_post: 'Create Post' }, sidebar: { faq: 'FAQ' } },
  submit_page: { preview_placeholder: 'Start typing to see a preview of your post' },
  communities: { mod: 'Moderator' }
});

test('a label left in English is reported in Polish, a reviewed locale', () => {
  const pl = getLeaves({
    navigation: { main_nav_bar: { create_post: 'Create Post' }, sidebar: { faq: 'FAQ' } },
    submit_page: { preview_placeholder: 'Zacznij pisać, aby zobaczyć podgląd posta' },
    communities: { mod: 'Moderator' }
  });
  assert.deepEqual(compareLocale(reference, pl, 'pl'), {
    missing: [],
    extra: [],
    placeholders: [],
    untranslated: ['navigation.main_nav_bar.create_post']
  });
});

test('elsewhere only missing keys and English sentences are reported', () => {
  const es = getLeaves({
    navigation: { main_nav_bar: { create_post: 'Create Post' }, sidebar: { faq: 'FAQ' } },
    submit_page: { preview_placeholder: 'Start typing to see a preview of your post' }
  });
  const { missing, untranslated } = compareLocale(reference, es, 'es');
  assert.deepEqual({ missing, untranslated }, {
    missing: ['communities.mod'],
    untranslated: ['submit_page.preview_placeholder']
  });
});
