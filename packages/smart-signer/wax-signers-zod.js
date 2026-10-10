const path = require('path');

/**
 * Import specifier of the zod 4 core that @hiveio/wax-signers-external builds its schemas with.
 * That package resolves its own zod 4 while denser's code resolves `zod` to 3.x, so the apps alias
 * this specifier to wax-signers-external's copy (waxSignersZodCoreAlias) to configure that instance.
 */
const WAX_SIGNERS_ZOD_CORE = 'wax-signers-zod-core';

/**
 * Turbopack resolveAlias entry pointing WAX_SIGNERS_ZOD_CORE at the ESM zod core module that
 * wax-signers-external imports, relative to `projectDir` (the app's directory). Throws when
 * wax-signers-external or its zod cannot be resolved, or zod no longer exports `./v4/core`.
 */
function waxSignersZodCoreAlias(projectDir) {
  const waxSignersDir = path.dirname(
    require.resolve('@hiveio/wax-signers-external/package.json', { paths: [__dirname] })
  );
  const zodPackageJson = require.resolve('zod/package.json', { paths: [waxSignersDir] });
  const coreEntry = require(zodPackageJson).exports['./v4/core'].import;
  const coreModule = path.join(path.dirname(zodPackageJson), coreEntry);
  return { [WAX_SIGNERS_ZOD_CORE]: `./${path.relative(projectDir, coreModule)}` };
}

module.exports = { WAX_SIGNERS_ZOD_CORE, waxSignersZodCoreAlias };
