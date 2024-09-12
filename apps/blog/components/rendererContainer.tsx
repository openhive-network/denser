import { useRef, useEffect, useState, useMemo } from 'react';
import Loading from '@ui/components/loading';
import { LeavePageDialog } from './leave-page-dialog';
import { getRenderer } from '../lib/renderer';
import { getLogger } from '@ui/lib/logging';
import ScrollToElement from './scroll-to-element';
import { cn } from '@ui/lib/utils';

const logger = getLogger('app');
export const classNamesGeneral = cn(
  'text-primary prose-headings:text-primary prose-a:text-destructive prose-blockquote:text-primary/70 prose-strong:text-primary prose-code:bg-background-secondary prose-code:text-primary/70 prose-pre:bg-background-secondary prose-table:border-secondary prose-tr:bg-background-secondary even:prose-tr:bg-background prose-th:text-primary prose-td:border-secondary', // colors
  'font-source prose-code:font-consolas', // family font
  'prose-headings:font-semibold prose-a:font-normal prose-blockquote:font-normal prose-code:font-normal', // fonts weight
  'prose-code:text-[14.4px] prose-td:text-[16.3px]', //font size
  'prose-headings:mb-1 prose-headings:mt-10 prose-blockquote:m-0 prose-blockquote:mb-4 prose-blockquote:px-5 prose-blockquote:pt-2 prose-code:p-[3px] prose-pre:m-0 prose-pre:p-0 prose-ol:mb-4 prose-ol:ml-3 prose-ol:mt-0 prose-ul:mb-4 prose-ul:ml-3 prose-ul:mt-0 prose-li:m-0 prose-li:p-0 prose-table:mb-[16px] prose-td:px-[6.4px] prose-td:py-1 prose-img:mb-[10px] prose-img:mt-0 prose-hr:my-5', // spacing
  'prose-table:verflow-x-auto prose max-w-full prose-a:whitespace-pre-wrap prose-a:break-words prose-a:no-underline prose-blockquote:-indent-[3px] prose-code:break-words prose-code:-indent-[3px] prose-code:leading-[19px] prose-pre:-indent-[3px] prose-table:border-collapse prose-table:border prose-td:border prose-td:align-middle' // general
);

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
  className: string;
  mainPost?: Boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const hiveRenderer = getRenderer(author);

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
    const paragraphs = ref.current?.querySelectorAll('p');
    if (!mainPost) paragraphs?.forEach((p) => (p.className = 'my-0'));
    if (communityDescription) {
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
      <div
        id="articleBody"
        ref={ref}
        className={cn(classNamesGeneral, className)}
        data-testid={dataTestid}
        dangerouslySetInnerHTML={{
          __html: htmlBody
        }}
      />
      <LeavePageDialog link={link} open={open} setOpen={setOpen} />
      {mainPost ? <ScrollToElement rendererRef={ref} /> : null}
    </>
  );
};

export default RendererContainer;
