const fs = require('fs');
const path = require('path');
const { cryptoPolyfill } = require('./crypto-polyfill');

/**
 * Patch @hiveio/hb-auth worker.js to add crypto.randomUUID polyfill
 * This is needed because some browsers/environments don't support crypto.randomUUID
 */
function patchHbAuthWorker(sourceFile, targetFile) {
  // Read the original worker file
  const workerContent = fs.readFileSync(sourceFile, 'utf8');

  // Prepend polyfill
  const patchedContent = cryptoPolyfill + workerContent;

  // Ensure target directory exists
  const targetDir = path.dirname(targetFile);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write patched file
  fs.writeFileSync(targetFile, patchedContent, 'utf8');

  console.log(`✓ Patched HB-Auth worker: ${targetFile}`);
}

module.exports = { patchHbAuthWorker };

// Run directly if called as a script
if (require.main === module) {
  const sourceFile = path.join(__dirname, '../node_modules/@hiveio/hb-auth/dist/worker.js');
  const targetFile = path.join(__dirname, '../apps/blog/public/auth/worker.js');

  if (!fs.existsSync(sourceFile)) {
    console.error('Error: @hiveio/hb-auth worker.js not found. Run pnpm install first.');
    process.exit(1);
  }

  patchHbAuthWorker(sourceFile, targetFile);

  // Also patch wallet app
  const walletTargetFile = path.join(__dirname, '../apps/wallet/public/auth/worker.js');
  patchHbAuthWorker(sourceFile, walletTargetFile);
}
