import {RendererPlugin} from './RendererPlugin';

export class SpoilerPlugin implements RendererPlugin {
    name = 'spoiler';

    preProcess(text: string): string {
        return text.replace(/^>! *\[(.*?)\] *(.*?)(?:\n|$)([\s\S]*?)(?=^>! *\[|$)/gm, (_, title, firstLine, rest) => {
            // Get the first line content (after the title)
            const content = firstLine.trim();

            // Get the rest of the content (lines starting with >)
            const restContent = rest
                .split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line.startsWith('>'))
                .map((line: string) => line.replace(/^> ?/, ''))
                .join(' ')
                .trim();

            // Combine all content
            const fullContent = [content, restContent].filter(Boolean).join(' ');

            return `<details class="spoiler"><summary>${title || 'Reveal spoiler'}</summary><p>${fullContent}</p></details>`;
        });
    }
}
