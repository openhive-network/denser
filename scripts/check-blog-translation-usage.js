#!/usr/bin/env node

/**
 * Blog translation usage: runs scripts/translation-usage.js on apps/blog against
 * apps/blog/locales/en.
 *
 * Usage:
 *   node scripts/check-blog-translation-usage.js          # Check for missing keys
 *   node scripts/check-blog-translation-usage.js --unused # Also report unused keys
 */

const path = require('path');
const { validateTranslationUsage } = require('./translation-usage');

const BLOG_DIR = path.join(__dirname, '../apps/blog');

validateTranslationUsage({
  name: 'Blog',
  rootDir: BLOG_DIR,
  sourceDirs: ['app', 'components', 'features', 'lib', 'pages'],
  referenceFiles: [path.join(BLOG_DIR, 'locales/en/common_blog.json')],
  fixHint: 'Add missing keys to apps/blog/locales/en/common_blog.json'
});
