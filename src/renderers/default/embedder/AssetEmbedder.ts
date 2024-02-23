import ow from 'ow';
import {LocalizationOptions} from '../LocalizationOptions';
import {HtmlDOMParser} from './HtmlDOMParser';
import {VideoEmbedders} from './videoembedders/VideoEmbedders';

export class AssetEmbedder {
    private options: AssetEmbedderOptions;
    private localization: LocalizationOptions;

    public constructor(options: AssetEmbedderOptions, localization: LocalizationOptions) {
        AssetEmbedder.validate(options);
        this.options = options;
        this.localization = localization;
    }

    public markAssets(input: string): string {
        const parser = new HtmlDOMParser(this.options, this.localization);
        return parser.parse(input).getParsedDocumentAsString();
    }

    public insertAssets(input: string): string {
        const size = {
            width: this.options.width,
            height: this.options.height
        };
        return VideoEmbedders.insertMarkedEmbedsToRenderedOutput(input, size);
    }

    public static validate(o: AssetEmbedderOptions) {
        ow(o, 'AssetEmbedderOptions', ow.object);
        ow(o.ipfsPrefix, 'AssetEmbedderOptions.ipfsPrefix', ow.optional.string);
        ow(o.width, 'AssetEmbedderOptions.width', ow.number.integer.positive);
        ow(o.height, 'AssetEmbedderOptions.height', ow.number.integer.positive);
        ow(o.hideImages, 'AssetEmbedderOptions.hideImages', ow.boolean);
        ow(o.baseUrl, 'AssetEmbedderOptions.baseUrl', ow.string.nonEmpty);
        ow(o.imageProxyFn, 'AssetEmbedderOptions.imageProxyFn', ow.function);
        ow(o.hashtagUrlFn, 'AssetEmbedderOptions.hashtagUrlFn', ow.function);
        ow(o.usertagUrlFn, 'AssetEmbedderOptions.usertagUrlFn', ow.function);
    }
}

export interface AssetEmbedderOptions {
    ipfsPrefix?: string;
    width: number;
    height: number;
    hideImages: boolean;
    baseUrl: string;
    imageProxyFn: (url: string) => string;
    hashtagUrlFn: (hashtag: string) => string;
    usertagUrlFn: (account: string) => string;
}
