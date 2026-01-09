import {expect} from 'chai';
import {AbstractEmbedder} from './AbstractEmbedder';
import {YoutubeEmbedder} from './YoutubeEmbedder';
import {SpotifyEmbedder} from './SpotifyEmbedder';
import {VimeoEmbedder} from './VimeoEmbedder';

describe('AbstractEmbedder', () => {
    describe('getEmbedMarker', () => {
        it('should create embed marker with correct format', () => {
            const marker = AbstractEmbedder.getEmbedMarker('abc123', 'youtube');
            expect(marker).to.equal('~~~ embed:abc123 youtube ~~~');
        });
    });

    describe('SAFE_EMBED_ID_PATTERN security boundary', () => {
        const embedders: AbstractEmbedder[] = [
            new YoutubeEmbedder(),
            new SpotifyEmbedder(),
            new VimeoEmbedder()
        ];
        const size = {width: 640, height: 480};

        // Characters that MUST be blocked to prevent XSS
        const dangerousChars = [
            {char: '"', name: 'double quote'},
            {char: '<', name: 'less than'},
            {char: '>', name: 'greater than'},
            {char: "'", name: 'single quote'},
            {char: ';', name: 'semicolon'},
            {char: '(', name: 'open paren'},
            {char: ')', name: 'close paren'},
            {char: '{', name: 'open brace'},
            {char: '}', name: 'close brace'},
            {char: '`', name: 'backtick'},
            {char: ' ', name: 'space (in ID)'}
        ];

        dangerousChars.forEach(({char, name}) => {
            it(`blocks embed ID containing ${name}`, () => {
                // Craft a malicious embed marker with dangerous character
                const maliciousId = `dQw4w9WgXcQ${char}onclick=alert(1)`;
                const input = `~~~ embed:${maliciousId} youtube ~~~`;

                const result = AbstractEmbedder.insertAllEmbeds(embedders, input, size);

                // The dangerous character should prevent the regex from matching,
                // so no iframe should be created
                expect(result).to.not.include('<iframe');
                // The original marker should remain as plain text (partially)
                expect(result).to.include('~~~');
            });
        });

        it('accepts valid alphanumeric YouTube ID', () => {
            const input = '~~~ embed:dQw4w9WgXcQ youtube ~~~';
            const result = AbstractEmbedder.insertAllEmbeds(embedders, input, size);

            expect(result).to.include('<iframe');
            expect(result).to.include('youtube.com/embed/dQw4w9WgXcQ');
        });

        it('accepts valid ID with allowed special characters (/?=.-)', () => {
            // These characters are allowed by the pattern [\w/?=.-]+
            const input = '~~~ embed:abc/def?id=123.test-value youtube ~~~';
            const result = AbstractEmbedder.insertAllEmbeds(embedders, input, size);

            expect(result).to.include('<iframe');
            expect(result).to.include('abc/def?id=123.test-value');
        });

        it('accepts valid Spotify embed ID', () => {
            const input = '~~~ embed:embed/playlist/37i9dQZF1DXcBWIGoYBM5M spotify ~~~';
            const result = AbstractEmbedder.insertAllEmbeds(embedders, input, size);

            expect(result).to.include('<iframe');
            expect(result).to.include('spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
        });

        it('accepts valid Vimeo embed ID', () => {
            const input = '~~~ embed:123456789 vimeo ~~~';
            const result = AbstractEmbedder.insertAllEmbeds(embedders, input, size);

            expect(result).to.include('<iframe');
            expect(result).to.include('player.vimeo.com/video/123456789');
        });

        it('handles multiple embeds with one malicious', () => {
            const input = [
                '~~~ embed:dQw4w9WgXcQ youtube ~~~',        // valid
                '~~~ embed:abc"onclick=alert(1) youtube ~~~', // malicious
                '~~~ embed:123456789 vimeo ~~~'            // valid
            ].join(' text between ');

            const result = AbstractEmbedder.insertAllEmbeds(embedders, input, size);

            // Should have exactly 2 iframes (the valid ones)
            const iframeCount = (result.match(/<iframe/g) || []).length;
            expect(iframeCount).to.equal(2);

            // Should include the valid embeds
            expect(result).to.include('youtube.com/embed/dQw4w9WgXcQ');
            expect(result).to.include('player.vimeo.com/video/123456789');
        });

        it('preserves text around embed markers', () => {
            const input = 'Before text ~~~ embed:dQw4w9WgXcQ youtube ~~~ After text';
            const result = AbstractEmbedder.insertAllEmbeds(embedders, input, size);

            expect(result).to.include('Before text');
            expect(result).to.include('After text');
            expect(result).to.include('<iframe');
        });
    });
});
