import {RendererPlugin} from './RendererPlugin';

export class TablePlugin implements RendererPlugin {
    name = 'table-plugin';

    postProcess(text: string): string {
        const tableRegex = /(<table[\s\S]*?<\/table>)/g;
        return text.replace(tableRegex, (match) => {
            return `<div  style="overflow-x: auto; width: 100%; display: block;">${match}</div>`;
        });
    }
}
