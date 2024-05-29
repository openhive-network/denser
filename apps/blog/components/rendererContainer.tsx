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
  dataTestid
}: {
  body: string;
  className: string;
  author: string;
  doNotShowImages: boolean;
  dataTestid?: string;
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
    const nodes = ref.current?.querySelectorAll('a.link-external');
    nodes?.forEach((n) => n.addEventListener('click', handleClick));

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
