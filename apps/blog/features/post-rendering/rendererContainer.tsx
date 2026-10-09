'use client';

import { useRef, useEffect, memo } from 'react';
import Loading from '@ui/components/loading';
import { LeavePageDialog } from './leave-page-dialog';
import { RENDERER_PLUGINS } from './lib/renderer-plugins';
import ScrollToElement from './scroll-to-element';
import { cn } from '@ui/lib/utils';
import FirstBodyImagePreload from './first-body-image-preload';
import { useResponsiveImageNaturalWidth } from './hooks/use-responsive-image-natural-width';
import { useClientRenderedBody } from './hooks/use-client-rendered-body';
import { useServerRenderedBody } from './rendered-bodies-context';
import { useLeavePageLinks } from './hooks/use-leave-page-links';
import { usePatchedHtml } from './hooks/use-patched-html';

const isExternalLink = (link: HTMLAnchorElement) => link.classList.contains('link-external');

const RendererContainer = ({
  body,
  author,
  permlink,
  dataTestid,
  mainPost,
  className,
  previewMode,
  proxyAuthToken
}: {
  body: string;
  author: string;
  permlink?: string;
  dataTestid?: string;
  className?: string;
  mainPost?: Boolean;
  previewMode?: boolean;
  proxyAuthToken?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const serverRenderedHtml = useServerRenderedBody(author, permlink, body, Boolean(mainPost));
  const prerenderedHtml = proxyAuthToken ? undefined : serverRenderedHtml;
  const clientRenderedHtml = useClientRenderedBody(prerenderedHtml ? undefined : body, {
    author,
    permlink,
    mainPost: Boolean(mainPost),
    proxyAuthToken
  });
  const htmlBody = prerenderedHtml ?? clientRenderedHtml;
  const { link, open, setOpen } = useLeavePageLinks(ref, htmlBody, isExternalLink);

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
    const vimeoId = el.dataset.vimeoId;
    const twitchId = el.dataset.twitchId;
    let src = '';
    if (youtubeId) {
      src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
    } else if (threespeakId) {
      src = `https://play.3speak.tv/watch?v=${threespeakId}&mode=iframe&layout=desktop&autoplay=1`;
    } else if (vimeoId) {
      src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    } else if (twitchId) {
      // player.twitch.tv refuses to play without the embedding site's hostname as parent=
      src = `https://player.twitch.tv/${twitchId}&parent=${window.location.hostname}&autoplay=true`;
    }
    if (!src) return;
    el.replaceWith(createEmbedIframe(src, width, height));
  };

  const handleFacadeClick = (e: Event) => {
    e.preventDefault();
    activateFacade(e.currentTarget as HTMLElement);
  };

  useEffect(() => {
    // Click-to-load facades (YouTube + 3Speak): no third-party network contact until the
    // reader clicks play. Issue #934.
    const facades = ref.current?.querySelectorAll('.embed-facade');
    facades?.forEach((facade) => facade.addEventListener('click', handleFacadeClick));

    const sub = ref.current?.querySelectorAll('sub');
    sub?.forEach((e) => {
      e.classList.add('leading-[150%]');
    });
    const threeSpeak = ref.current?.querySelectorAll('.threeSpeakWrapper');
    threeSpeak?.forEach((link) => {
      link.classList.add('videoWrapper');
    });
    // Note: Previously removed margins from paragraphs when !mainPost (preview mode)
    // This caused issue #759 where line breaks/spacing weren't visible in preview
    // Now paragraphs keep their default prose styling in both preview and published view
    const rootEl = ref.current;
    const pluginCleanups: (() => void)[] = [];
    if (rootEl) {
      RENDERER_PLUGINS.forEach((plugin) => {
        const cleanup = plugin.onMount?.(rootEl);
        if (cleanup) pluginCleanups.push(cleanup);
      });
    }

    return () => {
      pluginCleanups.forEach((cleanup) => cleanup());
      facades?.forEach((facade) => facade.removeEventListener('click', handleFacadeClick));
    };
  }, [htmlBody, previewMode]);

  useResponsiveImageNaturalWidth(ref, htmlBody);
  // The live preview re-renders on every keystroke: patch it so unchanged images are not reloaded.
  usePatchedHtml(ref, previewMode ? htmlBody : undefined);

  return !htmlBody ? (
    <Loading loading={false} />
  ) : (
    <>
      {mainPost ? <FirstBodyImagePreload html={htmlBody} /> : null}
      <div className="flex h-fit w-full">
        <div
          id="articleBody"
          ref={ref}
          className={cn('prose w-full', className)}
          data-testid={dataTestid}
          dangerouslySetInnerHTML={previewMode ? undefined : { __html: htmlBody }}
        />
      </div>
      <LeavePageDialog link={link} open={open} setOpen={setOpen} />
      {mainPost ? <ScrollToElement rendererRef={ref} /> : null}
    </>
  );
};

export default memo(RendererContainer);
