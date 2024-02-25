import {AbstractEmbedder} from './AbstractEmbedder';
import {SpotifyEmbedder} from './SpotifyEmbedder';
import {TwitchEmbedder} from './TwitchEmbedder';
import {VimeoEmbedder} from './VimeoEmbedder';
import {YoutubeEmbedder} from './YoutubeEmbedder';

export class Embedders {
    public static LIST: AbstractEmbedder[] = [
        //
        new YoutubeEmbedder(),
        new VimeoEmbedder(),
        new TwitchEmbedder(),
        new SpotifyEmbedder()
    ];

    public static processTextNodeAndInsertEmbeds(node: HTMLObjectElement): {links: string[]; images: string[]} {
        const out: {links: string[]; images: string[]} = {links: [], images: []};

        for (const embedder of Embedders.LIST) {
            const metadata = embedder.getEmbedMetadata(node);
            if (metadata) {
                node.data = node.data.replace(metadata.url, AbstractEmbedder.getEmbedMarker(metadata.id, embedder.type));
                if (metadata.image) out.images.push(metadata.image);
                if (metadata.link) out.links.push(metadata.link);
            }
        }
        return out;
    }

    public static insertMarkedEmbedsToRenderedOutput(input: string, size: {width: number; height: number}): string {
        return AbstractEmbedder.insertAllEmbeds(Embedders.LIST, input, size);
    }
}
