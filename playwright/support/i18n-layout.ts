/**
 * The i18n layout check of the blog's and the wallet's fixture suites: a page rendered in the
 * pseudo-locale (packages/ui/lib/pseudo-locale.ts) or in Polish, at a desktop, a phone in landscape
 * and a phone in portrait, in a wide font, is searched for
 *  - `unmarked` text: visible words that did not come through the translations (pseudo-locale only);
 *  - `clipped` text: an element cutting its own text off (`overflow-x: hidden`/`clip`, wider content
 *    than box) with no `title` to read it whole;
 *  - `page-scroll`: a page (or the checked dialog) scrolling sideways.
 * Each finding is either fixed or listed, with its issue, in the spec's known issues.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import UNTRANSLATED_NAMES from '../../packages/eslint-config-custom/untranslated-names.js';
import { PSEUDO_CHARACTERS, PSEUDO_LOCALE } from '../../packages/ui/lib/pseudo-locale.ts';
import { LOCALE_COOKIE } from '../../packages/ui/lib/locale-cookie.ts';

export { PSEUDO_LOCALE };

/** The locales checked: the pseudo-locale, and Polish, the longest real translation the testers read. */
export const I18N_CHECK_LOCALES = [PSEUDO_LOCALE, 'pl'] as const;
export type I18nCheckLocale = (typeof I18N_CHECK_LOCALES)[number];

export const I18N_CHECK_VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone-landscape', width: 844, height: 390 },
  { name: 'phone', width: 390, height: 844 }
] as const;

/**
 * A wide font, as on many readers' systems: headless Chromium's narrow default font hides text that
 * no longer fits once a reader's font is wider (#1645, #1649). Bold text is its synthetic bold.
 */
export const WIDE_FONT = 'DejaVu Sans';

/** Text kept in every locale besides the untranslated names: units and the short forms of amounts. */
const ALWAYS_ALLOWED_WORDS = ['VESTS', 'MVESTS', 'GVESTS', 'STEEM', 'SBD', 'px', 'ms', 'KB', 'MB'];

/** Content that is not the UI's text, so never pseudo-localized: code, embedded media, user input. */
const NOT_UI_TEXT =
  'script, style, noscript, template, code, pre, textarea, svg, iframe, [contenteditable="true"]';
/** Text formatted by `Intl` (dates, relative times), which follows a real locale and falls back to English for the pseudo-locale. */
const INTL_FORMATTED = 'time';

export type I18nIssueKind = 'unmarked' | 'clipped' | 'page-scroll';

export interface II18nIssue {
  kind: I18nIssueKind;
  /** The viewport's name (I18N_CHECK_VIEWPORTS). */
  viewport: string;
  /** The element: tag, test id and classes, e.g. `span[data-testid=voters-link].truncate`. */
  element: string;
  /** The text found (unmarked) or the element's text (clipped), cut to 80 characters. */
  text: string;
}

/** A finding the check lets through until the issue named fixes it. */
export interface IKnownI18nIssue {
  kind: I18nIssueKind;
  /** Matched against `text` (unmarked, clipped) or `element` (page-scroll). */
  match: RegExp;
  locale?: I18nCheckLocale;
  viewport?: string;
  /** The issue that fixes it, e.g. `#1712`. */
  issue: string;
}

export interface II18nCheckOptions {
  locale: I18nCheckLocale;
  /**
   * Subtrees of user content (posts, comments, account names, tags, community titles): no locale
   * translates them, and they are cut short by design.
   */
  userContent?: string[];
  /** Names the app shows untranslated besides UNTRANSLATED_NAMES, e.g. the site's name. */
  names?: string[];
  /** Text formatted by `Intl` besides `<time>` elements, e.g. a date range. */
  intlFormatted?: string[];
  /** Only this subtree, e.g. `[role="dialog"]`: its own sideways scroll counts as `page-scroll`. */
  root?: string;
}

/**
 * A `storageState` holding the UI language cookie for every port of localhost: a Playwright project
 * using it runs its specs in `locale` (the `pl-locale` projects of the fixture configs).
 */
export const localeStorageState = (locale: string) => ({
  cookies: [
    {
      name: LOCALE_COOKIE,
      value: locale,
      domain: 'localhost',
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const
    }
  ],
  origins: []
});

/**
 * The `testMatch` and `grep` of a project that runs the tests named by their IDs (`CMT-07`), per spec
 * file: the Polish runs keep to the tests that find their elements by test id or role.
 */
