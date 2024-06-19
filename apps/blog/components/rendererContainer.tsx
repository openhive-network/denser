import { useRef, useEffect, useState } from 'react';
import Loading from '@ui/components/loading';
import { LeavePageDialog } from './leave-page-dialog';
import { getRenderer } from '../lib/renderer';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const RendererContainer = ({
  body,
  className,
  author,
  doNotShowImages,
  dataTestid,
  communityDescription
}: {
  body: string;
  className: string;
  author: string;
  doNotShowImages: boolean;
  dataTestid?: string;
  communityDescription?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const hiveRenderer = getRenderer(author, doNotShowImages);

  const handleClick = (e: Event) => {
    e.preventDefault();
    const anchor = e.target as HTMLAnchorElement;
    setLink(anchor.href);
    setOpen(true);
  };

  useEffect(() => {
    const elementsWithVideoWrapper = document.querySelectorAll('.videoWrapper');
    elementsWithVideoWrapper.forEach((element) => {
      element.classList.remove('videoWrapper');
    });
    const nodes = ref.current?.querySelectorAll('a.link-external');
    nodes?.forEach((n) => n.addEventListener('click', handleClick));

    if (communityDescription) {
      const code_block = ref.current?.querySelectorAll('code');
      code_block?.forEach((c) => (c.className = 'whitespace-normal'));
      // const links = ref.current?.querySelectorAll('a');
      // links?.forEach((l) => {
      //   l.addEventListener('click', handleClick), (l.className = 'break-all');
      // });
      const iframes = ref.current?.querySelectorAll('iframe');
      iframes?.forEach((n) => {
        const srcText = document.createTextNode(n.src);
        n.replaceWith(srcText);
      });
    }

    return () => {
      nodes?.forEach((n) => n.removeEventListener('click', handleClick));
    };
  }, [body, hiveRenderer]);

  return !hiveRenderer || !body ? (
    <Loading loading={false} />
  ) : (
    <>
      <div
        id="articleBody"
        ref={ref}
        className={className}
        data-testid={dataTestid}
        dangerouslySetInnerHTML={{
          __html: hiveRenderer.render(body)
        }}
      />
      <LeavePageDialog link={link} open={open} setOpen={setOpen} />
    </>
  );
};

export default RendererContainer;
