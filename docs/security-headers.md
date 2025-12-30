# Security Headers Configuration

This document describes the security headers implementation for Denser and provides guidance for nginx reverse proxy configuration.

## Overview

Security headers are set at the **application level** (Next.js) to ensure they are version-controlled with the code and work consistently across all deployment environments.

## Headers Set by the Application

The following headers are configured in `apps/blog/next.config.js` and `apps/wallet/next.config.js`:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | `nosniff` | Prevents MIME-sniffing attacks |
| X-Frame-Options | `SAMEORIGIN` | Prevents clickjacking by restricting iframe embedding |
| X-DNS-Prefetch-Control | `off` | Prevents DNS prefetching to protect privacy |
| X-Download-Options | `noopen` | Prevents IE from executing downloads in site context |
| Referrer-Policy | `strict-origin-when-cross-origin` | Controls referrer information sent to other sites |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` | Disables unused browser features |

Additionally, `poweredByHeader: false` is set in Next.js config to prevent exposing `X-Powered-By: Next.js`.

### Future Headers (Planned)

| Header | Status | Notes |
|--------|--------|-------|
| Content-Security-Policy | Planned | Will be added after testing with Report-Only mode |
| Strict-Transport-Security | Set by nginx | Infrastructure concern, see below |

## Nginx Configuration Guidelines

To avoid header conflicts and duplication, follow these guidelines:

### Principle: Single Source of Truth

Each header should be set in **one place only** - either the application or nginx, not both.

### Recommended Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL configuration...

    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # HSTS - Set at nginx level (infrastructure concern)
        # Only enable after confirming HTTPS works correctly
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # DO NOT set these headers in nginx - they are set by the application:
        # - X-Content-Type-Options
        # - X-Frame-Options
        # - Referrer-Policy
        # - Permissions-Policy
        # - Content-Security-Policy (when implemented)
    }

    # Static assets - can have longer cache and same security headers
    location /_next/static/ {
        proxy_pass http://nextjs_upstream;
        add_header Cache-Control "public, max-age=31536000, immutable";
        # Security headers are inherited from the app response
    }
}
```

### Why HSTS Should Be Set at Nginx Level

Strict-Transport-Security (HSTS) is an infrastructure concern because:
1. It affects the entire domain, not just the application
2. Misconfiguration can lock users out if HTTPS fails
3. It should be coordinated with SSL certificate management
4. It may need different settings for staging vs production

### Header Ownership Summary

| Header | Owner | Reason |
|--------|-------|--------|
| X-Content-Type-Options | Application | Version controlled, consistent behavior |
| X-Frame-Options | Application | May need app-specific logic in future |
| X-DNS-Prefetch-Control | Application | Privacy protection, version controlled |
| X-Download-Options | Application | Security, version controlled |
| Referrer-Policy | Application | Version controlled, consistent behavior |
| Permissions-Policy | Application | App knows which features it needs |
| Content-Security-Policy | Application | Will require nonces (dynamic per-request) |
| Strict-Transport-Security | Nginx | Infrastructure concern |
| Cache-Control (static) | Nginx | CDN/proxy optimization |

## Verifying Headers

After deployment, verify headers are present and not duplicated:

```bash
# Check headers on a page
curl -I https://your-domain.com/trending

# Expected output should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# X-DNS-Prefetch-Control: off
# X-Download-Options: noopen
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=()
# Strict-Transport-Security: max-age=31536000; includeSubDomains
#
# Should NOT include:
# X-Powered-By: Next.js

# Check for duplicate headers (problem if same header appears twice)
curl -I https://your-domain.com/trending 2>/dev/null | grep -i "x-frame-options"
# Should show only ONE line
```

## Troubleshooting

### Duplicate Headers

If you see the same header twice in responses:
1. Check if both nginx and the application are setting it
2. Remove the header from nginx configuration
3. Restart nginx and verify

### Missing Headers

If headers are missing:
1. Verify the Next.js application is running the latest version
2. Check that `next.config.js` includes the `headers()` function
3. Ensure nginx is not stripping headers with `proxy_hide_header`

### Header Conflicts

If nginx is overwriting application headers:
1. Remove the conflicting `add_header` directives from nginx
2. Use `proxy_pass_header` if needed to preserve specific headers
