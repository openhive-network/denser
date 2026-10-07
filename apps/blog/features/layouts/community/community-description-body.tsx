'use client';

import { useRef } from 'react';
import { LeavePageDialog } from '../../post-rendering/leave-page-dialog';
import { isLinkSafe } from '../../post-rendering/lib/link-safety';
import { useClientRenderedBody } from '../../post-rendering/hooks/use-client-rendered-body';
import { useLeavePageLinks } from '../../post-rendering/hooks/use-leave-page-links';
import { useResponsiveImageNaturalWidth } from '../../post-rendering/hooks/use-responsive-image-natural-width';
import { useServerRenderedDescription } from './rendered-description-context';

// The description's links carry the sidebar's classes instead of the renderer's `link-external`.
const isExternalLink = (link: HTMLAnchorElement) => {
  const href = link.getAttribute('href')?.trim();
  return !!href && !isLinkSafe(href);
};

/**
 * A community description, as the server rendered it. A description the server didn't render
 * (an admin's edit) loads the renderer and is rendered in the browser.
 */
const CommunityDescriptionBody = ({ description }: { description: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const serverRenderedHtml = useServerRenderedDescription(description);
  const clientRenderedHtml = useClientRenderedBody(serverRenderedHtml ? undefined : description, {
    author: '',
    communityDescription: true
  });
  const html = serverRenderedHtml ?? clientRenderedHtml;
  const { link, open, setOpen } = useLeavePageLinks(ref, html, isExternalLink);
  useResponsiveImageNaturalWidth(ref, html);

  if (!html) return null;
  return (
    <>
      <div className="flex h-fit w-full">
        <div
          id="articleBody"
          ref={ref}
          className="prose w-full"
          data-testid="community-description-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <LeavePageDialog link={link} open={open} setOpen={setOpen} />
    </>
  );
};

export default CommunityDescriptionBody;
