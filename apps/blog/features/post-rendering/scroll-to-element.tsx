'use client';

import { FC, RefObject, useLayoutEffect, useEffect } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const ScrollToElement: FC<{ rendererRef: RefObject<HTMLDivElement> }> = ({ rendererRef }) => {
  useIsomorphicLayoutEffect(() => {
    const hash = window.location.hash.slice(1);
    const handleScroll = async () => {
      if (!rendererRef.current) return;

      try {
        const selectors = Array.from(rendererRef.current.querySelectorAll<HTMLImageElement>('img'));

        await Promise.all(
          selectors.map((img) => {
            if (img.complete) return;
            return new Promise((resolve, reject) => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', reject);
            });
          })
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.error(e);
      } finally {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    handleScroll();
  }, []);
  return null;
};

export default ScrollToElement;
