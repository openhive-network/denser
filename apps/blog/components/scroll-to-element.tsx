import { useEffect } from 'react';

const ScrollToElement = () => {
  useEffect(() => {
    const handleLoad = () => {
      const checkImagesLoaded = () => {
        const images = document.querySelectorAll('img');

        for (const img of images) {
          if (!img.complete) {
            return false;
          }
        }

        return true;
      };

      const scrollToComments = () => {
        const hash = window.location.hash.slice(1);
        if (hash && checkImagesLoaded()) {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }
      };

      // Initial check
      scrollToComments();

      let timeoutId: NodeJS.Timeout | null = null;
      const debouncedScrollToComments = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          scrollToComments();
        }, 500);
      };

      const observer = new MutationObserver(debouncedScrollToComments);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return null;
};

export default ScrollToElement;
