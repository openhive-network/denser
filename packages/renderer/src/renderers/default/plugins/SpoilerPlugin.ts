import {RendererPlugin} from './RendererPlugin';

/**
 * Plugin for handling spoiler blocks in markdown text.
 * Converts blocks starting with >! into HTML details/summary elements.
 *
 * Syntax:
 * >! [Optional Title] Content
 * > Additional content on new lines
 * > More content
 *
 * @example
 * >! [Spoiler] Hidden content
 * > More hidden content
 *
 * Becomes:
 * <details class="spoiler">
 *   <summary>Spoiler</summary>
 *   <p>Hidden content\nMore hidden content</p>
 * </details>
 */
export class SpoilerPlugin implements RendererPlugin {
    /** Plugin identifier */
    name = 'spoiler';

    /**
     * Processes markdown text and converts spoiler blocks to HTML details elements
     * @param text - The markdown text to process
     * @returns The processed text with spoiler blocks converted to HTML
     */
    preProcess(text: string): string {
        // Matches spoiler blocks with optional title and multiple lines
        return text.replace(/^>!(?:\s*\[(.*?)\])?\s*(.*?)(?:\n|$)((?:\n> ?.*)*)$/gm, (_, title, firstLine, rest) => {
            // Combines first line and additional lines into single content string
            const content = [
                firstLine.trim(),
                ...rest
                    .split('\n') // Split additional lines
                    .map((line: string) => line.trim()) // Remove whitespace
                    .filter((line: string) => line.startsWith('>')) // Keep only quote lines
                    .map((line: string) => line.replace(/^> ?/, '')) // Remove quote markers
            ]
                .join('\n') // Join all lines with newlines instead of spaces
                .trim(); // Remove extra whitespace

            // Generate HTML details/summary structure
            return `<details class="spoiler"><summary>${title || 'Reveal spoiler'}</summary><p>${content}</p></details>`;
        });
    }
}
