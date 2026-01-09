/**
 * SECURITY-CRITICAL: This regex is the primary defense against attribute injection.
 *
 * The pattern [\w/?=.-]+ restricts embed IDs to safe characters only.
 * This blocks dangerous characters like " < > ' ; ( ) { } ` that could
 * break out of HTML attribute context.
 *
 * If an embedder extracts a malicious ID (e.g., from a crafted URL),
 * this regex will fail to match, leaving the embed marker as harmless
 * plain text instead of converting it to HTML.
 *
 * DO NOT modify this regex without security review.
 * See: Issue #802, MR #815, MR #816 for security testing context.
 */
const SAFE_EMBED_ID_PATTERN = /^([\w/?=.-]+) ([^ ]*) ~~~/;

export abstract class AbstractEmbedder {
    public abstract type: string;

    /**
     * Extracts metadata from an HTML object element that represents an embed.
     * This method should analyze the provided element and return the necessary
     * information to create an embed marker and process the embed later.
     *
     * @param textNode - The HTML object element containing embed information
     * @returns EmbedMetadata object containing id, url, and optional image/link,
     *          or undefined if the element is not a valid embed for this embedder
     */
    public abstract getEmbedMetadata(textNode: HTMLObjectElement): EmbedMetadata | undefined;

    /**
     * Process an embed with the given ID and size constraints.
     * This method should be implemented by concrete embedders to handle their specific embed types.
     *
     * @param id - The unique identifier of the embed to process
     * @param size - Object containing width and height dimensions for the embed
     * @returns HTML string representation of the processed embed
     */
    public abstract processEmbed(id: string, size: {width: number; height: number}): string;

    /**
     * Creates a standardized embed marker string for a given embed ID and type.
     * These markers are used to identify where embeds should be inserted in the text.
     *
     * @param id - The unique identifier for the embed
     * @param type - The type of embed (e.g., 'youtube', 'vimeo', etc.)
     * @returns A formatted string in the format "~~~ embed:${id} ${type} ~~~"
     */
    public static getEmbedMarker(id: string, type: string) {
        return `~~~ embed:${id} ${type} ~~~`;
    }

    /**
     * Process and insert all embeds found in the input text using the provided embedders.
     * Looks for embed markers in the format "~~~ embed:${id} ${type} ~~~" and replaces them
     * with the processed embed content.
     *
     * @param embedders - Array of embedder instances that can process different types of embeds
     * @param input - The input text containing embed markers
     * @param size - Object containing width and height dimensions for the embed
     * @returns The text with all embed markers replaced with their processed content
     */
    public static insertAllEmbeds(embedders: AbstractEmbedder[], input: string, size: {width: number; height: number}): string {
        const sections = [];

        // HtmlReady inserts ~~~ embed:${id} type ~~~
        for (let section of input.split('~~~ embed:')) {
            const match = section.match(SAFE_EMBED_ID_PATTERN);

            if (match && match.length >= 3) {
                const id = match[1];
                const type = match[2];
                for (const embedder of embedders) {
                    if (embedder.type == type) {
                        sections.push(embedder.processEmbed(id, size));
                        break;
                    }
                }
                section = section.substring(`${id} ${type} ~~~`.length);
                if (section === '') {
                    continue;
                }
            }
            sections.push(section);
        }
        return sections.join('');
    }
}

export interface EmbedMetadata {
    /** The ID of the embed which will be used later on to convert it into rich embed */
    id: string;
    /** The URL from which the embed takes its source */
    url: string;
    /** Optional image to be used as a thumbnail */
    image?: string;
    /** Optional link detected */
    link?: string;
}
