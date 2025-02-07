import {DefaultRenderer} from './renderers/default/DefaultRenderer';
import {SpoilerPlugin} from './renderers/default/plugins/SpoilerPlugin';

export {DefaultRenderer} from './renderers/default/DefaultRenderer';
export {SpoilerPlugin} from './renderers/default/plugins/SpoilerPlugin';
export type {RendererPlugin} from './renderers/default/plugins/RendererPlugin';

export const HiveContentRenderer = {
    DefaultRenderer,
    SpoilerPlugin
};

export default HiveContentRenderer;
