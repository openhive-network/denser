import { RefObject, useEffect, useState } from 'react';
import { isUrlWhitelisted } from '@hive/ui/config/lists/phishing';

/**
 * Makes the external links of rendered HTML ask before leaving the site: a whitelisted link opens
 * in a new tab, any other one opens the leave-page dialog this returns the state of.
 * `isExternalLink` must be stable across renders.
 */
export function useLeavePageLinks(
  containerRef: RefObject<HTMLElement | null>,
  html: string | undefined,
  isExternalLink: (link: HTMLAnchorElement) => boolean
) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    const handleClick = (e: Event) => {
      e.preventDefault();
      // Use currentTarget (the <a> we registered the listener on) rather than
      // target (whatever element was clicked). target can be a descendant when
      // the link's visible text is wrapped — e.g. Google Translate injects
      // nested <font> tags around translated text — and walking parentElement
      // a fixed number of levels can't reliably reach the anchor.
      if (!(e.currentTarget instanceof HTMLAnchorElement)) return;
      setLink(e.currentTarget.href);
      setOpen(true);
    };

    const links = Array.from(containerRef.current?.querySelectorAll('a') ?? []).filter(isExternalLink);
    links.forEach((n) => {
      const href = n.href || (n.parentElement instanceof HTMLAnchorElement ? n.parentElement.href : '');
      if (isUrlWhitelisted(href)) {
        n.setAttribute('target', '_blank');
      } else {
        n.addEventListener('click', handleClick);
      }
    });
    return () => links.forEach((n) => n.removeEventListener('click', handleClick));
  }, [containerRef, html, isExternalLink]);

  return { link, open, setOpen };
}
