/**
 * Test constants for Playwright E2E tests
 */

/**
 * Theme color constants for CSS assertions
 */
export const THEME_COLORS = {
  light: {
    background: 'rgb(247, 247, 247)',
    authorText: 'rgb(24, 30, 42)',
    bodyBackground: 'rgb(247, 247, 247)'
  },
  dark: {
    background: 'rgb(34, 38, 42)',
    authorText: 'rgb(248, 250, 252)',
    bodyBackground: 'rgb(34, 38, 42)'
  }
} as const;

/**
 * Pagination constants
 */
export const PAGINATION = {
  INITIAL_POSTS_COUNT: 20,
  POSTS_PER_PAGE: 20,
  MIN_POSTS_AFTER_SCROLL: 40,
  MAX_POSTS_AFTER_SCROLL: 60
} as const;

/**
 * Timeout constants (in milliseconds)
 */
export const TIMEOUTS = {
  SEARCH_RESULTS: 15000,
  PAGE_LOAD: 10000,
  ELEMENT_VISIBLE: 5000,
  NETWORK_IDLE: 10000
} as const;

/**
 * API endpoint helper
 */
export function getApiEndpoint(): string | undefined {
  return process.env.REACT_APP_API_ENDPOINT;
}

/**
 * Validates required environment variables
 * @throws Error if required env variables are missing
 */
export function validateEnv(): void {
  const endpoint = getApiEndpoint();
  if (!endpoint) {
    throw new Error('REACT_APP_API_ENDPOINT environment variable is not set');
  }
}

/**
 * Check if API endpoint is configured
 */
export function isApiEndpointConfigured(): boolean {
  return !!getApiEndpoint();
}
