import { siteConfig } from '@ui/config/site';

const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let loading: Promise<void> | undefined;

function appendScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('Failed to load Google script'));
    });
    document.body.appendChild(script);
  });
}

/**
 * Loads Google Identity Services (`window.google.accounts.oauth2`), once per page. Resolves at once when
 * it is already there or Google Drive is not configured; rejects when the script fails to load, and the
 * next call tries again.
 */
export function loadGoogleIdentityServices(): Promise<void> {
  if (!siteConfig.googleDrive.clientId || window.google?.accounts?.oauth2) return Promise.resolve();
  loading ??= appendScript().catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
