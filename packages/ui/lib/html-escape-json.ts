/**
 * Escape JSON strings for safe embedding in HTML <script> blocks.
 *
 * Based on https://github.com/zertosh/htmlescape (MIT license)
 * Same algorithm as Go stdlib encoding/json.HTMLEscape and Next.js internals.
 *
 * Escapes:
 * - & → \u0026 (prevents HTML entity injection)
 * - < → \u003c (prevents </script> breakout)
 * - > → \u003e (prevents --> comment issues)
 * - \u2028 → \u2028 (JS line separator - breaks string literals)
 * - \u2029 → \u2029 (JS paragraph separator - breaks string literals)
 */

const ESCAPE_LOOKUP: Record<string, string> = {
  '&': '\\u0026',
  '>': '\\u003e',
  '<': '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

const ESCAPE_REGEX = /[&><\u2028\u2029]/g;

/**
 * Escape a string for safe embedding in an HTML <script> block.
 * Use this on the OUTPUT of JSON.stringify(), not the input.
 */
export function htmlEscapeJsonString(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}

/**
 * Safely serialize a value for embedding in an HTML <script> block.
 * Combines JSON.stringify with HTML escaping.
 *
 * @example
 * // In an HTML template:
 * const html = `<script>var data = ${safeJsonForScript(userInput)};</script>`;
 */
export function safeJsonForScript(value: unknown): string {
  return htmlEscapeJsonString(JSON.stringify(value));
}
