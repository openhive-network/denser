import {Log} from '../../../../Log';
import {StaticConfig} from '../../StaticConfig';
import {AbstractEmbedder, EmbedMetadata} from './AbstractEmbedder';

export class TwitterEmbedder extends AbstractEmbedder {
    public type = 'twitter';

    private static readonly linkRegex = StaticConfig.sanitization.iframeWhitelist.find((item) => item.re.toString().includes('twitter'))?.re as RegExp;

    public getEmbedMetadata(input: string | HTMLObjectElement): EmbedMetadata | undefined {
        const url = typeof input === 'string' ? input : input.data;
        try {
            const metadata = TwitterEmbedder.getTwitterMetadataFromLink(url.startsWith('\n') ? url.replace('\n', '') : url);

            if (!metadata) {
                return undefined;
            }
            return {
                id: metadata.id,
                url: metadata.url
            };
        } catch (error) {
            Log.log().error(error);
        }
        return undefined;
    }

    public processEmbed(id: string, size: {width: number; height: number}): string {
        const twitterConfig = StaticConfig.sanitization.iframeWhitelist.find((item) => item.re.toString().includes('twitter'));
        const twitterUrl = twitterConfig?.fn(`https://twitter.com/status/${id}`);
        if (!twitterUrl) {
            return '';
        }
        return `<div class="twitterWrapper"><iframe width="${size.width}" height="${size.height}" src="${twitterUrl}" frameborder="0" scrolling="no" allowtransparency="true" allowfullscreen="true"></iframe></div>`;
    }

    private static getTwitterMetadataFromLink(data: string): {id: string; url: string} | undefined {
        if (!data) {
            return undefined;
        }

        // Remove any leading '@' or 'https://' from the data
        const cleanData = data.replace(/^(@|https:\/\/)/, '');

        const match = cleanData.match(TwitterEmbedder.linkRegex);
        if (!match) {
            return undefined;
        }

        const id = match[2]; // The ID is in the 2nd capture group
        const url = `https://${cleanData}`; // Ensure the URL always starts with https://

        return {id, url};
    }
}
