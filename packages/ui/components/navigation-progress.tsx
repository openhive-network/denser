'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationProgressContextType {
  isNavigating: boolean;
  startNavigation: () => void;
}

const NavigationProgressContext = createContext<NavigationProgressContextType>({
  isNavigating: false,
  startNavigation: () => {}
});

export function useNavigationProgress() {
  return useContext(NavigationProgressContext);
}

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  // Track path changes to detect navigation completion
  useEffect(() => {
    const newPath = pathname + (searchParams?.toString() || '');
    if (currentPath && newPath !== currentPath) {
      // Navigation completed
      setIsNavigating(false);
    }
    setCurrentPath(newPath);
  }, [pathname, searchParams, currentPath]);

  // Safety timeout to prevent progress bar from getting stuck
  useEffect(() => {
    if (!isNavigating) return;

    const timeout = setTimeout(() => {
      setIsNavigating(false);
    }, 10000); // 10 second max navigation time

    return () => clearTimeout(timeout);
  }, [isNavigating]);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  return (
    <NavigationProgressContext.Provider value={{ isNavigating, startNavigation }}>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function NavigationProgress() {
  const { isNavigating } = useNavigationProgress();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      setProgress(0);

      // Animate progress bar
      const timer1 = setTimeout(() => setProgress(30), 100);
      const timer2 = setTimeout(() => setProgress(60), 300);
      const timer3 = setTimeout(() => setProgress(80), 600);
      const timer4 = setTimeout(() => setProgress(90), 1000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    } else {
      // Complete the progress bar
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isNavigating]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] h-1 bg-transparent">
      <div
        className="h-full bg-destructive transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Hook to intercept link clicks and trigger navigation progress
export function useNavigationProgressHandler() {
  const { startNavigation } = useNavigationProgress();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link) {
        const href = link.getAttribute('href');
        const linkTarget = link.getAttribute('target');

        // Only trigger for internal navigation links
        if (
          href &&
          !linkTarget &&
          !href.startsWith('http') &&
          !href.startsWith('mailto:') &&
          !href.startsWith('#') &&
          !link.hasAttribute('download')
        ) {
          // Don't start navigation if clicking on the current URL
          const currentPath = window.location.pathname + window.location.search;
          if (href === currentPath || href === window.location.pathname) {
            return;
          }
          startNavigation();
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [startNavigation]);
}

// Component that sets up the click handler
export function NavigationProgressHandler() {
  useNavigationProgressHandler();
  return null;
}
