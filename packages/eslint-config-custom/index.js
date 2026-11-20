const UNTRANSLATED_NAMES = require('./untranslated-names');
// esquery regexes cannot contain "/", so the patterns below use character classes instead.
const NAMES_ONLY = `/^[^A-Za-z]*((${UNTRANSLATED_NAMES.join('|').replace(/\./g, '[.]')})[^A-Za-z]*)*$/i`;
// A bare URL is an address, not text.
const TEXT = `[value=/[A-Za-z]/]:not([value=${NAMES_ONLY}]):not([value=/^\\s*https?:[^\\s]*\\s*$/])`;
// A dotted translation key handed on to a later t(), e.g. label: 'account_keys.this_session'.
const STRING_TEXT = `Literal${TEXT}:not([value=/^[A-Za-z0-9_]+([.][A-Za-z0-9_-]+)+$/])`;
// A template part is text when a word stands beside a space; key fragments like `login_form.title_${type}` have none.
const TEMPLATE_TEXT = `TemplateLiteral[expressions.length>0] > TemplateElement[value.raw=/[A-Za-z][^\\s]*\\s|\\s[^\\s]*[A-Za-z]/]:not([value.raw=${NAMES_ONLY}])`;
const TRANSLATE_MESSAGE = 'Translate user-facing text with t() instead of a string literal.';

/** Selectors for the text an expression in `context` renders: a string, either branch of a ?: or ||, a template. */
const textIn = (context) =>
  [
    `${context} > ${STRING_TEXT}`,
    `${context} > :matches(ConditionalExpression, LogicalExpression) > ${STRING_TEXT}`,
    `${context} > ${TEMPLATE_TEXT}`,
    `${context} > TemplateLiteral[expressions.length=0] > TemplateElement${TEXT.replace(/value/g, 'value.raw')}`
  ].map((selector) => ({ selector, message: TRANSLATE_MESSAGE }));

const TRANSLATED_ATTRIBUTE = 'JSXAttribute[name.name=/^(aria-label|placeholder|title|alt)$/]';

const JSX_TEXT_SELECTORS = [
  { selector: `${TRANSLATED_ATTRIBUTE} > Literal${TEXT}`, message: TRANSLATE_MESSAGE },
  ...textIn(`${TRANSLATED_ATTRIBUTE} > JSXExpressionContainer`),
  { selector: `JSXText${TEXT}`, message: TRANSLATE_MESSAGE },
  ...textIn(':matches(JSXElement, JSXFragment) > JSXExpressionContainer')
];

const TRANSLATION_SELECTORS = [
  ...JSX_TEXT_SELECTORS,
  // An object's title, description or label: a toast and its builders' results, a select option, page metadata.
  ...textIn('Property[key.name=/^(title|description|label)$/]'),
  ...textIn('CallExpression[callee.name=/^(toast|handleError)$/] Property[key.name="message"]'),
  // A default label of a shared component (closeLabel = 'Close'): take the translated text as a prop instead.
  ...textIn('AssignmentPattern[left.name=/^(label|text|title)$|(Label|Text|Title)$/]')
];

// Display formatting goes through @ui/lib/locale-format, which formats in the active locale.
const FORMAT_MESSAGE =
  'Format numbers, amounts and dates for display with @ui/lib/locale-format (formatNumber, formatAmount, formatDate, …) and the active locale.';
const TO_FIXED = 'CallExpression[callee.property.name="toFixed"]';
const RENDERED_CHILD = ':matches(JSXElement, JSXFragment) > JSXExpressionContainer';
// A t() call, also as i18n.t().
const TRANSLATE_CALL = ':matches(CallExpression[callee.name="t"], CallExpression[callee.property.name="t"])';
const SENTENCE_MESSAGE =
  'Do not join translated fragments into a sentence: put the whole sentence in one key with {{placeholders}}, use <Trans>, or formatList() from @ui/lib/locale-format.';

const FORMAT_SELECTORS = [
  // toFixed() whose digits are shown: rendered, put in a template or a concatenation, or handed to t().
  `${RENDERED_CHILD} > ${TO_FIXED}`,
  `${RENDERED_CHILD} > :matches(ConditionalExpression, LogicalExpression) > ${TO_FIXED}`,
  `TemplateLiteral > ${TO_FIXED}`,
  `BinaryExpression[operator="+"] > ${TO_FIXED}`,
  `${TRANSLATE_CALL} > ObjectExpression > Property > ${TO_FIXED}`,
  // The runtime's default locale, or whichever the caller happened to pass.
  'CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]',
  'NewExpression[callee.object.name="Intl"][callee.property.name=/Format$/]'
].map((selector) => ({ selector, message: FORMAT_MESSAGE }));

const SENTENCE_SELECTORS = [
  `BinaryExpression[operator="+"] > ${TRANSLATE_CALL}`,
  // A template that holds more than the translation, or words of its own; a title's site name affix
  // (`${t('page_titles.market')} - Hive`) is neither.
  `TemplateLiteral:matches([expressions.length>1], :has(> TemplateElement${TEXT.replace(/value/g, 'value.raw')})) > ${TRANSLATE_CALL}`,
  `CallExpression[callee.property.name="join"] > MemberExpression.callee > ArrayExpression.object > ${TRANSLATE_CALL}`
].map((selector) => ({ selector, message: SENTENCE_MESSAGE }));

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
    // Prevent raw localStorage usage - use storage-with-ttl utilities instead
    // Use setStorageItem/getStorageItem from @ui/lib/storage-with-ttl
    // or useStorageWithTTL hook for automatic TTL management
    'no-restricted-globals': [
      'warn',
      {
        name: 'localStorage',
        message:
          'Avoid direct localStorage usage. Use setStorageItem/getStorageItem from @ui/lib/storage-with-ttl or useStorageWithTTL hook for automatic TTL management.'
      }
    ],
    // Also catch window.localStorage
    'no-restricted-properties': [
      'warn',
      {
        object: 'window',
        property: 'localStorage',
        message:
          'Avoid direct localStorage usage. Use setStorageItem/getStorageItem from @ui/lib/storage-with-ttl or useStorageWithTTL hook for automatic TTL management.'
      }
    ],
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
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // User-facing text must come from t() so every locale can translate it
    'no-restricted-syntax': ['error', ...TRANSLATION_SELECTORS, ...FORMAT_SELECTORS, ...SENTENCE_SELECTORS]
  },
  overrides: [
    {
      // Test data (post titles, option labels) is not shown to users.
      files: ['*.test.ts', '*.test.tsx', '*.test.js'],
      rules: {
        'no-restricted-syntax': ['error', ...JSX_TEXT_SELECTORS]
      }
    },
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
