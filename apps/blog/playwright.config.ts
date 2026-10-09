import { defineConfig } from '@playwright/test';
import { e2eConfig } from '../../playwright/shared-config';
require('dotenv').config({ path: './.env.local' });

/* The same default value as in site.ts */
process.env.REACT_APP_API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://api.hive.blog';

const e2e = e2eConfig('http://localhost:3000');

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...e2e,
  expect: {
    ...e2e.expect,
    toHaveScreenshot: {
      animations: 'disabled'
    }
  }
});
