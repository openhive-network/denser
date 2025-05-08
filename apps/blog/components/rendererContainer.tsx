import { useRef, useEffect, useState, useMemo } from 'react';
import Loading from '@ui/components/loading';
import { LeavePageDialog } from './leave-page-dialog';
import { getRenderer } from '../lib/renderer';
import { getLogger } from '@ui/lib/logging';
import ScrollToElement from './scroll-to-element';
import { cn } from '@ui/lib/utils';

const logger = getLogger('app');

const RendererContainer = ({
  body,
  author,
  dataTestid,
  communityDescription,
  mainPost,
  className
}: {
  body: string;
  author: string;
  dataTestid?: string;
  communityDescription?: boolean;
  className?: string;
  mainPost?: Boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const hiveRenderer = getRenderer(author);

  const handleClick = (e: Event) => {
    e.preventDefault();
    const anchor = e.target as HTMLAnchorElement;
    let href = anchor.href;
    if (!href) {
      const parent = anchor.parentElement as HTMLAnchorElement;
      href = parent.href;
    }
    setLink(href);
    setOpen(true);
  };

  useEffect(() => {
    const nodes = ref.current?.querySelectorAll('a.link-external');
    nodes?.forEach((n) => n.addEventListener('click', handleClick));
    const sub = document.querySelectorAll('sub');
    sub?.forEach((e) => {
      e.classList.add('leading-[150%]');
    });
    const threeSpeak = document.querySelectorAll('.threeSpeakWrapper');
    threeSpeak?.forEach((link) => {
      link.classList.add('videoWrapper');
    });
    const paragraphs = ref.current?.querySelectorAll('p');
    if (!mainPost) paragraphs?.forEach((p) => (p.className = 'my-0'));
    if (communityDescription) {
      const elementsWithVideoWrapper = document.querySelectorAll('.videoWrapper');
      elementsWithVideoWrapper.forEach((element) => {
        element.classList.remove('videoWrapper');
      });
      const code_block = ref.current?.querySelectorAll('code');
      code_block?.forEach((c) => (c.className = 'whitespace-normal'));
      const links = ref.current?.querySelectorAll('a');
      links?.forEach((l) => (l.className = ' text-destructive break-words'));
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

  const htmlBody = useMemo(() => {
    if (body) return hiveRenderer.render(body);
  }, [hiveRenderer, body]);

  return !htmlBody ? (
    <Loading loading={false} />
  ) : (
    <>
      <div className="flex h-fit">
        <div
          id="articleBody"
          ref={ref}
          className={cn('prose', className)}
          data-testid={dataTestid}
          dangerouslySetInnerHTML={{
            __html: htmlBody
          }}
        />
      </div>
      <LeavePageDialog link={link} open={open} setOpen={setOpen} />
      {mainPost ? <ScrollToElement rendererRef={ref} /> : null}
    </>
  );
};

export default RendererContainer;
