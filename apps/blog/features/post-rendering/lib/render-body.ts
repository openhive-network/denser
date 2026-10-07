import type { DefaultRenderer } from '@hive/renderer';
import { getRenderer, getPreviewRenderer } from './renderer';
import { insertFacadeThumbnails } from './facade-thumbnails';
import { toCommunityDescriptionHtml } from './community-description-html';

export interface RenderBodyOptions {
  author: string;
  permlink?: string;
  /** the page's main post: its LCP candidate (first image or leading video thumbnail) loads first */
  mainPost?: boolean;
  /** a community description: styled for the sidebar, its embeds shown as their URL (see toCommunityDescriptionHtml) */
  communityDescription?: boolean;
  /** editor preview: images bypass the image proxy's whitelist with this token */
  proxyAuthToken?: string;
}

let previewRenderer: { key: string; renderer: DefaultRenderer } | undefined;

// The editor preview re-renders on every keystroke: reuse the renderer built for the same token.
function getCachedPreviewRenderer(token: string, author: string): DefaultRenderer {
  const key = `${token}\n${author}`;
  if (previewRenderer?.key !== key) previewRenderer = { key, renderer: getPreviewRenderer(token, author) };
  return previewRenderer.renderer;
}

/** HTML of a post, comment or community description body (markdown or HTML), ready to display. */
export function renderBody(
  body: string,
  { author, permlink, mainPost = false, communityDescription = false, proxyAuthToken }: RenderBodyOptions
): string {
  const renderer = proxyAuthToken ? getCachedPreviewRenderer(proxyAuthToken, author) : getRenderer(author, mainPost);
  const postContext = author || permlink ? { author, permlink } : undefined;
  const html = renderer.render(body, postContext);
  if (communityDescription) return toCommunityDescriptionHtml(html);
  return insertFacadeThumbnails(html, { prioritizeLeading: mainPost, proxyAuthToken });
}
