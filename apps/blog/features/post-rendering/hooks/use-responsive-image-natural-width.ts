import { RefObject, useEffect } from 'react';

const RESPONSIVE_IMAGE_SELECTOR = 'img[srcset]';

function pinToNaturalWidth(image: HTMLImageElement) {
  if (!image.currentSrc) return;
  // A srcset-less copy of the cached candidate reports its pixel width, not the
  // descriptor-scaled width the srcset image is laid out at.
  const probe = new Image();
  probe.onload = () => {
    image.style.width = `${probe.naturalWidth}px`;
  };
  probe.src = image.currentSrc;
}

function handleImageLoad(event: Event) {
  if (event.currentTarget instanceof HTMLImageElement) pinToNaturalWidth(event.currentTarget);
}

/**
 * Body images with a `srcset` are laid out at the width their `w` descriptor implies, but the
 * image proxy never enlarges: an original narrower than the chosen candidate would render
 * smaller than its real size. Once each one loads, pin it to its pixel width (CSS keeps
 * `max-width: 100%`), which is how an image without a `srcset` renders.
 */
export function useResponsiveImageNaturalWidth(containerRef: RefObject<HTMLElement | null>, html: string | undefined) {
  useEffect(() => {
    const images = Array.from(containerRef.current?.querySelectorAll<HTMLImageElement>(RESPONSIVE_IMAGE_SELECTOR) ?? []);
    images.forEach((image) => {
      if (image.complete && image.naturalWidth > 0) pinToNaturalWidth(image);
      // Also fires when the browser switches to another candidate after a resize.
      image.addEventListener('load', handleImageLoad);
    });
    return () => images.forEach((image) => image.removeEventListener('load', handleImageLoad));
  }, [containerRef, html]);
}
