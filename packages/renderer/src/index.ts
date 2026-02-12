import {DefaultRenderer} from './renderers/default/DefaultRenderer';
import {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
import {InstagramResizePlugin} from './renderers/default/plugins/InstagramResizePlugin';
import {TablePlugin} from './renderers/default/plugins/TablePlugin';
import {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
import {TwitterResizePlugin} from './renderers/default/plugins/TwitterResizePlugin';

export {DefaultRenderer} from './renderers/default/DefaultRenderer';
export {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
export {TwitterResizePlugin} from './renderers/default/plugins/TwitterResizePlugin';
export {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
export {InstagramResizePlugin} from './renderers/default/plugins/InstagramResizePlugin';
export {TablePlugin} from './renderers/default/plugins/TablePlugin';
export type {RendererPlugin} from './renderers/default/plugins/RendererPlugin';
export type {PostContext} from './renderers/default/sanitization/TagTransformingSanitizer';

export const HiveContentRenderer = {
    DefaultRenderer,
    TwitterPlugin,
    TwitterResizePlugin,
    InstagramPlugin,
    InstagramResizePlugin,
    TablePlugin
};

export default HiveContentRenderer;
