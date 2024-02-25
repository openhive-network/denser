import {expect} from 'chai';
import {JSDOM} from 'jsdom';
import {YoutubeEmbedder} from './YoutubeEmbedder';

describe('YoutubeEmbedder', () => {
    [
        // different formats of the same youtube video link
        'https://www.youtube.com/watch?v=umvcUpmIie8',
        'https://youtube.com/watch?v=umvcUpmIie8',
        'https://youtu.be/umvcUpmIie8',
        'https://youtu.be/watch?v=umvcUpmIie8',
        'https://www.youtube.com/embed/umvcUpmIie8',
        'https://youtube.com/embed/umvcUpmIie8'
    ].forEach((input) => {
        it('should properly return metadata for youtube video link', () => {
            const expected = {
                id: 'umvcUpmIie8',
                url: input,
                image: 'https://img.youtube.com/vi/umvcUpmIie8/0.jpg'
            };
            const embedder = new YoutubeEmbedder();
            const node = new JSDOM().window.document.createElement('object');
            node.data = input;
            const metadata = embedder.getEmbedMetadata(node);
            expect(metadata).to.be.deep.equal(expected);
        });
    });

    [
        // youtube shorts
        'https://www.youtube.com/shorts/_R4ScrD0O8c',
        'https://youtube.com/shorts/_R4ScrD0O8c'
    ].forEach((input) => {
        it('should properly return metadata for youtube shorts link', () => {
            const expected = {
                id: '_R4ScrD0O8c',
                url: input,
                image: 'https://img.youtube.com/vi/_R4ScrD0O8c/0.jpg'
            };
            const embedder = new YoutubeEmbedder();
            const node = new JSDOM().window.document.createElement('object');
            node.data = input;
            const metadata = embedder.getEmbedMetadata(node);
            expect(metadata).to.be.deep.equal(expected);
        });
    });

    [
        // invalid inputs
        'https://www.youtube.com/watch?v=',
        'https://youtube.com/watch?v=',
        'https://youtu.be/',
        'https://youtu.be/watch?v=',
        'https://www.youtube.com/embed/',
        'https://youtube.com/embed/',
        'https://oauth.com/login/redirect?=youtube.com',
        'https://oauth.com/login/redirect?=www.youtube.com'
    ].forEach((input) => {
        it('should return undefined for invalid input', () => {
            const embedder = new YoutubeEmbedder();
            const node = new JSDOM().window.document.createElement('object');
            node.data = input;
            const metadata = embedder.getEmbedMetadata(node);
            expect(metadata).to.be.undefined;
        });
    });

    it('should return undefined for empty input', () => {
        const input = '';
        const embedder = new YoutubeEmbedder();
        const node = new JSDOM().window.document.createElement('object');
        node.data = input;
        const metadata = embedder.getEmbedMetadata(node);
        expect(metadata).to.be.undefined;
    });

    it('should log error and return undefined for invalid input', () => {
        // mock SpotifyEmbedder.extractMetadata to throw an exception
        const extractMetadata = YoutubeEmbedder['getYoutubeMetadataFromLink'];
        YoutubeEmbedder['getYoutubeMetadataFromLink'] = () => {
            throw new Error('mock error');
        };
        const embedder = new YoutubeEmbedder();
        const node = new JSDOM().window.document.createElement('object');
        node.data = 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk';
        const result = embedder.getEmbedMetadata(node);

        expect(result).to.be.undefined;
        YoutubeEmbedder['getYoutubeMetadataFromLink'] = extractMetadata;
    });
});
