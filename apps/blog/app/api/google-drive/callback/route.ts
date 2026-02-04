import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('google-drive-callback');

/**
 * OAuth callback endpoint for Google Drive redirect flow (Safari).
 *
 * Google redirects here with ?code=xxx&state=xxx after user authorization.
 * This page extracts the code and stores it in sessionStorage,
 * then redirects the user back to the original page.
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
      var code = ${JSON.stringify(code)};
      var state = ${JSON.stringify(state)};
      var error = ${JSON.stringify(error)};

      if (error) {
        sessionStorage.setItem('google_oauth_error', error);
        sessionStorage.removeItem('google_oauth_code');
      } else if (code) {
        sessionStorage.setItem('google_oauth_code', code);
        sessionStorage.removeItem('google_oauth_error');
      }

      // Get the return URL from state or default to origin
      var returnUrl = '/';
      try {
        if (state) {
          var stateData = JSON.parse(atob(state));
          returnUrl = stateData.returnUrl || '/';
        }
      } catch (e) {
        console.error('Failed to parse state:', e);
      }

      // Redirect back to the app
      window.location.replace(returnUrl);
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
