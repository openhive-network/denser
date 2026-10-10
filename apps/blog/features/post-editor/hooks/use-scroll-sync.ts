"use client";

import { MutableRefObject, RefObject, useEffect, useRef } from "react";
import { alignBlockKinds, blockAnchorPairs, type BlockKind, type Span } from "../lib/scroll-sync-anchors";

interface UseScrollSyncParams {
  editorContainerRef: RefObject<HTMLDivElement | null>;
  previewContainerRef: RefObject<HTMLDivElement | null>;
  syncScroll: boolean;
  effectiveSideBySide: boolean;
  preview: boolean;
  previewContent: string | undefined;
}

/**
 * Sets `el.scrollTop` programmatically and remembers the resulting position in
 * `echoRef`, so the scroll event this write produces (dispatched on the next
 * frame) can be recognised as our own echo and ignored. Nothing is recorded
 * when the position does not change, because then no scroll event follows.
 */
function setScrollTopTracked(
  el: HTMLElement,
  target: number,
  echoRef: MutableRefObject<number | null>
) {
  const before = el.scrollTop;
  el.scrollTop = target;
  const after = el.scrollTop;
  echoRef.current = after !== before ? after : null;
}

/**
 * Returns true when the pane's current scroll event is the echo of our own
 * programmatic write (see setScrollTopTracked). The marker is consumed either
 * way, so a genuine user scroll is never swallowed by a stale marker.
 */
function consumeScrollEcho(el: HTMLElement, echoRef: MutableRefObject<number | null>): boolean {
  const expected = echoRef.current;
  echoRef.current = null;
  return expected !== null && el.scrollTop === expected;
}

const PREVIEW_BLOCK_KINDS: Record<string, BlockKind> = {
  H1: "heading",
  H2: "heading",
  H3: "heading",
  H4: "heading",
  H5: "heading",
  H6: "heading",
  P: "paragraph",
  PRE: "code",
  UL: "list",
  OL: "list",
  BLOCKQUOTE: "quote",
  TABLE: "table",
  HR: "hr",
  CENTER: "html",
  DIV: "html",
  FIGURE: "html",
};

/** Kind of a top-level preview element, or null when it is not a block. */
function previewBlockKind(el: HTMLElement): BlockKind | null {
  const kind = PREVIEW_BLOCK_KINDS[el.tagName] ?? null;
  if (kind === "paragraph" && !el.textContent?.trim() && el.querySelector("img")) return "image";
  return kind;
}

