/** A JSON-LD node: a schema.org type and its properties. */
export interface IJsonLdNode {
  '@context'?: string;
  '@type': string;
  [property: string]: unknown;
}

const UNSAFE_IN_SCRIPT = /[<>&\u2028\u2029]/g;

const escapeChar = (char: string): string => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;

/**
 * JSON text of a JSON-LD node, safe to put in a `<script type="application/ld+json">` body:
 * `<`, `>`, `&` and the JS line separators become `\uXXXX` escapes, so content from the
 * blockchain (a `</script>` in a post title) can't close the element or open markup.
 * The escapes are JSON string escapes, so the text parses back to the same value.
 */
export function serializeJsonLd(node: IJsonLdNode | IJsonLdNode[]): string {
  return JSON.stringify(node).replace(UNSAFE_IN_SCRIPT, escapeChar);
}
