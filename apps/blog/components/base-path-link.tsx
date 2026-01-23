// eslint-disable-next-line no-restricted-imports -- This is a wrapper component that needs direct access to next/link
import Link from 'next/link';
import { MouseEvent, ReactNode } from 'react';
import { buildSafePath, isInternalPath } from '@ui/lib/sanitize-url';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('BasePathLink');

interface BasePathLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
  prefetch?: boolean;
}
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Custom Link component that handles basePath navigation issues with catch-all routes.
 * For user profile links (starting with @) and comment links (containing #@),
 * it forces a full page reload when using basePath to ensure getServerSideProps
 * is called and the correct page type is rendered.
 *
 * Security: All hrefs are validated to prevent XSS via javascript: or other dangerous protocols.
 */
const BasePathLink = ({
  href,
  children,
  className,
  'data-testid': dataTestId,
  prefetch = false
}: BasePathLinkProps) => {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Security: Validate that href is an internal path before navigation
    if (!isInternalPath(href)) {
      logger.warn({ href }, 'BasePathLink blocked potentially dangerous href');
      e.preventDefault();
      return;
    }

    // Force full page reload for certain link types when using basePath
    // This ensures getServerSideProps runs and the correct page component is rendered
    // For root deployments (no basePath), use normal Next.js navigation
    const needsReload = href.startsWith('/@') || href.includes('/#@');

    // Also force reload for static pages to avoid intermittent navigation failures
    const isStaticPage =
      href === '/welcome' || href === '/faq.html' || href === '/privacy.html' || href === '/tos.html';

    if ((needsReload || isStaticPage) && basePath) {
      e.preventDefault();
      // Security: Build path safely to prevent XSS
      const fullPath = buildSafePath(basePath, href);
      if (!fullPath) {
        logger.warn({ href, basePath }, 'BasePathLink blocked unsafe path construction');
        return;
      }
      logger.debug({ href, basePath, fullPath }, 'BasePathLink forcing reload');
      window.location.href = fullPath;
    }
  };

  return (
    <Link
      href={href}
      className={className}
      data-testid={dataTestId}
      prefetch={prefetch}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

export default BasePathLink;
