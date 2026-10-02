import type { Page } from '@playwright/test';

/** Phone-sized viewport: narrow enough that late-rendered inline content wraps lines. */
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

/**
 * Budget for shifts above the article. Tighter than the 0.05 CLS target: the recorded post has short
 * names, so a header line that wraps after hydration scores only ~0.03 here, but far more on real posts.
 */
export const MAX_ABOVE_ARTICLE_SHIFT = 0.01;

export interface LayoutShiftReport {
  /** Sum of layout-shift values whose sources sit at or above `#articleBody`. */
  score: number;
  /** One line per counted shift, for assertion messages. */
  shifts: string[];
}

declare global {
  interface Window {
    __aboveArticleShifts?: { value: number; sources: string[] }[];
  }
}

/**
 * Records layout shifts that move the post header or the article itself.
 *
 * Shifts whose sources all lie inside or after `#articleBody` are ignored:
 * those come from body images loading without dimensions (tracked separately),
 * not from server/client render differences above the article.
 * Must be called before navigation.
 */
export async function observeAboveArticleLayoutShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__aboveArticleShifts = [];

    const describe = (node: Node): string => {
      if (!(node instanceof Element)) return node.nodeName;
      const testId = node.getAttribute('data-testid');
      return testId ? `${node.tagName}[data-testid=${testId}]` : `${node.tagName}.${node.classList.value}`;
    };

    const isAtOrAboveArticle = (node: Node, article: Element): boolean =>
      node === article ||
      node.contains(article) ||
      Boolean(node.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING);

    new PerformanceObserver((list) => {
      const article = document.getElementById('articleBody');
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
          sources?: { node: Node | null }[];
        };
        if (shift.hadRecentInput) continue;
        const nodes = (shift.sources ?? []).flatMap((source) => (source.node ? [source.node] : []));
        if (article && !nodes.some((node) => isAtOrAboveArticle(node, article))) continue;
        window.__aboveArticleShifts?.push({ value: shift.value, sources: nodes.map(describe) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

/** Waits for hydration and the first client fetches to settle, then reports the recorded shifts. */
export async function collectAboveArticleLayoutShifts(page: Page): Promise<LayoutShiftReport> {
  await page.waitForLoadState('networkidle');
  const entries = await page.evaluate(() => window.__aboveArticleShifts ?? []);
  return {
    score: entries.reduce((sum, entry) => sum + entry.value, 0),
    shifts: entries.map((entry) => `${entry.value.toFixed(4)} ← ${entry.sources.join(', ')}`)
  };
}
