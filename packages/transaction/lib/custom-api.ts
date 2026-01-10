import env from '@beam-australia/react-env';
import { logApiCall } from './api-logger';

/**
 * Check if third-party API calls are enabled.
 * When disabled, these APIs return null/empty to gracefully degrade:
 * - hiveposh.com (Twitter verification)
 * - hivebuzz.me (badges)
 * - peakd.com (badges)
 *
 * Default: false (disabled) - CSP blocks these domains anyway.
 * Set REACT_APP_ENABLE_THIRD_PARTY_API=true to enable.
 */
export function isThirdPartyApiEnabled(): boolean {
  const value = env('ENABLE_THIRD_PARTY_API');
  return value === 'true' || value === 'yes' || value === '1';
}

export const getTwitterInfo = async (username: string) => {
  // Return null early if third-party APIs are disabled
  if (!isThirdPartyApiEnabled()) {
    return null;
  }
  const start = Date.now();
  const api = 'hiveposh.twitter';

  try {
    const response = await fetch(`https://hiveposh.com/api/v0/twitter/${username}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Posh API Error: ${response.status}`);
    }

    const data = await response.json();
    const { error } = data;
    if (error) {
      throw new Error(`Posh API Error: ${error}`);
    }

    logApiCall({
      api,
      params: { username },
      status: 'success',
      duration_ms: Date.now() - start
    });

    return data;
  } catch (error) {
    logApiCall({
      api,
      params: { username },
      status: 'error',
      duration_ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const getHivebuzzBadges = async (username: string) => {
  // Return empty array early if third-party APIs are disabled
  if (!isThirdPartyApiEnabled()) {
    return [];
  }
  const start = Date.now();
  const api = 'hivebuzz.badges';

  try {
    const response = await fetch(`https://hivebuzz.me/api/badges/${username}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Hivebuzz API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.filter((badge: { state: string }) => badge.state === 'on');

    logApiCall({
      api,
      params: { username },
      status: 'success',
      duration_ms: Date.now() - start
    });

    return result;
  } catch (error) {
    logApiCall({
      api,
      params: { username },
      status: 'error',
      duration_ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const getPeakdBadges = async (username: string) => {
  // Return empty array early if third-party APIs are disabled
  if (!isThirdPartyApiEnabled()) {
    return [];
  }
  const start = Date.now();
  const api = 'peakd.badges';

  try {
    const response = await fetch(`https://peakd.com/api/public/badge/${username}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Peakd API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.map((obj: { name: string; title: string }) => ({
      id: obj.title,
      name: obj.name,
      title: obj.title
    }));

    logApiCall({
      api,
      params: { username },
      status: 'success',
      duration_ms: Date.now() - start
    });

    return result;
  } catch (error) {
    logApiCall({
      api,
      params: { username },
      status: 'error',
      duration_ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};
