'use client';

import { FC, RefObject, useLayoutEffect, useEffect } from 'react';
import { safeScrollToElement } from '@ui/lib/sanitize-url';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const ScrollToElement: FC<{ rendererRef: RefObject<HTMLDivElement> }> = ({ rendererRef }) => {
  useIsomorphicLayoutEffect(() => {
    const hash = window.location.hash;
    const handleScroll = async () => {
      if (!rendererRef.current || !hash) return;

      try {
        const selectors = Array.from(rendererRef.current.querySelectorAll<HTMLImageElement>('img'));

        await Promise.all(
          selectors.map((img) => {
            if (img.complete) return;
            return new Promise((resolve, reject) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', reject, { once: true });
            });
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch {
        // Image loading failed - continue to scroll anyway
      } finally {
        // Use sanitized scroll to prevent DOM-based XSS via malicious hash fragments
        safeScrollToElement(hash, { behavior: 'smooth' });
      }
    };
    handleScroll();
  }, []);
  return null;
};

export default ScrollToElement;
