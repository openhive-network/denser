import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import expectedCardSummaries from '../fixture/cardSummaries.expected.json';

/**
 * Helpers for checking that post lists send card summaries, not post bodies, to the client.
 *
 * `cardSummaries.expected.json` holds, per page, the summary of every card in its recording as the
 * client computed it from the full body before summaries moved to the server. Regenerate it only
 * together with the recording it describes.
 */

export type CardSummaryPage = keyof typeof expectedCardSummaries;

/** `@author/permlink` → summary text, for every card of `page`'s recording. */
export const getExpectedCardSummaries = (page: CardSummaryPage): Record<string, string> =>
  expectedCardSummaries[page];

/** `@author/permlink` → the summary text each card on the page shows. */
export const readRenderedCardSummaries = async (page: Page): Promise<Record<string, string>> => {
  const descriptions = page.getByTestId('post-description');
  const summaries: Record<string, string> = {};
  for (const description of await descriptions.all()) {
    const href = (await description.getAttribute('href')) ?? '';
    const post = href.slice(href.indexOf('/@') + 1);
    summaries[post] = (await description.textContent()) ?? '';
  }
  return summaries;
};

/** Total size of the RSC payload inlined in the HTML (the `self.__next_f.push` scripts). */
export const getInlineRscBytes = (html: string): number =>
  [...html.matchAll(/<script>(self\.__next_f\.push\([\s\S]*?)<\/script>/g)].reduce(
    (total, [, script]) => total + Buffer.byteLength(script),
    0
  );

interface RecordedEntry {
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: unknown;
}

const BODY_SNIPPET_PATTERN = /[A-Za-z0-9 ]{40,}/g;

/**
 * For each post in a recorded post list, a run of plain text from the body that occurs in neither
 * its title, its metadata nor its card summary, so it reaches the client only with the body.
 * Posts without such a run are left out.
 */
export const getBodyOnlySnippets = (fixtureDir: string, recording: string, page: CardSummaryPage): string[] => {
  const recordingPath = path.resolve(__dirname, '..', 'mock', 'fixtures', fixtureDir, recording);
  const entries: RecordedEntry[] = JSON.parse(fs.readFileSync(recordingPath, 'utf-8')).response.result;
  const summaries = getExpectedCardSummaries(page);
  return entries.flatMap((entry) => {
    const elsewhere = [entry.title, JSON.stringify(entry.json_metadata), summaries[`@${entry.author}/${entry.permlink}`]];
    const snippets = (entry.body.match(BODY_SNIPPET_PATTERN) ?? [])
      .map((snippet) => snippet.trim())
      .filter((snippet) => !elsewhere.some((text) => text?.includes(snippet)));
    return snippets.length ? [snippets[snippets.length - 1]] : [];
  });
};
