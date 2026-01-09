import {expect} from 'chai';
import {SpotifyEmbedder} from './SpotifyEmbedder';

describe('SpotifyEmbedder', () => {
    [
        {
            description: 'should properly return metadata for spotify playlist',
            input: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/playlist/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify show',
            input: 'https://open.spotify.com/show/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/show/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed-podcast/show/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/show/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify episode',
            input: 'https://open.spotify.com/episode/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/episode/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed-podcast/episode/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/episode/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify album',
            input: 'https://open.spotify.com/album/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/album/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/album/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/album/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify track',
            input: 'https://open.spotify.com/track/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/track/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/track/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/track/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify artist',
            input: 'https://open.spotify.com/artist/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/artist/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/artist/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/artist/1zLvUhumbFIEdfxYQcgUxk'
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
        },
        {
            description: 'should strip quotes and extract only alphanumeric ID',
            input: 'https://open.spotify.com/playlist/ABC" onclick="alert(1)',
            expected: {
                image: 'https://open.spotify.com/playlist/ABC',
                id: 'embed/playlist/ABC',
                url: 'https://open.spotify.com/playlist/ABC'
            }
        },
        {
            description: 'should strip HTML tags and extract only alphanumeric ID',
            input: 'https://open.spotify.com/track/123<script>alert(1)</script>',
            expected: {
                image: 'https://open.spotify.com/track/123',
                id: 'embed/track/123',
                url: 'https://open.spotify.com/track/123'
            }
        },
        {
            description: 'should strip HTML entities and extract only alphanumeric ID',
            input: 'https://open.spotify.com/album/ABC&lt;script&gt;',
            expected: {
                image: 'https://open.spotify.com/album/ABC',
                id: 'embed/album/ABC',
                url: 'https://open.spotify.com/album/ABC'
            }
        },
        {
            description: 'should strip special characters and extract only alphanumeric ID',
            input: 'https://open.spotify.com/artist/ABC$%^&*()',
            expected: {
                image: 'https://open.spotify.com/artist/ABC',
                id: 'embed/artist/ABC',
                url: 'https://open.spotify.com/artist/ABC'
            }
        },
        {
            description: 'should only capture alphanumeric ID from URL with trailing garbage',
            input: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?extra=param',
            expected: {
                image: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
                id: 'embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
                url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'
            }
        }
    ].forEach((test) => {
        it(test.description, () => {
            const embedder = new SpotifyEmbedder();
            const node = {data: test.input} as HTMLObjectElement;
            const result = embedder.getEmbedMetadata(node);

            expect(result).to.be.deep.equal(test.expected);
        });
    });

    it('should properly process embed', () => {
        const embedder = new SpotifyEmbedder();
        const result = embedder.processEmbed('embed/playlist/1zLvUhumbFIEdfxYQcgUxk', {width: 300, height: 300});
        const expected =
            '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed/playlist/1zLvUhumbFIEdfxYQcgUxk" width="300" height="300" frameBorder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen ></iframe></div>';

        expect(result).to.be.equal(expected);
    });

    it('should log exceptions and return undefined', () => {
        // mock SpotifyEmbedder.extractMetadata to throw an exception
        const extractMetadata = SpotifyEmbedder['extractMetadata'];
        SpotifyEmbedder['extractMetadata'] = () => {
            throw new Error('mock error');
        };
        const embedder = new SpotifyEmbedder();
        const node = {data: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk'} as HTMLObjectElement;
        const result = embedder.getEmbedMetadata(node);

        expect(result).to.be.undefined;
        SpotifyEmbedder['extractMetadata'] = extractMetadata;
    });
});
