import {RendererPlugin} from './RendererPlugin';

export class SpoilerPlugin implements RendererPlugin {
    name = 'spoiler';

    preProcess(text: string): string {
        return text.replace(/^>! *\[(.*?)\] *([\s\S]*?)(?=^>! *\[|$)/gm, (_, title, content) => {
            const cleanContent = content
                .split('\n')
                .map((line: string) => line.replace(/^> ?/, '').trim())
                .join('\n')
                .trim();

            return `<details class="spoiler">
                    <summary>${title}</summary>
                    ${cleanContent}
                </details>`;
        });
    }
}
