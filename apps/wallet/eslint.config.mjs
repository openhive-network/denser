import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const config = [
  {
    // playwright/ has its own eslintrc, which the static checks run (as .eslintignore says)
    ignores: ['public/auth/worker.js', '.next/**', 'dist/**', 'build/**', 'playwright/**']
  },
  ...compat.extends('@hive/eslint-config-custom')
];

export default config;
