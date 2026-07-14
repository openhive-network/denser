'use client';

import { useRef, useEffect, useState, useMemo, memo } from 'react';
import Loading from '@ui/components/loading';
import { LeavePageDialog } from './leave-page-dialog';
import { getRenderer, getPreviewRenderer } from './lib/renderer';
import ScrollToElement from './scroll-to-element';
import { cn } from '@ui/lib/utils';
import { isUrlWhitelisted } from '@hive/ui/config/lists/phishing';
import { proxifyImageSrc } from '@ui/lib/proxify-images';

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

  // Build the player iframe for a clicked facade.
  // Defense-in-depth (issue #934): `sandbox` without allow-top-navigation* so a
  // compromised-but-allowlisted provider cannot redirect the reader; allow-popups is
  // needed for the players' own "watch on provider" links to work (still cannot
  // navigate this tab). `referrerpolicy=origin` discloses only the site origin, not
  // which post is open - YouTube refuses to play embeds with a blank referrer
  // (error 153 "player configuration error"), so no-referrer is not an option.
  const createEmbedIframe = (src: string, width: string, height: string) => {
    const iframe = document.createElement('iframe');
    iframe.width = width;
    iframe.height = height;
    iframe.src = src;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'allowfullscreen');
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    iframe.setAttribute('referrerpolicy', 'origin');
    iframe.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox'
    );
    return iframe;
  };

  const activateFacade = (el: HTMLElement) => {
    const width = el.dataset.width || '640';
    const height = el.dataset.height || '480';
    const youtubeId = el.dataset.youtubeId;
    const threespeakId = el.dataset.threespeakId;
    let src = '';
    if (youtubeId) {
      src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
    } else if (threespeakId) {
      src = `https://play.3speak.tv/watch?v=${threespeakId}&mode=iframe&layout=desktop&autoplay=1`;
    }
    if (!src) return;
    el.replaceWith(createEmbedIframe(src, width, height));
  };

  const handleFacadeClick = (e: Event) => {
    e.preventDefault();
    activateFacade(e.currentTarget as HTMLElement);
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

    // Click-to-load facades (YouTube + 3Speak): no third-party network contact until the
    // reader clicks play. Thumbnails (YouTube) are loaded *proxied* through the image proxy
    // so even the preview image is not a direct third-party request. Issue #934.
    const facades = ref.current?.querySelectorAll('.embed-facade');
    if (!communityDescription) {
      facades?.forEach((facade) => {
        const el = facade as HTMLElement;
        const thumb = el.dataset.thumb;
        if (thumb && !el.querySelector('img')) {
          const img = document.createElement('img');
          img.src = proxifyImageSrc(thumb, 1536, 0, 'match', proxyAuthToken);
          img.alt = '';
          img.loading = 'lazy';
          el.insertBefore(img, el.firstChild);
        }
        el.addEventListener('click', handleFacadeClick);
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
      const descFacades = ref.current?.querySelectorAll('.embed-facade');
      descFacades?.forEach((n) => {
        const el = n as HTMLElement;
        const srcText = el.dataset.youtubeId
          ? document.createTextNode(`https://www.youtube.com/watch?v=${el.dataset.youtubeId}`)
          : document.createTextNode(`https://play.3speak.tv/watch?v=${el.dataset.threespeakId}`);
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
      facades?.forEach((facade) => facade.removeEventListener('click', handleFacadeClick));
    };
  }, [body, hiveRenderer, previewMode, communityDescription, proxyAuthToken]);

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
