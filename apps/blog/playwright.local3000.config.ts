import { defineConfig } from '@playwright/test';
import { localE2eOverrides } from '../../playwright/shared-config';
import e2e from './playwright.config';

export default defineConfig({ ...e2e, ...localE2eOverrides('http://localhost:3000') });
