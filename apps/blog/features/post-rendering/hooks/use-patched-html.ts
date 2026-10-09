import { RefObject, useLayoutEffect, useRef } from 'react';
import { patchChildren } from '../lib/patch-children';

interface RenderedHtml {
  container: HTMLElement;
  html: string;
  parsed: HTMLElement;
}

function parseHtml(html: string): HTMLElement {
  // An inert document parses like `innerHTML` does but loads no images and runs no handlers.
  const parsed = document.implementation.createHTMLDocument('').createElement('div');
  parsed.innerHTML = html;
  return parsed;
}

/**
 * Renders `html` into the container like `dangerouslySetInnerHTML`, but on later changes replaces
 * only the nodes whose markup changed (see `patchChildren`), so e.g. an unchanged image is not
 * reloaded. The container must not get its children from React. `undefined` leaves it alone.
 */
export function usePatchedHtml(containerRef: RefObject<HTMLElement | null>, html: string | undefined) {
  const renderedRef = useRef<RenderedHtml | null>(null);

  // Runs after every render: the container may have been remounted without `html` changing.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || html === undefined) return;
    const rendered = renderedRef.current;
    if (rendered?.container === container && rendered.html === html) return;

    const parsed = parseHtml(html);
    if (rendered?.container === container) {
      patchChildren(container, rendered.parsed, parsed);
    } else {
      container.replaceChildren(...Array.from(parsed.childNodes, (node) => document.importNode(node, true)));
    }
    renderedRef.current = { container, html, parsed };
  });
}
