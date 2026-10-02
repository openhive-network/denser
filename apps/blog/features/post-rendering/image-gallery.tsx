import { MouseEvent, PointerEvent, PropsWithChildren, useCallback, useRef, useState } from 'react';
import Lightbox, { RenderSlideProps, SlideImage, isImageSlide } from 'yet-another-react-lightbox';
import { Fullscreen, Thumbnails, Zoom } from 'yet-another-react-lightbox/plugins';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/styles.css';
import ProgressiveImageSlide from './progressive-image-slide';

declare module 'yet-another-react-lightbox' {
  interface SlideImage {
    /** full-resolution image that replaces `src` once it has loaded */
    fullSizeSrc?: string;
  }
}

const IMAGE_QUERY_SELECTOR = ':not(a) > img';

function asGalleryImage(target: EventTarget): HTMLImageElement | null {
  return target instanceof HTMLImageElement && target.matches(IMAGE_QUERY_SELECTOR) ? target : null;
}

/** Pixel size of a downloaded image, ignoring the `srcset` density it is laid out at. */
function getPixelSize(src: string, image: HTMLImageElement): { width?: number; height?: number } {
  // An image already in the memory cache is complete as soon as `src` is set.
  const probe = new Image();
  probe.src = src;
  if (probe.complete && probe.naturalWidth > 0) return { width: probe.naturalWidth, height: probe.naturalHeight };
  return { width: image.naturalWidth || undefined, height: image.naturalHeight || undefined };
}

/**
 * Slide for a body image: shows the URL displayed inline (already in the browser cache), or the
 * smallest `srcset` candidate if it has not loaded yet, and upgrades to the full-size `src`.
 */
function toSlide(image: HTMLImageElement): SlideImage {
  const fullSizeSrc = image.src;
  const smallestCandidate = image.srcset.split(',')[0]?.trim().split(/\s+/)[0];
  const src = image.currentSrc || smallestCandidate || fullSizeSrc;
  return { src, fullSizeSrc, alt: image.alt, ...getPixelSize(src, image) };
}

/** Starts downloading the full-size image at low priority, ahead of a likely click. */
function prefetchFullSize(image: HTMLImageElement) {
  const prefetch = new Image();
  prefetch.setAttribute('fetchpriority', 'low');
  prefetch.decoding = 'async';
  prefetch.src = image.src;
}

const ImageGallery = ({ children }: PropsWithChildren) => {
  const [slides, setSlides] = useState<SlideImage[]>([]);
  const [index, setIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const prefetchedRef = useRef(new Set<string>());

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = asGalleryImage(event.target);
    if (!target) return;
    const images = Array.from(ref.current?.querySelectorAll<HTMLImageElement>(IMAGE_QUERY_SELECTOR) ?? []);
    const clickedIndex = images.indexOf(target);
    if (clickedIndex < 0) return;
    setSlides(images.map(toSlide));
    setIndex(clickedIndex);
  };

  // Desktop head start: hovering or pressing a mouse/pen on an image fetches its full size.
  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const target = asGalleryImage(event.target);
    if (!target || target.currentSrc === target.src || prefetchedRef.current.has(target.src)) return;
    prefetchedRef.current.add(target.src);
    prefetchFullSize(target);
  };

  const handleFullSizeLoad = useCallback((fullSizeSrc: string, image: HTMLImageElement) => {
    // Zoom limits come from the slide's dimensions: raise them to the full-size image's.
    setSlides((current) =>
      current.map((slide) =>
        slide.fullSizeSrc === fullSizeSrc ? { ...slide, width: image.naturalWidth, height: image.naturalHeight } : slide
      )
    );
  }, []);

  const renderSlide = useCallback(
    ({ slide, offset, rect }: RenderSlideProps) => {
      if (!isImageSlide(slide) || !slide.fullSizeSrc || slide.fullSizeSrc === slide.src) return undefined;
      return (
        <ProgressiveImageSlide
          key={slide.fullSizeSrc}
          slide={slide}
          fullSizeSrc={slide.fullSizeSrc}
          offset={offset}
          rect={rect}
          onFullSizeLoad={handleFullSizeLoad}
        />
      );
    },
    [handleFullSizeLoad]
  );

  return (
    <div>
      <Lightbox
        styles={{ container: { backgroundColor: 'rgba(0, 0, 0, .8)' } }}
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        render={{ slide: renderSlide }}
        plugins={[Fullscreen, Thumbnails, Zoom]}
        controller={{ closeOnBackdropClick: true }}
      />
      <div ref={ref} onClick={handleClick} onPointerOver={handlePointer} onPointerDown={handlePointer}>
        {children}
      </div>
    </div>
  );
};

export default ImageGallery;
