'use client';

import { useRef, useEffect, useState, useMemo, memo } from 'react';
import Loading from '@ui/components/loading';
import { LeavePageDialog } from './leave-page-dialog';
import { getRenderer, getPreviewRenderer } from './lib/renderer';
import ScrollToElement from './scroll-to-element';
import { cn } from '@ui/lib/utils';
import { isUrlWhitelisted } from '@hive/ui/config/lists/phishing';

const RendererContainer = ({
  body,
  author,
  permlink,
  dataTestid,
  communityDescription,
  mainPost,
  className,
  previewMode,
  proxyAuthToken
}: {
  body: string;
  author: string;
  permlink?: string;
  dataTestid?: string;
  communityDescription?: boolean;
  className?: string;
  mainPost?: Boolean;
  previewMode?: boolean;
  proxyAuthToken?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const hiveRenderer = useMemo(
    () => proxyAuthToken
      ? getPreviewRenderer(proxyAuthToken, author)
      : getRenderer(author),
    [proxyAuthToken, author]
  );

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

  const handleYoutubeFacadeClick = (e: Event) => {
    const target = e.currentTarget as HTMLElement;
    const videoId = target.dataset.youtubeId;
    const width = target.dataset.width || '640';
    const height = target.dataset.height || '480';
    if (videoId) {
      const iframe = document.createElement('iframe');
      iframe.width = width;
      iframe.height = height;
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      iframe.setAttribute('allowfullscreen', 'allowfullscreen');
      iframe.setAttribute('allow', 'autoplay; encrypted-media');
      iframe.setAttribute('frameborder', '0');
      target.replaceWith(iframe);
    }
  };

  useEffect(() => {
    const nodes = ref.current?.querySelectorAll('a.link-external');
    nodes?.forEach((n) => {
      const href = (n as HTMLAnchorElement).href || (n.parentElement as HTMLAnchorElement)?.href;
      if (isUrlWhitelisted(href)) {
        n.setAttribute('target', '_blank');
      } else {
        n.addEventListener('click', handleClick);
      }
    });
    const youtubeFacades = ref.current?.querySelectorAll('.youtube-facade');
    if (previewMode) {
      youtubeFacades?.forEach((facade) => {
        facade.addEventListener('click', handleYoutubeFacadeClick);
      });
    } else {
      youtubeFacades?.forEach((facade) => {
        const el = facade as HTMLElement;
        const videoId = el.dataset.youtubeId;
        const width = el.dataset.width || '640';
        const height = el.dataset.height || '480';
        if (videoId) {
          const iframe = document.createElement('iframe');
          iframe.width = width;
          iframe.height = height;
          iframe.src = `https://www.youtube.com/embed/${videoId}`;
          iframe.setAttribute('allowfullscreen', 'allowfullscreen');
          iframe.setAttribute('frameborder', '0');
          el.replaceWith(iframe);
        }
      });
    }
    const sub = document.querySelectorAll('sub');
    sub?.forEach((e) => {
      e.classList.add('leading-[150%]');
    });
    const threeSpeak = document.querySelectorAll('.threeSpeakWrapper');
    threeSpeak?.forEach((link) => {
      link.classList.add('videoWrapper');
    });
    // Note: Previously removed margins from paragraphs when !mainPost (preview mode)
    // This caused issue #759 where line breaks/spacing weren't visible in preview
    // Now paragraphs keep their default prose styling in both preview and published view
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
      const facades = ref.current?.querySelectorAll('.youtube-facade');
      facades?.forEach((n) => {
        const videoId = (n as HTMLElement).dataset.youtubeId;
        const srcText = document.createTextNode(`https://www.youtube.com/watch?v=${videoId}`);
        n.replaceWith(srcText);
      });
    }

    const rootEl = ref.current;
    const pluginCleanups: (() => void)[] = [];
    if (rootEl) {
      hiveRenderer.getPlugins().forEach((plugin) => {
        const cleanup = plugin.onMount?.(rootEl);
        if (cleanup) pluginCleanups.push(cleanup);
      });
    }

    return () => {
      pluginCleanups.forEach((cleanup) => cleanup());
      nodes?.forEach((n) => n.removeEventListener('click', handleClick));
      if (previewMode) {
        youtubeFacades?.forEach((facade) => {
          facade.removeEventListener('click', handleYoutubeFacadeClick);
        });
      }
    };
  }, [body, hiveRenderer, previewMode]);

  const htmlBody = useMemo(() => {
    if (body) {
      const postContext = author || permlink ? { author, permlink } : undefined;
      return hiveRenderer.render(body, postContext);
    }
  }, [hiveRenderer, body, author, permlink]);

  return !htmlBody ? (
    <Loading loading={false} />
  ) : (
    <>
      <div className="flex h-fit w-full">
        <div
          id="articleBody"
          ref={ref}
          className={cn('prose w-full', className)}
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

export default memo(RendererContainer);
