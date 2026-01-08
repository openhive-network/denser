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
    ],
    // Enforce === instead of == for type-safe comparisons
    eqeqeq: ['warn', 'always', { null: 'ignore' }],
    // Prefer const over let when variable is never reassigned
    'prefer-const': 'warn',
    // Discourage console.log in production code - use logger instead
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // TypeScript strict typing rules - require proper types instead of "any"
        '@typescript-eslint/no-explicit-any': 'warn',
        // Discourage type assertions (as Type) - prefer proper typing
        // Allows 'as const' and assertions in object literals passed as parameters
        '@typescript-eslint/consistent-type-assertions': [
          'warn',
          {
            assertionStyle: 'as',
            objectLiteralTypeAssertions: 'allow-as-parameter'
          }
        ],
        // Discourage @ts-ignore - prefer proper typing or @ts-expect-error with explanation
        '@typescript-eslint/ban-ts-comment': [
          'warn',
          {
            'ts-ignore': 'allow-with-description',
            'ts-nocheck': 'allow-with-description',
            'ts-expect-error': 'allow-with-description',
            minimumDescriptionLength: 10
          }
        ],
        // Discourage non-null assertion operator (!) - prefer proper null checks
        '@typescript-eslint/no-non-null-assertion': 'warn',
        // Detect unused variables (TypeScript version)
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_'
          }
        ],
        // Enforce consistent naming conventions (camelCase for variables/functions)
        '@typescript-eslint/naming-convention': [
          'warn',
          // Default: camelCase for everything
          {
            selector: 'default',
            format: ['camelCase'],
            leadingUnderscore: 'allow'
          },
          // Imports: allow PascalCase (React components) and camelCase
          {
            selector: 'import',
            format: ['camelCase', 'PascalCase']
          },
          // Variables: camelCase or UPPER_CASE (for constants) or PascalCase (React components)
          {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allow'
          },
          // Functions: camelCase or PascalCase (React components)
          {
            selector: 'function',
            format: ['camelCase', 'PascalCase']
          },
          // Parameters: camelCase
          {
            selector: 'parameter',
            format: ['camelCase'],
            leadingUnderscore: 'allow'
          },
          // Properties: camelCase or snake_case (for API responses) or UPPER_CASE
          {
            selector: 'property',
            format: ['camelCase', 'snake_case', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allow'
          },
          // Allow any format for properties that require quotes (HTTP headers, data-*, CSS classes with dashes)
          {
            selector: 'property',
            modifiers: ['requiresQuotes'],
            format: null
          },
          // Object literal properties: allow more formats for flexibility with external APIs
          {
            selector: 'objectLiteralProperty',
            format: null
          },
          // Type properties: allow more formats for external API types (CSP reports, etc.)
          {
            selector: 'typeProperty',
            format: null
          },
          // Types/Interfaces: PascalCase
          {
            selector: 'typeLike',
            format: ['PascalCase']
          },
          // Enum members: PascalCase or UPPER_CASE
          {
            selector: 'enumMember',
            format: ['PascalCase', 'UPPER_CASE']
          }
        ]
      }
    }
  ],
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
