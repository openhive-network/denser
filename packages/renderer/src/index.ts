import {DefaultRenderer} from './renderers/default/DefaultRenderer';
import {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
import {TablePlugin} from './renderers/default/plugins/TablePlugin';
import {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';

export {DefaultRenderer} from './renderers/default/DefaultRenderer';
export {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
export {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
export {TablePlugin} from './renderers/default/plugins/TablePlugin';
export type {RendererPlugin} from './renderers/default/plugins/RendererPlugin';

export const HiveContentRenderer = {
    DefaultRenderer,
    TwitterPlugin,
    InstagramPlugin,
    TablePlugin
};

export default HiveContentRenderer;
