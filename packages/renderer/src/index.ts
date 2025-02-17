import {DefaultRenderer} from './renderers/default/DefaultRenderer';
import {SpoilerPlugin} from './renderers/default/plugins/SpoilerPlugin';
import {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
import {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';

export {DefaultRenderer} from './renderers/default/DefaultRenderer';
export {SpoilerPlugin} from './renderers/default/plugins/SpoilerPlugin';
export {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
export {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
export type {RendererPlugin} from './renderers/default/plugins/RendererPlugin';

export const HiveContentRenderer = {
    DefaultRenderer,
    SpoilerPlugin,
    TwitterPlugin,
    InstagramPlugin
};

export default HiveContentRenderer;
