'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface FeedNavigation {
  /** True while a navigation started from a feed control is waiting for the target route. */
  isPending: boolean;
  /** Pushes `href` inside a transition, so `isPending` holds until the new route renders. */
  navigate: (href: string) => void;
  /** Marks one link navigation as pending; call the returned function when it settles. */
  trackLinkPending: () => () => void;
}

const FeedNavigationContext = createContext<FeedNavigation | null>(null);

/**
 * Tracks client-side navigation between feeds so the list area can show a
 * loading state. Deliberately not a Suspense boundary: the feed stays in the
 * visible server HTML on first render and only the client toggles the state.
 */
export const FeedNavigationProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [pendingLinks, setPendingLinks] = useState(0);

  const navigate = useCallback(
    (href: string) => startTransition(() => router.push(href)),
    [router]
  );
  const trackLinkPending = useCallback(() => {
    setPendingLinks((count) => count + 1);
    return () => setPendingLinks((count) => count - 1);
  }, []);

  const value = useMemo(
    () => ({ isPending: isTransitionPending || pendingLinks > 0, navigate, trackLinkPending }),
    [isTransitionPending, pendingLinks, navigate, trackLinkPending]
  );

  return <FeedNavigationContext.Provider value={value}>{children}</FeedNavigationContext.Provider>;
};

/** Returns the feed navigation state, or null outside a FeedNavigationProvider. */
export const useFeedNavigation = () => useContext(FeedNavigationContext);
