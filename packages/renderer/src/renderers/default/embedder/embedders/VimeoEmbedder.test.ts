import {expect} from 'chai';
import {VimeoEmbedder} from './VimeoEmbedder';

describe('VimeoEmbedder', () => {
    [
        // vimeo links
        'https://player.vimeo.com/video/179213493',
        'https://player.vimeo.com/video/179213493?h=11571f92bf',
        'https://player.vimeo.com/video/179213493?byline=0'
    ].forEach((input) => {
        it('should properly return metadata for vimeo video link with player', () => {
            const embedder = new VimeoEmbedder();
            const expected = {
                id: '179213493',
                url: 'https://player.vimeo.com/video/179213493'
            };
            const result = embedder.getEmbedMetadata({data: input} as HTMLObjectElement);
            expect(result).to.be.deep.equal(expected);
        });
    });

    [
        // vimeo links without player
        'https://vimeo.com/179213493',
        'https://vimeo.com/179213493?byline=0'
    ].forEach((input) => {
        it('should properly return metadata for vimeo video', () => {
            const embedder = new VimeoEmbedder();
            const expected = {
                id: '179213493',
                url: 'https://vimeo.com/179213493'
            };
            const result = embedder.getEmbedMetadata({data: input} as HTMLObjectElement);
            expect(result).to.be.deep.equal(expected);
        });
    });

    it('should return undefined for invalid input', () => {
        const embedder = new VimeoEmbedder();
        const node = {data: 'https://vimeo.com/invalid/179213493'} as HTMLObjectElement;
        const result = embedder.getEmbedMetadata(node);
        expect(result).to.be.undefined;
    });

    it('should return undefined for empty input', () => {
        const embedder = new VimeoEmbedder();
        const node = {data: ''} as HTMLObjectElement;
        const result = embedder.getEmbedMetadata(node);
        expect(result).to.be.undefined;
    });

    it('should return undefined for undefined input', () => {
        const embedder = new VimeoEmbedder();
        const node = {data: undefined} as any as HTMLObjectElement;
        const result = embedder.getEmbedMetadata(node);
        expect(result).to.be.undefined;
    });

    it('should generate a click-to-load facade (no third-party iframe at render time)', () => {
        // Privacy facade (#934): placeholder with the data needed to build the
        // player.vimeo.com iframe on click; the thumbnail URL is carried in data-thumb
        // and loaded proxied by the client, so no direct third-party request happens.
        const embedder = new VimeoEmbedder();
        const result = embedder.processEmbed('123456', {width: 100, height: 200});

        expect(result).to.include('vimeo-facade');
        expect(result).to.include('data-vimeo-id="123456"');
        expect(result).to.include('data-thumb="https://vumbnail.com/123456.jpg"');
        expect(result).to.not.include('<iframe');
        expect(result).to.not.include('player.vimeo.com');
    });
});
