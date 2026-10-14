import type { Locator, Page } from '@playwright/test';
import { expect } from './fixture-proxy-test';

/**
 * Helpers for specs of fenced code blocks highlighted by @hive/renderer's SyntaxHighlightPlugin.
 * A highlighted block is a `pre.shiki` whose token spans carry both themes' colours.
 */

/** Highlighted blocks inside a rendered body. */
export const highlightedBlocks = (body: Locator): Locator => body.locator('pre.shiki');

/** Code blocks left plain: no Shiki markup inside. */
export const plainBlocks = (body: Locator): Locator => body.locator('pre:not(.shiki) > code');

/** Inline code, outside any `pre`. */
export const inlineCode = (body: Locator): Locator => body.locator(':not(pre) > code');

/** Expects `block` to be highlighted: Shiki's line spans with light and dark colours per token. */
export async function expectHighlighted(block: Locator): Promise<void> {
  await expect(block).toHaveClass(/\bshiki\b/);
  await expect(block.locator('span.line').first()).toBeAttached();
  const tokenStyle = await block.locator('span.line span[style]').first().getAttribute('style');
  expect(tokenStyle).toMatch(/--shiki-light:#[0-9a-f]{3,8}/i);
  expect(tokenStyle).toMatch(/--shiki-dark:#[0-9a-f]{3,8}/i);
}

/**
 * Collects, from now on, the URL of every script the page loads whose code contains `marker`.
 * Await the returned function once the page has settled.
 */
export function collectScriptsContaining(page: Page, marker: string): () => Promise<string[]> {
  const checks: Promise<string | undefined>[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'script') return;
    checks.push(
      response
        .text()
        .then((code) => (code.includes(marker) ? response.url() : undefined))
        .catch(() => undefined)
    );
  });
  return async () => (await Promise.all(checks)).filter((url): url is string => url !== undefined);
}

/** React hydration-mismatch signatures: minified prod codes + dev text. */
const HYDRATION_ERROR = /Minified React error #(418|423|425|421|422)\b|hydrat|did not match|Text content does not match/i;

/** Collects hydration errors the page reports from now on. */
export function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && HYDRATION_ERROR.test(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    if (HYDRATION_ERROR.test(err.message)) errors.push(err.message);
  });
  return errors;
}

/**
 * Expects the theme switch to recolour `block` in place: a token shows its `--shiki-light` colour,
 * then, once `html` gets the `dark` class, its `--shiki-dark` one, as the same node (no re-render).
 */
export async function expectThemeSwitchRecolours(block: Locator): Promise<void> {
  const colours = await block.evaluate((pre) => {
    const tokens = Array.from(pre.querySelectorAll<HTMLElement>('span.line span[style]'));
    const token = tokens.find(
      (span) => span.style.getPropertyValue('--shiki-light') !== span.style.getPropertyValue('--shiki-dark')
    );
    if (!token) return null;
    const computedColour = (value: string) => {
      const probe = document.createElement('span');
      probe.style.color = value;
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    };
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    const light = getComputedStyle(token).color;
    root.classList.add('dark');
    const dark = getComputedStyle(token).color;
    root.classList.toggle('dark', wasDark);
    return {
      light,
      dark,
      expectedLight: computedColour(token.style.getPropertyValue('--shiki-light')),
      expectedDark: computedColour(token.style.getPropertyValue('--shiki-dark')),
      sameNode: token.isConnected && pre.contains(token)
    };
  });
  expect(colours, 'a token whose light and dark colours differ').not.toBeNull();
  expect(colours?.light).toBe(colours?.expectedLight);
  expect(colours?.dark).toBe(colours?.expectedDark);
  expect(colours?.light).not.toBe(colours?.dark);
  expect(colours?.sameNode).toBe(true);
}

/**
 * Markdown with code blocks of every kind: highlighted `cpp`, `python` and `html` (the last
 * carrying markup that must stay text), plain untagged and unknown-language blocks, inline code.
 */
export const CODE_BLOCKS_MARKDOWN = [
  'Inline `answer = 42` code.',
  '',
  '```cpp',
  'int answer = 42;',
  '```',
  '',
  '```python',
  'answer = 42',
  '```',
  '',
  '```html',
  '<img src=x onerror=alert(1)>',
  '```',
  '',
  '```',
  'untagged block',
  '```',
  '',
  '```cobol',
  'DISPLAY ANSWER',
  '```'
].join('\n');

/** Expects `body` to show CODE_BLOCKS_MARKDOWN: three blocks highlighted, the rest plain. */
export async function expectCodeBlocksMarkdownRendered(body: Locator): Promise<void> {
  const highlighted = highlightedBlocks(body);
  await expect(highlighted).toHaveCount(3);
  for (const [index, text] of ['int answer = 42;', 'answer = 42', '<img src=x onerror=alert(1)>'].entries()) {
    await expectHighlighted(highlighted.nth(index));
    await expect(highlighted.nth(index)).toHaveText(text);
  }
  await expect(body.locator('img')).toHaveCount(0);
  // toContainText: the editor may indent the text typed after the last fence
  await expect(plainBlocks(body)).toContainText(['untagged block', 'DISPLAY ANSWER']);
  await expect(inlineCode(body)).toHaveText('answer = 42');
  await expect(inlineCode(body).locator('span')).toHaveCount(0);
}
