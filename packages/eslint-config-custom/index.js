module.exports = {
  extends: ['next', 'turbo', 'prettier', 'next/core-web-vitals'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'turbo/no-undeclared-env-vars': 'off'
  }
};
