export interface RendererPlugin {
    name: string;
    preProcess?: (text: string) => string;
    postProcess?: (text: string) => string;
}

export interface PluginOptions {
    plugins?: RendererPlugin[];
}
