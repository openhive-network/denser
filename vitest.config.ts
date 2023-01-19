/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		globals: true,
		environment: 'happy-dom',
		setupFiles: ['./test/setup-test-env.ts'],

		// Excluding `e2e tests` avoids overlapping with Playwright.
		exclude: ['./tests/e2e/*', 'node_modules'],

		// Disable CSS if you don't have tests that relies on it,
		// since parsing CSS it's slow.
		css: false,
	},
});
