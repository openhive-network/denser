'use client';

import { useEffect } from 'react';
import { Link, useLinkStatus, type LinkProps } from '@hive/ui';
import { useFeedNavigation } from './feed-navigation-context';

const LinkPendingReporter = () => {
  const { pending } = useLinkStatus();
  const trackLinkPending = useFeedNavigation()?.trackLinkPending;

  useEffect(() => {
    if (!pending || !trackLinkPending) return;
    return trackLinkPending();
  }, [pending, trackLinkPending]);

  return null;
};

/** A Link to a feed that reports its pending navigation to the FeedNavigationProvider. */
const FeedLink = ({ children, ...props }: LinkProps) => (
  <Link {...props}>
    {children}
    <LinkPendingReporter />
  </Link>
);

export default FeedLink;
