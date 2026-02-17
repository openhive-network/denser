import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@ui/lib/logging';
import { safeJsonForScript } from '@hive/ui';

const logger = getLogger('google-drive-callback');

/**
 * OAuth callback endpoint for Google Drive redirect flow (Safari).
 *
 * Google redirects here with ?code=xxx&state=xxx after user authorization.
 * This page extracts the code and stores it in sessionStorage,
 * validates the CSRF nonce, and redirects the user back to the original page.
 *
 * Security measures:
 * - CSRF protection via nonce in state parameter
 * - Open redirect protection via same-origin validation
 * - URL-safe base64 encoding for state
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  logger.info('Google Drive OAuth callback received', {
    hasCode: !!code,
    hasState: !!state,
    error
  });

  // Return an HTML page that stores the code and redirects back to the app
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Google Drive Authorization</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container { text-align: center; padding: 20px; }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #e31337;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Completing authorization...</p>
  </div>
  <script>
    (function() {
      var code = ${safeJsonForScript(code)};
      var state = ${safeJsonForScript(state)};
      var error = ${safeJsonForScript(error)};

      // URL-safe base64 decode helper
      function decodeUrlSafeBase64(str) {
        var base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        var padding = base64.length % 4;
        if (padding) {
          base64 += '='.repeat(4 - padding);
        }
        return atob(base64);
      }

      // Validate return URL is same-origin (prevent open redirect attacks)
      function isValidReturnUrl(url) {
        // Allow relative paths starting with /
        if (url.startsWith('/') && !url.startsWith('//')) {
          return true;
        }
        // For absolute URLs, check if same origin
        try {
          var parsed = new URL(url);
          return parsed.origin === window.location.origin;
        } catch (e) {
          return false;
        }
      }

      if (error) {
        sessionStorage.setItem('google_oauth_error', error);
        sessionStorage.removeItem('google_oauth_code');
      } else if (code) {
        sessionStorage.setItem('google_oauth_code', code);
        sessionStorage.removeItem('google_oauth_error');
      }

      // Parse state and validate CSRF nonce
      var returnUrl = '/';
      var stateNonce = null;
      try {
        if (state) {
          var stateData = JSON.parse(decodeUrlSafeBase64(state));
          stateNonce = stateData.nonce;

          // Validate return URL is same-origin
          if (stateData.returnUrl && isValidReturnUrl(stateData.returnUrl)) {
            returnUrl = stateData.returnUrl;
          } else if (stateData.returnUrl) {
            console.warn('Rejected non-same-origin return URL:', stateData.returnUrl);
          }
        }
      } catch (e) {
        console.error('Failed to parse state:', e);
      }

      // Validate CSRF nonce (mandatory — reject if missing or mismatched)
      var storedNonce = sessionStorage.getItem('google_oauth_nonce');
      if (!storedNonce || !stateNonce || stateNonce !== storedNonce) {
        console.error('CSRF nonce validation failed');
        sessionStorage.setItem('google_oauth_error', 'csrf_validation_failed');
        sessionStorage.removeItem('google_oauth_code');
      }
      sessionStorage.removeItem('google_oauth_nonce');

      // Redirect back to the app with google_auth=pending flag
      // This signals to the app that it should continue the OAuth flow automatically
      var separator = returnUrl.indexOf('?') === -1 ? '?' : '&';
      window.location.replace(returnUrl + separator + 'google_auth=pending');
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
