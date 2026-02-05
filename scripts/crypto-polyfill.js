/**
 * Crypto polyfill for environments that don't support crypto.randomUUID.
 * This is needed for @hiveio/hb-auth worker.js in older browsers/environments.
 *
 * Used by:
 * - apps/blog/next.config.js (webpack transform for worker.js)
 * - apps/wallet/next.config.js (webpack transform for worker.js)
 * - scripts/patch-hb-auth-worker.js (standalone patching script)
 */
const cryptoPolyfill = `// Polyfill for crypto.randomUUID (not available in all environments)
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = function() {
    const getRandomValues = (arr) => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(arr);
      }
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    };
    const bytes = new Uint8Array(16);
    getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  };
}

`;

module.exports = { cryptoPolyfill };
