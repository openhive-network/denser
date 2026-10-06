import {
  TablePlugin,
  InstagramResizePlugin,
  TwitterMessageResizePlugin,
  type RendererPlugin
} from '@hive/renderer/src/plugins';

// Note: Instagram and Twitter/X both use iframe-only resize (postMessage) - no
// third-party widgets.js runs in our origin (issue #934); the platform.twitter.com
// iframe renders the tweet on its own and posts its height.
export const RENDERER_PLUGINS: readonly RendererPlugin[] = [
  new TablePlugin(),
  new InstagramResizePlugin(),
  new TwitterMessageResizePlugin()
];
