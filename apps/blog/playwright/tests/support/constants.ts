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
  NETWORK_IDLE: 10000,
  HYDRATION: 30000, // Longer timeout for React hydration on production
  IMAGE_LOAD: 15000,
  TWITTER_PLUGIN_SETTLE: 15000
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

/**
 * Check if running against production environment
 * Production has known issues with filter dropdown not working
 */
export function isProductionEnvironment(): boolean {
  const baseUrl = process.env.BASE_URL || '';
  return baseUrl.includes('blog.openhive.network');
}

/**
 * Accessibility test constants
 */
export const ACCESSIBILITY = {
  /** Number of Tab key presses to test keyboard navigation */
  TAB_NAVIGATION_STEPS: 10,
  /** Number of Tab presses to verify focus trap in dialogs */
  FOCUS_TRAP_TAB_COUNT: 15,
  /** Maximum number of buttons to check for accessible names */
  MAX_BUTTONS_TO_CHECK: 20,
  /** Maximum number of links to check for accessible names */
  MAX_LINKS_TO_CHECK: 30,
  /** Minimum expected focus trap hits (out of FOCUS_TRAP_TAB_COUNT) */
  MIN_FOCUS_TRAP_HITS: 5
} as const;
