import { FC, RefObject, useLayoutEffect, useRef } from 'react';

const ScrollToElement: FC<{ hashid: string; rendererRef: RefObject<HTMLDivElement> }> = ({
  hashid,
  rendererRef
}) => {
  useLayoutEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hashid !== hash) return;
    const handleScroll = async () => {
      if (!rendererRef.current) return;

      try {
        const selectors = Array.from(rendererRef.current.querySelectorAll<HTMLImageElement>('img'));

        await Promise.all(
          selectors.map((img) => {
            console.log(img.src);
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
  }, [hashid]);
  return null;
};

export default ScrollToElement;
