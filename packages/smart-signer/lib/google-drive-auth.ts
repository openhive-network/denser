import { siteConfig } from '@hive/ui/config/site';
import { hasOAuthPopupIssues } from '@hive/ui/lib/browser-detect';
import { getLogger } from '@hive/ui/lib/logging';
import {
  GOOGLE_OAUTH_CODE_KEY,
  GOOGLE_OAUTH_ERROR_KEY,
  GOOGLE_OAUTH_USERNAME_KEY,
  GOOGLE_OAUTH_KEYTYPE_KEY,
  GOOGLE_OAUTH_NONCE_KEY,
  encodeUrlSafeBase64,
  generateOAuthNonce,
  setOAuthDataWithTimestamp,
  clearOAuthData
} from '@smart-signer/lib/google-oauth-constants';

const logger = getLogger('app');

const REFRESH_TOKEN_KEY = 'google_refresh_token';
const GSI_SCRIPT_ID = 'google-gsi-script';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export const hasCompatibleGoogleDriveProvider = () => !!siteConfig.googleDrive.clientId;

// --- Window type for Google Identity Services ---

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient(config: {
            client_id: string;
            scope: string;
            ux_mode: 'popup' | 'redirect';
            redirect_uri?: string;
            state?: string;
            include_granted_scopes?: boolean;
            callback: (response: { code?: string; error?: string }) => void;
          }): { requestCode: (options: { prompt: 'consent' | 'none' }) => void };
        };
      };
    };
  }
}

/**
 * Manages Google OAuth token lifecycle: refresh tokens, code exchange,
 * popup and redirect flows. Singleton — shared across signers and
 * the wallet manager.
 */
export class GoogleDriveAuth {
  private static instance: GoogleDriveAuth;
  private accessTokenPromise: Promise<string> | null = null;
  private oauthContext: { username: string; keyType: string } | null = null;
  private gsiLoadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): GoogleDriveAuth {
    if (!GoogleDriveAuth.instance) {
      GoogleDriveAuth.instance = new GoogleDriveAuth();
    }
    return GoogleDriveAuth.instance;
  }

  setOAuthContext(context: { username: string; keyType: string }): void {
    this.oauthContext = context;
  }

  /* eslint-disable no-restricted-properties -- refresh token stored permanently for persistent Google Drive auth */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch(`${window.location.origin}/api/google-drive/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) throw new Error('Failed to refresh Google Drive access token');
    const tokenData = await response.json();
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    return tokenData.accessToken;
  }

  private async exchangeCodeForTokens(code: string, isRedirect: boolean): Promise<string> {
    const body: Record<string, string> = { code };
    if (isRedirect) body.redirectUri = `${window.location.origin}/api/google-drive/callback`;

    const response = await fetch(`${window.location.origin}/api/google-drive/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('Failed to exchange code for tokens');
    const tokenData = await response.json();
    if (tokenData.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refreshToken);
    return tokenData.accessToken;
  }

  getAccessToken(): Promise<string> {
    if (this.accessTokenPromise) return this.accessTokenPromise;
    if (!hasCompatibleGoogleDriveProvider()) {
      throw new Error('Google Drive Signer is not properly configured.');
    }

    const savedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (savedRefresh) {
      this.accessTokenPromise = this.refreshAccessToken(savedRefresh).catch((refreshError) => {
        logger.error('Error refreshing Google Drive access token: %s',
          refreshError instanceof Error ? refreshError.message : String(refreshError));
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        this.accessTokenPromise = null;
        throw refreshError;
      });
      return this.accessTokenPromise;
    }

    const pendingCode = sessionStorage.getItem(GOOGLE_OAUTH_CODE_KEY);
    const pendingError = sessionStorage.getItem(GOOGLE_OAUTH_ERROR_KEY);

    if (pendingError) {
      clearOAuthData();
      return Promise.reject(new Error(`Google OAuth error: ${pendingError}`));
    }
    if (pendingCode) {
      clearOAuthData();
      this.accessTokenPromise = this.exchangeCodeForTokens(pendingCode, true).catch((exchangeError) => {
        this.accessTokenPromise = null;
        throw exchangeError;
      });
      return this.accessTokenPromise;
    }

    return hasOAuthPopupIssues() ? this.initiateRedirectFlow() : this.initiatePopupFlow();
  }

  checkAuth(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  resetTokens(): void {
    this.accessTokenPromise = null;
    this.oauthContext = null;
    if (typeof window !== 'undefined') localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  /* eslint-enable no-restricted-properties */

  private ensureGsiLoaded(): Promise<void> {
    if (window.google?.accounts?.oauth2) return Promise.resolve();
    if (this.gsiLoadPromise) return this.gsiLoadPromise;

    this.gsiLoadPromise = new Promise<void>((resolve, reject) => {
      const existingElement = document.getElementById(GSI_SCRIPT_ID);
      if (existingElement instanceof HTMLScriptElement) {
        if (window.google?.accounts?.oauth2) {
          resolve();
          return;
        }
        existingElement.addEventListener('load', () => resolve());
        existingElement.addEventListener('error', () => reject(new Error('Failed to load Google GIS script')));
        return;
      }

      const script = document.createElement('script');
      script.id = GSI_SCRIPT_ID;
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.gsiLoadPromise = null;
        reject(new Error('Failed to load Google GIS script'));
      };
      document.body.appendChild(script);
    });

    return this.gsiLoadPromise;
  }

  private async initiateRedirectFlow(): Promise<string> {
    await this.ensureGsiLoaded();

    const nonce = generateOAuthNonce();
    sessionStorage.setItem(GOOGLE_OAUTH_NONCE_KEY, nonce);
    if (this.oauthContext) {
      sessionStorage.setItem(GOOGLE_OAUTH_USERNAME_KEY, this.oauthContext.username);
      sessionStorage.setItem(GOOGLE_OAUTH_KEYTYPE_KEY, this.oauthContext.keyType);
    }
    setOAuthDataWithTimestamp();

    const state = encodeUrlSafeBase64(JSON.stringify({ returnUrl: window.location.href, nonce }));
    const tokenClient = window.google.accounts.oauth2.initCodeClient({
      client_id: siteConfig.googleDrive.clientId,
      scope: siteConfig.googleDrive.scopes,
      ux_mode: 'redirect',
      redirect_uri: `${window.location.origin}/api/google-drive/callback`,
      state,
      include_granted_scopes: false,
      callback: () => {}
    });
    tokenClient.requestCode({ prompt: 'consent' });

    return new Promise(() => {}); // Page will redirect
  }

  private async initiatePopupFlow(): Promise<string> {
    await this.ensureGsiLoaded();

    this.accessTokenPromise = new Promise<string>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initCodeClient({
        client_id: siteConfig.googleDrive.clientId,
        scope: siteConfig.googleDrive.scopes,
        ux_mode: 'popup',
        include_granted_scopes: false,
        callback: async (response) => {
          if (response.error) { reject(new Error(`Google OAuth error: ${response.error}`)); return; }
          if (!response.code) { reject(new Error('No code received from Google Drive OAuth2')); return; }
          try { resolve(await this.exchangeCodeForTokens(response.code, false)); }
          catch (exchangeError) { reject(exchangeError); }
        }
      });
      tokenClient.requestCode({ prompt: 'consent' });
    }).catch((popupError) => {
      this.accessTokenPromise = null;
      throw popupError;
    });
    return this.accessTokenPromise;
  }
}
