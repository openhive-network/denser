import {RendererPlugin} from './RendererPlugin';

/**
 * Plugin that handles table rendering by wrapping tables in a scrollable container.
 * This ensures tables are responsive and don't break the layout on small screens.
 */
export class TablePlugin implements RendererPlugin {
    /** Unique identifier for the plugin */
    name = 'table-plugin';

    /**
     * Processes the rendered HTML text and wraps table elements in scrollable containers.
     * @param text - The HTML text containing table elements
     * @returns The processed HTML text with tables wrapped in scrollable divs
     */
    postProcess(text: string): string {
        const tableRegex = /(<table[\s\S]*?<\/table>)/g;
        return text.replace(tableRegex, (match) => {
            return `<div  style="overflow-x: auto; width: 100%; display: block;">${match}</div>`;
        });
    }
}
