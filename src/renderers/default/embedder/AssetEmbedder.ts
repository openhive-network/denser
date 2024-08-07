import ow from 'ow';
import {LocalizationOptions} from '../Localization';
import {AbstractEmbedder} from './embedders/AbstractEmbedder';
import {SpotifyEmbedder} from './embedders/SpotifyEmbedder';
import {ThreeSpeakEmbedder} from './embedders/ThreeSpeakEmbedder';
import {TwitchEmbedder} from './embedders/TwitchEmbedder';
import {VimeoEmbedder} from './embedders/VimeoEmbedder';
import {YoutubeEmbedder} from './embedders/YoutubeEmbedder';

export class AssetEmbedder {
    private readonly options: AssetEmbedderOptions;
    private readonly localization: LocalizationOptions;
    private readonly embedders: AbstractEmbedder[];

    public constructor(options: AssetEmbedderOptions, localization: LocalizationOptions) {
        AssetEmbedder.validate(options);
        this.options = options;
        this.localization = localization;
        this.embedders = [
            //
            new YoutubeEmbedder(),
            new VimeoEmbedder(),
            new TwitchEmbedder(options),
            new SpotifyEmbedder(),
            new ThreeSpeakEmbedder()
        ];
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

    public insertAssets(input: string): string {
        const size = {
            width: this.options.width,
            height: this.options.height
        };
        return this.insertMarkedEmbedsToRenderedOutput(input, size);
    }

    public insertMarkedEmbedsToRenderedOutput(input: string, size: {width: number; height: number}): string {
        return AbstractEmbedder.insertAllEmbeds(this.embedders, input, size);
    }

    public processTextNodeAndInsertEmbeds(node: HTMLObjectElement): {links: string[]; images: string[]} {
        const out: {links: string[]; images: string[]} = {links: [], images: []};

        for (const embedder of this.embedders) {
            const metadata = embedder.getEmbedMetadata(node);
            if (metadata) {
                node.data = node.data.replace(metadata.url, AbstractEmbedder.getEmbedMarker(metadata.id, embedder.type));
                if (metadata.image) out.images.push(metadata.image);
                if (metadata.link) out.links.push(metadata.link);
            }
        }
        return out;
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
