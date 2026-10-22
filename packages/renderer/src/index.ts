import {DefaultRenderer} from './renderers/default/DefaultRenderer';
import {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
import {InstagramResizePlugin} from './renderers/default/plugins/InstagramResizePlugin';
import {SyntaxHighlightPlugin} from './renderers/default/plugins/SyntaxHighlightPlugin';
import {TablePlugin} from './renderers/default/plugins/TablePlugin';
import {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
import {TwitterMessageResizePlugin} from './renderers/default/plugins/TwitterMessageResizePlugin';

export {DefaultRenderer} from './renderers/default/DefaultRenderer';
export {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
export {TwitterMessageResizePlugin} from './renderers/default/plugins/TwitterMessageResizePlugin';
export {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
export {InstagramResizePlugin} from './renderers/default/plugins/InstagramResizePlugin';
export {SyntaxHighlightPlugin, containsHighlightableCode} from './renderers/default/plugins/SyntaxHighlightPlugin';
export {getSyntaxHighlighter, loadSyntaxHighlighter, warmUpSyntaxHighlighter} from './renderers/default/plugins/syntax-highlight/SyntaxHighlighterLoader';
export {TablePlugin} from './renderers/default/plugins/TablePlugin';
export {extractContentMetadata} from './renderers/default/ContentMetadata';
export type {ContentMetadata} from './renderers/default/ContentMetadata';
export type {RendererPlugin} from './renderers/default/plugins/RendererPlugin';
export type {PostContext} from './renderers/default/sanitization/TagTransformingSanitizer';

export const HiveContentRenderer = {
    DefaultRenderer,
    TwitterPlugin,
    TwitterMessageResizePlugin,
    InstagramPlugin,
    InstagramResizePlugin,
    SyntaxHighlightPlugin,
    TablePlugin
};

export default HiveContentRenderer;
