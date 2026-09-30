// Linted with type information so un-awaited Playwright calls and assertions
// (`expect(locator).toBeVisible()` without `await`) fail the static checks.
module.exports = {
  root: true,
  extends: ['@hive/eslint-config-custom'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    // Playwright fixtures call their `use` argument, which this rule mistakes for a React hook.
    'react-hooks/rules-of-hooks': 'warn'
  }
};
