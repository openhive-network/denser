import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { AnchorHTMLAttributes, forwardRef } from 'react';

export interface LinkProps
  extends NextLinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> {
  children?: React.ReactNode;
}

/**
 * Custom Link component that wraps Next.js Link with prefetch disabled by default.
 * This prevents excessive server-side API calls from automatic prefetching.
 *
 * Use prefetch={true} explicitly when you need prefetching for specific links.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ prefetch = false, ...props }, ref) => <NextLink ref={ref} prefetch={prefetch} {...props} />
);

Link.displayName = 'Link';
