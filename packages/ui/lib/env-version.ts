/**
 * Generates a stable version hash for __ENV.js cache-busting.
 * The hash only changes when REACT_APP_* environment variables change,
 * allowing browsers to cache the file effectively.
 *
 * IMPORTANT: The hash is computed ONCE at module initialization (server startup)
 * and cached for all subsequent requests. This is efficient because env vars
 * don't change during runtime.
 */

// Simple hash function for generating a short, stable version string
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to base36 for a shorter string, take absolute value
  return Math.abs(hash).toString(36);
}

/**
 * Computes the env version hash from REACT_APP_* variables.
 * Called once at module initialization.
 */
function computeEnvVersion(): string {
  // Collect all REACT_APP_* env vars
  const reactAppVars: string[] = [];

  for (const key of Object.keys(process.env)) {
    if (key.startsWith('REACT_APP_')) {
      // Include both key and value to detect renames and value changes
      reactAppVars.push(`${key}=${process.env[key] || ''}`);
    }
  }

  // Sort for consistent ordering
  reactAppVars.sort();

  // Generate hash from concatenated values
  const envString = reactAppVars.join('|');

  // Return hash or fallback to 'v1' if no REACT_APP_* vars exist
  return envString ? simpleHash(envString) : 'v1';
}

// Compute hash ONCE at module load time (server startup)
// This is cached for the lifetime of the server process
const ENV_VERSION = computeEnvVersion();

/**
 * Returns the cached env version hash.
 * The hash is computed once at server startup and reused for all requests.
 */
export function getEnvVersion(): string {
  return ENV_VERSION;
}