export function selectTests(tests: Record<string, string[]>): { testMatch: string[]; grep: RegExp } {
  const ids = Object.values(tests)
    .flat()
    .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return { testMatch: Object.keys(tests), grep: new RegExp(`(?<![\\w-])(${ids.join('|')})(?![\\w-])`) };
}

/** Sets the UI language cookie of the context for `baseURL`. */
export const setUiLocale = (context: BrowserContext, locale: string, baseURL: string | undefined) =>
  context.addCookies([{ name: LOCALE_COOKIE, value: locale, url: baseURL ?? 'http://localhost' }]);

/** DejaVu Sans 2.37 (fonts/LICENSE-DejaVu.txt), which the test images do not install. */
const WIDE_FONT_FILE = path.join(__dirname, 'fonts', 'DejaVuSans.woff');
let wideFontFace: string | undefined;

/** Renders the page in WIDE_FONT; fails when the font did not load, as the check would under-report. */
async function forceWideFont(page: Page): Promise<void> {
  wideFontFace ??= fs.readFileSync(WIDE_FONT_FILE).toString('base64');
  await page.addStyleTag({
    content: `@font-face { font-family: "${WIDE_FONT}"; src: url(data:font/woff;base64,${wideFontFace}) format("woff"); }
*, *::before, *::after { font-family: "${WIDE_FONT}", monospace !important; }`
  });
  const loaded = await page.evaluate(async (font) => {
    await document.fonts.load(`16px "${font}"`);
    return document.fonts.check(`16px "${font}"`);
  }, WIDE_FONT);
  expect(loaded, `the font "${WIDE_FONT}" did not load: the clipping check needs it`).toBe(true);
}

const settle = (page: Page) =>
  page.evaluate(() =>
    document.fonts.ready.then(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    )
  );

interface ICollectArgs {
  pseudo: boolean;
  userContent: string;
  root: string | null;
  allowedWords: string[];
  pseudoCharacters: string;
  notUiText: string;
  intlFormatted: string;
}

/** Runs in the page: the findings of one viewport. */
function collectIssues(args: ICollectArgs) {
  const { pseudo, userContent, root, allowedWords, pseudoCharacters, notUiText, intlFormatted } = args;
  const issues: { kind: I18nIssueKind; element: string; text: string }[] = [];
  const scope = root ? document.querySelector(root) : document.body;
  if (!scope) return issues;
  const cut = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 80);
  const describe = (element: Element) => {
    const testId = element.getAttribute('data-testid');
    const classes = [...element.classList].slice(0, 4).join('.');
    return `${element.tagName.toLowerCase()}${testId ? `[data-testid=${testId}]` : ''}${classes ? `.${classes}` : ''}`;
  };
  const visible = (element: Element) =>
    element.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
    element.getClientRects().length > 0;
  const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Longest first, so "Hive Blog" is taken whole before "Hive"
  const alternatives = [...allowedWords].sort((a, b) => b.length - a.length).map(escape);
  const allowed = new RegExp(`(^|[^A-Za-z])(${alternatives.join('|')})(?![A-Za-z])`, 'gi');
  // Account names, URLs and e-mail addresses are data, not text
  const data = /@[a-z0-9.-]+|https?:\/\/\S+|\b[\w.-]+\.(com|io|blog|network|org)\b\S*/gi;
  // A text that came through the pseudo-locale keeps an accented letter, a marker or its padding
  const pseudoText = new RegExp(`[${escape(pseudoCharacters)}]`);
  const unmarkedWords = (text: string) =>
    !pseudoText.test(text) && /[A-Za-z]{2,}/.test(text.replace(data, ' ').replace(allowed, '$1'));
  const skipped = (element: Element) =>
    Boolean(element.closest(notUiText) || (userContent && element.closest(userContent)));
  // An account name linking to its account (`gtg` in a link to `/@gtg`)
  const accountLink = (text: string, element: Element) => {
    const name = text.trim().replace(/^@/, '');
    return /^[a-z][a-z0-9.-]{2,15}$/.test(name) && Boolean(element.closest(`a[href*="@${name}"]`));
  };
  // Screen-reader-only text (a 1 px box) is not on the screen
  const tiny = (box: DOMRect) => box.width <= 1 || box.height <= 1;

  if (pseudo) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue ?? '';
      const parent = node.parentElement;
      if (!text.trim() || !parent || skipped(parent) || parent.closest(intlFormatted) || !visible(parent))
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if (tiny(range.getBoundingClientRect())) continue;
      if (unmarkedWords(text) && !accountLink(text, parent)) {
        issues.push({ kind: 'unmarked', element: describe(parent), text: cut(text) });
      }
    }
    for (const field of scope.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      const placeholder = field.getAttribute('placeholder') ?? '';
      if (visible(field) && !skipped(field.parentElement ?? field) && unmarkedWords(placeholder)) {
        issues.push({ kind: 'unmarked', element: describe(field), text: cut(placeholder) });
      }
    }
  }

  for (const element of scope.querySelectorAll('*')) {
    if (skipped(element) || !visible(element) || tiny(element.getBoundingClientRect())) continue;
    if (element.scrollWidth <= element.clientWidth + 1) continue;
    const style = getComputedStyle(element);
    if (style.overflowX !== 'hidden' && style.overflowX !== 'clip') continue;
    const ownText = [...element.childNodes]
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.nodeValue ?? '')
      .join('')
      .trim();
    if (!ownText && style.textOverflow !== 'ellipsis') continue;
    if (!element.textContent?.trim() || element.closest('[title]')) continue;
    issues.push({ kind: 'clipped', element: describe(element), text: cut(element.textContent) });
  }

  const scroller = root ? scope : document.scrollingElement;
  if (scroller && scroller.scrollWidth > scroller.clientWidth + 1) {
    const edge = scroller.getBoundingClientRect().left + scroller.clientWidth + 1;
    const sticksOut = (element: Element) => visible(element) && element.getBoundingClientRect().right > edge;
    // The innermost elements past the edge: the ones to fix
    const culprits = [...scope.querySelectorAll('*')]
      .filter((element) => sticksOut(element) && ![...element.children].some(sticksOut))
      .slice(0, 3);
    issues.push({
      kind: 'page-scroll',
      element: culprits.map(describe).join(' | ') || describe(scroller),
      text: `${scroller.scrollWidth} px wide in ${scroller.clientWidth} px`
    });
  }
  return issues;
}

