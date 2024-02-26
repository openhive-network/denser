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
});
