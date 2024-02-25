export abstract class AbstractEmbedder {
    public abstract type: string;

    /**
     * Sanitize the URL to prevent XSS attacks. It should return a URL that is safe to embed.
     */
    // public abstract sanitizeIFrameUrl(url: string): string;

    /**
     * Get the metadata for the embed. This is used to generate the embed marker and to insert the embed into the rendered output.
     */
    public abstract getEmbedMetadata(textNode: HTMLObjectElement): EmbedMetadata | undefined;

    /**
     * Process the embed if it is relevant to this embedder. If it is not relevant, return undefined.
     */
    public abstract processEmbed(id: string, size: {width: number; height: number}): string;

    public static getEmbedMarker(id: string, type: string) {
        return `~~~ embed:${id} ${type} ~~~`;
    }

    public static insertAllEmbeds(embedders: AbstractEmbedder[], input: string, size: {width: number; height: number}): string {
        const sections = [];

        // HtmlReady inserts ~~~ embed:${id} type ~~~
        for (let section of input.split('~~~ embed:')) {
            const match = section.match(/^([A-Za-z0-9?/=_-]+) ([^ ]*) ~~~/);
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
