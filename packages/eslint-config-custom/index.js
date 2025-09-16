module.exports = {
  extends: ['eslint-config-next', 'prettier', 'eslint-config-next/core-web-vitals'],
  plugins: ['turbo'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'turbo/no-undeclared-env-vars': 'off'
  }
};
