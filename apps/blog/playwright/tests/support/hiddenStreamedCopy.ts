import type { Page } from '@playwright/test';

/**
 * Puts a hidden clone of the first `[data-testid=<testId>]` element at the top of <body>,
 * wrapped the way React's streaming SSR parks a completed Suspense segment
 * (`<div hidden id="S:n">`) until its throttled reveal swaps it in. A boundary that receives
 * an update before that reveal is client-rendered, so for a moment a direct page load holds
 * both copies; this reproduces that state on demand instead of racing for it.
 *
 * Waits until React owns the source element first: hydrating <body> drops nodes it did not
 * render, which would remove a clone inserted earlier.
 */
export async function prependHiddenStreamedCopy(page: Page, testId: string): Promise<void> {
  const source = page.getByTestId(testId).first();
  await source.waitFor();
  await page.waitForFunction(
    (element) => Object.keys(element).some((key) => key.startsWith('__reactFiber$')),
    await source.elementHandle()
  );
  await source.evaluate((element) => {
    const segment = document.createElement('div');
    segment.hidden = true;
    segment.id = 'S:hidden-streamed-copy';
    segment.appendChild(element.cloneNode(true));
    document.body.prepend(segment);
  });
}
