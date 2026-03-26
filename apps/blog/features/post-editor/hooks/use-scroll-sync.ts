"use client";

import { RefObject, useEffect, useRef } from "react";

interface UseScrollSyncParams {
  editorContainerRef: RefObject<HTMLDivElement | null>;
  previewContainerRef: RefObject<HTMLDivElement | null>;
  syncScroll: boolean;
  effectiveSideBySide: boolean;
  preview: boolean;
  previewContent: string | undefined;
}

/**
 * Manages bidirectional scroll sync between CodeMirror editor and preview panel.
 * Uses block-level anchor mapping for proportional scroll: editor blocks
 * (separated by blank lines) are matched to preview blocks (top-level
 * HTML elements), then scroll positions are interpolated between anchors.
 */
export function useScrollSync({
  editorContainerRef,
  previewContainerRef,
  syncScroll,
  effectiveSideBySide,
  preview,
  previewContent,
}: UseScrollSyncParams) {
  const isScrollSyncingRef = useRef(false);
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
        previewEl.scrollTop = previewEl.scrollHeight;
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

      const getOffsetIn = (el: HTMLElement, container: HTMLElement): number => {
        let offset = 0;
        let current: HTMLElement | null = el;
        while (current && current !== container) {
          offset += current.offsetTop;
          current = current.offsetParent as HTMLElement | null;
        }
        return offset;
      };

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
          editorTop: number;
          editorBottom: number;
        }
        const groups: LineGroup[] = [];

        const isPlainText = (t: string) =>
          !t.startsWith("#") &&
          !/^!\[/.test(t) &&
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
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // Paragraph continuation
          if (isPlainText(trimmed)) {
            const startLine = cmLines[idx];
            let endLine = cmLines[idx];
            idx++;
            while (idx < cmLines.length) {
              const nextTrimmed = (cmLines[idx].textContent || "").trim();
              if (!nextTrimmed) break;
              if (!isPlainText(nextTrimmed)) break;
              endLine = cmLines[idx];
              idx++;
            }
            groups.push({
              editorTop: getOffsetIn(startLine, editorScrollArea),
              editorBottom: getOffsetIn(endLine, editorScrollArea) + endLine.offsetHeight,
            });
            continue;
          }

          // Single line: heading, image, HR, etc.
          groups.push({
            editorTop: getOffsetIn(line, editorScrollArea),
            editorBottom: getOffsetIn(line, editorScrollArea) + line.offsetHeight,
          });
          idx++;
        }

        // Phase 2: Match groups to preview block elements
        const blockTags = new Set([
          "P", "H1", "H2", "H3", "H4", "H5", "H6", "PRE", "UL", "OL",
          "BLOCKQUOTE", "CENTER", "DIV", "TABLE", "HR", "FIGURE",
        ]);
        const previewBlocks: HTMLElement[] = [];
        for (const child of Array.from(proseContainer.children) as HTMLElement[]) {
          if (blockTags.has(child.tagName)) {
            previewBlocks.push(child);
          }
        }

        const totalEditorHeight = editorScrollArea.scrollHeight;
        const totalPreviewHeight = previewEl.scrollHeight;

        const blockPos = previewBlocks.map((block) => {
          const top = getOffsetIn(block, previewEl);
          return { top, bottom: top + block.offsetHeight };
        });

        // Phase 3: Build anchor arrays with top+bottom edge pairs
        const eAnchors: number[] = [0];
        const pAnchors: number[] = [0];

        let searchStart = 0;
        for (let j = 0; j < groups.length; j++) {
          const g = groups[j];
          const editorMid = (g.editorTop + g.editorBottom) / 2;
          const targetPreviewMid =
            totalEditorHeight > 0 ? (editorMid / totalEditorHeight) * totalPreviewHeight : 0;

          let bestIdx = searchStart;
          let bestDist = Infinity;
          for (let k = searchStart; k < blockPos.length; k++) {
            const blockMid = (blockPos[k].top + blockPos[k].bottom) / 2;
            const dist = Math.abs(blockMid - targetPreviewMid);
            if (dist <= bestDist) {
              bestDist = dist;
              bestIdx = k;
            } else {
              break;
            }
          }
          searchStart = bestIdx;

          const bp = blockPos[bestIdx];
          eAnchors.push(g.editorTop);
          pAnchors.push(bp.top);

          if (g.editorBottom > g.editorTop && bp.bottom > bp.top) {
            eAnchors.push(g.editorBottom);
            pAnchors.push(bp.bottom);
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
        if (isScrollSyncingRef.current || editorRafIdRef.current) return;

        editorRafIdRef.current = requestAnimationFrame(() => {
          editorRafIdRef.current = null;
          if (mapDirty) buildMap();

          const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
          const maxPreviewScroll = previewEl.scrollHeight - previewEl.clientHeight;
          if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

          isScrollSyncingRef.current = true;
          if (editorAnchors && previewAnchors && editorAnchors.length > 2) {
            previewEl.scrollTop = interpolate(editorScrollArea.scrollTop, editorAnchors, previewAnchors);
          } else {
            previewEl.scrollTop = (editorScrollArea.scrollTop / maxEditorScroll) * maxPreviewScroll;
          }
          requestAnimationFrame(() => {
            isScrollSyncingRef.current = false;
          });
        });
      };

      const handlePreviewScroll = () => {
        if (scrollLockRef.current || isScrollSyncingRef.current || previewRafIdRef.current) return;

        previewRafIdRef.current = requestAnimationFrame(() => {
          previewRafIdRef.current = null;
          if (mapDirty) buildMap();

          const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
          const maxPreviewScroll = previewEl.scrollHeight - previewEl.clientHeight;
          if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

          isScrollSyncingRef.current = true;
          if (previewAnchors && editorAnchors && previewAnchors.length > 2) {
            editorScrollArea.scrollTop = interpolate(
              previewEl.scrollTop,
              previewAnchors,
              editorAnchors
            );
          } else {
            editorScrollArea.scrollTop = (previewEl.scrollTop / maxPreviewScroll) * maxEditorScroll;
          }
          requestAnimationFrame(() => {
            isScrollSyncingRef.current = false;
          });
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
