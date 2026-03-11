'use client';

import { useEffect, useState, useCallback } from 'react';
import { useProcessAuth, LoginFormSchema } from './auth/process';
import { LoginType } from '@smart-signer/types/common';
import { siteConfig } from '@ui/config/site';
import { handleError } from '@ui/lib/handle-error';
import { getLogger } from '@ui/lib/logging';
import {
  GOOGLE_OAUTH_CODE_KEY,
  GOOGLE_OAUTH_ERROR_KEY,
  GOOGLE_OAUTH_USERNAME_KEY,
  GOOGLE_OAUTH_KEYTYPE_KEY,
  isValidKeyType,
  cleanupStaleOAuthData,
  clearOAuthData
} from '@smart-signer/lib/google-oauth-constants';

const logger = getLogger('app');

const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-script';
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleOAuthRedirectHandlerProps {
  authenticateOnBackend?: boolean;
  strict?: boolean;
  onComplete?: (username: string) => void;
  /**
   * Text to display while completing authorization.
   * Should be a translated string from the consuming app.
   * @default 'Completing Google authorization...'
   */
  loadingText?: string;
}

/**
 * Component that handles automatic continuation of Google OAuth redirect flow.
 *
 * On Safari, OAuth uses redirect mode instead of popup. After the user returns
 * from Google OAuth, this component detects the `?google_auth=pending` query
 * parameter and automatically continues the login flow.
 */
export function GoogleOAuthRedirectHandler({
  authenticateOnBackend = false,
  strict = false,
  onComplete,
  loadingText = 'Completing Google authorization...'
}: GoogleOAuthRedirectHandlerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { signAuth, submitAuth } = useProcessAuth(authenticateOnBackend, strict);

  // Clean up stale OAuth data on mount
  useEffect(() => {
    cleanupStaleOAuthData();
  }, []);

  const loadGoogleScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!siteConfig.googleDrive.clientId) {
        resolve();
        return;
      }

      // Check if script is already loaded
      // Use instanceof to prevent DOM clobbering attacks where user content
      // like `<a id="google-gsi-script">` could shadow a legitimate script element
      const existingElement = document.getElementById(GOOGLE_GSI_SCRIPT_ID);
      if (existingElement instanceof HTMLScriptElement) {
        // Script exists, but might still be loading - check if google.accounts is available
        if (window.google?.accounts?.oauth2) {
          resolve();
          return;
        }
        // Script exists but not loaded yet - wait for it
        existingElement.addEventListener('load', () => resolve());
        existingElement.addEventListener('error', () => reject(new Error('Failed to load Google script')));
        return;
      }

      const script = document.createElement('script');
      script.id = GOOGLE_GSI_SCRIPT_ID;
      script.src = GOOGLE_GSI_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.body.appendChild(script);
    });
  }, []);

  const cleanupUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('google_auth');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleOAuthRedirect = useCallback(async () => {
    // Check for pending OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_auth') !== 'pending') {
      return;
    }

    logger.info('Detected Google OAuth redirect, checking for pending auth data');

    // Verify we have pending OAuth data
    const pendingCode = sessionStorage.getItem(GOOGLE_OAUTH_CODE_KEY);
    const storedUsername = sessionStorage.getItem(GOOGLE_OAUTH_USERNAME_KEY);
    const storedKeyTypeRaw = sessionStorage.getItem(GOOGLE_OAUTH_KEYTYPE_KEY);
    const pendingError = sessionStorage.getItem(GOOGLE_OAUTH_ERROR_KEY);

    // Clean up URL immediately to prevent re-processing on refresh
    cleanupUrl();

    if (pendingError) {
      logger.error('Google OAuth error from redirect: %s', pendingError);
      clearOAuthData();
      // Show user-friendly error message
      handleError(new Error(`Google authentication failed: ${pendingError}`));
      return;
    }

    // Validate KeyType to prevent type confusion attacks
    if (!isValidKeyType(storedKeyTypeRaw)) {
      logger.info('No valid pending OAuth data found (invalid keyType), skipping auto-continuation');
      return;
    }
    const storedKeyType = storedKeyTypeRaw;

    if (!pendingCode || !storedUsername) {
      logger.info('No valid pending OAuth data found, skipping auto-continuation');
      return;
    }

    logger.info('Found pending OAuth data for user %s, continuing login flow', storedUsername);
    setIsProcessing(true);

    try {
      // Load Google script if needed (required for the signer)
      await loadGoogleScript();

      // Continue the login flow using the stored credentials
      const schema: LoginFormSchema = {
        loginType: LoginType.google,
        username: storedUsername,
        keyType: storedKeyType,
        remember: false
      };

      await signAuth(schema);
      await submitAuth();

      logger.info('Google OAuth redirect login completed successfully for %s', storedUsername);
      onComplete?.(storedUsername);
    } catch (error) {
      logger.error('Google OAuth redirect continuation failed: %s', error instanceof Error ? error.message : String(error));
      handleError(error);
    } finally {
      setIsProcessing(false);
    }
  }, [cleanupUrl, loadGoogleScript, signAuth, submitAuth, onComplete]);

  useEffect(() => {
    handleOAuthRedirect();
  }, [handleOAuthRedirect]);

  if (!isProcessing) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-background p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-foreground">{loadingText}</p>
      </div>
    </div>
  );
}

export default GoogleOAuthRedirectHandler;
