import { useRef, useEffect, useContext, useState } from 'react';
import { HiveRendererContext } from './hive-renderer-context';
import Loading from '@ui/components/loading';
import { LeavePageDialog } from './leave-page-dialog';

const RendererContainer = ({ body, className }: { body: string; className: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { hiveRenderer } = useContext(HiveRendererContext);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    const handleClick = (e: Event) => {
      e.preventDefault();
      const anchor = e.target as HTMLAnchorElement;
      setLink(anchor.href);
      setOpen(true);
      console.log(anchor.href);
    };
    const nodes = ref.current?.querySelectorAll('a.link-external');
    nodes?.forEach((n) => n.addEventListener('click', handleClick));

    return () => {
      nodes?.forEach((n) => n.removeEventListener('click', handleClick));
    };
  }, [ref.current, body, hiveRenderer]);

  return !hiveRenderer ? (
    <Loading loading={false} />
  ) : (
    <>
      <div
        id="articleBody"
        ref={ref}
        className={className}
        dangerouslySetInnerHTML={{
          __html: hiveRenderer.render(body)
        }}
      />
      <LeavePageDialog link={link} open={open} setOpen={setOpen} />
    </>
  );
};

export default RendererContainer;
