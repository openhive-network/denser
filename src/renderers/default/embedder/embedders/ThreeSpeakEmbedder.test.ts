import {expect} from 'chai';
import {ThreeSpeakEmbedder} from './ThreeSpeakEmbedder';

describe('ThreeSpeakEmbedder', () => {
    let embedder: ThreeSpeakEmbedder;

    beforeEach(() => {
        embedder = new ThreeSpeakEmbedder();
    });

    describe('getEmbedMetadata', () => {
        it('should return correct metadata for valid 3Speak URL', () => {
            const url = 'https://3speak.tv/watch?v=username/video-id';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'username/video-id',
                url: 'https://3speak.tv/watch?v=username/video-id'
            });
        });

        it('should return undefined for invalid URL', () => {
            const url = 'https://example.com/invalid';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.be.undefined;
        });

        it('should handle embed URLs', () => {
            const url = 'https://3speak.tv/embed?v=username/video-id';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'username/video-id',
                url: 'https://3speak.tv/watch?v=username/video-id'
            });
        });
    });

    describe('processEmbed', () => {
        it('should generate correct iframe HTML', () => {
            const id = 'username/video-id';
            const size = {width: 500, height: 300};

            const result = embedder.processEmbed(id, size);

            expect(result).to.equal(
                '<div class="threeSpeakWrapper"><iframe width="500" height="300" src="https://3speak.tv/embed?v=username/video-id" frameborder="0" allowfullscreen></iframe></div>'
            );
        });
    });
});
