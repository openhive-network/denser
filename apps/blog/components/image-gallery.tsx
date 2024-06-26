import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import Lightbox, { Slide } from 'yet-another-react-lightbox';
import { Fullscreen, Thumbnails, Zoom } from 'yet-another-react-lightbox/plugins';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/styles.css';

const IMAGE_QUERY_SELECTOR = ':not(a) > img';
const ImageGallery = ({ children }: PropsWithChildren) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openOnIndex = (index: number) => {
      return () => setIndex(index);
    };
    const images = ref.current ? ref.current.querySelectorAll<HTMLImageElement>(IMAGE_QUERY_SELECTOR) : [];
    if (images && images.length > 0) {
      setSlides(
        Array.from(images).map((image: HTMLImageElement) => ({
          src: image.src,
          srcSet: [
            {
              src: image.src,
              width: image.width,
              height: image.height
            }
          ]
        }))
      );
      images.forEach((val, i) => {
        val.addEventListener('click', openOnIndex(i));
      });
    }
    return () => {
      images.forEach((val, i) => {
        val.addEventListener('click', openOnIndex(i));
      });
    };
  }, [children]);

  return (
    <div>
      <Lightbox
        styles={{ container: { backgroundColor: 'rgba(0, 0, 0, .8)' } }}
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        plugins={[Fullscreen, Thumbnails, Zoom]}
      />
      <div ref={ref}>{children}</div>
    </div>
  );
};

export default ImageGallery;
