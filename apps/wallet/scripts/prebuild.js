#!/usr/bin/env node

/**
 * Prebuild script for wallet app
 * Replaces CopyWebpackPlugin functionality for Next.js 16 Turbopack compatibility
 * Copies static assets required by the application before build
 */

const fs = require('fs');
const path = require('path');

/**
 * Copy file or directory recursively
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 */
function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    // Copy directory contents
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    // Ensure parent directory exists
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    // Copy file
    fs.copyFileSync(src, dest);
  }
}

console.log('Running prebuild script...');

// Define copy patterns (relative to apps/wallet/)
const patterns = [
  {
    from: path.join(__dirname, '../../../node_modules/@hiveio/hb-auth/dist/worker.js'),
    to: path.join(__dirname, '../public/auth/worker.js')
  },
  {
    from: path.join(__dirname, '../../../node_modules/@hiveio/hb-auth/dist/assets'),
    to: path.join(__dirname, '../public/auth/assets')
  },
  {
    from: path.join(__dirname, '../locales'),
    to: path.join(__dirname, '../public/locales/')
  },
  {
    from: path.join(__dirname, '../../../packages/smart-signer/locales'),
    to: path.join(__dirname, '../public/locales/')
  },
  {
    from: path.join(__dirname, '../../../packages/smart-signer/public/smart-signer'),
    to: path.join(__dirname, '../public/smart-signer/')
  }
];

// Execute copy operations
patterns.forEach(({ from, to }) => {
  try {
    if (fs.existsSync(from)) {
      copyRecursive(from, to);
      console.log(`✓ Copied: ${path.relative(process.cwd(), from)} → ${path.relative(process.cwd(), to)}`);
    } else {
      console.warn(`⚠ Source not found (skipping): ${from}`);
    }
  } catch (error) {
    console.error(`✗ Failed to copy ${from} to ${to}:`, error.message);
    process.exit(1);
  }
});

console.log('Prebuild script completed successfully!');
