import {RendererPlugin} from './RendererPlugin';

export class SpoilerPlugin implements RendererPlugin {
    name = 'spoiler';

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
