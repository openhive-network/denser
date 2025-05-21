/**
 * Interface defining a renderer plugin structure.
 * Plugins can modify text content before and after the main rendering process.
 */
export interface RendererPlugin {
    /** Unique name identifier for the plugin */
    name: string;
    /** Optional function to process text before the main rendering */
    preProcess?: (text: string) => string;
    /** Optional function to process text after the main rendering */
    postProcess?: (text: string) => string;
}

/**
 * Configuration options for renderer plugins.
 */
export interface PluginOptions {
    /** Array of renderer plugins to be used */
    plugins?: RendererPlugin[];
}
