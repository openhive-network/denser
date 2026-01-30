import hiveConfig from '@hive/eslint-config-custom';

const config = [
  ...hiveConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json'
      }
    }
  }
];

export default config;
