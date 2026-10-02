import { CSSProperties, useState } from 'react';
import { ContainerRect, ImageSlide, SlideImage } from 'yet-another-react-lightbox';

const HIDDEN_STYLE: CSSProperties = { position: 'absolute', visibility: 'hidden' };
const NO_STATUS_ICONS = { iconLoading: () => null, iconError: () => null };

interface ProgressiveImageSlideProps {
  /** slide showing the already-downloaded inline image */
  slide: SlideImage;
  fullSizeSrc: string;
  offset: number;
  rect: ContainerRect;
  onFullSizeLoad: (fullSizeSrc: string, image: HTMLImageElement) => void;
}

/**
 * Lightbox slide that paints the inline image straight from the browser cache, loads the
 * full-size image behind it while the slide is current, and swaps to it once it has loaded.
 */
export default function ProgressiveImageSlide({
  slide,
  fullSizeSrc,
  offset,
  rect,
  onFullSizeLoad
}: ProgressiveImageSlideProps) {
  const [fullSizeLoaded, setFullSizeLoaded] = useState(false);

  const handleFullSizeLoad = (image: HTMLImageElement) => {
    setFullSizeLoaded(true);
    onFullSizeLoad(fullSizeSrc, image);
  };

  return (
    <>
      {fullSizeLoaded ? null : <ImageSlide slide={slide} offset={offset} rect={rect} render={NO_STATUS_ICONS} />}
      {offset === 0 || fullSizeLoaded ? (
        <ImageSlide
          slide={{ ...slide, src: fullSizeSrc }}
          offset={offset}
          rect={rect}
          render={NO_STATUS_ICONS}
          style={fullSizeLoaded ? undefined : HIDDEN_STYLE}
          onLoad={handleFullSizeLoad}
        />
      ) : null}
    </>
  );
}
