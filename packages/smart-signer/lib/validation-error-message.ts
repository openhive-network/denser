import type { ZodError } from 'zod';
import englishTexts from '@smart-signer/locales/en/smart-signer.json';

const ENGLISH: unknown = englishTexts;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The English text of smart-signer translation key `message`, or `message` when it is not one. */
function toEnglish(message: string): string {
  let text = ENGLISH;
  for (const part of message.split('.')) {
    text = isRecord(text) ? text[part] : undefined;
  }
  return typeof text === 'string' ? text : message;
}

/**
 * The issues of `error` as one English message for an API response: the shared schemas carry
 * translation keys, which the client translates and the server answers in English.
 */
export function validationErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => toEnglish(issue.message)).join(', ');
}