const IMAGE_LINE = /^!\[/;
// Markdown image or raw <img>; a line holding more than one is left unanchored,
// since its images may render side by side.
const IMAGE_SOURCE = /!\[[^\]]*\]\(|<img[\s>]/gi;

/** Kind of a single-line editor block that none of the multi-line rules took. */
function singleLineKind(trimmed: string): BlockKind {
  if (trimmed.startsWith("#")) return "heading";
  if (/^(---|\*\*\*|___)$/.test(trimmed)) return "hr";
  if (trimmed.startsWith("<")) return "html";
  return "paragraph";
}

/**
 * Manages bidirectional scroll sync between CodeMirror editor and preview panel.
 * Uses block-level anchor mapping for proportional scroll: editor blocks
 * (separated by blank lines) are aligned in document order with preview
 * blocks (top-level HTML elements) of a compatible kind, then scroll positions
 * are interpolated between anchors. Matching by order rather than by relative
 * position keeps tall preview blocks such as images from skewing the map.
 */
export function useScrollSync({
  editorContainerRef,
  previewContainerRef,
  syncScroll,
  effectiveSideBySide,
  preview,
  previewContent,
}: UseScrollSyncParams) {
  // Scroll positions we last wrote to each pane, used to ignore the echo
  // scroll events of our own writes. This is per pane on purpose: a shared
  // "currently syncing" flag also swallowed genuine scrolls of the *other*
  // pane that arrived within a frame of a sync, leaving the panes out of step
  // (issue #963).
  const previewEchoRef = useRef<number | null>(null);
  const editorEchoRef = useRef<number | null>(null);
  const editorRafIdRef = useRef<number | null>(null);
  const previewRafIdRef = useRef<number | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  // Briefly locks preview->editor scroll sync while RendererContainer re-renders,
  // preventing its DOM replacement from firing a scroll event that jumps the editor.
  const scrollLockRef = useRef(false);

  // Auto-scroll preview to bottom when typing at the end of editor (debounced)
  useEffect(() => {
    if (!syncScroll || !effectiveSideBySide || !preview) return;

    const timeoutId = setTimeout(() => {
      const editorScrollArea = editorContainerRef.current?.querySelector(
        ".cm-scroller"
      ) as HTMLDivElement | null;
      const previewEl = previewContainerRef.current;

      if (!editorScrollArea || !previewEl) return;

      const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
      const isNearBottom = maxEditorScroll <= 0 || editorScrollArea.scrollTop >= maxEditorScroll - 50;

      if (isNearBottom) {
        setScrollTopTracked(previewEl, previewEl.scrollHeight, previewEchoRef);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [previewContent, syncScroll, effectiveSideBySide, preview]);

  // Lock preview->editor scroll sync briefly when preview DOM is replaced.
  useEffect(() => {
    if (!previewContent) return;
    scrollLockRef.current = true;
    const id = setTimeout(() => {
      scrollLockRef.current = false;
    }, 150);
    return () => {
      clearTimeout(id);
      scrollLockRef.current = false;
    };
  }, [previewContent]);

  // Set up scroll sync event listeners (optimized for large content)
  useEffect(() => {
    if (!syncScroll || !effectiveSideBySide || !preview) return;

    const previewEl = previewContainerRef.current;
    if (!previewEl) return;

    const setupScrollSync = (editorScrollArea: HTMLDivElement) => {
      let editorAnchors: number[] | null = null;
      let previewAnchors: number[] | null = null;
      let mapDirty = true;

      // Measured from layout boxes rather than offsetTop: the panes are not
      // positioned, so an offsetParent chain runs past them up to <body>.
      const getOffsetIn = (el: HTMLElement, container: HTMLElement): number =>
        el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;

      const buildMap = () => {
        const cmContent = editorScrollArea.querySelector(".cm-content") as HTMLElement | null;
        const proseContainer = previewEl.querySelector(".prose") as HTMLElement | null;
        if (!cmContent || !proseContainer) {
          editorAnchors = null;
          return;
        }

        const cmLines = Array.from(cmContent.querySelectorAll(":scope > .cm-line")) as HTMLElement[];
        if (!cmLines.length) {
          editorAnchors = null;
          return;
        }

        interface LineGroup {
          kind: BlockKind;
          editorTop: number;
          editorBottom: number;
        }
        const groups: LineGroup[] = [];

        // Text and image lines; without a blank line between them they form one
        // markdown paragraph, e.g. an image with its caption on the next line.
        const isParagraphLine = (t: string) =>
          !t.startsWith("#") &&
          !/^(---|\*\*\*|___)$/.test(t) &&
          !/^[-*+]\s|^\d+[.)]\s/.test(t) &&
          !t.startsWith(">") &&
          !(t.startsWith("|") && t.includes("|", 1)) &&
          !t.startsWith("<") &&
          !t.startsWith("```");

        let idx = 0;
        while (idx < cmLines.length) {
          const line = cmLines[idx];
          const text = line.textContent || "";
          const trimmed = text.trim();

          if (!trimmed) {
            idx++;
            continue;
          }

          // Code fence: ``` ... ```
          if (trimmed.startsWith("```")) {
            const startLine = cmLines[idx];
            let endLine = cmLines[idx];
            idx++;
            while (idx < cmLines.length) {
              endLine = cmLines[idx];
              const closingCheck = (cmLines[idx].textContent || "").trim();
              idx++;
              if (closingCheck.startsWith("```")) break;
            }
            groups.push({
              kind: "code",
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // List items
          if (/^[-*+]\s|^\d+[.)]\s/.test(trimmed)) {
            const startLine = cmLines[idx];
            let endLine = cmLines[idx];
            idx++;
            while (idx < cmLines.length) {
              const t = (cmLines[idx].textContent || "").trim();
              if (/^[-*+]\s|^\d+[.)]\s/.test(t)) {
                endLine = cmLines[idx];
                idx++;
              } else if (!t) {
                if (
                  idx + 1 < cmLines.length &&
                  /^[-*+]\s|^\d+[.)]\s/.test((cmLines[idx + 1].textContent || "").trim())
                ) {
                  idx++;
                } else {
                  break;
                }
              } else if (t && /^\s/.test(cmLines[idx].textContent || "")) {
                endLine = cmLines[idx];
                idx++;
              } else {
                break;
              }
            }
            groups.push({
              kind: "list",
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // Blockquote
          if (trimmed.startsWith(">")) {
            const startLine = cmLines[idx];
            let endLine = cmLines[idx];
            idx++;
            while (idx < cmLines.length) {
              const t = (cmLines[idx].textContent || "").trim();
              if (t.startsWith(">")) {
                endLine = cmLines[idx];
                idx++;
              } else break;
            }
            groups.push({
              kind: "quote",
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // Table
          if (trimmed.startsWith("|") && trimmed.includes("|", 1)) {
            const startLine = cmLines[idx];
            let endLine = cmLines[idx];
            idx++;
            while (idx < cmLines.length) {
              const t = (cmLines[idx].textContent || "").trim();
              if (t.startsWith("|") && t.includes("|", 1)) {
                endLine = cmLines[idx];
                idx++;
              } else break;
            }
            groups.push({
              kind: "table",
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // HTML block: <center>, <div>
          const htmlBlockMatch = trimmed.match(/^<(center|div)[\s>]/i);
          if (htmlBlockMatch) {
            const tag = htmlBlockMatch[1].toLowerCase();
            const closingTag = `</${tag}>`;
            const startLine = cmLines[idx];
            let endLine = cmLines[idx];
            if (!trimmed.toLowerCase().includes(closingTag)) {
              idx++;
              while (idx < cmLines.length) {
                endLine = cmLines[idx];
                const t = (cmLines[idx].textContent || "").toLowerCase();
                idx++;
                if (t.includes(closingTag)) break;
              }
            } else {
              idx++;
            }
            groups.push({
              kind: "html",
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // Paragraph continuation
          if (isParagraphLine(trimmed)) {
            const startLine = cmLines[idx];
            let endLine = cmLines[idx];
            let imagesOnly = IMAGE_LINE.test(trimmed);
            idx++;
            while (idx < cmLines.length) {
              const nextTrimmed = (cmLines[idx].textContent || "").trim();
              if (!nextTrimmed) break;
              if (!isParagraphLine(nextTrimmed)) break;
              imagesOnly &&= IMAGE_LINE.test(nextTrimmed);
              endLine = cmLines[idx];
              idx++;
            }
            groups.push({
              kind: imagesOnly ? "image" : "paragraph",
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // Single line: heading, image, HR, etc.
          groups.push({
            kind: singleLineKind(trimmed),
            editorTop: getOffsetIn(line, editorScrollArea),
            editorBottom: getOffsetIn(line, editorScrollArea) + line.offsetHeight,
          });
          idx++;
        }

        // Phase 2: Align groups with preview block elements
        const previewBlocks: HTMLElement[] = [];
        const previewKinds: BlockKind[] = [];
        for (const child of Array.from(proseContainer.children) as HTMLElement[]) {
          const kind = previewBlockKind(child);
          if (kind) {
            previewBlocks.push(child);
            previewKinds.push(kind);
          }
        }

        const pairs = alignBlockKinds(groups.map((g) => g.kind), previewKinds);

        const editorImageLines = cmLines.flatMap((line) => {
          const imageCount = (line.textContent || "").match(IMAGE_SOURCE)?.length ?? 0;
          if (!imageCount) return [];
          const top = getOffsetIn(line, editorScrollArea);
          return [{ top, bottom: top + line.offsetHeight, imageCount }];
        });
        const measureImages = (block: HTMLElement): Span[] =>
          (Array.from(block.querySelectorAll("img")) as HTMLElement[]).map((img) => {
            const top = getOffsetIn(img, previewEl);
            return { top, bottom: top + img.getBoundingClientRect().height };
          });

        // Phase 3: Build anchor arrays from each block's edges and its images' edges
        const eAnchors: number[] = [0];
        const pAnchors: number[] = [0];

        for (const [groupIdx, blockIdx] of pairs) {
          const g = groups[groupIdx];
          const block = previewBlocks[blockIdx];
          const blockTop = getOffsetIn(block, previewEl);
          const groupImages = editorImageLines.filter(
            (line) => line.top >= g.editorTop && line.top < g.editorBottom
          );
          const editorImages = groupImages.every((line) => line.imageCount === 1) ? groupImages : [];

          const anchorPairs = blockAnchorPairs(
            { top: g.editorTop, bottom: g.editorBottom },
            { top: blockTop, bottom: blockTop + block.offsetHeight },
            editorImages,
            editorImages.length ? measureImages(block) : []
          );
          for (const [editorOffset, previewOffset] of anchorPairs) {
            eAnchors.push(editorOffset);
            pAnchors.push(previewOffset);
          }
        }

        const maxE = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
        const maxP = previewEl.scrollHeight - previewEl.clientHeight;
        if (maxE > 0) eAnchors.push(maxE);
        if (maxP > 0) pAnchors.push(maxP);

        editorAnchors = eAnchors;
        previewAnchors = pAnchors;
        mapDirty = false;
      };

      const interpolate = (scrollTop: number, src: number[], tgt: number[]): number => {
        let i = 0;
        while (i < src.length - 1 && src[i + 1] <= scrollTop) i++;
        if (i >= src.length - 1) return tgt[tgt.length - 1];
        const s0 = src[i],
          s1 = src[i + 1];
        const t0 = tgt[i],
          t1 = tgt[i + 1];
        if (s1 === s0) return t0;
        const t = (scrollTop - s0) / (s1 - s0);
        return t0 + t * (t1 - t0);
      };

      const markDirty = () => {
        mapDirty = true;
      };
      const previewMutObs = new MutationObserver(markDirty);
      previewMutObs.observe(previewEl, { childList: true, subtree: true });
      previewEl.addEventListener("load", markDirty, { capture: true });

      const handleEditorScroll = () => {
        if (consumeScrollEcho(editorScrollArea, editorEchoRef) || editorRafIdRef.current) return;

        editorRafIdRef.current = requestAnimationFrame(() => {
          editorRafIdRef.current = null;
          if (mapDirty) buildMap();

          const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
          const maxPreviewScroll = previewEl.scrollHeight - previewEl.clientHeight;
          if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

          const target =
            editorAnchors && previewAnchors && editorAnchors.length > 2
              ? interpolate(editorScrollArea.scrollTop, editorAnchors, previewAnchors)
              : (editorScrollArea.scrollTop / maxEditorScroll) * maxPreviewScroll;
          setScrollTopTracked(previewEl, target, previewEchoRef);
        });
      };

      const handlePreviewScroll = () => {
        if (consumeScrollEcho(previewEl, previewEchoRef)) return;
        if (scrollLockRef.current || previewRafIdRef.current) return;

        previewRafIdRef.current = requestAnimationFrame(() => {
          previewRafIdRef.current = null;
          if (mapDirty) buildMap();

          const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
          const maxPreviewScroll = previewEl.scrollHeight - previewEl.clientHeight;
          if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

          const target =
            previewAnchors && editorAnchors && previewAnchors.length > 2
              ? interpolate(previewEl.scrollTop, previewAnchors, editorAnchors)
              : (previewEl.scrollTop / maxPreviewScroll) * maxEditorScroll;
          setScrollTopTracked(editorScrollArea, target, editorEchoRef);
        });
      };

      editorScrollArea.addEventListener("scroll", handleEditorScroll, { passive: true });
      previewEl.addEventListener("scroll", handlePreviewScroll, { passive: true });

      scrollCleanupRef.current = () => {
        if (editorRafIdRef.current) cancelAnimationFrame(editorRafIdRef.current);
        if (previewRafIdRef.current) cancelAnimationFrame(previewRafIdRef.current);
        editorRafIdRef.current = null;
        previewRafIdRef.current = null;
        previewMutObs.disconnect();
        previewEl.removeEventListener("load", markDirty, { capture: true });
        editorScrollArea.removeEventListener("scroll", handleEditorScroll);
        previewEl.removeEventListener("scroll", handlePreviewScroll);
      };
    };

    const existingScroller = editorContainerRef.current?.querySelector(
      ".cm-scroller"
    ) as HTMLDivElement | null;

    if (existingScroller) {
      setupScrollSync(existingScroller);
      return () => {
        if (editorRafIdRef.current) cancelAnimationFrame(editorRafIdRef.current);
        if (previewRafIdRef.current) cancelAnimationFrame(previewRafIdRef.current);
        editorRafIdRef.current = null;
        previewRafIdRef.current = null;
        if (scrollCleanupRef.current) {
          scrollCleanupRef.current();
          scrollCleanupRef.current = null;
        }
      };
    }

    const editorContainer = editorContainerRef.current;
    if (!editorContainer) return;

    const observer = new MutationObserver((_mutations, obs) => {
      const scroller = editorContainer.querySelector(".cm-scroller") as HTMLDivElement | null;
      if (scroller) {
        obs.disconnect();
        setupScrollSync(scroller);
      }
    });

    observer.observe(editorContainer, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (editorRafIdRef.current) cancelAnimationFrame(editorRafIdRef.current);
      if (previewRafIdRef.current) cancelAnimationFrame(previewRafIdRef.current);
      editorRafIdRef.current = null;
      previewRafIdRef.current = null;
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
        scrollCleanupRef.current = null;
      }
    };
  }, [syncScroll, effectiveSideBySide, preview]);
}
