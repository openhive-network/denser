#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const app = process.argv[2];
const mappings = {
  blog: {
    source: '.env.blog',
    target: path.join('apps', 'blog', '.env.local')
  },
  wallet: {
    source: '.env.wallet',
    target: path.join('apps', 'wallet', '.env.local')
  }
};

if (!app || !mappings[app]) {
  console.error('Usage: node scripts/sync-env-local.js <blog|wallet>');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, mappings[app].source);
const targetPath = path.join(rootDir, mappings[app].target);

if (!fs.existsSync(sourcePath)) {
  console.error(`Source env file does not exist: ${sourcePath}`);
  process.exit(1);
}

fs.copyFileSync(sourcePath, targetPath);
console.log(`Synced ${mappings[app].source} -> ${mappings[app].target}`);
