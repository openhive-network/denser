import {expect} from 'chai';
import {AssetEmbedderOptions} from '../AssetEmbedder';
import {TwitchEmbedder} from './TwitchEmbedder';

const options = {baseUrl: 'https://engrave.dev'} as AssetEmbedderOptions;

describe('TwitchEmbedder', () => {
    [
        {
            description: 'should properly return metadata for twitch video',
            input: 'https://www.twitch.tv/videos/123456789',
            expected: {
                id: '?video=123456789',
                url: 'https://www.twitch.tv/videos/123456789',
                canonical: 'https://player.twitch.tv/?video=123456789'
            }
        },
        {
            description: 'should return undefined for invalid input',
            input: 'https://open.spotify.com/invalid/1zLvUhumbFIEdfxYQcgUxk',
            expected: undefined
        },
        {
            description: 'should return undefined for empty input',
            input: '',
            expected: undefined
        },
        {
            description: 'should return undefined for undefined input',
            input: undefined,
            expected: undefined
        }
    ].forEach((test) => {
        it(test.description, () => {
            const embedder = new TwitchEmbedder(options);
            const node = {data: test.input} as HTMLObjectElement;
            const result = embedder.getEmbedMetadata(node);

            expect(result).to.be.deep.equal(test.expected);
        });
    });

    it('should properly process twitch video', () => {
        const embedder = new TwitchEmbedder({baseUrl: 'https://engrave.dev'} as AssetEmbedderOptions);
        const result = embedder.processEmbed('?video=123456789', {width: 100, height: 200});

        expect(result).to.be.equal(
            '<div class="videoWrapper"><iframe src=https://player.twitch.tv/?video=123456789&parent=engrave.dev width=100 height=200 frameBorder="0" allowFullScreen></iframe></div>'
        );
    });
});
