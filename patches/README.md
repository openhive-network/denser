# pnpm patches

## `@hiveio__workerbee.patch`

Backports WorkerBee's block catch-up fix (upstream workerbee commit 5eab2cad, on
workerbee's `develop` only). In the published bundle, `BlockCollector.get`
destructures `const { blocks } = await get_block_range(...)`, which shadows the
outer list: `blocks.push(...blocks)` pushes the fetched blocks into themselves, the
head stops advancing, and once one poll is late every observed broadcast times out
("listener has expired"). The patch renames the destructured name to
`fetchedBlocks` and adds the `/*denser:workerbee-5eab2cad*/` marker.

WorkerBee's version comes from common-ci-configuration's `hiveio-toolset`
catalog, which CI merges from ccc's develop tip before every install, and
WorkerBee publishes daily. So `package.json` patches it **by name only**
(`"@hiveio/workerbee"`, no version): a ccc pin bump re-targets the patch instead
of failing the install with `ERR_PNPM_UNUSED_PATCH`. pnpm only warns ("Could not
apply patch") when a name-only patch no longer fits a build, so
`scripts/check-workerbee-patch.js` runs after the install (CI's `.node-job`,
`.aidev/pnpm-deps.sh`) and reads the installed bundle:

- marker present: the patch applied, the fix is in effect;
- `fetchedBlocks` without the marker: the build contains upstream's fix; the
  install passes and the check says to remove the patch;
- `blocks.push(...blocks)`, or none of these: the bug may be back and the patch
  did not apply; the check fails and says how to re-target it.

### Removing it

Once a stable WorkerBee build containing 5eab2cad is the catalog's version (the
check then logs "contains upstream's block catch-up fix"): delete this patch, its
`pnpm.patchedDependencies` entry in `package.json`, `scripts/check-workerbee-patch.js`
with its test and its calls in `.gitlab-ci.yml`, `.aidev/pnpm-deps.sh` and
`.aidev/run-unit-tests.sh`, then refresh `pnpm-lock.yaml`.

### Checking a ccc pin bump locally

In a scratch copy of the repository (with the `npm-common-config` submodule),
change `"@hiveio/workerbee"` in `npm-common-config/pnpm-config/pnpm-workspace.yaml`
to another published build, then run the body of ccc's
`.pnpm_install_with_catalog_fallback` (`npm-common-config/templates/npm_projects.gitlab-ci.yml`)
with `CCC_SUBMODULE_DIR=npm-common-config CI_PROJECT_DIR=$PWD`, followed by
`node scripts/check-workerbee-patch.js`. The install takes the
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` fallback and the check reports the new
version as patched.
