// `@hiveio/healthchecker-component` exports `./engine` to `import` only, and ts-node runs the tests
// as CommonJS, whose `require` matches no condition there. Resolving it as an import finds the ES
// module build, which `require` loads (require(esm)).
const { registerHooks } = require('node:module');

const IMPORT_ONLY = new Set(['@hiveio/healthchecker-component/engine']);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!IMPORT_ONLY.has(specifier) || context.conditions.includes('import')) {
      return nextResolve(specifier, context);
    }
    return nextResolve(specifier, { ...context, conditions: [...context.conditions, 'import'] });
  }
});
