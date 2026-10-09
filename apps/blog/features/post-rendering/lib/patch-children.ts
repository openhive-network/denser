interface PatchContext {
  /** Live images the patch took out of the DOM, by the markup they were rendered from. */
  removedImages: Map<string, Element[]>;
  /** Placeholders standing in for the images of inserted markup until the patch is done. */
  pendingImages: { placeholder: Comment; image: Element }[];
}

function haveSameAttributes(a: Element, b: Element): boolean {
  if (a.attributes.length !== b.attributes.length) return false;
  return Array.from(a.attributes).every((attr) => b.getAttribute(attr.name) === attr.value);
}

function isSameElementShell(previous: Element, next: Element): boolean {
  return previous.nodeName === next.nodeName && haveSameAttributes(previous, next);
}

function imagesIn(node: Node): Element[] {
  if (!(node instanceof Element)) return [];
  return node.matches('img') ? [node] : Array.from(node.querySelectorAll('img'));
}

function deferImage(image: Element, context: PatchContext): Comment {
  const placeholder = document.createComment('');
  context.pendingImages.push({ placeholder, image });
  return placeholder;
}

/**
 * Moves a copy of parsed markup into the live document with its images left out, so none
 * starts loading before `resolvePendingImages` can put back an existing node instead.
 */
function importMarkup(node: Node, context: PatchContext): Node {
  if (node instanceof Element && node.matches('img')) return deferImage(node, context);
  const copy = node.cloneNode(true);
  imagesIn(copy).forEach((image) => image.replaceWith(deferImage(image, context)));
  return document.adoptNode(copy);
}

function removeLiveNode(liveNode: Node, previousNode: Node, context: PatchContext): void {
  const liveImages = imagesIn(liveNode);
  const previousImages = imagesIn(previousNode);
  if (liveImages.length === previousImages.length) {
    previousImages.forEach((image, index) => {
      const markup = image.outerHTML;
      context.removedImages.set(markup, [...(context.removedImages.get(markup) ?? []), liveImages[index]]);
    });
  }
  liveNode.parentNode?.removeChild(liveNode);
}

function resolvePendingImages(context: PatchContext): void {
  context.pendingImages.forEach(({ placeholder, image }) => {
    const removed = context.removedImages.get(image.outerHTML)?.shift();
    placeholder.replaceWith(removed ?? document.importNode(image, true));
  });
}

function patchChildNodes(live: Element, previous: Element, next: Element, context: PatchContext): void {
  const liveNodes = Array.from(live.childNodes);
  const previousNodes = Array.from(previous.childNodes);
  const nextNodes = Array.from(next.childNodes);

  if (liveNodes.length !== previousNodes.length) {
    live.replaceChildren(...nextNodes.map((node) => importMarkup(node, context)));
    return;
  }

  let start = 0;
  while (
    start < previousNodes.length &&
    start < nextNodes.length &&
    previousNodes[start].isEqualNode(nextNodes[start])
  ) {
    start++;
  }
  let previousEnd = previousNodes.length;
  let nextEnd = nextNodes.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previousNodes[previousEnd - 1].isEqualNode(nextNodes[nextEnd - 1])
  ) {
    previousEnd--;
    nextEnd--;
  }

  const insertionPoint = liveNodes[previousEnd] ?? null;
  const pairedCount = Math.min(previousEnd, nextEnd) - start;
  for (let offset = 0; offset < pairedCount; offset++) {
    const index = start + offset;
    const liveNode = liveNodes[index];
    const previousNode = previousNodes[index];
    const nextNode = nextNodes[index];
    if (
      liveNode instanceof Element &&
      previousNode instanceof Element &&
      nextNode instanceof Element &&
      liveNode.nodeName === previousNode.nodeName &&
      isSameElementShell(previousNode, nextNode)
    ) {
      patchChildNodes(liveNode, previousNode, nextNode, context);
    } else {
      live.insertBefore(importMarkup(nextNode, context), liveNode);
      removeLiveNode(liveNode, previousNode, context);
    }
  }
  for (let index = start + pairedCount; index < previousEnd; index++) {
    removeLiveNode(liveNodes[index], previousNodes[index], context);
  }
  nextNodes
    .slice(start + pairedCount, nextEnd)
    .forEach((node) => live.insertBefore(importMarkup(node, context), insertionPoint));
}

/**
 * Turns the children of `live` from the markup of `previous` into the markup of `next`, replacing
 * only the nodes that differ. A node whose markup did not change keeps its DOM node, including any
 * state added to it after insertion (listeners, inline styles, a loaded image), and a changed
 * element whose own tag and attributes are unchanged is patched recursively. An image removed in
 * one place and inserted with the same markup in another (e.g. when its paragraph is split) is
 * moved rather than recreated. Every change is a child-list mutation, so a `childList`
 * MutationObserver sees it.
 *
 * `previous` and `next` must be parsed in an inert document, so copying them loads nothing.
 * `live` must hold the DOM
 * `previous` was rendered into: where its children no longer correspond one to one to those of
 * `previous`, they are all replaced by those of `next`.
 */
export function patchChildren(live: Element, previous: Element, next: Element): void {
  const context: PatchContext = { removedImages: new Map(), pendingImages: [] };
  patchChildNodes(live, previous, next, context);
  resolvePendingImages(context);
}
