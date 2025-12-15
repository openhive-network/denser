module.exports = {
  extends: ['prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'turbo/no-undeclared-env-vars': 'off',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'next/link',
            message:
              'Use { Link } from "@hive/ui" instead for prefetch={false} by default'
          }
        ]
      }
    ]
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
