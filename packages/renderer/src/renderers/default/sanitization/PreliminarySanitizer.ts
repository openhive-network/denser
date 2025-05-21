/**
 * Performs preliminary text sanitization operations before main processing.
 * This class handles basic cleanup tasks like removing HTML comments.
 */
export class PreliminarySanitizer {
    /**
     * Performs initial sanitization of the input text.
     * Currently handles HTML comment removal.
     *
     * @param text - The input text to sanitize
     * @returns The sanitized text with HTML comments replaced
     */
    public static preliminarySanitize(text: string): string {
        return PreliminarySanitizer.stripHtmlComments(text);
    }

    /**
     * Removes HTML comments from the text and replaces them with a placeholder.
     * Uses regex pattern:
     * - <!-- : Matches the start of an HTML comment
     * - ([\s\S]+?) : Captures any characters (including newlines) non-greedily
     * - (-->|$) : Matches either the comment end --> or end of string
     *
     * @param text - The text containing HTML comments
     * @returns Text with HTML comments replaced by "(html comment removed: [comment content])"
     */
    private static stripHtmlComments(text: string) {
        return text.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)');
    }
}
