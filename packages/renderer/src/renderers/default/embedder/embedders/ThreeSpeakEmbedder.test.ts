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
                url: 'https://3speak.tv/embed?v=username/video-id'
            });
        });

        it('should handle watch URLs', () => {
            const url = 'https://3speak.tv/watch?v=username/video-id';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'username/video-id',
                url: 'https://3speak.tv/watch?v=username/video-id'
            });
        });

        it('should handle 3speak.online domain', () => {
            const url = 'https://3speak.online/watch?v=theycallmedan/test-video';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'theycallmedan/test-video',
                url: 'https://3speak.online/watch?v=theycallmedan/test-video'
            });
        });

        it('should handle 3speak.co domain', () => {
            const url = 'https://3speak.co/watch?v=user123/my-permlink';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'user123/my-permlink',
                url: 'https://3speak.co/watch?v=user123/my-permlink'
            });
        });

        it('should handle usernames with dots and dashes', () => {
            const url = 'https://3speak.tv/watch?v=user.name-test/video-id';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'user.name-test/video-id',
                url: 'https://3speak.tv/watch?v=user.name-test/video-id'
            });
        });

        // Security: strip dangerous characters from IDs (similar to Spotify behavior)
        it('should strip quotes and extract only valid ID portion', () => {
            const url = 'https://3speak.tv/watch?v=user/video" onclick="alert(1)';
            const metadata = embedder.getEmbedMetadata(url);
            // Strips the malicious payload, keeps valid ID
            expect(metadata).to.deep.equal({
                id: 'user/video',
                url: 'https://3speak.tv/watch?v=user/video'
            });
        });

        it('should reject URL with HTML tags in ID (no valid portion)', () => {
            // The < immediately after user/ breaks the match because permlink must start with [a-z0-9]
            const url = 'https://3speak.tv/watch?v=user/<script>alert(1)</script>';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.be.undefined;
        });

        it('should strip angle brackets and extract only valid ID portion', () => {
            const url = 'https://3speak.tv/watch?v=user/video<img>';
            const metadata = embedder.getEmbedMetadata(url);
            // Strips the <img> tag, keeps valid ID
            expect(metadata).to.deep.equal({
                id: 'user/video',
                url: 'https://3speak.tv/watch?v=user/video'
            });
        });

        it('should reject URL with uppercase letters (Hive accounts are lowercase)', () => {
            const url = 'https://3speak.tv/watch?v=UserName/video-id';
            const metadata = embedder.getEmbedMetadata(url);
            // Uppercase not allowed in Hive account names
            expect(metadata).to.be.undefined;
        });

        // Issue #922: 3Speak now publishes posts with the play.3speak.tv subdomain.
        // The whole URL (including the subdomain) must be captured so it is not split
        // into two parts ("https://play." left behind + the embed marker).
        it('should match the full URL including the play. subdomain', () => {
            const url = 'https://play.3speak.tv/embed?v=patjules83/7bqet343';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'patjules83/7bqet343',
                url: 'https://play.3speak.tv/embed?v=patjules83/7bqet343'
            });
        });

        it('should match the play. subdomain on watch URLs too', () => {
            const url = 'https://play.3speak.tv/watch?v=starkerz/3speak-1780955077199';
            const metadata = embedder.getEmbedMetadata(url);
            expect(metadata).to.deep.equal({
                id: 'starkerz/3speak-1780955077199',
                url: 'https://play.3speak.tv/watch?v=starkerz/3speak-1780955077199'
            });
        });
    });

    describe('processEmbed', () => {
        it('should generate correct iframe HTML', () => {
            const id = 'username/video-id';
            const size = {width: 500, height: 300};

            const result = embedder.processEmbed(id, size);

            expect(result).to.equal(
                '<div class="threeSpeakWrapper"><iframe width="500" height="300" src="https://play.3speak.tv/watch?v=username/video-id&mode=iframe&layout=desktop" frameborder="0" allowfullscreen></iframe></div>'
            );
        });
    });
});
