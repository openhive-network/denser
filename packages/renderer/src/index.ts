import {DefaultRenderer} from './renderers/default/DefaultRenderer';
import {SpoilerPlugin} from './renderers/default/plugins/SpoilerPlugin';
import {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';

export {DefaultRenderer} from './renderers/default/DefaultRenderer';
export {SpoilerPlugin} from './renderers/default/plugins/SpoilerPlugin';
export {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
export type {RendererPlugin} from './renderers/default/plugins/RendererPlugin';

export const HiveContentRenderer = {
    DefaultRenderer,
    SpoilerPlugin,
    TwitterPlugin
};

export default HiveContentRenderer;