/**
 * Checks the page (or `root`) at every I18N_CHECK_VIEWPORTS, in WIDE_FONT, and resolves with the
 * findings. The page is left at the last viewport.
 */
export async function checkI18nLayout(page: Page, options: II18nCheckOptions): Promise<II18nIssue[]> {
  await forceWideFont(page);
  const issues: II18nIssue[] = [];
  for (const viewport of I18N_CHECK_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await settle(page);
    const found = await page.evaluate(collectIssues, {
      pseudo: options.locale === PSEUDO_LOCALE,
      userContent: (options.userContent ?? []).join(', '),
      root: options.root ?? null,
      allowedWords: [...UNTRANSLATED_NAMES, ...ALWAYS_ALLOWED_WORDS, ...(options.names ?? [])],
      pseudoCharacters: PSEUDO_CHARACTERS,
      notUiText: NOT_UI_TEXT,
      intlFormatted: [INTL_FORMATTED, ...(options.intlFormatted ?? [])].join(', ')
    });
    issues.push(...found.map((issue) => ({ ...issue, viewport: viewport.name })));
  }
  return issues;
}

const isKnown = (issue: II18nIssue, locale: I18nCheckLocale, known: IKnownI18nIssue) =>
  known.kind === issue.kind &&
  (known.locale === undefined || known.locale === locale) &&
  (known.viewport === undefined || known.viewport === issue.viewport) &&
  known.match.test(issue.kind === 'page-scroll' ? issue.element : issue.text);

/**
 * Fails on every finding not in `known`; the known ones are reported as annotations
 * (`i18n-known: #issue …`), so a run shows what is still waiting for a fix.
 */
export function expectNoI18nIssues(
  issues: II18nIssue[],
  locale: I18nCheckLocale,
  known: IKnownI18nIssue[] = []
): void {
  const { annotations } = test.info();
  const unexpected = issues.filter((issue) => {
    const match = known.find((entry) => isKnown(issue, locale, entry));
    if (match) annotations.push({ type: 'i18n-known', description: `${match.issue} ${formatIssue(issue)}` });
    return !match;
  });
  expect(unexpected.map(formatIssue), `i18n layout findings in ${locale}`).toEqual([]);
}

const formatIssue = ({ kind, viewport, element, text }: II18nIssue) =>
  `${kind} @${viewport} ${element}: "${text}"`;
