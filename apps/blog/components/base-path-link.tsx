import Link from 'next/link';
import { MouseEvent, ReactNode } from 'react';

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
 */
const BasePathLink = ({
  href,
  children,
  className,
  'data-testid': dataTestId,
  prefetch = false
}: BasePathLinkProps) => {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Force full page reload for certain link types when using basePath
    // This ensures getServerSideProps runs and the correct page component is rendered
    // For root deployments (no basePath), use normal Next.js navigation
    const needsReload = href.startsWith('/@') || href.includes('/#@');

    // Also force reload for static pages to avoid intermittent navigation failures
    const isStaticPage =
      href === '/welcome' || href === '/faq.html' || href === '/privacy.html' || href === '/tos.html';

    if ((needsReload || isStaticPage) && basePath) {
      e.preventDefault();
      // Force a full page reload
      // basePath already includes the basePath from next.config.js
      const fullPath = basePath + href;
      console.log('BasePathLink forcing reload:', {
        href,
        basePath: basePath,
        fullPath
      });
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
